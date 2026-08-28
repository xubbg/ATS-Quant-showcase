/**
 * ATS-Quant Chart Engine v2 — 扩展指标库 · A 趋势/均线（第一批）
 *
 * SMA / WMA / HMA / KAMA / VWMA / Ichimoku / PSAR / Supertrend
 *
 * 均为独立实现（公式参考成熟 TA 库，不复制代码），遵循：
 *  - extends ATSChartV2.BaseIndicator（indicator-registry.js 提供）
 *  - calculate(candles) 全量计算，null 占位（indicator-pipeline 约定）
 *  - getPaneType()：主图叠加 'price' / 独立 pane 'indicator'
 *  - 注册：ATSChartV2.IndicatorExtras.<key> = Class（registry 构造时自动装载）
 */
(function (ATSChartV2) {
  'use strict';
  const M = ATSChartV2.IndicatorMath;

  // ═══════════ SMA（简单移动平均） ═══════════
  class SMAIndicator extends ATSChartV2.BaseIndicator {
    constructor(config) {
      super(config);
      this.name = 'SMA';
      this.period = config.period || 20;
      this.color = config.color || '#F0B90B';
      this.lineWidth = config.lineWidth || 1;
    }
    calculate(candles) {
      if (!candles || candles.length < this.period) return null;
      return M.smaSeries(candles.map(c => c.close), this.period);
    }
    render(ctx, values, layout, theme) {
      if (!values || !this.visible) return;
      _drawLine(ctx, layout, values, this.color, this.lineWidth);
    }
  }

  // ═══════════ WMA（加权移动平均） ═══════════
  class WMAIndicator extends ATSChartV2.BaseIndicator {
    constructor(config) {
      super(config);
      this.name = 'WMA';
      this.period = config.period || 20;
      this.color = config.color || '#3B82F6';
      this.lineWidth = config.lineWidth || 1;
    }
    calculate(candles) {
      if (!candles || candles.length < this.period) return null;
      return M.wmaSeries(candles.map(c => c.close), this.period);
    }
    render(ctx, values, layout, theme) {
      if (!values || !this.visible) return;
      _drawLine(ctx, layout, values, this.color, this.lineWidth);
    }
  }

  // ═══════════ HMA（Hull 移动平均，低滞后） ═══════════
  class HMAIndicator extends ATSChartV2.BaseIndicator {
    constructor(config) {
      super(config);
      this.name = 'HMA';
      this.period = config.period || 20;
      this.color = config.color || '#A855F7';
      this.lineWidth = config.lineWidth || 1;
    }
    calculate(candles) {
      if (!candles || candles.length < this.period) return null;
      const n = this.period;
      const half = Math.max(1, Math.floor(n / 2));
      const sqrtN = Math.max(1, Math.round(Math.sqrt(n)));
      const closes = candles.map(c => c.close);
      const wmaN = M.wmaSeries(closes, n);
      const wmaHalf = M.wmaSeries(closes, half);
      const diff = new Array(closes.length).fill(null);
      for (let i = 0; i < closes.length; i++) {
        if (wmaN[i] !== null && wmaHalf[i] !== null) diff[i] = 2 * wmaHalf[i] - wmaN[i];
      }
      return M.wmaSeries(diff, sqrtN);
    }
    render(ctx, values, layout, theme) {
      if (!values || !this.visible) return;
      _drawLine(ctx, layout, values, this.color, this.lineWidth);
    }
  }

  // ═══════════ KAMA（Kaufman 自适应均线） ═══════════
  class KAMAIndicator extends ATSChartV2.BaseIndicator {
    constructor(config) {
      super(config);
      this.name = 'KAMA';
      this.period = config.period || 10;
      this.fast = config.fast || 2;
      this.slow = config.slow || 30;
      this.color = config.color || '#22D3EE';
      this.lineWidth = config.lineWidth || 1;
    }
    calculate(candles) {
      const p = this.period, fast = this.fast, slow = this.slow;
      if (!candles || candles.length < p + 1) return null;
      const closes = candles.map(c => c.close);
      const fastSC = 2 / (fast + 1), slowSC = 2 / (slow + 1);
      const out = new Array(closes.length).fill(null);
      let kama = null;
      for (let i = 0; i < closes.length; i++) {
        if (i < p) continue;
        const change = Math.abs(closes[i] - closes[i - p]);
        let vol = 0;
        for (let j = i - p + 1; j <= i; j++) vol += Math.abs(closes[j] - closes[j - 1]);
        const er = vol === 0 ? 0 : change / vol;
        const sc = Math.pow(er * (fastSC - slowSC) + slowSC, 2);
        if (kama === null) kama = closes[i];
        else kama = kama + sc * (closes[i] - kama);
        out[i] = kama;
      }
      return out;
    }
    render(ctx, values, layout, theme) {
      if (!values || !this.visible) return;
      _drawLine(ctx, layout, values, this.color, this.lineWidth);
    }
  }

  // ═══════════ VWMA（成交量加权移动平均） ═══════════
  class VWMAIndicator extends ATSChartV2.BaseIndicator {
    constructor(config) {
      super(config);
      this.name = 'VWMA';
      this.period = config.period || 20;
      this.color = config.color || '#F59E0B';
      this.lineWidth = config.lineWidth || 1;
    }
    calculate(candles) {
      const p = this.period;
      if (!candles || candles.length < p) return null;
      const out = new Array(candles.length).fill(null);
      for (let i = 0; i < candles.length; i++) {
        if (i < p - 1) continue;
        let pv = 0, v = 0;
        for (let j = i - p + 1; j <= i; j++) {
          pv += candles[j].close * (candles[j].vol || 0);
          v += (candles[j].vol || 0);
        }
        out[i] = v === 0 ? null : pv / v;
      }
      return out;
    }
    render(ctx, values, layout, theme) {
      if (!values || !this.visible) return;
      _drawLine(ctx, layout, values, this.color, this.lineWidth);
    }
  }

  // ═══════════ Ichimoku Cloud（一目均衡表） ═══════════
  class IchimokuIndicator extends ATSChartV2.BaseIndicator {
    constructor(config) {
      super(config);
      this.name = 'ICHIMOKU';
      this.tenkan = config.tenkan || 9;
      this.kijun = config.kijun || 26;
      this.senkouB = config.senkouB || 52;
      this.color = config.color || 'rgba(59,130,246,0.4)';
    }
    calculate(candles) {
      const tk = this.tenkan, kj = this.kijun, sb = this.senkouB;
      if (!candles || candles.length < sb) return null;
      const n = candles.length;
      const tenkan = new Array(n).fill(null), kijun = new Array(n).fill(null);
      const senkouBArr = new Array(n).fill(null);
      for (let i = 0; i < n; i++) {
        if (i >= tk - 1) tenkan[i] = M.midpoint(candles, i, tk);
        if (i >= kj - 1) kijun[i] = M.midpoint(candles, i, kj);
        if (i >= sb - 1) senkouBArr[i] = M.midpoint(candles, i, sb);
      }
      const senkouA = new Array(n).fill(null);
      for (let i = 0; i < n; i++) {
        if (tenkan[i] !== null && kijun[i] !== null) senkouA[i] = (tenkan[i] + kijun[i]) / 2;
      }
      // Chikou Span：当前 close 后移 26 根（前 kj 根 null）
      const chikou = new Array(n).fill(null);
      for (let i = kj; i < n; i++) chikou[i] = candles[i - kj].close;
      return { tenkan: tenkan, kijun: kijun, senkouA: senkouA, senkouB: senkouBArr, chikou: chikou };
    }
    render(ctx, values, layout, theme) {
      if (!values || !values.tenkan || !this.visible) return;
      const { cx, cy } = layout;
      // 云填充（senkouA ~ senkouB）
      ctx.fillStyle = 'rgba(59,130,246,0.06)';
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < values.senkouA.length; i++) {
        if (values.senkouA[i] === null) { started = false; continue; }
        const x = cx(i), y = cy(values.senkouA[i]);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      for (let i = values.senkouB.length - 1; i >= 0; i--) {
        if (values.senkouB[i] === null) continue;
        ctx.lineTo(cx(i), cy(values.senkouB[i]));
      }
      ctx.closePath();
      ctx.fill();
      _drawLine(ctx, layout, values.tenkan, '#F0B90B', 1);
      _drawLine(ctx, layout, values.kijun, '#E74C3C', 1);
      _drawLine(ctx, layout, values.senkouA, '#2ECC71', 0.8);
      _drawLine(ctx, layout, values.senkouB, 'rgba(231,76,60,0.7)', 0.8);
      _drawLine(ctx, layout, values.chikou, 'rgba(122,133,153,0.6)', 0.8);
    }
  }

  // ═══════════ Parabolic SAR（抛物线止损） ═══════════
  class PSARIndicator extends ATSChartV2.BaseIndicator {
    constructor(config) {
      super(config);
      this.name = 'PSAR';
      this.af = config.af || 0.02;
      this.maxAf = config.maxAf || 0.2;
      this.color = config.color || '#F0B90B';
    }
    calculate(candles) {
      if (!candles || candles.length < 3) return null;
      const n = candles.length;
      const sar = new Array(n).fill(null);
      const dir = new Array(n).fill(0);
      let cur = candles[0].low, ep = candles[0].high, af = this.af, trend = 1;
      for (let i = 1; i < n; i++) {
        const c = candles[i], prev = candles[i - 1];
        sar[i] = cur;
        dir[i] = trend;
        if (trend === 1 && c.low < cur) {
          trend = -1; cur = c.high; af = this.af; ep = c.low;
        } else if (trend === -1 && c.high > cur) {
          trend = 1; cur = c.low; af = this.af; ep = c.high;
        } else {
          if (trend === 1) {
            if (c.high > ep) { ep = c.high; af = Math.min(af + this.af, this.maxAf); }
            cur = cur + af * (ep - cur);
            cur = Math.min(cur, prev.low);
          } else {
            if (c.low < ep) { ep = c.low; af = Math.min(af + this.af, this.maxAf); }
            cur = cur + af * (ep - cur);
            cur = Math.max(cur, prev.high);
          }
        }
      }
      return { sar: sar, dir: dir };
    }
    render(ctx, values, layout, theme) {
      if (!values || !values.sar || !this.visible) return;
      const sar = values.sar, dir = values.dir;
      for (let i = 0; i < sar.length; i++) {
        if (sar[i] === null || sar[i] === undefined) continue;
        ctx.fillStyle = dir[i] > 0 ? theme.bull : theme.bear;
        ctx.beginPath();
        ctx.arc(layout.cx(i), layout.cy(sar[i]), 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ═══════════ Supertrend（趋势通道/止损） ═══════════
  class SupertrendIndicator extends ATSChartV2.BaseIndicator {
    constructor(config) {
      super(config);
      this.name = 'SUPERTREND';
      this.period = config.period || 10;
      this.mult = config.mult || 3;
      this.color = config.color || '#F0B90B';
    }
    calculate(candles) {
      const p = this.period, m = this.mult;
      if (!candles || candles.length < p + 1) return null;
      const n = candles.length;
      const atr = M.atrSeries(candles, p);
      const st = new Array(n).fill(null), dir = new Array(n).fill(0);
      let prevUpper = 0, prevLower = 0, prevSt = 0, first = true;
      for (let i = 0; i < n; i++) {
        if (atr[i] === null) continue;
        const c = candles[i];
        const mid = (c.high + c.low) / 2;
        let upper = mid + m * atr[i];
        let lower = mid - m * atr[i];
        if (first) {
          first = false;
          dir[i] = 1; st[i] = upper; prevUpper = upper; prevLower = lower; prevSt = upper;
          continue;
        }
        upper = (upper < prevUpper || candles[i - 1].close > prevUpper) ? upper : prevUpper;
        lower = (lower > prevLower || candles[i - 1].close < prevLower) ? lower : prevLower;
        if (prevSt === prevUpper) {
          if (c.close < lower) { dir[i] = -1; st[i] = lower; }
          else { dir[i] = 1; st[i] = upper; }
        } else {
          if (c.close > upper) { dir[i] = 1; st[i] = upper; }
          else { dir[i] = -1; st[i] = lower; }
        }
        prevUpper = upper; prevLower = lower; prevSt = st[i];
      }
      return { st: st, dir: dir };
    }
    render(ctx, values, layout, theme) {
      if (!values || !values.st || !this.visible) return;
      const { st, dir } = values;
      let segStart = -1, curDir = 0;
      ctx.lineWidth = 1.2;
      for (let i = 0; i < st.length; i++) {
        if (st[i] === null || st[i] === undefined) {
          if (segStart >= 0) { _strokeSeg(ctx, layout, st, segStart, i - 1, curDir > 0 ? theme.bull : theme.bear); segStart = -1; }
          continue;
        }
        if (segStart < 0) { segStart = i; curDir = dir[i]; }
        else if (dir[i] !== curDir) {
          _strokeSeg(ctx, layout, st, segStart, i - 1, curDir > 0 ? theme.bull : theme.bear);
          segStart = i; curDir = dir[i];
        }
      }
      if (segStart >= 0) _strokeSeg(ctx, layout, st, segStart, st.length - 1, curDir > 0 ? theme.bull : theme.bear);
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

  function _strokeSeg(ctx, layout, vals, a, b, color) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    let started = false;
    for (let i = a; i <= b; i++) {
      if (vals[i] === null || vals[i] === undefined) { started = false; continue; }
      const x = layout.cx(i), y = layout.cy(vals[i]);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // ═══════════ 注册到 IndicatorExtras ═══════════
  ATSChartV2.IndicatorExtras = ATSChartV2.IndicatorExtras || {};
  ATSChartV2.IndicatorExtras.sma = SMAIndicator;
  ATSChartV2.IndicatorExtras.wma = WMAIndicator;
  ATSChartV2.IndicatorExtras.hma = HMAIndicator;
  ATSChartV2.IndicatorExtras.kama = KAMAIndicator;
  ATSChartV2.IndicatorExtras.vwma = VWMAIndicator;
  ATSChartV2.IndicatorExtras.ichimoku = IchimokuIndicator;
  ATSChartV2.IndicatorExtras.psar = PSARIndicator;
  ATSChartV2.IndicatorExtras.supertrend = SupertrendIndicator;
})(window.ATSChartV2 = window.ATSChartV2 || {});
