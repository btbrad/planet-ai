import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio'

const loader = new CheerioWebBaseLoader(
  'https://juejin.cn/post/7652661311048024091',
  {
    selector: '.markdown-body p', // 只取文章区域的段落
  },
)
const docs = await loader.load()

console.log(docs.length)
console.log(docs[0]?.metadata)
console.log(docs[0]?.pageContent)
