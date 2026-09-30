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
    selectedDialogue: "",     // "" | text (ข้อความสี) | ui (กล่องตามธีม) — ค่าเก่า light/dark ย้ายเป็น text อัตโนมัติ
    // Dialogue: ตั้งค่าการแสดงผล (ข้อมูลตัวละครอยู่ในการ์ด/แชทกลุ่ม ดู src/dialogue/data.js)
    dialogue: {
        theme: "messenger",   // messenger | vn | simple
        uiDepth: 3,           // แสดง UI เฉพาะ N ข้อความล่าสุด (0 = ทั้งหมด) ที่เก่ากว่าเป็นข้อความสี
        promptDepth: 2,       // เก็บแท็ก <say> ไว้ใน prompt แค่ N ข้อความล่าสุด ที่เก่ากว่าแปลงเป็น "ชื่อ: บทพูด"
        tone: "dark",         // โทนสีอัตโนมัติของตัวละครใหม่ (dark = สีสว่างบนพื้นมืด)
        textColor: "char",    // สีบทพูด: char = สีประจำตัวละคร | quote = สีคำพูดของธีม (SmartThemeQuoteColor)
        userQuotes: true,     // แปลงเครื่องหมายคำพูดในข้อความของผู้ใช้เป็นบทพูดของ persona
        autoAdd: true,        // เพิ่ม NPC ที่ AI ตั้งชื่อขึ้นใหม่เข้าแกลเลอรีอัตโนมัติ
    },
    dialoguePersonas: {},     // ไฟล์อวาตาร์ persona -> { color, img }
    dialogueImages: {},       // ทะเบียนรูปที่อัปโหลด: ชื่อไฟล์ -> เจ้าของ (ใช้ตรวจไฟล์ค้าง ดู src/dialogue/cleanup.js)
    rngEnabled: false,
    tiramisuUi: { log: false, charNote: false, rpgStatus: false, livechat: false },
    livechatDepth: 2,        // ส่งแชทไลฟ์เข้า prompt แค่ N ข้อความหลังสุด (0 = ไม่จำกัด) — บนจอยังแสดงครบ
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

    // ชุด Toggle ที่ผู้ใช้บันทึกเอง (global — ตามผู้ใช้ไปทุกแชท) รูปแบบเดียวกับ BUILTIN_SETS ใน toggle-sets.js
    // แต่ละตัว: { id, label, desc, builtin:false, presetName, picks: {กลุ่ม: ชื่อสมาชิก} }
    toggleSets: [],

    // ค่า Think Box ของพรีเซ็ต Tiramisu ที่ extension แก้ให้ล่าสุด — ใช้แค่โชว์สถานะในแท็บ ไม่ใช่ source of truth
    // (source of truth จริงคือ prompt_order ของพรีเซ็ต) เก็บไว้กันจอกระพริบตอนโหลดแท็บก่อน parse เสร็จ
    lastThinkBoxState: null, // null | "with" | "without"
};

export function getSettings() {
    extension_settings[extensionName] = extension_settings[extensionName] || {};
    const s = extension_settings[extensionName];
    for (const k of Object.keys(defaultSettings)) {
        if (s[k] === undefined) s[k] = structuredClone(defaultSettings[k]);
    }
    // type-guard ระดับลึก กันผู้ใช้เก่าที่มีคีย์แต่ shape ไม่ตรง (เช่นเคยเป็น object เปล่า)
    if (!s.tiramisuUi || typeof s.tiramisuUi !== "object") s.tiramisuUi = structuredClone(defaultSettings.tiramisuUi);
    for (const k of Object.keys(defaultSettings.tiramisuUi)) {
        if (typeof s.tiramisuUi[k] !== "boolean") s.tiramisuUi[k] = false; // ผู้ใช้เก่าไม่มีคีย์โมดูลใหม่
    }
    if (!s.theatre || typeof s.theatre !== "object") s.theatre = structuredClone(defaultSettings.theatre);
    if (!s.injectPos || typeof s.injectPos !== "object") s.injectPos = structuredClone(defaultSettings.injectPos);
    for (const g of Object.keys(defaultSettings.injectPos)) {
        if (!s.injectPos[g] || typeof s.injectPos[g] !== "object") s.injectPos[g] = structuredClone(defaultSettings.injectPos[g]);
    }
    if (!s.prompts || typeof s.prompts !== "object") s.prompts = {};
    if (!s.dialogue || typeof s.dialogue !== "object") s.dialogue = structuredClone(defaultSettings.dialogue);
    for (const [k, v] of Object.entries(defaultSettings.dialogue)) {
        if (s.dialogue[k] === undefined) s.dialogue[k] = v;
    }
    if (!s.dialoguePersonas || typeof s.dialoguePersonas !== "object") s.dialoguePersonas = {};
    if (!s.dialogueImages || typeof s.dialogueImages !== "object") s.dialogueImages = {};
    // ย้ายค่าจาก Colorful Dialogue เดิม (AI เลือกสีเอง) มาเป็นโหมดข้อความสีของระบบใหม่
    if (s.selectedDialogue === "light" || s.selectedDialogue === "dark") {
        s.dialogue.tone = s.selectedDialogue;
        s.selectedDialogue = "text";
    }
    if (!Array.isArray(s.toggleSets)) s.toggleSets = [];
    return s;
}

export const getSetting = (k) => getSettings()[k];
export function setSetting(k, v) {
    getSettings()[k] = v;
    saveSettingsDebounced();
}
export const saveSettings = () => saveSettingsDebounced();
