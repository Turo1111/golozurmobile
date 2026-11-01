// Original static WebView source. Hermes need not retain function source, and
// React Native never evaluates this program. Layout tests execute this same text.
export const RECEIPT_LAYOUT_SOURCE = String.raw`function receiptLayoutEngine() {
  var width = 384;
  var margin = 10;
  var available = width - 2 * margin;
  var maxHeight = 3072;

  function wrap(value, measure, fullWidth, firstWidth) {
    var text = String(value).replace(/[\x00-\x08\x0b-\x1f\x7f]/g, ' ');
    if (text.length > 2000 || !(fullWidth > 0)) throw new Error('Text exceeds receipt bounds');
    var lines = [];
    var line = '';
    var limit = typeof firstWidth === 'number' ? firstWidth : fullWidth;
    var paragraphs = text.split('\n');
    function emit() { lines.push(line); line = ''; limit = fullWidth; }
    for (var p = 0; p < paragraphs.length; p += 1) {
      var words = paragraphs[p].trim().split(/\s+/);
      for (var w = 0; w < words.length; w += 1) {
        var word = words[w];
        if (!word) continue;
        if (line && measure(line + ' ' + word) <= limit) { line += ' ' + word; continue; }
        if (line) emit();
        // Iterate code points so long unbroken descriptions keep surrogate pairs.
        for (var c = 0; c < word.length; c += 1) {
          var character = word.charAt(c);
          var code = word.charCodeAt(c);
          if (code >= 0xd800 && code <= 0xdbff && c + 1 < word.length) character += word.charAt(++c);
          if (measure(line + character) > limit) {
            if (line) emit();
            else if (limit !== fullWidth) emit();
            if (measure(character) > limit) throw new Error('Character exceeds receipt width');
          }
          line += character;
        }
      }
      emit();
    }
    return lines;
  }

  function layout(model, measureText) {
    var spans = [];
    var rules = [];
    var y = margin;
    function style(font, multiplier, bold) {
      return { size: Math.max(12, Math.round(model.size * (font === 'B' ? 0.8 : 1))), x: 1, y: multiplier, bold: !!bold };
    }
    function measure(text, s) { return measureText(text, s.size, s.bold) * s.x; }
    function advance(s) {
      y += Math.ceil(s.size * 1.35 * s.y);
      if (y > maxHeight - margin) throw new Error('Receipt exceeds height limit');
    }
    function put(text, x, s) { spans.push({ text: text, left: x, top: y, size: s.size, x: s.x, y: s.y, bold: s.bold }); }
    function paragraph(text, s, centered) {
      var lines = wrap(text, function (line) { return measure(line, s); }, available);
      lines.forEach(function (line) {
        put(line, centered ? margin + (available - measure(line, s)) / 2 : margin, s);
        advance(s);
      });
    }
    function pair(left, right, s) {
      // Money must remain complete. Reduce just this row if an extreme total
      // cannot fit at the configured scale; never truncate or print overlapping columns.
      var fitted = { size: s.size, x: s.x, y: s.y, bold: s.bold };
      while (measure(right, fitted) > available && fitted.size > 12) fitted.size -= 1;
      if (measure(right, fitted) > available) fitted.x = 1;
      if (measure(right, fitted) > available) throw new Error('Amount exceeds receipt width');
      var rightWidth = measure(right, fitted);
      var leftWidth = available - rightWidth - 10;
      if (leftWidth < fitted.size * 3) {
        paragraph(left, fitted, false);
        put(right, width - margin - rightWidth, fitted);
        advance(fitted);
        return;
      }
      var lines = wrap(left, function (line) { return measure(line, fitted); }, available, leftWidth);
      lines.forEach(function (line, index) {
        put(line, margin, fitted);
        if (index === 0) put(right, width - margin - rightWidth, fitted);
        advance(fitted);
      });
    }
    function rule() { rules.push(y + 4); y += 12; }
    var titleStyle = style('A', model.titleY, true);
    titleStyle.x = model.titleX;
    paragraph(model.title, titleStyle, true);
    var header = style(model.headerFont, model.headerY, false);
    paragraph(model.date, header, false);
    paragraph(model.customer, header, false);
    // Disclaimer sits above the dashed rule at the operator's request.
    paragraph(model.footer, style(model.footerFont, model.footerY, false), true);
    rule();
    var body = style(model.bodyFont, model.bodyY, model.bodyBold);
    pair('UNIDADES PRODUCTO', 'TOTAL', body);
    model.items.forEach(function (item, index) {
      pair(item.description, item.amount, body);
      if (index < model.items.length - 1) y += model.spacing;
    });
    rule();
    if (model.subtotal) {
      pair('Items subtotal', model.subtotal, header);
      pair('Adjustment', model.adjustment, header);
    }
    var totalStyle = style('A', model.totalY, true);
    totalStyle.x = model.totalX;
    pair('TOTAL', model.total, totalStyle);
    y += model.feed * Math.ceil(model.size * 1.35) + margin;
    if (y > maxHeight) throw new Error('Receipt exceeds height limit');
    return { width: width, height: Math.ceil(y), spans: spans, rules: rules };
  }
  return { wrap: wrap, layout: layout };
}`;

export const RASTER_RENDERER_SCRIPT = '(function () {\n' + RECEIPT_LAYOUT_SOURCE + String.raw`
  var engine = receiptLayoutEngine();
  var canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  function font(context, size, bold) { context.font = (bold ? 'bold ' : '') + size + 'px sans-serif'; }
  window.__clearReceipt = function () { canvas.width = 1; canvas.height = 1; };
  window.__renderReceipt = function (request) {
    try {
      var context = canvas.getContext('2d');
      var result = engine.layout(request.model, function (text, size, bold) {
        font(context, size, bold);
        return context.measureText(text).width;
      });
      canvas.width = result.width;
      canvas.height = result.height;
      context = canvas.getContext('2d');
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#000';
      context.textBaseline = 'top';
      result.spans.forEach(function (span) {
        context.save();
        context.translate(span.left, span.top);
        context.scale(span.x, span.y);
        font(context, span.size, span.bold);
        context.fillText(span.text, 0, 0);
        context.restore();
      });
      result.rules.forEach(function (top) { context.fillRect(10, top, 364, 1); });
      var pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      var packed = new Uint8Array(result.height * 48);
      for (var pixel = 0; pixel < result.width * result.height; pixel += 1) {
        var offset = pixel * 4;
        if (pixels[offset] * 0.2126 + pixels[offset + 1] * 0.7152 + pixels[offset + 2] * 0.0722 < 160) {
          packed[pixel >> 3] |= 1 << (pixel & 7);
        }
      }
      var binary = [];
      for (var i = 0; i < packed.length; i += 4096) {
        binary.push(String.fromCharCode.apply(null, packed.subarray(i, i + 4096)));
      }
      var message = { type: 'raster', id: request.id, width: result.width, height: result.height, base64: btoa(binary.join('')) };
      window.__clearReceipt();
      window.ReactNativeWebView.postMessage(JSON.stringify(message));
    } catch (error) {
      window.__clearReceipt();
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', id: request.id }));
    }
  };
  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
})();`;
