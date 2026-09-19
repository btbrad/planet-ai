import { MDocument, createVectorQueryTool } from '@mastra/rag'
import { embedMany, embed } from 'ai'
import { PgVector } from '@mastra/pg'
import { ModelRouterEmbeddingModel } from '@mastra/core/llm'
import { Agent } from '@mastra/core/agent'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import fs from 'fs'
import path from 'path'

// 1. 将知识库文档向量化并存入向量数据库

// 1.1 读取 Markdown 文件
const filePath = path.join(process.cwd(), 'docs', '员工手册.md')
const content = fs.readFileSync(filePath, 'utf-8')
const doc = MDocument.fromMarkdown(content)

// 1.2 将文档切分为小块
const chunks = await doc.chunk({
  strategy: 'markdown',
  headers: [
    ['#', 'title'],
    ['##', 'section'],
  ],
  stripHeaders: true,
})

// 1.3 将文档块向量化
const embeddingModel = new ModelRouterEmbeddingModel(
  'openai/text-embedding-3-small',
)
const { embeddings } = await embedMany({
  values: chunks.map((c) => c.text),
  model: embeddingModel,
})

// 1.4 将向量存入 PostgreSQL 向量数据库
export const pgVector = new PgVector({
  id: 'pg-vector',
  connectionString: process.env.POSTGRES_CONNECTION_STRING,
})

// await pgVector.deleteVectors({
//   indexName: 'docs',
//   filter: { source: '员工手册.md' },
// })

await pgVector.createIndex({
  indexName: 'docs',
  dimension: 1536,
})

await pgVector.upsert({
  indexName: 'docs',
  vectors: embeddings,
  metadata: chunks.map((c) => ({ text: c.text, source: '员工手册.md' })),
})

// 2. 创建 RAG 工具

// const searchKnowledge = createTool({
//   id: 'search-docs',
//   description: '从知识库中搜索相关文档',
//   inputSchema: z.object({
//     query: z.string().describe('搜索查询'),
//   }),
//   outputSchema: z.object({
//     results: z.array(
//       z.object({
//         text: z.string(),
//         source: z.string(),
//       }),
//     ),
//   }),
//   execute: async ({ query }) => {
//     const { embedding } = await embed({
//       value: query,
//       model: embeddingModel,
//     })
//     const results = await pgVector.query({
//       indexName: 'docs',
//       queryVector: embedding,
//       topK: 3,
//     })
//     return {
//       results: results.map((r) => ({
//         text: r.metadata?.text as string,
//         source: r.metadata?.source as string,
//       })),
//     }
//   },
// })

const searchKnowledge = createVectorQueryTool({
  vectorStoreName: 'pgVector',
  indexName: 'docs',
  model: new ModelRouterEmbeddingModel('openai/text-embedding-3-small'),
  id: 'search-docs',
  description: '从知识库中搜索相关文档',
})

// 3. 创建 RAG Agent

export const knowledgeAgent = new Agent({
  id: 'knowledge-agent',
  name: 'Knowledge Agent',
  instructions: `
    你是一个知识库助手。
    当用户提问时，先使用 search-docs 工具搜索相关文档，
    然后基于搜索结果回答问题。
    如果搜索结果中没有相关信息，如实告知用户。
    不要编造不在搜索结果中的信息。
  `,
  model: 'deepseek/deepseek-v4-flash',
  tools: { searchKnowledge },
})
