import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { getEncoding } from 'js-tiktoken'
import { text } from './data/sample'
import { printChunks } from './utils/print'

const enc = getEncoding('cl100k_base')

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 40, // 现在这个 40 指的是 token 数
  chunkOverlap: 8,
  separators: ['\n\n', '\n', '。', '！', '？', '；', '，', '、', ' ', ''],
  lengthFunction: (s) => enc.encode(s).length,
})

const chunks = await splitter.createDocuments([text])
printChunks(chunks)
