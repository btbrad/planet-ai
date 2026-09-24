import { Document } from '@langchain/core/documents'
import { OpenAIEmbeddings } from '@langchain/openai'
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory'

// 1. 准备知识库文档
const documents = [
  new Document({
    pageContent:
      '冴羽科技是一家成立于 2020 年的 SaaS 公司，总部在杭州，主要面向中小团队提供项目管理工具。',
    metadata: { source: '关于我们' },
  }),
  new Document({
    pageContent:
      '星盘是冴羽科技的旗舰产品，一个轻量级的项目管理工具，支持看板、列表、甘特图三种视图。',
    metadata: { source: '产品介绍' },
  }),
  new Document({
    pageContent:
      '公司实行周末双休，法定节假日正常放假，另享 25 天带薪年假，入职满一年即可享受。',
    metadata: { source: '休假制度' },
  }),
  new Document({
    pageContent: '星盘的数据存储在国内，通过等保三级认证，支持私有化部署。',
    metadata: { source: '安全合规' },
  }),
]

// 2. 创建 embedding 模型
const embeddings = new OpenAIEmbeddings({
  model: 'text-embedding-3-small',
})

// 3. 向量化并存入向量库
const vectorStore = await MemoryVectorStore.fromDocuments(documents, embeddings)

// 4. 语义检索
const results = await vectorStore.similaritySearch('一年休息几天？', 2)

for (const doc of results) {
  console.log(doc.metadata.source, '=>', doc.pageContent)
}
