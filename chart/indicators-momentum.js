/**
 * ATS-Quant Chart Engine v2 — 扩展指标库 · B 动量/震荡（第一批）
 *
 * Stochastic / StochRSI / CCI / Williams %R / ROC / TSI
 *
 * 全部独立实现；副图 pane（getPaneType() = 'indicator'），
 * 使用 render-engine._renderIndicatorPane 提供的 pane 独立坐标。
 */
(function (ATSChartV2) {
  'use strict';
  const M = ATSChartV2.IndicatorMath;

  // ═══════════ Stochastic（随机指标 %K/%D） ═══════════
  class StochasticIndicator extends ATSChartV2.BaseIndicator {
    constructor(config) {
      super(config);
      this.name = 'STOCH';
      this.period = config.period || 14;
      this.kPeriod = config.kPeriod || 3;
      this.dPeriod = config.dPeriod || 3;
      this.color = config.color || '#F0B90B';
    }
    calculate(candles) {
      const p = this.period, sk = this.kPeriod, sd = this.dPeriod;
      if (!candles || candles.length < p) return null;
      const n = candles.length;
      const rawK = new Array(n).fill(null);
      for (let i = 0; i < n; i++) {
        if (i < p - 1) continue;
        let hh = -Infinity, ll = Infinity;
        for (let j = i - p + 1; j <= i; j++) {
          if (candles[j].high > hh) hh = candles[j].high;
          if (candles[j].low < ll) ll = candles[j].low;
        }
        rawK[i] = hh === ll ? 50 : (candles[i].close - ll) / (hh - ll) * 100;
      }
      const k = M.smaSeries(rawK, sk);
      const d = M.smaSeries(k, sd);
      return { k: k, d: d };
    }
    getPaneType() { return 'indicator'; }
    getFixedRange() { return [0, 100]; }
    getPaneTitle() { return 'STOCH'; }
    render(ctx, values, layout, theme) {
      if (!values || !values.k || !this.visible) return;
      _drawRefLines(ctx, layout, [30, 70]);
      _drawLine(ctx, layout, values.k, '#F0B90B', 1);
      _drawLine(ctx, layout, values.d, '#3B82F6', 1);
    }
  }

  // ═══════════ StochRSI（RSI 的随机指标） ═══════════
  class StochRSIIndicator extends ATSChartV2.BaseIndicator {
    constructor(config) {
      super(config);
      this.name = 'STOCHRSI';
      this.rsiPeriod = config.rsiPeriod || 14;
      this.period = config.period || 14;
      this.kPeriod = config.kPeriod || 3;
      this.dPeriod = config.dPeriod || 3;
      this.color = config.color || '#22D3EE';
    }
    calculate(candles) {
      const rp = this.rsiPeriod, p = this.period, sk = this.kPeriod, sd = this.dPeriod;
      if (!candles || candles.length < rp + p + 1) return null;
      const rsi = M.rsi(candles, rp);
      const n = rsi.length;
      const rawK = new Array(n).fill(null);
      for (let i = 0; i < n; i++) {
        if (i < rp + p - 1) continue;
        let hh = -Infinity, ll = Infinity;
        for (let j = i - p + 1; j <= i; j++) {
          if (rsi[j] === null) continue;
          if (rsi[j] > hh) hh = rsi[j];
          if (rsi[j] < ll) ll = rsi[j];
        }
        if (!isFinite(hh) || !isFinite(ll)) continue;
        rawK[i] = hh === ll ? 50 : (rsi[i] - ll) / (hh - ll) * 100;
      }
      const k = M.smaSeries(rawK, sk);
      const d = M.smaSeries(k, sd);
      return { k: k, d: d };
    }
    getPaneType() { return 'indicator'; }
    getFixedRange() { return [0, 100]; }
    getPaneTitle() { return 'StochRSI'; }
    render(ctx, values, layout, theme) {
      if (!values || !values.k || !this.visible) return;
      _drawRefLines(ctx, layout, [20, 80]);
      _drawLine(ctx, layout, values.k, this.color, 1);
      _drawLine(ctx, layout, values.d, '#3B82F6', 1);
    }
  }

  // ═══════════ CCI（商品通道指数） ═══════════
  class CCIIndicator extends ATSChartV2.BaseIndicator {
    constructor(config) {
      super(config);
      this.name = 'CCI';
      this.period = config.period || 20;
      this.constant = config.constant || 0.015;
      this.color = config.color || '#F59E0B';
    }
    calculate(candles) {
      const p = this.period, cons = this.constant;
      if (!candles || candles.length < p) return null;
      const n = candles.length;
      const out = new Array(n).fill(null);
      const tp = candles.map(c => (c.high + c.low + c.close) / 3);
      for (let i = 0; i < n; i++) {
        if (i < p - 1) continue;
        let sum = 0;
        for (let j = i - p + 1; j <= i; j++) sum += tp[j];
        const mean = sum / p;
        let mad = 0;
        for (let j = i - p + 1; j <= i; j++) mad += Math.abs(tp[j] - mean);
        mad /= p;
        out[i] = mad === 0 ? 0 : (tp[i] - mean) / (cons * mad);
      }
      return out;
    }
    getPaneType() { return 'indicator'; }
    getPaneTitle() { return 'CCI'; }
    render(ctx, values, layout, theme) {
      if (!values || !this.visible) return;
      _drawRefLines(ctx, layout, [-100, 100]);
      _drawLine(ctx, layout, values, this.color, 1);
    }
  }

  // ═══════════ Williams %R ═══════════
  class WILLRIndicator extends ATSChartV2.BaseIndicator {
    constructor(config) {
      super(config);
      this.name = 'WILLR';
      this.period = config.period || 14;
      this.color = config.color || '#A855F7';
    }
    calculate(candles) {
      const p = this.period;
      if (!candles || candles.length < p) return null;
      const n = candles.length;
      const out = new Array(n).fill(null);
      for (let i = 0; i < n; i++) {
        if (i < p - 1) continue;
        let hh = -Infinity, ll = Infinity;
        for (let j = i - p + 1; j <= i; j++) {
          if (candles[j].high > hh) hh = candles[j].high;
          if (candles[j].low < ll) ll = candles[j].low;
        }
        out[i] = hh === ll ? 0 : -100 * (hh - candles[i].close) / (hh - ll);
      }
      return out;
    }
    getPaneType() { return 'indicator'; }
    getFixedRange() { return [-100, 0]; }
    getPaneTitle() { return 'WILLR'; }
    render(ctx, values, layout, theme) {
      if (!values || !this.visible) return;
      _drawRefLines(ctx, layout, [-80, -20]);
      _drawLine(ctx, layout, values, this.color, 1);
    }
  }

  // ═══════════ ROC（变动率） ═══════════
  class ROCIndicator extends ATSChartV2.BaseIndicator {
    constructor(config) {
      super(config);
      this.name = 'ROC';
      this.period = config.period || 12;
      this.color = config.color || '#3B82F6';
    }
    calculate(candles) {
      const p = this.period;
      if (!candles || candles.length < p + 1) return null;
      const n = candles.length;
      const out = new Array(n).fill(null);
      for (let i = 0; i < n; i++) {
        if (i < p) continue;
        const prev = candles[i - p].close;
        out[i] = prev === 0 ? 0 : (candles[i].close - prev) / prev * 100;
      }
      return out;
    }
    getPaneType() { return 'indicator'; }
    getPaneTitle() { return 'ROC'; }
    render(ctx, values, layout, theme) {
      if (!values || !this.visible) return;
      _drawZeroLine(ctx, layout, theme);
      _drawLine(ctx, layout, values, this.color, 1);
    }
  }

  // ═══════════ TSI（真实强弱指标） ═══════════
  class TSIIndicator extends ATSChartV2.BaseIndicator {
    constructor(config) {
      super(config);
      this.name = 'TSI';
      this.longPeriod = config.longPeriod || 25;
      this.shortPeriod = config.shortPeriod || 13;
      this.color = config.color || '#2ECC71';
    }
    calculate(candles) {
      const lp = this.longPeriod, sp = this.shortPeriod;
      if (!candles || candles.length < 2) return null;
      const closes = candles.map(c => c.close);
      const n = closes.length;
      const mom = new Array(n).fill(0);
      for (let i = 1; i < n; i++) mom[i] = closes[i] - closes[i - 1];
      const emaL = M.emaSeries(mom, lp);
      const emaS = M.emaSeries(emaL, sp);
      const absMom = mom.map(Math.abs);
      const absL = M.emaSeries(absMom, lp);
      const absS = M.emaSeries(absL, sp);
      const out = new Array(n).fill(null);
      for (let i = 0; i < n; i++) {
        if (emaS[i] === null || absS[i] === null) continue;
        out[i] = absS[i] === 0 ? 0 : 100 * emaS[i] / absS[i];
      }
      return out;
    }
    getPaneType() { return 'indicator'; }
    getPaneTitle() { return 'TSI'; }
    render(ctx, values, layout, theme) {
      if (!values || !this.visible) return;
      _drawZeroLine(ctx, layout, theme);
      _drawLine(ctx, layout, values, this.color, 1);
    }
  }

  // ═══════════ 公共绘制 ═══════════
  function _drawLine(ctx, layout, values, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 1;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < values.length; i++) {
      if (values[i] === null || values[i] === undefined) { started = false; continue; }
      const x = layout.cx(i), y = layout.cy(values[i]);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function _drawRefLines(ctx, layout, levels) {
    const { pad, pw, cy } = layout;
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = 'rgba(122,133,153,0.35)';
    ctx.lineWidth = 0.5;
    levels.forEach(function (lv) {
      const y = cy(lv);
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + pw, y); ctx.stroke();
    });
    ctx.setLineDash([]);
  }

  function _drawZeroLine(ctx, layout, theme) {
    const { pad, pw, cy } = layout;
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = 'rgba(122,133,153,0.35)';
    ctx.lineWidth = 0.5;
    const y = cy(0);
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + pw, y); ctx.stroke();
    ctx.setLineDash([]);
  }

  // ═══════════ 注册到 IndicatorExtras ═══════════
  ATSChartV2.IndicatorExtras = ATSChartV2.IndicatorExtras || {};
  ATSChartV2.IndicatorExtras.stoch = StochasticIndicator;
  ATSChartV2.IndicatorExtras.stochrsi = StochRSIIndicator;
  ATSChartV2.IndicatorExtras.cci = CCIIndicator;
  ATSChartV2.IndicatorExtras.willr = WILLRIndicator;
  ATSChartV2.IndicatorExtras.roc = ROCIndicator;
  ATSChartV2.IndicatorExtras.tsi = TSIIndicator;
})(window.ATSChartV2 = window.ATSChartV2 || {});
