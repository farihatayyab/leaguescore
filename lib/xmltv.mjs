// XMLTV (EPG) parser — koi external package nahi chahiye.
// Input: XML text.  Output: { channels, programmes }  (times unix seconds me)

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

export function decode(s = "") {
  return String(s)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, c) => c)
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
      if (e[0] === "#") {
        const n = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : "";
      }
      return ENT[e.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, " ")
    .trim();
}

function attrs(str) {
  const out = {};
  const re = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let m;
  while ((m = re.exec(str))) out[m[1]] = decode(m[2] ?? m[3] ?? "");
  return out;
}

// "20261121150000 +0500"  ->  unix seconds
export function parseXmltvDate(s) {
  const m = /^\s*(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?\s*([+-]\d{4}|Z)?/.exec(s || "");
  if (!m) return null;
  const [, y, mo = "01", d = "01", h = "00", mi = "00", se = "00", tz] = m;
  let t = Date.UTC(+y, +mo - 1, +d, +h, +mi, +se) / 1000;
  if (tz && tz !== "Z") {
    const sign = tz[0] === "-" ? -1 : 1;
    t -= sign * (parseInt(tz.slice(1, 3), 10) * 3600 + parseInt(tz.slice(3, 5), 10) * 60);
  }
  return Number.isFinite(t) ? t : null;
}

const first = (body, tag) => {
  const m = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i").exec(body);
  return m ? decode(m[1]) : "";
};

const iconOf = (body) => {
  const m = /<icon\s[^>]*?src\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(body);
  return m ? decode(m[1] ?? m[2] ?? "") : "";
};

/**
 * Streaming parser: chhote-chhote text chunks do (push), poori file ek saath memory me nahi chahiye.
 * win = { from, to } : sirf wo programmes rakho jo is window se takrate hain (unix seconds)
 */
export function createXmltvParser(win = {}) {
  const from = win.from ?? -Infinity;
  const to = win.to ?? Infinity;
  const channels = [];
  const programmes = [];
  const seen = new Set();
  let buf = "";
  let sawTv = false;

  const re = /<channel\s([^>]*)>([\s\S]*?)<\/channel>|<programme\s([^>]*?)(?:\/>|>([\s\S]*?)<\/programme>)/gi;

  function onChannel(attrStr, body) {
    const id = attrs(attrStr).id;
    if (!id || seen.has(id)) return;
    seen.add(id);
    channels.push({ xid: id.slice(0, 190), name: (first(body, "display-name") || id).slice(0, 190), icon: iconOf(body).slice(0, 500) });
  }

  function onProgramme(attrStr, body = "") {
    const a = attrs(attrStr);
    const start = parseXmltvDate(a.start);
    let stop = parseXmltvDate(a.stop);
    if (!a.channel || start == null) return;
    if (stop == null || stop <= start) stop = start + 30 * 60;
    if (stop < from || start > to) return;
    programmes.push({
      xid: a.channel.slice(0, 190),
      start,
      stop,
      title: (first(body, "title") || "Untitled").slice(0, 255),
      subtitle: first(body, "sub-title").slice(0, 255),
      description: first(body, "desc").slice(0, 1000),
      category: first(body, "category").slice(0, 120),
      icon: iconOf(body).slice(0, 500),
    });
  }

  function drain(final) {
    re.lastIndex = 0;
    let end = 0;
    let m;
    while ((m = re.exec(buf))) {
      end = re.lastIndex;
      if (m[1] !== undefined) onChannel(m[1], m[2]);
      else onProgramme(m[3], m[4]);
    }
    let rest = buf.slice(end);
    if (!final) {
      // adhoora element shuru ho chuka ho to wahin se rakho, warna bas aakhri thora sa hissa
      const i = Math.max(rest.lastIndexOf("<channel"), rest.lastIndexOf("<programme"));
      rest = i >= 0 ? rest.slice(i) : rest.slice(-20);
    } else rest = "";
    buf = rest;
  }

  function take() {
    const out = { channels: channels.splice(0), programmes: programmes.splice(0) };
    return out;
  }

  return {
    push(text) {
      if (!sawTv && /<tv[\s>]/i.test(buf.slice(-40) + text.slice(0, 4000))) sawTv = true;
      buf += text;
      drain(false);
    },
    // abhi tak kitne programmes/channels jama hain (take() se pehle)
    size: () => programmes.length + channels.length,
    // jama hua data nikaal lo (aur parser ki list khali kar do)
    take,
    end() {
      drain(true);
      // Jin channels ka <channel> block nahi tha magar programmes hain, unhe bhi bana do
      const undeclared = [];
      for (const p of programmes) {
        if (!seen.has(p.xid)) {
          seen.add(p.xid);
          undeclared.push({ xid: p.xid, name: p.xid, icon: "" });
        }
      }
      channels.push(...undeclared);
      return { ...take(), sawTv };
    },
  };
}

// Poora XML text ek saath ho to
export function parseXmltv(xml, win = {}) {
  const p = createXmltvParser(win);
  p.push(xml);
  return p.end();
}