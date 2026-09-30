// ===== Tiramisu Kit — render/mount.js =====
// กวาดข้อความในจอ แปลงแท็กย่อ (<tiramisu_log> <char_note> <rpg_status> <planning>) เป็นกล่อง HTML
//
// กลไก: ทำงานบน "ข้อความดิบ" (message.mes / display_text) แล้วเรียก ctx.messageFormatting() ซ้ำ
// (ฟังก์ชันเดียวกับที่ ST ใช้ render ข้อความจริง — รวม markdown + regex ของผู้ใช้ + sanitize) เพื่อได้ HTML
// ที่ปลอดภัยเหมือน ST ทำเอง แล้วเซ็ตทับ .mes_text — วิธีนี้จำลองกลไก regex script (markdownOnly) ของ ST
// ต้นฉบับ แต่ทำเองในสโคปของ extension โดยไม่ไปแก้ regex script list ของผู้ใช้
//
// ⚠️ ไม่แก้ message.mes ในไฟล์แชทเด็ดขาด — แก้แค่ DOM ที่แสดงผล ข้อมูลจริงยังเป็นแท็กดิบเสมอ (ปลอดภัยกับ
// สไวป์/แก้ไข/export) ⚠️ ถ้าข้อความมีทั้งแท็กของเราและ HTML/JS แบบ "UI Creation with JS" ปนกัน การ sweep
// จะเซ็ต .mes_text ใหม่ทุกครั้งที่มีการเปลี่ยนแปลงในแชท (ข้อความอื่นเพิ่ม/ลด) ซึ่งจะรีเซ็ต state ของ
// สคริปต์ฝังในข้อความนั้นด้วย — เคสนี้หายาก (ต้องมีสองฟีเจอร์ในข้อความเดียวกัน) ยอมรับความเสี่ยงนี้ไว้ก่อน
//
// deps: ./templates.js, ./cot-box.js, ../store.js — ห้าม import จาก index.js

import { renderTiramisuUiTags } from "./templates.js";
import { extractPlanning, renderCotBox, stripPlanning } from "./cot-box.js";
import { getSettings, extensionName } from "../store.js";
import { renderDialogue, SAY_TEST_RE, QUOTE_TEST_RE } from "../dialogue/render.js";
import { getRoster, getRosterVersion, getPersonaKey } from "../dialogue/data.js";

const TAG_TEST_RE = /<(tiramisu_log|char_note|rpg_status|livechat|planning)\b/i;

// cache กัน re-render ซ้ำเปล่าๆ: mesId -> { rawText, sig }
// ใช้คู่กับ marker ใน DOM — ถ้า ST วาดข้อความทับเอง (เช่นตอนจบสตรีม / stream fade-in) marker จะหาย แล้วเราวาดใหม่
const renderCache = new Map();
const MARKER_CLASS = "tirakit-rendered";

// ===== Dialogue ผ่าน MessageFormatter hook ของ ST (ST รุ่นใหม่) =====
// ให้ ST เรียกตัวแปลง <say> เองทุกครั้งที่จัดรูปแบบข้อความ (รวมระหว่างสตรีม) — ไม่ต้องแย่งกันเขียน DOM
// ST รุ่นเก่าที่ไม่มี hook → ตกไปใช้การกวาดข้อความ (sweep) แบบเดิม
let dialogueHookInstalled = false;

function depthOf(chat, mesId) {
    if (!Array.isArray(chat) || mesId == null || mesId < 0) return 0;
    let depth = 0;
    for (let i = chat.length - 1; i > mesId; i--) if (!chat[i]?.is_system) depth++;
    return depth;
}

function dialogueHook(mes, info) {
    try {
        if (info?.isReasoning || info?.isSystem) return mes;
        const settings = getSettings();
        if (!dialogueActive(settings)) return mes;
        const text = String(mes ?? "");
        const isUser = Boolean(info?.isUser);
        if (!SAY_TEST_RE.test(text) && !(isUser && settings.dialogue?.userQuotes && QUOTE_TEST_RE.test(text))) return mes;
        const ctx = SillyTavern.getContext();
        const d = settings.dialogue || {};
        return renderDialogue(text, {
            ctx,
            roster: getRoster(ctx),
            isUser,
            ui: dialogueUseUi(settings, depthOf(ctx.chat, Number(info?.messageId))),
            theme: d.theme || "messenger",
            tone: d.tone || "dark",
            userQuotes: Boolean(d.userQuotes),
            textColor: d.textColor || "char",
        });
    } catch (e) {
        console.error(`[${extensionName}] Dialogue hook ล้มเหลว:`, e);
        return mes;
    }
}

