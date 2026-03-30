# AdPilot AI - 智能广告投放策略助手

基于 AI Agent 的广告投放分析与优化平台。通过 **Tool Use（函数调用）** 机制确保数据准确性，从工程层面解决 AI 幻觉问题。

## 核心亮点

### 防 AI 幻觉三层机制

1. **Tool Use（工具调用）**：所有数据计算通过代码精确执行，不依赖 LLM 直接生成数字
2. **数据校验**：每个回答中的数字都有对应的计算函数和输入数据，可追溯验证
3. **来源引用**：回答附带数据来源标注，用户可展开查看完整计算过程

### 功能特性

- 上传 CSV/JSON 格式的广告投放数据，Agent 自动解析
- **广告平台接入**：巨量引擎、磁力引擎、腾讯广告 — OAuth 或 Access Token 连接，一键同步报表数据
- **对话中管理平台**：连接后可在对话中同步数据、查看/创建/修改广告计划（涉及预算的操作需谨慎）
- 自然语言提问："这周哪个渠道的 CPA 最高？"、"帮我制定下周的预算分配方案"
- 渠道指标对比（CPA、ROI、CTR、CVR）
- 广告活动排名分析
- 异常数据检测
- 智能预算分配建议
- 数据趋势可视化看板

### 广告平台与部署说明

- **OAuth 回调**：使用**你已绑定的站点域名**（如 Vercel 自定义域）。在各广告平台开发者后台，将回调地址配置为：  
  `https://你的域名/api/platforms/oauth?action=callback&platform=...`（`platform` 为 `ocean_engine` / `kuaishou` / `tencent_ads`）。
- **环境变量**：本地见 `.env.local.example`。Vercel：**Project → Settings → Environment Variables** 中配置 `OPENAI_API_KEY`、`OPENAI_BASE_URL`、`OPENAI_MODEL` 及平台 OAuth 相关变量（与示例文件同名即可）。

---

### 部署方式 A：GitHub + Vercel + 阿里云域名（推荐，国内访问更友好）

1. **推送到 GitHub**（仓库需先在 GitHub 创建；**若仓库是空的，必须先 push，Vercel 才能部署**）：
   ```bash
   git init
   git add .
   git commit -m "first commit"
   git branch -M main
   git remote add origin https://github.com/你的用户名/仓库名.git
   git push -u origin main
   ```
   若 Vercel 里 **Framework Preset** 显示 **Other**，多半是仓库仍为空或未含 `package.json`；推满代码后重新 **Import / Redeploy**，或手动把框架改为 **Next.js**。
2. **Vercel**：打开 [vercel.com](https://vercel.com) → 用 GitHub 登录 → **Add New → Project** → 选择该仓库 **Import** → 框架选 **Next.js**（一般自动识别）。
   - **Production Branch** 选 **`main`**（本仓库默认分支为 `main`；若 Vercel 报「找不到分支或仓库为空」，先确认 GitHub 上 `main` 已有代码再 Import）。
   - **Project Name** 若提示已存在，换一个未用过的名称（如 `ai-ad-agent`）。
   → 然后 **Deploy**。
3. **环境变量**：部署完成后在 Vercel 项目 **Settings → Environment Variables** 中填入与 `.env.local.example` 一致的变量（至少 LLM 相关项）。
4. **阿里云 / Cloudflare 域名**：Vercel **Settings → Domains** 添加域名；在 DNS 商处按 Vercel 显示的值添加 **CNAME**（根域按其说明配置）。若经 **Cloudflare 代理（橙云）**，SSL/TLS 建议 **Full (strict)**。

#### Vercel 显示 Ready 但访问是 404（NOT_FOUND）

- 仓库根目录已包含 [`vercel.json`](vercel.json)，其中 `"framework": "nextjs"`，用于避免项目被误判为 **Other** 而导致首页 404。
- 仍异常时：Vercel → **Settings → General → Framework Preset** 手动选 **Next.js**；**Root Directory** 留空或 `.`；**Output Directory** 留空；保存后 **Deployments → Redeploy**。
- 对比测试：若 `xxx.vercel.app` 正常而自定义域 404，检查 **Domains** 是否已添加该主机名，且 DNS 与 Vercel 要求一致。

---

### 部署方式 B：Cloudflare Workers（OpenNext）

- **国内访问**：`*.workers.dev` 可能不稳定，建议配合 **Cloudflare 自定义域名** 或改用上方 Vercel 方案。
- **自定义域名（Cloudflare DNS）**：在 `.env.local` 设置 `CUSTOM_WORKER_HOST=app.你的域名.com`（域名须在 Cloudflare 托管），再执行 `npm run deploy`。
- **Secrets**：可用 `wrangler secret put` 注入与 `.env.local.example` 同名的变量。

### 绑定自定义域名（仅 Cloudflare Workers 部署时）

1. 域名 DNS 托管在 **Cloudflare**，且与 Worker 同一账号。
2. `.env.local`：`CUSTOM_WORKER_HOST=app.你的域名.com`（不要带 `https://`）。
3. `npm run deploy` 会生成 `.wrangler.generated.jsonc` 并绑定 `custom_domain`。
4. 未设置 `CUSTOM_WORKER_HOST` 时，仅通过 `*.workers.dev` 访问。

## 技术栈

- **前端**：Next.js 15 + React 18 + Tailwind CSS + Framer Motion
- **图表**：Recharts
- **AI 核心**：Function Calling / Tool Use 架构
- **数据处理**：PapaParse（CSV 解析）

## 快速启动

```bash
npm install
npm run dev
# 访问 http://localhost:3000
```

点击左侧「加载示例数据」即可开始体验，无需配置 API Key。需要 LLM 分析时配置 `OPENAI_API_KEY` 等变量。

```bash
npm run deploy   # 仅用于 Cloudflare Workers（需已登录 wrangler，见上文方式 B）
```

日常用 **Vercel 连接 GitHub** 时，推送 `main` 分支即可自动构建部署，无需执行 `npm run deploy`。

## 架构设计

```
用户提问 → 意图识别 → 选择工具 → 代码执行精确计算 → 格式化输出 + 来源引用
                                    ↑
                            （非 LLM 生成数字）
```

这就是解决 AI 幻觉的工程化方案：**让 AI 负责理解和表达，让代码负责计算和推理**。
