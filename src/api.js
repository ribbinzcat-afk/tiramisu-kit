// ===== Tiramisu Kit — api.js =====
// จุดเดียวที่ยิง generation ออกไปหา AI ทั้งโปรเจกต์ + นับโทเคนด้วย tokenizer ของ ST
// กติกา: import จาก store.js ได้เท่านั้น (ห้าม import จาก index.js)
//
// ⚠️ สำคัญมาก: ฟังก์ชันในไฟล์นี้ (โดยเฉพาะที่เรียกจาก interceptor.js) ห้ามใช้ ctx.generateQuietPrompt เป็น fallback
// generateQuietPrompt วิ่งผ่าน Generate() เต็มระบบ และ generate_interceptor ของเราเองถูก await
// อยู่กลาง Generate() พอดี (SillyTavern-release/public/script.js:4505) — ถ้า fallback ไปเรียก
// generateQuietPrompt จาก interceptor จะเกิดการเรียก Generate() ซ้อน Generate() ที่กำลังรันอยู่ (ลูปไม่รู้จบ)
// จึงต้องใช้ ctx.generateRaw (ไม่มี history/world info, ไม่ยิง GENERATION_STARTED/ENDED) เป็น fallback เสมอ

import { extensionName, getSetting } from "./store.js";

// เก็บสถิติการยิงครั้งล่าสุดของแต่ละงาน (label -> breakdown) ให้แท็บ "โทเคน" ในแผงมาอ่าน
export const lastCalls = {};   // label -> { breakdown: {part:tokens}, total, ts, maxTokens }

// นับโทเคนด้วย tokenizer ของ ST เสมอ (ตัวเดียวกับที่ ST ใช้จริง) — fallback chars/4 ถ้าเวอร์ชันไม่มี/ยิง error
export async function countTokens(ctx, text) {
    text = String(text || "");
    if (!text) return 0;
    try {
        if (typeof ctx.getTokenCountAsync === "function") {
            const n = await ctx.getTokenCountAsync(text);
            if (typeof n === "number" && n >= 0) return n;
        } else if (typeof ctx.getTokenCount === "function") {
            const n = ctx.getTokenCount(text);
            if (typeof n === "number" && n >= 0) return n;
        }
    } catch (e) {
        console.warn(`[${extensionName}] countTokens ล้มเหลว ใช้ fallback:`, e);
    }
    return Math.ceil(text.length / 4);
}

// บันทึก breakdown โทเคนของการเจนหนึ่งครั้ง — เรียก "ก่อน" ยิงจริงเสมอ เพื่อให้แท็บโทเคนเห็นแม้ generate ล้มเหลว
export async function recordTokens(ctx, label, parts, maxTokens) {
    const breakdown = {};
    let total = 0;
    for (const [name, text] of Object.entries(parts || {})) {
        const n = await countTokens(ctx, text);
        breakdown[name] = n;
        total += n;
    }
    lastCalls[label] = { breakdown, total, ts: Date.now(), maxTokens: maxTokens || 0 };
    return lastCalls[label];
}

// feature: "cot" | "theatre" | "tiramisuUi" | "" (ค่ารวม) — คืน profileId ที่จะใช้จริง (override ก่อน แล้วค่อย fallback ไปค่ารวม)
export function resolveProfile(feature) {
    const overrideKey = {
        cot: "apiProfileCot",
        theatre: "apiProfileTheatre",
        tiramisuUi: "apiProfileTiramisuUi",
    }[feature];
    const override = overrideKey ? getSetting(overrideKey) : "";
    if (override) return override;
    return getSetting("apiProfile") || "";
}

// เติม <option> ของ Connection Profile ปัจจุบันเข้า <select> — ใช้ร่วมกันทั้ง 4 dropdown (ค่ารวม + 3 override)
export function listConnectionProfiles(ctx) {
    try {
        return (ctx.extensionSettings?.connectionManager || {}).profiles || [];
    } catch (e) {
        console.warn(`[${extensionName}] อ่าน Connection Manager ไม่ได้:`, e);
        return [];
    }
}

// ยิง generation — ใช้ Connection Profile ถ้าตั้งไว้ (ตาม feature) ไม่งั้น fallback ไป generateRaw
// prompt เป็น string ธรรมดา (คำสั่งระบบ + context ที่ประกอบมาแล้วจาก buildPrompt + substituteParams)
export async function tirakitGenerate(ctx, feature, prompt, maxTokens) {
    if (!getSetting("enabled")) {
        console.warn(`[${extensionName}] tirakitGenerate ถูกเรียกขณะปิดสวิตช์หลัก — ยกเลิก`);
        return "";
    }
    const profileId = resolveProfile(feature);
    if (profileId && ctx.ConnectionManagerRequestService) {
        try {
            const res = await ctx.ConnectionManagerRequestService.sendRequest(profileId, prompt, maxTokens);
            const content = res && typeof res.content === "string" ? res.content : "";
            if (content) return content;
            console.warn(`[${extensionName}] connection profile (${feature}) ตอบข้อความว่าง — fallback ไป API หลัก`);
        } catch (e) {
            console.error(`[${extensionName}] connection profile (${feature}) request ล้มเหลว fallback ไป API หลัก:`, e);
        }
    }
    if (typeof ctx.generateRaw !== "function") {
        console.error(`[${extensionName}] เวอร์ชัน SillyTavern นี้ไม่มี generateRaw`);
        toastr.error("เวอร์ชัน SillyTavern นี้ไม่รองรับการเจนแบบไม่แตะประวัติแชท", "Tiramisu Kit");
        return "";
    }
    return await ctx.generateRaw({ prompt, responseLength: maxTokens });
}

// ตัด reasoning/think block ที่โมเดลบางตัวแนบมาออกก่อน parse (กันขยะปนกับแท็กของเรา)
export function stripReasoning(raw) {
    return String(raw || "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}
