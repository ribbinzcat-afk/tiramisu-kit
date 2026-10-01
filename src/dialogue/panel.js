// ===== Tiramisu Kit — dialogue/panel.js =====
// แท็บ "ตัวละคร" ในแผงลอย: สี / อัปโหลด / ครอป / ลบรูป ของ persona, ตัวละครของการ์ด และ NPC
// + รูปตามอารมณ์ (ตัวเลือกเพิ่มเติม) + ตัวครอปรูป 2 แบบ (อวาตาร์ 1:1 / วิชวลโนเวล 3:4)
//
// deps: ./data.js, ./images.js, ../render/templates.js, ../store.js — ห้าม import จาก index.js
// (index.js ส่ง onChange เข้ามาเองตอน bind เพื่อสั่ง applyInjections + sweepAllMessages)

import { extensionName, getSettings } from "../store.js";
import { escapeText } from "../render/templates.js";
import {
    CHAR_ID, getScope, getRoster, saveRoster, getPersonaEntry, savePersonaEntry,
    nextColor, fallbackColor, autoAddSpeakers, normName,
} from "./data.js";
import { uploadImage, deleteImage } from "./images.js";
import { registerImage, currentOwner, scanImages, formatBytes } from "./cleanup.js";

const PERSONA_ID = "__persona__";
const ASPECT = { avatar: 1, vn: 3 / 4 };

let onChangeCb = () => {};
let pendingUpload = null; // { id, mood }
let crop = null;          // สถานะตัวครอปที่เปิดอยู่

const ctxNow = () => SillyTavern.getContext();
const tone = () => getSettings().dialogue?.tone || "dark";

// ===== อ่าน/เขียน entry ตาม id (persona อยู่ใน settings ที่เหลืออยู่ใน roster) =====
function readEntry(ctx, id) {
    if (id === PERSONA_ID) return getPersonaEntry(ctx);
    const roster = getRoster(ctx);
    if (id === CHAR_ID) {
        const scope = getScope(ctx);
        return roster.entries[CHAR_ID] || { id: CHAR_ID, name: scope.character?.name || "", aliases: [], color: fallbackColor(tone(), scope.character?.name), img: null, moods: {} };
    }
    return roster.entries[id] || null;
}

function writeEntry(ctx, id, mutate) {
    if (id === PERSONA_ID) {
        const cur = getPersonaEntry(ctx);
        const next = mutate({ color: cur.color, img: cur.img });
        savePersonaEntry(ctx, { color: next.color, img: next.img ?? null });
    } else {
        const roster = getRoster(ctx);
        const cur = readEntry(ctx, id);
        if (!cur) return;
        roster.entries[id] = mutate(structuredClone(cur));
        saveRoster(ctx, roster);
    }
    onChangeCb();
}

// ===== รูปย่อในแกลเลอรี (ใช้ครอปแบบอวาตาร์) =====
function thumbHtml(entry, fallbackSrc, name) {
    const img = entry?.img;
    const src = img?.path || fallbackSrc;
    if (!src) return `<b>${escapeText(Array.from(String(name || "?"))[0] || "?")}</b>`;
    const c = img?.path ? img.crop?.avatar : null;
    if (c && c.w > 0 && c.h > 0) {
        return `<img src="${escapeText(src)}" alt="" style="width:${100 / c.w}%;height:${100 / c.h}%;left:${-c.x / c.w * 100}%;top:${-c.y / c.h * 100}%;">`;
    }
    return `<img src="${escapeText(src)}" alt="" style="inset:0;width:100%;height:100%;object-fit:cover;object-position:top;">`;
}

