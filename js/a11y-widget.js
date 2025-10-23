window.TechuiWidget = {
  async init({ version = "A", accent = "#1e88e5" } = {}) {
    try {
      const config = await fetch("./js/config/features.json").then(r => r.json());
      const features = config[version] || [];

      console.log(`Techui Widget v${version} initializing...`);
      for (const mod of features) {
        const module = await import(`./js/modules/${mod}.js`);
        if (module?.init) module.init({ accent });
      }
      console.log(`✅ Techui Widget v${version} loaded.`);
    } catch (err) {
      console.error("TechuiWidget failed to load:", err);
    }
  }
};
