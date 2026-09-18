import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'

// 步骤 1：写一篇文章
const writeArticle = createStep({
  id: 'write-article',
  inputSchema: z.object({
    topic: z.string(),
  }),
  outputSchema: z.object({
    article: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgentById('writer-agent')
    const result = await agent.generate(
      `请写一篇关于"${inputData.topic}"的文章,500 字左右`,
    )
    return { article: result.text }
  },
})

// 步骤 2：翻译
const translateArticle = createStep({
  id: 'translate-article',
  inputSchema: z.object({
    article: z.string(),
  }),
  outputSchema: z.object({
    translated: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgentById('translator-agent')
    const result = await agent.generate(
      `请将以下文章翻译成英文：

${inputData.article}`,
    )
    return { translated: result.text }
  },
})

// 组装 Workflow
const writeTranslateWorkflow = createWorkflow({
  id: 'write-translate-workflow',
  description: '写作并翻译文章的工作流',
  inputSchema: z.object({
    topic: z.string().describe('文章主题'),
  }),
  outputSchema: z.object({ result: z.string() }),
})
  .then(writeArticle)
  .then(translateArticle)

writeTranslateWorkflow.commit()

export { writeTranslateWorkflow }
