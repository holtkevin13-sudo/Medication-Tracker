// App entry point — wires up routing, modals, postdrome prompts.

import { loadState, getState, subscribe, dispatch } from './state.js';
import { h, icon, daysBetween } from './utils.js';
import { ICONS } from './constants.js';
import { openModal, confirmDialog } from './components/ui.js';
import { todayView } from './views/today.js';
import { historyView } from './views/history.js';
import { settingsView } from './views/settings.js';
import { migraineEditor, postdromePrompt } from './views/migraine-editor.js';
import { prodromeForm } from './views/prodrome.js';

const root = document.getElementById('app');
let currentTab = 'today';
let postdromeShownThisSession = new Set();

const TABS = [
  { id: 'today', label: 'Today', icon: ICONS.activity },
  { id: 'history', label: 'History', icon: ICONS.calendar },
  { id: 'settings', label: 'Settings', icon: ICONS.settings },
];

function openMigraine(target, opts = {}) {
  const state = getState();
  const migraine = target === 'new' ? null : target;
  const title = migraine
    ? (migraine.endTime ? 'Edit migraine' : 'Active migraine')
    : (opts.quickStart ? 'Quick log' : 'New migraine');
  openModal({
    title,
    fullscreen: true,
    content: (body, close) => {
      body.appendChild(migraineEditor(state, dispatch, migraine, close, opts));
    },
  });
}

function openProdrome() {
  const state = getState();
  openModal({
    title: 'Prodrome',
    fullscreen: true,
    content: (body, close) => {
      body.appendChild(prodromeForm(state, dispatch, close));
    },
  });
}

function checkPostdromePrompt() {
  const state = getState();
  // Find migraines that ended 20-48h ago and don't have postdrome data
  const now = Date.now();
  const candidate = state.migraines.find((m) => {
    if (!m.endTime || m.postdrome) return false;
    if (postdromeShownThisSession.has(m.id)) return false;
    const ended = new Date(m.endTime).getTime();
    const hoursSince = (now - ended) / (1000 * 60 * 60);
    return hoursSince >= 20 && hoursSince <= 48;
  });
  if (candidate) {
    postdromeShownThisSession.add(candidate.id);
    openModal({
      title: 'Postdrome check-in',
      content: (body, close) => {
        body.appendChild(postdromePrompt(candidate, dispatch, close));
      },
    });
  }
}

function checkBackupNudge() {
  const state = getState();
  // Nudge if 5+ migraines logged AND (never backed up OR 30+ days since last backup)
  if (state.migraines.length < 5) return;
  const last = state.meta.lastBackupExport;
  const lastNudge = state.meta.lastBackupNudge;
  // Don't nudge more than once every 7 days
  if (lastNudge && (Date.now() - new Date(lastNudge).getTime()) < 7 * 24 * 60 * 60 * 1000) return;

  const needsBackup = !last || daysBetween(new Date(last), new Date()) >= 30;
  if (!needsBackup) return;

  dispatch({ type: 'UPDATE_META', updates: { lastBackupNudge: new Date().toISOString() } });

  setTimeout(() => {
    confirmDialog({
      title: 'Time to back up',
      message: last
        ? `It's been over a month since your last backup. Want to export now?`
        : `You have ${state.migraines.length} migraines logged. Export a backup so you don't lose your data.`,
      confirmLabel: 'Go to Settings',
      onConfirm: () => { currentTab = 'settings'; render(); },
    });
  }, 1500);
}

function render() {
  while (root.firstChild) root.removeChild(root.firstChild);
  const state = getState();

  // Apply font preference
  document.body.classList.toggle('large-fonts', !!state.settings.largeFonts);

  // Render the active view
  let view;
  if (currentTab === 'today') {
    view = todayView(state, dispatch, openMigraine, openProdrome);
  } else if (currentTab === 'history') {
    view = historyView(state, dispatch, openMigraine);
  } else if (currentTab === 'settings') {
    view = settingsView(state, dispatch);
  }
  root.appendChild(view);

  // Render bottom nav (only mount once, but rebuild active state)
  let nav = document.querySelector('.tabs');
  if (!nav) {
    nav = h('nav', { className: 'tabs' });
    const inner = h('div', { className: 'tabs-inner' });
    TABS.forEach((t) => {
      const btn = h('button', { className: 'tab-btn', dataset: { tab: t.id } });
      btn.appendChild(icon(t.icon, 22, 'tab-icon'));
      btn.appendChild(h('span', {}, t.label));
      btn.addEventListener('click', () => {
        if (currentTab !== t.id) {
          currentTab = t.id;
          render();
          window.scrollTo({ top: 0, behavior: 'instant' });
        }
      });
      inner.appendChild(btn);
    });
    nav.appendChild(inner);
    document.body.appendChild(nav);
  }
  // Update active tab
  nav.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === currentTab);
  });
}

// Boot
(async () => {
  await loadState();
  subscribe(render);
  render();

  // Check for postdrome prompt on load
  setTimeout(checkPostdromePrompt, 800);

  // Check for backup nudge
  checkBackupNudge();
})();
