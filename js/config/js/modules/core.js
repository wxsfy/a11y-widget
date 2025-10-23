export function init({ accent }) {
  console.log("\uD83E\uDD89 Core module active: Text size, contrast, dyslexia font.");

  // Example placeholders (hook up to your UI later)
  const style = document.createElement("style");
  style.textContent = `
    :root {
      --techui-accent: ${accent};
    }
    .techui-btn {
      background: var(--techui-accent);
      color: #fff;
      border-radius: 6px;
      padding: 6px 10px;
      border: none;
      cursor: pointer;
      margin: 4px;
    }
  `;
  document.head.appendChild(style);
}
