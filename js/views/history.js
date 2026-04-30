// History view: tabs for migraines, daily meds (tappable grid), schedule.

import {
  h, icon, todayKey, fmtDate, fmtDuration, daysBetween, sparkline,
} from '../utils.js';
import { ICONS } from '../constants.js';
import { confirmDialog } from '../components/ui.js';
import { compute30DayStats } from './today.js';
import { timeOfDayChart, dayOfWeekChart } from './charts.js';

export const historyView = (state, dispatch, openMigraine) => {
  const wrap = h('div', { className: 'stack' });

  // Header
  const header = h('div');
  header.appendChild(h('p', { className: 'eyebrow' }, 'History'));
  header.appendChild(h('h1', { className: 'display' }, 'Patterns over time'));
  wrap.appendChild(header);

  // Stats strip (also on history per item 15)
  const stats = compute30DayStats(state);
  const strip = h('div', { className: 'stats-strip' });
  strip.appendChild(simpleStat(stats.migraines, 'migraines\n(30 days)'));
  strip.appendChild(simpleStat(stats.headaches, 'headaches\n(30 days)'));
  strip.appendChild(simpleStat(`${stats.adherencePct}%`, 'adherence\n(30 days)'));
  wrap.appendChild(strip);

  // MOH warning
  if (stats.rescueDays >= 8) {
    const warn = h('div', {
      className: `warn-box ${stats.rescueDays >= 10 ? 'danger' : ''}`,
    });
    warn.appendChild(icon(ICONS.alert, 20, 'icon'));
    const txt = h('div');
    txt.appendChild(h('p', {
      style: { color: 'var(--text-1)', fontSize: '13px', fontWeight: '500', margin: 0 },
    }, `Rescue meds used on ${stats.rescueDays} days this month`));
    txt.appendChild(h('p', {
      style: { color: 'var(--text-4)', fontSize: '12px', marginTop: '4px' },
    }, `Using rescue meds 10+ days/month can cause medication overuse headache (MOH). Worth mentioning to your doctor if you're consistently here.`));
    warn.appendChild(txt);
    wrap.appendChild(warn);
  }

  // Subtabs
  const tabs = h('div', { className: 'subtabs' });
  const content = h('div');

  const tabConfig = [
    { id: 'migraines', label: 'Migraines', render: () => migrainesTab(state, dispatch, openMigraine) },
    { id: 'patterns', label: 'Patterns', render: () => patternsTab(state) },
    { id: 'meds', label: 'Daily meds', render: () => dailyMedTab(state, dispatch) },
    { id: 'schedule', label: 'Schedule', render: () => scheduleTab(state, dispatch) },
  ];

  let activeTab = 'migraines';
  const renderTab = () => {
    while (content.firstChild) content.removeChild(content.firstChild);
    const cfg = tabConfig.find((t) => t.id === activeTab);
    content.appendChild(cfg.render());
    [...tabs.children].forEach((c, i) => {
      c.classList.toggle('active', tabConfig[i].id === activeTab);
    });
  };

  tabConfig.forEach((cfg) => {
    const btn = h('button', { className: 'subtab' }, cfg.label);
    btn.addEventListener('click', () => { activeTab = cfg.id; renderTab(); });
    tabs.appendChild(btn);
  });

  wrap.appendChild(tabs);
  wrap.appendChild(content);
  renderTab();

  return wrap;
};

const simpleStat = (value, label) => {
  const cell = h('div', { className: 'stat' });
  cell.appendChild(h('span', { className: 'num' }, String(value)));
  const lblEl = h('div', { className: 'lbl' });
  label.split('\n').forEach((line, i) => {
    if (i > 0) lblEl.appendChild(h('br'));
    lblEl.appendChild(document.createTextNode(line));
  });
  cell.appendChild(lblEl);
  return cell;
};

