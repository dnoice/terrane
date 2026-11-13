/*
 * ============================================================================
 * ✒ Metadata
 *     - Title: Interface Primitives (Terrane Edition - v1.3)
 *     - File Name: ui.js
 *     - Relative Path: web/js/ui.js
 *     - Artifact Type: javascript
 *     - Version: 1.3.0
 *     - Date: 11/13/2026
 *     - Update: Friday, November 13, 2026
 *     - Author: Dennis 'dendogg' Smaltz
 *     - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
 *     - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!
 *
 * ✒ Changelog:
 *     - 1.3.0 (11/13/2026) [dendogg + Anthropic - Claude Opus 5.5] —
 *       Unavailable menu items are reached by the arrows and carry
 *       their reason as their description; the menu stops the browser's
 *       own context menu the Menu key would open over it. The virtual
 *       list keeps its cursor on its item when the list is redrawn, has
 *       a name and says several rows can be selected; ask() can start
 *       on its confirm button. A closed menu keeps its items while it
 *       fades out; an empty list shows the sentence setEmpty gives it,
 *       and its name carries the same words.
 *     - 1.2.0 (11/12/2026) [dendogg + Anthropic - Claude Opus 5.5] — Menu
 *       items and notices carry icons; the menu and tip are placed by
 *       Floating UI and unfold from the pointer's corner; notices show
 *       their time left, pause it under the pointer, and leave with an
 *       animation while their neighbours slide (FLIP); the virtual list
 *       cascades rows in when its items change; slideIndicator moves the
 *       ink plate of a tab strip or segmented switch.
 *     - 1.1.0 (11/11/2026) [dendogg + Anthropic - Claude Opus 5.5] — The
 *       hover tip can carry a picture below its lines.
 *     Earlier entries: see CHANGELOG.md
 *
 * ✒ Description:
 *     The small set of interface parts every Terrane panel is built from:
 *     element construction, the context menu, modal dialogs, notices with
 *     an optional action, the hover tip, sliding indicators and a virtual
 *     list for folders with tens of thousands of rows. Nothing here knows
 *     about the filesystem.
 *
 * ✒ Key Features:
 *     - One floating surface at a time: opening a menu, dialog or tip
 *       closes whichever other one is open
 *     - Context menu with icons and full keyboard operation (arrows, Home,
 *       End, Enter, Escape), focus returned to where it came from
 *     - Unavailable menu items are reached by the arrows, do nothing, are
 *       not styled as clickable, and give their reason as their
 *       description
 *     - Dialogs use the native dialog element, so focus trapping and
 *       Escape handling come from the browser
 *     - Notices are announced through a polite live region, can carry one
 *       action (Undo, Keep both), and wait while the pointer rests on them
 *     - Virtual list renders only visible rows, keeps its cursor on its
 *       item across a redraw, has a name, supports roving keyboard
 *       focus, and marks a fresh list so its rows can cascade in; empty,
 *       it says so in a sentence (setEmpty) and in its name
 *     - slideIndicator(container, item) for tab strips and switches
 *
 * ✒ Usage Instructions:
 *     import { el, openMenu, ask, notice, tip, VirtualList } from './ui.js';
 *     openMenu(x, y, [{ label: 'Rename', icon: 'rename', hint: 'F2', run }, 'sep']);
 *     const values = await ask({ title, fields: [{ name, label, value }] });
 *     notice('Moved 3 items', { action: { label: 'Undo', run: undo } });
 *     list.setEmpty('This folder is empty.');
 *
 * ✒ Other Important Information:
 *     - Dependencies: icons.js, float.js, motion.js
 *     - Compatible platforms: browsers supporting the dialog element
 * ----------------------------------------------------------------------------
 */

import { icon } from './icons.js';
import { placeAt } from './float.js';
import { flip, reduced } from './motion.js';

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

// How long a closed menu keeps its items: a little over its fade out
// (--dur-instant in floating.css).
const MENU_FADE = 160;
let menuSeq = 0;

