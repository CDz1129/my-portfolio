# My Portfolio

本地优先（local-first）的个人资产管理工具。参考 Percento「只记录重要变动、用资产负债表掌握全局」的理念，用中文界面管理 A 股、港股、美股、加密货币与各类资产负债。

> **数据永不离开你的浏览器。** 没有账号、没有登录、没有云端数据库，服务器不保存任何用户数据。

## 为什么做这个

大多数记账 / 资产管理应用需要注册账号，把你的资产明细上传到别人的服务器。My Portfolio 反过来：**所有数据只存在于你自己的浏览器**（IndexedDB），代码完全开源可审查。你甚至可以把它部署到任何静态托管或 Cloudflare Workers 上，而数据依然只在每个人各自的浏览器里。

## 隐私承诺

- 账户、持仓、流水、设置全部存储在浏览器 **IndexedDB**（数据库名 `my-portfolio`）。
- 演示数据存放在**独立的数据库** `my-portfolio-demo`，与你的真实数据完全隔离，可一键切换查看。
- 行情服务是**无状态代理**：只负责向行情源转发请求，从不接收、记录或存储你的持仓与账目。
- **无账号、无登录、无追踪、无统计**。
- 唯一的外发请求是获取**公开行情**（股价、汇率、代码搜索），其中不包含任何个人信息。

需要注意：数据绑定在「同一浏览器 + 同一域名」之下。清除站点数据、使用无痕窗口或更换浏览器都会得到一份独立数据。因此请定期用「设置 → 备份与恢复」导出 JSON 备份，便于迁移与留档。

## 功能

- **多账户**：流动资金、投资、固定资产、应收款、负债五类，支持分组、归档与自定义颜色。
- **持仓管理**：代码搜索自动补全名称 / 市场 / 币种并拉取现价，记录股数、成本、现价。
- **流水记录**：收入、支出、转账、买入、卖出、余额调整。
- **总览**：净资产、总资产 / 总负债、资产配置环形图、投资表现、净资产走势。
- **趋势**：按区间查看净资产曲线与配置变化。
- **多币种**：12 种常用货币，统一换算为你的主货币显示。
- **行情同步**：可配置自动更新频率（每天 / 每周 / 每月 / 每季度 / 从不），随时可手动更新。
- **数据管理**：CSV 导出（流水）、完整 JSON 备份与恢复、类型化确认的安全清空。
- **PWA**：可安装到桌面 / 手机，支持离线使用。
- **深浅色主题**：跟随系统或手动切换。

## 技术栈

- **前端**：React 18 + TypeScript + Vite 5
- **样式**：Tailwind CSS
- **本地存储**：Dexie（IndexedDB）+ dexie-react-hooks（响应式实时查询）
- **图表**：Recharts
- **图标**：lucide-react
- **PWA**：vite-plugin-pwa（Workbox）
- **测试**：Vitest + Testing Library
- **行情代理**：Node（本地）与 Cloudflare Worker（云端）共用同一套逻辑

## 架构要点

- **事件溯源账本**：账户只保存 `openingBalance`，其余余额都由流水回放得出。这样历史与趋势可以自由重算，无需额外存储。
- **演示数据隔离**：演示数据在独立数据库；旧版本曾混入真实库的演示数据会在启动时自动迁移隔离。
- **行情降级链**：Yahoo 为主，腾讯（A / 港股 / 美股，GBK 解码）与 OKX（加密货币）逐级兜底，保证国内网络可用性。
- **设置与数据分离**：主货币、汇率、主题、同步频率等属于「应用偏好」，始终保存在真实库；演示视图共用这些偏好。

## 目录结构

```
src/
  domain/       纯业务逻辑：类型、货币换算、事件溯源账本、总览视图模型
  db/           Dexie 数据库与仓储（CRUD、CSV、备份/恢复、演示数据）
  store/        应用用例（actions）、数据模式与同步
  components/   UI 组件（表单、图表、搜索、导航、模式切换条）
  pages/        页面路由
  lib/          行情 API 客户端、主题、工具
server/         行情代理（Node 服务 + Vite 中间件 + 共用 market 逻辑）
worker.mjs      Cloudflare Worker 入口（静态资源 + /api）
wrangler.toml   Cloudflare 部署配置
scripts/        macOS launchd 服务安装 / 卸载、图标生成
```

## 快速开始

要求 Node 18+。

```bash
npm install
npm run dev        # 开发模式 http://localhost:5173
npm run start      # 构建并以本地 Node 服务运行 http://localhost:4173
```

常用脚本：

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | Vite 开发服务器（含行情代理中间件） |
| `npm run build` | 类型检查 + 生产构建 |
| `npm start` | 构建并启动本地服务（默认 4173 端口） |
| `npm run serve` | 仅启动本地服务（不重新构建） |
| `npm test` | 运行全部测试 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run deploy` | 构建并部署到 Cloudflare Workers |
| `npm run service:install` | macOS 开机自启（launchd） |

## 行情数据源

| 用途 | 数据源 |
| --- | --- |
| 港股 / 美股 / A 股报价 | Yahoo Finance，失败时降级到腾讯行情 |
| 加密货币报价 | Yahoo，失败时降级到 OKX |
| 汇率 | open.er-api.com |
| 代码搜索 | 腾讯 smartbox + Yahoo，去重合并 |

行情接口均为公开数据。若在受限网络下部分源不可用，会逐个降级，不会影响本地记账。

## 部署

### Cloudflare Workers（推荐，前后端一体）

仓库已包含 `worker.mjs` 与 `wrangler.toml`，同一个 Worker 既托管前端静态资源，也处理 `/api/*`：

```bash
npx wrangler login
npm run deploy
```

### GitHub Pages（仅前端）

GitHub Pages 只能托管静态文件，无法运行 `/api` 行情代理。若只想托管前端，需要：

1. 在 `vite.config.ts` 设置 `base: '/<仓库名>/'`；
2. 为客户端路由添加 `404.html` 回退（或改用 HashRouter）；
3. 把行情代理部署到 Cloudflare Worker / Serverless，并通过环境变量指向它：

```bash
VITE_MARKET_API=https://your-worker.workers.dev npm run build
```

不配置行情源时，资产价格可完全手动录入，所有本地功能不受影响。

## 测试

```bash
npm test          # 全部测试
npm run coverage  # 覆盖率报告
```

测试覆盖领域逻辑、数据库仓储、行情解析与降级、Worker 路由及关键 UI 组件。

## 路线图

- [ ] 定投 / 再平衡辅助
- [ ] 更丰富的报表与导出
- [ ] 可选的自建同步后端（保持默认离线）

## 贡献

欢迎提交 Issue 与 Pull Request。请保持「本地优先、隐私第一」的方向，并为新逻辑补充测试（本项目以 TDD 为主）。

## 许可

[MIT](./LICENSE)

---

本项目仅用于个人资产记录，不构成任何投资建议。
