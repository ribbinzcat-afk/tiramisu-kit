// ===== Tiramisu Kit — index.js =====
// bootstrap เท่านั้น — ฟีเจอร์จริงอยู่ใน src/*.js
// ยกฟีเจอร์เสริมของพรีเซ็ต Tiramisu (Preset/Ui and Extensions.md) ออกมาเป็น extension ที่เปิด-ปิดได้เอง
// เลือกได้ว่าจะส่ง prompt รวมทีเดียว (single) หรือเจนแยกหลายครั้ง (split: CoT ก่อน, Mini Theatre/Tiramisu's UI ตามหลัง)

import { getContext } from "../../../extensions.js";
import { extensionName, extensionFolderPath, getSettings, getSetting, setSetting } from "./src/store.js";
import { MODULE_GROUPS } from "./src/modules.js";
import { PROMPT_DEFS, validatePromptTemplate, getEffectiveDefault } from "./src/prompts.js";
import { listConnectionProfiles, lastCalls } from "./src/api.js";
import { applyInjections, clearAllInjections } from "./src/inject.js";
import { tiramisuKitInterceptor, takePendingCot } from "./src/interceptor.js";
import { runPostGeneration } from "./src/post.js";
import { sweepAllMessages, sweepOneMessage, clearRenderCache } from "./src/render/mount.js";
import { BUILTIN_SETS } from "./src/toggle-sets.js";
import {
    isPromptManagerAvailable, getCurrentPresetName, detectVariant,
    getManagedGroupDetails, applySet, snapshotCurrentPicks,
    getThinkBoxState, setThinkBoxState,
} from "./src/preset.js";

// ST เรียก generate_interceptor ผ่าน globalThis[key] ตามชื่อที่ประกาศใน manifest.json
globalThis.tiramisuKitInterceptor = tiramisuKitInterceptor;

// ===== ปุ่มไม้คทา =====
function mountWandButton() {
    if ($("#tirakit-wand-button").length) return;
    const btn = $(`
        <div id="tirakit-wand-button" class="list-group-item flex-container flexGap5 interactable" tabindex="0">
            <div class="fa-solid fa-mug-hot extensionsMenuExtensionButton"></div>
            <span>Tiramisu Kit</span>
        </div>`);
    btn.on("click", openPanel);
    $("#extensionsMenu").append(btn);
    updateWandButtonVisibility();
}
function updateWandButtonVisibility() {
    $("#tirakit-wand-button").toggle(Boolean(getSetting("enabled")));
}

// ===== แผงลอย =====
function openPanel() {
    if (!getSetting("enabled")) return;
    loadPanelUi();
    $("#tirakit-panel").removeClass("tirakit-hidden");
}
function closePanel() {
    $("#tirakit-panel").addClass("tirakit-hidden");
}
function switchPanelTab(tab) {
    $(".tirakit-tab").removeClass("tirakit-tab-active");
    $(`.tirakit-tab[data-tirakit-tab="${tab}"]`).addClass("tirakit-tab-active");
    $(".tirakit-tabpane").addClass("tirakit-hidden");
    $(`.tirakit-tabpane[data-tirakit-pane="${tab}"]`).removeClass("tirakit-hidden");
    if (tab === "tokens") renderTokenTab();
    if (tab === "toggles") renderToggleTab();
}

// เรียกตอนพรีเซ็ตเปลี่ยน — รีเฟรชแท็บ "ชุด Toggle" เฉพาะตอนเปิดแท็บนั้นค้างอยู่ (ไม่ทำงานเปล่าๆ ตอนไม่ได้ดู)
function refreshToggleTabIfVisible() {
    if (!$('.tirakit-tabpane[data-tirakit-pane="toggles"]').hasClass("tirakit-hidden")) {
        renderToggleTab();
    }
}

// เรียกตอนพรีเซ็ตเปลี่ยน — รีเฟรชแท็บ "แก้ Prompt" ถ้าเปิดค้างอยู่ (ค่าเริ่มต้นของ CoT ผูกกับเวอร์ชันพรีเซ็ต
// — สลับพรีเซ็ตแล้วค่าเริ่มต้นที่โชว์ต้องเปลี่ยนตาม ไม่กระทบ prompt ที่ผู้ใช้แก้เอง)
function refreshPromptTabIfVisible() {
    if (!$('.tirakit-tabpane[data-tirakit-pane="prompts"]').hasClass("tirakit-hidden")) {
        renderPromptList();
    }
}

