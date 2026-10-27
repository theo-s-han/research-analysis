(() => {
  'use strict';
  const sourceOrders = new WeakMap();
  const missing = value => value == null || /^(?:\s*|[—–−-]+|n\/a|nan|null|undefined|미확인|미공개|미측정|미명시)$/i.test(String(value).trim());
  function numeric(value, kind = 'number') {
    if (missing(value)) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const text = String(value).replace(/,/g, '').replace(/^[\s$≈~]+/, '').trim();
    if (kind === 'date') {
      const date = text.match(/^(\d{4})(?:[-.](\d{1,2}))?(?:[-.](\d{1,2}))?$/);
      return date ? Number(date[1]) * 10000 + Number(date[2] || 0) * 100 + Number(date[3] || 0) : null;
    }
    const match = text.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)\s*([a-z가-힣%]*)/i);
    if (!match) return null;
    const number = Number(match[1]), unit = match[2].toLowerCase();
    const factor = kind === 'time' ? ({h:60, hr:60, hours:60, 시간:60, s:1/60, sec:1/60, 초:1/60}[unit] || 1)
      : kind === 'memory' ? ({tb:1000, gb:1, mb:.001, kb:.000001}[unit] || 1)
      : ({k:1e3, m:1e6, b:1e9, t:1e12}[unit] || 1);
    return Number.isFinite(number * factor) ? number * factor : null;
  }
  function compare(a, b, ascending = true, kind = 'number') {
    const first = kind === 'text' ? (missing(a) ? null : String(a)) : numeric(a, kind);
    const second = kind === 'text' ? (missing(b) ? null : String(b)) : numeric(b, kind);
    // Unknown values stay last in either direction. Zero remains a real value.
    if (first === null) return second === null ? 0 : 1;
    if (second === null) return -1;
    const order = kind === 'text' ? first.localeCompare(second, 'ko', {numeric:true, sensitivity:'base'}) : first - second;
    return order * (ascending ? 1 : -1);
  }
  function sort(table, index, ascending, valueFor, kind = 'number') {
    const rows = [...table.tBodies[0].rows];
    let sourceOrder = sourceOrders.get(table);
    if (!sourceOrder) { sourceOrder = new Map(); sourceOrders.set(table, sourceOrder); }
    rows.forEach(row => { if (!sourceOrder.has(row)) sourceOrder.set(row, sourceOrder.size); });
    const ordered = rows.sort((a,b) => compare(valueFor(a,index), valueFor(b,index), ascending, kind) || sourceOrder.get(a) - sourceOrder.get(b));
    ordered.forEach(row => table.tBodies[0].append(row));
    [...table.tHead.rows[0].cells].forEach((header,column) => {
      if (column === index) header.setAttribute('aria-sort', ascending ? 'ascending' : 'descending');
      else header.removeAttribute('aria-sort');
    });
    return ordered;
  }
  window.LLMTableSort = {numeric, compare, sort};
})();
