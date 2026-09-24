import { McpServer } from '@modelcontextprotocol/server'
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio'
import * as z from 'zod/v4'

// 1. 创建 Server
const server = new McpServer({
  name: 'my-time-server',
  version: '1.0.0',
})

// 2. 声明一个工具
server.registerTool(
  'get_current_time',
  {
    description: '获取指定时区的当前时间，不传时区则使用上海时区',
    inputSchema: z.object({
      timezone: z
        .string()
        .optional()
        .describe('IANA 时区，例如 Asia/Shanghai、America/New_York'),
    }),
  },
  async ({ timezone }) => ({
    content: [
      {
        type: 'text',
        text: new Intl.DateTimeFormat('zh-CN', {
          timeZone: timezone || 'Asia/Shanghai',
          dateStyle: 'full',
          timeStyle: 'medium',
        }).format(new Date()),
      },
    ],
  }),
)

// 3. 连接 stdio 传输，启动
const transport = new StdioServerTransport()
await server.connect(transport)
