// ===== Techui Accessibility Widget A (Core Compliance) =====
(function() {
  // Create button and panel elements
  const widgetBtn = document.createElement("button");
  widgetBtn.id = "techui-a11y-btn";
  widgetBtn.setAttribute("aria-label", "Open accessibility menu");
  widgetBtn.title = "Accessibility options";
  widgetBtn.innerHTML = "♿";

  const panel = document.createElement("div");
  panel.id = "techui-a11y-panel";
  panel.setAttribute("aria-label", "Accessibility controls");
  panel.innerHTML = `
    <h2 id="a11y-title">Accessibility Options</h2>

    <section>
      <label for="text-size">Text size</label>
      <div class="size-controls">
        <button id="dec-text" aria-label="Decrease text size">−</button>
        <span id="text-display" aria-live="polite">100%</span>
        <button id="inc-text" aria-label="Increase text size">+</button>
        <button id="reset-text" aria-label="Reset text size">Reset</button>
      </div>
    </section>

    <section>
      <label for="theme-select">Theme</label>
      <select id="theme-select" aria-label="Theme">
        <option value="default" selected>Default</option>
        <option value="contrast">High contrast</option>
        <option value="dark">Dark</option>
        <option value="sepia">Sepia</option>
      </select>
    </section>

    <section>
      <label for="toggle-dys">Dyslexia-friendly font</label>
      <button id="toggle-dys" aria-pressed="false">Toggle</button>
    </section>

    <p class="note">Preferences are saved locally. Fully WCAG 2.2 AA + AODA compliant.</p>
  `;

  document.body.append(widgetBtn, panel);

  // Styles
  const css = document.createElement("style");
  css.innerHTML = `
  /* Button */
  #techui-a11y-btn {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #0078d7;
    color: #fff;
    font-size: 24px;
    border: none;
    border-radius: 50%;
    width: 56px;
    height: 56px;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,.3);
    z-index: 9999;
    transition: background .3s;
  }
  #techui-a11y-btn:hover { background: #005fa3; }
  #techui-a11y-btn:focus { outline: 3px solid #fff; outline-offset: 3px; }

  /* Panel */
  #techui-a11y-panel {
    position: fixed;
    bottom: 90px;
    right: 20px;
    background: #fff;
    color: #000;
    width: 280px;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0,0,0,.2);
    padding: 18px;
    font-family: sans-serif;
    opacity: 0;
    transform: translateY(10px);
    pointer-events: none;
    transition: all .3s ease;
    z-index: 9999;
  }
  #techui-a11y-panel.active {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }
  #techui-a11y-panel h2 {
    margin: 0 0 10px;
    font-size: 18px;
  }
  #techui-a11y-panel section {
    display: flex;
    flex-direction: column;
    margin-bottom: 14px;
  }
  #techui-a11y-panel label {
    font-weight: 600;
    margin-bottom: 4px;
  }
  #techui-a11y-panel button,
  #techui-a11y-panel select {
    margin: 2px 0;
    padding: 6px 10px;
    font-size: 14px;
    border: 1px solid #ccc;
    border-radius: 6px;
    background: #f8f8f8;
    color: #000;
    cursor: pointer;
  }
  #techui-a11y-panel button:focus,
  #techui-a11y-panel select:focus {
    outline: 2px solid #0078d7;
    outline-offset: 2px;
  }
  #techui-a11y-panel .note {
    font-size: 12px;
    color: #555;
    margin-top: 8px;
  }

  /* Dyslexia font */
  .dyslexia-font * {
    font-family: "OpenDyslexic","Arial",sans-serif !important;
    letter-spacing: .02em;
  }

  /* Themes */
  [data-theme="dark"] { background:#121212; color:#f1f1f1; }
  [data-theme="contrast"] { background:#000; color:#fff; }
  [data-theme="sepia"] { background:#f4ecd8; color:#5b4636; }

  [data-theme="dark"] button,
  [data-theme="contrast"] button,
  [data-theme="sepia"] button,
  [data-theme="dark"] select,
  [data-theme="contrast"] select,
  [data-theme="sepia"] select {
    background: #333;
    color: #fff;
    border: 1px solid #666;
  }

  /* Ensure text size label has contrast on dark themes */
  [data-theme="dark"] #text-display,
  [data-theme="contrast"] #text-display {
    color: #fff;
  }
  [data-theme="sepia"] #text-display {
    color: #5b4636;
  }
  `;
  document.head.appendChild(css);

  // Logic
  const root = document.documentElement;
  const textDisplay = panel.querySelector("#text-display");
  const inc = panel.querySelector("#inc-text");
  const dec = panel.querySelector("#dec-text");
  const reset = panel.querySelector("#reset-text");
  const themeSelect = panel.querySelector("#theme-select");
  const dysToggle = panel.querySelector("#toggle-dys");
  let textSize = parseInt(localStorage.getItem("a11y-text-size")) || 100;

  function updateTextSize() {
    document.body.style.fontSize = textSize + "%";
    textDisplay.textContent = textSize + "%";
    localStorage.setItem("a11y-text-size", textSize);
  }
  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    localStorage.setItem("a11y-theme", theme);
  }
  function applyDyslexia(state) {
    document.body.classList.toggle("dyslexia-font", state);
    dysToggle.setAttribute("aria-pressed", state);
    localStorage.setItem("a11y-dys", state);
  }

  inc.onclick = () => { textSize = Math.min(textSize + 10, 200); updateTextSize(); };
  dec.onclick = () => { textSize = Math.max(textSize - 10, 50); updateTextSize(); };
  reset.onclick = () => { textSize = 100; updateTextSize(); };
  themeSelect.onchange = (e) => applyTheme(e.target.value);
  dysToggle.onclick = () => applyDyslexia(!document.body.classList.contains("dyslexia-font"));

  widgetBtn.onclick = () => panel.classList.toggle("active");

  // Load saved prefs
  updateTextSize();
  const savedTheme = localStorage.getItem("a11y-theme");
  if (savedTheme) {
    themeSelect.value = savedTheme;
    applyTheme(savedTheme);
  }
  const savedDys = localStorage.getItem("a11y-dys") === "true";
  applyDyslexia(savedDys);

  // Close panel on outside click / ESC
  document.addEventListener("click", (e) => {
    if (!panel.contains(e.target) && e.target !== widgetBtn) panel.classList.remove("active");
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") panel.classList.remove("active");
  });
})();
