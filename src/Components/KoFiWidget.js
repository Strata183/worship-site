import { useEffect } from "react";

const koFiUsername = "dereksmith183";
const koFiScriptId = "ko-fi-overlay-widget-script";

function drawKoFiWidget() {
  if (!window.kofiWidgetOverlay) {
    return;
  }

  window.kofiWidgetOverlay.draw(koFiUsername, {
    type: "floating-chat",
    "floating-chat.donateButton.text": "Support me",
    "floating-chat.donateButton.background-color": "#ffffff",
    "floating-chat.donateButton.text-color": "#323842",
  });
}

function KoFiWidget() {
  useEffect(() => {
    const existingScript = document.getElementById(koFiScriptId);

    if (existingScript) {
      drawKoFiWidget();
      return;
    }

    const script = document.createElement("script");

    script.id = koFiScriptId;
    script.src = "https://storage.ko-fi.com/cdn/scripts/overlay-widget.js";
    script.async = true;
    script.onload = drawKoFiWidget;

    document.body.appendChild(script);
  }, []);

  return null;
}

export default KoFiWidget;
