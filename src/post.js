// ===== Tiramisu Kit — post.js =====
// โหมด split: เจน Mini Theatre / Tiramisu's UI "ตามหลัง" คำตอบหลัก (เรียกจาก index.js ตอน MESSAGE_RECEIVED)
// ส่งคำตอบหลักที่เพิ่งเจนเสร็จเป็นบริบทให้โมดูลเหล่านี้อ้างอิง แล้วต่อผลลัพธ์ท้าย mes ของข้อความเดียวกัน
//
// - Tiramisu's UI (log/charNote/rpgStatus): เจนแท็กย่อ (<tiramisu_log>...) ต่อท้าย mes ดิบ แล้วปล่อยให้
//   render/mount.js แปลงเป็นกล่องตอนแสดงผล (ใช้เส้นทาง render เดียวกับโหมด single ทุกประการ)
// - Mini Theatre (forum/abo/interview): เจน HTML สำเร็จรูปเลย (สไตล์ inline ตาม Art Direction) ต่อท้าย mes ตรงๆ
//   เพราะ ST render <div style="..."> ที่ฝังมาในข้อความได้อยู่แล้วโดยไม่ต้องผ่าน regex/parser ใดๆ เพิ่ม
//
// deps: ./store.js, ./api.js, ./prompts.js, ./context.js, ./modules.js — ห้าม import จาก index.js

import { extensionName, getSettings } from "./store.js";
import { tirakitGenerate, recordTokens, stripReasoning } from "./api.js";
import { buildPrompt } from "./prompts.js";
import { buildPostContext } from "./context.js";
import { modulesInGroup } from "./modules.js";

let isPostBusy = false; // กันชนกันถ้ามีคิวซ้อน (เช่น สไวป์รัวๆ ก่อนรอบก่อนเจนเสร็จ)

async function genTag(ctx, feature, promptId, context, maxTokens, settings) {
    const instruction = buildPrompt(promptId, {}, settings.prompts);
    const prompt = ctx.substituteParams(`${instruction}\n\n${context}`);
    await recordTokens(ctx, promptId, { instruction, context }, maxTokens);
    const raw = await tirakitGenerate(ctx, feature, prompt, maxTokens);
    return stripReasoning(raw).trim();
}

// เรียกจาก index.js ตอน MESSAGE_RECEIVED (เฉพาะโหมด split) — mesId = ข้อความที่เพิ่งเจนเสร็จ
export async function runPostGeneration(ctx, mesId) {
    const settings = getSettings();
    if (!settings.enabled || settings.genMode !== "split") return;

    const message = ctx.chat?.[mesId];
    if (!message || message.is_user || message.is_system) return;

    const tuiOn = settings.tiramisuUi || {};
    const theatreOn = settings.theatre || {};
    const wantTui = Boolean(tuiOn.log || tuiOn.charNote || tuiOn.rpgStatus);
    const wantTheatre = Boolean(theatreOn.artDirection && (theatreOn.forum || theatreOn.abo || theatreOn.interview));
    if (!wantTui && !wantTheatre) return;

    if (isPostBusy) {
        console.warn(`[${extensionName}] เจนตามหลังรอบก่อนยังไม่เสร็จ — ข้ามรอบนี้`);
        return;
    }
    isPostBusy = true;
    try {
        const context = buildPostContext(ctx, message.mes);
        let appended = "";

        if (wantTui) {
            for (const mod of modulesInGroup("tiramisuUi")) {
                if (!tuiOn[mod.id]) continue;
                try {
                    const out = await genTag(ctx, "tiramisuUi", mod.promptId, context, 300, settings);
                    if (out) appended += `\n\n${out}`;
                } catch (e) {
                    console.error(`[${extensionName}] เจน ${mod.label} ตามหลังล้มเหลว:`, e);
                }
            }
        }

        if (wantTheatre) {
            const artDirection = buildPrompt("theatreArtDirection", {}, settings.prompts);
            for (const mod of modulesInGroup("theatre")) {
                if (mod.id === "artDirection" || !theatreOn[mod.id]) continue;
                try {
                    const instruction = `${artDirection}\n\n${buildPrompt(mod.promptId, {}, settings.prompts)}`;
                    const prompt = ctx.substituteParams(`${instruction}\n\n${context}`);
                    await recordTokens(ctx, mod.promptId, { instruction, context }, 700);
                    const raw = await tirakitGenerate(ctx, "theatre", prompt, 700);
                    const out = stripReasoning(raw).trim();
                    if (out) appended += `\n\n${out}`;
                } catch (e) {
                    console.error(`[${extensionName}] เจน ${mod.label} ตามหลังล้มเหลว:`, e);
                }
            }
        }

        if (appended) {
            message.mes = `${message.mes}${appended}`;
            if (Array.isArray(message.swipes) && typeof message.swipe_id === "number" && message.swipes[message.swipe_id] !== undefined) {
                message.swipes[message.swipe_id] = message.mes;
            }
            if (typeof ctx.updateMessageBlock === "function") ctx.updateMessageBlock(mesId, message);
            if (typeof ctx.saveChat === "function") ctx.saveChat();
        }
    } catch (e) {
        console.error(`[${extensionName}] เจนตามหลัง (Theatre/Tiramisu UI) ล้มเหลว:`, e);
        toastr.error("เจน Mini Theatre / Tiramisu's UI ตามหลังไม่สำเร็จ (ดู console)", "Tiramisu Kit");
    } finally {
        isPostBusy = false;
    }
}
