import OpenAI from 'openai'
import readline from 'readline'
import { dirname, resolve } from 'path'
import { mkdirSync } from 'fs'

const baseURL = process.env.OPENAI_BASE_URL
const apiKey = process.env.OPENAI_API_KEY

if (!baseURL || !apiKey) {
  console.error(
    '缺少环境变量 OPENAI_BASE_URL 或 OPENAI_API_KEY，请复制 .env.example 为 .env 并填写。',
  )
  process.exit(1)
}

const client = new OpenAI({ baseURL, apiKey })

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

// 项目根目录下的 output 目录，与运行时的 cwd 无关
const OUTPUT_DIR = resolve(import.meta.dir, 'output')

function write_file(filepath: string, content: string) {
  // 去掉模型可能带上的前导斜杠，避免 join 时丢掉 output 前缀
  const target = resolve(OUTPUT_DIR, filepath.replace(/^[/\\]+/, ''))

  if (!target.startsWith(OUTPUT_DIR)) {
    return `文件 ${filepath} 写入失败：不允许写入 output 目录之外`
  }

  mkdirSync(dirname(target), { recursive: true })
  Bun.write(target, content)
  return `文件 ${filepath} 写入成功 (${target})`
}

const tools: Record<string, (filepath: string, content: string) => string> = {
  write_file,
}

const PLANNER_PROMPT = `你是一个擅长规划的 AI 助手。你的职责是将用户问题分解为有序的执行计划。

请严格按照以下格式输出，用 JavaScript 数组表示：
\`\`\`json
["步骤一的具体描述", "步骤二的具体描述", "步骤三的具体描述"]
\`\`\`

计划要求：
- 每个步骤清晰、可独立执行
- 步骤之间逻辑连贯
- 步骤数量控制在 3-7 个

可用工具：write_file(文件名, 内容) —— 将内容写入本地文件`

const EXECUTOR_PROMPT = `你是一个执行任务的 AI 助手。你需要根据当前步骤的描述，使用工具来完成任务。

请严格按照以下 XML 格式输出：

<thought>你对当前步骤的思考</thought>
<action>
  <tool>工具名</tool>
  <filename>文件名</filename>
  <content><!--[CDATA[
  文件完整内容
  ]]--></content>
</action>

或者，如果当前步骤不需要调用工具，输出：

<thought>思考</thought>
<final_answer>步骤完成说明</final_answer>

可用工具：write_file(文件名, 内容) —— 将内容写入本地文件`

const REPLANNER_PROMPT = `你是一个评估任务进度的 AI 助手。根据已完成步骤的结果和剩余计划，判断下一步行动。

如果剩余计划合理，继续执行：
<continue>

如果剩余计划需要调整，输出新的剩余步骤（也使用 JSON 数组格式）：
\`\`\`json
["调整后的步骤一", "调整后的步骤二"]
\`\`\`

如果任务已经完成：
<final_answer>任务完成的总结</final_answer>

注意：
- 不要重复已完成步骤
- 如果执行结果表明后续步骤已无必要，果断结束
- 如果执行结果提供了新信息，可以细化或调整后续步骤`

function parsePlan(text: string): string[] {
  // 匹配 ```json ... ``` 代码块
  const match = text.match(/```json\s*([\s\S]*?)\s*```/)
  if (!match) return []
  try {
    const plan = JSON.parse(match[1] || '[]')
    return Array.isArray(plan) ? plan : []
  } catch {
    return []
  }
}

function parseResponse(text: string) {
  const thoughtMatch = text.match(/<thought>([\s\S]*?)<\/thought>/)
  const actionMatch = text.match(/<action>([\s\S]*?)<\/action>/)
  const finalMatch = text.match(/<final_answer>([\s\S]*?)<\/final_answer>/)
  return {
    thought: thoughtMatch?.[1]?.trim() || '',
    action: actionMatch?.[1]?.trim() || '',
    finalAnswer: finalMatch?.[1]?.trim() || '',
  }
}

function parseToolCall(action: string) {
  const name = action.match(/<tool>([\s\S]*?)<\/tool>/)?.[1]?.trim()
  const filename = action.match(/<filename>([\s\S]*?)<\/filename>/)?.[1]?.trim()
  let content = action.match(/<content>([\s\S]*?)<\/content>/)?.[1] || ''
  content = content
    .replace(/^\s*<!(?:--)?\[CDATA\[\s*/, '')
    .replace(/\s*\]\](?:--)?>\s*$/, '')
  return name && filename
    ? { name, args: [filename, content] as [string, string] }
    : null
}

async function plan(question: string): Promise<string[]> {
  const response = await client.chat.completions.create({
    messages: [
      { role: 'system', content: PLANNER_PROMPT },
      { role: 'user', content: `请为以下问题生成执行计划：${question}` },
    ],
    model: 'deepseek-v4-flash',
  })

  const reply = response.choices[0]?.message.content || ''

  return parsePlan(reply)
}

