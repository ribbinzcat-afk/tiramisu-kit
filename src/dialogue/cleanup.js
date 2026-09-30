// ===== Tiramisu Kit — dialogue/cleanup.js =====
// ตรวจไฟล์รูปค้างในโฟลเดอร์ user/images/tiramisu-kit/
//
// ทะเบียนรูป (extension settings: dialogueImages) — จดว่าแต่ละไฟล์อัปโหลดให้ใคร
//   { [ชื่อไฟล์]: { kind: "card", avatar } | { kind: "group", groupId, chatId } | { kind: "persona", key }, ts }
// ใช้แยกไฟล์ที่ "ไม่มีใครใช้แน่นอน" ออกจากไฟล์ที่อาจยังใช้อยู่ในแชทกลุ่มอื่น (ซึ่งตรวจจากที่นี่ไม่ได้
// โดยไม่เปิดแชทนั้น) — ไฟล์ที่อัปโหลดก่อนมีทะเบียนจะขึ้นว่า "ไม่ทราบที่มา" และไม่ติ๊กให้ลบเป็นค่าเริ่มต้น
//
// deps: ../store.js, ./data.js

import { extensionName, getSettings, saveSettings } from "../store.js";
import { CARD_FIELD, getScope, getPersonaKey } from "./data.js";

export const FOLDER = "tiramisu-kit";
const META_KEY = "tirakit_dialogue";

export const baseName = (p) => String(p ?? "").split(/[\\/]/).pop();
export const folderPath = (name) => `/user/images/${FOLDER}/${name}`;

function registry() {
    const s = getSettings();
    if (!s.dialogueImages || typeof s.dialogueImages !== "object") s.dialogueImages = {};
    return s.dialogueImages;
}

// เจ้าของรูปตามบริบทปัจจุบัน — รูปของ persona ผูกกับ persona ที่ใช้อยู่ ไม่ใช่การ์ด
export function currentOwner(ctx, isPersona) {
    if (isPersona) return { kind: "persona", key: getPersonaKey() };
    const scope = getScope(ctx);
    if (scope.kind === "card") return { kind: "card", avatar: scope.character.avatar };
    if (scope.kind === "group") {
        const chatId = typeof ctx.getCurrentChatId === "function" ? ctx.getCurrentChatId() : null;
        return { kind: "group", groupId: ctx.groupId, chatId };
    }
    return { kind: "unknown" };
}

export function registerImage(path, owner) {
    const name = baseName(path);
    if (!name) return;
    registry()[name] = { ...owner, ts: Date.now() };
    saveSettings();
}

export function unregisterImage(path) {
    const name = baseName(path);
    const reg = registry();
    if (name && reg[name]) {
        delete reg[name];
        saveSettings();
    }
}

// เก็บชื่อไฟล์ทุกไฟล์ที่ roster หนึ่งอ้างถึง (รูปหลัก + รูปอารมณ์)
function collectRoster(roster, into) {
    for (const e of Object.values(roster?.entries || {})) {
        if (e?.img?.path) into.add(baseName(e.img.path));
        for (const m of Object.values(e?.moods || {})) if (m?.path) into.add(baseName(m.path));
    }
}

async function listFiles(ctx) {
    const res = await fetch("/api/images/list", {
        method: "POST",
        headers: ctx.getRequestHeaders(),
        body: JSON.stringify({ folder: FOLDER }),
    });
    if (!res.ok) throw new Error(`อ่านรายชื่อไฟล์ไม่สำเร็จ (${res.status})`);
    const data = await res.json();
    return Array.isArray(data) ? data.map(baseName).filter(Boolean) : [];
}

async function fileSize(name) {
    try {
        const res = await fetch(folderPath(name), { method: "HEAD", cache: "no-store" });
        return Number(res.headers.get("content-length")) || 0;
    } catch {
        return 0;
    }
}

async function mapLimit(items, limit, fn) {
    const out = new Array(items.length);
    let i = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (i < items.length) {
            const idx = i++;
            out[idx] = await fn(items[idx], idx);
        }
    });
    await Promise.all(workers);
    return out;
}

