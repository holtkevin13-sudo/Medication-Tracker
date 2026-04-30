// Daily check-in: sleep, water, sunlight, stress, caffeine, notes.
// Smart expand: only auto-expanded before 10 AM on first open of the day.

import { h, icon, todayKey } from '../utils.js';
import { ICONS } from '../constants.js';
import { chip } from '../components/ui.js';

// Module-level: remembers whether the user has manually opened/closed
// the check-in this session, so chip selections don't collapse it.
// null = use smart default; true/false = user's explicit choice.
let userExpandedState = null;

export const dailyCheckIn = (state, dispatch) => {
  const dateKey = todayKey();
  const checkIn = state.dailyCheckIns[dateKey] || {};
  const isMorning = new Date().getHours() < 10;
  const wantExpanded = !checkIn.completed && !checkIn.skipped && isMorning;

  const wrap = h('div', { className: 'card' });

  // Header (always visible)
  const titleWrap = h('div', { style: { textAlign: 'left' } });
  titleWrap.appendChild(h('h3', { className: 'display' }, 'Daily check-in'));
  const subText = checkIn.completed ? 'Completed today'
    : checkIn.skipped ? 'Skipped today'
    : '5 seconds — helps spot patterns';
  titleWrap.appendChild(h('p', { style: { color: 'var(--text-4)', fontSize: '12px', marginTop: '2px' } }, subText));

  const chev = icon(ICONS.chevright, 18, 'chev');
  const header = h('button', { className: 'expand-toggle' }, titleWrap, chev);

  let expanded = userExpandedState !== null ? userExpandedState : wantExpanded;
  const body = h('div');
  body.style.display = expanded ? 'block' : 'none';
  body.style.marginTop = '16px';
  body.style.paddingTop = '16px';
  body.style.borderTop = '1px solid var(--border)';
  if (expanded) wrap.classList.add('expanded');

  header.addEventListener('click', () => {
    expanded = !expanded;
    userExpandedState = expanded; // remember the user's intent across re-renders
    body.style.display = expanded ? 'block' : 'none';
    wrap.classList.toggle('expanded', expanded);
  });

  const update = (data) => dispatch({ type: 'SET_CHECKIN', dateKey, data });

  // Section helper
  const section = (labelText, iconPath, contentChildren) => {
    const wrap = h('div', { className: 'checkin-section' });
    const lbl = h('div', { className: 'checkin-label' });
    if (iconPath) lbl.appendChild(icon(iconPath, 14));
    lbl.appendChild(h('span', {}, labelText));
    wrap.appendChild(lbl);
    wrap.appendChild(contentChildren);
    return wrap;
  };

  // Hours slept
  const hoursRow = h('div', { className: 'chip-row' });
  [3,4,5,6,7,8,9,10].forEach((n) => {
    hoursRow.appendChild(chip(`${n}h`, checkIn.hoursSlept === n,
      () => update({ hoursSlept: n }), { small: true }));
  });
  body.appendChild(section('Hours slept', ICONS.moon, hoursRow));

  // Sleep quality
  const sleepQ = h('div', { className: 'chip-row' });
  [1,2,3,4,5].forEach((q) => {
    sleepQ.appendChild(chip(String(q), checkIn.sleepQuality === q,
      () => update({ sleepQuality: q }), { small: true }));
  });
  body.appendChild(section('Sleep quality (1 poor – 5 great)', null, sleepQ));

  // Water
  const water = h('div', { className: 'chip-row' });
  ['Low','Medium','High'].forEach((w) => {
    water.appendChild(chip(w, checkIn.water === w,
      () => update({ water: w }), { small: true }));
  });
  body.appendChild(section('Water', ICONS.droplet, water));

  // Sunlight
  const sun = h('div', { className: 'chip-row' });
  sun.appendChild(chip('Yes, got it', checkIn.sunlight === true,
    () => update({ sunlight: true }), { small: true }));
  sun.appendChild(chip('Not yet', checkIn.sunlight === false,
    () => update({ sunlight: false }), { small: true }));
  body.appendChild(section('Sunlight (min 15 min)', ICONS.sun, sun));

  // Stress
  const stress = h('div', { className: 'chip-row' });
  [1,2,3,4,5].forEach((s) => {
    stress.appendChild(chip(String(s), checkIn.stress === s,
      () => update({ stress: s }), { small: true }));
  });
  body.appendChild(section('Stress (1 low – 5 high)', null, stress));

  // Caffeine
  const caff = h('div', { className: 'chip-row' });
  caff.appendChild(chip('Yes', checkIn.caffeine === true,
    () => update({ caffeine: true }), { small: true }));
  caff.appendChild(chip('No', checkIn.caffeine === false,
    () => update({ caffeine: false }), { small: true }));
  body.appendChild(section('Caffeine', ICONS.coffee, caff));

  // Notes
  const notes = h('textarea', {
    placeholder: 'Anything notable today (food, late night, allergies, etc.)',
    rows: 2,
  });
  notes.value = checkIn.notes || '';
  notes.addEventListener('blur', () => update({ notes: notes.value }));
  body.appendChild(section('Notes (optional)', ICONS.doc, notes));

  // Buttons
  const btnRow = h('div', { className: 'btn-row', style: { marginTop: '20px' } });
  const skipBtn = h('button', {
    className: 'btn btn-secondary',
    onClick: () => {
      update({ skipped: true, completed: false });
      userExpandedState = false; // explicit user action: keep collapsed
      expanded = false;
      body.style.display = 'none';
      wrap.classList.remove('expanded');
    },
  }, 'Skip today');
  const completeBtn = h('button', {
    className: 'btn btn-secondary',
    onClick: () => update({ completed: true, skipped: false }),
  }, 'Mark complete');
  btnRow.appendChild(skipBtn);
  btnRow.appendChild(completeBtn);
  body.appendChild(btnRow);

  wrap.appendChild(header);
  wrap.appendChild(body);
  return wrap;
};
