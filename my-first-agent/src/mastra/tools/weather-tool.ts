import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

export const weatherTool = createTool({
  id: 'weather-tool',
  description: '获取指定城市的当前天气信息',
  inputSchema: z.object({
    location: z.string().describe('城市名称，如"北京"'),
  }),
  outputSchema: z.object({
    weather: z.string(),
  }),
  execute: async (inputData) => {
    const { location } = inputData
    const response = await fetch(
      `https://wttr.in/${encodeURIComponent(location)}?format=3`,
    )
    const weather = await response.text()
    return { weather }
  },
})
