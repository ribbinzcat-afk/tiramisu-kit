// ===== Tiramisu Kit — dialogue/render.js =====
// แปลง <say name="..." mood="...">"บทพูด"</say> (และเครื่องหมายคำพูดในข้อความของผู้ใช้) เป็น
// - โหมดข้อความสี: <span> สีประจำตัวละคร แทรกในย่อหน้าเดิม
// - โหมด UI: กล่องตามธีม (messenger / vn / simple) พร้อมรูปที่ครอปไว้
// ผลลัพธ์เป็น HTML บรรทัดเดียว (ไม่มีบรรทัดว่าง/ย่อหน้าเยื้อง กัน markdown ของ ST ตีความผิด) แล้วส่งต่อให้
// ctx.messageFormatting() ใน render/mount.js — ST จะเติม "custom-" หน้าคลาสทุกตัว CSS จึงเขียนเป็น .custom-tirakit-dlg-*
//
// deps: ./data.js, ../render/templates.js (escapeText)

import { escapeText } from "../render/templates.js";
import { resolveSpeaker, fallbackColor, normName } from "./data.js";

// [\s\S]*? ปลอดภัยตรงนี้เพราะจำกัดด้วยแท็กปิดที่ตายตัว — แท็กที่ยังไม่ปิด (กำลังสตรีม) จะไม่ match และปล่อยผ่าน
const SAY_RE = /<say\b([^>]*)>([\s\S]*?)<\/say>/gi;
// เครื่องหมายคำพูดในข้อความของผู้ใช้ — จำกัดความยาวและห้ามข้ามบรรทัด กัน backtrack ยาว
const USER_QUOTE_RE = /“[^”\n]{1,500}”|"[^"\n]{1,500}"|「[^」\n]{1,500}」/g;

