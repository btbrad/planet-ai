import { tool } from '@langchain/core/tools'
import { z } from 'zod'

// 1. 读取文件
const readFileTool = tool(
  async ({ filePath }) => {
    const file = Bun.file(filePath)
    if (!(await file.exists())) {
      return `文件不存在: ${filePath}`
    }
    const content = await file.text()
    console.log(`[read_file] ${filePath} — ${content.length} 字节`)
    return `文件内容:\n${content}`
  },
  {
    name: 'read_file',
    description: '读取指定路径的文件内容',
    schema: z.object({ filePath: z.string().describe('文件路径') }),
  },
)

// 2. 写入文件（自动创建目录）
const writeFileTool = tool(
  async ({ filePath, content }) => {
    const dir = filePath.substring(0, filePath.lastIndexOf('/'))
    if (dir) await Bun.$`mkdir -p ${dir}`.quiet()
    await Bun.write(filePath, content)
    console.log(`[write_file] ${filePath} — ${content.length} 字节`)
    return `写入成功: ${filePath}`
  },
  {
    name: 'write_file',
    description: '写入文件内容，自动创建父目录',
    schema: z.object({
      filePath: z.string().describe('文件路径'),
      content: z.string().describe('文件内容'),
    }),
  },
)

// 3. 列出目录
const listDirectoryTool = tool(
  async ({ directoryPath }) => {
    const glob = new Bun.Glob('*')
    const entries = []
    for await (const entry of glob.scan({
      cwd: directoryPath,
      onlyFiles: false,
    })) {
      entries.push(entry)
    }
    console.log(`[list_directory] ${directoryPath} — ${entries.length} 项`)
    return `目录内容:\n${entries.map((f) => `  - ${f}`).join('\n')}`
  },
  {
    name: 'list_directory',
    description: '列出指定目录下的文件和文件夹',
    schema: z.object({ directoryPath: z.string().describe('目录路径') }),
  },
)

// 4. 执行命令
const executeCommandTool = tool(
  async ({
    command,
    workingDirectory,
  }: {
    command: string
    workingDirectory?: string
  }) => {
    const cwd = workingDirectory || process.cwd()
    console.log(`[execute_command] ${command} (cwd: ${cwd})`)

    return new Promise<string>((resolve) => {
      const [cmd, ...args] = command.split(' ')

      const proc = Bun.spawn([cmd, ...args], {
        cwd,
        stdout: 'pipe',
        stderr: 'pipe',
      })

      const chunks: string[] = []
      const errChunks: string[] = []

      const reader = proc.stdout.getReader()
      const errReader = proc.stderr.getReader()

      // 边读边输出到控制台
      const readStream = async () => {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const text = new TextDecoder().decode(value)
          chunks.push(text)
          process.stdout.write(text)
        }
      }

      const readErrStream = async () => {
        while (true) {
          const { done, value } = await errReader.read()
          if (done) break
          const text = new TextDecoder().decode(value)
          errChunks.push(text)
          process.stderr.write(text)
        }
      }

      Promise.all([readStream(), readErrStream()]).then(async () => {
        const exitCode = await proc.exited
        if (exitCode === 0) {
          const cwdHint = workingDirectory
            ? `\n\n提示：命令已在 "${workingDirectory}" 中执行。继续在此目录操作时，请使用 workingDirectory: "${workingDirectory}"`
            : ''
          resolve(`命令执行成功: ${command}${cwdHint}`)
        } else {
          const stderr = errChunks.join('')
          resolve(
            `命令执行失败，退出码: ${exitCode}${stderr ? '，错误: ' + stderr : ''}`,
          )
        }
      })
    })
  },
  {
    name: 'execute_command',
    description: '执行系统命令。支持 workingDirectory 参数指定工作目录',
    schema: z.object({
      command: z.string().describe('要执行的命令'),
      workingDirectory: z.string().optional().describe('工作目录'),
    }),
  },
)

export const tools = [
  readFileTool,
  writeFileTool,
  listDirectoryTool,
  executeCommandTool,
]
