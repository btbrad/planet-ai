// 1. 定义我们提供的工具列表
const tools = [
  {
    name: 'get_current_time',
    description: '获取指定时区的当前时间，不传时区则使用上海时区',
    inputSchema: {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description: 'IANA 时区，例如 Asia/Shanghai、America/New_York',
        },
      },
    },
  },
]

// 2. 工具的具体实现
function getCurrentTime(timezone?: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: timezone || 'Asia/Shanghai',
    dateStyle: 'full',
    timeStyle: 'medium',
  }).format(new Date())
}

// 3. 往 stdout 写一条 JSON-RPC 消息
function respond(message: unknown) {
  process.stdout.write(JSON.stringify(message) + '\n')
}

// 4. 处理请求，返回结果
async function handle(request: any) {
  const { id, method, params } = request

  switch (method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2026-07-28',
          capabilities: { tools: {} },
          serverInfo: { name: 'my-time-server', version: '1.0.0' },
        },
      }

    case 'tools/list':
      return { jsonrpc: '2.0', id, result: { tools } }

    case 'tools/call': {
      const { name, arguments: args } = params
      if (name === 'get_current_time') {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: getCurrentTime(args?.timezone) }],
            isError: false,
          },
        }
      }
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: `未知工具: ${name}` }],
          isError: true,
        },
      }
    }

    case 'ping':
      return { jsonrpc: '2.0', id, result: {} }

    default:
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method not found: ${method}` },
      }
  }
}

// 5. 从 stdin 逐行读取，逐条处理
// Bun 的 console 是可迭代对象，遍历它就能逐行拿到 stdin 的输入
for await (const line of console) {
  const trimmed = line.trim()
  if (!trimmed) continue

  let request: any
  try {
    request = JSON.parse(trimmed)
  } catch {
    continue // 非法 JSON，直接忽略
  }

  // 通知类消息（没有 id）不需要回复，比如 notifications/initialized
  if (request.id === undefined || request.id === null) continue

  handle(request).then(respond)
}