function moodsHtml(id, entry) {
    const chips = Object.entries(entry.moods || {}).map(([mood, img]) => `
        <div class="tirakit-dlg-mood-chip">
            <div class="tirakit-dlg-thumb tirakit-dlg-thumb-sm" style="--tirakit-c:${escapeText(entry.color)}">${thumbHtml({ img }, "", mood)}</div>
            <span>${escapeText(mood)}</span>
            <button class="menu_button tirakit-dlg-icon" data-dlg-act="crop" data-dlg-id="${escapeText(id)}" data-dlg-mood="${escapeText(mood)}" title="ครอป"><i class="fa-solid fa-crop-simple"></i></button>
            <button class="menu_button tirakit-dlg-icon tirakit-dlg-danger" data-dlg-act="del-mood" data-dlg-id="${escapeText(id)}" data-dlg-mood="${escapeText(mood)}" title="ลบรูปอารมณ์นี้"><i class="fa-solid fa-trash-can"></i></button>
        </div>`).join("");
    return `
        <div class="tirakit-dlg-moods tirakit-hidden" data-dlg-moods="${escapeText(id)}">
            <small class="tirakit-hint">รูปตามอารมณ์ — AI จะได้รายชื่ออารมณ์เหล่านี้ไปใช้ใน mood="..." (ไม่มีรูปของอารมณ์ไหน จะใช้รูปหลัก)</small>
            <div class="tirakit-dlg-mood-list">${chips || `<small class="tirakit-hint">ยังไม่มีรูปอารมณ์</small>`}</div>
            <div class="tirakit-dlg-mood-add">
                <input type="text" class="text_pole" placeholder="ชื่ออารมณ์ เช่น หงุดหงิด" data-dlg-mood-input="${escapeText(id)}">
                <button class="menu_button" data-dlg-act="upload-mood" data-dlg-id="${escapeText(id)}"><i class="fa-solid fa-upload"></i> อัปโหลด</button>
            </div>
        </div>`;
}

function rowHtml(id, entry, { fallbackSrc = "", sub = "", editableName = false, editableAlias = editableName, removable = false, moods = true } = {}) {
    const color = entry.color || fallbackColor(tone(), entry.name);
    const hasImg = Boolean(entry.img?.path);
    const eid = escapeText(id);
    const nameHtml = editableName
        ? `<input type="text" class="text_pole tirakit-dlg-name-input" data-dlg-field="name" data-dlg-id="${eid}" value="${escapeText(entry.name)}">`
        : `<div class="tirakit-dlg-row-name" style="color:${escapeText(color)}">${escapeText(entry.name)}</div>`;
    const aliasHtml = editableAlias
        ? `<input type="text" class="text_pole tirakit-dlg-alias-input" data-dlg-field="aliases" data-dlg-id="${eid}" value="${escapeText((entry.aliases || []).join(", "))}" placeholder="ชื่อเรียกอื่น คั่นด้วย ,">`
        : "";
    return `
    <div class="tirakit-dlg-row" data-dlg-row="${eid}">
        <div class="tirakit-dlg-row-main">
            <div class="tirakit-dlg-thumb" style="--tirakit-c:${escapeText(color)}">${thumbHtml(entry, fallbackSrc, entry.name)}</div>
            <div class="tirakit-dlg-row-info">
                ${nameHtml}
                ${aliasHtml}
                ${sub ? `<small class="tirakit-hint">${sub}</small>` : ""}
            </div>
        </div>
        <div class="tirakit-dlg-row-acts">
            <input type="color" class="tirakit-dlg-color" data-dlg-id="${eid}" value="${/^#[0-9a-f]{6}$/i.test(color) ? color : "#cccccc"}" title="สี">
            <button class="menu_button tirakit-dlg-icon" data-dlg-act="upload" data-dlg-id="${eid}" title="อัปโหลดรูป"><i class="fa-solid fa-upload"></i></button>
            <button class="menu_button tirakit-dlg-icon" data-dlg-act="crop" data-dlg-id="${eid}" title="ครอปรูป" ${hasImg ? "" : "disabled"}><i class="fa-solid fa-crop-simple"></i></button>
            <button class="menu_button tirakit-dlg-icon tirakit-dlg-danger" data-dlg-act="del-img" data-dlg-id="${eid}" title="ลบรูป (กลับไปใช้รูปเริ่มต้น)" ${hasImg ? "" : "disabled"}><i class="fa-solid fa-image"></i><i class="fa-solid fa-xmark tirakit-dlg-mini"></i></button>
            ${moods ? `<button class="menu_button tirakit-dlg-icon" data-dlg-act="more" data-dlg-id="${eid}" title="รูปตามอารมณ์"><i class="fa-solid fa-ellipsis"></i></button>` : ""}
            ${removable ? `<button class="menu_button tirakit-dlg-icon tirakit-dlg-danger" data-dlg-act="remove" data-dlg-id="${eid}" title="ลบตัวละครนี้"><i class="fa-solid fa-trash-can"></i></button>` : ""}
        </div>
        ${moods ? moodsHtml(id, entry) : ""}
    </div>`;
}

