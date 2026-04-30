// Today view: stats, active migraine banner, quick actions,
// daily meds, interval meds, daily check-in.

import {
  h, icon, todayKey, fmtFullDate, fmtDate, fmtTime, fmtElapsed, daysBetween, uid,
} from '../utils.js';
import { ICONS } from '../constants.js';
import { confirmDialog, openModal, attachLongPress } from '../components/ui.js';
import { dailyCheckIn } from './check-in.js';
import { migraineEditor } from './migraine-editor.js';
import { prodromeForm } from './prodrome.js';

export const todayView = (state, dispatch, openMigraine, openProdrome) => {
  const wrap = h('div', { className: 'stack' });
  const dateKey = todayKey();
  const today = new Date();
  const todayLog = state.dailyMedLog[dateKey] || {};
  const activeMigraine = state.migraines.find((m) => !m.endTime);

  // Header
  const header = h('div');
  header.appendChild(h('p', { className: 'eyebrow' }, 'Today'));
  header.appendChild(h('h1', { className: 'display' }, fmtFullDate(today)));
  wrap.appendChild(header);

  // 30-day stats
  const stats = compute30DayStats(state);
  if (stats.migraines > 0 || stats.adherentDays > 0 || stats.headaches > 0) {
    const strip = h('div', { className: 'stats-strip' });
    strip.appendChild(statCell(stats.migraines, 'migraines\n(30 days)'));
    strip.appendChild(statCell(stats.headaches, 'headaches\n(30 days)'));
    strip.appendChild(statCell(
      stats.rescueDays,
      'rescue\ndays',
      stats.rescueDays >= 10 ? 'danger' : stats.rescueDays >= 8 ? 'warn' : null
    ));
    wrap.appendChild(strip);
  }

  // Active migraine banner
  if (activeMigraine) {
    const banner = h('button', { className: 'active-banner' });
    const left = h('div');
    left.appendChild(h('p', { className: 'label' }, 'Migraine in progress'));
    const cur = activeMigraine.severityLog?.slice(-1)[0]?.value;
    left.appendChild(h('p', { className: 'main' },
      `Started ${fmtTime(activeMigraine.startTime)} · ${fmtElapsed(activeMigraine.startTime)} ago`
    ));
    left.appendChild(h('p', { className: 'sub' }, `Severity ${cur || '—'}`));
    banner.appendChild(left);
    banner.appendChild(icon(ICONS.chevright, 22));
    banner.addEventListener('click', () => openMigraine(activeMigraine));
    wrap.appendChild(banner);

    // Auto-end nudge: if active for >72h, suggest ending
    const hoursActive = (Date.now() - new Date(activeMigraine.startTime)) / (1000 * 60 * 60);
    if (hoursActive > 72) {
      const nudge = h('div', { className: 'warn-box' });
      nudge.appendChild(icon(ICONS.alert, 18, 'icon'));
      const nudgeText = h('div', {});
      nudgeText.appendChild(h('p', {
        style: { color: 'var(--text-1)', fontSize: '13px', fontWeight: '500', margin: 0 },
      }, "This migraine has been active for 3+ days"));
      nudgeText.appendChild(h('p', {
        style: { color: 'var(--text-4)', fontSize: '12px', marginTop: '4px' },
      }, "Did you forget to end it? Tap the banner above to update."));
      nudge.appendChild(nudgeText);
      wrap.appendChild(nudge);
    }
  } else {
    // Quick action buttons (only when no active migraine)
    const actions = h('div', { className: 'quick-actions' });

    const prodromeBtn = h('button', { className: 'quick-action' });
    const pIcon = icon(ICONS.brain, 22);
    pIcon.style.color = 'var(--amber-text)';
    prodromeBtn.appendChild(pIcon);
    prodromeBtn.appendChild(h('span', { className: 'title' }, 'Prodrome warning'));
    prodromeBtn.appendChild(h('span', { className: 'desc' }, 'I think one is coming'));
    prodromeBtn.addEventListener('click', () => openProdrome());
    actions.appendChild(prodromeBtn);

    const migBtn = h('button', { className: 'quick-action danger' });
    const mIcon = icon(ICONS.zap, 22);
    mIcon.style.color = 'var(--red-text)';
    migBtn.appendChild(mIcon);
    migBtn.appendChild(h('span', { className: 'title' }, 'Migraine starting'));
    migBtn.appendChild(h('span', { className: 'desc' }, 'Quick log or full detail'));
    migBtn.addEventListener('click', () => openMigraine('new', { quickStart: true }));
    actions.appendChild(migBtn);

    wrap.appendChild(actions);

    // Secondary: log past or full new
    const secondaryRow = h('div', {
      style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' },
    });
    const fullNewBtn = h('button', { className: 'btn btn-secondary' }, 'Full new entry');
    fullNewBtn.style.padding = '10px';
    fullNewBtn.addEventListener('click', () => openMigraine('new', { quickStart: false }));
    secondaryRow.appendChild(fullNewBtn);
    const pastBtn = h('button', { className: 'btn btn-secondary' }, 'Log past migraine');
    pastBtn.style.padding = '10px';
    pastBtn.addEventListener('click', () => openMigraine('new', { quickStart: false }));
    secondaryRow.appendChild(pastBtn);
    wrap.appendChild(secondaryRow);
  }

  // Daily meds section
  const dailySection = h('div');
  const dailyHeader = h('div', { style: { marginBottom: '12px' } });
  dailyHeader.appendChild(h('h2', { className: 'display' }, 'Daily meds'));
  dailyHeader.appendChild(h('p', { className: 'section-sub' }, 'Tap to mark taken · long-press to edit time'));
  dailySection.appendChild(dailyHeader);

  const medGrid = h('div', { className: 'med-grid' });
  state.dailyMeds.forEach((med) => {
    medGrid.appendChild(dailyMedCard(med, todayLog, dateKey, state, dispatch));
  });
  dailySection.appendChild(medGrid);
  wrap.appendChild(dailySection);

  // Interval meds
  if (state.intervalMeds.length > 0) {
    const intervalSection = h('div');
    const intervalHeader = h('div', { style: { marginBottom: '12px' } });
    intervalHeader.appendChild(h('h2', { className: 'display' }, 'On a schedule'));
    intervalSection.appendChild(intervalHeader);

    const intervalStack = h('div', { className: 'stack', style: { '--stack-gap': '12px' } });
    state.intervalMeds.forEach((med) => {
      intervalStack.appendChild(intervalMedCard(med, state, dispatch));
    });
    intervalSection.appendChild(intervalStack);
    wrap.appendChild(intervalSection);
  }

  // Daily check-in
  wrap.appendChild(dailyCheckIn(state, dispatch));

  return wrap;
};

