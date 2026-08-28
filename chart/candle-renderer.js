/**
 * ATS-Quant Chart Engine v2 — Candle Renderer
 * 
 * Renders candlesticks in multiple chart types:
 * - Candle (standard OHLC candlesticks)
 * - OHLC Bar (美国线)
 * - Hollow Candle (空心K线)
 * - Volume Candle (成交量K线)
 * - Line (close price line)
 * - Line with Markers (带标记线)
 * - Step Line (阶梯线)
 * - Area Chart (面积图)
 * - HLC Area (HLC区域)
 * - Baseline (基准线)
 * - Histogram (柱状图)
 * - High-Low (高低)
 * - Heikin Ashi (smoothed candlesticks)
 * 
 * @module chart-v2/candle-renderer
 */
(function(ATSChartV2) {
  'use strict';

  class CandleRenderer {
    constructor() {
      this.chartType = 'candle';
    }

    /**
     * Set chart type
     * @param {string} type - One of the supported chart type keys
     */
    setChartType(type) {
      this.chartType = type;
    }

    /**
     * Get current chart type
     */
    getChartType() {
      return this.chartType;
    }

    /**
     * Transform candles to Heikin Ashi
     * @param {Array} candles - Original OHLC candles
     * @returns {Array} Heikin Ashi candles
     */
    toHeikinAshi(candles) {
      if (!candles || !candles.length) return [];
      const result = [];
      let prevHA = null;
      for (let i = 0; i < candles.length; i++) {
        const c = candles[i];
        const close = (c.open + c.high + c.low + c.close) / 4;
        const open = prevHA ? (prevHA.open + prevHA.close) / 2 : (c.open + c.close) / 2;
        const high = Math.max(c.high, open, close);
        const low = Math.min(c.low, open, close);
        const ha = { open: open, high: high, low: low, close: close, vol: c.vol, time: c.time };
        result.push(ha);
        prevHA = ha;
      }
      return result;
    }

    /**
     * Calculate price range from visible candles
     * @param {Array} vis - Visible candles
     * @param {number} lastBid
     * @param {number} lastAsk
     * @param {number} lastPrice
     * @param {Object} indicatorValues - For including indicator range (BOLL bands etc)
     * @returns {{minPrice, maxPrice, priceRange}}
     */
    calculateRange(vis, lastBid, lastAsk, lastPrice, indicatorValues) {
      let minPrice = Infinity, maxPrice = -Infinity;
      for (const c of vis) {
        minPrice = Math.min(minPrice, c.low);
        maxPrice = Math.max(maxPrice, c.high);
      }
      // Include BOLL bands in range
      if (indicatorValues && indicatorValues.boll) {
        for (const v of indicatorValues.boll.upper) {
          if (v !== null) { minPrice = Math.min(minPrice, v); maxPrice = Math.max(maxPrice, v); }
        }
        for (const v of indicatorValues.boll.lower) {
          if (v !== null) { minPrice = Math.min(minPrice, v); maxPrice = Math.max(maxPrice, v); }
        }
      }
      // Include EMA in range
      if (indicatorValues && indicatorValues.ema) {
        for (const v of indicatorValues.ema) {
          if (v !== null) { minPrice = Math.min(minPrice, v); maxPrice = Math.max(maxPrice, v); }
        }
      }
      // Include bid/ask/last price
      if (lastBid > 0) { minPrice = Math.min(minPrice, lastBid); maxPrice = Math.max(maxPrice, lastBid); }
      if (lastAsk > 0) { minPrice = Math.min(minPrice, lastAsk); maxPrice = Math.max(maxPrice, lastAsk); }
      if (lastPrice > 0) { minPrice = Math.min(minPrice, lastPrice); maxPrice = Math.max(maxPrice, lastPrice); }

      const padP = (maxPrice - minPrice) * 0.08;
      minPrice -= padP;
      maxPrice += padP;
      const priceRange = maxPrice - minPrice || 1;
      return { minPrice, maxPrice, priceRange };
    }

    /**
     * Render candles on canvas
     * @param {CanvasRenderingContext2D} ctx
     * @param {Array} vis - Visible candles (already transformed if Heikin Ashi)
     * @param {Object} layout - {cx, cy, pad, pw, ph, chartPh, bodyW, wickW}
     * @param {Object} theme - Color palette
     */
    render(ctx, vis, layout, theme) {
      switch (this.chartType) {
        case 'ohlc_bar':          this._renderOhlcBar(ctx, vis, layout, theme); break;
        case 'hollow_candle':     this._renderHollowCandle(ctx, vis, layout, theme); break;
        case 'volume_candle':     this._renderVolumeCandle(ctx, vis, layout, theme); break;
        case 'line':              this._renderLine(ctx, vis, layout, theme); break;
        case 'line_with_markers': this._renderLineWithMarkers(ctx, vis, layout, theme); break;
        case 'step_line':         this._renderStepLine(ctx, vis, layout, theme); break;
        case 'area_chart':        this._renderAreaChart(ctx, vis, layout, theme); break;
        case 'hlc_area':          this._renderHlcArea(ctx, vis, layout, theme); break;
        case 'baseline':          this._renderBaseline(ctx, vis, layout, theme); break;
        case 'histogram':         this._renderHistogram(ctx, vis, layout, theme); break;
        case 'high_low':          this._renderHighLow(ctx, vis, layout, theme); break;
        case 'heikin_ashi':       this._renderCandles(ctx, vis, layout, theme); break;
        case 'candle':
        default:                  this._renderCandles(ctx, vis, layout, theme); break;
      }
    }

    /**
     * Bottom of the main price pane (Y coordinate for area fills)
     */
    _baseY(layout) {
      if (layout.main && layout.main.bottom) return layout.main.bottom;
      return (layout.pad.top || 0) + (layout.ph || 0);
    }

    /**
     * Render OHLC Bar (美国线): vertical high-low line +
     * left open tick + right close tick.
     */
    _renderOhlcBar(ctx, vis, layout, theme) {
      const { cx, cy, bodyW, wickW } = layout;
      const tick = Math.max(1, bodyW * 0.55);
      for (let i = 0; i < vis.length; i++) {
        const c = vis[i];
        const xi = cx(i);
        const bullish = c.close >= c.open;
        const color = bullish ? theme.bull : theme.bear;

        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, wickW);
        ctx.beginPath();
        ctx.moveTo(xi, cy(c.high));
        ctx.lineTo(xi, cy(c.low));
        ctx.stroke();

        // Open tick (left of the bar)
        ctx.beginPath();
        ctx.moveTo(xi - tick, cy(c.open));
        ctx.lineTo(xi, cy(c.open));
        ctx.stroke();

        // Close tick (right of the bar)
        ctx.beginPath();
        ctx.moveTo(xi, cy(c.close));
        ctx.lineTo(xi + tick, cy(c.close));
        ctx.stroke();
      }
    }

    /**
     * Render Hollow Candlestick (空心K线):
     * bullish bodies are hollow (background fill + outline),
     * bearish bodies are solid.
     */
    _renderHollowCandle(ctx, vis, layout, theme) {
      const { cx, cy, bodyW, wickW } = layout;
      for (let i = 0; i < vis.length; i++) {
        const c = vis[i];
        const xi = cx(i);
        const bullish = c.close >= c.open;
        const color = bullish ? theme.bull : theme.bear;
        const yOpen = cy(c.open), yClose = cy(c.close);
        const yHigh = cy(c.high), yLow = cy(c.low);
        const bodyH = Math.max(1, Math.abs(yClose - yOpen));
        const bodyY = Math.min(yOpen, yClose);

        ctx.strokeStyle = color;
        ctx.lineWidth = wickW;
        ctx.beginPath();
        ctx.moveTo(xi, yHigh);
        ctx.lineTo(xi, yLow);
        ctx.stroke();

        if (bullish) {
          ctx.fillStyle = theme.background;
          ctx.fillRect(xi - bodyW / 2, bodyY, bodyW, bodyH);
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.strokeRect(xi - bodyW / 2 + 0.5, bodyY + 0.5,
            Math.max(0, bodyW - 1), Math.max(0, bodyH - 1));
        } else {
          ctx.fillStyle = color;
          ctx.fillRect(xi - bodyW / 2, bodyY, bodyW, bodyH);
        }
      }
    }

    /**
     * Render Volume Candlestick (成交量K线):
     * body width and fill intensity scale with volume relative to
     * the maximum volume in the visible range.
     */
    _renderVolumeCandle(ctx, vis, layout, theme) {
      const { cx, cy, bodyW, wickW } = layout;
      let maxVol = 0;
      for (const c of vis) if (c.vol > maxVol) maxVol = c.vol;
      if (maxVol <= 0) {
        this._renderCandles(ctx, vis, layout, theme);
        return;
      }
      for (let i = 0; i < vis.length; i++) {
        const c = vis[i];
        const xi = cx(i);
        const bullish = c.close >= c.open;
        const color = bullish ? theme.bull : theme.bear;
        const ratio = Math.max(0.25, Math.min(1, (c.vol || 0) / maxVol));
        const w = Math.max(1, bodyW * ratio);
        const yOpen = cy(c.open), yClose = cy(c.close);
        const yHigh = cy(c.high), yLow = cy(c.low);
        const bodyH = Math.max(1, Math.abs(yClose - yOpen));
        const bodyY = Math.min(yOpen, yClose);

        ctx.strokeStyle = color;
        ctx.lineWidth = wickW;
        ctx.beginPath();
        ctx.moveTo(xi, yHigh);
        ctx.lineTo(xi, yLow);
        ctx.stroke();

        ctx.globalAlpha = 0.35 + 0.65 * ratio;
        ctx.fillStyle = color;
        ctx.fillRect(xi - w / 2, bodyY, w, bodyH);
        ctx.globalAlpha = 1;
      }
    }

    /**
     * Draw the close-price polyline only (no area fill).
     */
    _drawCloseLine(ctx, vis, layout, theme, lineWidth) {
      const { cx, cy } = layout;
      if (!vis.length) return;
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = lineWidth || 1.5;
      ctx.beginPath();
      for (let i = 0; i < vis.length; i++) {
        const x = cx(i), y = cy(vis[i].close);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    /**
     * Render Line with Markers (带标记线):
     * close-price polyline plus a dot at every data point.
     */
    _renderLineWithMarkers(ctx, vis, layout, theme) {
      this._drawCloseLine(ctx, vis, layout, theme, 1.5);
      const { cx, cy } = layout;
      ctx.fillStyle = theme.accent;
      for (let i = 0; i < vis.length; i++) {
        ctx.beginPath();
        ctx.arc(cx(i), cy(vis[i].close), 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    /**
     * Render Step Line (阶梯线): close prices connected with
     * horizontal steps (staircase).
     */
    _renderStepLine(ctx, vis, layout, theme) {
      const { cx, cy } = layout;
      if (!vis.length) return;
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx(0), cy(vis[0].close));
      for (let i = 1; i < vis.length; i++) {
        ctx.lineTo(cx(i), cy(vis[i - 1].close));
        ctx.lineTo(cx(i), cy(vis[i].close));
      }
      ctx.stroke();
    }

    /**
     * Render Area Chart (面积图): close-price line with a
     * translucent fill down to the bottom of the price pane.
     */
    _renderAreaChart(ctx, vis, layout, theme) {
      const { cx, cy } = layout;
      if (!vis.length) return;
      const baseY = this._baseY(layout);
      ctx.fillStyle = theme.accentDim;
      ctx.beginPath();
      ctx.moveTo(cx(0), baseY);
      for (let i = 0; i < vis.length; i++) ctx.lineTo(cx(i), cy(vis[i].close));
      ctx.lineTo(cx(vis.length - 1), baseY);
      ctx.closePath();
      ctx.fill();
      this._drawCloseLine(ctx, vis, layout, theme, 1.5);
    }

    /**
     * Render HLC Area (HLC区域): high/low lines plus close line
     * with a translucent fill between high and low.
     */
    _renderHlcArea(ctx, vis, layout, theme) {
      const { cx, cy } = layout;
      if (!vis.length) return;

      ctx.fillStyle = theme.accentDim;
      ctx.beginPath();
      for (let i = 0; i < vis.length; i++) ctx.lineTo(cx(i), cy(vis[i].high));
      for (let i = vis.length - 1; i >= 0; i--) ctx.lineTo(cx(i), cy(vis[i].low));
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = theme.textMuted;
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      for (let i = 0; i < vis.length; i++) {
        const x = cx(i), y = cy(vis[i].high);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < vis.length; i++) {
        const x = cx(i), y = cy(vis[i].low);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      this._drawCloseLine(ctx, vis, layout, theme, 1.2);
    }

    /**
     * Render Baseline (基准线): fills the region between each close
     * and the baseline (first visible close) — bullish above, bearish
     * below — with a dashed baseline and the close-price line.
     */
    _renderBaseline(ctx, vis, layout, theme) {
      const { cx, cy } = layout;
      if (!vis.length) return;
      const baseline = vis[0].close;
      const baseY = cy(baseline);
      const half = Math.max(1, layout.slotW * 0.4);

      for (let i = 0; i < vis.length; i++) {
        const y = cy(vis[i].close);
        ctx.fillStyle = vis[i].close >= baseline ? theme.bull : theme.bear;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(cx(i) - half / 2, Math.min(y, baseY), half, Math.max(1, Math.abs(y - baseY)));
      }
      ctx.globalAlpha = 1;

      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = theme.textMuted;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx(0), baseY);
      ctx.lineTo(cx(vis.length - 1), baseY);
      ctx.stroke();
      ctx.setLineDash([]);

      this._drawCloseLine(ctx, vis, layout, theme, 1.2);
    }

    /**
     * Render Histogram (柱状图): vertical bars whose height represents
     * the close-to-previous-close price change.
     */
    _renderHistogram(ctx, vis, layout, theme) {
      const { cx, cy } = layout;
      if (!vis.length) return;
      const w = Math.max(1, layout.slotW * 0.6);
      for (let i = 0; i < vis.length; i++) {
        const c = vis[i];
        const prev = i > 0 ? vis[i - 1].close : c.open;
        const y = cy(c.close), yPrev = cy(prev);
        const bullish = c.close >= prev;
        ctx.fillStyle = bullish ? theme.bull : theme.bear;
        ctx.globalAlpha = 0.55;
        ctx.fillRect(cx(i) - w / 2, Math.min(y, yPrev), w, Math.max(1, Math.abs(y - yPrev)));
      }
      ctx.globalAlpha = 1;
    }

    /**
     * Render High-Low (高低): vertical line from high to low only.
     */
    _renderHighLow(ctx, vis, layout, theme) {
      const { cx, cy, wickW } = layout;
      for (let i = 0; i < vis.length; i++) {
        const c = vis[i];
        const bullish = c.close >= c.open;
        ctx.strokeStyle = bullish ? theme.bull : theme.bear;
        ctx.lineWidth = Math.max(1, wickW);
        ctx.beginPath();
        ctx.moveTo(cx(i), cy(c.high));
        ctx.lineTo(cx(i), cy(c.low));
        ctx.stroke();
      }
    }

    /**
     * Render standard candlesticks
     */
    _renderCandles(ctx, vis, layout, theme) {
      const { cx, cy, bodyW, wickW } = layout;
      const n = vis.length;
      for (let i = 0; i < n; i++) {
        const c = vis[i];
        const xi = cx(i);
        const yOpen = cy(c.open), yClose = cy(c.close);
        const yHigh = cy(c.high), yLow = cy(c.low);
        const bullish = c.close >= c.open;
        const bodyH = Math.max(1, Math.abs(yClose - yOpen));
        const bodyY = Math.min(yOpen, yClose);
        const color = bullish ? theme.bull : theme.bear;

        // Wick (shadow)
        ctx.strokeStyle = color;
        ctx.lineWidth = wickW;
        ctx.beginPath();
        ctx.moveTo(xi, yHigh);
        ctx.lineTo(xi, yLow);
        ctx.stroke();

        // Body fill
        ctx.fillStyle = color;
        ctx.fillRect(xi - bodyW / 2, bodyY, bodyW, bodyH);

        // Subtle border for definition
        ctx.strokeStyle = bullish ? theme.bullBorder : theme.bearBorder;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(xi - bodyW / 2 + 0.25, bodyY + 0.25,
          Math.max(0, bodyW - 0.5), Math.max(0, bodyH - 0.5));
      }
    }

    /**
     * Render line chart (线形图): close-price polyline only.
     */
    _renderLine(ctx, vis, layout, theme) {
      this._drawCloseLine(ctx, vis, layout, theme, 1.5);
    }
  }

  ATSChartV2.CandleRenderer = CandleRenderer;
})(window.ATSChartV2 = window.ATSChartV2 || {});
