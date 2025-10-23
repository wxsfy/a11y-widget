export function init() {
  console.log("\ud83c\udf99\ufe0f Voice module active: Read-aloud + voice navigation.");

  // Basic TTS sample (hook to your buttons later)
  window.TechuiTTS = {
    speak(text) {
      const utter = new SpeechSynthesisUtterance(text);
      speechSynthesis.speak(utter);
    },
    stop() {
      speechSynthesis.cancel();
    }
  };

  // Quick demo (remove in prod)
  console.log("Try: TechuiTTS.speak('Welcome to Techui Voice Mode')");
}
