// Migraine editor — handles new, active, retrospective, and edit cases.
// Includes Quick log mode for during-attack speed, full mode for detail.

import { h, icon, uid, fmtTime, fmtElapsed, fmtMinutes, severityClass, toDatetimeLocal, sparkline, fmtDate, todayKey } from '../utils.js';
import {
  ICONS, LOCATIONS, DEFAULT_SYMPTOMS, AURA_TYPES, DEFAULT_TRIGGERS,
  DEFAULT_RESCUE_MEDS, WHAT_HELPED, SEVERITY_ANCHORS,
} from '../constants.js';
import { chip, expandable, confirmDialog, attachLongPress } from '../components/ui.js';
import { fetchWeatherSnapshot } from '../weather.js';

// migraine: existing migraine object, or null for new.
// quickStart: if true, opens in Quick log mode (severity + location only).
export const migraineEditor = (state, dispatch, migraine, onClose, opts = {}) => {
  const wrap = h('div');

  const isNew = !migraine;

  const m = {
    id: migraine?.id || uid(),
    type: migraine?.type || 'migraine',
    startTime: migraine?.startTime || new Date().toISOString(),
    endTime: migraine?.endTime || null,
    wokeWithIt: migraine?.wokeWithIt || false,
    onsetSpeed: migraine?.onsetSpeed || null,
    severityLog: migraine?.severityLog || [],
    finalSeverity: migraine?.finalSeverity || null,
    locations: migraine?.locations || [],
    symptoms: migraine?.symptoms || [],
    auras: migraine?.auras || {},
    triggers: migraine?.triggers || [],
    rescueMeds: migraine?.rescueMeds || [],
    whatHelped: migraine?.whatHelped || [],
    notes: migraine?.notes || '',
    weather: migraine?.weather || null,
    contextSnapshot: migraine?.contextSnapshot || null,
    postdrome: migraine?.postdrome || null,
    linkedProdromeId: migraine?.linkedProdromeId || null,
  };

  const isActive = !m.endTime;
  let quickMode = opts.quickStart && isNew;

  // Auto-snapshot weather + context for new migraines (item 4)
  if (isNew) {
    if (!m.weather) {
      fetchWeatherSnapshot().then((w) => {
        if (w) {
          m.weather = w;
          if (!quickMode) renderWeather();
        }
      });
    }
    if (!m.contextSnapshot) {
      m.contextSnapshot = buildContextSnapshot(state);
    }
    // Auto-link recent prodrome (within 48h)
    const recent = [...state.prodromes].reverse().find((p) => {
      const diff = new Date(m.startTime) - new Date(p.time);
      return diff >= 0 && diff <= 48 * 60 * 60 * 1000;
    });
    if (recent) m.linkedProdromeId = recent.id;
  }

  // Recent migraines pill row (item 12)
  if (isNew) {
    const recent = [...state.migraines]
      .filter((x) => x.endTime)
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
      .slice(0, 3);
    if (recent.length > 0) {
      const recentBox = h('div', {
        className: 'card card-tight',
        style: { background: 'transparent', borderColor: 'var(--border)' },
      });
      recentBox.appendChild(h('p', {
        style: { fontSize: '11px', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' },
      }, 'Your last 3'));
      const row = h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } });
      recent.forEach((r) => {
        const peak = r.severityLog?.length ? Math.max(...r.severityLog.map((s) => s.value)) : '—';
        row.appendChild(h('span', {
          style: { fontSize: '12px', padding: '4px 10px', borderRadius: '6px', background: 'var(--surface-2)', color: 'var(--text-3)' },
        }, `${fmtDate(r.startTime)} · sev ${peak}`));
      });
      recentBox.appendChild(row);
      wrap.appendChild(recentBox);
    }
  }

  const all = (cat, defaults) => [...defaults, ...(state.settings[cat] || [])];

  // ----- TYPE TOGGLE -----
  const typeSection = h('div');
  typeSection.appendChild(h('p', { className: 'checkin-label' }, 'This is a...'));
  const typeRow = h('div', { className: 'chip-row' });
  [['migraine','Migraine'], ['headache','Headache'], ['unsure','Not sure']].forEach(([v, l]) => {
    const c = chip(l, m.type === v, () => {
      m.type = v;
      [...typeRow.children].forEach((ch) => ch.classList.remove('active'));
      c.classList.add('active');
    });
    typeRow.appendChild(c);
  });
  typeSection.appendChild(typeRow);

  // ----- START TIME -----
  const startSection = h('div');
  const startLabel = h('p', { className: 'checkin-label' });
  startLabel.appendChild(h('span', {}, 'Started'));
  const elapsedSpan = h('span', { style: { color: 'var(--text-5)', marginLeft: '8px' } });
  if (isActive) elapsedSpan.textContent = `· ${fmtElapsed(m.startTime)} ago`;
  startLabel.appendChild(elapsedSpan);
  startSection.appendChild(startLabel);

  const startInput = h('input', {
    type: 'datetime-local',
    value: toDatetimeLocal(m.startTime),
  });
  startInput.addEventListener('change', () => {
    m.startTime = new Date(startInput.value).toISOString();
    if (isActive) elapsedSpan.textContent = `· ${fmtElapsed(m.startTime)} ago`;
  });
  startSection.appendChild(startInput);

  const wokeRow = h('div', { className: 'chip-row', style: { marginTop: '8px' } });
  let woke = m.wokeWithIt;
  const wokeChip = chip('Woke up with it', woke, () => {
    woke = !woke;
    m.wokeWithIt = woke;
    wokeChip.classList.toggle('active', woke);
  }, { small: true });
  wokeRow.appendChild(wokeChip);
  startSection.appendChild(wokeRow);

  // ----- SEVERITY -----
  const sevCard = h('div', { className: 'card' });
  const sevHeader = h('p', { className: 'checkin-label' });
  sevHeader.textContent = 'Severity';
  sevCard.appendChild(sevHeader);

  const sparkWrap = h('div', { style: { marginBottom: '8px' } });
  const sevGrid = h('div', { className: 'severity-grid' });
  const sevButtons = [];

  const renderSeverity = () => {
    const peak = m.severityLog.length ? Math.max(...m.severityLog.map((s) => s.value)) : null;
    const cur = m.severityLog.length ? m.severityLog[m.severityLog.length - 1].value : null;
    let txt = 'Severity';
    if (cur != null) txt += ` · current ${cur}`;
    if (peak != null && peak !== cur) txt += ` · peak ${peak}`;
    sevHeader.textContent = txt;
    sevButtons.forEach((b, i) => {
      const n = i + 1;
      const isActive = cur === n;
      b.className = `severity-btn ${severityClass(n)} ${isActive ? 'active' : ''}`;
    });
    // Sparkline
    if (m.severityLog.length > 1) {
      sparkWrap.innerHTML = sparkline(m.severityLog.map((s) => s.value), 280, 32);
    } else {
      sparkWrap.innerHTML = '';
    }
  };

  for (let n = 1; n <= 10; n++) {
    const b = h('button', { className: `severity-btn ${severityClass(n)}` }, String(n));
    b.addEventListener('click', () => {
      const entry = { time: new Date().toISOString(), value: n };
      const log = [...m.severityLog];
      // If last entry was within 5 min, replace it
      if (log.length && (Date.now() - new Date(log[log.length - 1].time)) < 5 * 60 * 1000) {
        log[log.length - 1] = entry;
      } else {
        log.push(entry);
      }
      m.severityLog = log;
      renderSeverity();
    });
    sevButtons.push(b);
    sevGrid.appendChild(b);
  }
  sevCard.appendChild(sparkWrap);
  sevCard.appendChild(sevGrid);

  // Severity anchors (item 6)
  const anchors = h('div', { className: 'severity-anchors' });
  SEVERITY_ANCHORS.forEach((a) => anchors.appendChild(h('span', {}, a)));
  sevCard.appendChild(anchors);
  renderSeverity();

  // ----- LOCATIONS -----
  const locSection = h('div');
  locSection.appendChild(h('p', { className: 'checkin-label' }, 'Where'));
  const locRow = h('div', { className: 'chip-row' });
  all('customLocations', LOCATIONS).forEach((l) => {
    const c = chip(l, m.locations.includes(l), () => {
      if (m.locations.includes(l)) m.locations = m.locations.filter((x) => x !== l);
      else m.locations.push(l);
      c.classList.toggle('active', m.locations.includes(l));
    });
    locRow.appendChild(c);
  });
  locSection.appendChild(locRow);

  // ----- SYMPTOMS -----
  const symSection = h('div');
  symSection.appendChild(h('p', { className: 'checkin-label' }, 'Symptoms'));
  const symRow = h('div', { className: 'chip-row' });
  all('customSymptoms', DEFAULT_SYMPTOMS).forEach((s) => {
    const c = chip(s, m.symptoms.includes(s), () => {
      if (m.symptoms.includes(s)) m.symptoms = m.symptoms.filter((x) => x !== s);
      else m.symptoms.push(s);
      c.classList.toggle('active', m.symptoms.includes(s));
    });
    symRow.appendChild(c);
  });
  symSection.appendChild(symRow);

  // ----- AURA (collapsible) -----
  const auraInner = h('div');
  Object.entries(AURA_TYPES).forEach(([cat, options]) => {
    auraInner.appendChild(h('p', {
      style: { fontSize: '11px', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '12px 0 8px' },
    }, cat));
    const row = h('div', { className: 'chip-row' });
    options.forEach((o) => {
      const isOn = m.auras[cat]?.includes(o);
      const c = chip(o, isOn, () => {
        const cur = m.auras[cat] || [];
        if (cur.includes(o)) m.auras[cat] = cur.filter((x) => x !== o);
        else m.auras[cat] = [...cur, o];
        c.classList.toggle('active', m.auras[cat].includes(o));
      }, { small: true });
      row.appendChild(c);
    });
    auraInner.appendChild(row);
  });
  const auraCard = h('div', { className: 'card' });
  const hasAuras = Object.values(m.auras).some((a) => a?.length);
  auraCard.appendChild(expandable({
    titleEl: h('p', { style: { fontWeight: '500', color: 'var(--text-1)' } }, 'Aura'),
    defaultOpen: hasAuras,
    contentEl: auraInner,
  }));

  // ----- RESCUE MEDS -----
  const rescueCard = h('div', { className: 'card' });
  rescueCard.appendChild(h('p', { className: 'checkin-label', style: { marginBottom: '12px' } }, 'Rescue meds'));

  const rescueQuick = h('div', { className: 'chip-row' });
  all('customRescueMeds', DEFAULT_RESCUE_MEDS).forEach((name) => {
    const b = h('button', { className: 'chip' });
    b.appendChild(icon(ICONS.plus, 14));
    b.appendChild(h('span', {}, name));
    b.addEventListener('click', () => {
      m.rescueMeds.push({
        id: uid(), name, time: new Date().toISOString(), reliefMinutes: null,
      });
      renderRescues();
    });
    rescueQuick.appendChild(b);
  });
  rescueCard.appendChild(rescueQuick);

  const rescueWarn = h('div', { style: { marginTop: '12px', display: 'none' } });

  const rescueList = h('div', { style: { marginTop: '12px' } });
  rescueCard.appendChild(rescueWarn);
  rescueCard.appendChild(rescueList);

  const renderRescues = () => {
    while (rescueList.firstChild) rescueList.removeChild(rescueList.firstChild);
    m.rescueMeds.forEach((r) => {
      const entry = h('div', { className: 'rescue-entry' });
      const info = h('div', { className: 'info' });
      info.appendChild(h('div', { className: 'name' }, r.name));
      const whenText = `Taken ${fmtTime(r.time)}` +
        (r.reliefMinutes != null ? ` · relief in ${fmtMinutes(r.reliefMinutes)}` : '');
      info.appendChild(h('div', { className: 'when' }, whenText));
      entry.appendChild(info);

      const actions = h('div', { style: { display: 'flex', gap: '6px' } });
      if (r.reliefMinutes == null) {
        const reliefBtn = h('button', { className: 'relief-btn' }, 'Felt relief');
        reliefBtn.addEventListener('click', () => {
          r.reliefMinutes = Math.round((Date.now() - new Date(r.time)) / 60000);
          r.reliefTime = new Date().toISOString();
          renderRescues();
        });
        actions.appendChild(reliefBtn);
      }
      const delBtn = h('button', { style: { color: 'var(--text-4)', padding: '4px' } });
      delBtn.appendChild(icon(ICONS.x, 16));
      attachLongPress(delBtn,
        () => {
          confirmDialog({
            title: 'Remove this dose?',
            message: `${r.name} taken at ${fmtTime(r.time)}`,
            confirmLabel: 'Remove',
            danger: true,
            onConfirm: () => {
              m.rescueMeds = m.rescueMeds.filter((x) => x.id !== r.id);
              renderRescues();
            },
          });
        },
        () => {
          // Short tap = also confirms via dialog (consistent UX)
          confirmDialog({
            title: 'Remove this dose?',
            message: `${r.name} taken at ${fmtTime(r.time)}`,
            confirmLabel: 'Remove',
            danger: true,
            onConfirm: () => {
              m.rescueMeds = m.rescueMeds.filter((x) => x.id !== r.id);
              renderRescues();
            },
          });
        }
      );
      actions.appendChild(delBtn);
      entry.appendChild(actions);
      rescueList.appendChild(entry);
    });

    // Stacking warning (item 10): 3+ doses in 6 hours
    const recent = m.rescueMeds.filter((r) =>
      (Date.now() - new Date(r.time)) < 6 * 60 * 60 * 1000
    );
    if (recent.length >= 3) {
      rescueWarn.style.display = 'block';
      rescueWarn.className = 'warn-box';
      rescueWarn.innerHTML = '';
      rescueWarn.appendChild(icon(ICONS.alert, 18, 'icon'));
      rescueWarn.appendChild(h('div', {}, h('p', {
        style: { color: 'var(--text-1)', fontSize: '13px', fontWeight: '500', margin: 0 },
      }, `${recent.length} rescue doses in 6 hours`),
      h('p', { style: { color: 'var(--text-4)', fontSize: '12px', marginTop: '4px' } },
        'Heavy stacking. Consider waiting before another dose.')));
    } else {
      rescueWarn.style.display = 'none';
    }
  };
  renderRescues();

  // ----- ADVANCED (collapsible) -----
  const advInner = h('div');

  // Onset speed
  advInner.appendChild(h('p', {
    style: { fontSize: '11px', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' },
  }, 'Onset'));
  const onsetRow = h('div', { className: 'chip-row' });
  [['sudden','Came on suddenly'], ['gradual','Built up gradually']].forEach(([v, l]) => {
    const c = chip(l, m.onsetSpeed === v, () => {
      m.onsetSpeed = v;
      [...onsetRow.children].forEach((ch) => ch.classList.remove('active'));
      c.classList.add('active');
    }, { small: true });
    onsetRow.appendChild(c);
  });
  advInner.appendChild(onsetRow);

  // Triggers
  advInner.appendChild(h('p', {
    style: { fontSize: '11px', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '16px 0 8px' },
  }, 'Possible triggers'));
  const trigRow = h('div', { className: 'chip-row' });
  all('customTriggers', DEFAULT_TRIGGERS).forEach((t) => {
    const c = chip(t, m.triggers.includes(t), () => {
      if (m.triggers.includes(t)) m.triggers = m.triggers.filter((x) => x !== t);
      else m.triggers.push(t);
      c.classList.toggle('active', m.triggers.includes(t));
    }, { small: true });
    trigRow.appendChild(c);
  });
  advInner.appendChild(trigRow);

  // Notes
  advInner.appendChild(h('p', {
    style: { fontSize: '11px', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '16px 0 8px' },
  }, 'Notes'));
  const notesArea = h('textarea', { rows: 3, placeholder: 'Anything else...' });
  notesArea.value = m.notes;
  notesArea.addEventListener('input', () => { m.notes = notesArea.value; });
  advInner.appendChild(notesArea);

  // Weather display
  const weatherWrap = h('div');
  const renderWeather = () => {
    weatherWrap.innerHTML = '';
    if (!m.weather) return;
    const w = m.weather;
    const text = `${w.conditions || ''} · ${w.temp_f}°F · ${w.pressure_mb}mb` +
      (w.pressure_change_24h != null ? ` (24h Δ ${w.pressure_change_24h > 0 ? '+' : ''}${w.pressure_change_24h}mb)` : '');
    const div = h('div', {
      style: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', fontSize: '12px', color: 'var(--text-4)' },
    });
    div.appendChild(icon(ICONS.cloud, 14));
    div.appendChild(h('span', {}, text));
    if (w.pressure_change_24h != null && w.pressure_change_24h <= -5) {
      div.appendChild(h('span', { style: { color: 'var(--amber-text)' } }, '· pressure drop'));
    }
    weatherWrap.appendChild(div);
  };
  renderWeather();
  advInner.appendChild(weatherWrap);

  const advCard = h('div', { className: 'card' });
  advCard.appendChild(expandable({
    titleEl: h('p', { style: { fontWeight: '500', color: 'var(--text-1)' } }, 'Triggers, onset, notes'),
    defaultOpen: !isNew && (m.triggers.length || m.onsetSpeed || m.notes),
    contentEl: advInner,
  }));

  // ----- END / DEBRIEF -----
  const endButtonWrap = h('div');
  const debriefWrap = h('div');

  const renderDebrief = () => {
    debriefWrap.innerHTML = '';
    if (m.endTime) {
      const dCard = h('div', { className: 'card' });
      dCard.appendChild(h('p', {
        style: { fontWeight: '500', color: 'var(--text-1)', marginBottom: '12px' },
      }, 'Debrief'));

      dCard.appendChild(h('p', {
        style: { fontSize: '11px', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' },
      }, 'What helped'));
      const helpRow = h('div', { className: 'chip-row' });
      WHAT_HELPED.forEach((w) => {
        const c = chip(w, m.whatHelped.includes(w), () => {
          if (m.whatHelped.includes(w)) m.whatHelped = m.whatHelped.filter((x) => x !== w);
          else m.whatHelped.push(w);
          c.classList.toggle('active', m.whatHelped.includes(w));
        }, { small: true });
        helpRow.appendChild(c);
      });
      dCard.appendChild(helpRow);

      dCard.appendChild(h('p', {
        style: { fontSize: '11px', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '16px 0 8px' },
      }, 'Final overall severity'));
      const finalGrid = h('div', { className: 'severity-grid' });
      for (let n = 1; n <= 10; n++) {
        const b = h('button', {
          className: `severity-btn ${severityClass(n)} ${m.finalSeverity === n ? 'active' : ''}`,
        }, String(n));
        b.addEventListener('click', () => {
          m.finalSeverity = n;
          renderDebrief();
        });
        finalGrid.appendChild(b);
      }
      dCard.appendChild(finalGrid);

      dCard.appendChild(h('p', {
        style: { fontSize: '12px', color: 'var(--text-5)', marginTop: '12px' },
      }, "A 'How are you feeling?' prompt will pop up tomorrow for postdrome tracking."));

      debriefWrap.appendChild(dCard);
    }
  };
  renderDebrief();

  const renderEndButton = () => {
    endButtonWrap.innerHTML = '';
    if (!m.endTime) {
      const btn = h('button', { className: 'btn btn-success' }, 'End migraine');
      btn.addEventListener('click', () => {
        confirmDialog({
          title: 'End migraine?',
          message: 'This will stamp the end time. You can still edit afterward.',
          confirmLabel: 'End',
          onConfirm: () => {
            m.endTime = new Date().toISOString();
            const cur = m.severityLog.length ? m.severityLog[m.severityLog.length - 1].value : null;
            m.finalSeverity = cur;
            renderEndButton();
            renderDebrief();
          },
        });
      });
      endButtonWrap.appendChild(btn);
    }
  };
  renderEndButton();

  // ----- SAVE / DELETE -----
  const bottomRow = h('div', { className: 'btn-row', style: { marginTop: '8px' } });
  const saveBtn = h('button', { className: 'btn btn-primary' });
  const updateSaveLabel = () => {
    saveBtn.textContent = m.endTime ? 'Save changes' : 'Save & keep active';
  };
  updateSaveLabel();
  saveBtn.addEventListener('click', () => {
    if (isNew) dispatch({ type: 'ADD_MIGRAINE', migraine: m });
    else dispatch({ type: 'UPDATE_MIGRAINE', migraine: m });
    onClose();
  });
  bottomRow.appendChild(saveBtn);

  if (!isNew) {
    const delBtn = h('button', { className: 'btn btn-secondary btn-icon' });
    delBtn.appendChild(icon(ICONS.trash, 18));
    delBtn.style.color = 'var(--red-text)';
    delBtn.addEventListener('click', () => {
      confirmDialog({
        title: 'Delete this entry?',
        message: 'This permanently deletes the migraine log.',
        confirmLabel: 'Delete',
        danger: true,
        onConfirm: () => {
          dispatch({ type: 'DELETE_MIGRAINE', id: m.id });
          onClose();
        },
      });
    });
    bottomRow.appendChild(delBtn);
  }

  // ----- BUILD WRAP CONTENT -----
  const buildFull = () => {
    wrap.appendChild(typeSection); typeSection.style.marginTop = '20px';
    wrap.appendChild(startSection); startSection.style.marginTop = '20px';
    wrap.appendChild(sevCard); sevCard.style.marginTop = '20px';
    wrap.appendChild(locSection); locSection.style.marginTop = '20px';
    wrap.appendChild(symSection); symSection.style.marginTop = '20px';
    wrap.appendChild(auraCard); auraCard.style.marginTop = '20px';
    wrap.appendChild(rescueCard); rescueCard.style.marginTop = '20px';
    wrap.appendChild(advCard); advCard.style.marginTop = '20px';
    wrap.appendChild(endButtonWrap); endButtonWrap.style.marginTop = '20px';
    wrap.appendChild(debriefWrap); debriefWrap.style.marginTop = '20px';
    wrap.appendChild(bottomRow);
  };

  const buildQuick = () => {
    // Quick log: severity + location + rescue meds + save. Everything else hidden.
    const quickHeader = h('div', { className: 'card', style: { marginTop: '20px', textAlign: 'center', background: 'var(--surface-2)' } });
    quickHeader.appendChild(h('h3', { className: 'display' }, 'Quick log'));
    quickHeader.appendChild(h('p', {
      style: { color: 'var(--text-4)', fontSize: '13px', marginTop: '4px' },
    }, 'Severity + where it hurts. Add detail later.'));
    wrap.appendChild(quickHeader);

    wrap.appendChild(sevCard); sevCard.style.marginTop = '16px';
    wrap.appendChild(locSection); locSection.style.marginTop = '16px';
    wrap.appendChild(rescueCard); rescueCard.style.marginTop = '16px';

    const expandBtn = h('button', {
      className: 'btn btn-secondary',
      style: { marginTop: '20px' },
    }, 'Add more details');
    expandBtn.addEventListener('click', () => {
      quickMode = false;
      while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
      buildFull();
    });
    wrap.appendChild(expandBtn);
    wrap.appendChild(bottomRow);
  };

  if (quickMode) buildQuick();
  else buildFull();

  return wrap;
};

// Build the context snapshot for a new migraine: the last 3 days of check-in
// data + recent prodromes. Lets us correlate retroactively.
function buildContextSnapshot(state) {
  const now = new Date();
  const days = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const k = todayKey(d);
    const ci = state.dailyCheckIns[k];
    if (ci) days.push({ date: k, ...ci });
  }
  const recentProdromes = state.prodromes.filter((p) =>
    (now - new Date(p.time)) <= 48 * 60 * 60 * 1000
  );
  return { checkIns: days, prodromes: recentProdromes };
}