// ===== วาดทั้งแท็บ =====
export function renderDialogueTab() {
    const ctx = ctxNow();
    const scope = getScope(ctx);
    const $root = $("#tirakit-dlg-root");
    if (!$root.length) return;

    const persona = getPersonaEntry(ctx);
    let html = `
        <div class="tirakit-group">
            <div class="tirakit-group-title">🙋 ผู้ใช้ (Persona)</div>
            <small class="tirakit-hint">ผูกกับ persona ที่ใช้อยู่ — สลับ persona แล้วตั้งค่าแยกกันได้ · ไม่อัปโหลดรูป = ใช้อวาตาร์ของ persona</small>
            ${persona.key ? rowHtml(PERSONA_ID, persona, { fallbackSrc: persona.defaultSrc, moods: false }) : `<small class="tirakit-hint">ยังไม่ได้เลือก persona</small>`}
        </div>`;

    if (scope.kind === "none") {
        html += `<div class="tirakit-group"><small class="tirakit-hint">เปิดแชทกับตัวละครก่อน แล้วค่อยตั้งค่าตัวละครได้</small></div>`;
        $root.html(html + cleanupSectionHtml());
        return;
    }

    const roster = getRoster(ctx);
    const where = scope.kind === "card"
        ? `บันทึกไว้ในการ์ด <b>${escapeText(scope.label)}</b> (ติดไปกับการ์ดตอน export — ไฟล์รูปอยู่บนเซิร์ฟเวอร์ ST เครื่องนี้)`
        : `แชทกลุ่ม <b>${escapeText(scope.label)}</b> — NPC บันทึกไว้ในแชทนี้ · สมาชิกกลุ่มใช้รูปและสีจากการ์ดของตัวเอง`;
    html += `<div class="tirakit-group"><div class="tirakit-group-title">🎭 ตัวละคร</div><small class="tirakit-hint">${where}</small>`;

    if (scope.kind === "card") {
        const charEntry = readEntry(ctx, CHAR_ID);
        const src = typeof ctx.getThumbnailUrl === "function" ? ctx.getThumbnailUrl("avatar", scope.character.avatar) : "";
        html += rowHtml(CHAR_ID, charEntry, { fallbackSrc: src, editableAlias: true, sub: "ตัวละครของการ์ด · ไม่อัปโหลดรูป = ใช้อวาตาร์การ์ด" });
    }

    const npcs = Object.values(roster.entries).filter((e) => e.id !== CHAR_ID)
        .sort((a, b) => String(a.name).localeCompare(String(b.name), "th"));
    for (const e of npcs) {
        html += rowHtml(e.id, e, { editableName: true, removable: true, sub: e.auto ? "เพิ่มอัตโนมัติจากแชท" : "" });
    }
    html += `
        <div class="tirakit-dlg-bottom">
            <button class="menu_button" data-dlg-act="add"><i class="fa-solid fa-plus"></i> เพิ่ม NPC</button>
            <button class="menu_button" data-dlg-act="scan"><i class="fa-solid fa-magnifying-glass"></i> สแกนชื่อจากแชทนี้</button>
        </div>
    </div>`;
    $root.html(html + cleanupSectionHtml());
}

// ===== ตรวจไฟล์ค้าง =====
let scanResult = null;   // ผลตรวจล่าสุด (คงไว้ระหว่างวาดแท็บใหม่)
let scanning = false;

