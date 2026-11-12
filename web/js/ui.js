/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Interface Primitives (Terrane Edition - v1.0)
 *     - File Name: ui.js
 *     - Relative Path: web/js/ui.js
 *     - Artifact Type: javascript
 *     - Version: 1.0.0
 *     - Date: 11/09/2026
 *     - Update: Monday, November 9, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Fable 5.2
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Description:
 *     The small set of interface parts every Terrane panel is built from:
 *     element construction, the context menu, modal dialogs, notices with
 *     an optional action, the hover tip and a virtual list for folders with
 *     tens of thousands of rows. Nothing here knows about the filesystem.
 *
 * ✒ Key Features:
 *     - One floating surface at a time: opening a menu, dialog or tip
 *       closes whichever other one is open
 *     - Context menu with full keyboard operation (arrows, Home, End,
 *       Enter, Escape) and focus returned to where it came from
 *     - Unavailable menu items are inert, are not styled as clickable, and
 *       state the reason they are unavailable
 *     - Dialogs use the native dialog element, so focus trapping and
 *       Escape handling come from the browser
 *     - Notices are announced through a polite live region and can carry
 *       one action (used for Undo and Keep both)
 *     - Virtual list renders only visible rows and supports roving
 *       keyboard focus
 *
 * ✒ Usage Instructions:
 *     import { el, openMenu, ask, notice, tip, VirtualList } from './ui.js';
 *     openMenu(x, y, [{ label: 'Rename', hint: 'F2', run }, 'sep', ...]);
 *     const values = await ask({ title, fields: [{ name, label, value }] });
 *     notice('Moved 3 items', { action: { label: 'Undo', run: undo } });
 *
 * ✒ Other Important Information:
 *     - Dependencies: none
 *     - Compatible platforms: browsers supporting the dialog element
 * ----------------------------------------------------------------------------
 */

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

/* ---------- one floating surface at a time ---------- */

let closeCurrent = null;
function claim(closer) {
  if (closeCurrent) closeCurrent();
  closeCurrent = closer;
}
export function closeFloating() {
  if (closeCurrent) closeCurrent();
  closeCurrent = null;
}
export const floatingOpen = () => closeCurrent !== null;

/* ---------- context menu ---------- */

export function openMenu(x, y, items, { title } = {}) {
  const host = document.getElementById('menu');
  const returnTo = document.activeElement;
  hideTip();
  const close = () => {
    host.hidden = true;
    host.replaceChildren();
    document.removeEventListener('pointerdown', outside, true);
    if (closeCurrent === close) closeCurrent = null;
    returnTo?.focus?.({ preventScroll: true });
  };
  const outside = (e) => { if (!host.contains(e.target)) close(); };
  claim(close);
  host.replaceChildren();
  if (title) host.append(el('div', { class: 'menu-title', text: title }));
  for (const item of items) {
    if (item === 'sep') {
      host.append(el('div', { class: 'menu-sep', role: 'separator' }));
      continue;
    }
    const off = !!item.disabled;
    const row = el('button', {
      class: `menu-item${item.danger ? ' is-danger' : ''}`, role: 'menuitem', type: 'button',
      'aria-disabled': off ? 'true' : null, tabindex: '-1', title: off ? item.reason || '' : null,
    }, el('span', { class: 'menu-label', text: item.label }), off && item.reason
      ? el('span', { class: 'menu-why', text: item.reason }) : item.hint ? el('kbd', { text: item.hint }) : null);
    if (!off) row.addEventListener('click', () => { close(); item.run(); });
    host.append(row);
  }
  host.hidden = false;
  const r = host.getBoundingClientRect();
  host.style.left = `${Math.max(8, Math.min(x, window.innerWidth - r.width - 8))}px`;
  host.style.top = `${Math.max(8, Math.min(y, window.innerHeight - r.height - 8))}px`;
  const live = () => [...host.querySelectorAll('.menu-item:not([aria-disabled])')];
  host.onkeydown = (e) => {
    const list = live();
    const i = list.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') list[(i + 1) % list.length]?.focus();
    else if (e.key === 'ArrowUp') list[(i - 1 + list.length) % list.length]?.focus();
    else if (e.key === 'Home') list[0]?.focus();
    else if (e.key === 'End') list.at(-1)?.focus();
    else if (e.key === 'Escape' || e.key === 'Tab') close();
    else return;
    e.preventDefault();
    e.stopPropagation();
  };
  live()[0]?.focus();
  setTimeout(() => document.addEventListener('pointerdown', outside, true), 0);
}

/* ---------- dialogs ---------- */

/**
 * Modal question. Resolves to an object of field values (empty object when
 * there are no fields) or null when dismissed.
 */
