// ===== Tiramisu Kit — preset.js =====
// อ่าน/แก้ Prompt Manager ของ SillyTavern (Chat Completion) เพื่อรองรับฟีเจอร์ "ชุด Toggle สำเร็จรูป"
// ทำงานผ่าน object เดียวกับที่ ST เองใช้ (oai_settings.prompts / .prompt_order + promptManager.render()) —
// ไม่มี API สาธารณะให้ทำแบบนี้ตรงๆ จึงต้อง import โมดูลภายในของ ST มาใช้ตรงๆ
//
// ⚠️ เปราะบางกับการอัปเดต ST: ถ้า public/scripts/openai.js เปลี่ยนโครงสร้าง prompt_order/prompts หรือเลิก
// export `promptManager` ไฟล์นี้ต้องตามไปแก้ — ทุกจุดที่พึ่งพา shape ภายในมีคอมเมนต์กำกับไว้
//
// deps: ./toggle-sets.js (deps 0) + โมดูลของ ST เอง — ห้าม import จาก index.js

import { promptManager } from "../../../../openai.js";
import { isGroupHeader, isDividerName, matchManagedGroup, PROTECTED_IDS } from "./toggle-sets.js";

// PromptManager ตั้งค่า strategy:'global', dummyId:100001 เสมอสำหรับพรีเซ็ต Chat Completion (ค่าคงที่ของ ST
// เอง ไม่ใช่ของพรีเซ็ต — ดู public/scripts/openai.js:688) นี่คือ entry เดียวที่ Prompt Manager UI จริงอ่าน/เขียน
const DUMMY_CHARACTER_ID = 100001;

export function isPromptManagerAvailable() {
    return Boolean(promptManager && promptManager.serviceSettings);
}

function getOaiSettings() {
    return promptManager ? promptManager.serviceSettings : null;
}

function getPromptOrderEntry() {
    const oai = getOaiSettings();
    if (!oai || !Array.isArray(oai.prompt_order)) return null;
    return oai.prompt_order.find((x) => x.character_id === DUMMY_CHARACTER_ID) || null;
}

// ชื่อพรีเซ็ต Chat Completion ที่ใช้อยู่ตอนนี้ — null ถ้าอ่านไม่ได้ (เช่นยังไม่มี preset manager สำหรับ openai)
export function getCurrentPresetName(ctx) {
    try {
        const pm = ctx.getPresetManager ? ctx.getPresetManager("openai") : null;
        return pm ? pm.getSelectedPresetName() || null : null;
    } catch (e) {
        console.warn(`[tiramisu-kit] อ่านชื่อพรีเซ็ตปัจจุบันไม่ได้:`, e);
        return null;
    }
}

// "Tiramisu (nc) ..." / "Tiramisu (sfw) ..." -> "nc" | "sfw" | null (พรีเซ็ตอื่นที่ไม่ใช่ Tiramisu)
export function detectVariant(presetName) {
    if (!presetName) return null;
    const m = String(presetName).match(/tiramisu\s*\(\s*(sfw|nc)\s*\)/i);
    return m ? m[1].toLowerCase() : null;
}

// เดินลำดับ prompt_order ทั้งหมด คืน Map<identifier, managedGroupShortName> เฉพาะ entry ที่ปลอดภัยจะแตะ
// (อยู่ในกลุ่มที่แตะได้ + ไม่ใช่ marker/PROTECTED_IDS/ตัวคั่น) — ใช้ isGroupHeader เป็นขอบเขตกลุ่มเสมอ
// (สำคัญ: ต้องคั่นด้วยหัวข้อกลุ่ม "ทุกแบบ" ไม่ใช่แค่กลุ่มที่แตะได้ ไม่งั้นสมาชิกของกลุ่มอันตรายที่ไม่มีหัวข้อ
// ใหม่มาคั่นต่อ (เช่น Mobile Formatting) จะถูกนับเป็นสมาชิกของกลุ่มก่อนหน้าโดยไม่ตั้งใจ)
function walkManagedEntries() {
    const oai = getOaiSettings();
    const order = getPromptOrderEntry();
    const map = new Map();
    if (!oai || !order) return map;

    const promptsById = new Map();
    for (const p of oai.prompts || []) promptsById.set(p.identifier, p);

    let curManaged = null;
    for (const entry of order.order) {
        const p = promptsById.get(entry.identifier);
        const nm = p?.name || "";
        if (isGroupHeader(nm)) {
            curManaged = matchManagedGroup(nm);
            continue;
        }
        if (!curManaged || !p) continue;
        if (isDividerName(nm) || p.marker || PROTECTED_IDS.has(entry.identifier)) continue;
        map.set(entry.identifier, curManaged);
    }
    return map;
}

// รายละเอียดกลุ่มที่แตะได้ทั้งหมด ณ ตอนนี้ — ใช้แสดงในแท็บ "ดูรายละเอียด" ของชุด
// คืน { [managedGroupShortName]: [{identifier, name, enabled}] }
export function getManagedGroupDetails() {
    const oai = getOaiSettings();
    const order = getPromptOrderEntry();
    const out = {};
    if (!oai || !order) return out;

    const promptsById = new Map();
    for (const p of oai.prompts || []) promptsById.set(p.identifier, p);
    const orderById = new Map();
    for (const e of order.order) orderById.set(e.identifier, e);

    for (const [id, group] of walkManagedEntries()) {
        const p = promptsById.get(id);
        const e = orderById.get(id);
        (out[group] = out[group] || []).push({ identifier: id, name: p?.name || "", enabled: Boolean(e?.enabled) });
    }
    return out;
}