const migrainesTab = (state, dispatch, openMigraine) => {
  const wrap = h('div', { className: 'stack', style: { '--stack-gap': '12px' } });
  const sorted = [...state.migraines].sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

  if (sorted.length === 0) {
    wrap.appendChild(h('p', { className: 'empty' }, 'No migraines logged yet.'));
    return wrap;
  }

  // Show prodrome hit-rate stat
  const pData = prodromeHitRate(state);
  if (pData.total > 0) {
    const hr = h('div', { className: 'card card-tight' });
    hr.appendChild(h('p', {
      style: { color: 'var(--text-3)', fontSize: '12px', textAlign: 'center', margin: 0 },
    }, `Prodromes: ${pData.hits} of ${pData.total} (${pData.pct}%) preceded a migraine within 48 hours`));
    wrap.appendChild(hr);
  }

  sorted.forEach((m) => {
    const item = h('button', { className: 'history-item' });
    const left = h('div', { style: { flex: 1, minWidth: 0 } });

    const meta = h('div', { className: 'meta' });
    meta.appendChild(h('span', { className: `tag tag-${m.type || 'migraine'}` }, m.type || 'migraine'));
    meta.appendChild(h('span', { style: { color: 'var(--text-3)', fontSize: '13px' } }, fmtDate(m.startTime)));
    if (!m.endTime) meta.appendChild(h('span', { className: 'tag tag-active' }, 'active'));
    left.appendChild(meta);

    const peak = m.severityLog?.length ? Math.max(...m.severityLog.map((s) => s.value)) : '—';
    left.appendChild(h('p', { className: 'summary' },
      `Peak severity ${peak}`,
      h('span', { style: { color: 'var(--text-4)' } }, ` · ${fmtDuration(m.startTime, m.endTime)}`)
    ));

    // Inline sparkline (item 16) for past migraines with multiple severity points
    if (m.endTime && m.severityLog?.length > 1) {
      const sparkDiv = h('div', { style: { width: '100%', maxWidth: '160px', marginTop: '6px' } });
      sparkDiv.innerHTML = sparkline(m.severityLog.map((s) => s.value), 160, 24);
      left.appendChild(sparkDiv);
    }

    if (m.triggers?.length > 0) {
      const trigs = m.triggers.slice(0, 3).join(', ') + (m.triggers.length > 3 ? ` +${m.triggers.length - 3}` : '');
      left.appendChild(h('p', { className: 'triggers' }, `Triggers: ${trigs}`));
    }

    item.appendChild(left);
    item.appendChild(icon(ICONS.chevright, 20));
    item.addEventListener('click', () => openMigraine(m));
    wrap.appendChild(item);
  });

  return wrap;
};

const prodromeHitRate = (state) => {
  if (!state.prodromes.length) return { total: 0, hits: 0, pct: 0 };
  let hits = 0;
  for (const p of state.prodromes) {
    const linked = state.migraines.find((m) => m.linkedProdromeId === p.id);
    if (linked) hits++;
  }
  return { total: state.prodromes.length, hits, pct: Math.round((hits / state.prodromes.length) * 100) };
};