export function ask({ title, body, fields = [], confirm = 'Confirm', danger = false, validate, cancel = true }) {
  return new Promise((resolve) => {
    closeFloating();
    const dlg = document.getElementById('dialog');
    const error = el('p', { class: 'dialog-error', role: 'alert' });
    const inputs = fields.map((f) => el('input', { type: 'text', name: f.name, value: f.value ?? '', autocomplete: 'off', spellcheck: 'false', 'aria-label': f.label }));
    const form = el('form', { method: 'dialog', class: 'dialog-form' },
      el('h2', { text: title }),
      body ? (typeof body === 'string' ? el('p', { class: 'dialog-body', text: body }) : body) : null,
      fields.map((f, i) => el('label', { class: 'field' }, el('span', { text: f.label }), inputs[i])),
      error,
      el('div', { class: 'dialog-actions' },
        cancel ? el('button', { type: 'button', class: 'btn', text: 'Cancel', onclick: () => dlg.close('cancel') }) : null,
        el('button', { type: 'submit', class: `btn ${danger ? 'btn-danger' : 'btn-primary'}`, text: confirm })));
    form.addEventListener('submit', (e) => {
      const values = Object.fromEntries(inputs.map((i) => [i.name, i.value]));
      const problem = validate?.(values);
      if (problem) {
        e.preventDefault();
        error.textContent = problem;
        return;
      }
      dlg.returnValue = 'ok';
      dlg._values = values;
    });
    dlg.replaceChildren(form);
    dlg.onclose = () => {
      if (closeCurrent === closer) closeCurrent = null;
      resolve(dlg.returnValue === 'ok' ? dlg._values || {} : null);
    };
    const closer = () => dlg.open && dlg.close('cancel');
    closeCurrent = closer;
    dlg.returnValue = '';
    dlg.showModal();
    if (inputs[0]) {
      inputs[0].focus();
      const v = inputs[0].value;
      const dot = fields[0].selectStem ? v.lastIndexOf('.') : -1;
      inputs[0].setSelectionRange(0, dot > 0 ? dot : v.length);
    }
  });
}

/* ---------- notices ---------- */

export function notice(message, { kind = 'ok', action, ms } = {}) {
  const host = document.getElementById('notices');
  const item = el('div', { class: `notice is-${kind}`, role: kind === 'error' ? 'alert' : 'status' },
    el('span', { class: 'notice-mark', 'aria-hidden': 'true', text: kind === 'error' ? '!' : kind === 'info' ? 'i' : '✓' }),
    el('span', { class: 'notice-text', text: message }));
  const drop = () => item.remove();
  if (action) item.append(el('button', { class: 'btn btn-small', type: 'button', text: action.label, onclick: () => { drop(); action.run(); } }));
  item.append(el('button', { class: 'notice-close', type: 'button', 'aria-label': 'Dismiss', text: '×', onclick: drop }));
  host.append(item);
  while (host.children.length > 4) host.firstChild.remove();
  setTimeout(drop, ms ?? (kind === 'error' ? 12000 : action ? 9000 : 4500));
}

/* ---------- hover tip ---------- */

export function tip(x, y, lines) {
  if (floatingOpen()) return;
  const host = document.getElementById('tip');
  host.replaceChildren(...lines.map((l, i) => el('div', { class: i === 0 ? 'tip-name' : 'tip-line', text: l })));
  host.hidden = false;
  const r = host.getBoundingClientRect();
  host.style.left = `${Math.min(x + 16, window.innerWidth - r.width - 8)}px`;
  host.style.top = `${Math.min(y + 18, window.innerHeight - r.height - 8)}px`;
}
export function hideTip() {
  document.getElementById('tip').hidden = true;
}

/* ---------- virtual list ---------- */

export class VirtualList {
  constructor(host, { rowHeight = 30, render, onKey }) {
    this.host = host;
    this.rowHeight = rowHeight;
    this.render = render;
    this.items = [];
    this.cursor = 0;
    this.spacer = el('div', { class: 'vl-spacer' });
    this.rows = el('div', { class: 'vl-rows' });
    host.classList.add('vl');
    host.tabIndex = 0;
    host.setAttribute('role', 'listbox');
    host.replaceChildren(this.spacer, this.rows);
    host.addEventListener('scroll', () => this.draw(true));
    new ResizeObserver(() => this.draw()).observe(host);
    host.addEventListener('keydown', (e) => {
      const n = this.items.length;
      if (!n) return;
      const page = Math.max(1, Math.floor(host.clientHeight / rowHeight) - 1);
      let c = this.cursor;
      if (e.key === 'ArrowDown') c++;
      else if (e.key === 'ArrowUp') c--;
      else if (e.key === 'PageDown') c += page;
      else if (e.key === 'PageUp') c -= page;
      else if (e.key === 'Home') c = 0;
      else if (e.key === 'End') c = n - 1;
      else {
        onKey?.(e, this.items[this.cursor], this.cursor);
        return;
      }
      e.preventDefault();
      this.setCursor(Math.max(0, Math.min(n - 1, c)), true);
      onKey?.(e, this.items[this.cursor], this.cursor);
    });
  }

  setItems(items, keepScroll = false) {
    this.items = items;
    this.cursor = Math.min(this.cursor, Math.max(0, items.length - 1));
    this.spacer.style.height = `${items.length * this.rowHeight}px`;
    if (!keepScroll) this.host.scrollTop = 0;
    this.draw();
  }

  setCursor(i, scroll) {
    this.cursor = i;
    if (scroll) {
      const top = i * this.rowHeight;
      if (top < this.host.scrollTop) this.host.scrollTop = top;
      else if (top + this.rowHeight > this.host.scrollTop + this.host.clientHeight) this.host.scrollTop = top + this.rowHeight - this.host.clientHeight;
    }
    this.draw();
  }

  draw(scrollOnly = false) {
    const { host, rowHeight, items } = this;
    const first = Math.max(0, Math.floor(host.scrollTop / rowHeight) - 4);
    const last = Math.min(items.length, Math.ceil((host.scrollTop + host.clientHeight) / rowHeight) + 4);
    // A scroll that stays inside the rendered window keeps its rows, so
    // an element under the pointer is not replaced mid-gesture.
    if (scrollOnly && first === this.first && last === this.last) return;
    this.first = first;
    this.last = last;
    const frag = [];
    for (let i = first; i < last; i++) {
      const row = this.render(items[i], i);
      row.style.transform = `translateY(${i * rowHeight}px)`;
      row.classList.toggle('is-cursor', i === this.cursor);
      row.setAttribute('role', 'option');
      frag.push(row);
    }
    this.rows.replaceChildren(...frag);
  }
}
