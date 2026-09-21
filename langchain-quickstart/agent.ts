import { createAgent, tool } from 'langchain'
import { MemorySaver } from '@langchain/langgraph'
import { z } from 'zod'

// 1. 定义工具
const getWeather = tool(
  async (input) => {
    const { city } = input
    const response = await fetch(
      `https://wttr.in/${encodeURIComponent(city)}?format=3`,
    )
    const weather = await response.text()
    return { weather }
  },
  {
    name: 'get_weather',
    description: '获取指定城市的天气信息',
    schema: z.object({
      city: z.string().describe('城市名称，如北京、上海、广州'),
    }),
  },
)

// 2. 创建 Agent
const agent = createAgent({
  model: 'deepseek:deepseek-v4-flash',
  tools: [getWeather],
  systemPrompt: '你是一个天气助手，可以帮助用户查询城市天气。回答时简洁明了。',
  checkpointer: new MemorySaver(),
})

// 3. 运行 Agent
const result = await agent.invoke(
  { messages: [{ role: 'user', content: '杭州今天天气怎么样？' }] },
  { configurable: { thread_id: 'weather-1' } },
)

// 4. 输出结果
const lastMessage = result.messages[result.messages.length - 1]
console.log(lastMessage?.content)

const result2 = await agent.invoke(
  { messages: [{ role: 'user', content: '我刚才问了什么？' }] },
  { configurable: { thread_id: 'weather-1' } },
)

console.log(result2.messages[result2.messages.length - 1]?.content)
