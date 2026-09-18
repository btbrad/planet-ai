import { Agent } from '@mastra/core/agent'
import { weatherTool } from '../tools/weather-tool'

export const weatherAgent = new Agent({
  id: 'weather-agent',
  name: 'Weather Agent',
  instructions: `
    你是一个天气小助手，可以查询当前天气。
    当用户查询天气时，使用 weatherTool
  `,
  model: 'deepseek/deepseek-v4-flash',
  tools: { weatherTool },
})
