/**
 * ATS-Quant Chart Engine v2 — 扩展指标库 · C 波动率/通道（第一批）
 *
 * BBWIDTH / Donchian / Keltner / Squeeze / STDDEV
 *
 * 全部独立实现。Donchian / Keltner 为主图叠加（'price'），
 * BBWIDTH / Squeeze / STDDEV 为副图 pane（'indicator'）。
 */
(function (ATSChartV2) {
  'use strict';
  const M = ATSChartV2.IndicatorMath;

  // ═══════════ Bollinger Band Width（带宽） ═══════════
  class BBWIDTHIndicator extends ATSChartV2.BaseIndicator {
    constructor(config) {
      super(config);
      this.name = 'BBWIDTH';
      this.period = config.period || 20;
      this.stdDev = config.stdDev || 2;
      this.color = config.color || '#3B82F6';
    }
    calculate(candles) {
      if (!candles || candles.length < this.period) return null;
      const b = M.boll(candles, this.period, this.stdDev);
      const n = b.mid.length;
      const out = new Array(n).fill(null);
      for (let i = 0; i < n; i++) {
        if (b.mid[i] === null || b.mid[i] === 0) continue;
        out[i] = (b.upper[i] - b.lower[i]) / b.mid[i];
      }
      return out;
    }
    getPaneType() { return 'indicator'; }
    getPaneTitle() { return 'BBWIDTH'; }
    render(ctx, values, layout, theme) {
      if (!values || !this.visible) return;
      _drawLine(ctx, layout, values, this.color, 1);
    }
  }

  // ═══════════ Donchian Channel（唐奇安通道） ═══════════
  class DonchianIndicator extends ATSChartV2.BaseIndicator {
    constructor(config) {
      super(config);
      this.name = 'DONCHIAN';
      this.period = config.period || 20;
      this.color = config.color || 'rgba(59,130,246,0.4)';
    }
    calculate(candles) {
      const p = this.period;
      if (!candles || candles.length < p) return null;
      const n = candles.length;
      const upper = new Array(n).fill(null), mid = new Array(n).fill(null), lower = new Array(n).fill(null);
      for (let i = 0; i < n; i++) {
        if (i < p - 1) continue;
        let hh = -Infinity, ll = Infinity;
        for (let j = i - p + 1; j <= i; j++) {
          if (candles[j].high > hh) hh = candles[j].high;
          if (candles[j].low < ll) ll = candles[j].low;
        }
        upper[i] = hh; lower[i] = ll; mid[i] = (hh + ll) / 2;
      }
      return { upper: upper, mid: mid, lower: lower };
    }
    getPaneType() { return 'price'; }
    render(ctx, values, layout, theme) {
      if (!values || !values.upper || !this.visible) return;
      _drawLine(ctx, layout, values.upper, '#F0B90B', 0.8);
      _drawLine(ctx, layout, values.mid, 'rgba(122,133,153,0.6)', 0.6);
      _drawLine(ctx, layout, values.lower, '#3B82F6', 0.8);
    }
  }

  // ═══════════ Keltner Channel（肯特纳通道） ═══════════
  class KeltnerIndicator extends ATSChartV2.BaseIndicator {
    constructor(config) {
      super(config);
      this.name = 'KELTNER';
      this.period = config.period || 20;
      this.mult = config.mult || 2;
      this.color = config.color || 'rgba(240,185,11,0.4)';
    }
    calculate(candles) {
      const p = this.period, m = this.mult;
      if (!candles || candles.length < p + 1) return null;
      const closes = candles.map(c => c.close);
      const ema = M.emaSeries(closes, p);
      const atr = M.atrSeries(candles, p);
      const n = candles.length;
      const upper = new Array(n).fill(null), lower = new Array(n).fill(null);
      for (let i = 0; i < n; i++) {
        if (ema[i] === null || atr[i] === null) continue;
        upper[i] = ema[i] + m * atr[i];
        lower[i] = ema[i] - m * atr[i];
      }
      return { upper: upper, mid: ema, lower: lower };
    }
    getPaneType() { return 'price'; }
    render(ctx, values, layout, theme) {
      if (!values || !values.upper || !this.visible) return;
      _drawLine(ctx, layout, values.upper, 'rgba(231,76,60,0.7)', 0.8);
      _drawLine(ctx, layout, values.mid, this.color, 0.8);
      _drawLine(ctx, layout, values.lower, 'rgba(46,204,113,0.7)', 0.8);
    }
  }

  // ═══════════ Squeeze（布林带收缩于 Keltner 内） ═══════════
  class SqueezeIndicator extends ATSChartV2.BaseIndicator {
    constructor(config) {
      super(config);
      this.name = 'SQUEEZE';
      this.period = config.period || 20;
      this.stdDev = config.stdDev || 2;
      this.kcPeriod = config.kcPeriod || 20;
      this.kcMult = config.kcMult || 1.5;
      this.color = config.color || '#A855F7';
    }
    calculate(candles) {
      const p = this.period, sd = this.stdDev, kp = this.kcPeriod, km = this.kcMult;
      if (!candles || candles.length < Math.max(p, kp) + 1) return null;
      const b = M.boll(candles, p, sd);
      const closes = candles.map(c => c.close);
      const ema = M.emaSeries(closes, kp);
      const atr = M.atrSeries(candles, kp);
      const n = candles.length;
      const out = new Array(n).fill(null);
      for (let i = 0; i < n; i++) {
        if (b.upper[i] === null || ema[i] === null || atr[i] === null) continue;
        const kcU = ema[i] + km * atr[i];
        const kcL = ema[i] - km * atr[i];
        out[i] = (b.upper[i] <= kcU && b.lower[i] >= kcL) ? 1 : 0; // 1 = 挤压中
      }
      return out;
    }
    getPaneType() { return 'indicator'; }
    getFixedRange() { return [0, 1]; }
    getPaneTitle() { return 'SQUEEZE'; }
    render(ctx, values, layout, theme) {
      if (!values || !this.visible) return;
      const { cx, paneRect } = layout;
      if (!paneRect) return;
      ctx.fillStyle = this.color;
      for (let i = 0; i < values.length; i++) {
        if (values[i] === null || values[i] === undefined || values[i] <= 0) continue;
        ctx.beginPath();
        ctx.arc(cx(i), paneRect.bottom - 5, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ═══════════ STDDEV（滚动标准差） ═══════════
  class STDDEVIndicator extends ATSChartV2.BaseIndicator {
    constructor(config) {
      super(config);
      this.name = 'STDDEV';
      this.period = config.period || 20;
      this.color = config.color || '#7C8DB5';
    }
    calculate(candles) {
      const p = this.period;
      if (!candles || candles.length < p) return null;
      const closes = candles.map(c => c.close);
      const n = closes.length;
      const out = new Array(n).fill(null);
      for (let i = 0; i < n; i++) {
        if (i < p - 1) continue;
        let sum = 0;
        for (let j = i - p + 1; j <= i; j++) sum += closes[j];
        const mean = sum / p;
        let sq = 0;
        for (let j = i - p + 1; j <= i; j++) sq += Math.pow(closes[j] - mean, 2);
        out[i] = Math.sqrt(sq / p);
      }
      return out;
    }
    getPaneType() { return 'indicator'; }
    getPaneTitle() { return 'STDDEV'; }
    render(ctx, values, layout, theme) {
      if (!values || !this.visible) return;
      _drawLine(ctx, layout, values, this.color, 1);
    }
  }

  // ═══════════ 公共画线 ═══════════
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

  // ═══════════ 注册到 IndicatorExtras ═══════════
  ATSChartV2.IndicatorExtras = ATSChartV2.IndicatorExtras || {};
  ATSChartV2.IndicatorExtras.bbwidth = BBWIDTHIndicator;
  ATSChartV2.IndicatorExtras.donchian = DonchianIndicator;
  ATSChartV2.IndicatorExtras.keltner = KeltnerIndicator;
  ATSChartV2.IndicatorExtras.squeeze = SqueezeIndicator;
  ATSChartV2.IndicatorExtras.stddev = STDDEVIndicator;
})(window.ATSChartV2 = window.ATSChartV2 || {});
