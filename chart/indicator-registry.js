/**
 * ATS-Quant Chart Engine v2 — Indicator Registry
 * 
 * Modular indicator system with registry pattern.
 * First batch: EMA, BOLL, Volume
 * Future: MACD, RSI, ATR, VWAP
 * 
 * @module chart-v2/indicator-registry
 */
(function(ATSChartV2) {
  'use strict';

  // ===== Base Indicator Class =====
  class BaseIndicator {
    constructor(config) {
      this.config = config || {};
      this.name = this.config.name || 'unknown';
      this.period = this.config.period || 14;
      this.color = this.config.color || '#F0B90B';
      this.visible = this.config.visible !== false;
    }

    /**
     * Calculate indicator values from candle data
     * @param {Array} candles - Array of {open, high, low, close, vol, time}
     * @returns {Array|null} Array of values (or null for insufficient data)
     */
    calculate(candles) {
      return null;
    }

    /**
     * Render indicator on canvas
     * @param {CanvasRenderingContext2D} ctx
     * @param {Array} values - Calculated values
     * @param {Object} layout - {cx, cy, pad, pw, ph, chartPh}
     * @param {Object} theme - Color palette from ThemeManager
     */
    render(ctx, values, layout, theme) {
      // Override in subclass
    }

    setVisible(v) { this.visible = v; }
    getColor() { return this.color; }
    getName() { return this.name; }

    /**
     * Pane 归属（Phase D3 多-Pane 架构）：
     *   'price'     → 叠加在主图（EMA/BOLL）
     *   'volume'    → 成交量 pane
     *   'indicator' → 独立指标 pane（RSI/MACD/ATR）
     */
    getPaneType() { return 'price'; }

    /**
     * 固定值域（如 RSI 0-100）；null 表示自动缩放。
     */
    getFixedRange() { return null; }

    getPaneTitle() { return this.name; }

    getConfig() { return Object.assign({}, this.config || {}); }
  }

  // ===== EMA Indicator =====
  class EMAIndicator extends BaseIndicator {
    constructor(config) {
      super(config);
      this.name = 'EMA';
      this.period = config.period || 20;
      this.color = config.color || '#F0B90B';
      this.lineWidth = config.lineWidth || 1;
    }

    calculate(candles) {
      if (!candles || candles.length < this.period) return null;
      const k = 2 / (this.period + 1);
      const result = [];
      let ema = candles[0].close;
      // Fill initial values with null until we have enough data
      for (let i = 0; i < this.period - 1; i++) result.push(null);
      // Calculate first SMA as EMA seed
      let sum = 0;
      for (let i = 0; i < this.period; i++) sum += candles[i].close;
      ema = sum / this.period;
      result.push(ema);
      // Calculate EMA for remaining
      for (let i = this.period; i < candles.length; i++) {
        ema = candles[i].close * k + ema * (1 - k);
        result.push(ema);
      }
      return result;
    }

    render(ctx, values, layout, theme) {
      if (!values || !this.visible) return;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.lineWidth;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < values.length; i++) {
        if (values[i] === null) { started = false; continue; }
        const x = layout.cx(i);
        const y = layout.cy(values[i]);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  // ===== Bollinger Bands Indicator =====
  class BOLLIndicator extends BaseIndicator {
    constructor(config) {
      super(config);
      this.name = 'BOLL';
      this.period = config.period || 20;
      this.stdDev = config.stdDev || 2;
      this.color = config.color || 'rgba(59,130,246,0.4)';
    }

    calculate(candles) {
      if (!candles || candles.length < this.period) return null;
      const upper = [], mid = [], lower = [];
      for (let i = 0; i < candles.length; i++) {
        if (i < this.period - 1) {
          upper.push(null); mid.push(null); lower.push(null);
          continue;
        }
        let sum = 0;
        for (let j = i - this.period + 1; j <= i; j++) sum += candles[j].close;
        const mean = sum / this.period;
        let sqSum = 0;
        for (let j = i - this.period + 1; j <= i; j++) sqSum += Math.pow(candles[j].close - mean, 2);
        const std = Math.sqrt(sqSum / this.period);
        upper.push(mean + this.stdDev * std);
        mid.push(mean);
        lower.push(mean - this.stdDev * std);
      }
      return { upper, mid, lower };
    }

    render(ctx, values, layout, theme) {
      if (!values || !this.visible) return;
      // Upper band
      this._drawLine(ctx, values.upper, layout, theme.bbUpper, 0.8);
      // Middle band
      this._drawLine(ctx, values.mid, layout, theme.bbMid, 0.8);
      // Lower band
      this._drawLine(ctx, values.lower, layout, theme.bbLower, 0.8);
      // Fill between upper and lower (subtle)
      ctx.fillStyle = 'rgba(59,130,246,0.03)';
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < values.upper.length; i++) {
        if (values.upper[i] === null) { started = false; continue; }
        const x = layout.cx(i), y = layout.cy(values.upper[i]);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      for (let i = values.lower.length - 1; i >= 0; i--) {
        if (values.lower[i] === null) continue;
        ctx.lineTo(layout.cx(i), layout.cy(values.lower[i]));
      }
      ctx.closePath();
      ctx.fill();
    }

    _drawLine(ctx, data, layout, color, w) {
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < data.length; i++) {
        if (data[i] === null) { started = false; continue; }
        const x = layout.cx(i), y = layout.cy(data[i]);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  // ===== RSI Indicator (Wilder smoothing) =====
  class RSIIndicator extends BaseIndicator {
    constructor(config) {
      super(config);
      this.name = 'RSI';
      this.period = config.period || 14;
      this.color = config.color || '#F0B90B';
    }

    calculate(candles) {
      if (!candles || candles.length < this.period + 1) return null;
      const closes = candles.map(c => c.close);
      const period = this.period;
      const result = [];
      for (let i = 0; i < period; i++) result.push(null);
      let gain = 0, loss = 0;
      for (let i = 1; i <= period; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff >= 0) gain += diff; else loss -= diff;
      }
      let avgGain = gain / period, avgLoss = loss / period;
      result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
      for (let i = period + 1; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        const g = diff > 0 ? diff : 0;
        const l = diff < 0 ? -diff : 0;
        avgGain = (avgGain * (period - 1) + g) / period;
        avgLoss = (avgLoss * (period - 1) + l) / period;
        result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
      }
      return result;
    }

    getPaneType() { return 'indicator'; }
    getFixedRange() { return [0, 100]; }
    getPaneTitle() { return 'RSI'; }

    render(ctx, values, layout, theme) {
      if (!values || !this.visible) return;
      const { pad, pw, cx, cy, paneRect } = layout;
      const top = paneRect ? paneRect.top : pad.top;
      const h = paneRect ? paneRect.height : (layout.paneMax - layout.paneMin);

      // 30/70 区间
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(122,133,153,0.35)';
      ctx.lineWidth = 0.5;
      [30, 70].forEach(function (lv) {
        const y = cy(lv);
        ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + pw, y); ctx.stroke();
      });
      ctx.setLineDash([]);

      // RSI 线
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < values.length; i++) {
        if (values[i] === null || values[i] === undefined) { started = false; continue; }
        const x = cx(i), y = cy(values[i]);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  // ===== MACD Indicator (12/26/9) =====
  class MACDIndicator extends BaseIndicator {
    constructor(config) {
      super(config);
      this.name = 'MACD';
      this.fast = config.fast || 12;
      this.slow = config.slow || 26;
      this.signal = config.signal || 9;
      this.color = config.color || '#F0B90B';
    }

    _emaArr(values, period) {
      const out = [];
      const k = 2 / (period + 1);
      for (let i = 0; i < values.length; i++) {
        if (i < period - 1) { out.push(null); continue; }
        if (i === period - 1) {
          let sum = 0;
          for (let j = i - period + 1; j <= i; j++) sum += values[j];
          out.push(sum / period);
        } else {
          out.push(values[i] * k + out[out.length - 1] * (1 - k));
        }
      }
      return out;
    }

    calculate(candles) {
      if (!candles || candles.length < this.slow + this.signal) return null;
      const closes = candles.map(c => c.close);
      const emaFast = this._emaArr(closes, this.fast);
      const emaSlow = this._emaArr(closes, this.slow);
      const macdLine = closes.map((_, i) => {
        if (emaFast[i] === null || emaSlow[i] === null) return null;
        return emaFast[i] - emaSlow[i];
      });
      // Signal = EMA9 of macd (non-null segments)
      const startIdx = macdLine.findIndex(v => v !== null);
      const signalArr = this._emaArr(macdLine, this.signal);
      const hist = macdLine.map((v, i) => (v !== null && signalArr[i] !== null) ? v - signalArr[i] : null);
      return { macd: macdLine, signal: signalArr, hist };
    }

    getPaneType() { return 'indicator'; }
    getPaneTitle() { return 'MACD'; }

    render(ctx, values, layout, theme) {
      if (!values || !this.visible) return;
      const { pad, pw, cx, cy, bodyW } = layout;
      // 柱状图（hist）
      if (values.hist) {
        ctx.lineWidth = Math.max(1, bodyW * 0.4);
        const zeroY = cy(0);
        for (let i = 0; i < values.hist.length; i++) {
          const v = values.hist[i];
          if (v === null || v === undefined) continue;
          const y = cy(v);
          ctx.strokeStyle = v >= 0 ? 'rgba(46,204,113,0.55)' : 'rgba(231,76,60,0.55)';
          ctx.beginPath(); ctx.moveTo(cx(i), zeroY); ctx.lineTo(cx(i), y); ctx.stroke();
        }
      }
      // macd / signal 线
      [['macd', this.color], ['signal', '#3B82F6']].forEach(function (pair) {
        const key = pair[0], color = pair[1];
        const arr = values[key];
        if (!arr) return;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < arr.length; i++) {
          if (arr[i] === null || arr[i] === undefined) { started = false; continue; }
          const x = cx(i), y = cy(arr[i]);
          if (!started) { ctx.moveTo(x, y); started = true; }
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });
    }
  }

  // ===== ATR Indicator (rolling mean, 与后端 ai_quality_engine._atr 一致) =====
  class ATRIndicator extends BaseIndicator {
    constructor(config) {
      super(config);
      this.name = 'ATR';
      this.period = config.period || 14;
      this.color = config.color || '#7C8DB5';
    }

    calculate(candles) {
      if (!candles || candles.length < this.period + 1) return null;
      const result = [];
      const period = this.period;
      const trs = [];
      for (let i = 1; i < candles.length; i++) {
        const h = candles[i].high, l = candles[i].low, pc = candles[i - 1].close;
        trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
      }
      for (let i = 0; i < candles.length; i++) {
        if (i < period) { result.push(null); continue; }
        let sum = 0;
        for (let j = i - period + 1; j <= i; j++) sum += trs[j - 1];
        result.push(sum / period);
      }
      return result;
    }

    getPaneType() { return 'indicator'; }
    getPaneTitle() { return 'ATR'; }

    render(ctx, values, layout, theme) {
      if (!values || !this.visible) return;
      const { cx, cy } = layout;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < values.length; i++) {
        if (values[i] === null || values[i] === undefined) { started = false; continue; }
        const x = cx(i), y = cy(values[i]);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  // ===== Volume Indicator =====
  class VolumeIndicator extends BaseIndicator {
    constructor(config) {
      super(config);
      this.name = 'Volume';
      this.color = config.color || null; // Uses bull/bear colors from theme
    }

    calculate(candles) {
      if (!candles || !candles.length) return null;
      let maxVol = 0;
      for (const c of candles) maxVol = Math.max(maxVol, c.vol || 0);
      return { maxVol, candles };
    }

    render(ctx, values, layout, theme) {
      if (!values || !this.visible || !values.maxVol) return;
      const { cx, bodyW, candles, paneRect } = layout;
      const baseY = paneRect ? paneRect.bottom - 2 : 0;
      const volH = paneRect ? Math.max(0, paneRect.height - 4) : 0;
      if (!paneRect) return;
      ctx.lineWidth = Math.max(0.5, bodyW * 0.3);
      for (let i = 0; i < candles.length; i++) {
        const c = candles[i];
        const x = cx(i);
        const h = ((c.vol || 0) / values.maxVol) * volH;
        ctx.strokeStyle = c.close >= c.open ? theme.volumeBull : theme.volumeBear;
        ctx.beginPath();
        ctx.moveTo(x, baseY);
        ctx.lineTo(x, baseY - h);
        ctx.stroke();
      }
    }

    getPaneType() { return 'volume'; }
    getPaneTitle() { return 'Volume'; }
  }

  // ===== Registry =====
  class IndicatorRegistry {
    constructor() {
      this._types = {};
      this._instances = [];
      this._registerDefaults();
    }

    _registerDefaults() {
      this.registerType('ema', EMAIndicator);
      this.registerType('boll', BOLLIndicator);
      this.registerType('volume', VolumeIndicator);
      this.registerType('rsi', RSIIndicator);
      this.registerType('macd', MACDIndicator);
      this.registerType('atr', ATRIndicator);
      // 第一批 32 个扩展指标（indicator-extra 系列文件注册到 ATSChartV2.IndicatorExtras）
      this._registerExtras();
    }

    /**
     * 装载扩展指标库（indicator-math.js + indicators-*.js 在 registry 之后加载，
     * 构造时 extras 已就绪）。注册名为小写 key，与 pane indicatorKey 一致。
     */
    _registerExtras() {
      const lib = ATSChartV2.IndicatorExtras;
      if (!lib) return;
      const self = this;
      Object.keys(lib).forEach(function (k) {
        self.registerType(k, lib[k]);
      });
    }

    /**
     * Register a new indicator type
     * @param {string} typeName
     * @param {Class} indicatorClass - Must extend BaseIndicator
     */
    registerType(typeName, indicatorClass) {
      this._types[typeName] = indicatorClass;
    }

    /**
     * Create and add an indicator instance
     * @param {string} typeName
     * @param {Object} config
     * @returns {BaseIndicator|null}
     */
    add(typeName, config) {
      const IndClass = this._types[typeName];
      if (!IndClass) {
        console.warn('[ChartV2] Unknown indicator type: ' + typeName);
        return null;
      }
      // D3 P1：config 允许省略（公开 API addIndicator(type)），
      // 各指标子类直接读 config.period/color 等，缺省时必须回退默认值，禁止抛错。
      const instance = new IndClass(config || {});
      this._instances.push(instance);
      return instance;
    }

    /**
     * Remove an indicator instance by index
     */
    remove(index) {
      if (index >= 0 && index < this._instances.length) {
        this._instances.splice(index, 1);
      }
    }

    /**
     * Remove all indicator instances
     */
    clear() {
      this._instances = [];
    }

    /**
     * Get all indicator instances（含隐藏）。
     * D3 P1：隐藏只是 visible=false，实例必须仍然可枚举，
     * 否则 setIndicatorVisible(key, true) 无法重新显示、removeIndicatorByKey 索引错位。
     */
    getAll() {
      return this._instances.slice();
    }

    /**
     * Get only visible indicator instances（渲染层使用）。
     */
    getVisible() {
      return this._instances.filter(function(i) { return i.visible !== false; });
    }

    /**
     * List available indicator type names
     */
    listTypes() {
      return Object.keys(this._types);
    }
  }

  ATSChartV2.IndicatorRegistry = IndicatorRegistry;
  ATSChartV2.BaseIndicator = BaseIndicator;
})(window.ATSChartV2 = window.ATSChartV2 || {});