async function executeStep(
  question: string,
  fullPlan: string[],
  currentStep: string,
  stepIndex: number,
  history: string,
): Promise<string> {
  // 构造包含全局视野的上下文
  const prompt = [
    `# 原始问题：`,
    question,
    ``,
    `# 完整计划：`,
    fullPlan.map((s, i) => `步骤 ${i + 1}：${s}`).join('\n'),
    ``,
    `# 已完成步骤与结果：`,
    history || '（尚无已完成的步骤）',
    ``,
    `# 当前步骤：`,
    `步骤 ${stepIndex + 1}：${currentStep}`,
    ``,
    `请完成当前步骤。`,
  ].join('\n')

  const response = await client.chat.completions.create({
    messages: [
      { role: 'system', content: EXECUTOR_PROMPT },
      { role: 'user', content: prompt },
    ],
    model: 'deepseek-v4-flash',
  })

  const reply = response.choices[0]?.message.content || ''
  console.log(`Execute 阶段：`)
  console.log(`  执行步骤 ${stepIndex + 1}/${fullPlan.length}：${currentStep}`)

  const { thought, action, finalAnswer } = parseResponse(reply)
  console.log(`  Thought：${thought}`)

  if (finalAnswer) {
    return finalAnswer
  }

  console.log(`  Action: ${action.slice(0, 50) + '...'}`)

  const parsed = parseToolCall(action)
  if (!parsed) {
    return '步骤执行失败'
  }

  const { name: toolName, args } = parsed
  const toolFn = tools[toolName]
  if (!toolFn) {
    return `工具 "${toolName}" 不存在`
  }

  const result = toolFn(...args)
  console.log(`  Observation：${result}`)
  return result
}

type ExecutedStep = { step: string; result: string }
type ReplanDecision =
  | { action: 'continue' }
  | { action: 'finish'; answer: string }
  | { action: 'replan'; steps: string[] }

async function replan(
  question: string,
  executed: ExecutedStep[],
  remaining: string[],
): Promise<ReplanDecision> {
  // 将已完成步骤编号
  const executedText = executed
    .map((x, i) => `步骤 ${i + 1}：${x.step}\n结果：${x.result}`)
    .join('\n')

  const remainingText = remaining
    .map((s, i) => `步骤 ${executed.length + i + 1}：${s}`)
    .join('\n')

  const prompt = [
    `# 原始问题：`,
    question,
    ``,
    `# 已完成步骤：`,
    executedText || '（无）',
    ``,
    `# 剩余步骤：`,
    remainingText || '（无）',
  ].join('\n')

  const response = await client.chat.completions.create({
    messages: [
      { role: 'system', content: REPLANNER_PROMPT },
      {
        role: 'user',
        content: prompt,
      },
    ],
    model: 'deepseek-v4-flash',
  })

  const reply = response.choices[0]?.message.content || ''
  console.log(`  LLM Reply：${reply.slice(0, 120)}...`)

  if (reply.includes('<continue>')) {
    return { action: 'continue' }
  }

  const finalMatch = reply.match(/<final_answer>([\s\S]*?)<\/final_answer>/)
  if (finalMatch) {
    return { action: 'finish', answer: finalMatch[1]?.trim() || '' }
  }

  const replanSteps = parsePlan(reply)
  if (replanSteps.length > 0) {
    return { action: 'replan', steps: replanSteps }
  }

  // 兜底：无法解析，默认继续
  return { action: 'continue' }
}

async function runAgent(question: string) {
  // 阶段一：规划
  const fullPlan = await plan(question)

  if (fullPlan.length === 0) {
    console.log('规划失败，无法生成执行计划')
    return '规划失败'
  }

  console.log(`Plan 阶段:`)
  fullPlan.forEach((step, i) => console.log(`  ${i + 1}. ${step}`))

  // 阶段二 + 阶段三：执行 + 重规划循环
  const executed: ExecutedStep[] = []
  let remaining = [...fullPlan]
  let stepIndex = 0
  let maxIterations = 15

  while (remaining.length > 0 && maxIterations-- > 0) {
    const currentStep = remaining[0]!
    // 构建历史文本
    const history = executed
      .map((x, i) => `步骤 ${i + 1}：${x.step}\n结果：${x.result}`)
      .join('\n')

    // 执行当前步骤（传入完整上下文）
    const result = await executeStep(
      question,
      [...executed.map((x) => x.step), ...remaining],
      currentStep,
      stepIndex,
      history,
    )
    executed.push({ step: currentStep, result })
    stepIndex++

    // 更新 remaining（去掉刚执行的那一步）
    remaining.shift()

    console.log(`RePlan 阶段：`)
    const decision = await replan(question, executed, remaining)

    if (decision.action === 'finish') {
      console.log(`🤖：${decision.answer}`)
      return decision.answer
    }

    if (decision.action === 'replan') {
      console.log(`  计划已更新，剩余 ${decision.steps.length} 个步骤：`)
      decision.steps.forEach((s, i) =>
        console.log(`  ${stepIndex + i + 1}. ${s}`),
      )
      remaining = decision.steps
    }
  }

  console.log(`✅ 所有步骤执行完毕！`)
  return '任务完成'
}

async function main() {
  while (true) {
    const question = await new Promise<string>((resolve) => {
      rl.question('🤖 请输入你的问题: ', resolve)
    })
    await runAgent(question)
  }
}

main()
