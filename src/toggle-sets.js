// ===== Tiramisu Kit — toggle-sets.js =====
// ทะเบียนกลางของ "ชุด Toggle สำเร็จรูป" — ระบบทั่วไปที่ใช้ได้กับทุกพรีเซ็ต Chat Completion ของ ST
// (ชุดของ Tiramisu ที่นิยามไว้ในไฟล์นี้เป็นแค่ข้อมูลตัวอย่าง — ไม่ผูกกับโค้ดของพรีเซ็ตใดๆ)
// deps: 0 — ห้าม import จากไฟล์อื่นในโปรเจกต์นี้ (preset.js เป็นคนอ่านทะเบียนนี้ไปใช้)

// ===== กลุ่มที่ระบบยอมให้ "ชุด" แตะ (กลุ่มสไตล์เท่านั้น ตามที่ผู้ใช้ยืนยัน) =====
// จับคู่แบบ tolerant: normalizeGroupName(หัวข้อกลุ่มจริง).includes(short ตัวใดตัวหนึ่งที่นี่)
export const MANAGED_GROUPS = [
    "style",
    "writing voice",
    "narrative focus",
    "narrator perspective",
    "pov flexibility",
    "pacing",
    "emotional intensity",
    "dialogue density",
    "user agency",
    "length",
];

// กลุ่ม/keyword อันตราย — ต้องไม่ถูกนับเป็น "กลุ่มที่แตะได้" เด็ดขาด แม้จะบังเอิญมี substring ตรงกับ
// MANAGED_GROUPS ในอนาคต (defense-in-depth — กันเคส "Mobile Formatting" ที่กลืน marker หลักทั้งหมดไว้ข้างใน
// เพราะไม่มีหัวข้อกลุ่มใหม่มาคั่นก่อนจบ order)
export const DANGEROUS_GROUP_HINTS = [
    "mobile formatting",
    "การตั้งค่า",
    "ไม่ได้ใช้",
    "เพิ่ม prompt",
    "เครดิต",
    "think box",
    "explicitness",
    "โจ่งแจ้ง",
    "kink",
    " nc",
    "intimacy",
    "output language",
];

// identifier สงวนของ ST เอง (charDescription/worldInfoBefore/ฯลฯ) + ของพรีเซ็ตนี้ (main/nsfw/jailbreak/...)
// ห้ามปิด/เปิดโดยชุด toggle ไม่ว่ากรณีใด
export const PROTECTED_IDS = new Set([
    "main", "nsfw", "jailbreak", "enhanceDefinitions",
    "charDescription", "charPersonality", "scenario", "personaDescription",
    "worldInfoBefore", "worldInfoAfter", "chatHistory", "dialogueExamples",
]);

// ชื่อที่เป็นแค่ตัวคั่นตกแต่ง (พบเกลื่อนใน prompt_order ของพรีเซ็ตนี้) — ไม่ใช่ prompt จริง ห้ามแตะ
export function isDividerName(name) {
    const s = String(name ?? "").trim();
    return s === "" || /^[☕🍰\-]+$/.test(s);
}

// เช็คว่าชื่อนี้เป็น "หัวข้อกลุ่ม" ไหม (ทุกหัวข้อกลุ่มในพรีเซ็ตนี้มีทั้ง ⌗ และ ┆ เสมอ ตรวจแล้วกับพรีเซ็ตจริง
// ทั้ง sfw/nc — ไม่มี prompt ธรรมดาตัวไหนมีสัญลักษณ์คู่นี้ปนอยู่) ใช้เป็นตัวคั่นขอบเขตกลุ่มตอน parse
// prompt_order เสมอ ไม่ว่ากลุ่มนั้นจะเป็นกลุ่มที่ "แตะได้" (MANAGED) หรือไม่ก็ตาม — สำคัญมาก: ถ้าใช้
// matchManagedGroup() อย่างเดียวเป็นตัวคั่นขอบเขต กลุ่มอันตราย (เช่น Output Language, Mobile Formatting)
// ที่ matchManagedGroup คืน null จะไม่ถูกนับเป็นขอบเขต ทำให้สมาชิกของมันเข้าไปปนกับกลุ่มก่อนหน้าโดยไม่ตั้งใจ
export function isGroupHeader(name) {
    const s = String(name ?? "");
    return s.includes("⌗") && s.includes("┆");
}