// ===== ปิดสวิตช์หลักแล้วต้องเงียบสนิท =====
function shutdownEverything(ctx) {
    $("#tirakit-wand-button").hide();
    closePanel();
    clearAllInjections(ctx);
    clearRenderCache();
}

// ===== Connection Profile dropdown =====
function populateProfileSelect($sel, currentValue, includeDefaultOption) {
    const ctx = getContext();
    const profiles = listConnectionProfiles(ctx);
    let html = includeDefaultOption
        ? `<option value="">ใช้ API หลักของ SillyTavern</option>`
        : `<option value="">ตามค่าเริ่มต้นรวม</option>`;
    for (const p of profiles) {
        if (!p?.id) continue;
        html += `<option value="${escapeAttr(p.id)}">${escapeText(p.name || p.id)}</option>`;
    }
    $sel.html(html).val(currentValue || "");
}
function populateAllProfileSelects() {
    populateProfileSelect($("#tirakit-api-profile"), getSetting("apiProfile"), true);
    populateProfileSelect($("#tirakit-api-profile-cot"), getSetting("apiProfileCot"), false);
    populateProfileSelect($("#tirakit-api-profile-theatre"), getSetting("apiProfileTheatre"), false);
    populateProfileSelect($("#tirakit-api-profile-tiramisuui"), getSetting("apiProfileTiramisuUi"), false);
}

function escapeText(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
}
const escapeAttr = escapeText;

// ===== settings.html: โหลดค่าปัจจุบันเข้าจอ =====
function loadSettingsUi() {
    const s = getSettings();
    $("#tirakit-enabled").prop("checked", Boolean(s.enabled));
    $("#tirakit-genmode").val(s.genMode);
    populateAllProfileSelects();
}

// ===== panel.html: โหลดค่าปัจจุบันเข้าจอ =====
function loadPanelUi() {
    const s = getSettings();

    $("#tirakit-select-ui").val(s.selectedUi || "");
    $("#tirakit-ui-custom-text").val(s.uiCustomText || "");
    $("#tirakit-ui-custom-wrap").toggle(s.selectedUi === "custom");

    $("#tirakit-select-dialogue").val(s.selectedDialogue || "");

    $("#tirakit-toggle-rng").prop("checked", Boolean(s.rngEnabled));

    $(".tirakit-tui-toggle").each(function () {
        const id = $(this).data("tirakit-id");
        $(this).prop("checked", Boolean(s.tiramisuUi?.[id]));
    });

    $("#tirakit-theatre-base").prop("checked", Boolean(s.theatre?.artDirection));
    $(".tirakit-theatre-toggle").each(function () {
        const id = $(this).data("tirakit-id");
        $(this).prop("checked", Boolean(s.theatre?.[id]));
    });
    updateTheatreSubState();

    for (const group of MODULE_GROUPS) {
        const pos = s.injectPos[group.id] || { position: 1, depth: 1 };
        $(`.tirakit-pos-select[data-tirakit-group="${group.id}"]`).val(String(pos.position));
        $(`.tirakit-depth-input[data-tirakit-group="${group.id}"]`).val(pos.depth);
    }

    $("#tirakit-cot-enabled").prop("checked", Boolean(s.cotEnabled));
    $("#tirakit-cot-depth").val(s.cotDepth ?? 0);
    $("#tirakit-livechat-depth").val(s.livechatDepth ?? 2);
    $("#tirakit-cot-autoopen").prop("checked", Boolean(s.cotAutoOpen));
    $("#tirakit-cot-ctxmsgs").val(s.cotContextMessages ?? 6);

    renderPromptList();
    renderToggleTab();
}

function updateTheatreSubState() {
    const on = $("#tirakit-theatre-base").prop("checked");
    $(".tirakit-theatre-sub input").prop("disabled", !on);
    $(".tirakit-theatre-sub").css("opacity", on ? 1 : 0.5);
}

