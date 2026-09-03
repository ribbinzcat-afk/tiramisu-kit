// ===== Tiramisu Kit — context.js =====
// ประกอบบริบท (character card / บทสนทนาล่าสุด / คำตอบล่าสุด) สำหรับส่งไปกับการเจนแยก (CoT / Theatre / Tiramisu UI)
// ท่าเดียวกับ scene-captured/src/context.js (proven ใช้งานจริงแล้ว) — ตัดเฉพาะส่วนที่ต้องใช้
// deps: 0 (ใช้แค่ ctx ที่ส่งเข้ามา) — ห้าม import จากไฟล์อื่นในโปรเจกต์นี้

function htmlToPlain(html) {
    const d = document.createElement("div");
    d.innerHTML = String(html || "").replace(/<br\s*\/?>/gi, "\n");
    return (d.textContent || "").trim();
}

export function buildCharacterBlock(ctx) {
    try {
        const chId = ctx.characterId;
        const card = chId != null && ctx.characters ? ctx.characters[chId] : null;
        if (!card) return "";
        const lines = [`ชื่อ: ${card.name || ctx.name2 || ""}`];
        if (card.description) lines.push(`คำอธิบาย:\n${htmlToPlain(card.description)}`);
        if (card.personality) lines.push(`บุคลิก:\n${htmlToPlain(card.personality)}`);
        if (card.scenario) lines.push(`ฉาก:\n${htmlToPlain(card.scenario)}`);
        return `[ตัวละครหลัก]\n${lines.join("\n")}`;
    } catch (e) {
        console.warn("[tiramisu-kit] buildCharacterBlock ล้มเหลว (ปล่อยว่าง):", e);
        return "";
    }
}

export function buildRecentMessagesBlock(ctx, count) {
    try {
        const chat = ctx.chat || [];
        const n = Math.max(1, Number(count) || 6);
        const recent = chat.filter((m) => !m.is_system).slice(-n);
        const lines = recent.map((m) => `${m.is_user ? (ctx.name1 || "User") : (m.name || ctx.name2 || "Char")}: ${htmlToPlain(m.mes)}`);
        return lines.length ? `[บทสนทนาล่าสุด]\n${lines.join("\n")}` : "";
    } catch (e) {
        console.warn("[tiramisu-kit] buildRecentMessagesBlock ล้มเหลว (ปล่อยว่าง):", e);
        return "";
    }
}

// สำหรับ CoT (เจนก่อนคำตอบหลักในโหมด split): ตัวละคร + บทสนทนาล่าสุด
export function buildCotContext(ctx, count) {
    return [buildCharacterBlock(ctx), buildRecentMessagesBlock(ctx, count)].filter(Boolean).join("\n\n");
}

// สำหรับ Theatre / Tiramisu UI (เจนตามหลังคำตอบหลักในโหมด split): ตัวละคร + คำตอบล่าสุดที่เพิ่งเจนเสร็จ
export function buildPostContext(ctx, latestReply) {
    const parts = [buildCharacterBlock(ctx)];
    if (latestReply) parts.push(`[คำตอบล่าสุด]\n${htmlToPlain(latestReply)}`);
    return parts.filter(Boolean).join("\n\n");
}
