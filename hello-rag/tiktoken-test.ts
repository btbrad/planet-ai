import { getEncoding, getEncodingNameForModel } from 'js-tiktoken'

// 不同模型用不同的编码，gpt-4 用的是 cl100k_base
console.log(getEncodingNameForModel('gpt-4'))

const enc = getEncoding('cl100k_base')

for (const s of [
  'apple',
  'pineapple',
  '苹果',
  '星盘支持看板、列表、甘特图三种视图。',
]) {
  console.log(`${s}：${s.length} 个字符，${enc.encode(s).length} 个 token`)
}
