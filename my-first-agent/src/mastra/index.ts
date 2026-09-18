import { Mastra } from '@mastra/core'
import { translatorAgent } from './agents/translate-agent'
import { weatherAgent } from './agents/weather-agent'
import { writerAgent } from './agents/writer-agent'
import { writeTranslateWorkflow } from './workflows/write-translate-workflow'

export const mastra = new Mastra({
  agents: { translatorAgent, weatherAgent, writerAgent },
  workflows: { writeTranslateWorkflow },
})
