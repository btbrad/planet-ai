import { Memory } from '@mastra/memory'
import { Agent } from '@mastra/core/agent'

export const translatorAgent = new Agent({
  id: 'translator-agent',
  name: 'Translator Agent',
  instructions: `你是一个专业的翻译助手。
翻译时遵循以下规则：
1. 保持原文的语气和风格
2. 专业术语翻译准确
3. 输出只包含译文，不要加额外解释`,
  model: 'deepseek/deepseek-v4-flash',
  memory: new Memory({
    options: {
      lastMessages: 10,
      observationalMemory: {
        model: 'deepseek/deepseek-reasoner', // 使用更快更便宜的模型做后台观察
        observation: {
          messageTokens: 500, // 消息历史达到 500 token 时触发观察，仅做测试用
        },
        reflection: {
          observationTokens: 1000, // 观察笔记达到 1000 token 时触发反思，仅做测试用
        },
      },
    },
  }),
})