export function openMenu(x, y, items, { title } = {}) {
  const host = document.getElementById('menu');
  const returnTo = document.activeElement;
  hideTip();
  // Closing keeps the items while the stylesheet fades the menu out, then
  // lets them go, unless another menu has opened in the meantime.
  const close = () => {
    host.hidden = true;
    const ticket = ++menuSeq;
    setTimeout(() => { if (ticket === menuSeq && host.hidden) host.replaceChildren(); }, MENU_FADE);
    document.removeEventListener('pointerdown', outside, true);
    if (closeCurrent === close) closeCurrent = null;
    returnTo?.focus?.({ preventScroll: true });
  };
  const outside = (e) => { if (!host.contains(e.target)) close(); };
  claim(close);
  menuSeq++;
  host.replaceChildren();
  if (title) host.append(el('div', { class: 'menu-title', text: title }));
  let seq = 0;
  for (const item of items) {
    if (item === 'sep') {
      host.append(el('div', { class: 'menu-sep', role: 'separator' }));
      continue;
    }
    const off = !!item.disabled;
    // An unavailable item is still reached by the arrow keys, as the menu
    // pattern asks, and its reason is its description, so a screen reader
    // hears that the action exists and why it is off. It does nothing.
    const why = off && item.reason ? el('span', { class: 'menu-why', id: `menu-why-${++seq}`, text: item.reason }) : null;
    const row = el('button', {
      class: `menu-item${item.danger ? ' is-danger' : ''}`, role: 'menuitem', type: 'button',
      'aria-disabled': off ? 'true' : null, 'aria-describedby': why ? why.id : null, tabindex: '-1', title: off ? item.reason || '' : null,
    }, item.icon ? icon(item.icon) : null, el('span', { class: 'menu-label', text: item.label }), why || (item.hint ? el('kbd', { text: item.hint }) : null));
    if (!off) row.addEventListener('click', () => { close(); item.run(); });
    host.append(row);
  }
  host.hidden = false;
  placeAt(host, x, y, { placement: 'bottom-start', gap: 2, cross: 2 });
  // The Menu key and Shift+F10 also send the browser's own contextmenu
  // event, to the element focused by then: one of these items. Left alone
  // it would open the browser's menu over this one and take the keys.
  host.oncontextmenu = (e) => e.preventDefault();
  const every = () => [...host.querySelectorAll('.menu-item')];
  const live = () => [...host.querySelectorAll('.menu-item:not([aria-disabled])')];
  host.onkeydown = (e) => {
    const list = every();
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
  // The first item that can act takes focus; the arrows reach every one.
  (live()[0] || every()[0])?.focus();
  setTimeout(() => document.addEventListener('pointerdown', outside, true), 0);
}

/* ---------- dialogs ---------- */

/**
 * Modal question. Resolves to an object of field values (empty object when
 * there are no fields) or null when dismissed.
 */
export function ask({ title, body, fields = [], confirm = 'Confirm', danger = false, validate, cancel = true, confirmIcon, focusConfirm = false }) {
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
        el('button', { type: 'submit', class: `btn btn-raised ${danger ? 'btn-danger' : 'btn-primary'}`, autofocus: focusConfirm || null },
          confirmIcon || danger ? icon(confirmIcon || 'remove') : null, confirm)));
    form.addEventListener('submit', (e) => {
      const values = Object.fromEntries(inputs.map((i) => [i.name, i.value]));
      const problem = validate?.(values);
      if (problem) {
        e.preventDefault();
        error.textContent = problem;
        // Restart the nudge, so a repeated refusal is felt again.
        error.style.animation = 'none';
        void error.offsetWidth;
        error.style.animation = '';
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

const NOTICE_ICON = { ok: 'ok', error: 'error', info: 'info' };

export function notice(message, { kind = 'ok', action, ms } = {}) {
  const host = document.getElementById('notices');
  const life = ms ?? (kind === 'error' ? 12000 : action ? 9000 : 4500);
  const item = el('div', { class: `notice is-${kind}`, role: kind === 'error' ? 'alert' : 'status' },
    el('span', { class: 'notice-mark', 'aria-hidden': 'true' }, icon(NOTICE_ICON[kind] || 'info')),
    el('span', { class: 'notice-text', text: message }));
  item.style.setProperty('--life', `${life}ms`);
  let gone = false;
  const drop = () => {
    if (gone) return;
    gone = true;
    clearTimeout(timer);
    if (reduced() || !item.isConnected) return flip(host, () => item.remove());
    item.classList.add('is-leaving');
    setTimeout(() => flip(host, () => item.remove()), 150);
    return undefined;
  };
  if (action) item.append(el('button', { class: 'btn btn-small', type: 'button', text: action.label, onclick: () => { drop(); action.run(); } }));
  item.append(el('button', { class: 'notice-close', type: 'button', 'aria-label': 'Dismiss', onclick: drop }, icon('close')));
  flip(host, () => {
    host.append(item);
    while (host.children.length > 4) host.firstChild.remove();
  });
  // The time left runs only while nobody is reading it.
  let left = life;
  let started = performance.now();
  let timer = setTimeout(drop, left);
  item.addEventListener('pointerenter', () => {
    clearTimeout(timer);
    left -= performance.now() - started;
  });
  item.addEventListener('pointerleave', () => {
    started = performance.now();
    timer = setTimeout(drop, Math.max(600, left));
  });
}

/* ---------- hover tip ---------- */

export function tip(x, y, lines, picture = null) {
  if (floatingOpen()) return;
  const host = document.getElementById('tip');
  // replaceChildren would print a null argument as the text "null".
  host.replaceChildren(...lines.map((l, i) => el('div', { class: i === 0 ? 'tip-name' : 'tip-line', text: l })),
    ...(picture ? [el('div', { class: 'tip-pic' }, picture)] : []));
  host.hidden = false;
  placeAt(host, x, y, { placement: 'bottom-start', gap: 18, cross: 16, padding: 10 });
}
export function hideTip() {
  document.getElementById('tip').hidden = true;
}

/* ---------- sliding indicators ---------- */

/**
 * Moves the ink plate or underline of a tab strip or switch under the
 * chosen item. The container's ::before or ::after reads --ind-x/--ind-w.
 */
export function slideIndicator(container, item) {
  if (!container || !item || !item.offsetWidth) return;
  container.style.setProperty('--ind-x', `${item.offsetLeft}px`);
  container.style.setProperty('--ind-w', `${item.offsetWidth}px`);
  container.dataset.ind = '';
}

/* ---------- virtual list ---------- */

export class VirtualList {
  constructor(host, { rowHeight = 30, render, onKey, label = '', multiple = false }) {
    this.host = host;
    this.rowHeight = rowHeight;
    this.render = render;
    this.items = [];
    this.cursor = 0;
    this.entering = 0;
    this.empty = '';
    this.label = label || null;
    this.spacer = el('div', { class: 'vl-spacer' });
    this.rows = el('div', { class: 'vl-rows' });
    // What an empty list says where its rows would be. It is drawn for the
    // eye only: the list's name carries the same sentence (setEmpty).
    this.note = el('p', { class: 'vl-empty', 'aria-hidden': 'true', hidden: true });
    host.classList.add('vl');
    host.tabIndex = 0;
    host.setAttribute('role', 'listbox');
    if (label) host.setAttribute('aria-label', label);
    if (multiple) host.setAttribute('aria-multiselectable', 'true');
    host.replaceChildren(this.spacer, this.rows, this.note);
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

  /**
   * Shows items. The cursor stays on the item it was on wherever that item
   * now stands, else on `follow` (the selection) when given and listed,
   * else at the same row as near as the list allows: a list reordered
   * under the cursor never leaves it on another item unseen.
   */
  setItems(items, keepScroll = false, { follow = null } = {}) {
    const fresh = !keepScroll && items !== this.items;
    const was = this.items[this.cursor];
    this.items = items;
    let at = was === undefined ? -1 : items.indexOf(was);
    if (at < 0 && follow != null) at = items.indexOf(follow);
    this.cursor = at >= 0 ? at : Math.min(this.cursor, Math.max(0, items.length - 1));
    this.spacer.style.height = `${items.length * this.rowHeight}px`;
    this.note.hidden = !!items.length || !this.empty;
    if (this.label != null) this.setLabel(this.label);
    if (!keepScroll) this.host.scrollTop = 0;
    // A new list cascades in; a redraw of the same one does not.
    if (fresh && items.length) {
      this.host.classList.add('is-entering');
      clearTimeout(this.entering);
      this.entering = setTimeout(() => this.host.classList.remove('is-entering'), 520);
    }
    this.draw();
  }

  /** Names the list for assistive technology, as what it shows changes. */
  setLabel(label) {
    this.label = label;
    const name = !this.items.length && this.empty ? `${label}: ${this.empty}` : label;
    if (this.host.getAttribute('aria-label') !== name) this.host.setAttribute('aria-label', name);
  }

  /**
   * The sentence the list shows while it holds no items, such as "This
   * folder is empty."; '' shows nothing. It is kept until set again.
   */
  setEmpty(text = '') {
    this.empty = text;
    this.note.textContent = text;
    this.note.hidden = !!this.items.length || !text;
    if (this.label != null) this.setLabel(this.label);
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
    const top = Math.floor(host.scrollTop / rowHeight);
    const frag = [];
    for (let i = first; i < last; i++) {
      const row = this.render(items[i], i);
      row.style.transform = `translateY(${i * rowHeight}px)`;
      row.style.setProperty('--i', String(Math.max(0, i - top)));
      row.classList.toggle('is-cursor', i === this.cursor);
      row.setAttribute('role', 'option');
      frag.push(row);
    }
    this.rows.replaceChildren(...frag);
  }
}
