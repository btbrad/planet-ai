import { DirectoryLoader } from '@langchain/classic/document_loaders/fs/directory'
import { TextLoader } from '@langchain/classic/document_loaders/fs/text'

const loader = new DirectoryLoader('./docs', {
  '.md': (path) => new TextLoader(path),
})

const docs = await loader.load()

console.log(`加载了 ${docs.length} 个文档`)
for (const doc of docs) {
  console.log(doc.metadata.source, '=>', doc.pageContent.length, '字')
}
