/**
 * ATS-Quant Chart Engine v2 — Pane Manager
 *
 * Phase D3：真正多-Pane 指标架构。
 * 每个指标 pane 独立：显示/隐藏、高度调整、独立坐标变换。
 * 主图（price）、成交量（volume）、指标 pane（rsi/macd/atr 等）统一管理。
 *
 * 纯逻辑（无 canvas / DOM），可在 Node 中直接单测。
 * 浏览器挂载：window.ATSChartV2.PaneManager
 */
(function (root, factory) {
  'use strict';
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  root.ATSChartV2 = root.ATSChartV2 || {};
  root.ATSChartV2.PaneManager = mod;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var KIND_PRICE = 'price';
  var KIND_VOLUME = 'volume';
  var KIND_INDICATOR = 'indicator';

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function PaneManager(opts) {
    opts = opts || {};
    this.panes = [];
    this._nextId = 1;
    this._ensureMain();
    if (opts.panes) this.restore(opts.panes);
  }

  PaneManager.prototype._ensureMain = function () {
    if (!this.getMainPane()) {
      this.panes.push({
        id: 'main', kind: KIND_PRICE, title: 'Price',
        height: 0.6, visible: true,
      });
    }
  };

  PaneManager.prototype.getMainPane = function () {
    for (var i = 0; i < this.panes.length; i++) {
      if (this.panes[i].kind === KIND_PRICE) return this.panes[i];
    }
    return null;
  };

  PaneManager.prototype.getById = function (id) {
    for (var i = 0; i < this.panes.length; i++) {
      if (this.panes[i].id === id) return this.panes[i];
    }
    return null;
  };

  PaneManager.prototype.getByIndicator = function (indicatorKey) {
    for (var i = 0; i < this.panes.length; i++) {
      if (this.panes[i].indicatorKey === indicatorKey) return this.panes[i];
    }
    return null;
  };

  PaneManager.prototype._newId = function (prefix) {
    return (prefix || 'pane') + '-' + (this._nextId++);
  };

  /**
   * 为指标确保一个 pane：已存在则返回现有 pane。
   * @param {string} indicatorKey - 指标小写名（'rsi'/'macd'/'atr'）
   * @param {Object} opts - { title, height }
   */
  PaneManager.prototype.ensureIndicatorPane = function (indicatorKey, opts) {
    opts = opts || {};
    var existing = this.getByIndicator(indicatorKey);
    if (existing) return { ok: true, pane: existing, created: false };
    var pane = {
      id: this._newId('ind'),
      kind: KIND_INDICATOR,
      indicatorKey: indicatorKey,
      title: opts.title || String(indicatorKey).toUpperCase(),
      height: opts.height || 0.15,
      visible: opts.visible !== false,
    };
    this.panes.push(pane);
    return { ok: true, pane: pane, created: true };
  };

  PaneManager.prototype.ensureVolumePane = function () {
    if (this.getVolumePane()) return this.getVolumePane();
    var pane = {
      id: 'volume', kind: KIND_VOLUME, title: 'Volume',
      height: 0.12, visible: true,
    };
    this.panes.push(pane);
    return pane;
  };

  PaneManager.prototype.getVolumePane = function () {
    for (var i = 0; i < this.panes.length; i++) {
      if (this.panes[i].kind === KIND_VOLUME) return this.panes[i];
    }
    return null;
  };

  PaneManager.prototype.removePane = function (id) {
    if (id === 'main') return { ok: false, error: 'main pane is protected' };
    for (var i = 0; i < this.panes.length; i++) {
      if (this.panes[i].id === id) {
        this.panes.splice(i, 1);
        return { ok: true };
      }
    }
    return { ok: false, error: 'unknown pane: ' + id };
  };

  PaneManager.prototype.setHeight = function (id, pct) {
    var p = this.getById(id);
    if (!p) return { ok: false, error: 'unknown pane: ' + id };
    var h = Number(pct);
    if (!isFinite(h)) return { ok: false, error: 'invalid height' };
    p.height = Math.max(0.05, Math.min(0.9, h));
    return { ok: true, pane: clone(p) };
  };

  PaneManager.prototype.setVisible = function (id, v) {
    var p = this.getById(id);
    if (!p) return { ok: false, error: 'unknown pane: ' + id };
    if (p.kind === KIND_PRICE) return { ok: false, error: 'main pane cannot be hidden' };
    p.visible = !!v;
    return { ok: true, pane: clone(p) };
  };

  PaneManager.prototype.getPanes = function () {
    return clone(this.panes);
  };

  PaneManager.prototype.getVisiblePanes = function () {
    return clone(this.panes.filter(function (p) { return p.visible; }));
  };

  PaneManager.prototype.serialize = function () {
    return clone(this.panes);
  };

  PaneManager.prototype.restore = function (list) {
    var self = this;
    if (!Array.isArray(list)) return;
    var main = null;
    list.forEach(function (p) {
      if (!p || typeof p !== 'object') return;
      var pane = {
        id: p.id || self._newId('pane'),
        kind: p.kind || KIND_INDICATOR,
        indicatorKey: p.indicatorKey,
        title: p.title || p.indicatorKey || 'Pane',
        height: p.height || 0.15,
        visible: p.visible !== false,
      };
      if (pane.kind === KIND_PRICE) { main = pane; }
      else { self.panes.push(pane); }
    });
    if (main) {
      // replace existing main if present, else push
      var existing = this.getMainPane();
      if (existing) existing.height = main.height;
      else this.panes.unshift(main);
    }
  };

  /**
   * 计算各 pane 的屏幕矩形（纵向堆叠，高度按比例归一化）。
   * @param {number} totalHeight - 图表区可用总高度（含 pad）
   * @param {number} padTop
   * @param {number} padBottom
   * @returns {Array<{id, kind, top, height, bottom, indicatorKey}>}
   */
  PaneManager.prototype.layout = function (totalHeight, padTop, padBottom) {
    var visible = this.getVisiblePanes();
    var sum = 0;
    visible.forEach(function (p) { sum += p.height; });
    if (sum <= 0) sum = 1;
    var usable = Math.max(0, totalHeight - padTop - padBottom);
    var y = padTop;
    var out = [];
    for (var i = 0; i < visible.length; i++) {
      var p = visible[i];
      var h = Math.max(24, usable * (p.height / sum));
      if (i === visible.length - 1) h = Math.max(24, padTop + usable - y); // 吸收舍入误差
      out.push({
        id: p.id,
        kind: p.kind,
        indicatorKey: p.indicatorKey || null,
        title: p.title || '',
        top: y,
        height: h,
        bottom: y + h,
      });
      y += h;
    }
    return out;
  };

  PaneManager.prototype.findRect = function (rects, kind, id, indicatorKey) {
    for (var i = 0; i < rects.length; i++) {
      if (kind && rects[i].kind === kind) return rects[i];
      if (id && rects[i].id === id) return rects[i];
      if (indicatorKey && rects[i].indicatorKey === indicatorKey) return rects[i];
    }
    return null;
  };

  return {
    PaneManager: PaneManager,
    KIND_PRICE: KIND_PRICE,
    KIND_VOLUME: KIND_VOLUME,
    KIND_INDICATOR: KIND_INDICATOR,
  };
});