// Postdrome prompt component — used by app.js
export const postdromePrompt = (migraine, dispatch, onClose) => {
  const wrap = h('div');
  wrap.appendChild(h('p', {
    style: { color: 'var(--text-3)', fontSize: '13px', marginBottom: '20px' },
  }, `Your migraine ended ${fmtDate(migraine.endTime)}. Postdrome (the "hangover") can last 24–48 hours. How are you feeling now?`));

  const data = { time: new Date().toISOString(), signs: [] };
  const row = h('div', { className: 'chip-row' });
  ['Fatigue', 'Brain fog', 'Mild head sensitivity', 'Mood low', 'Body aches', 'Fully recovered'].forEach((s) => {
    const c = chip(s, false, () => {
      if (data.signs.includes(s)) data.signs = data.signs.filter((x) => x !== s);
      else data.signs.push(s);
      c.classList.toggle('active', data.signs.includes(s));
    });
    row.appendChild(c);
  });
  wrap.appendChild(row);

  const btnRow = h('div', { className: 'btn-row', style: { marginTop: '20px' } });
  const skipBtn = h('button', { className: 'btn btn-secondary' }, 'Skip');
  skipBtn.addEventListener('click', onClose);
  const saveBtn = h('button', { className: 'btn btn-primary' }, 'Save');
  saveBtn.addEventListener('click', () => {
    dispatch({ type: 'UPDATE_MIGRAINE', migraine: { ...migraine, postdrome: data } });
    onClose();
  });
  btnRow.appendChild(skipBtn);
  btnRow.appendChild(saveBtn);
  wrap.appendChild(btnRow);
  return wrap;
};
