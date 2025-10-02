# A11y Widget

Drop-in accessibility widget for any website: text size (+/−/reset), themes (default / high-contrast / dark / sepia), OpenDyslexic toggle, Read-Aloud (TTS), and basic voice commands.

> **CDN:**  
> `https://cdn.jsdelivr.net/gh/wxsfy/a11y-widget@v0.3.1/dist/a11y-widget.min.js`

---

## Quick start

Paste **before** `</body>` on any site:

```html
<script src="https://cdn.jsdelivr.net/gh/wxsfy/a11y-widget@v0.3.1/dist/a11y-widget.min.js" defer></script>
<script>
  window.addEventListener('DOMContentLoaded', () => {
    A11yWidget.init({
      accent:'#1e88e5',
      bottom:'24px',
      sideOffset:'24px',
      zIndex:2147483647
      // defaultOpen:true
    });
  });
</script>

One-block async loader (for non-technical sites):

<script>
(function(w,d,u,g,opts){
  var s=d.createElement('script'); s.src=u; s.async=true;
  s.onload=function(){ w[g]&&w[g].init && w[g].init(opts); };
  d.head.appendChild(s);
})(window, document,
  "https://cdn.jsdelivr.net/gh/wxsfy/a11y-widget@v0.3.1/dist/a11y-widget.min.js",
  "A11yWidget",
  { accent:"#1e88e5", bottom:"24px", sideOffset:"24px", zIndex:2147483647 }
);
</script>

Features

Text size controls with live % label

Themes: default, high-contrast, dark, sepia

OpenDyslexic opt-in (uses local font if available)

Read-Aloud: page or selection; pause / resume / stop

Voice commands (Chrome): font size, theme, read, open/close

Keyboard: Option(⌥)+Shift(⇧)+A opens, Esc closes

Prefs persist (localStorage)

Options (A11yWidget.init({...}))
Option	Type	Default	Notes
accent	string	#1e88e5	Button/focus color
bottom	string	24px	Distance from bottom
sideOffset	string	24px	Distance from right/left
zIndex	number	999999	Increase if your site has overlays
readVoice	string|null	null	Exact TTS voice name (optional)
styleNonce	string	undefined	Set if your CSP requires a nonce
defaultOpen	boolean	false	Open panel on page load
Public API
A11yWidget.api.open()
A11yWidget.api.close()
A11yWidget.api.setTheme("default"|"contrast"|"dark"|"sepia")
A11yWidget.api.fontPlus(); A11yWidget.api.fontMinus(); A11yWidget.api.fontReset()
A11yWidget.api.toggleDyslexia(forceBoolean?)
A11yWidget.api.readPage(); A11yWidget.api.readSelection()
A11yWidget.api.pauseResume(); A11yWidget.api.stopRead()
A11yWidget.destroy() // removes button + panel

Accessibility & browser notes

Full keyboard support with focus trap and visible focus ring.

Voice recognition requires Chrome (Web Speech API). Safari/Firefox: TTS works; voice input not supported.

Compact layout auto-enables at large text scales (≥ 175%).

Troubleshooting

Button not visible → Use a huge zIndex (e.g., 2147483647) or tweak bottom/sideOffset.

A11yWidget is undefined → Rebuild IIFE without --global-name.

404 on script → Check the exact <script src> URL/path.

CSP blocks style → Pass a nonce: A11yWidget.init({ styleNonce: "<nonce>" }).

Voice not working in Safari → Expected; use Chrome to test voice.

Local demo (dev)
npm install
npm run build
npm run serve
# open http://localhost:5173/demo.html

Versioning & CDN

Tag each release so the CDN URL is stable:

git tag v0.3.2
git push origin v0.3.2
# then use @v0.3.2 in the CDN URL

License

Commercial use by permission. © 2025 Yusuf Wasfy. All rights reserved.