// ตัด "<emoji> ⌗ ┆" ออกจากหัวข้อกลุ่ม + ตัดส่วนต่อท้ายที่บอกชนิด (": เลือก 1", ": ...(Multi-select)")
// แล้วยุบช่องว่างซ้อน — ใช้เทียบกับ MANAGED_GROUPS / DANGEROUS_GROUP_HINTS แบบ case-insensitive
export function normalizeGroupName(raw) {
    let s = String(raw ?? "");
    const idx = s.lastIndexOf("┆");
    if (idx !== -1) s = s.slice(idx + 1);
    const colonIdx = s.indexOf(":");
    if (colonIdx !== -1) s = s.slice(0, colonIdx);
    return s.replace(/\s+/g, " ").trim().toLowerCase();
}

// คืน short-name ใน MANAGED_GROUPS ที่ตรงกับหัวข้อกลุ่มจริง หรือ null ถ้าไม่ใช่กลุ่มที่แตะได้
// (เช็ค DANGEROUS_GROUP_HINTS ก่อนเสมอ — ชนะ MANAGED_GROUPS ถ้าจะมีการชนกันในอนาคต)
export function matchManagedGroup(rawGroupName) {
    const norm = normalizeGroupName(rawGroupName);
    if (!norm) return null;
    if (DANGEROUS_GROUP_HINTS.some((hint) => norm.includes(hint))) return null;
    const hits = MANAGED_GROUPS.filter((short) => norm.includes(short));
    if (hits.length > 1) {
        console.warn(`[tiramisu-kit] หัวข้อกลุ่ม "${rawGroupName}" ตรงกับ MANAGED_GROUPS มากกว่า 1 ชื่อ (${hits.join(", ")}) — ใช้ตัวแรก`);
    }
    return hits[0] || null;
}