// ===== แท็บแก้ Prompt =====
function renderPromptList() {
    const s = getSettings();
    const variant = detectVariant(getCurrentPresetName(getContext()));
    const $list = $("#tirakit-prompt-list");
    let html = "";
    for (const [id, def] of Object.entries(PROMPT_DEFS)) {
        const stored = s.prompts?.[id];
        const value = typeof stored === "string" && stored ? stored : getEffectiveDefault(id, variant);
        const variantTag = def.variants && variant
            ? ` <small class="tirakit-prompt-variant-tag">(ค่าเริ่มต้นตามพรีเซ็ต: ${variant.toUpperCase()})</small>`
            : "";
        html += `
        <div class="inline-drawer tirakit-prompt-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <span><b>${escapeText(def.label)}</b>${variantTag}</span>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <textarea class="tirakit-prompt-textarea" data-tirakit-prompt-id="${id}" rows="6">${escapeText(value)}</textarea>
                <div class="tirakit-prompt-warn" data-tirakit-warn-id="${id}"></div>
                <button class="menu_button tirakit-prompt-reset" data-tirakit-reset-id="${id}">คืนค่าเริ่มต้น</button>
            </div>
        </div>`;
    }
    $list.html(html);
    for (const id of Object.keys(PROMPT_DEFS)) updatePromptWarning(id, $(`.tirakit-prompt-textarea[data-tirakit-prompt-id="${id}"]`).val());
}
function updatePromptWarning(id, text) {
    const res = validatePromptTemplate(id, text);
    const $warn = $(`.tirakit-prompt-warn[data-tirakit-warn-id="${id}"]`);
    if (res.ok) {
        $warn.text("").hide();
    } else {
        $warn.text(`⚠️ ขาด token ที่จำเป็น: ${res.missing.map((t) => `{{${t}}}`).join(", ")}`).show();
    }
}

// ===== แท็บชุด Toggle =====
function findSetByCard($card) {
    const id = $card.data("tirakit-set-id");
    const scope = $card.data("tirakit-set-scope");
    if (scope === "builtin") return BUILTIN_SETS.find((s) => s.id === id);
    return (getSetting("toggleSets") || []).find((s) => s.id === id);
}

// groupDetails = ผลจาก getManagedGroupDetails() หรือ null (ตอน Prompt Manager ไม่พร้อม — ไม่ฟันธงว่าตัวไหนหาย)
function pickMissing(group, name, groupDetails) {
    if (!groupDetails) return false;
    const members = groupDetails[group] || [];
    return !members.some((m) => m.name === name);
}

function renderSetCard(set, isMine, currentPresetName, groupDetails) {
    const mismatched = isMine && set.presetName && currentPresetName && set.presetName !== currentPresetName;
    const rows = Object.entries(set.picks || {}).map(([group, raw]) => {
        const names = Array.isArray(raw) ? raw : [raw];
        return names.map((name) => {
            const missing = pickMissing(group, name, groupDetails);
            return `<div class="tirakit-set-pick-row${missing ? " tirakit-set-pick-missing" : ""}"><span>${escapeText(group)}</span><span>${escapeText(name)}${missing ? " ⚠️ ไม่พบ" : ""}</span></div>`;
        }).join("");
    }).join("");

    return `
    <div class="tirakit-set-card${mismatched ? " tirakit-set-mismatch" : ""}" data-tirakit-set-id="${escapeAttr(set.id)}" data-tirakit-set-scope="${isMine ? "mine" : "builtin"}">
        <div class="tirakit-set-head">
            <div class="tirakit-set-headtext">
                <div class="tirakit-set-label">${escapeText(set.label)}</div>
                ${set.desc ? `<div class="tirakit-set-desc">${escapeText(set.desc)}</div>` : ""}
                ${isMine && set.presetName ? `<div class="tirakit-set-preset">จาก ${escapeText(set.presetName)}${mismatched ? " ⚠️ คนละพรีเซ็ตกับตอนนี้" : ""}</div>` : ""}
            </div>
            <div class="tirakit-set-actions">
                <button class="menu_button tirakit-btn-sm tirakit-set-detail-btn">รายละเอียด</button>
                <button class="menu_button tirakit-btn-sm tirakit-btn-primary tirakit-set-apply-btn">ใช้ชุดนี้</button>
                ${isMine ? `<button class="menu_button tirakit-btn-sm tirakit-set-edit-btn">แก้ไข</button><button class="menu_button tirakit-btn-sm tirakit-set-overwrite-btn">เขียนทับ</button><button class="menu_button tirakit-btn-sm tirakit-set-delete-btn">ลบ</button>` : ""}
            </div>
        </div>
        <div class="tirakit-set-detail tirakit-hidden">${rows}</div>
        ${isMine ? `
        <div class="tirakit-set-edit-form tirakit-hidden">
            <label class="tirakit-field">
                <span class="tirakit-field-label">ชื่อ</span>
                <input type="text" class="text_pole tirakit-set-edit-name" value="${escapeAttr(set.label)}" maxlength="60" />
            </label>
            <label class="tirakit-field">
                <span class="tirakit-field-label">คำอธิบาย</span>
                <textarea class="text_pole tirakit-set-edit-desc" rows="2">${escapeText(set.desc || "")}</textarea>
            </label>
            <div class="tirakit-set-actions">
                <button class="menu_button tirakit-btn-sm tirakit-btn-primary tirakit-set-edit-save-btn">บันทึก</button>
                <button class="menu_button tirakit-btn-sm tirakit-set-edit-cancel-btn">ยกเลิก</button>
            </div>
        </div>` : ""}
    </div>`;
}