// โหลดข้อมูลเต็มของการ์ดที่ ST โหลดมาแบบย่อ (lazy load ตัดข้อมูลของ extension ออก) แล้วเก็บรูปที่อ้างถึง
async function collectCards(ctx, used, onProgress, onlyAvatars = null) {
    const list = ctx.characters || [];
    const targets = list.map((c, i) => ({ c, i })).filter(({ c }) => !onlyAvatars || onlyAvatars.has(c.avatar));
    let done = 0;
    await mapLimit(targets, 4, async ({ c, i }) => {
        if (c.shallow && typeof ctx.unshallowCharacter === "function") {
            try { await ctx.unshallowCharacter(i); } catch (e) { console.warn(`[${extensionName}] โหลดการ์ด ${c.name} ไม่สำเร็จ:`, e); }
        }
        const full = ctx.characters[i];
        if (full?.shallow) used.unknownCards.add(full.avatar); // โหลดไม่สำเร็จ ถือว่าไม่รู้ ห้ามตัดสินว่าค้าง
        else collectRoster(full?.data?.extensions?.[CARD_FIELD], used.names);
        onProgress?.(`ตรวจการ์ด ${++done}/${targets.length}`);
    });
}

// คืน { total, totalBytes, used, orphans: [{ name, path, bytes, reason, checked }] }
export async function scanImages(onProgress) {
    const ctx = SillyTavern.getContext();
    onProgress?.("อ่านรายชื่อไฟล์...");
    const files = await listFiles(ctx);
    const reg = registry();
    const used = { names: new Set(), unknownCards: new Set() };

    // ที่ตรวจได้ทันที: persona ทุกตัว + แชทที่เปิดอยู่
    for (const p of Object.values(getSettings().dialoguePersonas || {})) if (p?.img?.path) used.names.add(baseName(p.img.path));
    if (ctx.groupId) collectRoster(ctx.chatMetadata?.[META_KEY], used.names);

    // การ์ด: ถ้าทุกไฟล์มีทะเบียน โหลดเฉพาะการ์ดที่เป็นเจ้าของ ไม่งั้นต้องโหลดทุกการ์ด
    const unregistered = files.filter((n) => !reg[n]);
    const cardOwners = new Set(files.map((n) => reg[n]).filter((o) => o?.kind === "card").map((o) => o.avatar));
    await collectCards(ctx, used, onProgress, unregistered.length ? null : cardOwners);

    const groups = ctx.groups || [];
    const currentChat = typeof ctx.getCurrentChatId === "function" ? ctx.getCurrentChatId() : null;
    const orphans = [];
    let inUse = 0;

    for (const name of files) {
        if (used.names.has(name)) { inUse++; continue; }
        const owner = reg[name];
        let reason = "";
        let checked = true;

        if (!owner) {
            reason = "ไม่ทราบที่มา (อัปโหลดก่อนมีระบบบันทึก — ถ้าเคยตั้งรูปในแชทกลุ่ม อาจยังใช้อยู่)";
            checked = false;
        } else if (owner.kind === "card") {
            const exists = (ctx.characters || []).some((c) => c.avatar === owner.avatar);
            if (exists && used.unknownCards.has(owner.avatar)) { inUse++; continue; }
            reason = exists ? "การ์ดไม่ได้ใช้รูปนี้แล้ว" : "การ์ดถูกลบไปแล้ว";
        } else if (owner.kind === "group") {
            const g = groups.find((x) => x.id === owner.groupId);
            if (!g) reason = "แชทกลุ่มถูกลบไปแล้ว";
            else if (owner.chatId && Array.isArray(g.chats) && !g.chats.includes(owner.chatId)) reason = "แชทของกลุ่มนี้ถูกลบไปแล้ว";
            else if (owner.chatId && owner.chatId !== currentChat) { inUse++; continue; } // อยู่ในแชทกลุ่มอื่นที่ไม่ได้เปิด ตรวจไม่ได้ → ถือว่าใช้อยู่
            else reason = "แชทกลุ่มนี้ไม่ได้ใช้รูปนี้แล้ว";
        } else if (owner.kind === "persona") {
            reason = "persona ไม่ได้ใช้รูปนี้แล้ว";
        } else {
            reason = "ไม่มีที่ใช้";
        }
        orphans.push({ name, path: folderPath(name), reason, checked, bytes: 0 });
    }

    onProgress?.("คำนวณขนาดไฟล์...");
    const sizes = await mapLimit(files, 6, fileSize);
    const sizeOf = new Map(files.map((n, i) => [n, sizes[i]]));
    for (const o of orphans) o.bytes = sizeOf.get(o.name) || 0;

    return {
        total: files.length,
        totalBytes: sizes.reduce((a, b) => a + b, 0),
        used: inUse,
        orphans,
    };
}

export function formatBytes(n) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
