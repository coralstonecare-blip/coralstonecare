(() => {
  const config = window.CORAL_STONE_CARE_CONFIG || {};
  const clarityId = config.clarityId?.trim();

  if (clarityId && /^[a-z0-9]+$/i.test(clarityId)) {
    window.clarity = window.clarity || function clarityQueue() {
      (window.clarity.q = window.clarity.q || []).push(arguments);
    };

    if (!document.querySelector("script[data-coral-stone-clarity]")) {
      const clarityScript = document.createElement("script");
      clarityScript.async = true;
      clarityScript.dataset.coralStoneClarity = "true";
      clarityScript.src = `https://www.clarity.ms/tag/${encodeURIComponent(clarityId)}`;
      document.head.appendChild(clarityScript);
    }
  }

  const id = config.gtmId?.trim();
  if (!id || !/^GTM-[A-Z0-9]+$/i.test(id)) return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);

  const iframe = document.createElement("iframe");
  iframe.src = `https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(id)}`;
  iframe.height = "0";
  iframe.width = "0";
  iframe.style.cssText = "display:none;visibility:hidden";
  iframe.title = "Google Tag Manager";
  const noscript = document.createElement("noscript");
  noscript.appendChild(iframe);
  document.body.prepend(noscript);
})();
