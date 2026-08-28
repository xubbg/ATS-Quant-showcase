/**
 * ATS-Quant Chart Engine v2 — Theme Manager
 * 
 * Manages chart color themes: ATS Dark (default), Light, Custom
 * All chart components MUST get colors from ThemeManager.
 * 
 * @module chart-v2/theme-manager
 */
(function(ATSChartV2) {
  'use strict';

  // ===== Theme Definitions =====
  const THEMES = {
    // ATS Dark — Professional trading terminal theme (default)
    ats_dark: {
      background:       '#0B0F14',
      panelBackground:  '#0D1117',
      grid:             'rgba(42,52,65,0.35)',
      gridStrong:       'rgba(42,52,65,0.6)',
      text:             '#E8EDF5',
      textMuted:        '#5A6575',
      textDim:          '#7A8599',
      border:           'rgba(42,52,65,0.5)',
      // Candle colors — institutional low-saturation
      bull:             '#2ECC71',
      bullBorder:       'rgba(46,204,113,0.35)',
      bear:             '#E74C3C',
      bearBorder:       'rgba(231,76,60,0.35)',
      // Price lines
      bidColor:         '#2ECC71',
      askColor:         '#E74C3C',
      spreadFill:       'rgba(240,185,11,0.04)',
      spreadLabel:      'rgba(240,185,11,0.7)',
      currentUp:        'rgba(46,204,113,0.4)',
      currentDown:      'rgba(231,76,60,0.4)',
      // Crosshair
      crosshair:        'rgba(122,133,153,0.35)',
      crosshairLabel:   '#2A3441',
      crosshairText:    '#E8EDF5',
      // Indicators
      ma20:             'rgba(240,185,11,0.5)',
      bbUpper:          'rgba(59,130,246,0.25)',
      bbMid:            'rgba(59,130,246,0.4)',
      bbLower:          'rgba(59,130,246,0.25)',
      emaFast:          '#F0B90B',
      emaSlow:          '#3B82F6',
      volumeBull:       'rgba(46,204,113,0.25)',
      volumeBear:       'rgba(231,76,60,0.25)',
      // Accent
      accent:           '#F0B90B',
      accentDim:        'rgba(240,185,11,0.2)',
      // Logo watermark
      watermarkAlpha:   0.04
    },

    // Light — Clean daytime theme
    ats_light: {
      background:       '#FFFFFF',
      panelBackground:  '#F8F9FA',
      grid:             'rgba(0,0,0,0.06)',
      gridStrong:       'rgba(0,0,0,0.1)',
      text:             '#1A1D23',
      textMuted:        '#6B7280',
      textDim:          '#9CA3AF',
      border:           'rgba(0,0,0,0.08)',
      bull:             '#16A34A',
      bullBorder:       'rgba(22,163,74,0.3)',
      bear:             '#DC2626',
      bearBorder:       'rgba(220,38,38,0.3)',
      bidColor:         '#16A34A',
      askColor:         '#DC2626',
      spreadFill:       'rgba(202,138,4,0.06)',
      spreadLabel:      'rgba(202,138,4,0.8)',
      currentUp:        'rgba(22,163,74,0.4)',
      currentDown:      'rgba(220,38,38,0.4)',
      crosshair:        'rgba(0,0,0,0.2)',
      crosshairLabel:   '#E5E7EB',
      crosshairText:    '#1A1D23',
      ma20:             'rgba(202,138,4,0.6)',
      bbUpper:          'rgba(59,130,246,0.3)',
      bbMid:            'rgba(59,130,246,0.5)',
      bbLower:          'rgba(59,130,246,0.3)',
      emaFast:           '#CA8A04',
      emaSlow:           '#2563EB',
      volumeBull:       'rgba(22,163,74,0.2)',
      volumeBear:       'rgba(220,38,38,0.2)',
      accent:           '#CA8A04',
      accentDim:        'rgba(202,138,4,0.15)',
      watermarkAlpha:   0.02
    }
  };

  class ThemeManager {
    constructor() {
      this._currentTheme = 'ats_dark';
      this._customThemes = {};
    }

    /**
     * Apply a named theme
     * @param {string} name - Theme key: 'ats_dark', 'ats_light', or custom key
     */
    applyTheme(name) {
      if (THEMES[name]) {
        this._currentTheme = name;
      } else if (this._customThemes[name]) {
        this._currentTheme = name;
      } else {
        console.warn('[ChartV2] Unknown theme: ' + name + ', falling back to ats_dark');
        this._currentTheme = 'ats_dark';
      }
      return this.getTheme();
    }

    /**
     * Get the current theme color palette
     * @returns {Object} Color palette object
     */
    getTheme() {
      return THEMES[this._currentTheme] || this._customThemes[this._currentTheme] || THEMES.ats_dark;
    }

    /**
     * Get current theme name
     * @returns {string}
     */
    getCurrentThemeName() {
      return this._currentTheme;
    }

    /**
     * Register a custom theme
     * @param {string} name - Theme key
     * @param {Object} palette - Complete color palette (must match ats_dark structure)
     */
    registerCustomTheme(name, palette) {
      const base = THEMES.ats_dark;
      this._customThemes[name] = Object.assign({}, base, palette);
    }

    /**
     * List all available theme names
     * @returns {string[]}
     */
    listThemes() {
      return Object.keys(THEMES).concat(Object.keys(this._customThemes));
    }
  }

  ATSChartV2.ThemeManager = ThemeManager;
})(window.ATSChartV2 = window.ATSChartV2 || {});
