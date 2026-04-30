// Pattern charts — pure HTML/CSS bar charts. No external libs.

import { h } from '../utils.js';

// Time-of-day distribution: 12 buckets of 2 hours each
export const timeOfDayChart = (migraines) => {
  const buckets = new Array(12).fill(0);
  for (const m of migraines) {
    const hr = new Date(m.startTime).getHours();
    buckets[Math.floor(hr / 2)]++;
  }
  const max = Math.max(1, ...buckets);
  const labels = ['12a', '2a', '4a', '6a', '8a', '10a', '12p', '2p', '4p', '6p', '8p', '10p'];
  return chart(buckets, labels, max);
};

// Day-of-week distribution
export const dayOfWeekChart = (migraines) => {
  const buckets = new Array(7).fill(0);
  for (const m of migraines) {
    buckets[new Date(m.startTime).getDay()]++;
  }
  const max = Math.max(1, ...buckets);
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return chart(buckets, labels, max);
};

const chart = (values, labels, max) => {
  const wrap = h('div', { className: 'bar-chart' });
  values.forEach((v, i) => {
    const heightPct = max > 0 ? (v / max) * 100 : 0;
    const bar = h('div', {
      className: 'bar',
      style: { height: `${Math.max(heightPct, 1)}%` },
    });
    if (v > 0) {
      bar.appendChild(h('span', { className: 'bar-count' }, String(v)));
    }
    bar.appendChild(h('span', { className: 'bar-label' }, labels[i]));
    wrap.appendChild(bar);
  });
  return wrap;
};
