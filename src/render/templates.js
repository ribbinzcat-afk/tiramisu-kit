// ===== Tiramisu Kit — render/templates.js =====
// พอร์ต replaceString ของ regex script 3 ตัวจากพรีเซ็ตต้นฉบับ (Tiramisu Log / Char thought / RPG Status)
// มาเป็นฟังก์ชัน JS ที่ escape ทุกค่าที่จับได้ก่อนประกอบ HTML (ต้นฉบับยัด $1..$9 ลง HTML ดิบ ไม่ escape)
// deps: 0 — ห้าม import จากไฟล์อื่นในโปรเจกต์นี้

export function escapeText(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
}

// ===== Tiramisu's Log =====
// แท็กต้นฉบับ: <tiramisu_log>สถานที่|เวลา|อากาศ|ชุด|สถานะความสัมพันธ์|ค่าความสัมพันธ์</tiramisu_log>
const LOG_RE = /<tiramisu_log>([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^<]+)<\/tiramisu_log>/gi;

export function renderLogTag(match, place, time, weather, outfit, relStatus, relValue) {
    const [p, t, w, o, rs, rv] = [place, time, weather, outfit, relStatus, relValue].map((v) => escapeText(String(v).trim()));
    const rvNum = Math.max(0, Math.min(100, parseInt(rv, 10) || 0));
    return `
<div class="tirakit-box-wrap" style="font-family: 'Prompt', 'Sarabun', sans-serif; max-width: 100%; margin: 10px auto 20px; padding: 5px 10px;">
  <details class="tirakit-log-box" style="background: #FFF8E7; border: 2px solid #D2B48C; border-radius: 20px; box-shadow: 4px 4px 0px #8B4513; overflow: hidden; color: #5D4037;">
    <summary style="background: #D2B48C; padding: 12px 20px; cursor: pointer; font-weight: bold; color: #FFF; text-shadow: 1px 1px 0 #5D4037; list-style: none; display: flex; align-items: center; justify-content: space-between; outline: none;">
      <span>🍰 Tiramisu Log</span>
      <span style="background: #FFF; color: #8B4513; padding: 2px 8px; border-radius: 10px; font-size: 0.8em;">▼ เปิด</span>
    </summary>
    <div style="padding: 20px; background: repeating-linear-gradient(45deg, #FFF8E7, #FFF8E7 10px, #FFFAF0 10px, #FFFAF0 20px);">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
        <div style="background: #FFF; padding: 8px; border-radius: 12px; border: 1px dashed #D2B48C; font-size: 0.85em; text-align: center;">📍 <strong>สถานที่</strong><br>${p}</div>
        <div style="background: #FFF; padding: 8px; border-radius: 12px; border: 1px dashed #D2B48C; font-size: 0.85em; text-align: center;">🕒 <strong>เวลา</strong><br>${t}</div>
      </div>
      <div style="background: rgba(255,255,255,0.8); padding: 10px; border-radius: 12px; border-left: 4px solid #8B4513; margin-bottom: 15px; font-size: 0.9em;">
        🌤️ <strong>สภาพอากาศ:</strong> ${w}<br>
        👕 <strong>ชุด:</strong> ${o}
      </div>
      <div style="background: #FEF0E6; padding: 10px; border-radius: 12px; font-size: 0.9em;">
        💌 <strong>สถานะความสัมพันธ์:</strong> ${rs}<br>
        <div style="margin-top: 6px; height: 10px; border-radius: 6px; background: #EADBC8; overflow: hidden;">
          <div style="height: 100%; width: ${rvNum}%; background: linear-gradient(90deg, #D2691E, #8B4513); border-radius: 6px;"></div>
        </div>
        <div style="text-align: right; font-size: 0.8em; margin-top: 2px;">${rvNum} / 100</div>
      </div>
    </div>
  </details>
</div>`.trim();
}

export function replaceTiramisuLog(text) {
    return String(text ?? "").replace(LOG_RE, renderLogTag);
}

// ===== Char's Note =====
// แท็กต้นฉบับ: <char_note>ความคิดของตัวละคร</char_note>
const CHAR_NOTE_RE = /<char_note>([^<]+)<\/char_note>/gi;

