// Utilities — dates, formatting, IDs, DOM helpers.

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const todayKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const daysBetween = (a, b) => {
  const da = new Date(a); da.setHours(0, 0, 0, 0);
  const db = new Date(b); db.setHours(0, 0, 0, 0);
  return Math.round((db - da) / (1000 * 60 * 60 * 24));
};

export const fmtDate = (d) =>
  new Date(d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

export const fmtFullDate = (d) =>
  new Date(d).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

export const fmtTime = (d) =>
  new Date(d).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

export const fmtDateTime = (d) => `${fmtDate(d)}, ${fmtTime(d)}`;

export const fmtDuration = (start, end) => {
  if (!end) return 'ongoing';
  const mins = Math.round((new Date(end) - new Date(start)) / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

export const fmtElapsed = (start) => {
  const mins = Math.round((Date.now() - new Date(start)) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

export const fmtMinutes = (mins) => {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

// Convert a date object to a value usable in <input type="datetime-local">
export const toDatetimeLocal = (date) => {
  const d = new Date(date);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
};

export const haptic = (ms = 10) => {
  try { navigator.vibrate?.(ms); } catch (e) {}
};

export const severityClass = (n) => {
  if (n <= 3) return 's-low';
  if (n <= 6) return 's-med';
  if (n <= 8) return 's-high';
  return 's-vhigh';
};

// Tiny DOM helpers — keeps view code readable without a framework
export const h = (tag, props = {}, ...children) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'className') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === 'innerHTML') {
      el.innerHTML = v;
    } else if (k === 'dataset' && typeof v === 'object') {
      for (const [dk, dv] of Object.entries(v)) el.dataset[dk] = dv;
    } else {
      el.setAttribute(k, v);
    }
  }
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    if (typeof child === 'string' || typeof child === 'number') {
      el.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof Node) {
      el.appendChild(child);
    }
  }
  return el;
};

export const icon = (path, size = 18, extraClass = '') => {
  const wrap = document.createElement('span');
  wrap.className = `icon ${extraClass}`.trim();
  wrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  wrap.style.display = 'inline-flex';
  return wrap;
};

export const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); };

// Sparkline SVG generator for severity progression
export const sparkline = (values, w = 200, h = 32) => {
  if (!values || values.length === 0) return '';
  if (values.length === 1) values = [values[0], values[0]];
  const min = 0, max = 10;
  const stepX = w / (values.length - 1);
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = h - ((v - min) / (max - min)) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `<svg class="sparkline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline fill="none" stroke="rgb(251 191 36 / 0.8)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" points="${points}"/></svg>`;
};
