/**
 * ATS-Quant Chart Engine v2 — Chart Controller
 * 
 * Main orchestrator that ties together all chart components.
 * 
 * Architecture:
 *   ChartController
 *   ├── RenderEngine        (layer-based rendering pipeline)
 *   ├── CandleRenderer       (candle/line/heikin_ashi rendering)
 *   ├── OverlayLayer         (bid/ask, positions, SL/TP, watermark)
 *   ├── CrosshairLayer       (crosshair + tooltip)
 *   ├── InteractionEngine    (drag, zoom, keyboard)
 *   ├── ThemeManager         (ATS Dark/Light/Custom)
 *   └── IndicatorRegistry    (EMA, BOLL, Volume, future indicators)
 * 
 * Backward Compatibility:
 *   - Exposes window.drawChart() for existing code
 *   - Exposes window.resizeChart() for tab switching
 *   - Reads from existing globals: candleData, lastBid, lastAsk, lastPrice,
 *     currentSymbol, currentTimeframe, allPositions
 * 
 * @module chart-v2/chart-controller
 */
(function(ATSChartV2) {
  'use strict';

  // D3.1：默认缩放（360 根全量时默认约 120 根可见，保证 K 线可读性）
  ATSChartV2.DEFAULT_ZOOM = 3;

  class ChartController {
    /**
     * @param {string} canvasId - Canvas element ID
     * @param {Object} options - Optional configuration
     */
    constructor(canvasId, options) {
      options = options || {};
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) {
        console.error('[ChartV2] Canvas not found: ' + canvasId);
        return;
      }
      this.ctx = this.canvas.getContext('2d');
      this.wrap = document.getElementById('chartCanvasWrap') || this.canvas.parentElement;

      // ===== Initialize Components =====
      this.themeManager = new ATSChartV2.ThemeManager();
      this.indicatorRegistry = new ATSChartV2.IndicatorRegistry();
      this.candleRenderer = new ATSChartV2.CandleRenderer();
      this.overlayLayer = new ATSChartV2.OverlayLayer();
      this.crosshairLayer = new ATSChartV2.CrosshairLayer();
      this.renderEngine = new ATSChartV2.RenderEngine(this.canvas, this.ctx);
      this.interactionEngine = new ATSChartV2.InteractionEngine(this);
      // Phase D3：多 Pane / 画线对象 / 交易标记
      this.paneManager = new ATSChartV2.PaneManager.PaneManager();
      this.drawingManager = new ATSChartV2.DrawingManager.DrawingManager();

      // ===== Chart State =====
      this.state = {
        symbol: 'XAUUSD',
        timeframe: 'M5',
        chartType: 'candle',       // 'candle' | 'line' | 'heikin_ashi'
        theme: 'ats_dark',          // 'ats_dark' | 'ats_light' | custom
        zoomLevel: ATSChartV2.DEFAULT_ZOOM,
        panOffset: 0,
        candles: [],
        visibleCandles: [],
        lastBid: 0,
        lastAsk: 0,
        lastPrice: 0,
        positions: [],
        tradeMarks: [],          // Phase D3：统一交易标记（来源归因）
        candleCountdown: null,   // Phase D3：B1 唯一倒计时来源
      };

      // ===== Apply initial theme =====
      this.themeManager.applyTheme(this.state.theme);

      // ===== Set up render callback =====
      this.renderEngine.setRenderCallback(() => {
        this._syncFromGlobals();
        this.renderEngine.renderChart(this.state, {
          candleRenderer: this.candleRenderer,
          overlayLayer: this.overlayLayer,
          crosshairLayer: this.crosshairLayer,
          indicatorRegistry: this.indicatorRegistry,
          themeManager: this.themeManager,
          paneManager: this.paneManager,
          drawingManager: this.drawingManager,
        });
      });

      // ===== Initialize =====
      this._init();
    }

    /**
     * Initialize chart: load defaults, bind events, initial render
     */
    _init() {
      // Load logo watermark
      this.overlayLayer.loadLogo('ats-logo.png');

      // Initialize tooltip
      this.crosshairLayer.initTooltip(this.wrap, this.themeManager.getTheme());

      // Phase D3：不再默认强制加载 EMA/BOLL —— 指标由用户主动选择
      // （保留 _loadDefaultIndicators 兼容旧入口，但默认不调用）

      // Bind interactions
      this.interactionEngine.bind();

      // Set up backward-compatible global functions
      this._setupBackwardCompat();

      // Handle window resize
      window.addEventListener('resize', () => this.resize());

      // Initial resize + render
      setTimeout(() => this.resize(), 100);

      console.log('[ChartV2] ChartController initialized — theme: ' + this.state.theme +
        ', chartType: ' + this.state.chartType +
        ', indicators: ' + this.indicatorRegistry.getAll().map(function(i) { return i.getName(); }).join(', '));
    }

    /**
     * 兼容旧入口：加载默认指标（Phase D3 起默认不再自动调用）
     */
    _loadDefaultIndicators() {
      // no-op：用户主动选择指标（D3 冻结规格）
    }

    /**
     * Set up backward-compatible global functions
     * This allows existing code in terminal.html to continue working
     * without modification.
     */
    _setupBackwardCompat() {
      const self = this;

      // window.drawChart — called by existing code after data updates
      window.drawChart = function() {
        self.requestRender();
      };

      // window.resizeChart — called on tab switch
      window.resizeChart = function() {
        self.resize();
      };

      // Expose chart controller for advanced access
      window.ATSChartV2Controller = this;
    }

    /**
     * Sync state from existing global variables.
     * This bridges the gap between old code and new chart engine.
     */
    _syncFromGlobals() {
      // Candle data
      if (typeof candleData !== 'undefined' && candleData) {
        this.state.candles = candleData;
      }
      // Price data
      if (typeof lastBid !== 'undefined') this.state.lastBid = lastBid;
      if (typeof lastAsk !== 'undefined') this.state.lastAsk = lastAsk;
      if (typeof lastPrice !== 'undefined') this.state.lastPrice = lastPrice;
      // Symbol and timeframe
      if (typeof currentSymbol !== 'undefined') this.state.symbol = currentSymbol;
      if (typeof currentTimeframe !== 'undefined') this.state.timeframe = currentTimeframe;
      // Positions
      if (typeof allPositions !== 'undefined' && allPositions) {
        this.state.positions = allPositions;
      }
    }

    // ===== Public API =====

    /**
     * Request a debounced render
     */
    requestRender() {
      this.renderEngine.requestRender();
    }

    /**
     * Resize the chart to fit container
     */
    resize() {
      this.renderEngine.resize();
    }

    /**
     * Get last computed layout (used by InteractionEngine)
     */
    getLastLayout() {
      return this.renderEngine.getLastLayout();
    }

    /**
     * Switch chart type
     * @param {string} type - 'candle', 'line', 'heikin_ashi'
     */
    setChartType(type) {
      this.state.chartType = type;
      this.candleRenderer.setChartType(type);
      this.requestRender();
      console.log('[ChartV2] Chart type changed to: ' + type);
    }

    /**
     * Get current chart type
     */
    getChartType() {
      return this.state.chartType;
    }

    /**
     * Switch theme
     * @param {string} themeName - 'ats_dark', 'ats_light', or custom
     */
    setTheme(themeName) {
      this.state.theme = themeName;
      this.themeManager.applyTheme(themeName);
      // Update indicator colors to match theme
      this._updateIndicatorColors();
      this.requestRender();
      console.log('[ChartV2] Theme changed to: ' + themeName);
    }

    /**
     * Get current theme name
     */
    getTheme() {
      return this.themeManager.getCurrentThemeName();
    }

    /**
     * Register a custom theme
     * @param {string} name
     * @param {Object} palette
     */
    registerCustomTheme(name, palette) {
      this.themeManager.registerCustomTheme(name, palette);
    }

    /**
     * Add an indicator to the chart
     * @param {string} type - 'ema', 'boll', 'volume', or custom type
     * @param {Object} config
     */
    addIndicator(type, config) {
      const ind = this.indicatorRegistry.add(type, config);
      if (ind && typeof ind.getPaneType === 'function') {
        const paneType = ind.getPaneType();
        if (paneType === 'volume') {
          this.paneManager.ensureVolumePane();
        } else if (paneType === 'indicator') {
          this.paneManager.ensureIndicatorPane(
            ind.getName().toLowerCase(),
            { title: ind.getPaneTitle ? ind.getPaneTitle() : ind.getName(), height: 0.15 }
          );
        }
      }
      this.requestRender();
      return ind;
    }

    /**
     * Remove an indicator by index
     */
    removeIndicator(index) {
      const removed = this.indicatorRegistry.remove(index);
      this._syncPanesFromIndicators();
      this.requestRender();
      return removed;
    }

    /**
     * Phase D3：按 key 移除指标（并清理不再使用的指标 pane）
     */
    removeIndicatorByKey(key) {
      const indicators = this.indicatorRegistry.getAll();
      for (let i = 0; i < indicators.length; i++) {
        if (String(indicators[i].getName()).toLowerCase() === String(key).toLowerCase()) {
          this.indicatorRegistry.remove(i);
          break;
        }
      }
      this._syncPanesFromIndicators();
      this.requestRender();
      return { ok: true };
    }

    /**
     * Toggle indicator visibility
     */
    toggleIndicator(index) {
      const indicators = this.indicatorRegistry.getAll();
      if (index >= 0 && index < indicators.length) {
        indicators[index].setVisible(!indicators[index].visible);
        this.requestRender();
      }
    }

    /**
     * Phase D3：按 key 显示/隐藏指标
     */
    setIndicatorVisible(key, visible) {
      const indicators = this.indicatorRegistry.getAll();
      for (const ind of indicators) {
        if (String(ind.getName()).toLowerCase() === String(key).toLowerCase()) {
          ind.setVisible(!!visible);
          this.requestRender();
          return { ok: true };
        }
      }
      return { ok: false, error: 'unknown indicator: ' + key };
    }

    /**
     * 根据当前指标集合清理孤儿 pane（指标已删除但 pane 仍在）
     */
    _syncPanesFromIndicators() {
      const keys = this.indicatorRegistry.getAll().map(function (i) { return String(i.getName()).toLowerCase(); });
      const paneList = this.paneManager.getPanes();
      for (const pane of paneList) {
        if (pane.kind === 'indicator' && keys.indexOf(pane.indicatorKey) < 0) {
          this.paneManager.removePane(pane.id);
        }
      }
      if (keys.indexOf('volume') < 0 && this.paneManager.getVolumePane()) {
        this.paneManager.removePane('volume');
      }
    }

    /**
     * Phase D3：调整指标 pane 高度（0.05 - 0.9）
     */
    setPaneHeight(paneId, pct) {
      const r = this.paneManager.setHeight(paneId, pct);
      if (r.ok) this.requestRender();
      return r;
    }

    /**
     * Phase D3：显示/隐藏指标 pane（主图不可隐藏）
     */
    togglePane(paneId) {
      const pane = this.paneManager.getById(paneId);
      if (!pane) return { ok: false, error: 'unknown pane' };
      const r = this.paneManager.setVisible(paneId, !pane.visible);
      if (r.ok) this.requestRender();
      return r;
    }

    getPanes() {
      return this.paneManager.getPanes();
    }

    /**
     * Phase D3：画线对象（D4 交互基础）
     */
    addDrawing(type, points, style, meta) {
      const r = this.drawingManager.add(type, points, style, meta);
      if (r.ok) this.requestRender();
      return r;
    }
    removeDrawing(id) {
      const r = this.drawingManager.remove(id);
      if (r.ok) this.requestRender();
      return r;
    }
    clearDrawings() {
      this.drawingManager.clear();
      this.requestRender();
    }
    getDrawings() {
      return this.drawingManager.getAll();
    }

    /**
     * Phase D3：统一交易标记（来源归因）
     */
    setTradeMarks(marks) {
      this.state.tradeMarks = Array.isArray(marks) ? marks : [];
      this.requestRender();
      return { ok: true };
    }
    getTradeMarks() {
      return this.state.tradeMarks || [];
    }

    /**
     * Phase D3：设置 B1 唯一 K 线倒计时（前端只展示，不自行计算周期边界）
     */
    setCandleCountdown(data) {
      this.state.candleCountdown = data || null;
      return this.state.candleCountdown;
    }
    getCandleCountdown() {
      return this.state.candleCountdown;
    }

    /**
     * Phase D3：显式缩放 / 平移 / 回到最新
     */
    setZoom(level) {
      const total = this.state.candles ? this.state.candles.length : 0;
      const z = Math.max(0.3, Math.min(15, Number(level) || 1));
      this.state.zoomLevel = z;
      const visCount = Math.max(15, Math.min(total, Math.floor(total / z)));
      if (this.state.panOffset > Math.max(0, total - visCount)) {
        this.state.panOffset = Math.max(0, total - visCount);
      }
      this.requestRender();
      return z;
    }
    setPanOffset(offset) {
      const total = this.state.candles ? this.state.candles.length : 0;
      const visCount = Math.max(15, Math.min(total, Math.floor(total / this.state.zoomLevel)));
      this.state.panOffset = Math.max(-(visCount - 5), Math.min(total - visCount, Number(offset) || 0));
      this.requestRender();
      return this.state.panOffset;
    }
    scrollToLatest() {
      this.state.panOffset = 0;
      this.requestRender();
    }

    /**
     * Reset zoom and pan to default
     */
    resetZoom() {
      this.state.zoomLevel = ATSChartV2.DEFAULT_ZOOM;
      this.state.panOffset = 0;
      this.requestRender();
    }

    /**
     * Update indicator colors when theme changes
     */
    _updateIndicatorColors() {
      const theme = this.themeManager.getTheme();
      const indicators = this.indicatorRegistry.getAll();
      for (const ind of indicators) {
        if (ind.getName() === 'EMA') {
          ind.color = theme.ma20;
        }
      }
    }

    /**
     * Save chart configuration to localStorage
     */
    saveConfig() {
      const config = {
        chartType: this.state.chartType,
        theme: this.state.theme,
        zoomLevel: this.state.zoomLevel,
        indicators: this.indicatorRegistry.getAll().map(function(i) {
          return { name: i.getName(), visible: i.visible, period: i.period };
        }),
        panes: this.paneManager.serialize(),
        drawings: this.drawingManager.serialize(),
      };
      try {
        localStorage.setItem('ats_chart_v2_config', JSON.stringify(config));
        console.log('[ChartV2] Configuration saved');
      } catch (e) {
        console.warn('[ChartV2] Failed to save config:', e);
      }
    }

    /**
     * Load chart configuration from localStorage
     */
    loadConfig() {
      try {
        const raw = localStorage.getItem('ats_chart_v2_config');
        if (!raw) return;
        const config = JSON.parse(raw);
        if (config.chartType) this.setChartType(config.chartType);
        if (config.theme) this.setTheme(config.theme);
        if (config.zoomLevel) this.state.zoomLevel = config.zoomLevel;
        if (config.panes && config.panes.length) {
          this.paneManager.restore(config.panes);
        }
        if (config.drawings && config.drawings.length) {
          this.drawingManager.restore(config.drawings);
        }
        // 重建已保存的指标（Phase D3：用户主动选择，重启后保留）
        if (config.indicators && config.indicators.length) {
          this.indicatorRegistry.clear();
          const self = this;
          config.indicators.forEach(function (it) {
            const type = String(it.name || '').toLowerCase();
            const ind = self.indicatorRegistry.add(type, {
              name: it.name,
              period: it.period,
              visible: it.visible !== false,
            });
            if (ind && typeof ind.getPaneType === 'function') {
              const pt = ind.getPaneType();
              if (pt === 'volume') self.paneManager.ensureVolumePane();
              else if (pt === 'indicator') self.paneManager.ensureIndicatorPane(type, { title: ind.getPaneTitle ? ind.getPaneTitle() : it.name });
            }
          });
        }
        console.log('[ChartV2] Configuration loaded');
      } catch (e) {
        console.warn('[ChartV2] Failed to load config:', e);
      }
    }

    /**
     * Get chart info (for debugging/testing)
     */
    getInfo() {
      return {
        version: '2.1.0',
        paneCount: this.paneManager.getPanes().length,
        drawingCount: this.drawingManager.getAll().length,
        tradeMarkCount: (this.state.tradeMarks || []).length,
        chartType: this.state.chartType,
        theme: this.state.theme,
        zoomLevel: this.state.zoomLevel,
        panOffset: this.state.panOffset,
        candleCount: this.state.candles.length,
        visibleCount: this.state.visibleCandles.length,
        indicators: this.indicatorRegistry.getAll().map(function(i) {
          return { name: i.getName(), period: i.period, visible: i.visible };
        }),
        availableThemes: this.themeManager.listThemes(),
        availableIndicators: this.indicatorRegistry.listTypes()
      };
    }
  }

  ATSChartV2.ChartController = ChartController;

  // ===== Auto-initialization =====
  // When DOM is ready, create the chart controller if canvas exists
  function autoInit() {
    if (document.getElementById('candlestickChart') && !window.ATSChartV2Controller) {
      window.ATSChartV2Instance = new ATSChartV2.ChartController('candlestickChart');
      // Try to load saved config
      setTimeout(function() {
        if (window.ATSChartV2Instance) {
          window.ATSChartV2Instance.loadConfig();
        }
      }, 500);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    // DOM already loaded — wait a tick for terminal.html inline scripts to set globals
    setTimeout(autoInit, 200);
  }

})(window.ATSChartV2 = window.ATSChartV2 || {});
