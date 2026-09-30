// ===== Tiramisu Kit — dialogue/data.js =====
// ข้อมูลตัวละครของโมดูล Dialogue (สี / รูป / ครอป / รูปตามอารมณ์)
//
// ที่เก็บ:
// - แชทเดี่ยว → ในการ์ดตัวละคร (data.extensions.tiramisu_kit_dialogue) ผ่าน ctx.writeExtensionField
//   ติดไปกับการ์ดเวลา export/แชร์ (ตัวไฟล์รูปอยู่บนเซิร์ฟเวอร์ ST ของเครื่องนี้ ไม่ติดไปกับการ์ด)
// - แชทกลุ่ม → ใน chatMetadata ของแชทกลุ่มนั้น (กลุ่มไม่มีการ์ดของตัวเอง)
// - Persona ของผู้ใช้ → extension settings (dialoguePersonas) คีย์ด้วยไฟล์อวาตาร์ของ persona
//
// โครงสร้าง roster: { v:1, entries: { [id]: Entry } }
// Entry: { id, name, aliases:[], color, auto, img: Img|null, moods: { [mood]: Img } }
// Img: { path, crop: { avatar:{x,y,w,h}, vn:{x,y,w,h} } }  — x,y,w,h เป็นสัดส่วน 0..1 ของรูป
// id พิเศษ "__char__" = ตัวละครของการ์ดเอง (รูปเริ่มต้น = อวาตาร์การ์ด)
//
// deps: ../store.js — ห้าม import จาก index.js

import { extensionName, getSettings, saveSettings } from "../store.js";
import { user_avatar } from "../../../../../personas.js";

export const CARD_FIELD = "tiramisu_kit_dialogue";
const META_KEY = "tirakit_dialogue";
export const CHAR_ID = "__char__";

const PALETTE = {
    dark: ["#7ec8ff", "#ffb3c7", "#c9a8ff", "#9dff9a", "#ffcf6e", "#6ef0e0", "#ff9f6e", "#f5f07a", "#b0c4ff", "#ff8a9a"],
    light: ["#1f6fb2", "#b8325a", "#6b3fb8", "#2f7d32", "#a05a00", "#00796b", "#c0461b", "#7a6a00", "#3949ab", "#ad1457"],
};

// เลขเวอร์ชัน roster — เพิ่มทุกครั้งที่ข้อมูลเปลี่ยน ให้ render cache รู้ว่าต้องวาดใหม่
let rosterVersion = 0;
export const getRosterVersion = () => rosterVersion;
const bump = () => { rosterVersion++; };

export function normName(s) {
    return String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function emptyRoster() {
    return { v: 1, entries: {} };
}

function sanitizeRoster(r) {
    if (!r || typeof r !== "object" || !r.entries || typeof r.entries !== "object") return emptyRoster();
    return r;
}

// ===== อ่าน/เขียนที่เก็บตามบริบทแชทปัจจุบัน =====
export function getScope(ctx) {
    if (ctx?.groupId) return { kind: "group", label: ctx.groups?.find((g) => g.id === ctx.groupId)?.name || "แชทกลุ่ม" };
    const ch = ctx?.characters?.[ctx?.characterId];
    if (ch) return { kind: "card", label: ch.name, character: ch };
    return { kind: "none", label: "" };
}

export function getRoster(ctx) {
    const scope = getScope(ctx);
    if (scope.kind === "card") return sanitizeRoster(structuredClone(scope.character?.data?.extensions?.[CARD_FIELD] ?? null));
    if (scope.kind === "group") return sanitizeRoster(structuredClone(ctx.chatMetadata?.[META_KEY] ?? null));
    return emptyRoster();
}

let saveTimer = null;
let pendingRoster = null;
let pendingCtxScope = null;

// บันทึกแบบหน่วงเวลา — writeExtensionField ยิงบันทึกการ์ดไปเซิร์ฟเวอร์ทุกครั้ง ไม่ควรยิงรัว
export function saveRoster(ctx, roster) {
    const scope = getScope(ctx);
    if (scope.kind === "none") return;
    bump();
    // อัปเดตค่าในหน่วยความจำทันที ให้ render รอบถัดไปเห็นข้อมูลใหม่เลย
    if (scope.kind === "card") {
        scope.character.data = scope.character.data || {};
        scope.character.data.extensions = scope.character.data.extensions || {};
        scope.character.data.extensions[CARD_FIELD] = structuredClone(roster);
    } else {
        ctx.chatMetadata[META_KEY] = structuredClone(roster);
    }
    pendingRoster = roster;
    pendingCtxScope = { kind: scope.kind, characterId: ctx.characterId };
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushRoster, 800);
}

