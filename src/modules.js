// ===== Tiramisu Kit — modules.js =====
// ทะเบียนกลางของทุกโมดูล — แหล่งความจริงเดียว (ตาม CONVENTIONS ของ tinyfeed ที่ห้าม hardcode ลิสต์ซ้ำที่อื่น)
// settings UI / การแทรก prompt / การเจนแยก / ตัวนับโทเคน ต้อง derive จากอาเรย์นี้ทั้งหมด
// deps: 0 — ห้าม import จากไฟล์อื่นในโปรเจกต์นี้

// group: ui | dialogue | rng | tiramisuUi | theatre | cot
// select: true = กลุ่มนี้เลือกได้ทีละ 1 อัน (เก็บใน settings.selectedXxx), false = toggle อิสระ (เก็บใน settings[group][id])
// tag: แท็ก XML ที่โมดูลนี้ผลิต/ต้องหาในคำตอบ (ไม่มี = โมดูลนี้เป็นแค่คำสั่งพฤติกรรม ไม่ใช่แท็กที่ render เป็นกล่อง)
// splittable: มีโหมดเจนแยก (split) รองรับไหม
export const MODULE_GROUPS = [
    { id: "ui", label: "UI Creation", select: true },
    { id: "dialogue", label: "Colorful Dialogue", select: true },
    { id: "rng", label: "RNG Situation", select: false },
    { id: "tiramisuUi", label: "Tiramisu's UI", select: false, splittable: true },
    { id: "theatre", label: "Mini Theatre", select: false, splittable: true },
    { id: "cot", label: "Chain of Thought (CoT)", select: false, splittable: true },
];

export const MODULES = [
    // ===== UI Creation (เลือก 1) =====
    { id: "light", group: "ui", label: "Light Mode", promptId: "uiLight" },
    { id: "dark", group: "ui", label: "Dark Mode", promptId: "uiDark" },
    { id: "jsLight", group: "ui", label: "with JS - Light", promptId: "uiJsLight" },
    { id: "jsDark", group: "ui", label: "with JS - Dark", promptId: "uiJsDark" },
    { id: "custom", group: "ui", label: "Custom Theme", promptId: "uiCustom" },

    // ===== Colorful Dialogue (เลือก 1) =====
    { id: "light", group: "dialogue", label: "Light Mode", promptId: "dialogueLight" },
    { id: "dark", group: "dialogue", label: "Dark Mode", promptId: "dialogueDark" },

    // ===== RNG =====
    { id: "rng", group: "rng", label: "RNG Situation (d100)", promptId: "rng" },

    // ===== Tiramisu's UI (toggle อิสระ, เจนแยกได้) =====
    { id: "log", group: "tiramisuUi", label: "Tiramisu's Log", promptId: "log", tag: "tiramisu_log", fields: 6, splittable: true },
    { id: "charNote", group: "tiramisuUi", label: "Char's Note", promptId: "charNote", tag: "char_note", fields: 1, splittable: true },
    { id: "rpgStatus", group: "tiramisuUi", label: "RPG Status", promptId: "rpgStatus", tag: "rpg_status", fields: 9, splittable: true },

    // ===== Mini Theatre (artDirection = ฐาน ต้องเปิดก่อนใช้ตัวย่อย, เจนแยกได้) =====
    { id: "artDirection", group: "theatre", label: "Art Direction (ฐาน)", promptId: "theatreArtDirection", isBase: true, splittable: true },
    { id: "forum", group: "theatre", label: "Tiramisu Forum", promptId: "theatreForum", splittable: true },
    { id: "abo", group: "theatre", label: "ABO", promptId: "theatreAbo", splittable: true },
    { id: "interview", group: "theatre", label: "นักแสดงให้สัมภาษณ์", promptId: "theatreInterview", splittable: true },

    // ===== CoT =====
    { id: "cot", group: "cot", label: "Chain of Thought", promptId: "cot", tag: "planning", splittable: true },
];

export function modulesInGroup(groupId) {
    return MODULES.filter((m) => m.group === groupId);
}

export function findModule(groupId, moduleId) {
    return MODULES.find((m) => m.group === groupId && m.id === moduleId);
}
