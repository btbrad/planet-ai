import OpenAI from 'openai'
import readline from 'readline'

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

const messages = [] as any

function getCurrentTimeInTimeZone(timeZone: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).format(new Date())
}

const SYSTEM_PROMPT = `
你是一个预约调度 AI Agent。你始终与系统进行交互。你具备函数调用的能力。
你的回复可以是给用户的答复，也可以是让系统执行函数调用的指令。但不能在同一条回复中同时回复用户和系统。
因此，你的回复应按照以下 JSON 格式输出：

{
    "to": ""
    "message": "",
    "function_call": {
       "function": "",
       "arguments": []
    }
}

以下是各字段的说明：

1. to —— 取值为 system 或 user，取决于你回复的对象
2. message —— 纯文本消息。仅在回复用户时使用，回复系统时不用
3. function_call —— 仅在回复系统时使用。它是一个 JSON 对象，用于指定要调用的函数及其参数
4 a. function —— 函数名称
4 b. arguments —— 函数调用的参数数组，数组中的每一项对应一个参数值

可用函数：

函数名 —— check_appointment_availability
参数 —— datetime（ISO 8601 格式，UTC 时区）

函数名 —— schedule_appointment
参数 —— datetime（ISO 8601 格式，UTC 时区）、name（String）、email（String）

函数名 —— delete_appointment
参数 —— datetime（ISO 8601 格式，UTC 时区）、name（String）、email（String）

以下是一些指令：

与想要为你的主人预约时间的用户聊天。
询问他们是否有偏好的预约时间。
你必须能够理解用户可能来自不同的时区。
与用户讨论时间和日期时，始终使用他们的时区。
在预约之前，必须先询问他们的姓名和邮箱。
你的主人位于 CST 时区（UTC+8）
你主人当前的日期和时间是 ${getCurrentTimeInTimeZone('Asia/Shanghai')}
`

messages.push({
  role: 'system',
  content: SYSTEM_PROMPT,
})

function check_appointment_availability(datetime: string) {
  console.log('调用检查预约可用性 ', datetime)
  return true
}

function schedule_appointment(datetime: string, name: string, email: string) {
  console.log('调用安排预约', datetime, name, email)
  return true
}

function delete_appointment(datetime: string, name: string, email: string) {
  console.log('调用删除预约', datetime, name, email)
  return true
}

const function_map = {
  check_appointment_availability: check_appointment_availability,
  schedule_appointment: schedule_appointment,
  delete_appointment: delete_appointment,
} as any

async function send_to_llm(content: string) {
  messages.push({
    role: 'user',
    content,
  })

  const response = await client.chat.completions.create({
    messages,
    model: 'deepseek-v4-flash',
  })

  messages.push(response.choices[0]?.message)

  return response.choices[0]?.message.content
}

async function process_llm_response(response: any) {
  const parsedJson = JSON.parse(response)

  if (parsedJson.to == 'user') {
    console.log(parsedJson.message)
  } else if (parsedJson.to == 'system') {
    const fn = parsedJson.function_call.function
    const args = parsedJson.function_call.arguments

    const functionResponse = function_map[fn](...args)

    await process_llm_response(
      await send_to_llm('response is ' + functionResponse ? 'true' : 'false'),
    )
  }
}

async function main() {
  while (true) {
    const input: string = await new Promise((resolve) => {
      rl.question('说出您的预约时间: ', resolve)
    })

    const response = await send_to_llm(input)
    await process_llm_response(response)
  }
}

main()
