// ===== Tiramisu Kit — store.js =====
// เก็บค่า settings ทั้งหมด + type-guard กันผู้ใช้เก่าไม่มีคีย์ใหม่
// deps: extensions.js / script.js ของ ST เท่านั้น — ห้าม import จาก index.js

import { extension_settings } from "../../../../extensions.js";
import { saveSettingsDebounced } from "../../../../../script.js";

export const extensionName = "tiramisu-kit";
export const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

// genMode: "single" = ส่ง prompt ไปทีเดียว (เจน 1 ครั้ง) | "split" = เจนแยก (CoT ก่อน, Theatre/Tiramisu UI ตามหลัง)
export const defaultSettings = {
    enabled: true,
    genMode: "single",

    // Connection Profile: "" = ใช้ API หลักของ ST
    apiProfile: "",
    apiProfileCot: "",
    apiProfileTheatre: "",
    apiProfileTiramisuUi: "",

    // ===== เลือกโมดูลที่เปิดใช้ต่อกลุ่ม =====
    // ui / dialogue: เลือกได้ 1 อัน (หรือ "" = ปิด), ที่เหลือ toggle อิสระ (object ของ id -> bool)
    selectedUi: "",           // "" | light | dark | jsLight | jsDark | custom
    uiCustomText: "",         // เนื้อหาที่ผู้ใช้กรอกเองเมื่อเลือก custom
    selectedDialogue: "",     // "" | light | dark
    rngEnabled: false,
    tiramisuUi: { log: false, charNote: false, rpgStatus: false },
    theatre: { artDirection: false, forum: false, abo: false, interview: false },
    cotEnabled: false,

    // ตำแหน่ง/ความลึกของการแทรก prompt ต่อกลุ่ม (โหมด single)
    // position: 0 = IN_PROMPT (ท้าย story string), 1 = IN_CHAT (ตามความลึก)
    injectPos: {
        ui: { position: 1, depth: 1 },
        dialogue: { position: 1, depth: 1 },
        rng: { position: 1, depth: 1 },
        tiramisuUi: { position: 1, depth: 1 },
        theatre: { position: 1, depth: 1 },
        cot: { position: 1, depth: 0 },
    },

    // CoT
    cotDepth: 0,             // 0 = ไม่จำกัด, N = แสดง/ส่งเข้า prompt แค่ N ข้อความหลังสุด
    cotAutoOpen: false,      // เปิดกล่องความคิดค้างไว้เป็นค่าเริ่มต้นหรือไม่
    cotContextMessages: 6,   // จำนวนข้อความล่าสุดที่ส่งเป็นบริบทตอนเจนแยก

    // prompt ที่ผู้ใช้แก้เอง (เติมจาก PROMPT_DEFS ตอนอ่าน) — key = promptId
    prompts: {},
};

export function getSettings() {
    extension_settings[extensionName] = extension_settings[extensionName] || {};
    const s = extension_settings[extensionName];
    for (const k of Object.keys(defaultSettings)) {
        if (s[k] === undefined) s[k] = structuredClone(defaultSettings[k]);
    }
    // type-guard ระดับลึก กันผู้ใช้เก่าที่มีคีย์แต่ shape ไม่ตรง (เช่นเคยเป็น object เปล่า)
    if (!s.tiramisuUi || typeof s.tiramisuUi !== "object") s.tiramisuUi = structuredClone(defaultSettings.tiramisuUi);
    if (!s.theatre || typeof s.theatre !== "object") s.theatre = structuredClone(defaultSettings.theatre);
    if (!s.injectPos || typeof s.injectPos !== "object") s.injectPos = structuredClone(defaultSettings.injectPos);
    for (const g of Object.keys(defaultSettings.injectPos)) {
        if (!s.injectPos[g] || typeof s.injectPos[g] !== "object") s.injectPos[g] = structuredClone(defaultSettings.injectPos[g]);
    }
    if (!s.prompts || typeof s.prompts !== "object") s.prompts = {};
    return s;
}

export const getSetting = (k) => getSettings()[k];
export function setSetting(k, v) {
    getSettings()[k] = v;
    saveSettingsDebounced();
}
export const saveSettings = () => saveSettingsDebounced();
