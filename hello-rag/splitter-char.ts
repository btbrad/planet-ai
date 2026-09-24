import { CharacterTextSplitter } from '@langchain/textsplitters'
const text = `星盘支持看板、列表、甘特图三种视图，可以一键切换。
任务支持自定义字段、多人协作、评论和附件。
星盘提供免费版和团队版，免费版最多 10 人，团队版按人按年付费，每人每年 299 元，企业客户可选择私有化部署，数据不出企业内网，所有数据传输使用 TLS 加密，静态数据使用 AES-256 加密。"`

const splitter = new CharacterTextSplitter({
  separator: '\n',
  chunkSize: 60,
  chunkOverlap: 10,
})

const chunks = await splitter.createDocuments([text])
console.log(chunks)