// เปิด/ปิดตามที่ set.picks กำหนด — เปิดเฉพาะสมาชิกใน picks ปิดสมาชิกอื่นในกลุ่มเดียวกันให้เอง
// กลุ่มที่ไม่อยู่ใน picks จะไม่ถูกแตะเลย · ชื่อที่หาไม่เจอในพรีเซ็ตปัจจุบันจะถูกรายงานใน skipped (ไม่ throw)
export function applySet(set) {
    if (!isPromptManagerAvailable()) return { ok: false, reason: "no-prompt-manager" };
    const order = getPromptOrderEntry();
    const oai = getOaiSettings();
    if (!order || !oai) return { ok: false, reason: "no-prompt-order" };

    const promptsById = new Map();
    for (const p of oai.prompts || []) promptsById.set(p.identifier, p);
    const orderById = new Map();
    for (const e of order.order) orderById.set(e.identifier, e);
    const managedEntries = walkManagedEntries(); // identifier -> group

    let turnedOn = 0;
    let turnedOff = 0;
    const skipped = [];

    for (const [group, pickRaw] of Object.entries(set.picks || {})) {
        const wanted = new Set(Array.isArray(pickRaw) ? pickRaw : [pickRaw]);
        const idsInGroup = [...managedEntries.entries()].filter(([, g]) => g === group).map(([id]) => id);

        const foundNames = new Set(idsInGroup.map((id) => promptsById.get(id)?.name));
        for (const name of wanted) {
            if (!foundNames.has(name)) skipped.push(`${group}: ${name}`);
        }

        for (const id of idsInGroup) {
            const entry = orderById.get(id);
            if (!entry) continue;
            const name = promptsById.get(id)?.name;
            const shouldBeOn = wanted.has(name);
            if (Boolean(entry.enabled) !== shouldBeOn) {
                entry.enabled = shouldBeOn;
                shouldBeOn ? turnedOn++ : turnedOff++;
            }
        }
    }

    // เส้นทางเดียวกับที่ ST ใช้เองตอนผู้ใช้กด toggle ใน Prompt Manager (PromptManager.js handleToggle):
    // ตั้งค่า enabled ตรงๆ บน serviceSettings แล้ว render() + saveServiceSettings() (ไม่ await — ของ ST เองก็ไม่ await)
    promptManager.render();
    promptManager.saveServiceSettings();

    return { ok: true, turnedOn, turnedOff, skipped };
}

// เก็บสถานะ toggle ปัจจุบันของกลุ่มที่แตะได้ทั้งหมด เป็น picks — ใช้ตอนผู้ใช้กด "บันทึกเป็นชุดใหม่"
export function snapshotCurrentPicks() {
    const details = getManagedGroupDetails();
    const picks = {};
    for (const [group, members] of Object.entries(details)) {
        const on = members.filter((m) => m.enabled).map((m) => m.name);
        if (on.length) picks[group] = on.length === 1 ? on[0] : on;
    }
    return picks;
}

// ===== Think Box ของพรีเซ็ต (กลุ่ม "มี Think Box" / "ไม่มี Think Box") =====
// ไม่ใช่กลุ่มที่แตะได้ (MANAGED_GROUPS) เพราะเป็นสวิตช์ 2 ทางเฉพาะของพรีเซ็ตนี้ ไม่ใช่ "เลือกสไตล์" ทั่วไป
function classifyThinkBoxHeader(rawName) {
    const s = String(rawName ?? "");
    if (s.includes("ไม่มี Think Box")) return "without"; // เช็ค "ไม่มี" ก่อนเสมอ (สตริงมันเป็น superset ของ "มี Think Box")
    if (s.includes("มี Think Box")) return "with";
    return null;
}

// คืน null ถ้าพรีเซ็ตนี้ไม่มีกลุ่ม Think Box เลย (ไม่ใช่พรีเซ็ต Tiramisu)
export function getThinkBoxState() {
    const oai = getOaiSettings();
    const order = getPromptOrderEntry();
    if (!oai || !order) return null;

    const promptsById = new Map();
    for (const p of oai.prompts || []) promptsById.set(p.identifier, p);
    const orderById = new Map();
    for (const e of order.order) orderById.set(e.identifier, e);

    const withIds = [];
    const withoutIds = [];
    let cur = null;
    let sawAny = false;
    for (const entry of order.order) {
        const p = promptsById.get(entry.identifier);
        const nm = p?.name || "";
        if (isGroupHeader(nm)) {
            cur = classifyThinkBoxHeader(nm);
            if (cur) sawAny = true;
            continue;
        }
        if (!cur || !p || isDividerName(nm) || p.marker || PROTECTED_IDS.has(entry.identifier)) continue;
        (cur === "with" ? withIds : withoutIds).push(entry.identifier);
    }
    if (!sawAny) return null;

    const withOn = withIds.some((id) => orderById.get(id)?.enabled);
    const withoutOn = withoutIds.some((id) => orderById.get(id)?.enabled);
    const current = withOn ? "with" : withoutOn ? "without" : null;
    return { current, withIds, withoutIds };
}

// สลับไปฝั่ง "with" หรือ "without" — เปิดสมาชิกทุกตัวฝั่งที่เลือก ปิดฝั่งตรงข้ามทั้งหมด
export function setThinkBoxState(target) {
    if (!isPromptManagerAvailable()) return { ok: false, reason: "no-prompt-manager" };
    const state = getThinkBoxState();
    if (!state) return { ok: false, reason: "not-supported" };

    const order = getPromptOrderEntry();
    const orderById = new Map();
    for (const e of order.order) orderById.set(e.identifier, e);

    for (const id of state.withIds) {
        const e = orderById.get(id);
        if (e) e.enabled = target === "with";
    }
    for (const id of state.withoutIds) {
        const e = orderById.get(id);
        if (e) e.enabled = target === "without";
    }

    promptManager.render();
    promptManager.saveServiceSettings();
    return { ok: true };
}