export function installFormatterHook(ctx) {
    const mf = ctx?.messageFormatter;
    if (dialogueHookInstalled || !mf || typeof mf.addHook !== "function") return false;
    try {
        mf.addHook(dialogueHook, { stage: mf.stage?.BEFORE_REGEX ?? "beforeRegex", order: mf.order?.EARLY ?? 10 });
        dialogueHookInstalled = true;
    } catch (e) {
        console.warn(`[${extensionName}] ลง MessageFormatter hook ไม่สำเร็จ — ใช้การกวาดข้อความแทน:`, e);
    }
    return dialogueHookInstalled;
}

function dialogueActive(settings) {
    return Boolean(settings.enabled) && (settings.selectedDialogue === "text" || settings.selectedDialogue === "ui");
}

// โหมด UI เฉพาะ N ข้อความล่าสุด (0 = ทุกข้อความ) — ที่เก่ากว่านั้นแสดงเป็นข้อความสี
function dialogueUseUi(settings, depthFromEnd) {
    if (settings.selectedDialogue !== "ui") return false;
    const d = Number(settings.dialogue?.uiDepth) || 0;
    return d === 0 || depthFromEnd < d;
}

function wantsDialogue(settings, message, rawText) {
    if (!dialogueActive(settings)) return false;
    if (SAY_TEST_RE.test(rawText)) return true;
    return Boolean(message.is_user && settings.dialogue?.userQuotes && QUOTE_TEST_RE.test(rawText));
}

function computeSig(settings, depthFromEnd) {
    const t = settings.tiramisuUi || {};
    const cotVisible = settings.cotDepth === 0 || depthFromEnd < settings.cotDepth ? 1 : 0;
    const d = settings.dialogue || {};
    const dlg = dialogueActive(settings)
        ? `${settings.selectedDialogue}${dialogueUseUi(settings, depthFromEnd) ? 1 : 0}${d.theme}${d.tone}${d.userQuotes ? 1 : 0}${d.textColor}${getRosterVersion()}${getPersonaKey()}`
        : "-";
    return `${t.log ? 1 : 0}${t.charNote ? 1 : 0}${t.rpgStatus ? 1 : 0}${t.livechat ? 1 : 0}|${cotVisible}|${settings.cotAutoOpen ? 1 : 0}|${dlg}`;
}

// คืนข้อความที่แปลงแท็กแล้วตามโมดูลที่เปิดอยู่จริง + กติกาความลึกของ CoT
function buildRenderedText(rawText, settings, depthFromEnd, ctx, message) {
    let out = String(rawText ?? "");
    if (!dialogueHookInstalled && wantsDialogue(settings, message, out)) {
        const d = settings.dialogue || {};
        out = renderDialogue(out, {
            ctx,
            roster: getRoster(ctx),
            isUser: Boolean(message.is_user),
            ui: dialogueUseUi(settings, depthFromEnd),
            theme: d.theme || "messenger",
            tone: d.tone || "dark",
            userQuotes: Boolean(d.userQuotes),
            textColor: d.textColor || "char",
        });
    }
    const tuiOn = settings.tiramisuUi || {};
    if (Object.values(tuiOn).some(Boolean)) {
        out = renderTiramisuUiTags(out); // regex ไม่ match (โมดูลปิดหรือช่องไม่ครบ) = ปล่อยผ่าน ปลอดภัย
    }

    if (out.includes("<planning")) {
        const cotDepth = settings.cotDepth || 0;
        const visible = cotDepth === 0 || depthFromEnd < cotDepth;
        if (visible) {
            out = out.replace(/<planning>([\s\S]*?)<\/planning>/gi, (m, content) =>
                renderCotBox(content, { autoOpen: Boolean(settings.cotAutoOpen) }),
            );
            const openLeft = extractPlanning(out); // เผื่อบล็อกที่โดนตัดกลางคันยังไม่ปิดแท็ก
            if (openLeft && !openLeft.closed) {
                out = out.replace(openLeft.raw, renderCotBox(openLeft.content, { autoOpen: Boolean(settings.cotAutoOpen) }));
            }
        } else {
            out = stripPlanning(out); // ลึกเกินกำหนด → ซ่อนจากจอ (ไฟล์แชทยังมีข้อมูลครบ)
        }
    }
    return out;
}

