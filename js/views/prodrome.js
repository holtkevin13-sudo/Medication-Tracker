// Prodrome logging — warning sign capture before a migraine.
// Includes severity-of-feeling and proactive rescue med toggle.

import { h, uid } from '../utils.js';
import { PRODROME_SIGNS, DEFAULT_RESCUE_MEDS } from '../constants.js';
import { chip } from '../components/ui.js';

export const prodromeForm = (state, dispatch, onClose) => {
  const wrap = h('div');

  const data = {
    id: uid(),
    time: new Date().toISOString(),
    signs: [],
    intensity: null,
    proactiveRescue: null,
    notes: '',
  };

  wrap.appendChild(h('p', {
    style: { color: 'var(--text-3)', fontSize: '13px', marginBottom: '20px' },
  }, "Logging warning signs now. If a migraine starts within 48 hours, it'll auto-link to this entry."));

  // Signs
  wrap.appendChild(h('p', { className: 'checkin-label' }, 'Warning signs'));
  const signsRow = h('div', { className: 'chip-row' });
  PRODROME_SIGNS.forEach((s) => {
    let active = false;
    const c = chip(s, false, () => {
      active = !active;
      if (active) data.signs.push(s);
      else data.signs = data.signs.filter((x) => x !== s);
      c.classList.toggle('active', active);
    });
    signsRow.appendChild(c);
  });
  wrap.appendChild(signsRow);

  // Intensity
  wrap.appendChild(h('p', {
    className: 'checkin-label',
    style: { marginTop: '20px' },
  }, 'How strongly are you feeling it?'));
  const intRow = h('div', { className: 'chip-row' });
  ['Mild', 'Moderate', 'Strong'].forEach((lvl) => {
    const c = chip(lvl, false, () => {
      data.intensity = lvl;
      [...intRow.children].forEach((ch) => ch.classList.remove('active'));
      c.classList.add('active');
    });
    intRow.appendChild(c);
  });
  wrap.appendChild(intRow);

  // Proactive rescue
  wrap.appendChild(h('p', {
    className: 'checkin-label',
    style: { marginTop: '20px' },
  }, 'Took a rescue med proactively?'));
  const rescueRow = h('div', { className: 'chip-row' });
  const noneChip = chip('None yet', false, () => {
    data.proactiveRescue = null;
    [...rescueRow.children].forEach((c) => c.classList.remove('active'));
    noneChip.classList.add('active');
  });
  noneChip.classList.add('active');
  rescueRow.appendChild(noneChip);
  DEFAULT_RESCUE_MEDS.concat(state.settings.customRescueMeds).forEach((m) => {
    const c = chip(m, false, () => {
      data.proactiveRescue = m;
      [...rescueRow.children].forEach((ch) => ch.classList.remove('active'));
      c.classList.add('active');
      // Also log it as a standalone rescue
      dispatch({ type: 'ADD_RESCUE_LOG', entry: {
        id: uid(),
        time: new Date().toISOString(),
        name: m,
        context: 'prodrome',
        prodromeId: data.id,
      }});
    });
    rescueRow.appendChild(c);
  });
  wrap.appendChild(rescueRow);

  // Notes
  wrap.appendChild(h('p', {
    className: 'checkin-label',
    style: { marginTop: '20px' },
  }, 'Notes (optional)'));
  const notes = h('textarea', { rows: 3, placeholder: 'Anything else you noticed...' });
  notes.addEventListener('input', () => { data.notes = notes.value; });
  wrap.appendChild(notes);

  // Save
  const saveBtn = h('button', {
    className: 'btn btn-primary',
    style: { marginTop: '20px' },
    onClick: () => {
      if (data.signs.length === 0) {
        alert('Select at least one warning sign.');
        return;
      }
      dispatch({ type: 'ADD_PRODROME', prodrome: data });
      onClose();
    },
  }, 'Save prodrome');
  wrap.appendChild(saveBtn);

  return wrap;
};
