import { TextLoader } from '@langchain/classic/document_loaders/fs/text'

const loader = new TextLoader('./docs/vacation.md')
const docs = await loader.load()

console.log(docs.length) // 1
console.log(docs[0]?.metadata) // { source: './docs/vacation.md' }
console.log(docs[0]?.pageContent) // 文件全文