const statCell = (value, label, variant) => {
  const cell = h('div', { className: 'stat' });
  const num = h('span', { className: `num ${variant || ''}` }, String(value));
  cell.appendChild(num);
  // Label may have \n for two-line display
  const lblEl = h('div', { className: 'lbl' });
  label.split('\n').forEach((line, i) => {
    if (i > 0) lblEl.appendChild(h('br'));
    lblEl.appendChild(document.createTextNode(line));
  });
  cell.appendChild(lblEl);
  return cell;
};

const dailyMedCard = (med, todayLog, dateKey, state, dispatch) => {
  const taken = todayLog[med.id]?.taken;
  const time = todayLog[med.id]?.time;

  const card = h('button', {
    className: `med-card ${taken ? 'taken' : ''}`,
  });
  const head = h('div', { className: 'head' });
  const pillIcon = icon(ICONS.pill, 18);
  pillIcon.style.color = taken ? 'var(--emerald)' : 'var(--text-4)';
  head.appendChild(pillIcon);
  if (taken) {
    const checkIcon = icon(ICONS.check, 18);
    checkIcon.style.color = 'var(--emerald)';
    head.appendChild(checkIcon);
  }
  card.appendChild(head);
  card.appendChild(h('p', { className: 'name' }, med.name));
  card.appendChild(h('p', { className: 'when' }, taken ? `Taken ${fmtTime(time)}` : 'Not taken'));

  if (taken) {
    const streak = calcStreak(state, med.id);
    if (streak > 1) {
      const sEl = h('div', { className: 'streak' });
      sEl.appendChild(icon(ICONS.flame, 12));
      sEl.appendChild(h('span', {}, `${streak} day streak`));
      card.appendChild(sEl);
    }
  }

  attachLongPress(card,
    () => openEditTime(med, todayLog, dateKey, dispatch),
    () => dispatch({ type: 'TOGGLE_DAILY_MED', medId: med.id, dateKey })
  );

  return card;
};

const calcStreak = (state, medId) => {
  let streak = 0;
  for (let i = 0; i < 90; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = todayKey(d);
    if (state.dailyMedLog[k]?.[medId]?.taken) streak++;
    else if (i === 0) continue;
    else break;
  }
  return streak;
};

const openEditTime = (med, todayLog, dateKey, dispatch) => {
  openModal({
    title: `Edit time: ${med.name}`,
    content: (body, close) => {
      const init = todayLog[med.id]?.time ? new Date(todayLog[med.id].time) : new Date();
      const timeStr = `${String(init.getHours()).padStart(2, '0')}:${String(init.getMinutes()).padStart(2, '0')}`;
      body.appendChild(h('p', {
        style: { color: 'var(--text-3)', fontSize: '13px', marginBottom: '12px' },
      }, `When did you actually take ${med.name}?`));
      const input = h('input', { type: 'time', value: timeStr });
      body.appendChild(input);
      const save = h('button', {
        className: 'btn btn-primary',
        style: { marginTop: '20px' },
      }, 'Save');
      save.addEventListener('click', () => {
        const [hh, mm] = input.value.split(':');
        const d = new Date();
        d.setHours(parseInt(hh), parseInt(mm), 0, 0);
        const time = d.toISOString();
        if (todayLog[med.id]) {
          dispatch({ type: 'EDIT_DAILY_MED_TIME', medId: med.id, dateKey, time });
        } else {
          dispatch({ type: 'TOGGLE_DAILY_MED', medId: med.id, dateKey, time });
        }
        close();
      });
      body.appendChild(save);
    },
  });
};

