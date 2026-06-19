/**
 * Loader du widget Ask, à embarquer sur un site tiers (ex. Prestashop) :
 *
 *   <script src="https://winetech.ask.fr/widget.js"
 *           data-ask-key="ask_pk_xxx"
 *           data-ask-host="https://winetech.ask.fr"></script>
 *
 * Injecte un bouton flottant qui ouvre une iframe vers /embed?key=…
 * L'iframe isole totalement le CSS/JS de l'hôte. La clé est publique
 * (publishable) ; l'accès est contrôlé côté serveur par la clé + les origines.
 */
(function () {
  var script = document.currentScript;
  if (!script) return;
  var key = script.getAttribute("data-ask-key");
  var host =
    script.getAttribute("data-ask-host") ||
    new URL(script.src).origin;
  if (!key) {
    console.error("[Ask widget] data-ask-key manquant.");
    return;
  }

  var open = false;
  var iframe;

  var btn = document.createElement("button");
  btn.setAttribute("aria-label", "Ouvrir l'assistant");
  btn.style.cssText =
    "position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:9999px;border:none;background:#e33170;color:#fff;font-size:24px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);z-index:2147483000;";
  btn.textContent = "💬";

  var panel = document.createElement("div");
  panel.style.cssText =
    "position:fixed;bottom:88px;right:20px;width:380px;max-width:calc(100vw - 40px);height:600px;max-height:calc(100vh - 120px);border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.3);z-index:2147483000;display:none;background:#fff;";

  function ensureIframe() {
    if (iframe) return;
    iframe = document.createElement("iframe");
    iframe.src = host + "/embed?key=" + encodeURIComponent(key);
    iframe.style.cssText = "width:100%;height:100%;border:none;";
    iframe.setAttribute("title", "Assistant Ask");
    panel.appendChild(iframe);
  }

  btn.addEventListener("click", function () {
    open = !open;
    if (open) ensureIframe();
    panel.style.display = open ? "block" : "none";
    btn.textContent = open ? "✕" : "💬";
  });

  document.body.appendChild(panel);
  document.body.appendChild(btn);
})();