function cleanupSectionHtml() {
    let body = "";
    if (scanning) {
        body = `<small class="tirakit-hint" id="tirakit-dlg-scan-progress"><i class="fa-solid fa-spinner fa-spin"></i> กำลังตรวจ...</small>`;
    } else if (scanResult) {
        const r = scanResult;
        const orphanBytes = r.orphans.reduce((a, o) => a + o.bytes, 0);
        body = `<div class="tirakit-dlg-scan-sum">ทั้งหมด <b>${r.total}</b> ไฟล์ (${formatBytes(r.totalBytes)}) · ใช้อยู่ <b>${r.used}</b> · ค้าง <b>${r.orphans.length}</b> (${formatBytes(orphanBytes)})</div>`;
        if (r.orphans.length) {
            body += `<div class="tirakit-dlg-orphans">` + r.orphans.map((o, i) => `
                <label class="tirakit-dlg-orphan">
                    <input type="checkbox" class="tirakit-dlg-orphan-check" data-dlg-orphan="${i}" ${o.checked ? "checked" : ""}>
                    <div class="tirakit-dlg-thumb tirakit-dlg-thumb-sm" style="--tirakit-c:#888"><img src="${escapeText(o.path)}" alt="" style="inset:0;width:100%;height:100%;object-fit:cover;"></div>
                    <div class="tirakit-dlg-orphan-info"><div>${escapeText(o.name)} · ${formatBytes(o.bytes)}</div><small class="tirakit-hint">${escapeText(o.reason)}</small></div>
                </label>`).join("") + `</div>
                <button class="menu_button tirakit-dlg-danger" data-dlg-act="delete-orphans"><i class="fa-solid fa-trash-can"></i> ลบไฟล์ที่เลือก</button>`;
        } else {
            body += `<small class="tirakit-hint">ไม่มีไฟล์ค้าง 🎉</small>`;
        }
    }
    return `
        <div class="tirakit-group">
            <div class="tirakit-group-title">🧹 ไฟล์รูปบนเซิร์ฟเวอร์</div>
            <small class="tirakit-hint">ตรวจโฟลเดอร์ user/images/tiramisu-kit/ ว่ามีไฟล์ที่ไม่มีตัวละครหรือ persona ไหนใช้แล้วหรือเปล่า (เช่นหลังลบการ์ด) · ไฟล์ที่ไม่แน่ใจจะไม่ติ๊กไว้ให้</small>
            <button class="menu_button" data-dlg-act="scan-files" ${scanning ? "disabled" : ""}><i class="fa-solid fa-magnifying-glass"></i> ตรวจไฟล์ค้าง</button>
            ${body}
        </div>`;
}

async function runScan() {
    scanning = true;
    renderDialogueTab();
    try {
        scanResult = await scanImages((msg) => $("#tirakit-dlg-scan-progress").html(`<i class="fa-solid fa-spinner fa-spin"></i> ${escapeText(msg)}`));
    } catch (e) {
        console.error(`[${extensionName}] ตรวจไฟล์ค้างล้มเหลว:`, e);
        toastr.error(String(e.message || e), "ตรวจไฟล์ไม่สำเร็จ");
        scanResult = null;
    } finally {
        scanning = false;
        renderDialogueTab();
    }
}

async function deleteSelectedOrphans() {
    if (!scanResult) return;
    const picks = scanResult.orphans.filter((o) => o.checked);
    if (!picks.length) { toastr.info("ยังไม่ได้เลือกไฟล์", "Tiramisu Kit"); return; }
    if (!window.confirm(`ลบไฟล์รูป ${picks.length} ไฟล์ออกจากเซิร์ฟเวอร์? (กู้คืนไม่ได้)`)) return;
    let ok = 0;
    for (const o of picks) if (await deleteImage(o.path)) ok++;
    toastr.success(`ลบแล้ว ${ok}/${picks.length} ไฟล์`, "Tiramisu Kit");
    await runScan();
}

// ===== ตัวครอป =====
function openCrop(id, mood) {
    const ctx = ctxNow();
    const entry = readEntry(ctx, id);
    const img = mood ? entry?.moods?.[mood] : entry?.img;
    if (!img?.path) return;
    crop = {
        id, mood, path: img.path, kind: "avatar",
        rects: structuredClone(img.crop || {}),
        natW: 0, natH: 0, drag: null,
    };
    const $m = $("#tirakit-dlg-crop");
    $m.find(".tirakit-dlg-crop-img").attr("src", img.path);
    $m.find("[data-dlg-crop-kind]").removeClass("tirakit-tab-active").filter('[data-dlg-crop-kind="avatar"]').addClass("tirakit-tab-active");
    $m.removeClass("tirakit-hidden");
    setTimeout(layoutCrop, 50); // รูปที่อยู่ใน cache อาจโหลดเสร็จก่อนกรอบแสดงผล
}

function closeCrop() {
    crop = null;
    $("#tirakit-dlg-crop").addClass("tirakit-hidden");
}

