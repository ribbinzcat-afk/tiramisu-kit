# 🍰 Tiramisu Kit

Extension สำหรับ **SillyTavern** ที่ยกฟีเจอร์เสริมของพรีเซ็ต **Tiramisu** (UI สำเร็จรูป, สีคำพูด, สุ่มเหตุการณ์, บันทึกสถานการณ์, Mini Theatre, Chain of Thought) ออกมาเป็นสวิตช์เปิด-ปิดเอง ใช้ข้ามพรีเซ็ตได้ พร้อมระบบ **"ชุด Toggle สำเร็จรูป"** ที่สลับกลุ่มสไตล์การเขียน (Pacing / Narrative Focus / Writing Voice ฯลฯ) ในหน้า Prompt Manager ได้ด้วยการกดปุ่มเดียว — ใช้ได้กับพรีเซ็ต Chat Completion ทุกตัว ไม่ใช่แค่ Tiramisu

> ออกแบบมาให้ใช้คู่กับพรีเซ็ต **Tiramisu (sfw/nc)** โดย Apricity แต่หลายฟีเจอร์ (UI Creation, Colorful Dialogue, RNG, Mini Theatre, ระบบชุด Toggle) ใช้กับพรีเซ็ตอื่นได้ปกติ

Tested กับ SillyTavern **1.18.0**

---

## ✨ ฟีเจอร์

### 6 กลุ่มโมดูล (เลือกเปิดได้อิสระ)

| กลุ่ม | รายละเอียด |
|---|---|
| 🎨 **UI Creation** | สั่งให้ AI สร้าง UI ในโลกเรื่อง (โปสเตอร์, ป้าย, หน้าจอ ฯลฯ) — เลือกได้ 1: Light / Dark / with JS (Light,Dark) / Custom Theme (กำหนดสีเอง) |
| 💬 **Dialogue** | AI ครอบบทพูดด้วย `<say name mood>` แล้ว extension แสดงเป็น **ข้อความสี** หรือ **UI** (ธีมแชทเมสเสจเจอร์ / วิชวลโนเวล / เรียบง่าย) — ตั้งสี อัปโหลด/ครอป/ลบรูปของ persona, ตัวละคร และ NPC ได้ในแท็บ "ตัวละคร" (ข้อมูลผูกกับการ์ด/persona) พร้อมรูปตามอารมณ์ |
| 🎲 **RNG Situation** | ทอย d100 สุ่มเหตุการณ์ดี/ร้ายตอนเปลี่ยนฉาก |
| 🍰 **Tiramisu's UI** | บันทึกสถานการณ์ (สถานที่/เวลา/อากาศ/ชุด/ความสัมพันธ์), กล่องความคิดตัวละคร (Char's Note), การ์ดสถานะ RPG, แชทไลฟ์สด (Livestream Chat) — แสดงผลเป็นกล่องสวยงาม (ต้องเปิดทีละอันได้) |
| 🎭 **Mini Theatre** | ฉากเสริมธีมทิรามิสุ: Art Direction (ฐาน) + Tiramisu Forum (คอมเมนต์ชาวเน็ต) / ABO (Omegaverse) / นักแสดงให้สัมภาษณ์ |
| 🧠 **CoT (Chain of Thought)** | ให้ AI วางแผนก่อนตอบจริงในกล่อง `<planning>` ที่พับเก็บได้ — ตั้งความลึกได้ (ซ่อนความคิดของข้อความเก่าจากทั้งจอและ prompt เมื่อเกินที่กำหนด) |

### 2 โหมดการเจน

- **ส่งรวมทีเดียว (single)** — ทุกโมดูลที่เปิดถูกแทรกไปกับ prompt คำตอบหลักเลย เจนครั้งเดียวจบ
- **เจนแยก (split)** — CoT เจนก่อนแยกต่างหาก (ส่งเป็นบริบทให้คำตอบหลัก) จากนั้น Mini Theatre / Tiramisu's UI เจนตามหลังอีกที โดยส่งคำตอบหลักไปเป็นบริบท — แต่ละส่วนเลือก **Connection Profile** แยกกันได้ (เผื่ออยากใช้โมเดลเล็ก/ถูกกว่าสำหรับงานเสริม) มีจุดบอกสถานะ "กำลังเจน..." ลอยมุมจอระหว่างทำงาน

### ⚡ ชุด Toggle สำเร็จรูป

หน้าตั้งค่าเดิมของ SillyTavern ต้องกดเปิด/ปิด prompt ทีละอันในกลุ่ม Style / Writing Voice / Narrative Focus / Pacing ฯลฯ — extension นี้รวมเป็น **"ชุด"** กดใช้ทีเดียวจบ:

