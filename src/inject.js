// ===== Tiramisu Kit — inject.js =====
// โหมด "single": รวม prompt ของแต่ละกลุ่มเป็นข้อความเดียว แล้วแทรกด้วย ctx.setExtensionPrompt
// หนึ่ง key ต่อหนึ่งกลุ่ม (tirakit_ui, tirakit_dialogue, ...) เพื่อล้าง/แทนที่ทีละกลุ่มได้อิสระ
// deps: ./modules.js, ./prompts.js, ./store.js — ห้าม import จาก index.js

import { MODULE_GROUPS, modulesInGroup } from "./modules.js";
import { buildPrompt } from "./prompts.js";
import { getSettings } from "./store.js";

const KEY_PREFIX = "tirakit_";
// โหมด split จัดการกลุ่มพวกนี้เอง (CoT เจนก่อนใน interceptor, Theatre/Tiramisu UI เจนตามหลังใน post.js)
const SPLIT_MANAGED_GROUPS = new Set(["cot", "theatre", "tiramisuUi"]);

function buildGroupText(groupId, settings) {
    const mods = modulesInGroup(groupId);

    if (groupId === "ui") {
        const mod = mods.find((m) => m.id === settings.selectedUi);
        if (!mod) return "";
        return buildPrompt(mod.promptId, { custom: settings.uiCustomText }, settings.prompts);
    }

    if (groupId === "dialogue") {
        const mod = mods.find((m) => m.id === settings.selectedDialogue);
        if (!mod) return "";
        return buildPrompt(mod.promptId, {}, settings.prompts);
    }

    if (groupId === "rng") {
        if (!settings.rngEnabled) return "";
        return buildPrompt("rng", {}, settings.prompts);
    }

    if (groupId === "tiramisuUi") {
        const parts = mods.filter((m) => settings.tiramisuUi?.[m.id]).map((m) => buildPrompt(m.promptId, {}, settings.prompts));
        return parts.join("\n\n");
    }

    if (groupId === "theatre") {
        // artDirection เป็นฐาน — ไม่เปิดฐาน ตัวย่อยไม่มีความหมาย (การ์ดหน้าตั้งค่าก็ disable ตัวย่อยไว้เมื่อฐานปิด)
        if (!settings.theatre?.artDirection) return "";
        const parts = [buildPrompt("theatreArtDirection", {}, settings.prompts)];
        for (const m of mods) {
            if (m.id !== "artDirection" && settings.theatre?.[m.id]) {
                parts.push(buildPrompt(m.promptId, {}, settings.prompts));
            }
        }
        return parts.join("\n\n");
    }

    if (groupId === "cot") {
        if (!settings.cotEnabled) return "";
        return buildPrompt("cot", {}, settings.prompts);
    }

    return "";
}

function clearGroupPrompt(ctx, groupId) {
    ctx.setExtensionPrompt(KEY_PREFIX + groupId, "", 1, 0, false, 0);
}

// แทรก prompt ทุกกลุ่มเข้า ST ตามค่า settings ปัจจุบัน — เรียกตอนโหลด/ตั้งค่าเปลี่ยน/สลับแชท
// กลุ่มที่เจนแยก (genMode split + splittable) ไม่ถูกแทรกที่นี่ (interceptor.js / post.js จัดการเอง)
export function applyInjections(ctx) {
    const settings = getSettings();
    for (const group of MODULE_GROUPS) {
        if (!settings.enabled) {
            clearGroupPrompt(ctx, group.id);
            continue;
        }
        if (settings.genMode === "split" && SPLIT_MANAGED_GROUPS.has(group.id)) {
            clearGroupPrompt(ctx, group.id);
            continue;
        }
        const text = buildGroupText(group.id, settings);
        if (!text) {
            clearGroupPrompt(ctx, group.id);
            continue;
        }
        const pos = settings.injectPos[group.id] || { position: 1, depth: 1 };
        ctx.setExtensionPrompt(KEY_PREFIX + group.id, text, pos.position, pos.depth, false, 0);
    }
}

// ล้าง inject ทั้งหมด — เรียกตอนปิดสวิตช์หลัก
export function clearAllInjections(ctx) {
    for (const group of MODULE_GROUPS) clearGroupPrompt(ctx, group.id);
}
