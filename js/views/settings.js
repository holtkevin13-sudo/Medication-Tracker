// Settings view: backup, manage meds, custom chips, font size, raw data.

import { h, icon, todayKey, fmtDate, fmtDuration } from '../utils.js';
import { ICONS } from '../constants.js';
import { openModal, confirmDialog } from '../components/ui.js';

export const settingsView = (state, dispatch) => {
  const wrap = h('div', { className: 'stack' });

  const header = h('div');
  header.appendChild(h('p', { className: 'eyebrow' }, 'Settings'));
  header.appendChild(h('h1', { className: 'display' }, 'Customize'));
  wrap.appendChild(header);

  // Backup card
  const backup = h('div', { className: 'card' });
  backup.appendChild(h('p', {
    style: { color: 'var(--text-1)', fontWeight: '500', marginBottom: '12px' },
  }, 'Backup'));

  backup.appendChild(settingRow(ICONS.download, 'Export full backup (JSON)', () => {
    handleExport(state, dispatch);
  }));
  backup.appendChild(settingRow(ICONS.download, 'Export migraines (CSV, doctor-friendly)', () => {
    handleExportCSV(state);
  }));
  backup.appendChild(settingRow(ICONS.upload, 'Restore from backup', () => {
    triggerImport(state, dispatch);
  }));
  wrap.appendChild(backup);

  // Manage section
  const manageCard = h('div', { className: 'card' });
  manageCard.appendChild(settingRow(ICONS.pill, 'Manage daily meds', () => openManageDaily(state, dispatch)));
  manageCard.appendChild(settingRow(ICONS.clock, 'Manage scheduled meds', () => openManageInterval(state, dispatch)));
  manageCard.appendChild(settingRow(ICONS.edit, 'Custom symptoms / triggers / rescue', () => openManageChips(state, dispatch)));
  manageCard.appendChild(settingRow(ICONS.doc, 'View & edit raw data', () => openRawData(state)));
  wrap.appendChild(manageCard);

  // Font size toggle
  const fontCard = h('div', { className: 'card' });
  const fontRow = h('div', { className: 'row-between' });
  const fontLeft = h('div');
  fontLeft.appendChild(h('p', { style: { color: 'var(--text-1)', fontWeight: '500', margin: 0 } }, 'Larger fonts'));
  fontLeft.appendChild(h('p', { style: { color: 'var(--text-4)', fontSize: '12px', marginTop: '2px' } }, 'Helpful during light sensitivity'));
  fontRow.appendChild(fontLeft);
  const fontSwitch = h('button', { className: `switch ${state.settings.largeFonts ? 'on' : ''}` });
  fontSwitch.addEventListener('click', () => {
    dispatch({ type: 'UPDATE_SETTINGS', updates: { largeFonts: !state.settings.largeFonts } });
  });
  fontRow.appendChild(fontSwitch);
  fontCard.appendChild(fontRow);
  wrap.appendChild(fontCard);

  // Footer note
  wrap.appendChild(h('p', {
    style: { color: 'var(--text-5)', fontSize: '11px', textAlign: 'center', padding: '16px 0' },
  }, 'Data is stored on this device only. Export regularly to back up.'));

  return wrap;
};

const settingRow = (iconPath, label, onClick) => {
  const row = h('button', { className: 'setting-row' });
  const left = h('div', { className: 'left' });
  left.appendChild(icon(iconPath, 18));
  left.appendChild(h('span', {}, label));
  row.appendChild(left);
  row.appendChild(icon(ICONS.chevright, 18));
  row.addEventListener('click', onClick);
  return row;
};

// ----- BACKUP / RESTORE -----

const handleExport = (state, dispatch) => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `migraine-tracker-backup-${todayKey()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  dispatch({ type: 'UPDATE_META', updates: { lastBackupExport: new Date().toISOString() } });
};

const handleExportCSV = (state) => {
  const rows = [
    ['Date', 'Type', 'Duration', 'Peak severity', 'Final severity',
     'Locations', 'Symptoms', 'Triggers', 'What helped', 'Rescue meds', 'Notes'],
    ...state.migraines.map((m) => [
      fmtDate(m.startTime),
      m.type || 'migraine',
      fmtDuration(m.startTime, m.endTime),
      m.severityLog?.length ? Math.max(...m.severityLog.map((s) => s.value)) : '',
      m.finalSeverity || '',
      (m.locations || []).join('; '),
      (m.symptoms || []).join('; '),
      (m.triggers || []).join('; '),
      (m.whatHelped || []).join('; '),
      (m.rescueMeds || []).map((r) =>
        `${r.name}${r.reliefMinutes != null ? ` (relief ${r.reliefMinutes}m)` : ''}`
      ).join('; '),
      (m.notes || '').replace(/\n/g, ' '),
    ]),
  ];
  const csv = rows.map((r) =>
    r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `migraines-${todayKey()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const triggerImport = (state, dispatch) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        confirmDialog({
          title: 'Replace all data?',
          message: 'Recommended: export current data first as a safety backup.',
          confirmLabel: 'Replace',
          danger: true,
          onConfirm: () => dispatch({ type: 'IMPORT', state: data }),
        });
      } catch (err) {
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  });
  input.click();
};