export function renderCharNoteTag(match, thought) {
    const t = escapeText(String(thought).trim());
    return `
<div class="tirakit-box-wrap" style="max-width: 100%; margin: 20px auto; font-family: 'Prompt', sans-serif; color: #4E342E; padding: 5px 10px;">
  <details class="tirakit-charnote-box" open style="background-color: #FFF8E1; border: 2px solid #8D6E63; border-radius: 12px; box-shadow: 4px 4px 0px #6D4C41; overflow: hidden;">
    <summary style="padding: 12px 20px; cursor: pointer; font-weight: 600; color: #5D4037; background: #FFF8E7; list-style: none; display: flex; align-items: center; justify-content: space-between; font-size: 0.95em;">
      <span style="display: flex; align-items: center; gap: 8px;">🍰 <span style="letter-spacing: 1px; text-transform: uppercase; font-size: 0.85em;">Secret Ingredients</span></span>
      <span style="font-size: 0.8em; opacity: 0.6;">▼</span>
    </summary>
    <div style="padding: 15px 20px; background-color: #FFF3E0; border-top: 1px dashed #A1887F; font-size: 0.9em; line-height: 1.6; color: #5D4037; position: relative;">
      <div style="position: absolute; top: 10px; right: 15px; font-size: 2em; opacity: 0.1; font-family: serif;">☕</div>
      ${t}
    </div>
  </details>
</div>`.trim();
}

export function replaceCharNote(text) {
    return String(text ?? "").replace(CHAR_NOTE_RE, renderCharNoteTag);
}

// ===== RPG Status =====
// แท็กต้นฉบับ: <rpg_status>user|Class|HP|MP|STR|INT|AGI|LUCK|CHARM</rpg_status>
const RPG_RE = /<rpg_status>([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^<]+)<\/rpg_status>/gi;

function clampPct(v) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
}

function statRow(label, value) {
    const v = escapeText(String(value).trim());
    return `<div style="display:flex; justify-content:space-between; padding:4px 10px; font-size:0.85em; border-bottom:1px dashed #D7CCC8;"><span>${label}</span><span style="font-weight:600;">${v}</span></div>`;
}

export function renderRpgStatusTag(match, user, cls, hp, mp, str, intl, agi, luck, charm) {
    const u = escapeText(String(user).trim());
    const c = escapeText(String(cls).trim());
    const hpN = clampPct(hp);
    const mpN = clampPct(mp);
    return `
<div class="tirakit-box-wrap" style="max-width: 100%; margin: 20px auto; font-family: 'Prompt', sans-serif; color: #5D4037; padding: 5px 10px;">
  <div class="tirakit-rpg-box" style="background: #FFF8E1; border: 2px solid #8D6E63; border-radius: 20px; padding: 20px; box-shadow: 6px 6px 0px #6D4C41; position: relative; overflow: hidden;">
    <div style="position: absolute; top: -15px; left: 50%; transform: translateX(-50%); background: #6D4C41; color: #FFF; padding: 15px 20px 5px 20px; border-radius: 0 0 15px 15px; font-size: 0.7em; letter-spacing: 2px; font-weight: 600;">STATUS</div>
    <div style="text-align: center; margin-top: 15px; margin-bottom: 20px; border-bottom: 2px dashed #D7CCC8; padding-bottom: 15px;">
      <div style="font-size: 1.5em; font-weight: 700; color: #4E342E; margin-bottom: 4px;">${u}</div>
      <div style="display: inline-block; background: #EFEBE9; color: #8D6E63; padding: 4px 12px; margin: 5px; border-radius: 20px; font-size: 0.85em; font-weight: 500;">${c}</div>
    </div>
    <div style="margin-bottom: 20px; padding: 0 5px;">
      <div style="display: flex; justify-content: space-between; font-size: 0.8em; margin-bottom: 5px; color: #795548;"><span>☕ Caffeine (HP)</span><span>${hpN}%</span></div>
      <div style="height: 12px; border-radius: 6px; background: #EADBC8; overflow: hidden; margin-bottom: 10px;"><div style="height:100%; width:${hpN}%; background: linear-gradient(90deg,#D2691E,#8B4513);"></div></div>
      <div style="display: flex; justify-content: space-between; font-size: 0.8em; margin-bottom: 5px; color: #795548;"><span>🥛 Cream (MP)</span><span>${mpN}%</span></div>
      <div style="height: 12px; border-radius: 6px; background: #EADBC8; overflow: hidden;"><div style="height:100%; width:${mpN}%; background: linear-gradient(90deg,#A1887F,#6D4C41);"></div></div>
    </div>
    <div style="background: #FFF3E0; border-radius: 12px; padding: 4px 0;">
      ${statRow("STR", str)}
      ${statRow("INT", intl)}
      ${statRow("AGI", agi)}
      ${statRow("LUCK", luck)}
      ${statRow("CHARM", charm)}
    </div>
  </div>
</div>`.trim();
}

export function replaceRpgStatus(text) {
    return String(text ?? "").replace(RPG_RE, renderRpgStatusTag);
}