async function flushRoster() {
    const roster = pendingRoster;
    const scope = pendingCtxScope;
    pendingRoster = null;
    if (!roster || !scope) return;
    const ctx = SillyTavern.getContext();
    try {
        if (scope.kind === "card" && typeof ctx.writeExtensionField === "function") {
            await ctx.writeExtensionField(scope.characterId, CARD_FIELD, roster);
        } else if (scope.kind === "group" && typeof ctx.saveMetadataDebounced === "function") {
            ctx.saveMetadataDebounced();
        }
    } catch (e) {
        console.error(`[${extensionName}] บันทึกข้อมูลตัวละคร (Dialogue) ล้มเหลว:`, e);
        toastr.error("บันทึกข้อมูลตัวละครไม่สำเร็จ (ดู console)", "Tiramisu Kit");
    }
}

// ===== Persona =====
// ไฟล์อวาตาร์ของ persona ที่ใช้อยู่ (live binding จาก personas.js ของ ST) — ใช้เป็นคีย์ผูกข้อมูลกับ persona
export function getPersonaKey() {
    return user_avatar || "";
}

export function getPersonaEntry(ctx) {
    const key = getPersonaKey();
    const all = getSettings().dialoguePersonas || {};
    const saved = key ? all[key] : null;
    return {
        id: "__persona__",
        key,
        name: ctx?.name1 || "User",
        aliases: [],
        color: saved?.color || "#ffd27e",
        img: saved?.img || null,
        moods: {},
        defaultSrc: key ? thumbUrl(ctx, "persona", key) : "",
    };
}

export function savePersonaEntry(ctx, patch) {
    const key = getPersonaKey();
    if (!key) return;
    const s = getSettings();
    s.dialoguePersonas = s.dialoguePersonas || {};
    s.dialoguePersonas[key] = { ...(s.dialoguePersonas[key] || {}), ...patch };
    saveSettings();
    bump();
}

function thumbUrl(ctx, type, file) {
    if (typeof ctx?.getThumbnailUrl === "function") return ctx.getThumbnailUrl(type, file);
    return `/thumbnail?type=${type}&file=${encodeURIComponent(file)}`;
}

// ===== สี =====
export function nextColor(roster, tone, extraUsed = []) {
    const pal = PALETTE[tone === "light" ? "light" : "dark"];
    const used = new Set([...Object.values(roster.entries).map((e) => String(e.color).toLowerCase()), ...extraUsed.map((c) => String(c).toLowerCase())]);
    const free = pal.find((c) => !used.has(c.toLowerCase()));
    if (free) return free;
    const hue = Math.floor(Math.random() * 360);
    return tone === "light" ? `hsl(${hue} 55% 35%)` : `hsl(${hue} 80% 75%)`;
}