function defaultRect(kind, natW, natH) {
    const a = ASPECT[kind];
    // ขนาดใหญ่สุดที่ใส่ได้ตามอัตราส่วน แล้วชิดด้านบน (หน้าคนมักอยู่ครึ่งบน)
    let w = natW, h = natW / a;
    if (h > natH) { h = natH; w = natH * a; }
    if (kind === "avatar") { w *= 0.8; h *= 0.8; }
    return { x: (natW - w) / 2 / natW, y: 0, w: w / natW, h: h / natH };
}

function layoutCrop() {
    if (!crop) return;
    const $img = $("#tirakit-dlg-crop .tirakit-dlg-crop-img");
    const el = $img.get(0);
    if (!el || !el.naturalWidth) return;
    crop.natW = el.naturalWidth;
    crop.natH = el.naturalHeight;
    if (!crop.rects[crop.kind]) crop.rects[crop.kind] = defaultRect(crop.kind, crop.natW, crop.natH);
    const r = crop.rects[crop.kind];
    const dw = el.clientWidth, dh = el.clientHeight;
    $("#tirakit-dlg-crop .tirakit-dlg-crop-rect").css({
        left: `${r.x * dw}px`, top: `${r.y * dh}px`, width: `${r.w * dw}px`, height: `${r.h * dh}px`,
    });
    const a = ASPECT[crop.kind];
    const maxWpx = Math.min(crop.natW, crop.natH * a);
    $("#tirakit-dlg-crop-size").val(Math.round((r.w * crop.natW) / maxWpx * 100));
}

function clampRect(r) {
    r.w = Math.min(Math.max(r.w, 0.05), 1);
    r.h = Math.min(Math.max(r.h, 0.05), 1);
    r.x = Math.min(Math.max(r.x, 0), 1 - r.w);
    r.y = Math.min(Math.max(r.y, 0), 1 - r.h);
    return r;
}

function setCropSize(pct) {
    if (!crop?.natW) return;
    const r = crop.rects[crop.kind];
    const a = ASPECT[crop.kind];
    const maxWpx = Math.min(crop.natW, crop.natH * a);
    const wpx = maxWpx * Math.min(Math.max(pct, 10), 100) / 100;
    const hpx = wpx / a;
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2; // ย่อ/ขยายรอบจุดกึ่งกลางเดิม
    r.w = wpx / crop.natW;
    r.h = hpx / crop.natH;
    r.x = cx - r.w / 2;
    r.y = cy - r.h / 2;
    clampRect(r);
    layoutCrop();
}

function saveCrop() {
    if (!crop) return;
    const { id, mood, rects } = crop;
    writeEntry(ctxNow(), id, (e) => {
        if (mood) {
            e.moods = e.moods || {};
            if (e.moods[mood]) e.moods[mood].crop = rects;
        } else if (e.img) {
            e.img.crop = rects;
        }
        return e;
    });
    closeCrop();
    renderDialogueTab();
    toastr.success("บันทึกการครอปแล้ว", "Tiramisu Kit");
}

// ===== อัปโหลด =====
async function handleFile(file) {
    const target = pendingUpload;
    pendingUpload = null;
    if (!file || !target) return;
    if (!/^image\//.test(file.type)) {
        toastr.warning("เลือกไฟล์รูปภาพเท่านั้น", "Tiramisu Kit");
        return;
    }
    const ctx = ctxNow();
    const toast = toastr.info("กำลังย่อและอัปโหลดรูป...", "Tiramisu Kit", { timeOut: 0 });
    try {
        const path = await uploadImage(file);
        registerImage(path, currentOwner(ctx, target.id === PERSONA_ID));
        let oldPath = null;
        writeEntry(ctx, target.id, (e) => {
            if (target.mood) {
                e.moods = e.moods || {};
                oldPath = e.moods[target.mood]?.path || null;
                e.moods[target.mood] = { path, crop: {} };
            } else {
                oldPath = e.img?.path || null;
                e.img = { path, crop: {} };
            }
            return e;
        });
        if (oldPath && oldPath !== path) deleteImage(oldPath);
        renderDialogueTab();
        openCrop(target.id, target.mood); // ให้เลือกพื้นที่ครอปต่อทันที
    } catch (e) {
        console.error(`[${extensionName}] อัปโหลดรูปล้มเหลว:`, e);
        toastr.error(String(e.message || e), "อัปโหลดไม่สำเร็จ");
    } finally {
        toastr.clear(toast);
    }
}

