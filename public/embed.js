/*!
 * LeagueScore embed widget
 *
 *   <div data-leaguescore-widget data-sport="football" data-api-key="ls_live_..."></div>
 *   <script src="https://YOUR-SITE/embed.js" async></script>
 *
 * Optional attributes: data-live="1" (sirf live matches), data-limit="10", data-date="YYYY-MM-DD"
 *
 * Attribution rule: "Powered by LeagueScore" link hamesha visible rehna chahiye.
 * Agar ye delete / hide ho jaye to widget data dikhana band kar deta hai.
 */
(function () {
  "use strict";
  if (window.__leaguescoreWidgetLoaded) return;
  window.__leaguescoreWidgetLoaded = true;

  var script = document.currentScript || document.querySelector('script[src*="embed.js"]');
  var BASE = location.origin;
  try { if (script && script.src) BASE = new URL(script.src).origin; } catch (e) {}

  var DEFAULT_BRAND = "LeagueScore";
  var DATA_URL = "https://sportscore.com/";
  var DATA_TEXT = " \u00b7 Data by SportScore";
  var CHECK_EVERY = 1500;   // integrity check interval (ms)
  var POLL_EVERY = 30000;   // data refresh (ms)
  var MIN_W = 40, MIN_H = 10, MIN_OPACITY = 0.3;

  var CSS =
    ":host{display:block!important}" +
    ".w{all:initial;display:block;font:14px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden}" +
    ".body{padding:4px 0}" +
    ".row{display:grid;grid-template-columns:62px 1fr 56px 1fr;gap:8px;align-items:center;padding:8px 12px;border-bottom:1px solid #f1f5f9}" +
    ".row:last-child{border-bottom:0}" +
    ".t{font-size:12px;color:#64748b}.live{color:#dc2626;font-weight:700}" +
    ".h{text-align:right}.s{text-align:center;font-weight:700}.c{grid-column:2/5;font-size:11px;color:#94a3b8;margin-top:-4px}" +
    ".msg{padding:16px 14px;text-align:center;color:#475569}" +
    ".block{background:#fef2f2;color:#991b1b}.block a{color:#991b1b!important}" +
    ".attr{display:block!important;visibility:visible!important;opacity:1!important;clip-path:none!important;" +
    "position:static!important;transform:none!important;height:auto!important;max-height:none!important;" +
    "overflow:visible!important;margin:0!important;padding:8px 12px!important;border-top:1px solid #e2e8f0;" +
    "background:#f8fafc;font-size:12px!important;line-height:16px!important;text-align:right;color:#475569}" +
    ".attr a{display:inline!important;visibility:visible!important;opacity:1!important;color:#0f766e;font-weight:600;text-decoration:none}" +
    ".attr a:hover{text-decoration:underline}";

  function isHttp(u) { try { var p = new URL(u).protocol; return p === "http:" || p === "https:"; } catch (e) { return false; } }

  function mount(host) {
    if (host.__lsMounted) return;
    host.__lsMounted = true;

    var key = host.getAttribute("data-api-key") || "";
    var sport = host.getAttribute("data-sport") || "football";
    var live = host.getAttribute("data-live") === "1";
    var date = host.getAttribute("data-date") || "";
    var limit = Math.max(1, Math.min(50, parseInt(host.getAttribute("data-limit"), 10) || 10));

    // Closed shadow root: host page ki CSS / querySelector andar ke elements ko chhoo nahi sakti
    var root = host.attachShadow({ mode: "closed" });
    var expected = { brand: DEFAULT_BRAND, url: BASE };

    var style = document.createElement("style");
    style.textContent = CSS;
    var wrap = document.createElement("div"); wrap.className = "w";
    var body = document.createElement("div"); body.className = "body";
    var attr = document.createElement("div"); attr.className = "attr";
    var badge = document.createElement("a");
    badge.target = "_blank"; badge.rel = "noopener";
    var data = document.createElement("span");
    data.appendChild(document.createTextNode(" \u00b7 Data by "));
    var dl = document.createElement("a");
    dl.href = DATA_URL; dl.target = "_blank"; dl.rel = "noopener";
    dl.textContent = "SportScore";
    data.appendChild(dl);
    attr.appendChild(badge); attr.appendChild(data);
    wrap.appendChild(body); wrap.appendChild(attr);
    root.appendChild(style); root.appendChild(wrap);

    function paintBadge() {
      badge.href = expected.url;
      badge.textContent = "Powered by " + expected.brand;
      badge.title = "Powered by " + expected.brand;
    }
    paintBadge();

    var locked = false, timer = null, reported = {}, loading = false;

    // ---------- integrity check ----------
    function chainRendered(el, stopAt) {
      // display / visibility / cumulative opacity / clip-path check, el se upar tak
      var op = 1;
      for (var n = el; n && n !== stopAt; n = n.parentElement || (n.getRootNode && n.getRootNode().host) || null) {
        if (n.nodeType !== 1) break;
        var cs = getComputedStyle(n);
        if (cs.display === "none") return "display_none";
        if (cs.visibility === "hidden" || cs.visibility === "collapse") return "visibility_hidden";
        op *= parseFloat(cs.opacity);
        if (op < MIN_OPACITY) return "opacity";
        if (cs.clipPath && cs.clipPath !== "none") return "clipped";
        if (cs.fontSize && parseFloat(cs.fontSize) < 9 && n === badge) return "tiny_text";
      }
      return "";
    }

    function check() {
      if (!host.isConnected) return { gone: true };
      // Poora widget hi chhupa hai (collapsed tab etc.) -> data bhi nazar nahi aa raha, violation nahi
      if (chainRendered(host, null)) return { paused: true };
      if (!badge.isConnected || badge.getRootNode() !== root) return { ok: false, reason: "attribution_removed" };
      if (badge.href.replace(/\/$/, "") !== expected.url.replace(/\/$/, "")) return { ok: false, reason: "attribution_modified" };
      if (badge.textContent !== "Powered by " + expected.brand) return { ok: false, reason: "attribution_modified" };
      var why = chainRendered(badge, host);
      if (why) return { ok: false, reason: "attribution_" + why };
      var a = attr.getBoundingClientRect(), b = badge.getBoundingClientRect(), h = host.getBoundingClientRect();
      if (b.width < MIN_W || b.height < MIN_H) return { ok: false, reason: "attribution_too_small" };
      // host ka height / overflow clip kar de to badge host ke andar nahi hoga
      if (b.bottom > h.bottom + 2 || b.top < h.top - 2 || b.right > h.right + 2 || b.left < h.left - 2)
        return { ok: false, reason: "attribution_clipped" };
      if (a.width < MIN_W || a.height < MIN_H) return { ok: false, reason: "attribution_too_small" };

      // "Data by SportScore" bhi lazmi hai: maujood, sahi link/text, visible aur host ke andar
      if (!dl.isConnected || dl.getRootNode() !== root) return { ok: false, reason: "attribution_removed" };
      if (dl.href !== DATA_URL || dl.textContent !== "SportScore" || data.textContent !== DATA_TEXT)
        return { ok: false, reason: "attribution_modified" };
      var why2 = chainRendered(dl, host);
      if (why2) return { ok: false, reason: "attribution_" + why2 };
      var d = dl.getBoundingClientRect();
      if (d.width < MIN_W || d.height < MIN_H) return { ok: false, reason: "attribution_too_small" };
      if (d.bottom > h.bottom + 2 || d.top < h.top - 2 || d.right > h.right + 2 || d.left < h.left - 2)
        return { ok: false, reason: "attribution_clipped" };
      return { ok: true };
    }

    function report(reason) {
      if (reported[reason]) return;
      reported[reason] = true;
      try {
        var payload = JSON.stringify({ reason: reason, page: location.href, key: key });
        if (navigator.sendBeacon) navigator.sendBeacon(BASE + "/api/embed/violation", new Blob([payload], { type: "text/plain" }));
        else fetch(BASE + "/api/embed/violation", { method: "POST", body: payload, keepalive: true, mode: "no-cors" });
      } catch (e) {}
    }

    function showMessage(text, cls) {
      body.textContent = "";
      var m = document.createElement("div");
      m.className = "msg" + (cls ? " " + cls : "");
      m.textContent = text;
      body.appendChild(m);
      return m;
    }

    function lock(reason) {
      locked = true;
      var m = showMessage(
        expected.brand + " data is unavailable because the \u201cPowered by " + expected.brand +
        "\u201d and \u201cData by SportScore\u201d attribution is hidden or removed. Please make it visible to restore this widget. "
      );
      m.className = "msg block";
      var a = document.createElement("a");
      a.href = expected.url; a.target = "_blank"; a.rel = "noopener"; a.textContent = "Attribution requirements";
      m.appendChild(a);
      showNotice();
      report(reason);
    }

    // Host clip/hide ho to andar ka message bhi chhup jata hai, isliye notice host ke BAHAR (agle sibling ke taur par) dikhao
    var notice = null;
    function showNotice() {
      if (notice && notice.isConnected) return;
      notice = document.createElement("div");
      var css = "display:block;margin:8px 0;padding:12px 14px;border:1px solid #fecaca;border-radius:10px;" +
        "background:#fef2f2;color:#991b1b;font:14px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;" +
        "text-align:center;height:auto;max-height:none;overflow:visible;opacity:1;visibility:visible;clip-path:none;position:static;transform:none";
      notice.setAttribute("style", css.replace(/;/g, " !important;"));
      notice.appendChild(document.createTextNode(
        expected.brand + " widget is disabled because the \u201cPowered by " + expected.brand +
        "\u201d and \u201cData by SportScore\u201d attribution is hidden or removed. Please make it visible to restore this widget. "
      ));
      var l = document.createElement("a");
      l.href = expected.url; l.target = "_blank"; l.rel = "noopener"; l.textContent = "Attribution requirements";
      l.setAttribute("style", "color:#991b1b !important;text-decoration:underline !important");
      notice.appendChild(l);
      if (host.parentNode) host.parentNode.insertBefore(notice, host.nextSibling);
    }
    function hideNotice() { if (notice && notice.parentNode) notice.parentNode.removeChild(notice); notice = null; }

    // ---------- data ----------
    function render(matches) {
      body.textContent = "";
      if (!matches.length) return void showMessage("No matches right now.");
      matches.slice(0, limit).forEach(function (m) {
        var row = document.createElement("div"); row.className = "row";
        var t = document.createElement("span"); t.className = "t";
        if (m.live) { t.className += " live"; t.textContent = "LIVE" + (m.minute ? " " + m.minute + "'" : ""); }
        else t.textContent = m.state === "finished" ? "FT" : (m.time || "");
        var h = document.createElement("span"); h.className = "h"; h.textContent = m.home || "";
        var s = document.createElement("span"); s.className = "s";
        s.textContent = (m.state === "finished" || m.live) ? (m.hs == null ? 0 : m.hs) + " - " + (m.as == null ? 0 : m.as) : "vs";
        var a = document.createElement("span"); a.textContent = m.away || "";
        row.appendChild(t); row.appendChild(h); row.appendChild(s); row.appendChild(a);
        if (m.competition) { var c = document.createElement("span"); c.className = "c"; c.textContent = m.competition; row.appendChild(c); }
        body.appendChild(row);
      });
    }

    function load() {
      if (locked || loading || document.hidden) return;
      if (!key) return void showMessage("Missing API key (data-api-key).");
      var pre = check();
      if (pre.ok === false) return void lock(pre.reason); // attribution theek nahi to fetch hi nahi
      if (pre.paused || pre.gone) return;
      loading = true;
      var qs = "sport=" + encodeURIComponent(sport) + (live ? "&live=1" : "") + (date ? "&date=" + encodeURIComponent(date) : "");
      fetch(BASE + "/api/live?" + qs, { headers: { "X-API-Key": key } })
        .then(function (r) { return r.json().then(function (j) { return { status: r.status, json: j }; }); })
        .then(function (res) {
          loading = false;
          var j = res.json || {};
          var at = j.attribution;
          if (at && at.required && at.brandName && isHttp(at.url)) {
            expected.brand = String(at.brandName); expected.url = at.url; paintBadge();
          }
          var post = check(); // render se pehle dobara verify
          if (post.ok === false) return void lock(post.reason);
          if (res.status === 401 || res.status === 403) return void showMessage("Widget unavailable: invalid API key or domain not allowed.");
          if (!Array.isArray(j.matches)) return void showMessage("Data unavailable.");
          if (!locked) render(j.matches);
        })
        .catch(function () { loading = false; if (!locked) showMessage("Data unavailable."); });
    }

    // ---------- watchers ----------
    function tick() {
      var r = check();
      if (r.gone) { stop(); return; }
      if (r.paused) return;
      if (r.ok === false) { if (!locked) lock(r.reason); }
      else if (locked) { locked = false; hideNotice(); showMessage("Loading\u2026"); load(); } // attribution wapas aa gayi
    }
    function stop() { clearInterval(timer); clearInterval(pollTimer); if (mo) mo.disconnect(); }

    var mo = null;
    try {
      // Host element ke attributes / parent tree mein badlaav par foran check
      mo = new MutationObserver(tick);
      mo.observe(document.documentElement, { attributes: true, childList: true, subtree: true, attributeFilter: ["style", "class", "hidden"] });
    } catch (e) {}
    timer = setInterval(tick, CHECK_EVERY);
    var pollTimer = setInterval(load, POLL_EVERY);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) { tick(); load(); } });

    showMessage("Loading\u2026");
    load();
  }

  function mountAll() {
    var nodes = document.querySelectorAll("[data-leaguescore-widget]");
    for (var i = 0; i < nodes.length; i++) mount(nodes[i]);
  }

  window.LeagueScoreWidget = { mount: mount, mountAll: mountAll };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountAll);
  else mountAll();
})();