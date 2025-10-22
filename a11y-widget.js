<!-- ===== Techui Accessibility Widget vA ===== -->
<script>
(function () {
  /* ------------------  Core Elements  ------------------ */
  const widgetBtn = document.createElement("button");
  widgetBtn.id = "techui-a11y-btn";
  widgetBtn.setAttribute("aria-label", "Open accessibility menu");
  widgetBtn.title = "Accessibility options";
  widgetBtn.innerHTML = "♿";

  const panel = document.createElement("div");
  panel.id = "techui-a11y-panel";
  panel.setAttribute("aria-label", "Accessibility controls");
  panel.innerHTML = `
    <h2 id="a11y-title">Accessibility</h2>
    <section>
      <label>Text size:
        <div class="size-controls">
          <button id="dec-text" title="Decrease text size" aria-label="Decrease text size">−</button>
          <span id="text-display" aria-live="polite">100%</span>
          <button id="inc-text" title="Increase text size" aria-label="Increase text size">+</button>
          <button id="reset-text" title="Reset text size" aria-label="Reset text size">Reset</button>
        </div>
      </label>
    </section>
    <section>
      <label for="theme-select">Theme:</label>
      <select id="theme-select" aria-label="Theme">
        <option value="default">Default</option>
        <option value="contrast">High contrast</option>
        <option value="dark">Dark</option>
        <option value="sepia">Sepia</option>
      </select>
    </section>
    <section>
      <label>Dyslexia-friendly font:</label>
      <button id="toggle-dys" aria-pressed="false" title="Toggle dyslexia-friendly font">Toggle</button>
    </section>
  `;

  document.body.append(widgetBtn, panel);

  /* ------------------  Styling  ------------------ */
  const css = document.createElement("style");
  css.innerHTML = `
  #techui-a11y-btn {
    position: fixed; bottom: 20px; right: 20px;
    background:#0078d7; color:#fff; font-size:24px;
    border:none; border-radius:50%; width:56px; height:56px;
    cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,.3);
    z-index:9999; transition:background .3s;
  }
  #techui-a11y-btn:focus { outline:3px solid #fff; outline-offset:3px; }
  #techui-a11y-btn:hover { background:#005fa3; }

  #techui-a11y-panel {
    position: fixed; bottom:90px; right:20px;
    background:#fff; color:#000; width:260px;
    border-radius:12px; box-shadow:0 4px 16px rgba(0,0,0,.2);
    padding:16px; font-family:sans-serif; display:none;
    z-index:9999;
  }
  #techui-a11y-panel.active { display:block; animation:slideIn .25s ease; }
  @keyframes slideIn { from { opacity:0; transform:translateY(10px);} to{opacity:1; transform:translateY(0);} }
  #techui-a11y-panel h2 { margin-top:0; font-size:18px; }
  #techui-a11y-panel section { margin:12px 0; }
  #techui-a11y-panel button, #techui-a11y-panel select {
    margin:2px; padding:6px 10px; font-size:14px;
    border:1px solid #ccc; border-radius:6px; cursor:pointer;
    background:#f8f8f8; color:#000;
  }
  #techui-a11y-panel button:focus, #techui-a11y-panel select:focus {
    outline:2px solid #0078d7; outline-offset:2px;
  }
  .dyslexia-font * { font-family:"OpenDyslexic","Arial",sans-serif !important; }
  [data-theme="dark"] { background:#121212; color:#f1f1f1; }
  [data-theme="contrast"] { background:#000; color:#fff; }
  [data-theme="sepia"] { background:#f4ecd8; color:#5b4636; }
  `;
  document.head.appendChild(css);

  /* ------------------  Behavior  ------------------ */
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
  if (savedTheme) { themeSelect.value = savedTheme; applyTheme(savedTheme); }
  const savedDys = localStorage.getItem("a11y-dys") === "true";
  applyDyslexia(savedDys);

  // Close panel on outside click or ESC
  document.addEventListener("click", (e)=>{
    if(!panel.contains(e.target) && e.target!==widgetBtn) panel.classList.remove("active");
  });
  document.addEventListener("keydown",(e)=>{ if(e.key==="Escape") panel.classList.remove("active"); });
})();
</script>
