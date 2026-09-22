import { createAgent } from 'langchain'
import { MultiServerMCPClient } from '@langchain/mcp-adapters'

const mcpClient = new MultiServerMCPClient({
  mcpServers: {
    // 本地文件系统：stdio，拉起本地子进程
    filesystem: {
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', process.cwd()],
    },
    // LangChain 文档服务：http，直接连远程地址
    docs: {
      transport: 'http',
      url: 'https://docs.langchain.com/mcp',
    },
  },
})

const tools = await mcpClient.getTools()
console.log(
  '可用的工具：',
  tools.map((t) => t.name),
)

const agent = createAgent({
  model: 'deepseek:deepseek-v4-flash',
  tools,
  systemPrompt:
    '你是一个智能助手，拥有多种工具能力，需要时直接调用工具完成任务。',
})

const result = await agent.invoke({
  messages: [
    {
      role: 'user',
      content:
        '查一下 LangChain 里 createAgent 的用法，把要点保存到当前目录下的 create-agent.md 文件里',
    },
  ],
})

console.log(result.messages.at(-1)?.content)

await mcpClient.close()
