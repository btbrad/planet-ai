import type { Document } from '@langchain/core/documents'
import { getEncoding } from 'js-tiktoken'

const enc = getEncoding('cl100k_base')

export function printChunks(chunks: Document[]) {
  chunks.forEach((chunk, i) => {
    const chars = chunk.pageContent.length
    const tokens = enc.encode(chunk.pageContent).length
    console.log(`--- 块 ${i + 1}（${chars} 字 / ${tokens} token）---`)
    console.log(chunk.pageContent)
    console.log()
  })
}
