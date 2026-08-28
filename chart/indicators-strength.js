/**
 * ATS-Quant Chart Engine v2 — 扩展指标库 · E 趋势强度/市场状态（第一批）
 *
 * ADX（含 +DI/−DI）/ Aroon / Choppiness Index（CHOP）
 *
 * 全部独立实现；副图 pane（'indicator'）。
 * ADX/DMI 与 CHOP 是 Market Regime（趋势 vs 震荡）判定的基础输入。
 */
(function (ATSChartV2) {
  'use strict';
  const M = ATSChartV2.IndicatorMath;

  // ═══════════ ADX（平均趋向指数，含 +DI/−DI） ═══════════
  class ADXIndicator extends ATSChartV2.BaseIndicator {
    constructor(config) {
      super(config);
      this.name = 'ADX';
      this.period = config.period || 14;
      this.color = config.color || '#F0B90B';
    }
    calculate(candles) {
      const p = this.period;
      if (!candles || candles.length < p * 2) return null;
      const n = candles.length;
      const tr = new Array(n).fill(0), pdm = new Array(n).fill(0), ndm = new Array(n).fill(0);
      for (let i = 1; i < n; i++) {
        const h = candles[i].high, l = candles[i].low;
        const ph = candles[i - 1].high, pl = candles[i - 1].low, pc = candles[i - 1].close;
        tr[i] = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
        const up = h - ph, dn = pl - l;
        if (up > dn && up > 0) pdm[i] = up;
        if (dn > up && dn > 0) ndm[i] = dn;
      }
      // Wilder 平滑（含首段平均）
      const atrW = M.wilders(tr, p);
      const pdmW = M.wilders(pdm, p);
      const ndmW = M.wilders(ndm, p);
      const pdi = new Array(n).fill(null), ndi = new Array(n).fill(null), dx = new Array(n).fill(null);
      for (let i = 0; i < n; i++) {
        if (atrW[i] === null || atrW[i] === 0) continue;
        pdi[i] = 100 * pdmW[i] / atrW[i];
        ndi[i] = 100 * ndmW[i] / atrW[i];
        const sum = pdi[i] + ndi[i];
        dx[i] = sum === 0 ? 0 : 100 * Math.abs(pdi[i] - ndi[i]) / sum;
      }
      // ADX = DX 的 Wilder 平滑；DX 从索引 p 起有效，再平滑 p 根
      const dxStart = p; // 第一个非 null dx 索引
      const dxSeries = new Array(n).fill(null);
      for (let i = dxStart; i < n; i++) dxSeries[i] = dx[i];
      const adx = M.wilders(dxSeries, p);
      // adx[i] 前 2p-1 根为 null（wilders 对 null 输入会累积 NaN，需裁剪）
      for (let i = 0; i < n; i++) {
        if (adx[i] === null || !isFinite(adx[i])) adx[i] = null;
        if (i < p * 2 - 1) adx[i] = null;
      }
      return { adx: adx, pdi: pdi, ndi: ndi };
    }
    getPaneType() { return 'indicator'; }
    getFixedRange() { return [0, 100]; }
    getPaneTitle() { return 'ADX'; }
    render(ctx, values, layout, theme) {
      if (!values || !values.adx || !this.visible) return;
      _drawRefLines(ctx, layout, [25]);
      _drawLine(ctx, layout, values.adx, '#F0B90B', 1.2);
      _drawLine(ctx, layout, values.pdi, '#2ECC71', 0.8);
      _drawLine(ctx, layout, values.ndi, '#E74C3C', 0.8);
    }
  }

  // ═══════════ Aroon（阿隆指标） ═══════════
  class AroonIndicator extends ATSChartV2.BaseIndicator {
    constructor(config) {
      super(config);
      this.name = 'AROON';
      this.period = config.period || 25;
      this.color = config.color || '#22D3EE';
    }
    calculate(candles) {
      const p = this.period;
      if (!candles || candles.length < p + 1) return null;
      const n = candles.length;
      const up = new Array(n).fill(null), down = new Array(n).fill(null);
      for (let i = 0; i < n; i++) {
        if (i < p) continue;
        let hh = -Infinity, ll = Infinity, hhIdx = i, llIdx = i;
        for (let j = i - p; j <= i; j++) {
          if (candles[j].high > hh) { hh = candles[j].high; hhIdx = j; }
          if (candles[j].low < ll) { ll = candles[j].low; llIdx = j; }
        }
        up[i] = (p - (i - hhIdx)) / p * 100;
        down[i] = (p - (i - llIdx)) / p * 100;
      }
      return { up: up, down: down };
    }
    getPaneType() { return 'indicator'; }
    getFixedRange() { return [0, 100]; }
    getPaneTitle() { return 'AROON'; }
    render(ctx, values, layout, theme) {
      if (!values || !values.up || !this.visible) return;
      _drawRefLines(ctx, layout, [25, 75]);
      _drawLine(ctx, layout, values.up, '#2ECC71', 1);
      _drawLine(ctx, layout, values.down, '#E74C3C', 1);
    }
  }

  // ═══════════ CHOP（震荡指数 / Choppiness Index） ═══════════
  class CHOPIndicator extends ATSChartV2.BaseIndicator {
    constructor(config) {
      super(config);
      this.name = 'CHOP';
      this.period = config.period || 14;
      this.color = config.color || '#F59E0B';
    }
    calculate(candles) {
      const p = this.period;
      if (!candles || candles.length < p + 1) return null;
      const n = candles.length;
      const tr = M.trSeries(candles);
      const out = new Array(n).fill(null);
      for (let i = 0; i < n; i++) {
        if (i < p) continue;
        let hh = -Infinity, ll = Infinity, trSum = 0;
        for (let j = i - p + 1; j <= i; j++) {
          if (candles[j].high > hh) hh = candles[j].high;
          if (candles[j].low < ll) ll = candles[j].low;
          trSum += tr[j];
        }
        const range = hh - ll;
        out[i] = (range === 0 || trSum === 0) ? 100 : 100 * Math.log10(trSum / range) / Math.log10(p);
      }
      return out;
    }
    getPaneType() { return 'indicator'; }
    getFixedRange() { return [0, 100]; }
    getPaneTitle() { return 'CHOP'; }
    render(ctx, values, layout, theme) {
      if (!values || !this.visible) return;
      _drawRefLines(ctx, layout, [45, 60]);
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

  // ═══════════ 注册到 IndicatorExtras ═══════════
  ATSChartV2.IndicatorExtras = ATSChartV2.IndicatorExtras || {};
  ATSChartV2.IndicatorExtras.adx = ADXIndicator;
  ATSChartV2.IndicatorExtras.aroon = AroonIndicator;
  ATSChartV2.IndicatorExtras.chop = CHOPIndicator;
})(window.ATSChartV2 = window.ATSChartV2 || {});
