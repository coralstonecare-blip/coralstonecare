(() => {
  const config = window.CORAL_STONE_CARE_CONFIG || {};
  const clarityId = config.clarityId?.trim();
  const gtmId = config.gtmId?.trim();
  const ga4Id = config.ga4Id?.trim();
  const hasGtm = Boolean(gtmId && /^GTM-[A-Z0-9]+$/i.test(gtmId));
  const hasGa4 = Boolean(ga4Id && /^G-[A-Z0-9]+$/i.test(ga4Id));

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

  if (hasGtm) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
    document.head.appendChild(script);

    const iframe = document.createElement("iframe");
    iframe.src = `https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(gtmId)}`;
    iframe.height = "0";
    iframe.width = "0";
    iframe.style.cssText = "display:none;visibility:hidden";
    iframe.title = "Google Tag Manager";
    const noscript = document.createElement("noscript");
    noscript.appendChild(iframe);
    document.body.prepend(noscript);
  } else if (hasGa4) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function googleTagQueue() {
      window.dataLayer.push(arguments);
    };

    if (!document.querySelector("script[data-coral-stone-ga4]")) {
      const ga4Script = document.createElement("script");
      ga4Script.async = true;
      ga4Script.dataset.coralStoneGa4 = "true";
      ga4Script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id)}`;
      document.head.appendChild(ga4Script);
    }

    window.gtag("js", new Date());
    window.gtag("config", ga4Id);
  }

  if (!hasGa4) return;

  const sendEvent = (name, parameters = {}) => {
    if (hasGtm) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: name, ...parameters });
      return;
    }
    window.gtag("event", name, parameters);
  };

  const query = new URLSearchParams(window.location.search);
  const contactSuccess = window.location.pathname === "/contact" && query.get("sent") === "1";
  const landingSuccess = window.location.pathname === "/thank-you" && query.get("submitted") === "1";
  if (window.location.pathname === "/contact" || window.location.pathname === "/thank-you") {
    const storageKey = `coral-stone-care-generate-lead:${window.location.pathname}`;
    let alreadyRecorded = false;
    try {
      if (contactSuccess || landingSuccess) {
        alreadyRecorded = window.sessionStorage.getItem(storageKey) === "1";
        if (!alreadyRecorded) window.sessionStorage.setItem(storageKey, "1");
      } else {
        window.sessionStorage.removeItem(storageKey);
      }
    } catch {
      // Analytics must still work if storage is unavailable.
    }
    if ((contactSuccess || landingSuccess) && !alreadyRecorded) {
      sendEvent("generate_lead", {
        method: "quote_form",
        form_location: landingSuccess ? "google_ads_landing" : "contact_page"
      });
    }
  }

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest("a");
    if (!link) return;

    const href = link.getAttribute("href") || "";
    if (href.startsWith("tel:")) {
      sendEvent("phone_click", { link_url: href });
      return;
    }

    if ((/^\/?contact\/?(?:#.*)?$/.test(href) || href === "#quote") && /(?:request|get|free|check).*quote/i.test(link.textContent || "")) {
      sendEvent("quote_cta_click", { link_url: href });
    }
  });
})();
