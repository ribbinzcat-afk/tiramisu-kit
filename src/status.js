// ===== Tiramisu Kit — status.js =====
// แสดงสถานะ "กำลังเจน..." ระหว่างเจนแยกผ่าน Connection Profile ของตัวเอง (โหมด split: CoT / Theatre / Tiramisu's UI)
// จำเป็นเพราะการเจนพวกนี้ไม่ได้ผูกกับปุ่มที่ผู้ใช้กด (เกิดจาก event เบื้องหลัง) — ไม่มี pill นี้ผู้ใช้จะไม่รู้เลยว่า
// มีการยิง API อยู่กี่ครั้ง กำลังทำอะไรอยู่ (กฎ "ทุก path ที่เรียก AI ต้องมี feedback" ของโปรเจกต์)
// เป็น pill ลอยมุมล่างขวา (นอกกรอบแชท) เห็นได้แม้ระหว่างเลื่อนดูข้อความเก่า
// deps: 0 — ห้าม import จากไฟล์อื่นในโปรเจกต์นี้

const active = new Map(); // token(Symbol) -> label — รองรับหลายงานซ้อนกัน (เช่น เจน log แล้วต่อด้วย charNote)

function ensureEl() {
    let el = document.getElementById("tirakit-status");
    if (!el) {
        el = document.createElement("div");
        el.id = "tirakit-status";
        el.className = "tirakit-status tirakit-hidden";
        document.body.appendChild(el);
    }
    return el;
}

function render() {
    const el = ensureEl();
    if (active.size === 0) {
        el.classList.add("tirakit-hidden");
        return;
    }
    const labels = [...active.values()];
    el.innerHTML = `<span class="tirakit-status-spinner"></span><span>🍰 กำลังเจน: ${escapeText(labels.join(", "))}</span>`;
    el.classList.remove("tirakit-hidden");
}

function escapeText(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
}

// เริ่มแสดงสถานะงานหนึ่ง — คืน token ไว้ปิดงานนี้เท่านั้น (ไม่ชนกับงานอื่นที่ทำงานพร้อมกัน)
export function beginStatus(label) {
    const token = Symbol(label);
    active.set(token, label);
    render();
    return token;
}

export function endStatus(token) {
    active.delete(token);
    render();
}

// ห่อฟังก์ชัน async ใดๆ ให้โชว์/ซ่อนสถานะอัตโนมัติ กันลืมปิดตอน error (finally)
export async function withStatus(label, fn) {
    const token = beginStatus(label);
    try {
        return await fn();
    } finally {
        endStatus(token);
    }
}
