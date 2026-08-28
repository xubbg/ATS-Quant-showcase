/**
 * ATS-Quant Chart Engine v2 — Crosshair Layer
 * 
 * Renders crosshair lines and OHLCV tooltip.
 * Tracks mouse position for crosshair display.
 * 
 * @module chart-v2/crosshair-layer
 */
(function(ATSChartV2) {
  'use strict';

  class CrosshairLayer {
    constructor() {
      this.mx = -1;
      this.my = -1;
      this.tooltip = null;
      this.markTooltip = null;
    }

    /**
     * Initialize tooltip DOM element
     * @param {HTMLElement} container - Parent element for tooltip
     * @param {Object} theme - Current theme palette
     */
    initTooltip(container, theme) {
      this.tooltip = document.getElementById('chartTooltip');
      if (!this.tooltip) {
        this.tooltip = document.createElement('div');
        this.tooltip.id = 'chartTooltip';
        this.tooltip.style.cssText =
          'position:absolute;display:none;pointer-events:none;z-index:50;' +
          'background:rgba(10,14,20,0.96);border:1px solid rgba(240,185,11,0.2);' +
          'border-radius:4px;padding:8px 12px;font-size:10px;' +
          'font-family:JetBrains Mono,monospace;color:#E8EDF5;white-space:nowrap;' +
          'box-shadow:0 4px 12px rgba(0,0,0,0.6);line-height:1.6;';
        container.appendChild(this.tooltip);
      }
      this.markTooltip = document.getElementById('chartMarkTooltip');
      if (!this.markTooltip) {
        this.markTooltip = document.createElement('div');
        this.markTooltip.id = 'chartMarkTooltip';
        this.markTooltip.style.cssText =
          'position:absolute;display:none;pointer-events:none;z-index:51;' +
          'background:rgba(10,14,20,0.97);border:1px solid rgba(42,52,65,0.7);' +
          'border-radius:4px;padding:6px 10px;font-size:10px;' +
          'font-family:JetBrains Mono,monospace;color:#E8EDF5;white-space:nowrap;' +
          'box-shadow:0 4px 12px rgba(0,0,0,0.6);line-height:1.5;';
        container.appendChild(this.markTooltip);
      }
    }

    /**
     * Update mouse position
     */
    updateMouse(x, y) {
      this.mx = x;
      this.my = y;
    }

    /**
     * Hide crosshair
     */
    hide() {
      this.mx = -1;
      this.my = -1;
      if (this.tooltip) this.tooltip.style.display = 'none';
      if (this.markTooltip) this.markTooltip.style.display = 'none';
    }

    /**
     * 显示交易标记 hover 详情（D3.1：来源 + 策略名 + 方向/价格）
     * @param {Object} mark - 命中标记 {source, strategyName, side, price}
     * @param {number} px - 标记屏幕 x（主图锚点）
     * @param {number} py - 标记屏幕 y
     * @param {Object} canvasSize - {W, H}
     */
    showMarkTooltip(mark, px, py, canvasSize) {
      if (!this.markTooltip || !mark) return;
      const sourceKey = String(mark.source || 'MT5').toUpperCase();
      const colors = (typeof ATSChartV2 !== 'undefined' && ATSChartV2.TRADE_MARK_SOURCE_COLORS)
        ? ATSChartV2.TRADE_MARK_SOURCE_COLORS : {};
      const color = colors[sourceKey] || '#F0B90B';
      const side = String(mark.side || '').toLowerCase().indexOf('buy') >= 0 ? 'BUY' : 'SELL';
      const name = mark.strategyName || '';
      const esc = function (s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      };
      const f2 = function (v) { return (v == null) ? '--' : Number(v).toFixed(2); };
      const pnl = (mark.profit != null) ? Number(mark.profit) : null;
      const pnlTxt = (pnl == null) ? '--' : ((pnl >= 0 ? '+' : '') + '$' + pnl.toFixed(2));
      const pnlColor = (pnl == null) ? '#7A8599' : (pnl >= 0 ? '#33CC95' : '#F87171');
      let html = '<div style="color:' + color + ';font-size:9px;font-weight:700;margin-bottom:3px;">' +
        '[' + esc(sourceKey) + ']' + (name ? ' ' + esc(name) : '') + '</div>';
      const rows = [];
      rows.push(['方向', '<span style="color:' + (side === 'BUY' ? '#33CC95' : '#F87171') + ';font-weight:700;">' + side + '</span>']);
      rows.push(['手数', f2(mark.volume)]);
      rows.push(['开仓价', f2(mark.price)]);
      rows.push(['浮动盈亏', '<span style="color:' + pnlColor + ';">' + pnlTxt + '</span>']);
      if (mark.sl) rows.push(['止损 SL', f2(mark.sl)]);
      if (mark.tp) rows.push(['止盈 TP', f2(mark.tp)]);
      rows.forEach(function (r) {
        html += '<div style="display:flex;justify-content:space-between;gap:14px;font-size:9px;line-height:1.6;">' +
          '<span style="color:#7A8599;">' + r[0] + '</span><span style="color:#E8EDF5;">' + r[1] + '</span></div>';
      });
      this.markTooltip.innerHTML = html;
      this.markTooltip.style.display = 'block';
      let tx = px + 14;
      let ty = py - 26;
      if (tx + 180 > canvasSize.W) tx = px - 180;
      if (ty < 4) ty = py + 16;
      this.markTooltip.style.left = tx + 'px';
      this.markTooltip.style.top = ty + 'px';
    }

    /**
     * 隐藏交易标记 hover 详情
     */
    hideMarkTooltip() {
      if (this.markTooltip) this.markTooltip.style.display = 'none';
    }

    /**
     * Render crosshair lines on canvas
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} layout - {pad, pw, chartPh, W, H, maxPrice, priceRange}
     * @param {Object} theme - Color palette
     */
    render(ctx, layout, theme) {
      if (this.mx < 0 || this.my < 0) return;
      const { pad, pw, W, H, maxPrice, priceRange, main } = layout;
      const mainTop = main.top;
      const mainH = main.height;
      if (this.mx < pad.left || this.mx > pad.left + pw) return;
      if (this.my < mainTop || this.my > mainTop + mainH) return;

      ctx.strokeStyle = theme.crosshair;
      ctx.lineWidth = 0.5;
      ctx.setLineDash([3, 3]);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(this.mx, 0);
      ctx.lineTo(this.mx, H);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(0, this.my);
      ctx.lineTo(W, this.my);
      ctx.stroke();

      ctx.setLineDash([]);

      // Price at cursor (right-side label, 基于主图)
      const priceAtCursor = maxPrice - ((this.my - mainTop) / mainH) * priceRange;
      ctx.fillStyle = theme.crosshairLabel;
      ctx.fillRect(pad.left + pw, this.my - 8, 72, 16);
      ctx.fillStyle = theme.crosshairText;
      ctx.font = 'bold 9px "JetBrains Mono"';
      ctx.textAlign = 'center';
      ctx.fillText(priceAtCursor.toFixed(2), pad.left + pw + 36, this.my + 3);
    }

    /**
     * Update tooltip content and position
     * @param {Object} candle - {open, high, low, close, vol, time}
     * @param {string} symbol - e.g. 'XAUUSD'
     * @param {string} timeframe - e.g. 'M5'
     * @param {number} prevClose - Previous candle close for change calculation
     * @param {number} lastBid
     * @param {number} lastAsk
     * @param {Object} canvasSize - {W, H}
     */
    updateTooltip(candle, symbol, timeframe, prevClose, lastBid, lastAsk, canvasSize) {
      if (!this.tooltip || !candle) {
        if (this.tooltip) this.tooltip.style.display = 'none';
        return;
      }

      const chg = candle.close - prevClose;
      const chgPct = prevClose > 0 ? (chg / prevClose * 100) : 0;
      const color = candle.close >= candle.open ? '#2ECC71' : '#E74C3C';

      let timeStr = '--';
      if (candle.time) {
        const dt = new Date(candle.time * 1000);
        timeStr = (dt.getMonth() + 1).toString().padStart(2, '0') + '/' +
          dt.getDate().toString().padStart(2, '0') + ' ' +
          dt.getHours().toString().padStart(2, '0') + ':' +
          dt.getMinutes().toString().padStart(2, '0');
      }

      const spreadVal = (lastAsk > 0 && lastBid > 0) ? (lastAsk - lastBid) : 0;
      this.tooltip.innerHTML =
        '<div style="color:#F0B90B;font-size:9px;font-weight:600;margin-bottom:4px;">' +
        symbol + ' \u00b7 ' + timeframe + '</div>' +
        '<div style="color:#7A8599;font-size:8px;margin-bottom:4px;">' + timeStr + '</div>' +
        '<div style="display:flex;gap:12px;margin-bottom:2px;">' +
        '<span style="color:#7A8599;">O</span><span style="color:' + color + ';">' + candle.open.toFixed(2) + '</span>' +
        '<span style="color:#7A8599;">H</span><span style="color:' + color + ';">' + candle.high.toFixed(2) + '</span>' +
        '</div>' +
        '<div style="display:flex;gap:12px;margin-bottom:2px;">' +
        '<span style="color:#7A8599;">L</span><span style="color:' + color + ';">' + candle.low.toFixed(2) + '</span>' +
        '<span style="color:#7A8599;">C</span><span style="color:' + color + ';">' + candle.close.toFixed(2) + '</span>' +
        '</div>' +
        '<div style="display:flex;gap:12px;margin-bottom:2px;">' +
        '<span style="color:#7A8599;">V</span><span style="color:#E8EDF5;">' + (candle.vol || 0).toFixed(0) + '</span>' +
        '<span style="color:' + (chg >= 0 ? '#2ECC71' : '#E74C3C') + ';">' +
        (chg >= 0 ? '+' : '') + chg.toFixed(2) + ' (' + (chgPct >= 0 ? '+' : '') + chgPct.toFixed(2) + '%)</span>' +
        '</div>' +
        (spreadVal > 0 ? '<div style="color:#F0B90B;font-size:8px;margin-top:2px;">Spread ' + spreadVal.toFixed(2) + '</div>' : '');
      this.tooltip.style.display = 'block';

      // Position tooltip
      let tx = this.mx + 14;
      let ty = this.my + 14;
      if (tx + 200 > canvasSize.W) tx = this.mx - 200;
      if (ty + 80 > canvasSize.H) ty = this.my - 80;
      this.tooltip.style.left = tx + 'px';
      this.tooltip.style.top = ty + 'px';
    }
  }

  ATSChartV2.CrosshairLayer = CrosshairLayer;
})(window.ATSChartV2 = window.ATSChartV2 || {});
