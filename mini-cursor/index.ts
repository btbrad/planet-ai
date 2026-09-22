import { createAgent } from 'langchain'
import { MultiServerMCPClient } from '@langchain/mcp-adapters'
import { tools } from './tools.ts'

// 1. 通过 npx 启动官方 FileSystem MCP，拿到文件工具
const mcpClient = new MultiServerMCPClient({
  mcpServers: {
    filesystem: {
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', process.cwd()],
    },
  },
})

const fileTools = await mcpClient.getTools()

// 2. FileSystem MCP 没有 execute_command，补一个手写的，两者混用
const allTools = [...fileTools, tools[3]]

// 3. 创建 Agent
const agent = createAgent({
  model: 'deepseek:deepseek-v4-flash',
  tools: allTools as any,
  systemPrompt: `你是一个项目管理助手，可以使用工具操作文件系统和执行命令。

工作目录: ${process.cwd()}

可用工具:
- read_file: 读取文件内容
- write_file: 写入文件（自动创建目录）
- list_directory: 列出目录
- execute_command: 执行命令

重要规则:
- 回复简洁，只说明做了什么`,
})

const query = `创建一个 React TodoList 项目，并安装依赖项，然后运行该项目`

const result = await agent.invoke(
  {
    messages: [{ role: 'user', content: query }],
  },
  { recursionLimit: 1000 },
)

console.log('\n✅ 完成:', result.messages.at(-1)?.content)

// 4. 关闭连接
await mcpClient.close()
