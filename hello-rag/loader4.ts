import { DirectoryLoader } from '@langchain/classic/document_loaders/fs/directory'
import { MarkdownLoader } from './loaders/markdown'

const loader = new DirectoryLoader('./docs', {
  '.md': (path) => new MarkdownLoader(path),
})

const docs = await loader.load()

for (const doc of docs) {
  console.log(doc.metadata)
}
// {
//   source: 'docs/vacation.md',
//   title: '休假制度',
//   docType: 'policy',
//   audience: 'internal',
//   updatedAt: '2026-01-01'
// }
// ...
