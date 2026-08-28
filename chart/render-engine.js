/**
 * ATS-Quant Chart Engine v2 — Render Engine
 * 
 * Layer-based rendering pipeline. Manages the ordered rendering
 * of all chart layers: background → grid → indicators → candles →
 * overlays → volume → axes → crosshair.
 * 
 * Handles DPR (devicePixelRatio) scaling and debounced rendering.
 * 
 * @module chart-v2/render-engine
 */
(function(ATSChartV2) {
  'use strict';

  class RenderEngine {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {CanvasRenderingContext2D} ctx
     */
    constructor(canvas, ctx) {
      this.canvas = canvas;
      this.ctx = ctx;
      this._renderPending = false;
      this._renderCallback = null;
      this.lastLayout = null;
      // Phase D3：指标全量计算缓存（按指标签名失效）
      this._indCache = {};
    }

    /**
     * Set the render callback (called by ChartController)
     * @param {Function} callback
     */
    setRenderCallback(callback) {
      this._renderCallback = callback;
    }

    /**
     * Request a debounced render via requestAnimationFrame
     */
    requestRender() {
      if (this._renderPending) return;
      this._renderPending = true;
      requestAnimationFrame(() => {
        this._renderPending = false;
        this.render();
      });
    }

    /**
     * Immediate render (bypasses debounce)
     */
    render() {
      if (this._renderCallback) {
        this._renderCallback();
      }
    }

    /**
     * Resize canvas to match container, accounting for DPR
     */
    resize() {
      const dpr = window.devicePixelRatio || 1;
      const container = this.canvas.parentElement;
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        setTimeout(() => this.resize(), 200);
        return;
      }
      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;
      this.canvas.style.width = rect.width + 'px';
      this.canvas.style.height = rect.height + 'px';
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.requestRender();
    }

    /**
     * Get canvas dimensions in CSS pixels
     * @returns {{W, H, dpr}}
     */
    getDimensions() {
      const dpr = window.devicePixelRatio || 1;
      return {
        W: this.canvas.width / dpr,
        H: this.canvas.height / dpr,
        dpr: dpr
      };
    }

    /**
     * Calculate chart layout（Phase D3 多-Pane）
     * @param {number} W - Canvas width (CSS px)
     * @param {number} H - Canvas height (CSS px)
     * @param {Array} paneDefs - PaneManager 的 pane 定义列表
     * @returns {Object} Layout with pad/pw/ph/main rect + rects map
     */
    calculateLayout(W, H, paneDefs) {
      const pad = { top: 14, right: 78, bottom: 44, left: 6 };
      const pw = W - pad.left - pad.right;
      const ph = H - pad.top - pad.bottom;
      const defs = (paneDefs && paneDefs.length) ? paneDefs : [{ id: 'main', kind: 'price', height: 1, visible: true }];
      const visible = defs.filter(function (p) { return p.visible !== false; });
      let sum = 0;
      visible.forEach(function (p) { sum += (p.height || 1); });
      if (sum <= 0) sum = 1;
      let y = pad.top;
      const rects = {};
      visible.forEach(function (p, i) {
        let h = Math.max(24, ph * (p.height / sum));
        if (i === visible.length - 1) h = Math.max(24, pad.top + ph - y); // 吸收舍入误差
        rects[p.id] = { id: p.id, kind: p.kind, indicatorKey: p.indicatorKey || null, top: y, height: h, bottom: y + h };
        y += h;
      });
      const main = rects.main || visible[0] ? (rects[visible[0].id]) : { top: pad.top, height: ph, bottom: pad.top + ph };
      return { pad, pw, ph, rects, main };
    }

    /**
     * Render the complete chart
     * Orchestrates all layers in correct order
     * 
     * @param {Object} state - Chart state from controller
     * @param {Object} components - {candleRenderer, overlayLayer, crosshairLayer, indicatorRegistry, themeManager}
     */
    renderChart(state, components) {
      const { candleRenderer, overlayLayer, crosshairLayer, indicatorRegistry, themeManager, paneManager, drawingManager } = components;
      const ctx = this.ctx;
      const theme = themeManager.getTheme();
      const { W, H } = this.getDimensions();

      // Hide placeholder
      const placeholder = document.getElementById('chartPlaceholder');
      if (placeholder) placeholder.style.display = 'none';

      // No data
      if (!state.candles || !state.candles.length) return;

      // ===== Layout（Phase D3 多-Pane） =====
      const paneDefs = (paneManager && typeof paneManager.getPanes === 'function') ? paneManager.getPanes() : null;
      const { pad, pw, ph, rects, main } = this.calculateLayout(W, H, paneDefs);

      // ===== Background =====
      ctx.fillStyle = theme.background;
      ctx.fillRect(0, 0, W, H);

      // Right-side price axis panel
      ctx.fillStyle = theme.panelBackground;
      ctx.fillRect(pad.left + pw, 0, W - (pad.left + pw), H);

      // ===== Visible range (zoom + pan) =====
      const total = state.candles.length;
      const visCount = Math.max(15, Math.min(total, Math.floor(total / state.zoomLevel)));
      let startIdx = total - visCount - state.panOffset;
      if (startIdx < 0) startIdx = 0;
      let vis = state.candles.slice(startIdx, startIdx + visCount);

      // Transform to Heikin Ashi if needed
      // P2 修复：HA 必须基于全量数据转换后再按视口截取（与 indicator-pipeline 同原则）。
      // 原实现直接在可见切片上 toHeikinAshi(vis)，缩放/平移时 seed 不同导致首根 HA 漂移。
      if (state.chartType === 'heikin_ashi') {
        const fullHA = candleRenderer.toHeikinAshi(state.candles);
        vis = fullHA.slice(startIdx, startIdx + visCount);
      }

      // Store visible candles in state for interaction engine
      state.visibleCandles = vis;

      // ===== Indicators：全量计算 + 按 viewport 截取（Phase D3 P1 修复） =====
      // D3 P1：渲染只取可见指标；getAll() 现包含隐藏实例
      const indicators = (typeof indicatorRegistry.getVisible === 'function')
        ? indicatorRegistry.getVisible()
        : indicatorRegistry.getAll().filter(function (i) { return i.visible !== false; });
      const pipeline = (typeof ATSChartV2 !== 'undefined' && ATSChartV2.IndicatorPipeline)
        ? ATSChartV2.IndicatorPipeline : null;
      const indicatorValues = {};
      if (pipeline) {
        const full = pipeline.computeIndicators(indicatorRegistry, state.candles, this._indCache);
        Object.keys(full).forEach((key) => {
          const entry = full[key];
          indicatorValues[key] = {
            indicator: entry.indicator,
            values: pipeline.sliceIndicatorValues(entry.values, startIdx, visCount),
          };
        });
      } else {
        // 兜底：仍基于全量计算，绝不退化到 visible slice
        for (const ind of indicators) {
          const vals = ind.calculate(state.candles);
          if (vals !== null) {
            indicatorValues[ind.getName().toLowerCase()] = { indicator: ind, values: vals };
          }
        }
      }

      // ===== Price range =====
      const mainRect = main;
      const range = candleRenderer.calculateRange(
        vis, state.lastBid, state.lastAsk, state.lastPrice,
        _priceOverlayValues(indicatorValues)
      );
      const { minPrice, maxPrice, priceRange } = range;

      // ===== Coordinate functions =====
      const n = vis.length;
      const cx = (i) => pad.left + (visCount <= 1 ? pw / 2 : (i / (visCount - 1)) * pw);
      const cy = (p) => mainRect.top + (1 - (p - minPrice) / priceRange) * mainRect.height;
      const xFromTime = (time) => {
        if (time == null) return null;
        for (let i = 0; i < vis.length; i++) {
          if (vis[i].time >= time) return cx(i);
        }
        return null;
      };

      // Candle dimensions
      const slotW = pw / visCount;
      // D3.2：高倍放大时放宽硬上限，避免 K 线比例变形
      const bodyW = Math.max(1, Math.min(slotW * 0.75, 26));
      const wickW = Math.max(0.5, Math.min(bodyW * 0.12, 4));

      // Full layout object for layers
      const layout = {
        pad, pw, ph, W, H,
        main: mainRect, rects,
        cx, cy, xFromTime, bodyW, wickW,
        minPrice, maxPrice, priceRange,
        visibleCandles: vis,
        slotW,
        visCount
      };
      this.lastLayout = layout;

      // ===== Layer 1: Watermark =====
      overlayLayer.renderWatermark(ctx, layout, theme);

      // ===== Layer 2: Grid =====
      this._renderGrid(ctx, layout, theme);

      // ===== Layer 3: 主图叠加指标（paneType=price，如 EMA/BOLL） =====
      for (const ind of indicators) {
        const paneType = (typeof ind.getPaneType === 'function') ? ind.getPaneType() : 'price';
        if (paneType !== 'price') continue;
        const entry = indicatorValues[ind.getName().toLowerCase()];
        if (!entry || entry.values === null || entry.values === undefined) continue;
        const indLayout = Object.assign({}, layout, { candles: vis });
        ind.render(ctx, entry.values, indLayout, theme);
      }

      // ===== Layer 4: Candles =====
      candleRenderer.render(ctx, vis, layout, theme);

      // ===== Layer 5: Bid/Ask lines =====
      overlayLayer.renderBidAsk(ctx, layout, theme, state.lastBid, state.lastAsk);

      // ===== Layer 6: Current price line =====
      overlayLayer.renderCurrentPrice(ctx, layout, theme, state.lastPrice, vis);

      // ===== Layer 7: SL/TP lines =====
      if (state.positions && state.positions.length) {
        overlayLayer.renderSLTPLines(ctx, layout, theme, state.positions);
      }

      // ===== Layer 8: Position markers =====
      // P1 修复：统一交易标记（tradeMarks）存在时不重复绘制旧式 B/S 标记。
      // terminal 中 positions 与 tradeMarks 同源于 allPositions，叠加渲染会视觉重叠；
      // SL/TP 虚线（Layer 7）保留，来源色环标记（Layer 8b）为准。
      if (state.positions && state.positions.length &&
          !(state.tradeMarks && state.tradeMarks.length)) {
        overlayLayer.renderPositionMarkers(ctx, layout, theme, state.positions, vis);
      }

      // ===== Layer 8b: 统一交易标记（来源归因 MT5/Manual/AI/Strategy） =====
      if (state.tradeMarks && state.tradeMarks.length) {
        overlayLayer.renderTradeMarks(ctx, layout, theme, state.tradeMarks);
      }

      // ===== Layer 9: Volume pane =====
      this._renderVolume(ctx, layout, theme, vis);

      // ===== Layer 9b: 独立指标 Pane（RSI/MACD/ATR 等） =====
      for (const ind of indicators) {
        const paneType = (typeof ind.getPaneType === 'function') ? ind.getPaneType() : 'price';
        if (paneType === 'price' || paneType === 'volume') continue; // volume 由 _renderVolume 统一绘制
        const entry = indicatorValues[ind.getName().toLowerCase()];
        if (!entry || entry.values === null || entry.values === undefined) continue;
        const paneRect = paneType === 'volume'
          ? (rects && rects.volume) || null
          : _rectForIndicator(rects, ind.getName().toLowerCase());
        if (!paneRect) continue;
        this._renderIndicatorPane(ctx, layout, theme, ind, entry.values, paneRect);
      }

      // ===== Layer 10: 画线对象（D4 自由画线基础） =====
      if (drawingManager && typeof drawingManager.getVisible === 'function') {
        const drawings = drawingManager.getVisible();
        if (drawings && drawings.length) {
          overlayLayer.renderDrawings(ctx, layout, theme, drawings);
        }
      }

      // ===== Layer 11: Time axis =====
      this._renderTimeAxis(ctx, layout, theme, vis, state);

      // ===== Layer 12: Crosshair (always on top) =====
      crosshairLayer.render(ctx, layout, theme);

      // ===== Update price label =====
      if (state.lastPrice > 0 && typeof window.updatePriceLabel === 'function') {
        window.updatePriceLabel(state.lastPrice);
      }
    }

    /**
     * Render grid lines
     */
    _renderGrid(ctx, layout, theme) {
      const { pad, pw, main } = layout;
      const mainTop = main.top;
      const mainH = main.height;
      ctx.strokeStyle = theme.grid;
      ctx.lineWidth = 0.5;

      // Horizontal grid lines + price labels
      const gridLines = 6;
      for (let i = 0; i <= gridLines; i++) {
        const gy = mainTop + (i / gridLines) * mainH;
        ctx.beginPath();
        ctx.moveTo(pad.left, gy);
        ctx.lineTo(pad.left + pw, gy);
        ctx.stroke();

        const val = layout.maxPrice - (i / gridLines) * layout.priceRange;
        ctx.fillStyle = theme.textMuted;
        ctx.font = '9px "JetBrains Mono"';
        ctx.textAlign = 'left';
        ctx.fillText(val.toFixed(2), pad.left + pw + 4, gy + 3);
      }

      // Vertical grid lines
      const vGridCount = 6;
      for (let i = 0; i <= vGridCount; i++) {
        const gx = pad.left + (i / vGridCount) * pw;
        ctx.beginPath();
        ctx.moveTo(gx, mainTop);
        ctx.lineTo(gx, mainTop + mainH);
        ctx.stroke();
      }

      // 主图下边界
      ctx.strokeStyle = theme.border;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(pad.left, mainTop + mainH);
      ctx.lineTo(pad.left + pw, mainTop + mainH);
      ctx.stroke();
    }

    /**
     * Render volume bars
     */
    _renderVolume(ctx, layout, theme, vis) {
      const rect = layout.rects && layout.rects.volume;
      if (!rect) return;
      const { cx, bodyW } = layout;
      const baseY = rect.bottom - 2;
      let maxVol = 0;
      for (const c of vis) maxVol = Math.max(maxVol, c.vol || 0);
      if (maxVol <= 0) return;

      ctx.lineWidth = Math.max(0.5, bodyW * 0.3);
      for (let i = 0; i < vis.length; i++) {
        const c = vis[i];
        const x = cx(i);
        const h = ((c.vol || 0) / maxVol) * Math.max(0, rect.height - 4);
        ctx.strokeStyle = c.close >= c.open ? theme.volumeBull : theme.volumeBear;
        ctx.beginPath();
        ctx.moveTo(x, baseY);
        ctx.lineTo(x, baseY - h);
        ctx.stroke();
      }
    }

    /**
     * 渲染独立指标 Pane（Phase D3 多-Pane）：RSI/MACD/ATR 等
     * 使用 pane 自身的值域与坐标变换，绝不与主图共用价格刻度。
     */
    _renderIndicatorPane(ctx, layout, theme, ind, values, paneRect) {
      const { pad, pw, cx } = layout;
      let min = Infinity;
      let max = -Infinity;
      const fixed = (typeof ind.getFixedRange === 'function') ? ind.getFixedRange() : null;
      if (fixed) {
        min = fixed[0];
        max = fixed[1];
      } else {
        _collectRange(values, (v) => {
          if (v !== null && v !== undefined && isFinite(v)) {
            min = Math.min(min, v);
            max = Math.max(max, v);
          }
        });
      }
      if (!isFinite(min) || !isFinite(max)) { min = 0; max = 1; }
      if (max - min < 1e-12) max = min + 1;
      const cy = (v) => paneRect.top + (1 - (v - min) / (max - min)) * paneRect.height;
      this._renderPaneLabel(ctx, layout, theme, paneRect,
        (typeof ind.getPaneTitle === 'function' ? ind.getPaneTitle() : ind.getName()) +
        (fixed ? '  [' + fixed[0] + '-' + fixed[1] + ']' : ''));
      const indLayout = Object.assign({}, layout, {
        candles: layout.visibleCandles,
        paneRect: paneRect,
        cy: cy,
        paneMin: min,
        paneMax: max,
      });
      ind.render(ctx, values, indLayout, theme);
    }

    /**
     * 独立指标 pane 的标题行（右上角）
     */
    _renderPaneLabel(ctx, layout, theme, paneRect, text) {
      const { pad } = layout;
      ctx.fillStyle = theme.textMuted;
      ctx.font = '8px "JetBrains Mono"';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(text, pad.left + 2, paneRect.top + 2);
      ctx.textBaseline = 'alphabetic';
    }

    /**
     * Render time axis labels
     */
    _renderTimeAxis(ctx, layout, theme, vis, state) {
      const { pad, pw, H, cx, visCount } = layout;
      const n = vis.length;
      ctx.fillStyle = theme.textMuted;
      ctx.font = '9px "JetBrains Mono"';
      ctx.textAlign = 'center';
      if (n <= 0) return;

      // D3.2：周期自适应时间格式 + 标签步长防重叠
      const tfMin = _tfMinutes(state.timeframe);
      const fmt = _timeAxisFormat(tfMin);
      const sample = _formatTimeLabel(fmt, vis[n - 1].time);
      const labelW = ctx.measureText(sample).width || 60;
      const minGap = labelW + 12; // 相邻标签中心最小间距
      const slotW = layout.pw / Math.max(1, (visCount || n) - 1);
      let step = Math.max(1, Math.ceil(minGap / slotW));

      // 对齐自然时间边界：日内对齐整数小时，日线对齐周
      if (tfMin < 1440) {
        const barsPerHour = Math.max(1, Math.round(60 / tfMin));
        step = Math.ceil(step / barsPerHour) * barsPerHour;
      } else if (tfMin === 1440) {
        step = Math.max(1, Math.ceil(step / 7) * 7);
      }

      for (let i = 0; i < n; i += step) {
        const timeStr = vis[i].time ? _formatTimeLabel(fmt, vis[i].time) : '';
        if (!timeStr) continue;
        ctx.fillText(timeStr, cx(i), H - pad.bottom + 16);
      }
    }

    /**
     * Get last computed layout (for interaction engine)
     */
    getLastLayout() {
      return this.lastLayout;
    }
  }

  // ═══════════ 模块级辅助（Phase D3） ═══════════

  /** 只保留叠加在主图上的指标值（供 calculateRange 扩展价格范围） */
  function _priceOverlayValues(indicatorValues) {
    const out = {};
    Object.keys(indicatorValues || {}).forEach(function (key) {
      const entry = indicatorValues[key];
      const ind = entry && entry.indicator;
      const paneType = (ind && typeof ind.getPaneType === 'function') ? ind.getPaneType() : 'price';
      if (paneType === 'price') out[key] = entry.values;
    });
    return out;
  }

  /** 在 pane rects 中按指标 key 查找 */
  function _rectForIndicator(rects, key) {
    if (!rects) return null;
    const ids = Object.keys(rects);
    for (let i = 0; i < ids.length; i++) {
      if (rects[ids[i]].indicatorKey === key) return rects[ids[i]];
    }
    return null;
  }

  /** 周期 → 分钟数（D3.2 时间轴自适应） */
  function _tfMinutes(tf) {
    const map = { M1: 1, M5: 5, M15: 15, M30: 30, H1: 60, H4: 240, D1: 1440, W1: 10080, MN: 43200 };
    return map[tf] || 15;
  }

  /** 根据周期分钟数选择时间标签格式 */
  function _timeAxisFormat(tfMin) {
    if (tfMin >= 10080) return 'YM';     // W1 / MN → YYYY/MM
    if (tfMin >= 1440) return 'YMD';     // D1 → YYYY/MM/DD
    return 'MDHM';                        // M1~H4 → MM/DD HH:mm
  }

  /** 将 epoch 秒格式化为时间轴标签 */
  function _formatTimeLabel(fmt, ts) {
    if (!ts) return '';
    const dt = new Date(ts * 1000);
    const p = function (v) { return v.toString().padStart(2, '0'); };
    const Y = dt.getFullYear();
    const mo = p(dt.getMonth() + 1);
    const dd = p(dt.getDate());
    const hh = p(dt.getHours());
    const mm = p(dt.getMinutes());
    if (fmt === 'YM') return Y + '/' + mo;
    if (fmt === 'YMD') return Y + '/' + mo + '/' + dd;
    return mo + '/' + dd + ' ' + hh + ':' + mm;
  }

  /** 遍历数组或对象-of-数组中的数值（跳过 null/candles） */
  function _collectRange(values, cb) {
    if (values === null || values === undefined) return;
    if (Array.isArray(values)) { values.forEach(cb); return; }
    if (typeof values === 'object') {
      Object.keys(values).forEach(function (k) {
        if (k === 'candles') return;
        if (Array.isArray(values[k])) values[k].forEach(cb);
      });
    }
  }

  ATSChartV2.RenderEngine = RenderEngine;
})(window.ATSChartV2 = window.ATSChartV2 || {});
