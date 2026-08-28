# ATS-Quant Changelog

## v3.1.0-alpha2 (2026-08-09) — 安全稳定化

> 基于 alpha1 基线，完成交易安全边界修复（E-1/E-2），为 RC 评审固化第二个版本快照。

### 本版本内容
- E-1 生产边界：PRODUCTION 模式禁止 `risk_bypass` 绕过风控（`execution_gateway.py` 执行层门禁 + `api/strategy.py` API 门禁），拒绝写入审计（`RISK_BYPASS_REJECTED` / `risk_bypass_rejected`）。
- E-2 仓位安全：`trading_orchestrator._calculate_volume()` 统一经 `PositionSizingEngine` 计算手数，禁止把风险百分比直接当 lot；缺失输入保守回退 0.01。
- 测试：新增 `test_risk_bypass_boundary.py`（8 项）、`test_position_size_safety.py`（4 项公式 + 5 项守卫）；修复 `test_export_mt5_data.py` FakeMT5 全局污染问题。
- 真实数据准备：`data/market/` 已有 Exness XAUUSD H1 真实数据（2019-01-02 → 2026-07-31，44,931 根，OHLC 合法、无重复）；M15 仅覆盖 2022-05 之后；USTEC_x100m 暂无真实数据。
- 安全报告：`RISK_BYPASS_SECURITY_REPORT.md`、`POSITION_SIZE_SAFETY_REPORT.md`、`V3.1_SECURITY_FIX_REPORT.md`。

### 已知问题（详见 V3.1_ALPHA2_RC_GAP_REPORT.md）
1. 本机无 Python 3.10 验证环境（`.venv310/` 损坏），5 项 pandas 用例待目标环境验证。
2. 构建产物 `dist/ATS-Quant/_internal` 缺 PyJWT / waitress / jinja2，需重建。
3. TradeDecisionEngine 仅有设计文档，无代码；实盘 RiskController v2.0 与回测 RiskBrain v3.1.0 裁决未统一。
4. 官方真实数据报告（VALID_DATA）未产出；现有 Growth H1 报告基于合成数据。

### 稳定化目标（alpha2 → RC）
- B1 Git 基线固化（本版本完成）。
- B5 风控一致性：统一 TradeDecisionEngine 风险裁决。
- B4 真实数据：XAUUSD H1 正式回测（Research 口径）。
- B2 打包：补齐 PyJWT/waitress/jinja2 并重建。
- B3 Python 3.10：重建 `.venv310` 并生成 `requirements-lock-310.txt`。
- B6 环境可复现：随 B2/B3 一并解决。
## v3.1.0-alpha1 (2026-08-09) — 稳定化基线

> 本版本为 V3.1 Stabilization Phase 的基线快照，从 v3.0.0 之后的所有研发成果统一固化。

### 当前架构状态
- 桌面端入口 `main.py`（pywebview + WebView2），生产服务入口 `server_prod.py`（waitress），API 入口 `api_server.py`（Flask Blueprint 注册 + 中间件，11 个蓝图、422 条路由）。
- 分层：前端 web/（19 页）→ API 层（api/）→ 编排层（ats_controller / trading_orchestrator / ai_trader_v3）→ 行情/分析/策略层 → 风险层 → 执行层（execution_gateway）→ 记录/复盘层。
- ATS_MODE：PERSONAL / DEMO / PRODUCTION（PRODUCTION 强制 License 验证、设备绑定、激活检查，禁本地绕过）。

### 已完成模块
- API 模块化（v3.0.1）：api_server.py 仅负责 Flask 初始化/Blueprint 注册/中间件。
- 版本中心：`core/version.py` 单一权威 + `tools/sync_version.py` 同步工具。
- 鉴权与运行模式：JWT、ATS_MODE、SMTP 测试配置隔离（tests/config/smtp_config_test.json）。
- Aggressive Quant Phase A：Opportunity Engine（0-100 评分）+ RiskBrain 2.0（PASS / ADJUST / VETO / EVENT）。
- Aggressive Quant Phase B：Market Regime Engine（五态 + extreme 细分 + 品种模型接口）+ Opportunity/Regime 集成与 Shadow 日志。
- Growth 生态：Growth Manager、Strategy Interface（MarketContext → StrategySignal）、Strategy Registry、Strategy Lifecycle、Trend Breakout 策略 v1。
- 回测体系：Backtest Engine、Cost Model、Performance Report、压力测试、Verdict、Backtest Lab 任务管理（流式/回放/AI 解释）。
- RiskBrain 三层风控：TradeRisk（DynamicStop/DynamicTP/PositionSizing/TrailingStop）、AccountRisk（Drawdown/Exposure/CircuitBreaker）、MarketRisk（Volatility/News/BlackSwan），Shadow Parallel 新旧并联（只记录不裁决）。
- 审计与记忆：audit/（decision_trace、risk_audit、execution_audit、trade_audit、compliance_report）、DecisionMemory、StrategyMemory。
- i18n 基础：i18n/zh_CN.json、en_US.json、core/i18n.py。

### 已知问题（审计结论摘要，详见 ATS_ARCHITECTURE_AUDIT_REPORT.md）
1. 风控裁决链不唯一：实盘 RiskController v2.0 与 Shadow RiskBrain v3.1.0 并存，另有 RiskEngine v0.2.1 遗留预览层；平仓强制权分散于 RiskGuardian / Protection / DisasterRecovery。
2. 回测与实盘不一致：回测使用 RiskBrain v3.1.0 + growth/strategy_pool + 合成数据，实盘使用 RiskController v2.0 + signals/ + 真实 MT5。
3. 回测数据非真实：growth/backtest/data 仅含 synthetic 样本，正式报告会被标记 INVALID_DATA。
4. 环境不可复现：本机 Python 3.14 缺 flask/pandas/numpy 等依赖，部分测试失败属环境问题。
5. 版本治理：此前大量研发成果未提交；本版本已固化基线并创建 tag v3.1.0-alpha1。
6. 巨型文件与多源存储：ats_controller 114KB、api/strategy 109KB、17 个 SQLite + 5 个 JSONL 分散。

### 稳定化目标（Beta → RC）
- P0-1 版本基线固化（本版本完成）。
- P0-2 风控权责治理：冻结 RiskEngine v0.2.1，明确最终否决权唯一，Shadow 增加健康告警。
- P0-3 环境可复现：依赖锁定 + Environment Doctor + 测试失败分类。
- P0-4 真实数据闭环：MT5 导出真实 CSV → VALID_DATA → 重跑 M3。
- P0-5 回测实盘对齐：统一 TradeDecisionEngine 决策接口设计。
- P0-6 生产演练与打包验证：PRODUCTION 全流程演练、risk_bypass 最小化、重新打包。