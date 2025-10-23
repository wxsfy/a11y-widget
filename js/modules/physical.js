export function init() {
  console.log("\ud83d\udc31\ufe0f Physical module active: Big cursor + focus highlight.");

  // Add a visible cursor style + focus ring
  const style = document.createElement("style");
  style.textContent = `
    body {
      cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="10" fill="black"/></svg>'), auto;
    }
    *:focus {
      outline: 3px solid #1e88e5 !important;
      outline-offset: 3px;
    }
  `;
  document.head.appendChild(style);
}
