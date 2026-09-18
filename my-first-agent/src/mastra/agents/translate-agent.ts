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
})