// ===== ชุดสำเร็จรูปของ Tiramisu (12 ชุด) =====
// variant: "any" = ใช้ได้ทั้ง sfw/nc | "nc" = โผล่เฉพาะตอนตรวจเจอว่ากำลังใช้พรีเซ็ตเวอร์ชัน nc
// ชื่อสมาชิกทุกตัวตรงกับที่มีจริงใน Tiramisu (nc/sfw) 04-09-26.json เป๊ะๆ (รวมช่องว่างซ้อนใน "Light  Hearted")
// — ถ้าพรีเซ็ตอัปเดตแล้วชื่อเปลี่ยน preset.js จะข้ามตัวที่หาไม่เจอ (ไม่ throw) และรายงานใน toast/รายละเอียดชุด
export const BUILTIN_SETS = [
    {
        id: "romance-soft",
        label: "โรแมนติกไลท์โนเวล (ฟีลกู๊ด/Slow burn)",
        desc: "คำบรรยายเรียบง่าย เน้นความสัมพันธ์ของสองตัวละครและบทสนทนา ค่อยเป็นค่อยไปไม่เร่งรีบ",
        builtin: true,
        variant: "any",
        picks: {
            "style": "Literacy",
            "writing voice": "นิยายโรแมนติกไลท์โนเวล",
            "narrative focus": "Relationship Driven",
            "narrator perspective": "Third Person Limited",
            "pov flexibility": "Locked POV",
            "pacing": "Slow Burn",
            "emotional intensity": "Gentle",
            "dialogue density": "Dialogue Heavy",
            "user agency": "Assisted Agency",
            "length": "Standard (Dynamic)",
        },
    },
    {
        id: "drama-intense",
        label: "เว็บดราม่า (Modern C-Web Novel)",
        desc: "เน้นพัฒนาการทางอารมณ์ของตัวละคร อารมณ์ในแต่ละฉากเข้มข้น เปลี่ยนมุมมองของตัวละครไปตามฉาก",
        builtin: true,
        variant: "any",
        picks: {
            "style": "Literacy",
            "writing voice": "นิยายเว็บดราม่า",
            "narrative focus": "Character Driven",
            "narrator perspective": "Third Person Limited",
            "pov flexibility": "Scene-Based POV",
            "pacing": "Relaxed",
            "emotional intensity": "Dramatic",
            "dialogue density": "Balanced",
            "user agency": "Assisted Agency",
            "length": "Long",
        },
    },
    {
        id: "action-fast",
        label: "เว็บแอคชั่น (K-Web Novel)",
        desc: "ดำเนินเรื่องแบบตัดฉากไปมาเหมือนภาพยนตร์ โฟกัสที่การสร้างเหตุการณ์ใหม่ๆ อารมณ์ของฉากเข้มข้นและรวดเร็ว เน้นคำบรรยายมากกว่าบทสนทนา",
        builtin: true,
        variant: "any",
        picks: {
            "style": "Cinematic",
            "writing voice": "นิยายเว็บแอคชั่น",
            "narrative focus": "Plot Driven",
            "narrator perspective": "Third Person Limited",
            "pov flexibility": "Scene-Based POV",
            "pacing": "Cinematic Fast",
            "emotional intensity": "Intense",
            "dialogue density": "Narrative Heavy",
            "user agency": "Visible Action Only",
            "length": "Standard (Dynamic)",
        },
    },
    {
        id: "horror",
        label: "สยองขวัญสไตล์ญี่ปุ่น",
        desc: "เนื้อเรื่องเต็มไปด้วยปริศนา สยองขวัญแบบมีทางรอดให้ผู้ใช้ เน้นคำบรรยาย โฟกัสที่ตัวละครเดียว อารมณ์ของฉากเข้มข้น เต็มไปด้วยบรรยากาศที่ลึกลับและกดดัน",
        builtin: true,
        variant: "any",
        picks: {
            "style": "Literacy",
            "writing voice": "นิยายสยองขวัญญี่ปุ่น",
            "narrative focus": "Mystery Driven",
            "narrator perspective": "First Person",
            "pov flexibility": "Locked POV",
            "pacing": "Slow Burn",
            "emotional intensity": "Intense",
            "dialogue density": "Narrative Heavy",
            "user agency": "Strict Agency",
            "length": "Long",
        },
    },
    {
        id: "slice-of-life-warm",
        label: "อบอุ่นหัวใจ (Slice of Life)",
        desc: "บรรยากาศสบายๆ เน้นทำให้ชีวิตประจำวันที่ธรรมดามีโมเมนต์พิเศษ ไม่เน้นอารมณ์เข้มข้น เน้นบทสนทนาและบรรยากาศของวันสบายๆ",
        builtin: true,
        variant: "any",
        picks: {
            "style": "Standard RP",
            "writing voice": "นิยายอบอุ่นหัวใจ",
            "narrative focus": "Slice of Life Driven",
            "narrator perspective": "Third Person Limited",
            "pov flexibility": "Locked POV",
            "pacing": "Relaxed",
            "emotional intensity": "Light  Hearted",
            "dialogue density": "Dialogue Heavy",
            "user agency": "Assisted Agency",
            "length": "Short",
        },
    },
    {
        id: "fantasy-adventure",
        label: "แฟนตาซีไลท์โนเวล (ผสม DnD)",
        desc: "เอไอรับบทบาทดันเจี้ยนมาสเตอร์ พาผู้ใช้ผจญภัยไปในโลกแฟนตาซี ทำภารกิจและสำรวจโลกกว้าง มีอิสระเต็มที่ในการตัดสินใจ",
        builtin: true,
        variant: "any",
        picks: {
            "style": "Dungeon Master",
            "writing voice": "นิยายแฟนตาซีไลท์โนเวล",
            "narrative focus": "Adventure Driven",
            "narrator perspective": "Third Person Limited",
            "pov flexibility": "Scene-Based POV",
            "pacing": "Balanced",
            "emotional intensity": "Moderate",
            "dialogue density": "Balanced",
            "user agency": "Visible Action Only",
            "length": "Standard (Dynamic)",
        },
    },
    {
        id: "quick-chat",
        label: "บรรยายสั้น สำนวนไทยร่วมสมัย",
        desc: "เนื้อเรื่องดำเนินรวดเร็ว ตัวละครตอบกลับสั้นและกระชับ เน้นบทสนทนา อารมณ์ไม่เข้มข้น ให้อารมณ์บทสนทนาทั่วไป",
        builtin: true,
        variant: "any",
        picks: {
            "style": "Standard RP",
            "writing voice": "นิยายไทยร่วมสมัย",
            "narrative focus": "Character Driven",
            "narrator perspective": "Third Person Limited",
            "pov flexibility": "Locked POV",
            "pacing": "Fast",
            "emotional intensity": "Light  Hearted",
            "dialogue density": "Dialogue Heavy",
            "user agency": "Assisted Agency",
            "length": "Chatting",
        },
    },
    {
        id: "intense-18",
        label: "Smut Heavy",
        desc: "เน้นพัฒนาความสัมพันธ์ระหว่างหลายๆ ตัวละคร ดำเนินเรื่องไม่เร่งรีบ อารมณ์แต่ละฉากเข้มข้น สะท้อนความสัมพันธ์แบบผู้ใหญ่ (18+)",
        builtin: true,
        variant: "nc",
        picks: {
            "style": "Literacy",
            "writing voice": "นิยาย Smut / Harem",
            "narrative focus": "Relationship Driven",
            "narrator perspective": "Third Person Limited",
            "pov flexibility": "Locked POV",
            "pacing": "Relaxed",
            "emotional intensity": "Intense",
            "dialogue density": "Balanced",
            "user agency": "Assisted Agency",
            "length": "Long",
        },
    },
    {
        id: "feel-good-warm",
        label: "ฟีลกู๊ดฟีลใจ",
        desc: "เน้นการพัฒนาความสัมพันธ์ของสองตัวละคร สำนวนสมัยใหม่ผสมภาษาวัยรุ่นนิดๆ เน้นบทสนทนา",
        builtin: true,
        variant: "any",
        picks: {
            "style": "Literacy",
            "writing voice": ["นิยายโรแมนติกไลท์โนเวล", "นิยายรีดอะไรท์"],
            "narrator perspective": "Third Person Limited",
            "pov flexibility": "Locked POV",
        },
    },
    {
        id: "romantic-slice-of-life",
        label: "โรแมนติกและอบอุ่นหัวใจ",
        desc: "แนว Slice of Life เน้นความพิเศษในชีวิตธรรมดา ไฮไลท์ความสุขเล็กๆ ที่อบอุ่น และความสัมพันธ์ของสองตัวละครที่ค่อยๆ ดำเนินไปอย่างช้าๆ",
        builtin: true,
        variant: "any",
        picks: {
            "style": "Literacy",
            "writing voice": ["นิยายโรแมนติกไลท์โนเวล", "นิยายอบอุ่นหัวใจ"],
            "narrative focus": "Slice of Life Driven",
            "pacing": "Slow Burn",
            "narrator perspective": "Third Person Limited",
            "pov flexibility": "Locked POV",
        },
    },
    {
        id: "rpg-adventure",
        label: "RPG ผจญภัย",
        desc: "ผจญภัยทำภารกิจพร้อมแอคชั่นรวดเร็ว เน้นท่องโลกกว้างและสำรวจโลก ทำภารกิจ",
        builtin: true,
        variant: "any",
        picks: {
            "style": "Cinematic",
            "writing voice": ["นิยายแฟนตาซีไลท์โนเวล", "นิยายเว็บแอคชั่น"],
            "narrative focus": "Adventure Driven",
            "narrator perspective": "Third Person Omniscient",
            "pov flexibility": "Flexible POV",
        },
    },
    {
        id: "epic-fantasy-world",
        label: "แฟนตาซีฉากหลังอลังการ",
        desc: "โลก High Fantasy ที่มีประวัติศาสตร์และการเอาตัวรอดฉบับนิยายแฟนตาซีตะวันตก สำรวจโลกไปพร้อมกับเผชิญหน้ากับอุปสรรคและภารกิจที่เข้มข้น",
        builtin: true,
        variant: "any",
        picks: {
            "style": "Cinematic",
            "writing voice": ["นิยายแฟนตาซี (โทลคีน)", "นิยายแฟนตาซี (โฟร์ทวิง)"],
            "narrative focus": "World Driven",
            "narrator perspective": "Third Person Omniscient",
            "pov flexibility": "Flexible POV",
        },
    },
];
