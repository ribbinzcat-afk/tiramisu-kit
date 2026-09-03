// ===== Tiramisu Kit — render/cot-box.js =====
// กล่องความคิด CoT (<planning>...</planning>) + กติกาความลึก (cotDepth)
// deps: render/templates.js (escapeText) เท่านั้น — ห้าม import จาก index.js

import { escapeText } from "./templates.js";

// จับ <planning>...</planning> — มี fallback จับบล็อกที่ไม่ปิดแท็ก (โดนตัดกลางคันเพราะ maxTokens ไม่พอ)
const PLANNING_CLOSED_RE = /<planning>([\s\S]*?)<\/planning>/i;
const PLANNING_OPEN_RE = /<planning>([\s\S]*)$/i;

export function extractPlanning(text) {
    const s = String(text ?? "");
    const closed = s.match(PLANNING_CLOSED_RE);
    if (closed) return { content: closed[1], closed: true, raw: closed[0] };
    const open = s.match(PLANNING_OPEN_RE);
    if (open) return { content: open[1], closed: false, raw: open[0] };
    return null;
}

export function stripPlanning(text) {
    return String(text ?? "")
        .replace(/<planning>[\s\S]*?<\/planning>/gi, "")
        .replace(/<planning>[\s\S]*$/i, ""); // เผื่อบล็อกที่โดนตัดกลางคันยังไม่ปิดแท็ก
}

// เรนเดอร์กล่องความคิดสไตล์ทิรามิสุ — พับเก็บเป็นค่าเริ่มต้น (autoOpen เปิดจากตั้งค่า)
// meta: ข้อความเสริมใต้หัวข้อ เช่น "เจนแยกใช้เวลา 3.2 วิ" (โหมด split) — ไม่ใส่ = ไม่แสดงแถวนี้
export function renderCotBox(content, { autoOpen = false, meta = "" } = {}) {
    const body = escapeText(String(content ?? "").trim()).replace(/\n/g, "<br>");
    const metaHtml = meta
        ? `<div style="font-size:0.75em; opacity:0.65; margin-top:6px;">${escapeText(meta)}</div>`
        : "";
    return `
<div class="tirakit-box-wrap tirakit-cot-wrap" style="max-width: 95%; margin: 10px auto 16px; font-family: 'Prompt', 'Sarabun', sans-serif; color: #5D4037; padding: 5px 10px;">
  <details class="tirakit-cot-box"${autoOpen ? " open" : ""} style="background: #FFF8E1; border: 2px solid #8D6E63; border-radius: 16px; box-shadow: 4px 4px 0px #8B4513; overflow: hidden;">
    <summary style="padding: 10px 18px; cursor: pointer; font-weight: 600; color: #5D4037; background: #FFE0B2; list-style: none; display: flex; align-items: center; justify-content: space-between; font-size: 0.9em;">
      <span>🍰 ห้องครัวของทิรามิสุ (ขั้นตอนคิด)</span>
      <span style="font-size: 0.8em; opacity: 0.7;">▼</span>
    </summary>
    <div style="padding: 14px 18px; background: repeating-linear-gradient(45deg, #FFF8E7, #FFF8E7 10px, #FFFAF0 10px, #FFFAF0 20px); font-size: 0.85em; line-height: 1.7; white-space: normal;">
      ${body}
      ${metaHtml}
    </div>
  </details>
</div>`.trim();
}

// แทนที่ <planning>...</planning> ในข้อความด้วยกล่อง (หรือลบทิ้งถ้าไม่มีเนื้อหา) — ใช้ตอน render ในจอ
export function replaceCotTag(text, opts) {
    const s = String(text ?? "");
    const found = extractPlanning(s);
    if (!found) return s;
    const box = renderCotBox(found.content, opts);
    return s.replace(found.raw, box);
}
