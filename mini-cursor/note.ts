import { createAgent } from 'langchain'
import { MultiServerMCPClient } from '@langchain/mcp-adapters'

// 1. 创建 MCP Client，通过 npx 启动官方 FileSystem MCP
const mcpClient = new MultiServerMCPClient({
  mcpServers: {
    filesystem: {
      transport: 'stdio',
      command: 'npx',
      // 最后面是允许访问的目录
      args: ['-y', '@modelcontextprotocol/server-filesystem', process.cwd()],
    },
  },
})

// 2. 拿到 FileSystem MCP 暴露的所有工具
const tools = await mcpClient.getTools()
console.log(
  '可用的工具：',
  tools.map((t) => t.name),
)

// 3. 用 createAgent 创建 Agent，把工具交给它
const agent = createAgent({
  model: 'deepseek:deepseek-v4-flash',
  tools,
  systemPrompt:
    '你是一个文件管理助手，可以直接使用工具操作文件系统，不要反问，直接完成任务。',
})

// 4. 发起调用
const result = await agent.invoke({
  messages: [
    {
      role: 'user',
      content:
        '在当前目录下创建一个 notes.md 文件，写入一段关于 MCP 的笔记，然后列出当前目录，再读回 notes.md 的内容',
    },
  ],
})

console.log(result.messages.at(-1)?.content)

// 5. 关闭连接
await mcpClient.close()
