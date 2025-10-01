/*
  A11y Widget MVP v0.1 – Embeddable JS
  ------------------------------------
  Goals:
    • Single <script> drop-in that renders a floating Accessibility button.
    • Opens a panel with: Font Size ±, High Contrast, Dyslexia-Friendly Font, Read Aloud, Voice Commands (beta).
    • Stores user prefs in localStorage and applies site-wide via CSS classes.

  Usage:
    <script src="/a11y-widget.v0.1.min.js" defer></script>
    <script>window.A11yWidget && A11yWidget.init({ position: 'right', accent: '#1e88e5' });</script>

  Notes:
    • No external dependencies. Works on any site.
    • Voice commands use Web Speech API (where available). Safe fallback when unsupported.
    • Keep bundle small; no frameworks. This is a framework-agnostic widget.
*/
(function () {
  const W = (window.A11yWidget = window.A11yWidget || {});
  if (W.__initd) return; W.__initd = true;

  const DEFAULTS = {
    position: 'right', // 'right' | 'left'
    bottom: '24px',
    sideOffset: '24px',
    accent: '#1e88e5',
    zIndex: 999999,
    readVoice: null, // e.g., 'Samantha' (optional)
  };

  const KEYS = {
    rootClass: 'a11y-root',
    active: 'data-a11y-active',
    contrast: 'a11y-contrast',
    dyslexia: 'a11y-dyslexia',
    base: 'a11y-base',
  };

  const PREFS_KEY = '__a11y_prefs__';
  const prefs = loadPrefs();

  function loadPrefs() {
    try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); } catch { return {}; }
  }
  function savePrefs() {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch {}
  }

  function applyPrefs() {
    const html = document.documentElement;
    html.classList.add(KEYS.base);
    html.style.setProperty('--a11y-font-scale', String(prefs.fontScale || 1));
    if (prefs.contrast) html.classList.add(KEYS.contrast); else html.classList.remove(KEYS.contrast);
    if (prefs.dyslexia) html.classList.add(KEYS.dyslexia); else html.classList.remove(KEYS.dyslexia);
  }

  function ensureStyles(accent, zIndex) {
    if (document.getElementById('a11y-style')) return;
    const css = `
      :root { --a11y-accent: ${accent}; }
      html.${KEYS.base} { font-size: calc(16px * var(--a11y-font-scale, 1)); }
      html.${KEYS.contrast} { filter: contrast(120%); }
      html.${KEYS.contrast} img, html.${KEYS.contrast} video { filter: contrast(100%) !important; }
      @font-face { font-family: 'OpenDyslexic'; font-style: normal; font-weight: 400; src: local('OpenDyslexic'); }
      html.${KEYS.dyslexia} * { font-family: 'OpenDyslexic', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif !important; }
      .a11y-btn { position: fixed; bottom: var(--a11y-bottom); inset-inline-end: var(--a11y-side); z-index: ${zIndex};
        width: 56px; height: 56px; border-radius: 50%; background: var(--a11y-accent); color: #fff; display:flex; align-items:center; justify-content:center;
        box-shadow: 0 6px 18px rgba(0,0,0,.2); border: none; cursor: pointer; }
      .a11y-btn:focus { outline: 3px solid #fff; outline-offset: 3px; }
      .a11y-panel { position: fixed; bottom: calc(var(--a11y-bottom) + 64px); inset-inline-end: var(--a11y-side); z-index: ${zIndex};
        background: #fff; color: #111; width: min(92vw, 340px); border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,.25); border: 1px solid #eee; display:none; }
      .a11y-panel[${KEYS.active}="true"] { display:block; }
      .a11y-hdr { padding: 12px 14px; font-weight: 700; border-bottom: 1px solid #eee; display:flex; align-items:center; gap:8px; }
      .a11y-row { display:flex; align-items:center; justify-content:space-between; padding: 12px 14px; gap: 10px; }
      .a11y-row + .a11y-row { border-top: 1px solid #f3f3f3; }
      .a11y-actions { display:flex; gap: 8px; }
      .a11y-chip, .a11y-ctrl { border: 1px solid #ddd; background:#fafafa; border-radius: 8px; padding: 8px 10px; cursor:pointer; }
      .a11y-ctrl:focus, .a11y-chip:focus { outline: 2px solid var(--a11y-accent); outline-offset: 2px; }
      .a11y-note { font-size: 12px; color: #666; padding: 8px 14px 14px; }
    `;
    const style = document.createElement('style');
    style.id = 'a11y-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function createEl(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    });
    children.forEach(c => el.appendChild(c));
    return el;
  }

  function say(text) {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    if (DEFAULTS.readVoice && speechSynthesis.getVoices) {
      const v = speechSynthesis.getVoices().find(v => v.name === DEFAULTS.readVoice);
      if (v) u.voice = v;
    }
    speechSynthesis.speak(u);
  }

  let recognizing = false; let rec;
  function startVoice(onCommand) {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return false;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    rec = new SR(); rec.lang = 'en-US'; rec.continuous = true; rec.interimResults = false;
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          const phrase = e.results[i][0].transcript.trim().toLowerCase();
          onCommand(phrase);
        }
      }
    };
    rec.onend = () => { recognizing = false; };
    rec.start(); recognizing = true; return true;
  }
  function stopVoice() { if (rec && recognizing) { rec.stop(); recognizing = false; } }

  function handleCommand(phrase, api) {
    const p = phrase.toLowerCase();
    if (/increase (?:text|font)/.test(p) || /bigger text/.test(p)) api.fontPlus();
    else if (/decrease (?:text|font)/.test(p) || /smaller text/.test(p)) api.fontMinus();
    else if (/(?:high )?contrast (?:on|enable)/.test(p)) api.toggleContrast(true);
    else if (/(?:high )?contrast (?:off|disable)/.test(p)) api.toggleContrast(false);
    else if (/read (?:page|this)/.test(p)) api.readPage();
    else if (/open (?:menu|panel)/.test(p)) api.open();
    else if (/(?:close|hide) (?:menu|panel)/.test(p)) api.close();
  }

  function clamp(n, mi, ma) { return Math.max(mi, Math.min(ma, n)); }

  W.init = function init(options = {}) {
    const opts = Object.assign({}, DEFAULTS, options);
    document.documentElement.style.setProperty('--a11y-bottom', opts.bottom);
    document.documentElement.style.setProperty('--a11y-side', opts.sideOffset);

    ensureStyles(opts.accent, opts.zIndex);
    applyPrefs();

    const btn = createEl('button', { class: 'a11y-btn', 'aria-label': 'Accessibility options', title: 'Accessibility options' }, [
      createEl('span', { 'aria-hidden': 'true', text: '♿' })
    ]);

    const panel = createEl('div', { class: 'a11y-panel', [KEYS.active]: 'false', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Accessibility menu' }, [
      createEl('div', { class: 'a11y-hdr' }, [
        createEl('span', { text: 'Accessibility' })
      ]),
      // Font size
      createEl('div', { class: 'a11y-row' }, [
        createEl('div', { text: 'Text size' }),
        createEl('div', { class: 'a11y-actions' }, [
          createEl('button', { class: 'a11y-ctrl', 'aria-label': 'Decrease text', onclick: fontMinus }),
          createEl('button', { class: 'a11y-ctrl', 'aria-label': 'Increase text', onclick: fontPlus }),
        ])
      ]),
      // Contrast
      createEl('div', { class: 'a11y-row' }, [
        createEl('div', { text: 'High contrast' }),
        createEl('div', { class: 'a11y-actions' }, [
          createEl('button', { class: 'a11y-chip', 'aria-pressed': String(!!prefs.contrast), onclick: () => toggleContrast() }, [document.createTextNode('Toggle')])
        ])
      ]),
      // Dyslexia
      createEl('div', { class: 'a11y-row' }, [
        createEl('div', { text: 'Dyslexia-friendly font' }),
        createEl('div', { class: 'a11y-actions' }, [
          createEl('button', { class: 'a11y-chip', 'aria-pressed': String(!!prefs.dyslexia), onclick: () => toggleDyslexia() }, [document.createTextNode('Toggle')])
        ])
      ]),
      // Read aloud
      createEl('div', { class: 'a11y-row' }, [
        createEl('div', { text: 'Read page' }),
        createEl('div', { class: 'a11y-actions' }, [
          createEl('button', { class: 'a11y-ctrl', 'aria-label': 'Read this page', onclick: readPage }, [document.createTextNode('Read')])
        ])
      ]),
      // Voice commands
      createEl('div', { class: 'a11y-row' }, [
        createEl('div', { text: 'Voice commands (beta)' }),
        createEl('div', { class: 'a11y-actions' }, [
          createEl('button', { class: 'a11y-ctrl', 'aria-label': 'Start voice recognition', onclick: startStopVoice }, [document.createTextNode('Start/Stop')])
        ])
      ]),
      createEl('div', { class: 'a11y-note', text: 'Prefs saved to your browser. Voice features depend on device support.' })
    ]);

    function openPanel() { panel.setAttribute(KEYS.active, 'true'); panel.focus(); }
    function closePanel() { panel.setAttribute(KEYS.active, 'false'); }

    btn.addEventListener('click', () => {
      const isOpen = panel.getAttribute(KEYS.active) === 'true';
      if (isOpen) closePanel(); else openPanel();
    });

    function fontPlus() { prefs.fontScale = clamp((prefs.fontScale || 1) + 0.1, 0.7, 2.0); applyPrefs(); savePrefs(); say('Text larger'); }
    function fontMinus() { prefs.fontScale = clamp((prefs.fontScale || 1) - 0.1, 0.7, 2.0); applyPrefs(); savePrefs(); say('Text smaller'); }
    function toggleContrast(force) { prefs.contrast = typeof force === 'boolean' ? force : !prefs.contrast; applyPrefs(); savePrefs(); say('Contrast toggled'); updatePressedStates(); }
    function toggleDyslexia(force) { prefs.dyslexia = typeof force === 'boolean' ? force : !prefs.dyslexia; applyPrefs(); savePrefs(); say('Font updated'); updatePressedStates(); }

    function updatePressedStates() {
      panel.querySelectorAll('.a11y-row .a11y-chip').forEach((el, i) => {
        const pressed = i === 0 ? !!prefs.contrast : !!prefs.dyslexia;
        el.setAttribute('aria-pressed', String(pressed));
      });
    }

    function readPage() {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => (n.textContent && n.textContent.trim().length > 0) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
      });
      let text = '';
      let node;
      let count = 0; const MAX = 2000; // avoid extremely long reads
      while ((node = walker.nextNode()) && text.length < MAX) {
        const t = node.textContent.trim();
        if (t) { text += (t + ' '); count++; }
      }
      if (text) say(text.slice(0, MAX));
    }

    function startStopVoice() {
      if (recognizing) { stopVoice(); return; }
      const ok = startVoice((phrase) => handleCommand(phrase, api));
      if (!ok) alert('Voice recognition not supported on this device.');
    }

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    const api = { open: openPanel, close: closePanel, fontPlus, fontMinus, toggleContrast, toggleDyslexia, readPage };
    W.api = api; // exposed for advanced use

    // Keyboard: open panel with Alt+Shift+A
    window.addEventListener('keydown', (e) => {
      if (e.altKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) { e.preventDefault(); openPanel(); }
    });

    // Accessibility: close on Escape
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanel(); });

    // Initial aria states
    updatePressedStates();
  };
})();