// ----- MANAGE DAILY MEDS -----

const openManageDaily = (state, dispatch) => {
  openModal({
    title: 'Daily meds',
    fullscreen: true,
    content: (body) => {
      const render = () => {
        body.innerHTML = '';
        const list = h('div', { className: 'stack', style: { '--stack-gap': '8px' } });
        state.dailyMeds.forEach((m) => {
          const row = h('div', {
            style: {
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px', background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
            },
          });
          row.appendChild(h('span', { style: { color: 'var(--text-1)' } }, m.name));
          const del = h('button', { style: { color: 'var(--red-text)', padding: '4px' } });
          del.appendChild(icon(ICONS.trash, 16));
          del.addEventListener('click', () => {
            confirmDialog({
              title: 'Remove this med?',
              message: `${m.name} — past log entries will remain in data.`,
              confirmLabel: 'Remove',
              danger: true,
              onConfirm: () => {
                dispatch({ type: 'REMOVE_DAILY_MED', id: m.id });
                state.dailyMeds = state.dailyMeds.filter((x) => x.id !== m.id);
                render();
              },
            });
          });
          row.appendChild(del);
          list.appendChild(row);
        });
        body.appendChild(list);

        const addWrap = h('div', { style: { marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' } });
        const addRow = h('div', { style: { display: 'flex', gap: '8px' } });
        const input = h('input', { type: 'text', placeholder: 'New med name' });
        const addBtn = h('button', { className: 'btn btn-primary', style: { width: 'auto', padding: '12px 16px' } });
        addBtn.appendChild(icon(ICONS.plus, 18));
        addBtn.addEventListener('click', () => {
          if (input.value.trim()) {
            dispatch({ type: 'ADD_DAILY_MED', name: input.value.trim() });
            state.dailyMeds = [...state.dailyMeds, { id: Date.now().toString(36), name: input.value.trim() }];
            input.value = '';
            render();
          }
        });
        addRow.appendChild(input);
        addRow.appendChild(addBtn);
        addWrap.appendChild(addRow);
        body.appendChild(addWrap);
      };
      render();
    },
  });
};

const openManageInterval = (state, dispatch) => {
  openModal({
    title: 'Scheduled meds',
    fullscreen: true,
    content: (body) => {
      const render = () => {
        body.innerHTML = '';
        const list = h('div', { className: 'stack', style: { '--stack-gap': '8px' } });
        state.intervalMeds.forEach((m) => {
          const card = h('div', {
            style: {
              padding: '12px', background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
            },
          });
          const row1 = h('div', {
            style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
          });
          row1.appendChild(h('span', { style: { color: 'var(--text-1)', fontWeight: '500' } }, m.name));
          const del = h('button', { style: { color: 'var(--red-text)', padding: '4px' } });
          del.appendChild(icon(ICONS.trash, 16));
          del.addEventListener('click', () => {
            confirmDialog({
              title: 'Remove this med?',
              message: m.name,
              confirmLabel: 'Remove',
              danger: true,
              onConfirm: () => {
                dispatch({ type: 'REMOVE_INTERVAL_MED', id: m.id });
                state.intervalMeds = state.intervalMeds.filter((x) => x.id !== m.id);
                render();
              },
            });
          });
          row1.appendChild(del);
          card.appendChild(row1);

          const row2 = h('div', {
            style: { display: 'flex', alignItems: 'center', gap: '8px' },
          });
          row2.appendChild(h('span', { style: { color: 'var(--text-4)', fontSize: '13px' } }, 'Every'));
          const numInput = h('input', {
            type: 'number',
            value: String(m.intervalDays),
            style: { width: '64px', textAlign: 'center', padding: '6px' },
          });
          numInput.addEventListener('change', () => {
            const days = Math.max(1, parseInt(numInput.value) || 1);
            dispatch({ type: 'UPDATE_INTERVAL_MED', id: m.id, updates: { intervalDays: days } });
            m.intervalDays = days;
          });
          row2.appendChild(numInput);
          row2.appendChild(h('span', { style: { color: 'var(--text-4)', fontSize: '13px' } }, 'days'));
          card.appendChild(row2);

          list.appendChild(card);
        });
        body.appendChild(list);

        // Add new
        const addWrap = h('div', { style: { marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' } });
        const nameInput = h('input', { type: 'text', placeholder: 'New scheduled med' });
        addWrap.appendChild(nameInput);

        const intRow = h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' } });
        intRow.appendChild(h('span', { style: { color: 'var(--text-4)', fontSize: '13px' } }, 'Every'));
        const intInput = h('input', {
          type: 'number', value: '4',
          style: { width: '64px', textAlign: 'center', padding: '6px' },
        });
        intRow.appendChild(intInput);
        intRow.appendChild(h('span', { style: { color: 'var(--text-4)', fontSize: '13px' } }, 'days'));

        const addBtn = h('button', {
          className: 'btn btn-primary',
          style: { marginLeft: 'auto', width: 'auto', padding: '8px 16px' },
        }, 'Add');
        addBtn.addEventListener('click', () => {
          if (nameInput.value.trim()) {
            const days = Math.max(1, parseInt(intInput.value) || 1);
            dispatch({ type: 'ADD_INTERVAL_MED', name: nameInput.value.trim(), intervalDays: days });
            state.intervalMeds = [...state.intervalMeds, {
              id: Date.now().toString(36), name: nameInput.value.trim(), intervalDays: days,
            }];
            nameInput.value = '';
            render();
          }
        });
        intRow.appendChild(addBtn);
        addWrap.appendChild(intRow);
        body.appendChild(addWrap);
      };
      render();
    },
  });
};

const openManageChips = (state, dispatch) => {
  openModal({
    title: 'Custom chips',
    fullscreen: true,
    content: (body) => {
      const cats = [
        { key: 'customSymptoms', label: 'Custom symptoms' },
        { key: 'customTriggers', label: 'Custom triggers' },
        { key: 'customLocations', label: 'Custom locations' },
        { key: 'customRescueMeds', label: 'Custom rescue meds' },
      ];
      const render = () => {
        body.innerHTML = '';
        cats.forEach((c) => {
          const block = h('div', { style: { marginBottom: '24px' } });
          block.appendChild(h('p', {
            style: { color: 'var(--text-2)', fontWeight: '500', marginBottom: '8px' },
          }, c.label));

          const chipsWrap = h('div', { className: 'chip-row', style: { marginBottom: '12px' } });
          const values = state.settings[c.key] || [];
          if (values.length === 0) {
            chipsWrap.appendChild(h('p', {
              style: { color: 'var(--text-4)', fontSize: '13px' },
            }, 'None added'));
          }
          values.forEach((v) => {
            const c2 = h('button', { className: 'chip active' });
            c2.appendChild(h('span', {}, v));
            c2.appendChild(icon(ICONS.x, 12));
            c2.addEventListener('click', () => {
              const next = values.filter((x) => x !== v);
              dispatch({ type: 'UPDATE_SETTINGS', updates: { [c.key]: next } });
              state.settings[c.key] = next;
              render();
            });
            chipsWrap.appendChild(c2);
          });
          block.appendChild(chipsWrap);

          const addRow = h('div', { style: { display: 'flex', gap: '8px' } });
          const inp = h('input', {
            type: 'text', placeholder: `Add ${c.label.toLowerCase()}`,
          });
          const btn = h('button', {
            className: 'btn btn-secondary',
            style: { width: 'auto', padding: '8px 16px' },
          });
          btn.appendChild(icon(ICONS.plus, 16));
          btn.addEventListener('click', () => {
            if (inp.value.trim()) {
              const next = [...values, inp.value.trim()];
              dispatch({ type: 'UPDATE_SETTINGS', updates: { [c.key]: next } });
              state.settings[c.key] = next;
              render();
            }
          });
          addRow.appendChild(inp);
          addRow.appendChild(btn);
          block.appendChild(addRow);
          body.appendChild(block);
        });
      };
      render();
    },
  });
};

const openRawData = (state) => {
  openModal({
    title: 'Raw data',
    fullscreen: true,
    content: (body) => {
      const pre = h('pre', {
        style: {
          fontSize: '11px', color: 'var(--text-3)', whiteSpace: 'pre-wrap',
          wordBreak: 'break-all', fontFamily: 'monospace', margin: 0,
        },
      }, JSON.stringify(state, null, 2));
      body.appendChild(pre);
    },
  });
};
