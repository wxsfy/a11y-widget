(function() {
  // Load the stylesheet
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://wxsfy.github.io/a11y-widget/style.css?v=1.0.0';
  document.head.appendChild(link);

  // Load the toolbar script
  const script = document.createElement('script');
  script.src = 'https://wxsfy.github.io/a11y-widget/toolbar.js?v=1.0.0';
  script.defer = true;
  document.body.appendChild(script);

  console.log('%c✅ Techui Accessibility Widget loaded successfully!', 'color: #4CAF50; font-weight: bold;');
})();