- **12 ชุดสำเร็จรูป** ปรับแต่งมาสำหรับพรีเซ็ต Tiramisu โดยเฉพาะ (โรแมนติก, ดราม่า, แอคชั่น, สยองขวัญ, Slice of Life, แฟนตาซี, แชทเร็ว, Smut ฯลฯ) — ระบบตรวจอัตโนมัติว่ากำลังใช้พรีเซ็ตเวอร์ชัน **sfw** หรือ **nc** แล้วซ่อนชุดที่มีเนื้อหา NSFW ให้เองถ้าใช้เวอร์ชัน sfw
- **บันทึกชุดของตัวเอง** จากสถานะ toggle ปัจจุบัน ตั้งชื่อ+คำอธิบายเอง แก้ไข/เขียนทับ/ลบได้ทีหลัง — เตือนให้ทราบถ้าเอาไปใช้ข้ามพรีเซ็ตที่ต่างจากตอนบันทึก
- สลับสวิตช์ **Think Box** ของพรีเซ็ต (มี/ไม่มี) ได้จากที่เดียวกัน พร้อมเตือนถ้าเปิดซ้ำกับโมดูล CoT ของ extension เอง
- แตะเฉพาะกลุ่มสไตล์การเขียนเท่านั้น **ไม่แตะ** Character/Persona/World Info/Chat History หรือภาษาที่ตั้งไว้

> ต้องใช้ **API แบบ Chat Completion** เท่านั้น (Prompt Manager เป็นฟีเจอร์เฉพาะของ Chat Completion)

### อื่นๆ

- **แก้ prompt ได้ทุกโมดูล** (16 จุด) พร้อมปุ่มคืนค่าเริ่มต้น
- **นับโทเคน** ของทุกการเจนแยก แยกดูเป็นรายการได้ในแท็บ "โทเคน"
- ปุ่มเปิด/ปิดหลัก + ปุ่มลัดในเมนูไม้กายสิทธิ์ (🍰) ข้างช่องพิมพ์ — ปิดแล้วเงียบสนิท ไม่ inject อะไรค้าง ไม่ยิง API

---

## 📥 การติดตั้ง

1. **Extensions → Install Extension** วาง `https://github.com/ribbinzcat-afk/tiramisu-kit` → กด Load/Install
2. รีเฟรชหน้า (Ctrl+F5) แล้วกดไอคอนไม้กายสิทธิ์ข้างช่องพิมพ์ → **Tiramisu Kit**

หรือวางโฟลเดอร์เองที่ `SillyTavern/public/scripts/extensions/third-party/tiramisu-kit/`

> ⚠️ ชื่อโฟลเดอร์ต้องเป็น `tiramisu-kit` เท่านั้น

**ต้องมี:** SillyTavern ที่รองรับ `generate_interceptor`, `ConnectionManagerRequestService`, `generateRaw` (เวอร์ชันใหม่ๆ มีครบ) · ฟีเจอร์ชุด Toggle ต้องใช้ API แบบ Chat Completion

---

## 🎯 ใช้กับพรีเซ็ต Tiramisu

พรีเซ็ต Tiramisu มี prompt "☕ ⌗ ┆การตั้งค่า" อธิบายวิธีตั้งค่าคู่กับ extension นี้ไว้แล้ว สรุปสั้นๆ:

- ตั้งค่า Reasoning Formatting (หน้า A) — Prefix: `<planning>` / Suffix: `</planning>`
- ปิดข้อความ "Start Reply With" ให้ว่างไว้
- ฟีเจอร์ส่วนใหญ่ใช้ข้ามพรีเซ็ตได้ **ยกเว้น** ชุด Toggle สำเร็จรูปกับ CoT ที่ผูกกับตัวแปร/โครงสร้างเฉพาะของพรีเซ็ต Tiramisu

---

## 📁 โครงสร้างไฟล์

```
tiramisu-kit/
├── manifest.json
├── index.js              bootstrap — mount UI, ผูก event, delegate handler
├── settings.html         drawer ในหน้า Extensions
├── panel.html            แผงลอย 5 แท็บ
├── style.css
└── src/
    ├── store.js          settings + defaults
    ├── modules.js        ทะเบียนโมดูล 6 กลุ่ม
    ├── toggle-sets.js    ชุด Toggle สำเร็จรูป 12 ชุด
    ├── prompts.js        เนื้อหา prompt เริ่มต้นทุกโมดูล
    ├── api.js            เรียก AI + Connection Profile + นับโทเคน
    ├── inject.js          โหมด single: แทรก prompt
    ├── interceptor.js     โหมด split: เจน CoT ก่อน
    ├── post.js            โหมด split: เจน Theatre/Tiramisu's UI ตามหลัง
    ├── preset.js          อ่าน/แก้ Prompt Manager ของ ST (ชุด Toggle)
    ├── context.js
    ├── status.js         pill "กำลังเจน..."
    ├── dialogue/         โมดูล Dialogue: data (การ์ด/persona), render (ธีม), images (ย่อ+อัปโหลด), panel (แกลเลอรี+ครอป)
    └── render/           แปลงแท็กเป็นกล่อง HTML ในหน้าแชท
```

อยากแก้/เพิ่มโมดูล ดูคู่มือละเอียดที่ [`CLAUDE.md`](./CLAUDE.md)

---

## 💌 เครดิต

- พรีเซ็ต Tiramisu + Extension นี้ โดย **Apricity & Claude**

## 📜 License

[GNU Affero General Public License v3.0](./LICENSE) — ใช้/แก้/แจกต่อได้อิสระ แต่ถ้านำไปดัดแปลงแล้วเผยแพร่ต่อ (รวมถึงรันเป็นบริการออนไลน์) ต้องเปิดซอร์สโค้ดฉบับแก้ไขภายใต้ AGPL-3.0 เดียวกันด้วย
