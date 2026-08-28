/**
 * ATS-Quant Chart Engine v2 — 扩展指标库 · D 成交量/资金流（第一批）
 *
 * OBV / MFI / CMF / VWAP
 *
 * 全部独立实现。OBV/MFI/CMF 为副图 pane（'indicator'），
 * VWAP 为主图叠加（'price'，按日锚定累计）。
 */
(function (ATSChartV2) {
  'use strict';
  const M = ATSChartV2.IndicatorMath;

  // ═══════════ OBV（能量潮） ═══════════
  class OBVIndicator extends ATSChartV2.BaseIndicator {
    constructor(config) {
      super(config);
      this.name = 'OBV';
      this.color = config.color || '#F0B90B';
    }
    calculate(candles) {
      if (!candles || !candles.length) return null;
      const n = candles.length;
      const out = new Array(n).fill(null);
      let obv = 0;
      for (let i = 0; i < n; i++) {
        const vol = candles[i].vol || 0;
        if (i === 0) obv = vol;
        else if (candles[i].close > candles[i - 1].close) obv += vol;
        else if (candles[i].close < candles[i - 1].close) obv -= vol;
        out[i] = obv;
      }
      return out;
    }
    getPaneType() { return 'indicator'; }
    getPaneTitle() { return 'OBV'; }
    render(ctx, values, layout, theme) {
      if (!values || !this.visible) return;
      _drawZeroLine(ctx, layout);
      _drawLine(ctx, layout, values, this.color, 1);
    }
  }

  // ═══════════ MFI（资金流量指标，价量 RSI） ═══════════
  class MFIIndicator extends ATSChartV2.BaseIndicator {
    constructor(config) {
      super(config);
      this.name = 'MFI';
      this.period = config.period || 14;
      this.color = config.color || '#3B82F6';
    }
    calculate(candles) {
      const p = this.period;
      if (!candles || candles.length < p + 1) return null;
      const n = candles.length;
      const tp = new Array(n).fill(0), mf = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        tp[i] = (candles[i].high + candles[i].low + candles[i].close) / 3;
        mf[i] = tp[i] * (candles[i].vol || 0);
      }
      const out = new Array(n).fill(null);
      for (let i = 0; i < n; i++) {
        if (i < p) continue;
        let pos = 0, neg = 0;
        for (let j = i - p + 1; j <= i; j++) {
          if (tp[j] > tp[j - 1]) pos += mf[j];
          else if (tp[j] < tp[j - 1]) neg += mf[j];
        }
        out[i] = neg === 0 ? 100 : 100 - 100 / (1 + pos / neg);
      }
      return out;
    }
    getPaneType() { return 'indicator'; }
    getFixedRange() { return [0, 100]; }
    getPaneTitle() { return 'MFI'; }
    render(ctx, values, layout, theme) {
      if (!values || !this.visible) return;
      _drawRefLines(ctx, layout, [20, 80]);
      _drawLine(ctx, layout, values, this.color, 1);
    }
  }

  // ═══════════ CMF（蔡金资金流） ═══════════
  class CMFIndicator extends ATSChartV2.BaseIndicator {
    constructor(config) {
      super(config);
      this.name = 'CMF';
      this.period = config.period || 20;
      this.color = config.color || '#22D3EE';
    }
    calculate(candles) {
      const p = this.period;
      if (!candles || candles.length < p) return null;
      const n = candles.length;
      const out = new Array(n).fill(null);
      for (let i = 0; i < n; i++) {
        if (i < p - 1) continue;
        let mfv = 0, v = 0;
        for (let j = i - p + 1; j <= i; j++) {
          const c = candles[j];
          const hi = c.high, lo = c.low, cl = c.close, vol = c.vol || 0;
          const mfm = (hi === lo) ? 0 : ((cl - lo) - (hi - cl)) / (hi - lo);
          mfv += mfm * vol;
          v += vol;
        }
        out[i] = v === 0 ? 0 : mfv / v;
      }
      return out;
    }
    getPaneType() { return 'indicator'; }
    getPaneTitle() { return 'CMF'; }
    render(ctx, values, layout, theme) {
      if (!values || !this.visible) return;
      _drawZeroLine(ctx, layout);
      _drawLine(ctx, layout, values, this.color, 1);
    }
  }

  // ═══════════ VWAP（成交量加权平均价，按日锚定） ═══════════
  class VWAPIndicator extends ATSChartV2.BaseIndicator {
    constructor(config) {
      super(config);
      this.name = 'VWAP';
      this.color = config.color || '#F59E0B';
    }
    calculate(candles) {
      if (!candles || !candles.length) return null;
      const n = candles.length;
      const out = new Array(n).fill(null);
      let dayStart = null, pv = 0, v = 0;
      for (let i = 0; i < n; i++) {
        const c = candles[i];
        const day = c.time ? _dayOf(c.time) : i;
        if (dayStart === null || day !== dayStart) { dayStart = day; pv = 0; v = 0; }
        const tp = (c.high + c.low + c.close) / 3;
        pv += tp * (c.vol || 0);
        v += (c.vol || 0);
        out[i] = v === 0 ? null : pv / v;
      }
      return out;
    }
    getPaneType() { return 'price'; }
    getPaneTitle() { return 'VWAP'; }
    render(ctx, values, layout, theme) {
      if (!values || !this.visible) return;
      _drawLine(ctx, layout, values, this.color, 1);
    }
  }

  // ═══════════ 工具 ═══════════
  function _dayOf(ts) {
    const d = new Date(ts * 1000);
    return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
  }

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

  function _drawZeroLine(ctx, layout) {
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
  ATSChartV2.IndicatorExtras.obv = OBVIndicator;
  ATSChartV2.IndicatorExtras.mfi = MFIIndicator;
  ATSChartV2.IndicatorExtras.cmf = CMFIndicator;
  ATSChartV2.IndicatorExtras.vwap = VWAPIndicator;
})(window.ATSChartV2 = window.ATSChartV2 || {});