function updateThinkBoxWarn() {
    const checked = $('input[name="tirakit-thinkbox"]:checked').val();
    const cotOn = Boolean(getSetting("cotEnabled"));
    $("#tirakit-thinkbox-warn").toggleClass("tirakit-hidden", !(checked === "with" && cotOn));
}

function renderToggleTab() {
    const ctx = getContext();
    const $info = $("#tirakit-toggle-preset-info");
    const $thinkSection = $("#tirakit-thinkbox-section");
    const $builtinList = $("#tirakit-toggle-builtin-list");
    const $mineList = $("#tirakit-toggle-mine-list");

    const available = isPromptManagerAvailable();
    const presetName = available ? getCurrentPresetName(ctx) : null;
    const variant = detectVariant(presetName);
    const variantLabel = variant === "nc" ? "NC" : variant === "sfw" ? "SFW" : null;
    const groupDetails = available ? getManagedGroupDetails() : null;

    if (!available) {
        $info.html(`<div class="tirakit-empty">ใช้ "ใช้ชุดนี้" ได้เฉพาะตอนใช้ API แบบ Chat Completion (Prompt Manager ไม่พร้อมใช้งานตอนนี้) — ยังดู/บันทึกชุดของตัวเองได้ปกติ</div>`);
    } else {
        $info.html(`
            <div><b>พรีเซ็ตปัจจุบัน:</b> ${escapeText(presetName || "(ไม่ทราบ)")}</div>
            ${variantLabel
                ? `<div class="tirakit-badge">เวอร์ชัน ${variantLabel}</div>`
                : `<div class="tirakit-hint-inline">ไม่ใช่พรีเซ็ต Tiramisu — ซ่อนชุดสำเร็จรูป เหลือเฉพาะชุดของคุณ</div>`}
        `);
    }

    const tb = available ? getThinkBoxState() : null;
    if (tb) {
        $thinkSection.removeClass("tirakit-hidden");
        $('input[name="tirakit-thinkbox"][value="with"]').prop("checked", tb.current === "with");
        $('input[name="tirakit-thinkbox"][value="without"]').prop("checked", tb.current === "without");
        updateThinkBoxWarn();
    } else {
        $thinkSection.addClass("tirakit-hidden");
    }

    const visibleBuiltins = variant ? BUILTIN_SETS.filter((s) => s.variant === "any" || s.variant === variant) : [];
    let builtinEmptyMsg = "ไม่มีชุดสำเร็จรูปที่แสดงได้ตอนนี้";
    if (!available) builtinEmptyMsg = "รอ Prompt Manager พร้อมใช้งาน (ต้องใช้ API แบบ Chat Completion)";
    else if (!variant) builtinEmptyMsg = "ใช้ได้เฉพาะพรีเซ็ต Tiramisu";
    $builtinList.html(visibleBuiltins.length
        ? visibleBuiltins.map((s) => renderSetCard(s, false, presetName, groupDetails)).join("")
        : `<div class="tirakit-empty">${builtinEmptyMsg}</div>`);

    const mine = getSetting("toggleSets") || [];
    $mineList.html(mine.length
        ? mine.map((s) => renderSetCard(s, true, presetName, groupDetails)).join("")
        : `<div class="tirakit-empty">ยังไม่มีชุดที่บันทึกไว้</div>`);
}

