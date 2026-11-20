// News body renderer: plain text YA HTML (h1-h4, news-box, bold, links…) ko safe HTML me badalta hai.
// Server (news detail page) aur browser (admin live preview) dono yahi function use karte hain,
// is liye preview aur final page bilkul same dikhte hain. Koi external package nahi chahiye.

const ALLOWED = new Set([
  "h1", "h2", "h3", "h4", "p", "div", "blockquote", "ul", "ol", "li",
  "strong", "b", "em", "i", "u", "s", "br", "hr", "a", "img", "code", "pre",
]);
const VOID = new Set(["br", "hr", "img"]);
const INLINE = new Set(["strong", "b", "em", "i", "u", "s", "a", "code", "br", "img"]);
const CONTAINER = new Set(["div", "blockquote"]); // in me plain text paragraphs ban jate hain
const HEADINGS = new Set(["h1", "h2", "h3", "h4"]);
// Inka tag + andar ka sab content hata diya jata hai
const DROP = new Set([
  "script", "style", "iframe", "object", "embed", "noscript", "template",
  "textarea", "select", "svg", "math", "head", "title", "frameset",
]);
const BOX_CLASS = "news-box"; // sirf yahi class allowed hai

const ENTITY_AMP = /&(?!(?:#\d{1,7}|#x[\da-f]{1,6}|[a-z][a-z0-9]{1,31});)/gi;
const escText = (s) => s.replace(ENTITY_AMP, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const chr = (n) => (n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "");

function decodeAttr(v) {
  return v
    .replace(/&#x([\da-f]+);?/gi, (_, h) => chr(parseInt(h, 16)))
    .replace(/&#(\d+);?/g, (_, d) => chr(Number(d)))
    .replace(/&colon;/gi, ":")
    .replace(/&tab;/gi, "\t")
    .replace(/&newline;/gi, "\n")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, "&");
}

function parseAttrs(raw) {
  const out = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m;
  while ((m = re.exec(raw))) {
    const k = m[1].toLowerCase();
    if (!(k in out)) out[k] = decodeAttr(m[2] ?? m[3] ?? m[4] ?? "");
  }
  return out;
}

// javascript:, data: wagairah block; sirf http(s), mailto, tel, /relative, #anchor
function safeUrl(v) {
  const u = (v || "").replace(/[\u0000-\u0020\u007f-\u009f\u200b-\u200f\u2028\u2029\ufeff]/g, "");
  return /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(u) ? u : "";
}

export function renderNewsBody(raw) {
  const src = String(raw ?? "").replace(/\r\n?/g, "\n");
  if (!src.trim()) return "";

  const root = { tag: null, attrs: "", container: true, out: "", buf: "" };
  const stack = [root];
  const top = () => stack[stack.length - 1];
  const inPre = () => stack.some((f) => f.tag === "pre");

  // container ke khule hue text ko paragraphs me todta hai (khali line = naya paragraph, ek enter = <br>)
  function flush(f) {
    if (!f.buf) return;
    for (const part of f.buf.split(/\n[ \t]*\n\s*/)) {
      const t = part.trim();
      if (t) f.out += "<p>" + t.replace(/\n/g, "<br>") + "</p>";
    }
    f.buf = "";
  }
  const addInline = (p, html) => (p.container ? (p.buf += html) : (p.out += html));
  const addBlock = (p, html) => {
    if (p.container) flush(p);
    p.out += html;
  };

  function closeTop() {
    const f = stack.pop();
    if (f.container) flush(f);
    if (!f.out.trim()) return;
    const html = `<${f.tag}${f.attrs}>${f.out}</${f.tag}>`;
    (INLINE.has(f.tag) ? addInline : addBlock)(top(), html);
  }

  function onText(t) {
    if (!t) return;
    const f = top();
    if (f.container) f.buf += escText(t);
    else if (f.tag === "ul" || f.tag === "ol") {
      if (t.trim()) f.out += "<li>" + escText(t.trim()) + "</li>";
    } else if (inPre()) f.out += escText(t);
    else f.out += escText(t).replace(/\s*\n\s*/g, " ");
  }

  function onClose(name) {
    if (!ALLOWED.has(name) || VOID.has(name)) return;
    let i = stack.length - 1;
    while (i > 0 && stack[i].tag !== name) i--;
    if (i <= 0) return;
    while (stack.length > i) closeTop();
  }

  function onOpen(name, rawAttrs) {
    if (!ALLOWED.has(name)) return; // unknown tag hata do, andar ka text rakho
    const at = parseAttrs(rawAttrs);

    if (name === "br") return addInline(top(), "<br>");
    if (name === "hr") return addBlock(top(), "<hr>");
    if (name === "img") {
      const src2 = safeUrl(at.src);
      if (!src2 || /^(mailto|tel|#)/i.test(src2)) return;
      const alt = escAttr((at.alt || "").replace(/\s+/g, " ").trim());
      return addInline(top(), `<img src="${escAttr(src2)}" alt="${alt}" loading="lazy">`);
    }
    if (stack.length >= 40) return;

    let attrs = "";
    if (name === "a") {
      const href = safeUrl(at.href);
      if (!href) return;
      attrs = ` href="${escAttr(href)}"` + (/^https?:/i.test(href) ? ' target="_blank" rel="noopener noreferrer nofollow"' : "");
    } else if (CONTAINER.has(name)) {
      if ((at.class || "").split(/\s+/).includes(BOX_CLASS)) attrs = ` class="${BOX_CLASS}"`;
    }

    if (!INLINE.has(name)) {
      if (name === "li") {
        const t = top().tag;
        if (t === "li") closeTop();
        if (!["ul", "ol"].includes(top().tag)) return; // ul/ol ke bahar li ignore
      } else {
        // naya block aaye to khula hua <p>/<h*> band kar do
        while (top().tag === "p" || HEADINGS.has(top().tag)) closeTop();
        if (top().container) flush(top());
      }
    }
    stack.push({ tag: name, attrs, container: CONTAINER.has(name), out: "", buf: "" });
  }

  const TOKEN = /<!--[\s\S]*?(?:-->|$)|<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;
  let last = 0;
  let m;
  while ((m = TOKEN.exec(src))) {
    if (m.index > last) onText(src.slice(last, m.index));
    last = TOKEN.lastIndex;
    if (m[0].startsWith("<!--")) continue;
    const name = m[2].toLowerCase();
    if (m[1] === "/") {
      onClose(name);
      continue;
    }
    if (DROP.has(name)) {
      if (!m[3].trim().endsWith("/")) {
        const re = new RegExp("</" + name + "\\s*>", "ig");
        re.lastIndex = last;
        const mm = re.exec(src);
        last = mm ? re.lastIndex : src.length;
        TOKEN.lastIndex = last;
      }
      continue;
    }
    onOpen(name, m[3]);
  }
  if (last < src.length) onText(src.slice(last));

  while (stack.length > 1) closeTop();
  flush(root);
  return root.out;
}