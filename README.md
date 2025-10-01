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