function renderOneMessage(ctx, mesId, depthFromEnd) {
    const message = ctx.chat?.[mesId];
    if (!message) {
        renderCache.delete(mesId);
        return;
    }
    const rawText = message.extra?.display_text ?? message.mes;
    const settings = getSettings();
    if (typeof rawText !== "string" || !(TAG_TEST_RE.test(rawText) || wantsDialogue(settings, message, rawText))) {
        if (renderCache.has(mesId)) {
            // เคยวาดทับไว้แต่ตอนนี้ไม่ต้องแล้ว (เช่นปิดโมดูล) — คืนการแสดงผลปกติของ ST
            renderCache.delete(mesId);
            restorePlain(ctx, mesId, message, rawText);
        }
        return;
    }

    const sig = computeSig(settings, depthFromEnd);
    const cached = renderCache.get(mesId);
    const $mesText = $(`#chat [mesid="${mesId}"] .mes_text`);
    if (cached && cached.rawText === rawText && cached.sig === sig && $mesText.children(`.${MARKER_CLASS}`).length) return; // ไม่มีอะไรเปลี่ยน ข้าม

    try {
        const rendered = buildRenderedText(rawText, settings, depthFromEnd, ctx, message);
        if (typeof ctx.messageFormatting !== "function") return;
        const html = ctx.messageFormatting(rendered, message.name, message.is_system, message.is_user, mesId);
        if ($mesText.length) {
            $mesText.html(html);
            $mesText.append(`<i class="${MARKER_CLASS}" hidden></i>`);
        }
        renderCache.set(mesId, { rawText, sig });
    } catch (e) {
        console.error(`[${extensionName}] render ข้อความ #${mesId} ล้มเหลว:`, e);
    }
}

function restorePlain(ctx, mesId, message, rawText) {
    try {
        if (typeof ctx.messageFormatting !== "function" || typeof rawText !== "string") return;
        const html = ctx.messageFormatting(rawText, message.name, message.is_system, message.is_user, mesId);
        const $mesText = $(`#chat [mesid="${mesId}"] .mes_text`);
        if ($mesText.length) $mesText.html(html);
    } catch (e) {
        console.error(`[${extensionName}] คืนการแสดงผลข้อความ #${mesId} ล้มเหลว:`, e);
    }
}

function nonSystemIndices(chat) {
    const idx = [];
    chat.forEach((m, i) => { if (!m.is_system) idx.push(i); });
    return idx;
}

// กวาดทุกข้อความในแชท — ใช้ตอนเหตุการณ์ที่ทำให้จำนวน/ลำดับข้อความเปลี่ยน (ความลึกของทุกข้อความขยับหมด)
export function sweepAllMessages() {
    const ctx = SillyTavern.getContext(); // ขอใหม่ทุกครั้ง — context ที่เก็บไว้ตอนโหลดมี characterId/chatMetadata ค้างของเก่า
    const chat = ctx?.chat;
    if (!Array.isArray(chat) || !chat.length) return;
    const idx = nonSystemIndices(chat);
    const total = idx.length;
    idx.forEach((mesId, i) => renderOneMessage(ctx, mesId, total - i - 1));
}

// กวาดข้อความเดียว — ใช้ได้เฉพาะเหตุการณ์ที่ไม่กระทบจำนวนข้อความอื่น (แก้ไขเนื้อหาข้อความเดิม)
export function sweepOneMessage(_ctx, mesId) {
    const ctx = SillyTavern.getContext();
    const chat = ctx?.chat;
    if (!Array.isArray(chat) || mesId == null || !chat[Number(mesId)]) return;
    const idx = nonSystemIndices(chat);
    const pos = idx.indexOf(Number(mesId));
    if (pos === -1) return;
    renderOneMessage(ctx, Number(mesId), idx.length - pos - 1);
}

// เรียกตอนสลับแชท/ปิดสวิตช์หลัก — เคลียร์ cache กัน mesId เดิมของแชทใหม่ชนกับของแชทเก่า
export function clearRenderCache() {
    renderCache.clear();
}