// ===== แท็บโทเคน =====
function renderTokenTab() {
    const $list = $("#tirakit-token-list");
    const entries = Object.entries(lastCalls);
    if (!entries.length) {
        $list.html(`<div class="tirakit-empty">ยังไม่มีการเจนแยกเกิดขึ้น</div>`);
        return;
    }
    let html = "";
    for (const [label, info] of entries) {
        const rows = Object.entries(info.breakdown || {}).map(([part, n]) => `<div class="tirakit-token-row"><span>${escapeText(part)}</span><span>${n}</span></div>`).join("");
        html += `
        <div class="tirakit-token-card">
            <div class="tirakit-token-head"><b>${escapeText(label)}</b><span>${info.total} โทเคน</span></div>
            ${rows}
        </div>`;
    }
    $list.html(html);
}

// ===== หลังคำตอบหลักมาถึง (โหมด split): แปะ CoT กลับเข้า mes + สั่งเจน Theatre/Tiramisu UI ตามหลัง =====
async function handleMessageReceived(ctx, mesId, type) {
    // 'first_message' = ข้อความทักทายเริ่มต้นตอนเปิดแชท ไม่ใช่การตอบกลับจริง — ไม่งั้นจะไปแย่งคิวกับการตอบจริง
    // ที่ตามมา (busyMesIds กันชนแค่ mesId เดียวกัน แต่ถ้าปล่อยให้เจนตามหลังของทักทายวิ่งอยู่เบื้องหลัง ผลลัพธ์
    // อาจมาถึงช้าแล้วไปแปะผิดที่ในสายตาโดยไม่มีใครสังเกตทัน) และ 'quiet' = การเจนเงียบของฟีเจอร์อื่น ไม่เกี่ยวกับเรา
    if (type === "first_message" || type === "quiet") return;

    const settings = getSettings();
    if (!settings.enabled || settings.genMode !== "split") return;

    const message = ctx.chat?.[mesId];
    if (!message || message.is_user || message.is_system) return;

    const pending = takePendingCot();
    if (pending && pending.text) {
        message.mes = `<planning>${pending.text}</planning>\n\n${message.mes}`;
        if (Array.isArray(message.swipes) && typeof message.swipe_id === "number" && message.swipes[message.swipe_id] !== undefined) {
            message.swipes[message.swipe_id] = message.mes;
        }
        if (typeof ctx.updateMessageBlock === "function") ctx.updateMessageBlock(mesId, message);
        if (typeof ctx.saveChat === "function") ctx.saveChat();
    }

    await runPostGeneration(ctx, mesId);
    sweepOneMessage(ctx, mesId);
}

// ===== ผูก event ของ ST =====
function bindChatEvents(ctx) {
    const { eventSource, eventTypes } = ctx;

    eventSource.on(eventTypes.CHAT_CHANGED, () => {
        clearRenderCache();
        applyInjections(ctx);
        sweepAllMessages(ctx);
    });

    const resweepEvents = [
        eventTypes.CHARACTER_MESSAGE_RENDERED,
        eventTypes.USER_MESSAGE_RENDERED,
        eventTypes.MORE_MESSAGES_LOADED,
        eventTypes.MESSAGE_DELETED,
    ];
    for (const evt of resweepEvents) {
        if (!evt) continue;
        eventSource.on(evt, () => sweepAllMessages(ctx));
    }

    const oneMessageEvents = [eventTypes.MESSAGE_UPDATED, eventTypes.MESSAGE_SWIPED];
    for (const evt of oneMessageEvents) {
        if (!evt) continue;
        eventSource.on(evt, (mesId) => sweepOneMessage(ctx, mesId));
    }

    eventSource.on(eventTypes.MESSAGE_RECEIVED, (mesId, type) => {
        handleMessageReceived(ctx, mesId, type).catch((e) => console.error(`[${extensionName}] handleMessageReceived ล้มเหลว:`, e));
    });

    // พรีเซ็ต Chat Completion เปลี่ยน (สลับพรีเซ็ต/นำเข้าใหม่) — รีเฟรชแท็บ "ชุด Toggle"/"แก้ Prompt" ถ้าเปิด
    // ค้างอยู่ + แทรก prompt โหมด single ใหม่ (ค่าเริ่มต้นของ CoT ผูกกับเวอร์ชันพรีเซ็ต ต้องอัปเดตทันทีที่สลับ)
    const presetChangeEvents = [eventTypes.OAI_PRESET_CHANGED_AFTER, eventTypes.PRESET_CHANGED];
    for (const evt of presetChangeEvents) {
        if (!evt) continue;
        eventSource.on(evt, () => {
            applyInjections(ctx);
            refreshToggleTabIfVisible();
            refreshPromptTabIfVisible();
        });
    }
}

