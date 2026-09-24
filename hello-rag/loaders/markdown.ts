import matter from 'gray-matter'
import { BaseDocumentLoader } from '@langchain/core/document_loaders/base'
import { Document } from '@langchain/core/documents'

export class MarkdownLoader extends BaseDocumentLoader {
  constructor(private filePath: string) {
    super()
  }

  async load(): Promise<Document[]> {
    const raw = await Bun.file(this.filePath).text()
    // data 是 frontmatter 解析出来的对象，content 是去掉 frontmatter 的正文
    const { data, content } = matter(raw)

    return [
      new Document({
        pageContent: content.trim(),
        metadata: {
          source: this.filePath,
          ...data, // title / docType / audience / updatedAt 全进来
        },
      }),
    ]
  }
}
