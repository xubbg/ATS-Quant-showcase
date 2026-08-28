/**
 * ATS-Quant Chart Engine v2 — Overlay Layer
 * 
 * Renders overlay elements on top of candlesticks:
 * - Bid/Ask price lines with labels
 * - Current price line
 * - Position/trade markers (BUY/SELL triangles)
 * - SL/TP lines (from open positions)
 * - Logo watermark
 * 
 * @module chart-v2/overlay-layer
 */
(function(ATSChartV2) {
  'use strict';

  class OverlayLayer {
    constructor() {
      this.logoImg = null;
      this.logoLoaded = false;
    }

    /**
     * Load logo image for watermark
     */
    loadLogo(src) {
      if (this.logoImg) return;
      this.logoImg = new Image();
      this.logoImg.onload = () => { this.logoLoaded = true; };
      this.logoImg.src = src;
    }

    /**
     * Render watermark logo
     */
    renderWatermark(ctx, layout, theme) {
      if (!this.logoLoaded) return;
      const { pad, pw, main } = layout;
      const chartPh = main.height;
      const logoMaxW = pw * 0.60;
      const logoMaxH = chartPh * 0.60;
      const logoScale = Math.min(logoMaxW / this.logoImg.width, logoMaxH / this.logoImg.height);
      const logoW = this.logoImg.width * logoScale;
      const logoH = this.logoImg.height * logoScale;
      const logoX = pad.left + (pw - logoW) / 2;
      const logoY = main.top + (chartPh - logoH) / 2;
      ctx.save();
      ctx.globalAlpha = theme.watermarkAlpha;
      ctx.drawImage(this.logoImg, logoX, logoY, logoW, logoH);
      ctx.restore();
    }

    /**
     * Render Bid/Ask price lines
     * @param {number} lastBid
     * @param {number} lastAsk
     */
    renderBidAsk(ctx, layout, theme, lastBid, lastAsk) {
      if (lastBid <= 0 || lastAsk <= 0) return;
      const { pad, pw, cy } = layout;
      let yBid = cy(lastBid);
      let yAsk = cy(lastAsk);
      const minSep = 10;
      if (Math.abs(yBid - yAsk) < minSep) {
        const mid = (yBid + yAsk) / 2;
        yBid = mid + minSep / 2;
        yAsk = mid - minSep / 2;
      }
      const spreadVal = lastAsk - lastBid;

      // Spread shaded area
      ctx.fillStyle = theme.spreadFill;
      ctx.fillRect(pad.left, Math.min(yBid, yAsk), pw, Math.abs(yBid - yAsk));

      // Bid line — GREEN (sell price)
      ctx.strokeStyle = theme.bidColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(pad.left, yBid);
      ctx.lineTo(pad.left + pw, yBid);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = theme.bidColor;
      ctx.fillRect(pad.left + pw, yBid - 8, 72, 16);
      ctx.fillStyle = theme.background;
      ctx.font = 'bold 9px "JetBrains Mono"';
      ctx.textAlign = 'center';
      ctx.fillText('Bid ' + lastBid.toFixed(2), pad.left + pw + 36, yBid + 3);

      // Ask line — RED (buy price)
      ctx.strokeStyle = theme.askColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(pad.left, yAsk);
      ctx.lineTo(pad.left + pw, yAsk);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = theme.askColor;
      ctx.fillRect(pad.left + pw, yAsk - 8, 72, 16);
      ctx.fillStyle = theme.background;
      ctx.font = 'bold 9px "JetBrains Mono"';
      ctx.textAlign = 'center';
      ctx.fillText('Ask ' + lastAsk.toFixed(2), pad.left + pw + 36, yAsk + 3);

      // Spread label
      if (spreadVal > 0 && Math.abs(yBid - yAsk) > 24) {
        const midY = (yBid + yAsk) / 2;
        ctx.fillStyle = theme.spreadLabel;
        ctx.font = '8px "JetBrains Mono"';
        ctx.textAlign = 'left';
        ctx.fillText('Spread ' + spreadVal.toFixed(2), pad.left + 4, midY + 3);
      }
    }

    /**
     * Render current price line (subtle, no label)
     */
    renderCurrentPrice(ctx, layout, theme, lastPrice, vis) {
      if (lastPrice <= 0) return;
      const { pad, pw, cy, minPrice, maxPrice } = layout;
      if (lastPrice < minPrice || lastPrice > maxPrice) return;
      const priceY = cy(lastPrice);
      const isUp = vis.length >= 2 ? lastPrice >= vis[vis.length - 2].close : true;
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = isUp ? theme.currentUp : theme.currentDown;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(pad.left, priceY);
      ctx.lineTo(pad.left + pw, priceY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    /**
     * Render position/trade markers
     * @param {Array} positions - Array of position objects
     */
    renderPositionMarkers(ctx, layout, theme, positions, vis) {
      if (!positions || !positions.length) return;
      const { pad, pw, cx, cy, minPrice, maxPrice } = layout;
      for (const t of positions) {
        const tradeTime = t.time || t.open_time;
        const price = t.open_price || t.price || 0;
        if (!price || price < minPrice || price > maxPrice) continue;

        // Find candle index by time
        let candleIdx = -1;
        if (tradeTime) {
          for (let i = 0; i < vis.length; i++) {
            if (vis[i].time >= tradeTime) { candleIdx = i; break; }
          }
        }
        if (candleIdx < 0) candleIdx = vis.length - 1;

        const px = cx(candleIdx);
        const py = cy(price);
        const isBuy = (t.type || '').toLowerCase().indexOf('buy') >= 0;
        const color = isBuy ? theme.bull : theme.bear;
        const markerY = isBuy ? py - 14 : py + 14;

        // Circle background
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.arc(px, markerY, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Triangle marker
        ctx.fillStyle = color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (isBuy) {
          ctx.moveTo(px, py - 20);
          ctx.lineTo(px - 7, py - 8);
          ctx.lineTo(px + 7, py - 8);
        } else {
          ctx.moveTo(px, py + 20);
          ctx.lineTo(px - 7, py + 8);
          ctx.lineTo(px + 7, py + 8);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px "JetBrains Mono"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isBuy ? 'B' : 'S', px, isBuy ? py - 14 : py + 14);
        ctx.textBaseline = 'alphabetic';
      }
    }

    /**
     * Render SL/TP lines from open positions
     * @param {Array} positions - Position objects with sl/tp fields
     */
    renderSLTPLines(ctx, layout, theme, positions) {
      if (!positions || !positions.length) return;
      const { pad, pw, cy, minPrice, maxPrice } = layout;
      for (const t of positions) {
        const sl = t.sl || 0;
        const tp = t.tp || 0;

        if (sl > 0 && sl >= minPrice && sl <= maxPrice) {
          const y = cy(sl);
          ctx.strokeStyle = 'rgba(231,76,60,0.5)';
          ctx.lineWidth = 1;
          ctx.setLineDash([8, 4]);
          ctx.beginPath();
          ctx.moveTo(pad.left, y);
          ctx.lineTo(pad.left + pw, y);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(231,76,60,0.7)';
          ctx.font = '8px "JetBrains Mono"';
          ctx.textAlign = 'left';
          ctx.fillText('SL ' + sl.toFixed(2), pad.left + 4, y - 2);
        }

        if (tp > 0 && tp >= minPrice && tp <= maxPrice) {
          const y = cy(tp);
          ctx.strokeStyle = 'rgba(46,204,113,0.5)';
          ctx.lineWidth = 1;
          ctx.setLineDash([8, 4]);
          ctx.beginPath();
          ctx.moveTo(pad.left, y);
          ctx.lineTo(pad.left + pw, y);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(46,204,113,0.7)';
          ctx.font = '8px "JetBrains Mono"';
          ctx.textAlign = 'left';
          ctx.fillText('TP ' + tp.toFixed(2), pad.left + 4, y - 2);
        }
      }
    }

    /**
     * 渲染统一交易标记（Phase D3 / D3.1）
     * 每个标记必须能关联订单来源：MT5 / Manual / Strategy / AI，并保留策略名。
     * 默认只绘制紧凑来源标记（外环 + 方向三角），策略名/来源详情由 hover 展示，
     * 避免多个标记在图中永久堆叠文字。
     * @param {Array} marks - [{time, price, side:'buy'|'sell', source, strategyName, label}]
     */
    renderTradeMarks(ctx, layout, theme, marks) {
      if (!marks || !marks.length) return;
      const { cy, xFromTime, minPrice, maxPrice } = layout;
      const SOURCE_COLORS = {
        MT5: '#3B82F6',
        MANUAL: '#A855F7',
        STRATEGY: '#F0B90B',
        AI: '#22D3EE',
      };
      // 盈亏标签已占用的屏幕区间（避免多个持仓标签堆叠）
      const usedLabels = [];
      for (const m of marks) {
        const price = m.price;
        if (!price || price < minPrice || price > maxPrice) continue;
        const px = xFromTime ? xFromTime(m.time) : null;
        const py = cy(price);
        if (px === null || px === undefined) continue;
        const isBuy = String(m.side || '').toLowerCase().indexOf('buy') >= 0;
        const sourceKey = String(m.source || 'MT5').toUpperCase();
        const color = SOURCE_COLORS[sourceKey] || theme.accent;

        // 紧凑外环（来源色，低透明度）
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.15;
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // 方向三角（紧凑，描边提升对比度）
        ctx.fillStyle = color;
        ctx.strokeStyle = theme.background;
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (isBuy) {
          ctx.moveTo(px, py - 6);
          ctx.lineTo(px - 4, py + 5);
          ctx.lineTo(px + 4, py + 5);
        } else {
          ctx.moveTo(px, py + 6);
          ctx.lineTo(px - 4, py - 5);
          ctx.lineTo(px + 4, py - 5);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 中心小点：小尺寸下保持可读
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(px, py, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // 持仓盈亏标签（常驻小字：+$123.45 绿 / -$45.67 红，自动上下错位避免重叠）
        if (m.profit != null && isFinite(m.profit) && m.profit !== 0) {
          const pnl = Number(m.profit);
          const txt = (pnl >= 0 ? '+' : '') + '$' + pnl.toFixed(2);
          const pnlColor = pnl >= 0 ? '#33CC95' : '#F87171';
          ctx.font = '9px "JetBrains Mono"';
          const tw = ctx.measureText(txt).width;
          let ty = py - 22;
          // 与已有标签错位：同列且纵向冲突 → 下移
          for (let i = 0; i < usedLabels.length; i++) {
            const u = usedLabels[i];
            if (Math.abs(u.x - px) < 46 && ty > u.y0 - 5 && ty < u.y1 + 5) ty = u.y1 + 7;
          }
          usedLabels.push({ x: px, y0: ty - 5, y1: ty + 7 });
          // 半透明底 + 描边（不抢 K 线视觉）
          ctx.fillStyle = 'rgba(10,14,20,0.82)';
          ctx.fillRect(px - tw / 2 - 4, ty - 8, tw + 8, 14);
          ctx.strokeStyle = pnlColor;
          ctx.globalAlpha = 0.5;
          ctx.lineWidth = 0.6;
          ctx.strokeRect(px - tw / 2 - 4, ty - 8, tw + 8, 14);
          ctx.globalAlpha = 1;
          ctx.fillStyle = pnlColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(txt, px, ty);
          ctx.textAlign = 'left';
          ctx.textBaseline = 'alphabetic';
        }
      }
    }

    /**
     * 交易标记 hover 命中测试（D3.1）
     * 详情不常驻主图，仅当鼠标悬停在标记附近时返回标记信息用于 tooltip。
     * @returns {null|{mark:Object, px:number, py:number}}
     */
    hitTestTradeMarks(x, y, layout, marks) {
      if (!marks || !marks.length || !layout || !layout.cy) return null;
      const { xFromTime, cy, minPrice, maxPrice } = layout;
      let best = null;
      let bestDist = Infinity;
      for (const m of marks) {
        const price = m.price;
        if (!price || price < minPrice || price > maxPrice) continue;
        const px = xFromTime ? xFromTime(m.time) : null;
        if (px === null || px === undefined) continue;
        const py = cy(price);
        const d = Math.sqrt((x - px) * (x - px) + (y - py) * (y - py));
        if (d <= 12 && d < bestDist) {
          bestDist = d;
          best = { mark: m, px, py };
        }
      }
      return best;
    }

    /**
     * 渲染画线对象（Phase D3 Drawing Object 架构，D4 交互基础）
     * @param {Array} drawings - DrawingManager.getAll() 结果
     */
    renderDrawings(ctx, layout, theme, drawings) {
      if (!drawings || !drawings.length) return;
      const { pad, pw, cx, cy, xFromTime, main, minPrice, maxPrice } = layout;
      const mainTop = main.top;
      const mainH = main.height;
      const W = layout.W;

      for (const d of drawings) {
        const style = d.style || {};
        ctx.strokeStyle = style.color || theme.accent;
        ctx.lineWidth = style.lineWidth || 1;
        ctx.setLineDash(style.dash || []);
        ctx.fillStyle = style.color || theme.accent;
        ctx.font = '8px "JetBrains Mono"';
        ctx.textAlign = 'left';

        const pts = d.points || [];
        const p1 = pts[0];
        const p2 = pts[1];

        if (d.type === 'horizontal_line' && p1 && p1.price != null) {
          const y = cy(p1.price);
          if (y < mainTop || y > mainTop + mainH) { ctx.setLineDash([]); continue; }
          ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + pw, y); ctx.stroke();
          ctx.fillText('H ' + p1.price.toFixed(2), pad.left + 2, y - 2);

        } else if (d.type === 'vertical_line' && p1 && p1.time != null) {
          const x = xFromTime ? xFromTime(p1.time) : null;
          if (x === null || x === undefined) { ctx.setLineDash([]); continue; }
          ctx.beginPath(); ctx.moveTo(x, mainTop); ctx.lineTo(x, mainTop + mainH); ctx.stroke();

        } else if ((d.type === 'trend_line' || d.type === 'ray' || d.type === 'rect') && p1 && p2) {
          const x1 = xFromTime ? xFromTime(p1.time) : null;
          const x2 = xFromTime ? xFromTime(p2.time) : null;
          if (x1 === null || x1 === undefined || x2 === null || x2 === undefined) { ctx.setLineDash([]); continue; }
          const y1 = cy(p1.price);
          const y2 = cy(p2.price);
          if (d.type === 'trend_line') {
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          } else if (d.type === 'ray') {
            const dx = x2 - x1;
            const dy = y2 - y1;
            const ext = 4;
            ctx.beginPath(); ctx.moveTo(x1, y1);
            ctx.lineTo(x2 + dx * ext, y2 + dy * ext);
            ctx.stroke();
          } else {
            const rx = Math.min(x1, x2);
            const rw = Math.abs(x2 - x1);
            const ry = Math.min(y1, y2);
            const rh = Math.abs(y2 - y1);
            ctx.fillStyle = (style.fill || 'rgba(240,185,11,0.06)');
            ctx.fillRect(rx, ry, rw, rh);
            ctx.strokeRect(rx, ry, rw, rh);
          }

        } else if (d.type === 'fibonacci' && p1 && p2) {
          const x1 = xFromTime ? xFromTime(p1.time) : null;
          const x2 = xFromTime ? xFromTime(p2.time) : null;
          if (x1 === null || x1 === undefined || x2 === null || x2 === undefined) { ctx.setLineDash([]); continue; }
          const levels = window.ATSChartV2 && window.ATSChartV2.DrawingManager
            ? window.ATSChartV2.DrawingManager.fibonacciLevels(p1.price, p2.price)
            : [];
          for (const lv of levels) {
            const y = cy(lv.price);
            if (y < mainTop || y > mainTop + mainH) continue;
            ctx.globalAlpha = 0.55;
            ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.fillText(lv.ratio.toFixed(3) + ' ' + lv.price.toFixed(2), x2 + 4, y + 8);
          }

        } else if (d.type === 'price_label' && p1 && p1.time != null && p1.price != null) {
          const x = xFromTime ? xFromTime(p1.time) : null;
          if (x === null || x === undefined) { ctx.setLineDash([]); continue; }
          const y = cy(p1.price);
          const text = d.meta && d.meta.text ? d.meta.text : p1.price.toFixed(2);
          const textW = ctx.measureText ? ctx.measureText(text).width : 30;
          ctx.fillStyle = 'rgba(11,15,20,0.9)';
          ctx.fillRect(x + 2, y - 8, textW + 6, 12);
          ctx.fillStyle = style.color || theme.accent;
          ctx.fillText(text, x + 5, y);
        }
        ctx.setLineDash([]);
      }
    }
  }

  ATSChartV2.OverlayLayer = OverlayLayer;

  // D3.1：交易标记来源色共享映射（overlay 渲染 / crosshair hover tooltip 共用）
  ATSChartV2.TRADE_MARK_SOURCE_COLORS = {
    MT5: '#3B82F6',
    MANUAL: '#A855F7',
    STRATEGY: '#F0B90B',
    AI: '#22D3EE',
  };
})(window.ATSChartV2 = window.ATSChartV2 || {});
