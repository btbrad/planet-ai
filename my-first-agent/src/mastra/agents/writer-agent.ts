import { Agent } from '@mastra/core/agent'

export const writerAgent = new Agent({
  id: 'writer-agent',
  name: 'Writer Agent',
  instructions: `你是一个专业的中文写作助手。
写作时遵循以下规则：
1. 内容结构清晰，逻辑连贯
2. 语言流畅自然，避免生硬的翻译腔
3. 根据主题选择合适的文体和语气`,
  model: 'deepseek/deepseek-v4-flash',
})