// ===== ค้นหาตัวละครจากชื่อที่ AI เขียนมา =====
// คืน { entry, defaultSrc } หรือ null — ลำดับ: persona → roster (ชื่อ/ชื่อเรียกอื่น) → ตัวละครของการ์ด → สมาชิกกลุ่ม
export function resolveSpeaker(ctx, roster, name) {
    const n = normName(name);
    if (!n) return null;

    const persona = getPersonaEntry(ctx);
    if (n === normName(persona.name)) return { entry: persona, defaultSrc: persona.defaultSrc, isUser: true };

    for (const e of Object.values(roster.entries)) {
        if (normName(e.name) === n || (e.aliases || []).some((a) => normName(a) === n)) {
            return { entry: e, defaultSrc: defaultSrcFor(ctx, e) };
        }
    }

    const scope = getScope(ctx);
    if (scope.kind === "card" && normName(scope.character.name) === n) {
        const e = roster.entries[CHAR_ID] || { id: CHAR_ID, name: scope.character.name, aliases: [], color: "", img: null, moods: {} };
        return { entry: e, defaultSrc: thumbUrl(ctx, "avatar", scope.character.avatar) };
    }
    if (scope.kind === "group") {
        const group = ctx.groups?.find((g) => g.id === ctx.groupId);
        for (const av of group?.members || []) {
            const ch = ctx.characters?.find((c) => c.avatar === av);
            if (ch && normName(ch.name) === n) {
                const own = ch.data?.extensions?.[CARD_FIELD]?.entries?.[CHAR_ID];
                const e = { id: `member:${av}`, name: ch.name, aliases: [], color: own?.color || "", img: own?.img || null, moods: own?.moods || {} };
                return { entry: e, defaultSrc: thumbUrl(ctx, "avatar", av) };
            }
        }
    }
    return null;
}

function defaultSrcFor(ctx, e) {
    if (e.id === CHAR_ID) {
        const scope = getScope(ctx);
        if (scope.kind === "card") return thumbUrl(ctx, "avatar", scope.character.avatar);
    }
    return "";
}

// ===== เพิ่ม NPC อัตโนมัติจากชื่อที่เจอในข้อความ =====
const SAY_NAME_RE = /<say\b[^>]*?\bname\s*=\s*["']([^"'<>\n]{1,60})["']/gi;

export function namesInText(text) {
    const out = [];
    for (const m of String(text ?? "").matchAll(SAY_NAME_RE)) out.push(m[1].trim());
    return out;
}

// คืนจำนวนชื่อที่เพิ่มใหม่
export function autoAddSpeakers(ctx, texts, tone) {
    const scope = getScope(ctx);
    if (scope.kind === "none") return 0;
    const roster = getRoster(ctx);
    let added = 0;
    const seen = new Set();
    for (const text of texts) {
        for (const name of namesInText(text)) {
            const n = normName(name);
            if (!n || seen.has(n)) continue;
            seen.add(n);
            if (resolveSpeaker(ctx, roster, name)) continue;
            const id = `npc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
            roster.entries[id] = { id, name, aliases: [], color: nextColor(roster, tone), auto: true, img: null, moods: {} };
            added++;
        }
    }
    if (added) saveRoster(ctx, roster);
    return added;
}

// บรรทัดบอก AI ว่าตัวละครไหนมีรูปอารมณ์อะไรบ้าง (ให้เขียน mood ตรงกับชื่อรูป) — ว่าง = ไม่มีใครตั้งรูปอารมณ์
export function moodHint(ctx) {
    const roster = getRoster(ctx);
    const scope = getScope(ctx);
    const lines = [];
    for (const e of Object.values(roster.entries)) {
        const moods = Object.keys(e.moods || {}).filter((k) => e.moods[k]?.path);
        if (!moods.length) continue;
        const name = e.id === CHAR_ID && scope.kind === "card" ? scope.character.name : e.name;
        lines.push(`${name}: ${moods.join(" / ")}`);
    }
    return lines.length ? `- อารมณ์ที่มีรูปรองรับ (เขียน mood ให้ตรงคำเหล่านี้เมื่ออารมณ์ใกล้เคียง):\n${lines.map((l) => `  - ${l}`).join("\n")}` : "";
}

// สีของตัวละครของการ์ดตอนยังไม่เคยตั้ง — ให้สีแรกของพาเลตเสมอ (คงที่ทุกครั้ง ไม่สุ่ม)
export function fallbackColor(tone, name) {
    const pal = PALETTE[tone === "light" ? "light" : "dark"];
    let h = 0;
    for (const ch of String(name ?? "")) h = (h * 31 + ch.codePointAt(0)) >>> 0;
    return pal[h % pal.length];
}
