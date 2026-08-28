# ATS-Quant

**AI-Powered Trading Workspace** — 专业量化交易终端项目

> 本仓库为 ATS-Quant 的**技术展示仓库（Showcase）**，仅包含精选的前端可视化组件、示例资源与架构文档。
> ATS-Quant 是商业量化交易平台；本仓库**不包含**商业产品的账户体系、授权（License/Entitlement）、云端服务、交易接入、AI 与策略引擎等核心模块。

---

## What is ATS-Quant?

ATS-Quant 是一个面向专业交易者的量化交易终端项目，覆盖**行情可视化 → 策略研究 → 回测验证 → 实盘执行 → 风控审计**的完整工作流。

本项目长期处于活跃开发状态：从桌面交易终端起步，逐步演进为「桌面终端 + 云端服务 + Web 门户」的产品形态，并在持续的安全审计、架构收敛与商业化迭代中打磨。

## Core Features

- **Chart Workspace**：高性能 Canvas K 线渲染引擎，多面板（pane）布局、十字光标、绘图工具、主题管理
- **指标体系**：趋势 / 动量 / 波动率 / 成交量 / 强弱指标的可插拔流水线（pipeline）架构
- **量化工作流**：策略研究、回测、实盘执行、风险控制（属于商业版本，不在本仓库）

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                     ATS-Quant 产品形态                       │
│                                                            │
│   Desktop (Windows)      Cloud Services       Web Portal    │
│   ┌──────────────┐      ┌──────────────┐    ┌───────────┐  │
│   │ Chart UI     │      │ 账户 / 授权    │    │ 官网 / 门户 │  │
│   │ 交易工作台    │      │ 云端 API      │    │ 用户中心    │  │
│   │ 策略/回测/风控 │      │ 数据服务      │    │ 管理后台    │  │
│   └──────┬───────┘      └──────┬───────┘    └─────┬─────┘  │
│          └────────────────────┼───────────────────┘        │
│                               ▼                            │
│                   数据层（行情 / 交易记录 / 用户数据）         │
└────────────────────────────────────────────────────────────┘
```

本仓库展示的是**桌面端 Chart Workspace** 的可视化层（`chart/`），它是一组与后端解耦的纯前端组件。

## Chart Workspace

`chart/` 下的组件构成一个完整的浏览器端图表工作区：

| 组件 | 职责 |
|---|---|
| `render-engine.js` / `pane-manager.js` | Canvas 渲染引擎与多面板管理 |
| `candle-renderer.js` | K 线蜡烛渲染 |
| `indicator-pipeline.js` / `indicator-registry.js` | 指标注册与流水线执行 |
| `indicators-*.js` | 趋势 / 动量 / 波动率 / 成交量 / 强弱指标实现 |
| `crosshair-layer.js` / `drawing-manager.js` / `overlay-layer.js` | 十字光标 / 绘图 / 覆盖层 |
| `interaction-engine.js` / `theme-manager.js` | 交互与主题 |

这些组件**不依赖任何后端服务**，可作为独立前端模块研究、复用与展示。

## Roadmap

- 项目路线图见 [ROADMAP.md](ROADMAP.md)
- 版本演进记录见 [CHANGELOG.md](CHANGELOG.md)

## Development

- 本仓库仅含前端展示组件与文档，运行示例与开发环境搭建见后续 `examples/`（规划中）
- 技术交流欢迎通过 Issue / Discussion

## Commercial Edition

ATS-Quant 是**商业产品**。账户系统、授权体系（License / Entitlement / 设备绑定 / 激活码）、云端服务、券商接入、AI 与策略引擎、管理后台等核心模块**不属于本仓库**，仅在商业版本中提供。

- 本仓库用于：技术展示、UI/Chart 展示、架构交流、示例与研究
- 商业授权不受本仓库影响；任何绕过商业授权的尝试均违反 [LICENSE](LICENSE) 条款

## License

本仓库采用 **Source-Available 自定义许可**（非 OSI 开源许可）。详见 [LICENSE](LICENSE)。

> 允许查看、学习、研究、展示；**禁止**商业使用、再分发、SaaS、创建竞争产品与闭源二次开发。

## Website

- 商业产品官网与文档：https://ats-quant.com
