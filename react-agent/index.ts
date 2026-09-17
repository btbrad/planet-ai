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

const tools: { [key: string]: (...args: any[]) => any } = { write_file }

const SYSTEM_PROMPT = `你需要解决一个问题。为此，你需要将问题分解为多个步骤。对于每个步骤，首先使用 <thought> 思考要做什么，然后使用可用工具之一决定一个 <action>。接着，你将根据你的行动从环境/工具中收到一个 <observation>。持续这个思考和行动的过程，直到你有足够的信息来提供 <final_answer>。

所有步骤请严格使用以下 XML 标签格式输出：
- <question> 用户问题
- <thought> 思考
- <action> 采取的工具操作
- <observation> 工具或环境返回的结果
- <final_answer> 最终答案

⸻

请严格遵守：
- 你每次回答都必须包括两个标签，第一个是 <thought>，第二个是 <action> 或 <final_answer>
- 输出 <action> 后立即停止生成，等待真实的 <observation>，擅自生成 <observation> 将导致错误
- write_file 必须使用下面的 XML 格式，不要使用函数调用格式：
<action>
<tool>write_file</tool>
<filename>index.html</filename>
<content><![CDATA[
文件完整内容
]]></content>
</action>

⸻

本次任务可用工具：
- write_file(文件名, 内容)：将内容写入本地文件`

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
  content = content.replace(/^<!\[CDATA\[\n?/, '').replace(/\n?\]\]>$/, '')
  return name && filename ? { name, args: [filename, content] } : null
}

async function runAgent(question: string) {
  const messages: any[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `<question>${question}</question>` },
  ]

  // 设置一个最大循环次数
  let maxTurns = 10

  while (maxTurns-- > 0) {
    const response = await client.chat.completions.create({
      messages,
      model: 'deepseek-v4-flash',
    })

    const reply = response.choices[0]?.message.content || ''
    messages.push({ role: 'assistant', content: reply })

    const { thought, action, finalAnswer } = parseResponse(reply)
    console.log(`Thought: ${thought}`)

    if (finalAnswer) {
      console.log(`Result: ${finalAnswer}`)
      return finalAnswer
    }

    console.log(`Action: ${action.slice(0, 50) + '...'}`)
    const parsed = parseToolCall(action)
    if (!parsed) {
      messages.push({
        role: 'user',
        content:
          '<observation>格式错误，请使用 <tool>、<filename>、<content> 的 XML 格式。</observation>',
      })
      continue
    }

    const { name: toolName, args } = parsed
    const toolFn = tools[toolName]

    if (!toolFn) {
      messages.push({
        role: 'user',
        content: `<observation>工具 "${toolName}" 不存在。</observation>`,
      })
      continue
    }

    const result = toolFn(...args)
    console.log(`Observation: ${result}`)
    messages.push({
      role: 'user',
      content: `<observation>${result}</observation>`,
    })
  }
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
