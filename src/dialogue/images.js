// ===== Tiramisu Kit — dialogue/images.js =====
// ย่อรูปในเบราว์เซอร์ก่อนอัปโหลด (ด้านยาวสุด MAX_SIDE px, WebP) แล้วเก็บเป็นไฟล์บนเซิร์ฟเวอร์ ST
// ผ่าน /api/images/upload (โฟลเดอร์ user/images/tiramisu-kit/) — ไม่เก็บ base64 ลง settings กันไฟล์ตั้งค่าบวม
// ลบด้วย /api/images/delete (ST ยอมลบเฉพาะไฟล์ในโฟลเดอร์รูปของผู้ใช้เท่านั้น)
//
// deps: ../store.js

import { extensionName } from "../store.js";

const MAX_SIDE = 512;
const QUALITY = 0.85;
const FOLDER = "tiramisu-kit";

function headers() {
    const ctx = SillyTavern.getContext();
    return typeof ctx.getRequestHeaders === "function" ? ctx.getRequestHeaders() : { "Content-Type": "application/json" };
}

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("อ่านไฟล์รูปไม่ได้")); };
        img.src = url;
    });
}

// คืน { base64, format, width, height, bytes }
export async function shrinkImage(file) {
    const img = await loadImage(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const g = canvas.getContext("2d");
    g.imageSmoothingQuality = "high";
    g.drawImage(img, 0, 0, w, h);
    let format = "webp";
    let dataUrl = canvas.toDataURL("image/webp", QUALITY);
    if (!dataUrl.startsWith("data:image/webp")) { // เบราว์เซอร์เก่าที่เข้ารหัส WebP ไม่ได้
        format = "jpg";
        dataUrl = canvas.toDataURL("image/jpeg", QUALITY);
    }
    const base64 = dataUrl.split(",")[1] || "";
    return { base64, format, width: w, height: h, bytes: Math.round(base64.length * 0.75) };
}

// คืน path ที่ใช้เป็น src ได้ทันที (เช่น "user/images/tiramisu-kit/dlg-xxx.webp")
export async function uploadImage(file) {
    const { base64, format, bytes } = await shrinkImage(file);
    const filename = `dlg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const res = await fetch("/api/images/upload", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ image: base64, format, ch_name: FOLDER, filename }),
    });
    if (!res.ok) throw new Error(`อัปโหลดไม่สำเร็จ (${res.status})`);
    const data = await res.json();
    if (!data?.path) throw new Error("เซิร์ฟเวอร์ไม่ส่ง path กลับมา");
    console.log(`[${extensionName}] อัปโหลดรูป ${data.path} (${Math.round(bytes / 1024)} KB)`);
    return String(data.path).replace(/\\/g, "/");
}

// ลบไฟล์บนเซิร์ฟเวอร์ — ไม่เจอไฟล์ (404) ถือว่าสำเร็จ
export async function deleteImage(path) {
    if (!path || !String(path).includes(`/${FOLDER}/`)) return; // ไม่ลบไฟล์ที่ extension ไม่ได้อัปโหลดเอง
    try {
        const res = await fetch("/api/images/delete", {
            method: "POST",
            headers: headers(),
            body: JSON.stringify({ path }),
        });
        if (!res.ok && res.status !== 404) console.warn(`[${extensionName}] ลบรูป ${path} ไม่สำเร็จ (${res.status})`);
    } catch (e) {
        console.warn(`[${extensionName}] ลบรูป ${path} ล้มเหลว:`, e);
    }
}
