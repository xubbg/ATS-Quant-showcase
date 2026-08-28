/**
 * ATS-Quant Chart Engine v2 — Drawing Manager
 *
 * Phase D3：建立 Drawing Object 架构（D4 自由画线的基础）。
 * 数据模型 + 序列化 + 几何计算为纯逻辑（无 canvas / DOM），Node 可单测；
 * 渲染由 OverlayLayer.renderDrawings 完成。
 *
 * 支持的图形类型（为 D4 水平线/趋势线/射线/垂直线/矩形/Fibonacci 预留）：
 *   horizontal_line / vertical_line / trend_line / ray / rect /
 *   fibonacci / price_label
 *
 * 浏览器挂载：window.ATSChartV2.DrawingManager
 */
(function (root, factory) {
  'use strict';
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  root.ATSChartV2 = root.ATSChartV2 || {};
  root.ATSChartV2.DrawingManager = mod;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var DRAWING_TYPES = [
    'horizontal_line', 'vertical_line', 'trend_line', 'ray',
    'rect', 'fibonacci', 'price_label',
  ];

  var DEFAULT_STYLE = {
    color: '#F0B90B',
    lineWidth: 1,
    dash: [],
  };

  function clone(o) {
    return o == null ? o : JSON.parse(JSON.stringify(o));
  }

  function DrawingManager(opts) {
    opts = opts || {};
    this.drawings = [];
    this._seq = 1;
    if (opts.drawings) this.restore(opts.drawings);
  }

  DrawingManager.prototype._newId = function () {
    return 'drw-' + (this._seq++);
  };

  /**
   * 添加画线对象。
   * @param {string} type - DRAWING_TYPES 之一
   * @param {Array} points - 锚点数组 [{time, price}, ...]（price_label 为单点）
   * @param {Object} style - { color, lineWidth, dash }
   * @param {Object} meta - 附加信息（如 text、strategyName）
   */
  DrawingManager.prototype.add = function (type, points, style, meta) {
    if (DRAWING_TYPES.indexOf(type) < 0) {
      return { ok: false, error: 'unknown drawing type: ' + type };
    }
    var pts = Array.isArray(points) ? points.slice() : [];
    if (!pts.length) return { ok: false, error: 'drawing requires anchor points' };
    var minPoints = (type === 'price_label' || type === 'horizontal_line' || type === 'vertical_line') ? 1 : 2;
    if (pts.length < minPoints) {
      return { ok: false, error: type + ' requires at least ' + minPoints + ' point(s)' };
    }
    var drawing = {
      id: this._newId(),
      type: type,
      points: clone(pts),
      style: Object.assign({}, DEFAULT_STYLE, style || {}),
      meta: meta || {},
      visible: true,
    };
    this.drawings.push(drawing);
    return { ok: true, drawing: clone(drawing) };
  };

  DrawingManager.prototype.remove = function (id) {
    for (var i = 0; i < this.drawings.length; i++) {
      if (this.drawings[i].id === id) {
        this.drawings.splice(i, 1);
        return { ok: true };
      }
    }
    return { ok: false, error: 'unknown drawing: ' + id };
  };

  DrawingManager.prototype.update = function (id, patch) {
    var d = this.getById(id);
    if (!d) return { ok: false, error: 'unknown drawing: ' + id };
    if (patch && patch.type && DRAWING_TYPES.indexOf(patch.type) < 0) {
      return { ok: false, error: 'unknown drawing type: ' + patch.type };
    }
    if (patch && patch.points !== undefined) {
      d.points = clone(patch.points);
      delete patch.points;
    }
    if (patch && patch.style) {
      d.style = Object.assign({}, d.style, patch.style);
      delete patch.style;
    }
    if (patch && patch.visible !== undefined) { d.visible = !!patch.visible; delete patch.visible; }
    if (patch && patch.meta) { d.meta = Object.assign({}, d.meta, patch.meta); delete patch.meta; }
    Object.assign(d, patch);
    return { ok: true, drawing: clone(d) };
  };

  DrawingManager.prototype.getById = function (id) {
    for (var i = 0; i < this.drawings.length; i++) {
      if (this.drawings[i].id === id) return this.drawings[i];
    }
    return null;
  };

  DrawingManager.prototype.getAll = function () {
    return clone(this.drawings);
  };

  DrawingManager.prototype.getVisible = function () {
    return clone(this.drawings.filter(function (d) { return d.visible; }));
  };

  DrawingManager.prototype.clear = function () {
    this.drawings = [];
  };

  DrawingManager.prototype.serialize = function () {
    return clone(this.drawings);
  };

  DrawingManager.prototype.restore = function (list) {
    var self = this;
    if (!Array.isArray(list)) return;
    list.forEach(function (d) {
      if (!d || typeof d !== 'object' || DRAWING_TYPES.indexOf(d.type) < 0) return;
      self.drawings.push({
        id: d.id || self._newId(),
        type: d.type,
        points: clone(d.points || []),
        style: Object.assign({}, DEFAULT_STYLE, d.style || {}),
        meta: d.meta || {},
        visible: d.visible !== false,
      });
    });
  };

  // ═══════════ 几何辅助（纯函数，供渲染与测试） ═══════════

  /** Fibonacci 回撤水平：p1→p2 区间上的 0/0.236/0.382/0.5/0.618/0.786/1 */
  DrawingManager.fibonacciLevels = function (p1, p2) {
    var lo = Math.min(p1, p2);
    var hi = Math.max(p1, p2);
    var diff = hi - lo;
    var ratios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
    return ratios.map(function (r) {
      return { ratio: r, price: hi - diff * r };
    });
  };

  /** 射线：由 p1 指向 p2，向外延伸 factor 倍（factor>=1） */
  DrawingManager.rayPoint = function (p1, p2, factor) {
    var f = factor || 4;
    var dx = (p2.time - p1.time) * f;
    var dy = (p2.price - p1.price) * f;
    return { time: p2.time + dx, price: p2.price + dy };
  };

  DrawingManager.listTypes = function () {
    return DRAWING_TYPES.slice();
  };

  return {
    DrawingManager: DrawingManager,
    // D3 P1：几何辅助必须随模块命名空间一起导出
    // （overlay-layer.renderDrawings 通过 ATSChartV2.DrawingManager.fibonacciLevels 调用）
    fibonacciLevels: DrawingManager.fibonacciLevels,
    rayPoint: DrawingManager.rayPoint,
    listTypes: DrawingManager.listTypes,
    DRAWING_TYPES: DRAWING_TYPES,
  };
});
