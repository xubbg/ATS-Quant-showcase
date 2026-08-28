/**
 * ATS-Quant Chart Engine v2 — Interaction Engine
 * 
 * Manages all user interactions with the chart:
 * - Mouse drag for horizontal panning
 * - Mouse wheel for zoom
 * - Double-click to reset zoom/pan
 * - Keyboard +/- for zoom
 * - Mouse move for crosshair tracking
 * 
 * @module chart-v2/interaction-engine
 */
(function(ATSChartV2) {
  'use strict';

  class InteractionEngine {
    /**
     * @param {Object} controller - ChartController instance
     */
    constructor(controller) {
      this.controller = controller;
      this.canvas = controller.canvas;
      this.isDragging = false;
      this.dragStartX = 0;
      this.dragStartOffset = 0;
      this._keydownHandler = null;
    }

    /**
     * Bind all interaction events to canvas
     */
    bind() {
      this.canvas.addEventListener('mousemove', this._onMouseMove.bind(this));
      this.canvas.addEventListener('mouseleave', this._onMouseLeave.bind(this));
      this.canvas.addEventListener('wheel', this._onWheel.bind(this), { passive: false });
      this.canvas.addEventListener('mousedown', this._onMouseDown.bind(this));
      document.addEventListener('mousemove', this._onDragMove.bind(this));
      document.addEventListener('mouseup', this._onMouseUp.bind(this));
      this.canvas.addEventListener('dblclick', this._onDblClick.bind(this));
      // Keyboard shortcuts
      this._keydownHandler = this._onKeyDown.bind(this);
      document.addEventListener('keydown', this._keydownHandler);
    }

    /**
     * Unbind all events (for cleanup)
     */
    unbind() {
      // Listeners are removed via clone references in production;
      // for this phase, cleanup is not critical as chart persists
      if (this._keydownHandler) {
        document.removeEventListener('keydown', this._keydownHandler);
      }
    }

    // ===== Mouse Move (crosshair tracking) =====
    _onMouseMove(e) {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      this.controller.crosshairLayer.updateMouse(x, y);
      this.controller.requestRender();

      // Update tooltip
      const state = this.controller.state;
      if (!state.candles || !state.candles.length) {
        if (this.controller.crosshairLayer.tooltip) {
          this.controller.crosshairLayer.tooltip.style.display = 'none';
        }
        this.controller.crosshairLayer.hideMarkTooltip();
        return;
      }

      const layout = this.controller.getLastLayout();
      if (!layout) return;

      // D3.1：交易标记 hover 详情（命中 → 显示来源/策略名，否则隐藏）
      const markHit = this.controller.overlayLayer.hitTestTradeMarks(x, y, layout, state.tradeMarks);
      if (markHit) {
        this.controller.crosshairLayer.showMarkTooltip(markHit.mark, markHit.px, markHit.py, { W: layout.W, H: layout.H });
        // 标记 hover 优先：隐藏 OHLC tooltip，避免双 tooltip 叠加
        if (this.controller.crosshairLayer.tooltip) {
          this.controller.crosshairLayer.tooltip.style.display = 'none';
        }
        return;
      }
      this.controller.crosshairLayer.hideMarkTooltip();

      if (x < layout.pad.left || x > layout.pad.left + layout.pw) {
        if (this.controller.crosshairLayer.tooltip) {
          this.controller.crosshairLayer.tooltip.style.display = 'none';
        }
        this.controller.crosshairLayer.hideMarkTooltip();
        return;
      }

      const vis = state.visibleCandles;
      if (!vis || !vis.length) return;
      const n = vis.length;

      // Use visCount for index mapping (consistent with render-engine cx function)
      const total = state.candles ? state.candles.length : 0;
      const visCount = Math.max(15, Math.min(total, Math.floor(total / state.zoomLevel)));

      const relX = (x - layout.pad.left) / layout.pw;
      let idx = Math.round(relX * (visCount - 1));
      if (idx < 0) idx = 0;
      if (idx >= n) {
        // Mouse is in the right-side blank area (panned chart)
        if (this.controller.crosshairLayer.tooltip) {
          this.controller.crosshairLayer.tooltip.style.display = 'none';
        }
        return;
      }
      const candle = vis[idx];
      if (!candle) return;

      const prevClose = idx > 0 ? vis[idx - 1].close : candle.open;
      this.controller.crosshairLayer.updateTooltip(
        candle,
        state.symbol,
        state.timeframe,
        prevClose,
        state.lastBid,
        state.lastAsk,
        { W: layout.W, H: layout.H }
      );
    }

    // ===== Mouse Leave =====
    _onMouseLeave() {
      this.controller.crosshairLayer.hide();
      this.controller.requestRender();
    }

    // ===== Mouse Wheel (zoom) =====
    _onWheel(e) {
      e.preventDefault();
      const state = this.controller.state;
      // deltaY > 0 = scroll down = zoom out (show more)
      // deltaY < 0 = scroll up = zoom in (show fewer)
      const factor = e.deltaY > 0 ? 0.85 : 1.18;
      const total = state.candles ? state.candles.length : 0;
      if (!total) return;
      this._zoomTo(factor, e);
      this.controller.requestRender();
    }

    /**
     * D3.2：鼠标锚点缩放。
     * 缩放前后保持鼠标位置下的 K 线处于同一屏幕 x 坐标，
     * 同时把缩放真正映射为“可见 K 线数量 / 槽位宽度”变化。
     * @param {number} factor - 缩放系数（>1 放大，<1 缩小）
     * @param {MouseEvent|WheelEvent} [e] - 可选，用于读取鼠标锚点
     */
    _zoomTo(factor, e) {
      const state = this.controller.state;
      const total = state.candles ? state.candles.length : 0;
      if (!total) return;

      // 锚点位置：默认视口中心，鼠标事件取鼠标所在位置
      const layout = this.controller.getLastLayout();
      const rect = this.canvas.getBoundingClientRect();
      let relX = 0.5;
      if (e && typeof e.clientX === 'number' && layout && layout.pw > 0) {
        const x = e.clientX - rect.left;
        relX = (x - layout.pad.left) / layout.pw;
      }
      relX = Math.max(0, Math.min(1, relX));

      const oldVis = Math.max(15, Math.min(total, Math.floor(total / state.zoomLevel)));
      const oldStart = total - oldVis - (state.panOffset || 0);
      const anchorIdx = Math.max(0, Math.min(total - 1, oldStart + relX * (oldVis - 1)));

      state.zoomLevel = Math.max(0.3, Math.min(15, state.zoomLevel * factor));
      const newVis = Math.max(15, Math.min(total, Math.floor(total / state.zoomLevel)));
      const newStart = anchorIdx - relX * (newVis - 1);
      let newPan = total - newVis - newStart;
      newPan = Math.max(-(newVis - 5), Math.min(total - newVis, newPan));
      state.panOffset = newPan;
    }

    // ===== Mouse Down (start drag) =====
    _onMouseDown(e) {
      if (e.button !== 0) return;
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartOffset = this.controller.state.panOffset;
      this.canvas.style.cursor = 'grabbing';
    }

    // ===== Drag Move (panning) =====
    _onDragMove(e) {
      if (!this.isDragging) return;
      const state = this.controller.state;
      const layout = this.controller.getLastLayout();
      if (!layout) return;

      const total = state.candles ? state.candles.length : 0;
      const visCount = Math.max(15, Math.min(total, Math.floor(total / state.zoomLevel)));
      const pxPerCandle = layout.pw / visCount;
      const deltaPx = e.clientX - this.dragStartX;
      const deltaCandles = Math.round(deltaPx / pxPerCandle);
      // Allow negative panOffset so the latest candle can be dragged to center (right-side blank space)
      state.panOffset = Math.max(-(visCount - 5), Math.min(total - visCount, this.dragStartOffset + deltaCandles));
      this.controller.requestRender();
    }

    // ===== Mouse Up (end drag) =====
    _onMouseUp() {
      if (this.isDragging) {
        this.isDragging = false;
        this.canvas.style.cursor = 'crosshair';
      }
    }

    // ===== Double Click (reset) =====
    _onDblClick(e) {
      e.preventDefault();
      const state = this.controller.state;
      state.zoomLevel = this._defaultZoom();
      state.panOffset = 0;
      this.controller.requestRender();
    }

    /**
     * 统一默认缩放（D3.1：与 ChartController DEFAULT_ZOOM 一致）
     */
    _defaultZoom() {
      return (typeof ATSChartV2 !== 'undefined' && typeof ATSChartV2.DEFAULT_ZOOM === 'number')
        ? ATSChartV2.DEFAULT_ZOOM : 3;
    }

    // ===== Keyboard Shortcuts =====
    _onKeyDown(e) {
      // Only handle if chart canvas is likely in focus or chart area is hovered
      // Check if target is body or canvas-related
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      const state = this.controller.state;
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        this._zoomTo(1.25);
        this.controller.requestRender();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        this._zoomTo(0.8);
        this.controller.requestRender();
      } else if (e.key === '0') {
        // Reset zoom
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          state.zoomLevel = this._defaultZoom();
          state.panOffset = 0;
          this.controller.requestRender();
        }
      }
    }
  }

  ATSChartV2.InteractionEngine = InteractionEngine;
})(window.ATSChartV2 = window.ATSChartV2 || {});
