# ai-agent-of-js

To install dependencies:

```bash
bun install
```

配置环境变量：

```bash
cp .env.example .env
```

然后编辑 `.env`，填入你的 `OPENAI_BASE_URL` 和 `OPENAI_API_KEY`。
`.env` 已被 git 忽略，不会提交到仓库；`.env.example` 只放占位值，可以安全提交。

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.4.2. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
