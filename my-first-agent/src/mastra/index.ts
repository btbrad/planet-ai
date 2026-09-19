import { Mastra } from '@mastra/core'
import { LibSQLStore } from '@mastra/libsql'
import { translatorAgent } from './agents/translate-agent'
import { weatherAgent } from './agents/weather-agent'
import { writerAgent } from './agents/writer-agent'
import { personalAssistant } from './agents/assistant-agent'
import { writeTranslateWorkflow } from './workflows/write-translate-workflow'

export const mastra = new Mastra({
  storage: new LibSQLStore({
    id: 'mastra-storage',
    url: 'file:./mastra.db',
  }),
  agents: { translatorAgent, weatherAgent, writerAgent, personalAssistant },
  workflows: { writeTranslateWorkflow },
})
