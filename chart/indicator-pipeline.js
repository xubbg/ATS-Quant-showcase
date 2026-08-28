/**
 * ATS-Quant Chart Engine v2 — Indicator Pipeline
 *
 * Phase D3：指标必须基于全量 K 线数据计算，再按 viewport 截取可见区间。
 * 禁止在 visible slice 上直接计算（会导致 EMA/BOLL/RSI/MACD 等指标
 * 在缩放/平移时数值漂移）。
 *
 * 本模块为纯逻辑（无 canvas / DOM），可在 Node 中直接单测。
 * 浏览器挂载：window.ATSChartV2.IndicatorPipeline
 */
(function (root, factory) {
  'use strict';
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  root.ATSChartV2 = root.ATSChartV2 || {};
  root.ATSChartV2.IndicatorPipeline = mod;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  /**
   * 生成「指标实例 + K线集」缓存签名。
   * 任一参数变化（周期/颜色/数据长度/最后一根K线时间）都会使缓存失效。
   */
  function cacheSignature(ind, candles) {
    var candlesArr = candles || [];
    var last = candlesArr.length ? candlesArr[candlesArr.length - 1] : null;
    var cfg = (ind && ind.config) || {};
    var keys = Object.keys(cfg).sort();
    var parts = [String(ind && ind.getName ? ind.getName() : 'ind')];
    if (ind && ind.constructor) parts.push(ind.constructor.name);
    keys.forEach(function (k) { parts.push(k + '=' + JSON.stringify(cfg[k])); });
    parts.push('n=' + candlesArr.length);
    if (last && last.time != null) parts.push('t=' + last.time);
    return parts.join('|');
  }

  /**
   * 把全量计算结果按可见窗口 [start, start+count) 截取。
   * 支持：
   *   - 普通数组（EMA/RSI/ATR）
   *   - 数组对象（BOLL {upper,mid,lower}、MACD {macd,signal,hist}）
   *   - 特殊对象（Volume {maxVol, candles}）：保留标量，丢弃 candles
   *     （Volume 渲染使用 layout 中的可见 K 线，不依赖值数组中的 candles）
   */
  function sliceIndicatorValues(values, start, count) {
    if (values === null || values === undefined) return null;
    if (Array.isArray(values)) {
      return values.slice(start, start + count);
    }
    if (typeof values === 'object') {
      var out = {};
      Object.keys(values).forEach(function (k) {
        if (k === 'candles') return;
        if (Array.isArray(values[k])) out[k] = values[k].slice(start, start + count);
        else out[k] = values[k];
      });
      return out;
    }
    return values;
  }

  /**
   * 对全部可见指标在全量 K 线上计算，并缓存全量结果（按签名失效）。
   * 返回 { <lowercase indicator name>: { indicator, values } }
   * values 为全量长度结果，渲染层再按窗口 slice。
   */
  function computeIndicators(registry, candles, cache) {
    var out = {};
    if (!registry) return out;
    // D3 P1：只计算可见指标（隐藏指标不渲染也不计算）
    var list = (typeof registry.getVisible === 'function')
      ? registry.getVisible()
      : ((typeof registry.getAll === 'function') ? registry.getAll() : []).filter(function (i) { return i.visible !== false; });
    for (var i = 0; i < list.length; i++) {
      var ind = list[i];
      if (!ind) continue;
      var key = String(ind.getName ? ind.getName() : 'ind').toLowerCase();
      var sig = cacheSignature(ind, candles);
      var cached = cache ? cache[key] : null;
      var full = (cached && cached.sig === sig) ? cached.values : null;
      if (full === null || full === undefined) {
        full = (typeof ind.calculate === 'function') ? ind.calculate(candles || []) : null;
        if (cache) cache[key] = { sig: sig, values: full };
      }
      out[key] = { indicator: ind, values: full };
    }
    return out;
  }

  /**
   * 由缓存中取回（或计算）单个指标的全量值；供测试直接断言。
   */
  function computeOne(ind, candles, cache) {
    var sig = cacheSignature(ind, candles);
    var cached = cache ? cache[sig] : null;
    if (cached) return cached.values;
    var values = (typeof ind.calculate === 'function') ? ind.calculate(candles || []) : null;
    if (cache) cache[sig] = { sig: sig, values: values };
    return values;
  }

  return {
    cacheSignature: cacheSignature,
    sliceIndicatorValues: sliceIndicatorValues,
    computeIndicators: computeIndicators,
    computeOne: computeOne,
  };
});
