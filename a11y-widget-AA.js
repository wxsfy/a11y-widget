(function() {
  const root = document.documentElement;
  const storageKey = 'a11y-widget-settings';
  const settings = JSON.parse(localStorage.getItem(storageKey) || '{}');
  let fontSize = settings.fontSize || 100;
  let currentTheme = settings.theme || 'default';
  let dyslexic = settings.dyslexic || false;

  // create style element
  const style = document.createElement('style');
  style.innerHTML = `
    .a11y-widget { position: fixed; bottom: 20px; right: 20px; z-index: 9999; }
    .a11y-widget__button { background: #007bff; color: #fff; border: none; padding: 10px; border-radius: 5px; cursor: pointer; font-size: 16px; }
    .a11y-widget__panel { display: none; position: absolute; bottom: 40px; right: 0; background: #fff; color: #000; border: 1px solid #ccc; padding: 10px; border-radius: 5px; width: 250px; font-family: sans-serif; }
    .a11y-widget__section { margin-bottom: 10px; }
    .a11y-widget__section h4 { margin: 0 0 5px 0; font-size: 14px; }
    .a11y-widget__section button, .a11y-widget__section select { margin-right: 5px; }
  `;
  document.head.appendChild(style);

  const widget = document.createElement('div');
  widget.className = 'a11y-widget';

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'a11y-widget__button';
  toggleBtn.textContent = 'A11y';
  widget.appendChild(toggleBtn);

  const panel = document.createElement('div');
  panel.className = 'a11y-widget__panel';
  widget.appendChild(panel);

  // Font size controls
  const fontSection = document.createElement('div');
  fontSection.className = 'a11y-widget__section';
  fontSection.innerHTML = '<h4>Font Size</h4>';
  const increaseBtn = document.createElement('button');
  increaseBtn.textContent = '+';
  const decreaseBtn = document.createElement('button');
  decreaseBtn.textContent = '-';
  const resetBtn = document.createElement('button');
  resetBtn.textContent = 'Reset';
  const fontLabel = document.createElement('span');
  fontLabel.textContent = fontSize + '%';
  fontSection.appendChild(increaseBtn);
  fontSection.appendChild(decreaseBtn);
  fontSection.appendChild(resetBtn);
  fontSection.appendChild(fontLabel);
  panel.appendChild(fontSection);

  function updateFont() {
    root.style.fontSize = fontSize + '%';
    fontLabel.textContent = fontSize + '%';
    settings.fontSize = fontSize;
    localStorage.setItem(storageKey, JSON.stringify(settings));
  }
  function increaseFont() { fontSize = Math.min(200, fontSize + 10); updateFont(); }
  function decreaseFont() { fontSize = Math.max(50, fontSize - 10); updateFont(); }
  function resetFont() { fontSize = 100; updateFont(); }

  increaseBtn.addEventListener('click', increaseFont);
  decreaseBtn.addEventListener('click', decreaseFont);
  resetBtn.addEventListener('click', resetFont);

  // Theme selection
  const themeSection = document.createElement('div');
  themeSection.className = 'a11y-widget__section';
  themeSection.innerHTML = '<h4>Theme</h4>';
  const themeSelect = document.createElement('select');
  ['default','dark','contrast','sepia'].forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t.charAt(0).toUpperCase() + t.slice(1);
    if (currentTheme === t) opt.selected = true;
    themeSelect.appendChild(opt);
  });
  themeSection.appendChild(themeSelect);
  panel.appendChild(themeSection);

  function setTheme(theme) {
    currentTheme = theme;
    settings.theme = theme;
    localStorage.setItem(storageKey, JSON.stringify(settings));
    switch(theme) {
      case 'dark':
        document.body.style.background = '#000';
        document.body.style.color = '#fff';
        fontLabel.style.color = '#fff';
        break;
      case 'contrast':
        document.body.style.background = '#000';
        document.body.style.color = '#ff0';
        fontLabel.style.color = '#ff0';
        break;
      case 'sepia':
        document.body.style.background = '#f4ecd8';
        document.body.style.color = '#5b4636';
        fontLabel.style.color = '#5b4636';
        break;
      default:
        document.body.style.background = '';
        document.body.style.color = '';
        fontLabel.style.color = '';
    }
  }
  themeSelect.addEventListener('change', () => setTheme(themeSelect.value));

  // Dyslexic font
  const dysSection = document.createElement('div');
  dysSection.className = 'a11y-widget__section';
  dysSection.innerHTML = '<h4>Dyslexic Font</h4>';
  const dysCheckbox = document.createElement('input');
  dysCheckbox.type = 'checkbox';
  dysCheckbox.checked = dyslexic;
  const dysLabel = document.createElement('label');
  dysLabel.textContent = 'Use Dyslexic Font';
  dysSection.appendChild(dysCheckbox);
  dysSection.appendChild(dysLabel);
  panel.appendChild(dysSection);

  function updateDyslexic() {
    dyslexic = dysCheckbox.checked;
    settings.dyslexic = dyslexic;
    localStorage.setItem(storageKey, JSON.stringify(settings));
    if (dyslexic) {
      document.body.style.fontFamily = '"OpenDyslexic", Arial, sans-serif';
    } else {
      document.body.style.fontFamily = '';
    }
  }
  dysCheckbox.addEventListener('change', updateDyslexic);

  // Read aloud section
  const readSection = document.createElement('div');
  readSection.className = 'a11y-widget__section';
  readSection.innerHTML = '<h4>Read Aloud</h4>';
  const readPageBtn = document.createElement('button');
  readPageBtn.textContent = 'Page';
  const readSelBtn = document.createElement('button');
  readSelBtn.textContent = 'Selection';
  readSection.appendChild(readPageBtn);
  readSection.appendChild(readSelBtn);
  panel.appendChild(readSection);

  function speakText(text) {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis not supported in this browser.');
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }
  function readPage() {
    speakText(document.body.innerText);
  }
  function readSelection() {
    const text = window.getSelection().toString();
    if (text) speakText(text);
    else alert('Select text first.');
  }
  readPageBtn.addEventListener('click', readPage);
  readSelBtn.addEventListener('click', readSelection);

  // Voice commands section
  const voiceSection = document.createElement('div');
  voiceSection.className = 'a11y-widget__section';
  voiceSection.innerHTML = '<h4>Voice Commands</h4>';
  const voiceBtn = document.createElement('button');
  voiceBtn.textContent = 'Start';
  voiceSection.appendChild(voiceBtn);
  panel.appendChild(voiceSection);
  let recognition;
  let listening = false;

  function startVoice() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser.');
      return;
    }
    if (listening) {
      recognition.stop();
      listening = false;
      voiceBtn.textContent = 'Start';
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = function(event) {
      const command = event.results[0][0].transcript.toLowerCase();
      handleCommand(command);
    };
    recognition.onend = function() {
      listening = false;
      voiceBtn.textContent = 'Start';
    };
    recognition.start();
    listening = true;
    voiceBtn.textContent = 'Stop';
  }
  function handleCommand(command) {
    if (command.includes('increase')) increaseFont();
    else if (command.includes('decrease')) decreaseFont();
    else if (command.includes('reset')) resetFont();
    else if (command.includes('dark')) setTheme('dark');
    else if (command.includes('contrast')) setTheme('contrast');
    else if (command.includes('sepia')) setTheme('sepia');
    else if (command.includes('default') || command.includes('light')) setTheme('default');
    else if (command.includes('read page')) readPage();
    else if (command.includes('read selection')) readSelection();
    else {
      alert('Command not recognized: ' + command);
    }
  }
  voiceBtn.addEventListener('click', startVoice);

  // toggle panel
  toggleBtn.addEventListener('click', () => {
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
  });

  document.body.appendChild(widget);

  // initialize states
  updateFont();
  setTheme(currentTheme);
  updateDyslexic();
})();      
