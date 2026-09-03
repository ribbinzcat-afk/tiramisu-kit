// ===== Tiramisu Kit — index.js =====
// bootstrap เท่านั้น — ฟีเจอร์จริงอยู่ใน src/*.js
// ยกฟีเจอร์เสริมของพรีเซ็ต Tiramisu (Preset/Ui and Extensions.md) ออกมาเป็น extension ที่เปิด-ปิดได้เอง
// เลือกได้ว่าจะส่ง prompt รวมทีเดียว (single) หรือเจนแยกหลายครั้ง (split: CoT ก่อน, Mini Theatre/Tiramisu's UI ตามหลัง)

import { getContext } from "../../../extensions.js";
import { extensionName, extensionFolderPath, getSettings, getSetting, setSetting } from "./src/store.js";
import { MODULE_GROUPS } from "./src/modules.js";
import { PROMPT_DEFS, validatePromptTemplate } from "./src/prompts.js";
import { listConnectionProfiles, lastCalls } from "./src/api.js";
import { applyInjections, clearAllInjections } from "./src/inject.js";
import { tiramisuKitInterceptor, takePendingCot } from "./src/interceptor.js";
import { runPostGeneration } from "./src/post.js";
import { sweepAllMessages, sweepOneMessage, clearRenderCache } from "./src/render/mount.js";

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
    $("#tirakit-cot-autoopen").prop("checked", Boolean(s.cotAutoOpen));
    $("#tirakit-cot-ctxmsgs").val(s.cotContextMessages ?? 6);

    renderPromptList();
}

function updateTheatreSubState() {
    const on = $("#tirakit-theatre-base").prop("checked");
    $(".tirakit-theatre-sub input").prop("disabled", !on);
    $(".tirakit-theatre-sub").css("opacity", on ? 1 : 0.5);
}

// ===== แท็บแก้ Prompt =====
function renderPromptList() {
    const s = getSettings();
    const $list = $("#tirakit-prompt-list");
    let html = "";
    for (const [id, def] of Object.entries(PROMPT_DEFS)) {
        const stored = s.prompts?.[id];
        const value = typeof stored === "string" && stored ? stored : def.default;
        html += `
        <div class="inline-drawer tirakit-prompt-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>${escapeText(def.label)}</b>
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
async function handleMessageReceived(ctx, mesId) {
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

    eventSource.on(eventTypes.MESSAGE_RECEIVED, (mesId) => {
        handleMessageReceived(ctx, mesId).catch((e) => console.error(`[${extensionName}] handleMessageReceived ล้มเหลว:`, e));
    });
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
        $(`.tirakit-prompt-textarea[data-tirakit-prompt-id="${id}"]`).val(PROMPT_DEFS[id].default);
        updatePromptWarning(id, PROMPT_DEFS[id].default);
        applyInjections(getContext());
        toastr.success("คืนค่าเริ่มต้นแล้ว", "Tiramisu Kit");
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