// ===== Livestream Chat =====
// แท็ก: <livechat viewers="1234">\nชื่อ: ข้อความ\nชื่อ [฿100]: ข้อความ\n</livechat>
// แยกบรรทัด/ชื่อ/โดเนทด้วย JS ฝั่ง extension แล้วประกอบ HTML inline style ที่ escape แล้วทุกช่อง
// (ไม่ต้องพึ่ง Tavern Helper) — จุด LIVE กะพริบใช้ @keyframes tirakit-live-blink จาก style.css
const LIVECHAT_RE = /<livechat\b([^>]*)>([\s\S]*?)<\/livechat>/gi;
const LIVECHAT_COLORS = ["#ff7eb6", "#7ec8ff", "#9dff9a", "#ffcf6e", "#c49bff", "#6ef0e0", "#ff9f6e", "#f5f07a"];

function livechatColor(name) {
    let h = 0;
    for (const ch of String(name)) h = (h * 31 + ch.codePointAt(0)) >>> 0;
    return LIVECHAT_COLORS[h % LIVECHAT_COLORS.length];
}

function livechatRow(line) {
    const cut = line.indexOf(":");
    if (cut < 1) return "";
    let who = line.slice(0, cut).trim();
    const text = line.slice(cut + 1).trim();
    let amt = "";
    const m = who.match(/^(.*?)\s*\[([^\]]+)\]$/);
    if (m) { who = m[1].trim(); amt = m[2].trim(); }
    if (!who || !text) return "";
    const name = `<span style="font-weight:700; margin-right:6px; color:${livechatColor(who)};">${escapeText(who)}</span>`;
    if (amt) {
        return `<div style="font-size:0.9em; line-height:1.55; word-break:break-word; background:linear-gradient(90deg,#3a2a12,#2a2012); border:1px solid #6b4d1a; border-radius:10px; padding:6px 10px;">`
            + `<span style="display:inline-flex; align-items:center; gap:4px; background:#f2b33d; color:#2a1a00; font-weight:700; font-size:0.8em; padding:1px 8px; border-radius:999px; margin-right:6px;"><i class="fa-solid fa-gift"></i> ${escapeText(amt)}</span>`
            + `${name}<span style="color:#ffe7b8;">${escapeText(text)}</span></div>`;
    }
    return `<div style="font-size:0.9em; line-height:1.55; word-break:break-word;">${name}<span>${escapeText(text)}</span></div>`;
}

export function renderLivechatTag(match, attrs, body) {
    const vMatch = String(attrs).match(/viewers\s*=\s*["']?([^"'>]*)/i);
    const vNum = vMatch ? parseInt(vMatch[1].replace(/[^\d]/g, ""), 10) : NaN;
    const viewers = Number.isFinite(vNum) ? vNum.toLocaleString("en-US") : "—";
    const rows = String(body).split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map(livechatRow).join("");
    if (!rows) return "";
    return `<div class="tirakit-box-wrap tirakit-livechat" style="max-width:100%; margin:14px auto; padding:0 6px; font-family:'Prompt','Sarabun',sans-serif;">`
        + `<div style="max-width:560px; margin:0 auto; background:#17151f; border:1px solid #2e2a3d; border-radius:14px; overflow:hidden; color:#ece9f5; box-shadow:0 4px 18px rgba(0,0,0,0.3);">`
        + `<div style="display:flex; align-items:center; gap:10px; padding:9px 14px; background:linear-gradient(90deg,#241f33,#1b1826); border-bottom:1px solid #2e2a3d;">`
        + `<span style="display:inline-flex; align-items:center; gap:6px; background:#e5364a; color:#fff; font-weight:700; font-size:0.75em; letter-spacing:0.06em; padding:2px 9px; border-radius:6px;"><span style="width:7px; height:7px; border-radius:50%; background:#fff; animation:tirakit-live-blink 1.4s infinite;"></span>LIVE</span>`
        + `<span style="flex:1;"></span>`
        + `<span style="display:inline-flex; align-items:center; gap:6px; font-size:0.85em; font-weight:600; color:#ff8a9a;"><i class="fa-solid fa-eye"></i> ${escapeText(viewers)}</span>`
        + `</div>`
        + `<div style="padding:10px 14px 12px; display:flex; flex-direction:column; gap:6px; max-height:280px; overflow-y:auto;">${rows}</div>`
        + `</div></div>`;
}

export function replaceLivechat(text) {
    return String(text ?? "").replace(LIVECHAT_RE, renderLivechatTag);
}

// ===== ตัวรวม =====
// เรียกทั้ง 3 ตัวตามลำดับ — แท็กที่ช่องไม่ครบ (regex ไม่ match) จะถูกปล่อยผ่านเป็นข้อความดิบ ไม่พัง
export function renderTiramisuUiTags(text) {
    let out = String(text ?? "");
    out = replaceTiramisuLog(out);
    out = replaceCharNote(out);
    out = replaceRpgStatus(out);
    out = replaceLivechat(out);
    return out;
}