const patternsTab = (state) => {
  const wrap = h('div', { className: 'stack', style: { '--stack-gap': '20px' } });

  if (state.migraines.length < 3) {
    wrap.appendChild(h('p', { className: 'empty' },
      `Log at least 3 migraines to see patterns. (${state.migraines.length} so far)`
    ));
    return wrap;
  }

  // Time of day
  const todCard = h('div', { className: 'card' });
  todCard.appendChild(h('h3', { className: 'display' }, 'Time of day'));
  todCard.appendChild(h('p', { className: 'section-sub' }, 'When migraines tend to start'));
  todCard.appendChild(h('div', { style: { marginTop: '20px' } }, timeOfDayChart(state.migraines)));
  wrap.appendChild(todCard);

  // Day of week
  const dowCard = h('div', { className: 'card' });
  dowCard.appendChild(h('h3', { className: 'display' }, 'Day of week'));
  dowCard.appendChild(h('p', { className: 'section-sub' }, 'Which days have the most migraines'));
  dowCard.appendChild(h('div', { style: { marginTop: '20px' } }, dayOfWeekChart(state.migraines)));
  wrap.appendChild(dowCard);

  // Top triggers
  const trigCounts = {};
  state.migraines.forEach((m) => {
    (m.triggers || []).forEach((t) => { trigCounts[t] = (trigCounts[t] || 0) + 1; });
  });
  const topTriggers = Object.entries(trigCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (topTriggers.length) {
    const trigCard = h('div', { className: 'card' });
    trigCard.appendChild(h('h3', { className: 'display' }, 'Most common triggers'));
    const trigList = h('div', { style: { marginTop: '12px' } });
    topTriggers.forEach(([name, count]) => {
      const row = h('div', {
        style: { display: 'flex', justifyContent: 'space-between', padding: '6px 0' },
      });
      row.appendChild(h('span', { style: { color: 'var(--text-2)' } }, name));
      row.appendChild(h('span', { style: { color: 'var(--text-4)' } }, `${count}×`));
      trigList.appendChild(row);
    });
    trigCard.appendChild(trigList);
    wrap.appendChild(trigCard);
  }

  // Top "what helped"
  const helpCounts = {};
  state.migraines.forEach((m) => {
    (m.whatHelped || []).forEach((w) => { helpCounts[w] = (helpCounts[w] || 0) + 1; });
  });
  const topHelp = Object.entries(helpCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (topHelp.length) {
    const helpCard = h('div', { className: 'card' });
    helpCard.appendChild(h('h3', { className: 'display' }, 'What helps you most'));
    const helpList = h('div', { style: { marginTop: '12px' } });
    topHelp.forEach(([name, count]) => {
      const row = h('div', {
        style: { display: 'flex', justifyContent: 'space-between', padding: '6px 0' },
      });
      row.appendChild(h('span', { style: { color: 'var(--text-2)' } }, name));
      row.appendChild(h('span', { style: { color: 'var(--text-4)' } }, `${count}×`));
      helpList.appendChild(row);
    });
    helpCard.appendChild(helpList);
    wrap.appendChild(helpCard);
  }

  return wrap;
};

const dailyMedTab = (state, dispatch) => {
  const card = h('div', { className: 'card' });
  card.appendChild(h('p', {
    style: { color: 'var(--text-1)', fontWeight: '500', margin: 0 },
  }, 'Last 14 days'));
  card.appendChild(h('p', {
    style: { color: 'var(--text-4)', fontSize: '12px', marginTop: '4px', marginBottom: '16px' },
  }, 'Tap any square to toggle a past day'));

  // Build days
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d);
  }

  state.dailyMeds.forEach((med) => {
    const block = h('div', { style: { marginBottom: '16px' } });
    block.appendChild(h('p', {
      style: { color: 'var(--text-2)', fontSize: '13px', marginBottom: '6px' },
    }, med.name));
    const grid = h('div', { className: 'grid-14' });
    days.forEach((d) => {
      const k = todayKey(d);
      const taken = state.dailyMedLog[k]?.[med.id]?.taken;
      const isToday = k === todayKey();
      const cell = h('button', {
        className: `day-cell ${taken ? 'taken' : ''} ${isToday ? 'today' : ''}`,
        title: `${fmtDate(d)} ${taken ? '✓' : '—'}`,
      });
      cell.addEventListener('click', () => {
        confirmDialog({
          title: taken ? 'Unmark this day?' : 'Mark as taken?',
          message: `${med.name} on ${fmtDate(d)}`,
          onConfirm: () => {
            dispatch({ type: 'TOGGLE_DAILY_MED', medId: med.id, dateKey: k });
          },
        });
      });
      grid.appendChild(cell);
    });
    block.appendChild(grid);
    card.appendChild(block);
  });

  return card;
};

const scheduleTab = (state, dispatch) => {
  const wrap = h('div', { className: 'stack', style: { '--stack-gap': '12px' } });
  state.intervalMeds.forEach((med) => {
    const card = h('div', { className: 'card' });
    card.appendChild(h('p', {
      style: { color: 'var(--text-1)', fontWeight: '500', marginBottom: '12px' },
    }, med.name));
    const log = (state.intervalMedLog[med.id] || []).slice().reverse();
    if (log.length === 0) {
      card.appendChild(h('p', { className: 'empty', style: { padding: '8px' } }, 'No doses logged yet.'));
    } else {
      log.forEach((t) => {
        const row = h('div', {
          style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' },
        });
        row.appendChild(h('span', { style: { color: 'var(--text-2)', fontSize: '13px' } }, fmtDate(t)));
        const delBtn = h('button', {
          style: { color: 'var(--text-4)', padding: '4px' },
        });
        delBtn.appendChild(icon(ICONS.trash, 14));
        delBtn.addEventListener('click', () => {
          confirmDialog({
            title: 'Remove this dose?',
            message: fmtDate(t),
            confirmLabel: 'Remove',
            danger: true,
            onConfirm: () => dispatch({ type: 'REMOVE_INTERVAL_MED_LOG', medId: med.id, time: t }),
          });
        });
        row.appendChild(delBtn);
        card.appendChild(row);
      });
    }
    wrap.appendChild(card);
  });
  if (state.intervalMeds.length === 0) {
    wrap.appendChild(h('p', { className: 'empty' }, 'No scheduled meds yet.'));
  }
  return wrap;
};
