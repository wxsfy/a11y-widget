/*
  A11y Widget v0.3 – Polished UX (with shipping patches)
  - Text size +/−/Reset with live % label
  - Theme modes: default | high-contrast | dark | sepia
  - Read Aloud: read page / selection, pause/resume/stop, cancels previous
  - Voice commands with transcript chip
  - Better OpenDyslexic handling (local if present; optional CDN fallback)
  - Patches: offset vars, sr-only, scoped theming, idempotent mount & destroy, CSP nonce, system-theme default, async TTS voice
*/
(function(){
  const W = (window.A11yWidget = window.A11yWidget || {});
  if (W.__initd) return; W.__initd = true;

  const DEFAULTS = {
    position: 'right',
    bottom: '24px',
    sideOffset: '24px',
    accent: '#1e88e5',
    zIndex: 999999,
    readVoice: null,
    styleNonce: undefined, // CSP nonce (optional)
  };

  const KEYS = {
    base: 'a11y-base',
    dyslexia: 'a11y-dyslexia',
    theme: 'data-a11y-theme', // default|contrast|dark|sepia
    active: 'data-a11y-active',
  };

  const PREFS_KEY = '__a11y_prefs__';
  const prefs = loadPrefs();

  function loadPrefs(){ try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); } catch { return {}; } }
  function savePrefs(){ try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch {} }
  function clamp(n, mi, ma){ return Math.max(mi, Math.min(ma, n)); }
  const pct = v => Math.round(v*100);

  // NOTE: now respects CSS vars for bottom/side, adds sr-only and scopes body theming
  function ensureStyles(accent, zIndex, nonce){
    if (document.getElementById('a11y-style')) return;
    const css = [
      // Theme tokens + placement (use existing CSS vars if set)
      ':root{ --a11y-accent:'+accent+'; --a11y-bottom:var(--a11y-bottom,24px); --a11y-side:var(--a11y-side,24px); --a11y-fg:#111; --a11y-bg:#fff; }',
      "@font-face{ font-family:'OpenDyslexic'; font-style:normal; font-weight:400; src: local('OpenDyslexic'), local('OpenDyslexic Regular'); }",
      'html.'+KEYS.base+'{ font-size: calc(16px * var(--a11y-font-scale,1)); }',

      // Themes via data attr
      'html['+KEYS.theme+'="default"]{ --a11y-fg:#111; --a11y-bg:#fff; }',
      'html['+KEYS.theme+'="contrast"]{ --a11y-fg:#000; --a11y-bg:#fff; }',
      'html['+KEYS.theme+'="dark"]{ --a11y-fg:#f5f5f5; --a11y-bg:#121212; }',
      'html['+KEYS.theme+'="sepia"]{ --a11y-fg:#3b2f2f; --a11y-bg:#f4ecd8; }',

      // Scope body colors so we don't override sites unless active
      'html.'+KEYS.base+' body{ color: var(--a11y-fg); background: var(--a11y-bg); }',

      // Dyslexia font opt-in
      'html.'+KEYS.dyslexia+' *{ font-family:"OpenDyslexic", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif !important; }',

      // Global focus ring
      ':where(button,[href],input,select,textarea,[tabindex]):focus-visible{ outline:3px solid var(--a11y-accent); outline-offset:2px; }',

      // sr-only utility (for live region)
      '.sr-only{ position:absolute!important; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,1px,1px); white-space:nowrap; border:0; }',

      // Launcher button
      '.a11y-btn{ position:fixed; bottom:var(--a11y-bottom); inset-inline-end:var(--a11y-side); z-index:'+zIndex+'; width:56px; height:56px; border-radius:50%; background:var(--a11y-accent); color:#fff; display:flex; align-items:center; justify-content:center; box-shadow:0 6px 18px rgba(0,0,0,.2); border:none; cursor:pointer; }',
      '.a11y-btn:focus{ outline:3px solid #fff; outline-offset:3px; }',

      // Panel
      '.a11y-panel{ position:fixed; bottom:calc(var(--a11y-bottom) + 64px); inset-inline-end:var(--a11y-side); z-index:'+zIndex+'; background:#fff; color:#111; width:min(92vw,360px); border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,.25); border:1px solid #eee; display:none; opacity:0; transition:opacity .12s ease; }',
      '.a11y-panel['+KEYS.active+'="true"]{ display:block; opacity:1; }',
      '@media (prefers-reduced-motion: reduce){ .a11y-panel{ transition:none; } }',

      // Panel sections
      '.a11y-hdr{ padding:12px 14px; font-weight:700; border-bottom:1px solid #eee; display:flex; align-items:center; gap:8px; }',

      // ROW LAYOUT: grid + wrapping actions
      '.a11y-row{ display:grid; grid-template-columns: 1fr auto; align-items:start; padding:12px 14px; gap:10px 12px; }',
      '.a11y-row + .a11y-row{ border-top:1px solid #f3f3f3; }',
      '.a11y-actions{ display:flex; flex-wrap:wrap; gap:8px; align-items:center; justify-content:flex-end; max-width:100%; }',

      // Controls
      '.a11y-chip,.a11y-ctrl{ border:1px solid #ddd; background:#fafafa; border-radius:8px; padding:10px 12px; cursor:pointer; min-height:44px; white-space:nowrap; }',
      '.a11y-select{ padding:8px 10px; border:1px solid #ddd; border-radius:8px; background:#fafafa; max-width:100%; min-height:44px; }',
      '.a11y-pill{ font-size:12px; padding:4px 8px; border-radius:999px; border:1px solid #ddd; background:#f7f7f7; }',
      '.a11y-actions > *{ flex:0 0 auto; }',

      '.a11y-note{ font-size:12px; color:#666; padding:8px 14px 14px; }',

      // COMPACT MODE (auto when data-a11y-compact="true")
      'html[data-a11y-compact="true"] .a11y-row{ grid-template-columns: 1fr; }',
      'html[data-a11y-compact="true"] .a11y-actions{ justify-content:stretch; }',
      'html[data-a11y-compact="true"] .a11y-actions > *{ flex:1 1 auto; }',

      // Small screens → stack automatically
      '@media (max-width: 420px){ .a11y-row{ grid-template-columns:1fr; } .a11y-actions{ justify-content:stretch; } .a11y-actions > *{ flex:1 1 auto; } }',

      // Panel colors inside dark/sepia themes
      'html['+KEYS.theme+'="dark"] .a11y-panel{ background:#1b1b1b; color:#f5f5f5; border-color:#2a2a2a; }',
      'html['+KEYS.theme+'="sepia"] .a11y-panel{ background:#fffaf0; }',
    ].join('\n');

    const style = document.createElement('style');
    style.id = 'a11y-style';
    if (nonce) style.setAttribute('nonce', nonce);
    style.textContent = css;
    document.head.appendChild(style);
  }

  function createEl(tag, attrs={}, children=[]){
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k,v])=>{
      if (k==='class') el.className = v;
      else if (k==='text') el.textContent = v;
      else if (k.startsWith('on') && typeof v==='function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k,v);
    });
    children.forEach(c=> el.appendChild(c));
    return el;
  }

  // TTS helpers
  function cancelSpeak(){ if ('speechSynthesis' in window) speechSynthesis.cancel(); }
  function say(text, voiceName){
    if (!('speechSynthesis' in window)) return;
    cancelSpeak();
    const u = new SpeechSynthesisUtterance(text);

    // Async-safe voice assignment
    function assignVoice(){
      if (!voiceName) return;
      const vs = (typeof speechSynthesis.getVoices === 'function' ? speechSynthesis.getVoices() : []) || [];
      const v = vs.find(v=>v.name===voiceName);
      if (v) u.voice = v;
    }
    assignVoice();
    if (!u.voice) {
      const prev = speechSynthesis.onvoiceschanged;
      speechSynthesis.onvoiceschanged = () => {
        assignVoice();
        if (prev && typeof prev === 'function') prev();
      };
    }
    speechSynthesis.speak(u);
  }

  W.init = function init(options={}){
    if (W.__mounted) return; // idempotent mount guard

    const opts = Object.assign({}, DEFAULTS, options);
    const html = document.documentElement;

    // Expose offsets via CSS vars
    html.style.setProperty('--a11y-bottom', opts.bottom);
    html.style.setProperty('--a11y-side', opts.sideOffset);

    ensureStyles(opts.accent, opts.zIndex, opts.styleNonce);
    html.classList.add(KEYS.base);

    // Font scale + theme (prefer saved; otherwise system preference)
    html.style.setProperty('--a11y-font-scale', String(prefs.fontScale || 1));
    const savedTheme = prefs.theme;
    if (savedTheme) {
      html.setAttribute(KEYS.theme, savedTheme);
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      html.setAttribute(KEYS.theme, prefersDark ? 'dark' : 'default');
    }
    if (prefs.dyslexia) html.classList.add(KEYS.dyslexia); else html.classList.remove(KEYS.dyslexia);

    // UI
    const btn = createEl('button', { class:'a11y-btn', 'aria-label':'Open accessibility menu', title:'Accessibility options' }, [ createEl('span', { 'aria-hidden':'true', text:'♿' }) ]);
    const panel = createEl('div', { class:'a11y-panel', role:'dialog', 'aria-modal':'true' });
    const panelId = 'a11y-panel-'+Math.random().toString(36).slice(2);
    panel.id = panelId;

    btn.setAttribute('aria-haspopup','dialog'); btn.setAttribute('aria-expanded','false'); btn.setAttribute('aria-controls', panelId);

    const status = createEl('div', { class:'sr-only', 'aria-live':'polite' }); // for SR updates
    const hdr = createEl('div', { class:'a11y-hdr' }, [ createEl('span', { text:'Accessibility' }) ]);

    // Text size row
    const scaleLabel = createEl('span', { class:'a11y-pill', text: pct(prefs.fontScale||1)+'%' });
    const rowFont = createEl('div', { class:'a11y-row' }, [
      createEl('div', { text:'Text size' }),
      createEl('div', { class:'a11y-actions' }, [
        createEl('button', { class:'a11y-ctrl', 'aria-label':'Decrease text size', title:'Decrease text size', onclick: fontMinus }, [ document.createTextNode('−') ]),
        createEl('button', { class:'a11y-ctrl', 'aria-label':'Increase text size', title:'Increase text size', onclick: fontPlus }, [ document.createTextNode('+') ]),
        createEl('button', { class:'a11y-ctrl', 'aria-label':'Reset text size', title:'Reset text size', onclick: fontReset }, [ document.createTextNode('Reset') ]),
        scaleLabel
      ])
    ]);

    // Theme row
    const themeSel = createEl('select', { class:'a11y-select', 'aria-label':'Theme' }, [
      new Option('Default','default'),
      new Option('High contrast','contrast'),
      new Option('Dark','dark'),
      new Option('Sepia','sepia')
    ]);
    themeSel.value = (savedTheme || html.getAttribute(KEYS.theme) || 'default');
    themeSel.addEventListener('change', ()=> setTheme(themeSel.value));
    const rowTheme = createEl('div', { class:'a11y-row' }, [
      createEl('div', { text:'Theme' }),
      createEl('div', { class:'a11y-actions' }, [ themeSel ])
    ]);

    // Dyslexia row
    const dysBtn = createEl('button', { class:'a11y-chip', 'aria-pressed': String(!!prefs.dyslexia), 'aria-label':'Toggle dyslexia-friendly font', title:'Toggle dyslexia-friendly font', onclick: ()=> toggleDyslexia() }, [ document.createTextNode('Toggle') ]);
    const rowDys = createEl('div', { class:'a11y-row' }, [
      createEl('div', { text:'Dyslexia-friendly font' }),
      createEl('div', { class:'a11y-actions' }, [ dysBtn ])
    ]);

    // Read row
    const readBtn = createEl('button', { class:'a11y-ctrl', 'aria-label':'Read the page', title:'Read page', onclick: readPage }, [ document.createTextNode('Read') ]);
    const readSelBtn = createEl('button', { class:'a11y-ctrl', 'aria-label':'Read selected text', title:'Read selected text', onclick: readSelection }, [ document.createTextNode('Read selection') ]);
    const pauseBtn = createEl('button', { class:'a11y-ctrl', 'aria-label':'Pause or resume reading', title:'Pause/Resume', onclick: pauseResume }, [ document.createTextNode('Pause/Resume') ]);
    const stopBtn = createEl('button', { class:'a11y-ctrl', 'aria-label':'Stop reading', title:'Stop', onclick: stopRead }, [ document.createTextNode('Stop') ]);
    const rowRead = createEl('div', { class:'a11y-row' }, [
      createEl('div', { text:'Read aloud' }),
      createEl('div', { class:'a11y-actions' }, [ readBtn, readSelBtn, pauseBtn, stopBtn ])
    ]);

    // Voice row
    let recognizing=false, rec;
    const micChip = createEl('span', { class:'a11y-pill', text:'Idle' });
    const startStopBtn = createEl('button', { class:'a11y-ctrl', 'aria-label':'Start or stop voice recognition', title:'Start/Stop voice recognition', onclick: startStopVoice }, [ document.createTextNode('Start/Stop') ]);
    const rowVoice = createEl('div', { class:'a11y-row' }, [
      createEl('div', { text:'Voice commands (beta)' }),
      createEl('div', { class:'a11y-actions' }, [ startStopBtn, micChip ])
    ]);

    const note = createEl('div', { class:'a11y-note', text:'Prefs saved to your browser. Voice features depend on device support.' });

    panel.appendChild(hdr);
    panel.appendChild(rowFont);
    panel.appendChild(rowTheme);
    panel.appendChild(rowDys);
    panel.appendChild(rowRead);
    panel.appendChild(rowVoice);
    panel.appendChild(note);
    panel.appendChild(status);

    // Open/close
    let lastFocused=null;
    function openPanel(){
      lastFocused = document.activeElement;
      panel.setAttribute(KEYS.active,'true');
      btn.setAttribute('aria-expanded','true');
      (panel.querySelector('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])') || panel).focus();
    }
    function closePanel(){
      panel.setAttribute(KEYS.active,'false');
      btn.setAttribute('aria-expanded','false');
      lastFocused && lastFocused.focus();
    }

    // Focus trap
    function trapFocus(e){
      if (panel.getAttribute(KEYS.active) !== 'true' || e.key!=='Tab') return;
      const nodes = panel.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
      if (!nodes.length) return;
      const first = nodes[0], last = nodes[nodes.length-1];
      if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }

    btn.addEventListener('click', ()=> (panel.getAttribute(KEYS.active)==='true' ? closePanel() : openPanel()));
    panel.addEventListener('keydown', trapFocus);
    window.addEventListener('keydown', (e)=>{ if (e.key==='Escape') closePanel(); });
    window.addEventListener('keydown', (e)=>{ if (e.altKey && e.shiftKey && (e.key==='A'||e.key==='a')){ e.preventDefault(); openPanel(); } });

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    // API + state updaters
    function applyPrefs(){
      html.style.setProperty('--a11y-font-scale', String((prefs.fontScale||1)));
      html.setAttribute(KEYS.theme, prefs.theme || html.getAttribute(KEYS.theme) || 'default');
      if (prefs.dyslexia) html.classList.add(KEYS.dyslexia); else html.classList.remove(KEYS.dyslexia);
      scaleLabel.textContent = pct(prefs.fontScale||1)+'%';
      dysBtn.setAttribute('aria-pressed', String(!!prefs.dyslexia));
      savePrefs();
      const compact = (prefs.fontScale || 1) >= 1.75;
      html.setAttribute('data-a11y-compact', compact ? 'true' : 'false');
    }

    function fontPlus(){ prefs.fontScale = Number((clamp((prefs.fontScale||1)+0.1, 0.7, 2)).toFixed(2)); applyPrefs(); announce('Text larger'); }
    function fontMinus(){ prefs.fontScale = Number((clamp((prefs.fontScale||1)-0.1, 0.7, 2)).toFixed(2)); applyPrefs(); announce('Text smaller'); }
    function fontReset(){ prefs.fontScale = 1; applyPrefs(); announce('Text size reset'); }

    function setTheme(t){ prefs.theme = t; applyPrefs(); announce('Theme: '+t); }
    function toggleDyslexia(force){ prefs.dyslexia = (typeof force==='boolean') ? force : !prefs.dyslexia; applyPrefs(); announce('Dyslexia font '+(prefs.dyslexia?'on':'off')); }

    function collectPageText(max=3000){
      const sel = window.getSelection && (window.getSelection().toString().trim());
      if (sel) return sel.slice(0,max);
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: (n)=> (n.textContent && n.textContent.trim().length>0) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
      });
      let text = '', node;
      while ((node = walker.nextNode()) && text.length < max){ const t = node.textContent.trim(); if (t) text += (t+' '); }
      return text.slice(0,max);
    }
    function readPage(){ const t = collectPageText(); if (t){ say(t, opts.readVoice); announce('Reading page'); } }
    function readSelection(){ const s = (window.getSelection && window.getSelection().toString()) || ''; if (s.trim()){ say(s.trim(), opts.readVoice); announce('Reading selection'); } }
    function pauseResume(){
      if (!('speechSynthesis' in window)) return;
      const ss = window.speechSynthesis;
      if (ss.speaking && !ss.paused){ ss.pause(); announce('Paused'); }
      else if (ss.paused){ ss.resume(); announce('Resumed'); }
    }
    function stopRead(){ cancelSpeak(); announce('Stopped'); }

    function announce(msg){ status.textContent = msg; }

    // Voice
    function startVoice(onCommand){
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return false;
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      rec = new SR(); rec.lang='en-US'; rec.continuous=true; rec.interimResults=false;
      rec.onresult = (e)=>{ for(let i=e.resultIndex;i<e.results.length;i++){ if(e.results[i].isFinal){ const phrase = e.results[i][0].transcript.trim().toLowerCase(); micChip.textContent = 'Heard: '+phrase; onCommand(phrase); } } };
      rec.onend = ()=>{ recognizing=false; micChip.textContent='Idle'; };
      rec.start(); recognizing=true; micChip.textContent='Listening…'; return true;
    }
    function stopVoice(){ if (rec && recognizing){ rec.stop(); recognizing=false; micChip.textContent='Idle'; } }
    function startStopVoice(){ if (recognizing){ stopVoice(); return; } const ok = startVoice((p)=> handleCommand(p, api)); if (!ok) alert('Voice recognition not supported on this device.'); }

    function handleCommand(p, api){
      if (/(increase (text|font)|bigger text)/.test(p)) api.fontPlus();
      else if (/(decrease (text|font)|smaller text)/.test(p)) api.fontMinus();
      else if (/reset (text|font)/.test(p)) api.fontReset();
      else if (/(theme )?(contrast|high contrast)/.test(p)) api.setTheme('contrast');
      else if (/(theme )?dark/.test(p)) api.setTheme('dark');
      else if (/(theme )?sepia/.test(p)) api.setTheme('sepia');
      else if (/(theme )?(default|normal)/.test(p)) api.setTheme('default');
      else if (/read selection/.test(p)) api.readSelection();
      else if (/read (page|this)/.test(p)) api.readPage();
      else if (/(pause|resume)/.test(p)) api.pauseResume();
      else if (/(stop|cancel)/.test(p)) api.stopRead();
      else if (/open (menu|panel)/.test(p)) api.open();
      else if (/(close|hide) (menu|panel)/.test(p)) api.close();
    }

    const api = {
      open: openPanel, close: closePanel,
      fontPlus, fontMinus, fontReset,
      setTheme, toggleDyslexia,
      readPage, readSelection, pauseResume, stopRead,
      startVoice:()=>startVoice((p)=>handleCommand(p, api)), stopVoice
    };
    W.api = api;

    // Expose destroy() for integrators
    W.destroy = function destroy(){
      try {
        stopVoice(); cancelSpeak();
        btn.remove(); panel.remove();
        html.classList.remove(KEYS.base, KEYS.dyslexia);
        html.removeAttribute(KEYS.theme);
        html.removeAttribute('data-a11y-compact');
        W.__mounted = false;
      } catch {}
    };

    panel.setAttribute(KEYS.active,'false');
    applyPrefs();

    // Mark mounted after successful attach
    W.__mounted = true;
  };

  // Fire ready event even if loaded head-first
  setTimeout(()=>{ try{ document.dispatchEvent(new CustomEvent('A11yWidgetReady')); }catch{} },0);
})();
