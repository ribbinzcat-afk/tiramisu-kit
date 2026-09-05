// ===== Tiramisu Kit — post.js =====
// โหมด split: เจน Mini Theatre / Tiramisu's UI "ตามหลัง" คำตอบหลัก (เรียกจาก index.js ตอน MESSAGE_RECEIVED)
// ส่งคำตอบหลักที่เพิ่งเจนเสร็จเป็นบริบทให้โมดูลเหล่านี้อ้างอิง แล้วต่อผลลัพธ์ท้าย mes ของข้อความเดียวกัน
//
// - Tiramisu's UI (log/charNote/rpgStatus): เจนแท็กย่อ (<tiramisu_log>...) แล้วตัดเอาเฉพาะแท็กที่ถูกต้อง
//   ออกมาด้วย extractTag() — ทิ้งคำบรรยาย/ข้อความฟุ่มเฟือยที่โมเดลอาจแถมมาทั้งหมด ต่อท้าย mes ดิบ แล้วปล่อยให้
//   render/mount.js แปลงเป็นกล่องตอนแสดงผล (ใช้เส้นทาง render เดียวกับโหมด single ทุกประการ)
// - Mini Theatre (forum/abo/interview): เจน HTML สำเร็จรูป ตัดคำบรรยายที่มักโผล่นำหน้า HTML ออกด้วย
//   trimLeadingProse() ก่อนต่อท้าย mes ตรงๆ — ST render <div style="..."> ที่ฝังมาในข้อความได้อยู่แล้ว
//   โดยไม่ต้องผ่าน regex/parser ใดๆ เพิ่ม
//
// ⚠️ กันชนข้อความ: ล็อกด้วย mesId ไม่ใช่ flag รวม — งานของข้อความคนละอันเจนพร้อมกันได้ปลอดภัย
// (ข้อมูลแยกกันตาม message object) มีแค่ "เจนซ้อนสำหรับ mesId เดียวกัน" เท่านั้นที่ต้องกันชน (สไวป์รัวๆ)
//
// deps: ./store.js, ./api.js, ./prompts.js, ./context.js, ./modules.js, ./status.js — ห้าม import จาก index.js

import { extensionName, getSettings } from "./store.js";
import { tirakitGenerate, recordTokens, stripReasoning } from "./api.js";
import { buildPrompt } from "./prompts.js";
import { buildPostContext } from "./context.js";
import { modulesInGroup } from "./modules.js";
import { withStatus } from "./status.js";

const busyMesIds = new Set(); // กันชนเฉพาะ mesId เดียวกันเจนซ้อนกัน (เช่น สไวป์รัวๆ ก่อนรอบก่อนเจนเสร็จ)

// คำนำหน้าที่บังคับทุกครั้ง — กันโมเดลเข้าใจผิดว่ากำลังเขียนต่อเรื่อง แล้วแถมคำบรรยาย/บทพูดซ้ำกับคำตอบหลักที่มีอยู่แล้ว
const STANDALONE_GUARD =
    "[คำสั่งระบบ — งานนี้เป็นการเจนเสริมแยกต่างหาก ไม่ใช่การเขียนต่อเนื้อเรื่อง]\n" +
    "เนื้อเรื่อง/คำตอบของฉากนี้ถูกเขียนเสร็จแล้วในแชท (แนบมาให้ดูเป็นบริบทด้านล่างเท่านั้น) ห้ามเขียนคำบรรยาย บทพูด " +
    "หรือคำอธิบายใดๆ ซ้ำกับเนื้อเรื่องนั้นอีก ตอบเฉพาะผลลัพธ์ตามรูปแบบที่ระบุไว้เท่านั้น ห้ามมีข้อความอื่นนำหน้าหรือต่อท้าย";

// ดึงเฉพาะบล็อกแท็กที่ต้องการออกมาจากคำตอบดิบ — ทิ้งคำบรรยาย/ขยะที่โมเดลอาจแถมมาก่อน-หลังแท็กทั้งหมด
// ไม่เจอแท็กที่ถูกต้อง = คืนค่าว่าง (ไม่เอาคำบรรยายไปต่อท้าย mes โดยไม่ตั้งใจ)
function extractTag(raw, tagName) {
    if (!tagName) return String(raw ?? "").trim();
    const re = new RegExp(`<${tagName}\\b[\\s\\S]*?<\\/${tagName}>`, "i");
    const m = String(raw ?? "").match(re);
    return m ? m[0] : "";
}

// ตัดคำบรรยายที่มักโผล่นำหน้า HTML ของ Mini Theatre ออก (โมเดลชอบพิมพ์อารัมภบทก่อนค่อยเข้าเนื้อ HTML จริง)
// ไม่เจอแท็ก HTML เลย = ถือว่าเป็นคำบรรยายล้วน ไม่ใช่ผลลัพธ์ที่ถูกต้อง คืนค่าว่าง
function trimLeadingProse(raw) {
    const s = String(raw ?? "").trim();
    const idx = s.indexOf("<");
    if (idx === -1) return "";
    return s.slice(idx).trim();
}

async function genTag(ctx, feature, promptId, context, maxTokens, settings) {
    const instruction = buildPrompt(promptId, {}, settings.prompts);
    const prompt = ctx.substituteParams(`${STANDALONE_GUARD}\n\n${instruction}\n\n${context}`);
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

    if (busyMesIds.has(mesId)) {
        console.warn(`[${extensionName}] ข้อความ #${mesId} กำลังเจนตามหลังรอบก่อนอยู่ — ข้ามรอบนี้`);
        return;
    }
    busyMesIds.add(mesId);
    try {
        const context = buildPostContext(ctx, message.mes);
        let appended = "";

        if (wantTui) {
            for (const mod of modulesInGroup("tiramisuUi")) {
                if (!tuiOn[mod.id]) continue;
                try {
                    const raw = await withStatus(mod.label, () => genTag(ctx, "tiramisuUi", mod.promptId, context, 300, settings));
                    const tag = extractTag(raw, mod.tag);
                    if (tag) {
                        appended += `\n\n${tag}`;
                    } else {
                        console.warn(`[${extensionName}] เจน ${mod.label} ไม่ได้แท็กที่ถูกต้อง ทิ้งผลลัพธ์นี้:`, raw);
                    }
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
                    const prompt = ctx.substituteParams(`${STANDALONE_GUARD}\n\n${instruction}\n\n${context}`);
                    await recordTokens(ctx, mod.promptId, { instruction, context }, 700);
                    const raw = await withStatus(mod.label, () => tirakitGenerate(ctx, "theatre", prompt, 700));
                    const cleaned = trimLeadingProse(stripReasoning(raw));
                    if (cleaned) {
                        appended += `\n\n${cleaned}`;
                    } else {
                        console.warn(`[${extensionName}] เจน ${mod.label} ไม่ได้ HTML ที่ถูกต้อง ทิ้งผลลัพธ์นี้:`, raw);
                    }
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
        busyMesIds.delete(mesId);
    }
}
