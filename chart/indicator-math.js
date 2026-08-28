/**
 * ATS-Quant Chart Engine v2 — Indicator Math（第一批 32 个指标共享的纯计算工具）
 *
 * 全部函数为纯逻辑（无 canvas / DOM），输出数组长度 = 输入长度，数据不足处以 null 占位，
 * 与 indicator-pipeline 的全量计算 + 视口截取约定一致。
 *
 * 浏览器挂载：window.ATSChartV2.IndicatorMath（在 indicator-registry.js 之后加载）
 */
(function (ATSChartV2) {
  'use strict';

  function smaSeries(arr, p) {
    const out = new Array(arr.length).fill(null);
    if (p < 1 || arr.length < p) return out;
    for (let i = 0; i < arr.length; i++) {
      if (i < p - 1) continue;
      let sum = 0, ok = true;
      for (let j = i - p + 1; j <= i; j++) {
        if (arr[j] === null || arr[j] === undefined) { ok = false; break; }
        sum += arr[j];
      }
      if (ok) out[i] = sum / p;
    }
    return out;
  }

  function wmaSeries(arr, p) {
    const out = new Array(arr.length).fill(null);
    if (p < 1 || arr.length < p) return out;
    const denom = p * (p + 1) / 2;
    for (let i = 0; i < arr.length; i++) {
      if (i < p - 1) continue;
      let sum = 0, ok = true;
      for (let j = 0; j < p; j++) {
        const v = arr[i - p + 1 + j];
        if (v === null || v === undefined) { ok = false; break; }
        sum += v * (j + 1);
      }
      if (ok) out[i] = sum / denom;
    }
    return out;
  }

  /** EMA：seed = 前 p 个值 SMA（与 indicator-registry EMAIndicator 一致） */
  function emaSeries(arr, p) {
    const out = new Array(arr.length).fill(null);
    if (p < 1 || arr.length < p) return out;
    const k = 2 / (p + 1);
    let sum = 0;
    for (let i = 0; i < arr.length; i++) {
      if (i === p - 1) {
        for (let j = 0; j < p; j++) sum += arr[j];
        out[i] = sum / p;
      } else if (i >= p) {
        out[i] = arr[i] * k + out[i - 1] * (1 - k);
      }
    }
    return out;
  }

  /** Wilder 平滑（RSI / ADX / ATR 用） */
  function wilders(arr, p) {
    const out = new Array(arr.length).fill(null);
    if (p < 1 || arr.length < p) return out;
    let acc = 0;
    for (let i = 0; i < arr.length; i++) {
      acc += arr[i];
      if (i === p - 1) out[i] = acc / p;
      else if (i >= p) out[i] = (out[i - 1] * (p - 1) + arr[i]) / p;
    }
    return out;
  }

  /** True Range 序列 */
  function trSeries(candles) {
    const out = [];
    for (let i = 0; i < candles.length; i++) {
      if (i === 0) { out.push(candles[0].high - candles[0].low); continue; }
      const h = candles[i].high, l = candles[i].low, pc = candles[i - 1].close;
      out.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
    }
    return out;
  }

  /** ATR（Wilder 平滑，14 默认） */
  function atrSeries(candles, p) {
    return wilders(trSeries(candles), p);
  }

  /** Bollinger Bands：{upper, mid, lower} */
  function boll(candles, p, sd) {
    const upper = [], mid = [], lower = [];
    for (let i = 0; i < candles.length; i++) {
      if (i < p - 1) { upper.push(null); mid.push(null); lower.push(null); continue; }
      let sum = 0;
      for (let j = i - p + 1; j <= i; j++) sum += candles[j].close;
      const mean = sum / p;
      let sq = 0;
      for (let j = i - p + 1; j <= i; j++) sq += Math.pow(candles[j].close - mean, 2);
      const std = Math.sqrt(sq / p);
      upper.push(mean + sd * std);
      mid.push(mean);
      lower.push(mean - sd * std);
    }
    return { upper: upper, mid: mid, lower: lower };
  }

  /** RSI（Wilder 平滑） */
  function rsi(candles, p) {
    const out = new Array(candles.length).fill(null);
    if (!candles || candles.length < p + 1) return out;
    let gain = 0, loss = 0;
    for (let i = 1; i <= p; i++) {
      const d = candles[i].close - candles[i - 1].close;
      if (d >= 0) gain += d; else loss -= d;
    }
    let avgGain = gain / p, avgLoss = loss / p;
    out[p] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    for (let i = p + 1; i < candles.length; i++) {
      const d = candles[i].close - candles[i - 1].close;
      const g = d > 0 ? d : 0, l = d < 0 ? -d : 0;
      avgGain = (avgGain * (p - 1) + g) / p;
      avgLoss = (avgLoss * (p - 1) + l) / p;
      out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    }
    return out;
  }

  /** 周期内 (HH+LL)/2 中点（Ichimoku 用） */
  function midpoint(candles, i, p) {
    let hh = -Infinity, ll = Infinity;
    for (let j = i - p + 1; j <= i; j++) {
      if (candles[j].high > hh) hh = candles[j].high;
      if (candles[j].low < ll) ll = candles[j].low;
    }
    return (hh + ll) / 2;
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  ATSChartV2.IndicatorMath = {
    smaSeries: smaSeries,
    wmaSeries: wmaSeries,
    emaSeries: emaSeries,
    wilders: wilders,
    trSeries: trSeries,
    atrSeries: atrSeries,
    boll: boll,
    rsi: rsi,
    midpoint: midpoint,
    clamp: clamp,
  };
})(window.ATSChartV2 = window.ATSChartV2 || {});