function startUpload(id, mood) {
    pendingUpload = { id, mood: mood || null };
    const $f = $("#tirakit-dlg-file");
    $f.val("");
    $f.trigger("click");
}

// ===== bind =====
export function bindDialogueHandlers(onChange) {
    onChangeCb = typeof onChange === "function" ? onChange : () => {};

    $(document).on("change", "#tirakit-dlg-file", function () {
        handleFile(this.files?.[0]);
    });

    $(document).on("click", "#tirakit-dlg-root [data-dlg-act]", function () {
        const act = $(this).data("dlg-act");
        const id = String($(this).data("dlg-id") ?? "");
        const mood = $(this).data("dlg-mood") != null ? String($(this).data("dlg-mood")) : null;
        const ctx = ctxNow();

        if (act === "upload") return startUpload(id);
        if (act === "scan-files") return runScan();
        if (act === "delete-orphans") return deleteSelectedOrphans();
        if (act === "crop") return openCrop(id, mood);
        if (act === "more") {
            $(`[data-dlg-moods="${CSS.escape(id)}"]`).toggleClass("tirakit-hidden");
            return;
        }
        if (act === "upload-mood") {
            const name = String($(`[data-dlg-mood-input="${CSS.escape(id)}"]`).val() || "").trim();
            if (!name) { toastr.warning("ตั้งชื่ออารมณ์ก่อนอัปโหลด", "Tiramisu Kit"); return; }
            return startUpload(id, name);
        }
        if (act === "del-img") {
            let old = null;
            writeEntry(ctx, id, (e) => { old = e.img?.path || null; e.img = null; return e; });
            if (old) deleteImage(old);
            renderDialogueTab();
            return;
        }
        if (act === "del-mood" && mood) {
            let old = null;
            writeEntry(ctx, id, (e) => { old = e.moods?.[mood]?.path || null; if (e.moods) delete e.moods[mood]; return e; });
            if (old) deleteImage(old);
            renderDialogueTab();
            $(`[data-dlg-moods="${CSS.escape(id)}"]`).removeClass("tirakit-hidden");
            return;
        }
        if (act === "remove") {
            const roster = getRoster(ctx);
            const e = roster.entries[id];
            if (!e) return;
            if (!window.confirm(`ลบ "${e.name}" ออกจากรายชื่อ? (รูปที่อัปโหลดไว้จะถูกลบด้วย)`)) return;
            const paths = [e.img?.path, ...Object.values(e.moods || {}).map((m) => m?.path)].filter(Boolean);
            delete roster.entries[id];
            saveRoster(ctx, roster);
            paths.forEach(deleteImage);
            onChangeCb();
            renderDialogueTab();
            return;
        }
        if (act === "add") {
            const roster = getRoster(ctx);
            const newId = `npc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
            roster.entries[newId] = { id: newId, name: "NPC ใหม่", aliases: [], color: nextColor(roster, tone()), auto: false, img: null, moods: {} };
            saveRoster(ctx, roster);
            onChangeCb();
            renderDialogueTab();
            $(`[data-dlg-row="${CSS.escape(newId)}"] .tirakit-dlg-name-input`).trigger("focus").trigger("select");
            return;
        }
        if (act === "scan") {
            const n = autoAddSpeakers(ctx, (ctx.chat || []).map((m) => m?.mes || ""), tone());
            toastr.info(n ? `เพิ่มตัวละครใหม่ ${n} ตัว` : "ไม่พบชื่อใหม่ในแชทนี้", "Tiramisu Kit");
            onChangeCb();
            renderDialogueTab();
        }
    });

    $(document).on("change", "#tirakit-dlg-root .tirakit-dlg-orphan-check", function () {
        const o = scanResult?.orphans?.[Number($(this).data("dlg-orphan"))];
        if (o) o.checked = $(this).prop("checked");
    });

    $(document).on("change", "#tirakit-dlg-root .tirakit-dlg-color", function () {
        const id = String($(this).data("dlg-id"));
        const color = $(this).val();
        writeEntry(ctxNow(), id, (e) => { e.color = color; return e; });
        $(this).closest(".tirakit-dlg-row").find(".tirakit-dlg-thumb").first().css("--tirakit-c", color);
    });

    $(document).on("change", "#tirakit-dlg-root [data-dlg-field]", function () {
        const id = String($(this).data("dlg-id"));
        const field = $(this).data("dlg-field");
        const val = String($(this).val() || "");
        const ctx = ctxNow();
        if (field === "name") {
            const name = val.trim();
            if (!name) { renderDialogueTab(); return; }
            const roster = getRoster(ctx);
            const clash = Object.values(roster.entries).some((e) => e.id !== id && normName(e.name) === normName(name));
            if (clash) toastr.warning(`มีตัวละครชื่อ "${name}" อยู่แล้ว`, "Tiramisu Kit");
            writeEntry(ctx, id, (e) => { e.name = name; e.auto = false; return e; });
        } else if (field === "aliases") {
            const aliases = val.split(",").map((s) => s.trim()).filter(Boolean);
            writeEntry(ctx, id, (e) => { e.aliases = aliases; return e; });
            // เตือนถ้าชื่อเรียกอื่นไปซ้ำกับ NPC ที่มีอยู่ (มักเป็น NPC ที่ระบบเพิ่มอัตโนมัติจากชื่อเล่น)
            const dupes = Object.values(getRoster(ctx).entries)
                .filter((e) => e.id !== id && aliases.some((a) => normName(a) === normName(e.name)))
                .map((e) => e.name);
            if (dupes.length) toastr.info(`มี NPC ชื่อ ${dupes.join(", ")} อยู่แล้ว — ลบ NPC นั้นได้ถ้าเป็นคนเดียวกัน`, "Tiramisu Kit", { timeOut: 8000 });
        }
    });

    // ตัวครอป
    // ย้ายหน้าต่างครอปไปไว้ใต้ body — ถ้าอยู่ในแผงที่มี transform/overflow, position:fixed จะถูกจำกัดอยู่ในแผง
    $("#tirakit-dlg-crop").appendTo("body");
    // load ไม่ bubble — ผูกตรงกับ <img> (panel.html ถูกแทรกก่อน bind เสมอ)
    $("#tirakit-dlg-crop .tirakit-dlg-crop-img").on("load", layoutCrop);
    $(window).on("resize", () => { if (crop) layoutCrop(); });
    $(document).on("click", "#tirakit-dlg-crop [data-dlg-crop-kind]", function () {
        if (!crop) return;
        crop.kind = $(this).data("dlg-crop-kind");
        $("#tirakit-dlg-crop [data-dlg-crop-kind]").removeClass("tirakit-tab-active");
        $(this).addClass("tirakit-tab-active");
        layoutCrop();
    });
    $(document).on("input", "#tirakit-dlg-crop-size", function () { setCropSize(Number($(this).val())); });
    $(document).on("click", "#tirakit-dlg-crop-save", saveCrop);
    $(document).on("click", "#tirakit-dlg-crop-cancel", closeCrop);
    $(document).on("click", "#tirakit-dlg-crop-reset", function () {
        if (!crop?.natW) return;
        crop.rects[crop.kind] = defaultRect(crop.kind, crop.natW, crop.natH);
        layoutCrop();
    });

    $(document).on("pointerdown", "#tirakit-dlg-crop .tirakit-dlg-crop-rect", function (ev) {
        if (!crop?.natW) return;
        ev.preventDefault();
        this.setPointerCapture?.(ev.pointerId);
        const r = crop.rects[crop.kind];
        crop.drag = { sx: ev.clientX, sy: ev.clientY, ox: r.x, oy: r.y };
    });
    $(document).on("pointermove", "#tirakit-dlg-crop .tirakit-dlg-crop-rect", function (ev) {
        if (!crop?.drag) return;
        const el = $("#tirakit-dlg-crop .tirakit-dlg-crop-img").get(0);
        const r = crop.rects[crop.kind];
        r.x = crop.drag.ox + (ev.clientX - crop.drag.sx) / el.clientWidth;
        r.y = crop.drag.oy + (ev.clientY - crop.drag.sy) / el.clientHeight;
        clampRect(r);
        layoutCrop();
    });
    $(document).on("pointerup pointercancel", "#tirakit-dlg-crop .tirakit-dlg-crop-rect", function () {
        if (crop) crop.drag = null;
    });
}
