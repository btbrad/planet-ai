import { Agent } from '@mastra/core/agent'
import { Memory } from '@mastra/memory'
import { LibSQLStore, LibSQLVector } from '@mastra/libsql'
import { ModelRouterEmbeddingModel } from '@mastra/core/llm'

const memory = new Memory({
  storage: new LibSQLStore({
    id: 'agent-storage',
    url: 'file:./mastra.db',
  }),
  vector: new LibSQLVector({
    id: 'agent-vector',
    url: 'file:./mastra.db',
  }),
  embedder: new ModelRouterEmbeddingModel('openai/text-embedding-3-small'),
  options: {
    lastMessages: 10,
    workingMemory: {
      enabled: true,
    },
    semanticRecall: {
      topK: 3,
      messageRange: 2,
    },
    observationalMemory: true,
  },
})

export const personalAssistant = new Agent({
  id: 'personal-assitant',
  name: 'PersonalAssitant',
  instructions: '你是一个贴心的个人助手',
  model: 'deepseek/deepseek-chat',
  memory,
})