export const SAY_TEST_RE = /<say\b/i;
export const QUOTE_TEST_RE = /["“「]/;

function attr(attrs, key) {
    const m = String(attrs).match(new RegExp(`\\b${key}\\s*=\\s*["']([^"'<>]*)["']`, "i"));
    return m ? m[1].trim() : "";
}

// ครอปด้วย <img> ขยาย/เลื่อนภายในกรอบ overflow:hidden — ไม่ใช้ background:url() เพราะ ST ตัด url() ใน style ได้
function imgHtml(src, crop) {
    const s = escapeText(src);
    if (crop && crop.w > 0 && crop.h > 0) {
        const w = (100 / crop.w).toFixed(3);
        const h = (100 / crop.h).toFixed(3);
        const l = (-crop.x / crop.w * 100).toFixed(3);
        const t = (-crop.y / crop.h * 100).toFixed(3);
        return `<img src="${s}" alt="" draggable="false" style="position:absolute; max-width:none; max-height:none; margin:0; border:0; border-radius:0; width:${w}%; height:${h}%; left:${l}%; top:${t}%;">`;
    }
    return `<img src="${s}" alt="" draggable="false" style="position:absolute; max-width:none; max-height:none; margin:0; border:0; border-radius:0; inset:0; width:100%; height:100%; object-fit:cover; object-position:top;">`;
}

function picHtml(speaker, name, mood, cropKind) {
    const e = speaker?.entry;
    const moodKey = mood && e?.moods ? Object.keys(e.moods).find((k) => normName(k) === normName(mood)) : null;
    const img = (moodKey && e.moods[moodKey]?.path ? e.moods[moodKey] : null) || e?.img || null;
    if (img?.path) return imgHtml(img.path, img.crop?.[cropKind]);
    if (speaker?.defaultSrc) return imgHtml(speaker.defaultSrc, null);
    return `<b>${escapeText(Array.from(String(name).trim())[0] || "?")}</b>`;
}

function colorOf(speaker, name, tone) {
    const c = speaker?.entry?.color;
    return /^(#[0-9a-f]{3,8}|hsl\([^)]*\)|rgb\([^)]*\))$/i.test(String(c || "")) ? c : fallbackColor(tone, name);
}

function uiBlock(theme, { name, mood, text, color, textColor, speaker, right }) {
    const r = right ? " tirakit-dlg-r" : "";
    const n = escapeText(name);
    const m = mood ? `<small class="tirakit-dlg-mood">${escapeText(mood)}</small>` : "";
    const style = `--tirakit-c:${color}; --tirakit-t:${textColor};`;
    if (theme === "vn") {
        return `<div class="tirakit-dlg tirakit-dlg-vn${r}" style="${style}"><div class="tirakit-dlg-pic">${picHtml(speaker, name, mood, "vn")}</div><div class="tirakit-dlg-box"><div class="tirakit-dlg-plate"><span>${n}${m}</span></div><div class="tirakit-dlg-text">${text}</div><span class="tirakit-dlg-next">▼</span></div></div>`;
    }
    if (theme === "simple") {
        return `<div class="tirakit-dlg tirakit-dlg-simple${r}" style="${style}"><div class="tirakit-dlg-pic">${picHtml(speaker, name, mood, "avatar")}</div><div class="tirakit-dlg-st"><div class="tirakit-dlg-name">${n}${m}</div><div class="tirakit-dlg-text">${text}</div></div></div>`;
    }
    return `<div class="tirakit-dlg tirakit-dlg-msg${r}" style="${style}"><div class="tirakit-dlg-pic">${picHtml(speaker, name, mood, "avatar")}</div><div class="tirakit-dlg-col"><span class="tirakit-dlg-name">${n}${m}</span><div class="tirakit-dlg-bub">${text}</div></div></div>`;
}

// opts: { ctx, roster, isUser, ui, theme, tone, userQuotes, textColor }
// textColor: "char" = สีบทพูดเป็นสีประจำตัวละคร | "quote" = ใช้สีคำพูดของธีม ST (SmartThemeQuoteColor)
export function renderDialogue(rawText, opts) {
    const { ctx, roster, isUser, ui, theme, tone, userQuotes } = opts;
    const useQuoteColor = opts.textColor === "quote";
    let out = String(rawText ?? "");

    const render = (name, mood, inner, forceUser) => {
        const speaker = forceUser ? resolveSpeaker(ctx, roster, ctx?.name1 || "") : resolveSpeaker(ctx, roster, name);
        const shownName = forceUser ? (ctx?.name1 || name) : name;
        const color = colorOf(speaker, shownName, tone);
        const text = escapeText(String(inner).trim());
        const textColor = useQuoteColor ? "var(--SmartThemeQuoteColor, #e6a15b)" : color;
        if (!ui) return `<span class="tirakit-dlg-t" style="color:${textColor};">${text}</span>`;
        const right = Boolean(speaker?.isUser || forceUser);
        return uiBlock(theme, { name: shownName, mood, text, color, textColor, speaker, right });
    };

    out = out.replace(SAY_RE, (m, attrs, inner) => {
        const name = attr(attrs, "name");
        if (!name || !String(inner).trim()) return String(inner);
        return render(name, attr(attrs, "mood"), inner, false);
    });

    if (isUser && userQuotes && !SAY_TEST_RE.test(rawText)) {
        // แปลงเฉพาะข้อความนอกแท็ก HTML — กันไปจับเครื่องหมายคำพูดใน attribute
        out = out.split(/(<[^>]*>)/).map((part) => (part.startsWith("<") ? part : part.replace(USER_QUOTE_RE, (q) => render("", "", q, true)))).join("");
    }
    return out;
}

// แปลงแท็กกลับเป็นข้อความธรรมดา "ชื่อ: บทพูด" — ใช้ตัดแท็กออกจาก prompt ที่ส่งจริง (ประหยัดโทเคน)
export function stripSayTags(text) {
    return String(text ?? "").replace(SAY_RE, (m, attrs, inner) => {
        const name = attr(attrs, "name");
        const t = String(inner).trim();
        return name ? `${name}: ${t}` : t;
    });
}
