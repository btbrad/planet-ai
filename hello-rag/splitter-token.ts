import { TokenTextSplitter } from '@langchain/textsplitters'
import { text } from './data/sample'
import { printChunks } from './utils/print'

const splitter = new TokenTextSplitter({
  encodingName: 'cl100k_base', // 要和你用的模型一致
  chunkSize: 40, // 每块最多 40 个 token
  chunkOverlap: 8, // 块之间重叠 8 个 token
})

const chunks = await splitter.createDocuments([text])
printChunks(chunks)
