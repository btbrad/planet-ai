import { DirectoryLoader } from '@langchain/classic/document_loaders/fs/directory'
import { TextLoader } from '@langchain/classic/document_loaders/fs/text'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { OpenAIEmbeddings } from '@langchain/openai'
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory'
import { createAgent } from 'langchain'

// 1. 加载：把 docs 文件夹里所有 .md 读成 Document
const loader = new DirectoryLoader('./docs', {
  '.md': (path) => new TextLoader(path),
})
const rawDocs = await loader.load()
console.log(`加载了 ${rawDocs.length} 个文件`)

// 2. 切块：每块约 200 字，重叠 40 字，按中文标点断句
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 200,
  chunkOverlap: 40,
  separators: ['\n\n', '\n', '。', '！', '？', '；', '，', '、', ' ', ''],
})
const docs = await splitter.splitDocuments(rawDocs)
console.log(`切成了 ${docs.length} 个块`)

// 3. 向量化并入库
const embeddings = new OpenAIEmbeddings({
  model: 'text-embedding-3-small',
})
const vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings)

// 4. 语义检索
const question = '团队版多少钱一个人？'
const results = await vectorStore.similaritySearch(question, 3)

// 5. 把检索到的片段拼成上下文，顺手带上来源
const context = results
  .map(
    (doc, i) =>
      `[片段 ${i + 1}]（来源：${doc.metadata.source}）\n${doc.pageContent}`,
  )
  .join('\n\n')

// 6. 拼进 prompt
const prompt = `资料：
${context}

用户问题：${question}
回答：`

// 7. 创建 Agent
const agent = createAgent({
  model: 'openai:gpt-4o-mini',
  systemPrompt:
    '你是冴羽科技的客服，可以根据资料回答问题，如果资料里没有答案，直接说不知道。回答时简洁明了。',
})

// 8. 运行 Agent
const result = await agent.invoke({
  messages: [{ role: 'user', content: prompt }],
})

// 9. 输出结果
const lastMessage = result.messages[result.messages.length - 1]
console.log('\n检索到的片段：\n' + context)
console.log('\n回答：', lastMessage?.content)
