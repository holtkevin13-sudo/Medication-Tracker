// Defaults — these only apply on first run. After that, the user's
// settings/customizations live in the database.

export const DEFAULT_DAILY_MEDS = [
  { id: 'claritin', name: 'Claritin' },
  { id: 'omega', name: 'Omega' },
  { id: 'probiotics', name: 'Probiotics' },
  { id: 'magnesium', name: 'Magnesium' },
  { id: 'multivitamin', name: 'Multivitamin' },
];

export const DEFAULT_INTERVAL_MEDS = [
  { id: 'testosterone', name: 'Testosterone', intervalDays: 4 },
];

export const DEFAULT_RESCUE_MEDS = ['White willow', 'Tylenol', 'Ibuprofen'];

export const PRODROME_SIGNS = [
  'Yawning', 'Food cravings', 'Mood changes', 'Neck stiffness',
  'Frequent urination', 'Fatigue', 'Trouble concentrating',
  'Light sensitivity starting', 'Smell sensitivity', 'Stiff shoulders',
];

export const LOCATIONS = [
  'Left side', 'Right side', 'Behind eye(s)', 'Forehead',
  'Temples', 'Back of head', 'Neck', 'Full head',
];

export const DEFAULT_SYMPTOMS = [
  'Nausea', 'Vomiting', 'Light sensitivity', 'Sound sensitivity',
  'Smell sensitivity', 'Dizziness', 'Numbness/tingling',
  'Brain fog', 'Fatigue',
];

export const AURA_TYPES = {
  Visual: ['Zigzags', 'Blind spots', 'Flashing lights', 'Tunnel vision', 'Blurred vision'],
  Sensory: ['Tingling', 'Numbness', 'Pins and needles'],
  'Speech/language': ['Slurred speech', 'Word-finding trouble', 'Confusion'],
  Motor: ['Weakness', 'Loss of coordination'],
};

export const DEFAULT_TRIGGERS = [
  'Poor sleep', 'Stress', 'Skipped meal', 'Dehydration', 'Specific food',
  'Weather change', 'Screen time', 'Bright lights', 'Strong smells',
  'Hormonal', 'Exercise', 'Unknown',
];

export const WHAT_HELPED = [
  'Rescue med', 'Sleep', 'Dark room', 'Ice/cold', 'Heat',
  'Caffeine', 'Hydration', 'Just time', 'Nothing',
];

export const POSTDROME_SIGNS = [
  'Fatigue', 'Brain fog', 'Mild head sensitivity',
  'Mood low', 'Body aches', 'Fully recovered',
];

export const SEVERITY_ANCHORS = [
  '1–3 noticeable',
  '4–6 disruptive',
  '7–8 can\'t function',
  '9–10 ER-level',
];

// SVG icon paths (lucide-style)
export const ICONS = {
  pill: '<path d="M10.5 20.5 21 10a3.5 3.5 0 0 0-5-5L5.5 15.5a3.5 3.5 0 0 0 5 5Z"/><path d="m8.5 8.5 7 7"/>',
  activity: '<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.5.5 0 0 1-.96 0L9.24 3.18a.5.5 0 0 0-.96 0l-2.35 8.36A2 2 0 0 1 4 13H2"/>',
  calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  brain: '<path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>',
  zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  alert: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  chevright: '<polyline points="9 18 15 12 9 6"/>',
  chevdown: '<polyline points="6 9 12 15 18 9"/>',
  cloud: '<path d="M20 16.2A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9"/><path d="M16 14v6M8 14v6M12 16v6"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  droplet: '<path d="M12 2.69 5.5 9.27a8 8 0 1 0 13 0L12 2.69z"/>',
  coffee: '<path d="M17 8h1a4 4 0 1 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/>',
  doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  rotateccw: '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
};
