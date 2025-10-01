<script>
/*
  A11y Widget v0.3 – Polished UX
  - Text size +/−/Reset with live % label
  - Theme modes: default | high-contrast | dark | sepia
  - Read Aloud: read page / selection, pause/resume/stop, cancels previous
  - Voice commands with transcript chip
  - Better OpenDyslexic handling (local if present; optional CDN fallback)
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

  function ensureStyles(accent, zIndex){
    if (document.getElementById('a11y-style')) return;
    const css = [
      ':root{ --a11y-accent:'+accent+'; --a11y-bottom:24px; --a11y-side:24px; --a11y-fg:#111; --a11y-bg:#fff; }',
      "@font-face{ font-family:'OpenDyslexic'; font-style:normal; font-weight:400; src: local('OpenDyslexic'), local('OpenDyslexic Regular'); }",
      'html.'+KEYS.base+'{ font-size: calc(16px * var(--a11y-font-scale,1)); }',
      // Themes via data attr
      'html['+KEYS.theme+'="default"]{ --a11y-fg:#111; --a11y-bg:#fff; }',
      'html['+KEYS.theme+'="contrast"]{ --a11y-fg:#000; --a11y-bg:#fff; }',
      'html['+KEYS.theme+'="dark"]{ --a11y-fg:#f5f5f5; --a11y-bg:#121212; }',
      'html['+KEYS.theme+'="sepia"]{ --a11y-fg:#3b2f2f; --a11y-bg:#f4ecd8; }',
      'body{ color: var(--a11y-fg); background: var(--a11y-bg); }',
      'html.'+KEYS.dyslexia+' *{ font-family:"OpenDyslexic", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif !important; }',

      ':where(button,[href],input,select,textarea,[tabindex]):focus-visible{ outline:3px solid var(--a11y-accent); outline-offset:2px; }',

      '.a11y-btn{ position:fixed; bottom:var(--a11y-bottom); inset-inline-end:var(--a11y-side); z-index:'+zIndex+'; width:56px; height:56px; border-radius:50%; background:var(--a11y-accent); color:#fff; display:flex; align-items:center; justify-content:center; box-shadow:0 6px 18px rgba(0,0,0,.2); border:none; cursor:pointer; }',
      '.a11y-btn:focus{ outline:3px solid #fff; outline-offset:3px; }',

      '.a11y-panel{ position:fixed; bottom:calc(var(--a11y-bottom) + 64px); inset-inline-end:var(--a11y-side); z-index:'+zIndex+'; background:#fff; color:#111; width:min(92vw,360px); border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,.25); border:1px solid #eee; display:none; opacity:0; transition:opacity .12s ease; }',
      '.a11y-panel['+KEYS.active+'="true"]{ display:block; opacity:1; }',
      '@media (prefers-reduced-motion: reduce){ .a11y-panel{ transition:none; } }',

      '.a11y-hdr{ padding:12px 14px; font-weight:700; border-bottom:1px solid #eee; display:flex; align-items:center; gap:8px; }',
      '.a11y-row{ display:flex; align-items:center; justify-content:space-between; padding:12px 14px; gap:10px; }',
      '.a11y-row + .a11y-row{ border-top:1px solid #f3f3f3; }',
      '.a11y-actions{ display:flex; gap:8px; align-items:center; }',
      '.a11y-chip,.a11y-ctrl{ border:1px solid #ddd; background:#fafafa; border-radius:8px; padding:8px 10px; cursor:pointer; }',
      '.a11y-note{ font-size:12px; color:#666; padding:8px 14px 14px; }',
      '.a11y-pill{ font-size:12px; padding:4px 8px; border-radius:999px; border:1px solid #ddd; background:#f7f7f7; }',
      '.a11y-select{ padding:8px 10px; border:1px solid #ddd; border-radius:8px; background:#fafafa; }',
      // Make panel respect dark theme background when page is dark
      'html['+KEYS.theme+'="dark"] .a11y-panel{ background:#1b1b1b; color:#f5f5f5; border-color:#2a2a2a; }',
      'html['+KEYS.theme+'="sepia"] .a11y-panel{ background:#fffaf0; }',
    ].join('\n');
    const style = document.createElement('style'); style.id = 'a11y-style'; style.textContent = css; document.head.appendChild(style);
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
    if (voiceName && speechSynthesis.getVoices){
      const v = speechSynthesis.getVoices().find(v=>v.name===voiceName); if (v) u.voice = v;
    }
    speechSynthesis.speak(u);
  }

  W.init = function init(options={}){
    const opts = Object.assign({}, DEFAULTS, options);
    document.documentElement.style.setProperty('--a11y-bottom', opts.bottom);
    document.documentElement.style.setProperty('--a11y-side', opts.sideOffset);
    ensureStyles(opts.accent, opts.zIndex);

    const html = document.documentElement;
    html.classList.add(KEYS.base);
    html.style.setProperty('--a11y-font-scale', String(prefs.fontScale || 1));
    html.setAttribute(KEYS.theme, prefs.theme || 'default');
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
    themeSel.value = prefs.theme || 'default';
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
      html.setAttribute(KEYS.theme, prefs.theme || 'default');
      if (prefs.dyslexia) html.classList.add(KEYS.dyslexia); else html.classList.remove(KEYS.dyslexia);
      scaleLabel.textContent = pct(prefs.fontScale||1)+'%';
      dysBtn.setAttribute('aria-pressed', String(!!prefs.dyslexia));
      savePrefs();
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

    panel.setAttribute(KEYS.active,'false');
    applyPrefs();
  };

  // Fire ready event even if loaded head-first
  setTimeout(()=>{ try{ document.dispatchEvent(new CustomEvent('A11yWidgetReady')); }catch{} },0);
})();
</script>
