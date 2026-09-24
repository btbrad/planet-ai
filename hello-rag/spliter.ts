import { TextLoader } from '@langchain/classic/document_loaders/fs/text'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'

const loader = new TextLoader('./docs/product.md')
const docs = await loader.load()

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 100,
  chunkOverlap: 20,
  separators: ['\n\n', '\n', '。', '！', '？', '；', '，', '、', ' ', ''],
})

const chunks = await splitter.splitDocuments(docs)

console.log(
  `原文 ${docs[0]?.pageContent.length} 字，切成 ${chunks.length} 块\n`,
)

chunks.forEach((chunk, i) => {
  console.log(`--- 块 ${i + 1}（${chunk.pageContent.length} 字）---`)
  console.log(chunk.pageContent)
  console.log('metadata:', chunk.metadata)
  console.log()
})