const intervalMedCard = (med, state, dispatch) => {
  const log = state.intervalMedLog[med.id] || [];
  const lastTaken = log.length ? log[log.length - 1] : null;
  const today = new Date(); today.setHours(0, 0, 0, 0);

  let status = 'never';
  let dueDate = null;
  let daysUntil = null;

  if (lastTaken) {
    const last = new Date(lastTaken); last.setHours(0, 0, 0, 0);
    dueDate = new Date(last); dueDate.setDate(dueDate.getDate() + med.intervalDays);
    daysUntil = daysBetween(today, dueDate);
    if (daysUntil < 0) status = 'overdue';
    else if (daysUntil === 0) status = 'due';
    else if (daysUntil === 1) status = 'soon';
    else status = 'upcoming';
  }

  const card = h('div', { className: `interval-card ${status}` });
  const row = h('div', { className: 'row' });

  const left = h('div', { style: { flex: 1, minWidth: 0 } });
  const nameRow = h('div', { className: 'name' });
  nameRow.appendChild(icon(ICONS.clock, 16));
  nameRow.appendChild(h('span', {}, med.name));
  left.appendChild(nameRow);

  const statusEl = h('div', { className: 'status' });
  if (status === 'overdue' || status === 'due') statusEl.classList.add('urgent');
  else if (status === 'soon') statusEl.classList.add('warn');

  if (status === 'never') statusEl.textContent = 'No doses logged yet';
  else if (status === 'due') statusEl.textContent = 'Due today';
  else if (status === 'overdue') statusEl.textContent = `Overdue by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? '' : 's'}`;
  else if (status === 'soon') statusEl.textContent = `Due tomorrow · ${fmtDate(dueDate)}`;
  else statusEl.textContent = `Next dose in ${daysUntil} days · ${fmtDate(dueDate)}`;
  left.appendChild(statusEl);

  if (lastTaken) {
    left.appendChild(h('div', { className: 'last' }, `Last taken ${fmtDate(lastTaken)}`));
  }
  row.appendChild(left);

  const actions = h('div', { className: 'actions' });
  const takeBtn = h('button', { className: 'btn-take' }, 'Took it');
  takeBtn.addEventListener('click', () => {
    dispatch({ type: 'LOG_INTERVAL_MED', medId: med.id, time: new Date().toISOString() });
  });
  actions.appendChild(takeBtn);

  const pastBtn = h('button', { className: 'btn-past' }, 'Log past');
  pastBtn.addEventListener('click', () => openLogPastDose(med, dispatch));
  actions.appendChild(pastBtn);

  row.appendChild(actions);
  card.appendChild(row);

  return card;
};

const openLogPastDose = (med, dispatch) => {
  openModal({
    title: `Log past dose: ${med.name}`,
    content: (body, close) => {
      const dateInput = h('input', { type: 'date', value: todayKey() });
      const timeInput = h('input', { type: 'time', value: '09:00' });
      body.appendChild(h('p', { className: 'checkin-label' }, 'Date'));
      body.appendChild(dateInput);
      body.appendChild(h('p', { className: 'checkin-label', style: { marginTop: '12px' } }, 'Time'));
      body.appendChild(timeInput);
      const save = h('button', {
        className: 'btn btn-primary',
        style: { marginTop: '20px' },
      }, 'Save dose');
      save.addEventListener('click', () => {
        const time = new Date(`${dateInput.value}T${timeInput.value}`).toISOString();
        dispatch({ type: 'LOG_INTERVAL_MED', medId: med.id, time });
        close();
      });
      body.appendChild(save);
    },
  });
};

// 30-day stats compute
export const compute30DayStats = (state) => {
  const thirtyAgo = new Date(); thirtyAgo.setDate(thirtyAgo.getDate() - 30);
  const recentMigraines = state.migraines.filter((m) =>
    new Date(m.startTime) >= thirtyAgo && (m.type === 'migraine' || !m.type)
  );
  const recentHeadaches = state.migraines.filter((m) =>
    new Date(m.startTime) >= thirtyAgo && m.type === 'headache'
  );
  const rescueDays = new Set();
  state.migraines.forEach((m) => {
    (m.rescueMeds || []).forEach((r) => {
      if (new Date(r.time) >= thirtyAgo) rescueDays.add(todayKey(new Date(r.time)));
    });
  });
  (state.rescueLogs || []).forEach((r) => {
    if (new Date(r.time) >= thirtyAgo) rescueDays.add(todayKey(new Date(r.time)));
  });
  let adherentDays = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = todayKey(d);
    const log = state.dailyMedLog[k];
    if (log && state.dailyMeds.length > 0 && state.dailyMeds.every((m) => log[m.id]?.taken)) {
      adherentDays++;
    }
  }
  const adherencePct = Math.round((adherentDays / 30) * 100);
  return {
    migraines: recentMigraines.length,
    headaches: recentHeadaches.length,
    rescueDays: rescueDays.size,
    adherentDays,
    adherencePct,
  };
};
