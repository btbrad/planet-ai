# planet-ai

一个 git 仓库，多个互相独立的 npm 项目。

根目录**不是** npm 包，也没有 `package.json`、没有 `node_modules`、没有共享的 lockfile。
每一个子文件夹都是自包含的独立项目：自己的 `package.json`、自己的 lockfile、自己的 `node_modules`。
在哪个文件夹里开发，就在哪个文件夹里装依赖、跑脚本。

## 目录结构

```
planet-ai/
├── .git/
├── .gitignore          # 根级忽略规则，对所有子项目生效
├── .gitattributes      # 统一换行为 LF，避免跨平台整文件 diff
├── README.md
│
├── ai-agent-of-js/     # 独立项目（bun）
│   ├── package.json
│   ├── bun.lock
│   ├── index.ts
│   └── .gitignore
│
└── <新项目>/            # 独立项目（npm）
    ├── package.json
    ├── package-lock.json
    ├── src/
    └── .gitignore
```

## 常用操作

### 在某个子项目里开发

```bash
cd ai-agent-of-js
npm install       # 或者 bun install，取决于该项目自己的技术栈
npm run dev
```

依赖安装、版本升级、脚本执行全部以子项目为边界，互不干扰。A 项目升级依赖不会影响 B 项目。

### 新建一个子项目

```bash
cd /d/code/planet-ai

mkdir my-new-app && cd my-new-app
npm init -y
npm install <deps>
```

然后在 `my-new-app/` 里放一份自己的 `.gitignore`（可选，根级那份已经覆盖了 `node_modules/`、`dist/`、`.env` 等常见项）。

最后回仓库根目录提交：

```bash
git add my-new-app
git commit -m "feat: add my-new-app"
```

### 日常提交

```bash
git status
git add <某个子项目>/    # 建议按子项目粒度提交，历史更清晰
git commit -m "..."
```

## 约定

- **不要在根目录执行 `npm install`**。根目录没有 `package.json`，这是有意为之——它保证了各子项目之间不会发生依赖提升或版本串味。
- **lockfile 要提交**（`package-lock.json` / `bun.lock` / `pnpm-lock.yaml`），且各项目各管各的。
- **`.env` 不要提交**。把 `${项目}/.env.example` 提交上去作为模板，真实值留在本地。
- **各子项目技术栈自由**。这里是 bun，那里是 npm，另一个是 pnpm，都行——只要它自包含。
- **提交粒度按子项目走**，一个子项目的改动尽量落在同一个 commit 里。
