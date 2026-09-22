# LangChain `createAgent` 用法要点

> 来源：LangChain 官方文档
> - 概览/升级说明：https://docs.langchain.com/oss/javascript/releases/langchain-v1#createagent
> - Agents 指南：https://docs.langchain.com/oss/javascript/langchain/agents
> - API 参考：https://reference.langchain.com/javascript/langchain/index/createAgent

## 是什么

- `createAgent` 是 LangChain 1.0 中**构建 agent 的标准方式**（从 `langchain` 包导入）。
- 它比 LangGraph 的 prebuilt `createReactAgent` 接口更简单，同时通过 **middleware（中间件）** 提供更强的可定制能力。
- 底层就是一个基本 agent 循环：**调用模型 → 让模型选择并执行工具 → 当模型不再调用工具时结束**。
- 公式：**Agent = Model + Harness**（Harness = prompt + tools + middleware）。

## 最小示例

```ts
import { createAgent } from "langchain";

const agent = createAgent({
  model: "claude-sonnet-4-6",
  tools: [getWeather],
  systemPrompt: "You are a helpful assistant.",
});

const result = await agent.invoke({
  messages: [{ role: "user", content: "What is the weather in Tokyo?" }],
});

console.log(result.content);
```

## 主要配置项

| 参数 | 说明 |
| --- | --- |
| `model` | 模型标识字符串（`"provider:model"`，如 `"openai:gpt-5.5"`、`"anthropic:claude-sonnet-5"`）或已初始化的模型实例 |
| `tools` | 工具数组：LangChain tool、callable、tool dict 等 |
| `systemPrompt` | 系统提示词，接受 string 或 `SystemMessage`（部分示例中写作 `prompt`）；如需运行时动态 prompt 用 middleware |
| `responseFormat` | 结构化输出，传入 Zod schema，结果通过 `result.structuredResponse` 获取 |
| `middleware` | 中间件数组，用于扩展 harness（核心定制方式） |
| `name` | 给 agent 一个标识符，嵌入多 agent 系统作为子图时尤其有用 |
| `checkpointer` | 检查点存储，用于持久化/恢复对话（如 `new MemorySaver()`） |
| `store` | 长期记忆存储（如 `InMemoryStore` / `PostgresStore` / `MongoDBStore`） |

### 结构化输出示例

```ts
const Answer = z.object({ summary: z.string(), confidence: z.number() });

const agent = createAgent({
  model: "anthropic:claude-sonnet-5",
  tools,
  responseFormat: Answer,
});

const result = await agent.invoke({
  messages: [{ role: "user", content: "Summarize AI trends" }],
});
result.structuredResponse; // { summary: ..., confidence: ... }
```

## 调用（Invocation）

- 用 `agent.invoke(...)` 传入消息来调用，本质是向 agent 的 `State` 传入一次更新。
- 传入 `thread_id`（配合 `checkpointer`）即可**持久化并恢复**对话历史；同一会话的多轮对话复用同一个 `thread_id`。

```ts
import { createAgent } from "langchain";
import { MemorySaver } from "@langchain/langgraph";

const agent = createAgent({
  model: "openai:gpt-5.5",
  tools: [],
  checkpointer: new MemorySaver(),
});

const config = { configurable: { thread_id: crypto.randomUUID() } };

let result = await agent.invoke(
  { messages: [{ role: "user", content: "What's the weather in San Francisco?" }] },
  config,
);

// 同一会话的后续轮次：复用同一个 thread_id 以保留历史
result = await agent.invoke(
  { messages: [{ role: "user", content: "What about tomorrow?" }] },
  config,
);
```

## Agent State

- 每个 agent 通过 `AgentState` 管理执行上下文，保存对话历史及自定义字段。
- 内置字段：`messages`（`BaseMessage[]`，**只追加**：新消息被追加而非替换）。
- `AgentState` 也是传给所有 node 式 middleware hook（`beforeModel`、`afterModel` 等）的类型。
- 自定义字段：在 middleware 上用 `stateSchema`（`StateSchema` 或 Zod object）定义。

```ts
import { createAgent, createMiddleware } from "langchain";
import { StateSchema } from "@langchain/langgraph";
import * as z from "zod";

const MyState = new StateSchema({
  userId: z.string(),
  callCount: z.number().default(0),
});

const stateMiddleware = createMiddleware({
  name: "StateExtension",
  stateSchema: MyState,
});

const agent = createAgent({
  model: "openai:gpt-5.5",
  tools: [],
  middleware: [stateMiddleware],
});
```

## 通过 Middleware 定制（Configure the harness）

`createAgent` 高度可扩展，**middleware 是定制的核心原语**：每块中间件只负责一件事，在 agent 循环的合适时机挂载，可自由组合。常见能力分类：

- **Execution environment**：工具、文件系统、沙箱、代码执行
- **Context management**：摘要、记忆、技能、prompt 缓存
- **Planning and delegation**：待办列表、子 agent（并行/隔离）
- **Fault tolerance**：重试、降级、调用次数限制
- **Guardrails**：PII 检测、内容控制
- **Steering**：高风险动作前的人工审批（human-in-the-loop）

> 若想直接拿到预组装好的 harness（规划、文件系统、子 agent、记忆等），见 Deep Agents（基于 `createAgent` 构建）。需要自己配置 harness 时用 `createAgent`。

### 执行环境（文件系统）示例

```ts
import { createAgent } from "langchain";
import { createFilesystemMiddleware, StateBackend } from "deepagents";

const agent = createAgent({
  model: "openai:gpt-5.5",
  tools: [search],
  middleware: [createFilesystemMiddleware({ backend: new StateBackend() })],
});
```

## 长期记忆（store）

创建 store 并传给 `createAgent`，工具内可用 `runtime.store` 读写：

```ts
import { createAgent } from "langchain";
import { InMemoryStore } from "@langchain/langgraph";

// InMemoryStore 存于内存字典，生产环境请用数据库后端
const store = new InMemoryStore();

const agent = createAgent({
  model: "openai:gpt-5.5",
  tools: [],
  store,
});
```

## 小结

1. `import { createAgent } from "langchain";`
2. 至少提供 `model` 与 `tools`，用 `systemPrompt` 设置系统提示。
3. 用 `responseFormat` 拿结构化输出，用 `checkpointer` + `thread_id` 维持多轮会话。
4. 一切进阶能力都通过 `middleware` 组合实现；需要开箱即用就上 Deep Agents。
