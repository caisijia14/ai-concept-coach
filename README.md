# AI Concept Coach

一个可部署的 AI 概念学习原型：输入概念后，生成概念卡、小测、结果分析、掌握度更新和待复习计划。

当前版本已经具备：
- 概念学习工作区
- 3 道自动小测
- 错题分析 / 薄弱点 / review advice
- 多 demo 用户切换
- SQLite 持久化
- SQLite schema / 数据库内容可视化
- Render 部署配置

## Tech Stack

- Node.js 24
- 原生 HTTP server
- 内置 SQLite (`node:sqlite`)
- 纯前端 HTML / CSS / JS

## Local Run

```bash
cd /Users/bytedance/Documents/Codex/ai-concept-coach-demo
npm start
```

默认地址：

```text
http://localhost:3030
```

本地数据库默认路径：

```text
data/concept-coach.db
```

## Deployment

本项目已经整理成可直接部署到 Render 的状态。

关键文件：
- `render.yaml`
- `server.js`
- `DEPLOY.md`

### 最短部署步骤

1. 把这个目录推到一个 Git 仓库。
2. 在 Render 中选择 **New +** -> **Blueprint**（或 Web Service）。
3. 连接你的 Git 仓库。
4. 确认以下设置：
   - Runtime: Node
   - Start Command: `npm start`
   - Health Check Path: `/healthz`
   - Persistent Disk Mount Path: `/var/data`
5. 点击 Deploy。
6. 部署完成后，打开 Render 分配给你的公开链接。

### 线上数据库路径

Render 上会通过环境变量把 SQLite 数据库存到：

```text
/var/data/concept-coach.db
```

## Environment Variables

线上已经在 `render.yaml` 里配置：

- `NODE_VERSION=24`
- `SQLITE_DB_PATH=/var/data/concept-coach.db`

本地如果不设置 `SQLITE_DB_PATH`，会自动回退到：

```text
data/concept-coach.db
```

## Project Structure

```text
ai-concept-coach-demo/
├── data/
│   └── store.json
├── public/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── DEPLOY.md
├── package.json
├── README.md
├── render.yaml
└── server.js
```

## Notes

- `store.json` 现在主要作为兜底迁移种子保留。
- 真正运行时数据优先写入 SQLite。
- 如果后续要做正式注册登录，建议把 fake user switcher 替换成 Supabase Auth，并把 SQLite 升级成 Postgres。