// ===== handler ของ settings.html / panel.html (delegated ทั้งหมด) =====
function bindUiHandlers() {
    $(document).on("click", "#tirakit-open-panel", openPanel);
    $(document).on("click", "#tirakit-panel-close", closePanel);
    $(document).on("click", ".tirakit-tab", function () { switchPanelTab($(this).data("tirakit-tab")); });

    $(document).on("change", "#tirakit-enabled", function () {
        const ctx = getContext();
        setSetting("enabled", $(this).prop("checked"));
        updateWandButtonVisibility();
        if (!getSetting("enabled")) {
            shutdownEverything(ctx);
        } else {
            applyInjections(ctx);
            sweepAllMessages(ctx);
        }
    });

    $(document).on("change", "#tirakit-genmode", function () {
        setSetting("genMode", $(this).val());
        applyInjections(getContext());
    });

    $(document).on("change", "#tirakit-api-profile", function () { setSetting("apiProfile", $(this).val()); });
    $(document).on("change", "#tirakit-api-profile-cot", function () { setSetting("apiProfileCot", $(this).val()); });
    $(document).on("change", "#tirakit-api-profile-theatre", function () { setSetting("apiProfileTheatre", $(this).val()); });
    $(document).on("change", "#tirakit-api-profile-tiramisuui", function () { setSetting("apiProfileTiramisuUi", $(this).val()); });

    // ===== โมดูล =====
    $(document).on("change", "#tirakit-select-ui", function () {
        setSetting("selectedUi", $(this).val());
        $("#tirakit-ui-custom-wrap").toggle($(this).val() === "custom");
        applyInjections(getContext());
        sweepAllMessages(getContext());
    });
    $(document).on("change", "#tirakit-ui-custom-text", function () {
        setSetting("uiCustomText", $(this).val());
        applyInjections(getContext());
    });
    $(document).on("change", "#tirakit-select-dialogue", function () {
        setSetting("selectedDialogue", $(this).val());
        applyInjections(getContext());
    });
    $(document).on("change", "#tirakit-toggle-rng", function () {
        setSetting("rngEnabled", $(this).prop("checked"));
        applyInjections(getContext());
    });
    $(document).on("change", ".tirakit-tui-toggle", function () {
        const s = getSettings();
        s.tiramisuUi[$(this).data("tirakit-id")] = $(this).prop("checked");
        setSetting("tiramisuUi", s.tiramisuUi);
        applyInjections(getContext());
        sweepAllMessages(getContext());
    });
    $(document).on("change", "#tirakit-theatre-base", function () {
        const s = getSettings();
        s.theatre.artDirection = $(this).prop("checked");
        setSetting("theatre", s.theatre);
        updateTheatreSubState();
        applyInjections(getContext());
        sweepAllMessages(getContext());
    });
    $(document).on("change", ".tirakit-theatre-toggle", function () {
        const s = getSettings();
        s.theatre[$(this).data("tirakit-id")] = $(this).prop("checked");
        setSetting("theatre", s.theatre);
        applyInjections(getContext());
        sweepAllMessages(getContext());
    });
    $(document).on("change", ".tirakit-pos-select", function () {
        const s = getSettings();
        const group = $(this).data("tirakit-group");
        s.injectPos[group] = s.injectPos[group] || { position: 1, depth: 1 };
        s.injectPos[group].position = Number($(this).val());
        setSetting("injectPos", s.injectPos);
        applyInjections(getContext());
    });
    $(document).on("change", ".tirakit-depth-input", function () {
        const s = getSettings();
        const group = $(this).data("tirakit-group");
        s.injectPos[group] = s.injectPos[group] || { position: 1, depth: 1 };
        s.injectPos[group].depth = Math.max(0, Number($(this).val()) || 0);
        setSetting("injectPos", s.injectPos);
        applyInjections(getContext());
    });

    // ===== CoT =====
    $(document).on("change", "#tirakit-cot-enabled", function () {
        setSetting("cotEnabled", $(this).prop("checked"));
        applyInjections(getContext());
        sweepAllMessages(getContext());
    });
    $(document).on("change", "#tirakit-livechat-depth", function () {
        setSetting("livechatDepth", Math.max(0, Number($(this).val()) || 0));
    });
    $(document).on("change", "#tirakit-cot-depth", function () {
        setSetting("cotDepth", Math.max(0, Number($(this).val()) || 0));
        sweepAllMessages(getContext());
    });
    $(document).on("change", "#tirakit-cot-autoopen", function () {
        setSetting("cotAutoOpen", $(this).prop("checked"));
        sweepAllMessages(getContext());
    });
    $(document).on("change", "#tirakit-cot-ctxmsgs", function () {
        setSetting("cotContextMessages", Math.max(1, Number($(this).val()) || 6));
    });

    // ===== แก้ Prompt =====
    $(document).on("input", ".tirakit-prompt-textarea", function () {
        const id = $(this).data("tirakit-prompt-id");
        const val = $(this).val();
        updatePromptWarning(id, val);
        const s = getSettings();
        s.prompts[id] = val;
        setSetting("prompts", s.prompts);
        applyInjections(getContext());
    });
    $(document).on("click", ".tirakit-prompt-reset", function () {
        const id = $(this).data("tirakit-reset-id");
        const s = getSettings();
        delete s.prompts[id];
        setSetting("prompts", s.prompts);
        const variant = detectVariant(getCurrentPresetName(getContext()));
        const def = getEffectiveDefault(id, variant);
        $(`.tirakit-prompt-textarea[data-tirakit-prompt-id="${id}"]`).val(def);
        updatePromptWarning(id, def);
        applyInjections(getContext());
        toastr.success("คืนค่าเริ่มต้นแล้ว", "Tiramisu Kit");
    });

    // ===== ชุด Toggle =====
    $(document).on("click", ".tirakit-set-detail-btn", function () {
        $(this).closest(".tirakit-set-card").find(".tirakit-set-detail").toggleClass("tirakit-hidden");
    });

    $(document).on("click", ".tirakit-set-apply-btn", function () {
        const $card = $(this).closest(".tirakit-set-card");
        const set = findSetByCard($card);
        if (!set) return;
        if ($card.hasClass("tirakit-set-mismatch")) {
            const ok = confirm(`ชุด "${set.label}" บันทึกไว้จากพรีเซ็ต "${set.presetName}" ซึ่งไม่ตรงกับพรีเซ็ตปัจจุบัน ต้องการใช้ต่อไหม?`);
            if (!ok) return;
        }
        const res = applySet(set);
        if (!res.ok) {
            toastr.error(
                res.reason === "no-prompt-manager" ? "ใช้ได้เฉพาะ API แบบ Chat Completion" : "ใช้ชุดนี้ไม่สำเร็จ (ดู console)",
                "Tiramisu Kit",
            );
            return;
        }
        let msg = `เปิด ${res.turnedOn} · ปิด ${res.turnedOff}`;
        if (res.skipped.length) msg += ` · ข้าม ${res.skipped.length} (ไม่พบในพรีเซ็ตนี้)`;
        toastr.success(msg, `ใช้ชุด "${set.label}" แล้ว`);
    });

    $(document).on("click", ".tirakit-set-edit-btn", function () {
        $(this).closest(".tirakit-set-card").find(".tirakit-set-edit-form").toggleClass("tirakit-hidden");
    });
    $(document).on("click", ".tirakit-set-edit-cancel-btn", function () {
        $(this).closest(".tirakit-set-card").find(".tirakit-set-edit-form").addClass("tirakit-hidden");
    });
    $(document).on("click", ".tirakit-set-edit-save-btn", function () {
        const $card = $(this).closest(".tirakit-set-card");
        const set = findSetByCard($card);
        if (!set) return;
        const label = $card.find(".tirakit-set-edit-name").val().trim();
        const desc = $card.find(".tirakit-set-edit-desc").val().trim();
        if (!label) {
            toastr.warning("ชื่อชุดห้ามว่าง", "Tiramisu Kit");
            return;
        }
        const s = getSettings();
        const idx = s.toggleSets.findIndex((x) => x.id === set.id);
        if (idx === -1) return;
        s.toggleSets[idx] = { ...s.toggleSets[idx], label, desc };
        setSetting("toggleSets", s.toggleSets);
        renderToggleTab();
        toastr.success("แก้ไขชุดแล้ว", "Tiramisu Kit");
    });

    $(document).on("click", ".tirakit-set-overwrite-btn", function () {
        const $card = $(this).closest(".tirakit-set-card");
        const set = findSetByCard($card);
        if (!set) return;
        if (!confirm(`เขียนทับชุด "${set.label}" ด้วยสถานะ toggle ปัจจุบันหรือไม่?`)) return;
        const picks = snapshotCurrentPicks();
        if (!Object.keys(picks).length) {
            toastr.warning("ยังไม่มีตัวเลือกในกลุ่มสไตล์ที่เปิดอยู่เลย — ไม่ได้เขียนทับ", "Tiramisu Kit");
            return;
        }
        const s = getSettings();
        const idx = s.toggleSets.findIndex((x) => x.id === set.id);
        if (idx === -1) return;
        s.toggleSets[idx] = { ...s.toggleSets[idx], picks, presetName: getCurrentPresetName(getContext()) || s.toggleSets[idx].presetName };
        setSetting("toggleSets", s.toggleSets);
        renderToggleTab();
        toastr.success(`เขียนทับชุด "${set.label}" แล้ว`, "Tiramisu Kit");
    });

    $(document).on("click", ".tirakit-set-delete-btn", function () {
        const $card = $(this).closest(".tirakit-set-card");
        const set = findSetByCard($card);
        if (!set) return;
        if (!confirm(`ลบชุด "${set.label}" ?`)) return;
        const s = getSettings();
        s.toggleSets = s.toggleSets.filter((x) => x.id !== set.id);
        setSetting("toggleSets", s.toggleSets);
        renderToggleTab();
    });

    $(document).on("click", "#tirakit-toggle-save-new", function () {
        if ($("#tirakit-toggle-newset-form").length) return;
        $(this).before(`
            <div id="tirakit-toggle-newset-form" class="tirakit-inline-form">
                <input type="text" id="tirakit-toggle-newset-name" class="text_pole" placeholder="ตั้งชื่อชุด" maxlength="60" />
                <button class="menu_button tirakit-btn-sm" id="tirakit-toggle-newset-confirm">บันทึก</button>
                <button class="menu_button tirakit-btn-sm" id="tirakit-toggle-newset-cancel">ยกเลิก</button>
            </div>`);
        $("#tirakit-toggle-newset-name").trigger("focus");
    });
    $(document).on("click", "#tirakit-toggle-newset-cancel", function () {
        $("#tirakit-toggle-newset-form").remove();
    });
    $(document).on("click", "#tirakit-toggle-newset-confirm", function () {
        const label = $("#tirakit-toggle-newset-name").val().trim();
        if (!label) {
            toastr.warning("ใส่ชื่อชุดก่อน", "Tiramisu Kit");
            return;
        }
        const picks = snapshotCurrentPicks();
        if (!Object.keys(picks).length) {
            toastr.warning("ยังไม่มีตัวเลือกในกลุ่มสไตล์ที่เปิดอยู่เลย", "Tiramisu Kit");
            return;
        }
        const s = getSettings();
        s.toggleSets.push({
            id: `mine-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            label,
            desc: "",
            builtin: false,
            presetName: getCurrentPresetName(getContext()) || null,
            picks,
        });
        setSetting("toggleSets", s.toggleSets);
        $("#tirakit-toggle-newset-form").remove();
        renderToggleTab();
        toastr.success(`บันทึกชุด "${label}" แล้ว`, "Tiramisu Kit");
    });

    $(document).on("change", 'input[name="tirakit-thinkbox"]', function () {
        const target = $(this).val();
        const res = setThinkBoxState(target);
        if (!res.ok) {
            toastr.error("สลับ Think Box ไม่สำเร็จ", "Tiramisu Kit");
            return;
        }
        updateThinkBoxWarn();
        toastr.success(target === "with" ? "เปิด Think Box แล้ว" : "ปิด Think Box แล้ว", "Tiramisu Kit");
    });

    // ===== โทเคน =====
    $(document).on("click", "#tirakit-refresh-tokens", renderTokenTab);
}

jQuery(async () => {
    console.log(`[${extensionName}] กำลังโหลด...`);
    try {
        getSettings();
        $("#extensions_settings2").append(await $.get(`${extensionFolderPath}/settings.html`));
        $("body").append(await $.get(`${extensionFolderPath}/panel.html`));

        bindUiHandlers();
        loadSettingsUi();
        mountWandButton();

        const ctx = getContext();
        bindChatEvents(ctx);
        applyInjections(ctx);
        sweepAllMessages(ctx);

        console.log(`[${extensionName}] ✅ โหลดสำเร็จ`);
    } catch (error) {
        console.error(`[${extensionName}] ❌ โหลดไม่สำเร็จ:`, error);
        toastr.error("โหลดไม่สำเร็จ (ดู console)", "Tiramisu Kit");
    }
});
