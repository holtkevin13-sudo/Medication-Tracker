// Reusable UI primitives.

import { h, icon, haptic } from '../utils.js';
import { ICONS } from '../constants.js';

export const chip = (label, active, onClick, opts = {}) => {
  const btn = h('button', {
    className: `chip ${opts.small ? 'chip-small' : ''} ${active ? 'active' : ''} ${opts.danger ? 'danger' : ''}`,
    onClick: () => { haptic(); onClick(); },
  }, label);
  return btn;
};

export const card = (children, opts = {}) => {
  return h('div', { className: `card ${opts.className || ''}` }, children);
};

// Modal lifecycle: returns { open, close } controllers, attaches to body.
export const openModal = ({ title, content, fullscreen = false, onClose }) => {
  const overlay = h('div', { className: 'modal-overlay' });
  const modal = h('div', {
    className: `modal ${fullscreen ? 'fullscreen' : ''}`,
  });
  const close = () => {
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.remove();
      onClose?.();
    }, 150);
  };

  const closeBtn = h('button', { className: 'modal-close', onClick: close }, '×');
  const header = h('div', { className: 'modal-header' },
    h('div', { className: 'modal-title' }, title),
    closeBtn
  );
  const body = h('div', { className: 'modal-body' });

  modal.appendChild(header);
  modal.appendChild(body);
  overlay.appendChild(modal);

  // Backdrop click closes (only if not fullscreen)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay && !fullscreen) close();
  });

  document.body.appendChild(overlay);
  overlay.style.transition = 'opacity 0.15s';
  overlay.style.opacity = '0';
  requestAnimationFrame(() => { overlay.style.opacity = '1'; });

  // Render content
  if (typeof content === 'function') {
    content(body, close);
  } else {
    body.appendChild(content);
  }

  return { close, body };
};

export const confirmDialog = ({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm }) => {
  const overlay = h('div', { className: 'modal-overlay', style: { zIndex: 60 } });
  const dialog = h('div', { className: 'confirm' });
  const close = () => overlay.remove();

  dialog.appendChild(h('h3', {}, title));
  if (message) dialog.appendChild(h('p', {}, message));

  const cancelBtn = h('button', {
    className: 'btn btn-secondary',
    onClick: close,
  }, 'Cancel');

  const confirmBtn = h('button', {
    className: `btn ${danger ? 'btn-danger' : 'btn-primary'}`,
    onClick: () => { haptic(); close(); onConfirm(); },
  }, confirmLabel);

  dialog.appendChild(h('div', { className: 'btn-row' }, cancelBtn, confirmBtn));
  overlay.appendChild(dialog);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.body.appendChild(overlay);
};

// Long-press handler
export const attachLongPress = (el, onLong, onTap, ms = 500) => {
  let timer = null;
  let longFired = false;

  const start = () => {
    longFired = false;
    timer = setTimeout(() => {
      longFired = true;
      haptic(20);
      onLong();
    }, ms);
  };
  const end = () => {
    clearTimeout(timer);
    if (!longFired && onTap) {
      haptic();
      onTap();
    }
  };
  const cancel = () => clearTimeout(timer);

  el.addEventListener('touchstart', start, { passive: true });
  el.addEventListener('touchend', end);
  el.addEventListener('touchcancel', cancel);
  el.addEventListener('mousedown', start);
  el.addEventListener('mouseup', end);
  el.addEventListener('mouseleave', cancel);
};

export const expandable = ({ titleEl, defaultOpen = false, contentEl }) => {
  const wrap = h('div', { className: defaultOpen ? 'expanded' : '' });
  const chev = icon(ICONS.chevright, 18, 'chev');
  const trigger = h('button', { className: 'expand-toggle' }, titleEl, chev);
  const content = h('div', { style: { display: defaultOpen ? 'block' : 'none', marginTop: '16px' } }, contentEl);

  let open = defaultOpen;
  trigger.addEventListener('click', () => {
    open = !open;
    content.style.display = open ? 'block' : 'none';
    wrap.classList.toggle('expanded', open);
  });

  wrap.appendChild(trigger);
  wrap.appendChild(content);
  return wrap;
};

export const sectionHeader = (title, subtitle) => {
  const wrap = h('div', { style: { marginBottom: '12px' } });
  wrap.appendChild(h('h2', { className: 'display' }, title));
  if (subtitle) wrap.appendChild(h('p', { className: 'section-sub' }, subtitle));
  return wrap;
};
