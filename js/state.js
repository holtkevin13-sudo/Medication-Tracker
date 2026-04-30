// Central state. Reducer-style updates, auto-persist to IndexedDB,
// subscribe-based re-rendering for views.

import { dbGet, dbSet } from './db.js';
import { DEFAULT_DAILY_MEDS, DEFAULT_INTERVAL_MEDS } from './constants.js';
import { uid } from './utils.js';

const STATE_KEY = 'app-state';

export const initialState = {
  dailyMeds: DEFAULT_DAILY_MEDS,
  intervalMeds: DEFAULT_INTERVAL_MEDS,
  dailyMedLog: {},      // { 'YYYY-MM-DD': { medId: { taken: true, time } } }
  intervalMedLog: {},   // { medId: [timestamp, ...] }
  dailyCheckIns: {},    // { 'YYYY-MM-DD': { hoursSlept, water, ..., notes } }
  migraines: [],
  prodromes: [],
  rescueLogs: [],       // pre-emptive rescue meds taken without a migraine
  settings: {
    customSymptoms: [],
    customTriggers: [],
    customRescueMeds: [],
    customLocations: [],
    largeFonts: false,
  },
  meta: {
    lastBackupNudge: null,
    lastBackupExport: null,
  },
};

let state = null;
const listeners = new Set();

export const loadState = async () => {
  const stored = await dbGet(STATE_KEY);
  state = stored || structuredClone(initialState);
  // Merge with initial to pick up any new fields after upgrades
  state = { ...structuredClone(initialState), ...state, settings: { ...initialState.settings, ...(state.settings || {}) }, meta: { ...initialState.meta, ...(state.meta || {}) } };
  return state;
};

export const getState = () => state;

export const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const notify = () => {
  for (const fn of listeners) {
    try { fn(state); } catch (e) { console.error(e); }
  }
};

const persist = () => {
  // Fire-and-forget; users will rarely lose data because IndexedDB writes are fast
  dbSet(STATE_KEY, state).catch((err) => console.error('Persist failed:', err));
};

export const dispatch = (action) => {
  state = reducer(state, action);
  persist();
  notify();
};

function reducer(s, a) {
  switch (a.type) {
    case 'TOGGLE_DAILY_MED': {
      const { medId, dateKey, time } = a;
      const day = { ...(s.dailyMedLog[dateKey] || {}) };
      if (day[medId]?.taken) {
        delete day[medId];
      } else {
        day[medId] = { taken: true, time: time || new Date().toISOString() };
      }
      return { ...s, dailyMedLog: { ...s.dailyMedLog, [dateKey]: day } };
    }
    case 'EDIT_DAILY_MED_TIME': {
      const { medId, dateKey, time } = a;
      const day = { ...(s.dailyMedLog[dateKey] || {}) };
      if (day[medId]) day[medId] = { ...day[medId], time };
      return { ...s, dailyMedLog: { ...s.dailyMedLog, [dateKey]: day } };
    }
    case 'LOG_INTERVAL_MED': {
      const { medId, time } = a;
      const log = s.intervalMedLog[medId] || [];
      return {
        ...s,
        intervalMedLog: {
          ...s.intervalMedLog,
          [medId]: [...log, time || new Date().toISOString()].sort(),
        },
      };
    }
    case 'REMOVE_INTERVAL_MED_LOG': {
      const { medId, time } = a;
      const log = (s.intervalMedLog[medId] || []).filter((t) => t !== time);
      return { ...s, intervalMedLog: { ...s.intervalMedLog, [medId]: log } };
    }
    case 'SET_CHECKIN': {
      const { dateKey, data } = a;
      return {
        ...s,
        dailyCheckIns: {
          ...s.dailyCheckIns,
          [dateKey]: { ...(s.dailyCheckIns[dateKey] || {}), ...data },
        },
      };
    }
    case 'ADD_PRODROME':
      return { ...s, prodromes: [...s.prodromes, a.prodrome] };
    case 'UPDATE_PRODROME':
      return {
        ...s,
        prodromes: s.prodromes.map((p) => p.id === a.prodrome.id ? a.prodrome : p),
      };
    case 'ADD_MIGRAINE':
      return { ...s, migraines: [...s.migraines, a.migraine] };
    case 'UPDATE_MIGRAINE':
      return {
        ...s,
        migraines: s.migraines.map((m) =>
          m.id === a.migraine.id
            ? { ...a.migraine, lastEdited: new Date().toISOString() }
            : m
        ),
      };
    case 'DELETE_MIGRAINE':
      return { ...s, migraines: s.migraines.filter((m) => m.id !== a.id) };
    case 'ADD_RESCUE_LOG':
      return { ...s, rescueLogs: [...s.rescueLogs, a.entry] };
    case 'ADD_DAILY_MED':
      return { ...s, dailyMeds: [...s.dailyMeds, { id: uid(), name: a.name }] };
    case 'REMOVE_DAILY_MED':
      return { ...s, dailyMeds: s.dailyMeds.filter((m) => m.id !== a.id) };
    case 'ADD_INTERVAL_MED':
      return {
        ...s,
        intervalMeds: [...s.intervalMeds, {
          id: uid(), name: a.name, intervalDays: a.intervalDays,
        }],
      };
    case 'UPDATE_INTERVAL_MED':
      return {
        ...s,
        intervalMeds: s.intervalMeds.map((m) =>
          m.id === a.id ? { ...m, ...a.updates } : m
        ),
      };
    case 'REMOVE_INTERVAL_MED':
      return { ...s, intervalMeds: s.intervalMeds.filter((m) => m.id !== a.id) };
    case 'UPDATE_SETTINGS':
      return { ...s, settings: { ...s.settings, ...a.updates } };
    case 'UPDATE_META':
      return { ...s, meta: { ...s.meta, ...a.updates } };
    case 'IMPORT':
      return { ...a.state };
    default:
      return s;
  }
}
