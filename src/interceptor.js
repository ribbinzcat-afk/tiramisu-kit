// ===== Tiramisu Kit — interceptor.js =====
// generate_interceptor (ประกาศใน manifest.json → globalThis.tiramisuKitInterceptor) — ST เรียกฟังก์ชันนี้
// ทุกครั้งก่อนเจนคำตอบหลัก (SillyTavern-release/public/script.js:4505 ภายใน Generate())
//
// สองหน้าที่:
// 1) ทุกโหมด: กติกาความลึกของ CoT — ตัด <planning>...</planning> ของข้อความเก่าที่ลึกเกินออกจาก prompt
//    ที่กำลังจะส่งจริง (chat ที่ interceptor ได้รับเป็น coreChat object ใหม่ที่ ST สร้างขึ้นเฉพาะรอบนี้ —
//    แก้ตรงนี้ไม่กระทบไฟล์แชทจริงเลย)
// 2) โหมด split + เปิด CoT: เจน CoT ของตัวเองก่อน ผ่าน tirakitGenerate (ConnectionProfile หรือ generateRaw
//    ซึ่งไม่วิ่งผ่าน Generate() จึงไม่ทำให้เกิด interceptor เรียกตัวเองซ้อน) แล้วเก็บผลไว้ใน pendingCot
//    ให้ index.js แปะกลับเข้า mes หลังคำตอบหลักมาถึง (ที่ MESSAGE_RECEIVED)
//
// deps: ./store.js, ./api.js, ./prompts.js, ./context.js

import { extensionName, getSettings } from "./store.js";
import { tirakitGenerate, recordTokens, stripReasoning } from "./api.js";
import { buildPrompt } from "./prompts.js";
import { buildCotContext } from "./context.js";
import { withStatus } from "./status.js";

let pendingCot = null; // { text, ms } — ผลลัพธ์ CoT รอบล่าสุดที่ยังไม่ได้แปะเข้า mes

// เรียกจาก index.js ตอน MESSAGE_RECEIVED — ดึงผลแล้วเคลียร์ทิ้ง (ใช้ได้ครั้งเดียวต่อการเจนหนึ่งรอบ)
export function takePendingCot() {
    const v = pendingCot;
    pendingCot = null;
    return v;
}

function stripDeepPlanning(chat, cotDepth) {
    if (!cotDepth) return; // 0 = ไม่จำกัด ไม่ต้องตัด
    const total = chat.length; // เรียงตามเวลา ล่าสุดอยู่ท้ายอาเรย์
    for (let i = 0; i < total; i++) {
        const depthFromEnd = total - i - 1;
        if (depthFromEnd < cotDepth) continue; // ยังอยู่ในระยะที่มองเห็นได้ ปล่อยไว้
        const entry = chat[i];
        if (entry && typeof entry.mes === "string" && entry.mes.includes("<planning")) {
            entry.mes = entry.mes
                .replace(/<planning>[\s\S]*?<\/planning>/gi, "")
                .replace(/<planning>[\s\S]*$/i, "");
        }
    }
}

export async function tiramisuKitInterceptor(chat, contextSize, abort, type) {
    try {
        const settings = getSettings();
        if (!settings.enabled) return;

        if (Array.isArray(chat)) stripDeepPlanning(chat, settings.cotDepth || 0);

        if (settings.genMode === "split" && settings.cotEnabled && type !== "quiet") {
            const ctx = SillyTavern.getContext();
            const context = buildCotContext(ctx, settings.cotContextMessages || 6);
            const instruction = buildPrompt("cot", {}, settings.prompts);
            const prompt = ctx.substituteParams(`${instruction}\n\n${context}`);
            const maxTokens = 700;
            await recordTokens(ctx, "cot", { instruction, context }, maxTokens);

            const t0 = Date.now();
            const raw = await withStatus("CoT", () => tirakitGenerate(ctx, "cot", prompt, maxTokens));
            const stripped = stripReasoning(raw).trim();
            if (stripped) {
                // เผื่อโมเดลเจนแนบ <planning> มาเองด้วย (ทำตามเทมเพลตที่ขอ) — ดึงเฉพาะเนื้อในเพื่อไปห่อเองอีกที
                const wrapped = stripped.match(/<planning>([\s\S]*?)<\/planning>/i);
                pendingCot = { text: (wrapped ? wrapped[1] : stripped).trim(), ms: Date.now() - t0 };
            }
        }
    } catch (e) {
        console.error(`[${extensionName}] generate_interceptor ล้มเหลว:`, e);
    }
}
