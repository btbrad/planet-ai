import { ChatDeepSeek } from '@langchain/deepseek'

const llm = new ChatDeepSeek({
  model: 'deepseek-v4-flash',
  temperature: 0,
})

const aiMsg = await llm.invoke([
  ['system', '你是一个翻译助手，帮我把英文翻译成中文。'],
  ['human', 'Hello World!'],
])

console.log(aiMsg)
