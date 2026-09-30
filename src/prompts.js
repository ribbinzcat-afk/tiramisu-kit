// ===== Tiramisu Kit — prompts.js =====
// PROMPT_DEFS: ค่าเริ่มต้นของ prompt ทุกก้อน (ยกมาจาก Preset/Tiramisu (nc) beta 0.8.json เวอร์ชันล่าสุด)
// {{token}} ในไฟล์นี้เป็นระบบของ extension เอง (แทนที่ด้วย buildPrompt ก่อนส่ง) — คนละอันกับ macro ของ ST
// เช่น {{char}} {{user}} {{getvar::x}} {{roll:d100}} ปล่อยผ่านไปให้ ST แทนที่เองทีหลังด้วย ctx.substituteParams()
// deps: 0 — ห้าม import จากไฟล์อื่นในโปรเจกต์นี้

export const PROMPT_DEFS = {
    uiLight: {
        label: "UI Creation - Light Mode",
        tokens: [],
        default: `# UI Creation - Light mode

<ui_creation>
When the user ask you to create a UI, a textbox, or any HTML/CSS,to represents in-world objects, You'll generate beautiful inline CSS (<div style="...;">) that represents in-world objects (screens, posters, books, signs, letters, logos, insignias, crests, plaques, seals, medallions, coins, labels, etc.). 

Design Principles:
* these custom styles won't be limited to generic system windows. You have free reign to add things such as animations, 3D renderings, pop outs, hover overs, drop downs, and scrolling menus.
* exclude jarring elements that don't suit the narrative. Formatted to fit  the user's phone screen
* use a light theme color scheme. limit the palette at 3-4 colors, choosing either monochromatic or complementary schemes. No jarring shades—only soft, muted tones.
* use Dark/Colorful/Muted text and border on Light/Transparent backgrounds. Choose a color that stands out from the background.
* only using font from google fonts. Include a fallback font that supports Thai (in case the primary font doesn't).
* Using "font awesome" free tier icon
* Don't alter the standard font size or line-height, keeping the text clean and comfortable to read.
{{setvar::uicreation::light}}
</ui_creation>`,
    },
    uiDark: {
        label: "UI Creation - Dark Mode",
        tokens: [],
        default: `# UI Creation - Dark mode

<ui_creation>
When the user ask you to create a UI, a textbox, or any HTML/CSS,to represents in-world objects, You'll generate beautiful inline CSS (<div style="...;">) that represents in-world objects (screens, posters, books, signs, letters, logos, insignias, crests, plaques, seals, medallions, coins, labels, etc.). 

Design Principles:
* these custom styles won't be limited to generic system windows. You have free reign to add things such as animations, 3D renderings, pop outs, hover overs, drop downs, and scrolling menus.
* exclude jarring elements that don't suit the narrative. Formatted to fit  the user's phone screen
* use a dark theme color scheme. limit the palette at 3-4 colors, choosing either monochromatic or complementary schemes.
* use Light/Neon/Pastel text and border on Dark/Transparent backgrounds. Choose a color that stands out from the background.
* only using font from google fonts. Include a fallback font that supports Thai (in case the primary font doesn't).
* Using "font awesome" free tier icon
* Don't alter the standard font size or line-height, keeping the text clean and comfortable to read.
{{setvar::uicreation::dark}}
</ui_creation>`,
    },
    uiJsLight: {
        label: "UI Creation with JS - Light",
        tokens: [],
        default: `# UI Creation with JS - Light

<ui_creation>
When the user ask you to create a UI, a textbox, or any HTML/CSS,to represents in-world objects, You'll generate beautiful interactive HTML/CSS + js script that represents in-world objects (screens, posters, books, signs, letters, logos, insignias, crests, plaques, seals, medallions, coins, labels, etc.). Put all of them inside the code block (\`\`\`).

Design Principles:
* Always including some script or animation to make the element interactive or clickable.
* these custom styles won't be limited to generic system windows. You have free reign to add things such as animations, 3D renderings, pop outs, hover overs, drop downs, and scrolling menus.
* exclude jarring elements that don't suit the narrative. Formatted to fit  the user's phone screen
* use a light theme color scheme. limit the palette at 3-4 colors, choosing either monochromatic or complementary schemes. No jarring shades—only soft, muted tones.
* use Dark/Colorful/Muted text and border on Light/Transparent backgrounds. Choose a color that stands out from the background.
* only using font from google fonts. Include a fallback font that supports Thai (in case the primary font doesn't).
* Using "font awesome" free tier icon
* Don't alter the standard font size or line-height, keeping the text clean and comfortable to read.
{{setvar::uicreation::lightjs}}
</ui_creation>`,
    },
    uiJsDark: {
        label: "UI Creation with JS - Dark",
        tokens: [],
        default: `# UI Creation with JS - Dark

<ui_creation>
When the user ask you to create a UI, a textbox, or any HTML/CSS,to represents in-world objects, You'll generate beautiful interactive HTML/CSS + js script that represents in-world objects (screens, posters, books, signs, letters, logos, insignias, crests, plaques, seals, medallions, coins, labels, etc.). Put all of them inside the code block (\`\`\`).

Design Principles:
* Always including some script or animation to make the element interactive or clickable.
* these custom styles won't be limited to generic system windows. You have free reign to add things such as animations, 3D renderings, pop outs, hover overs, drop downs, and scrolling menus.
* exclude jarring elements that don't suit the narrative. Formatted to fit  the user's phone screen
* use a dark theme color scheme. limit the palette at 3-4 colors, choosing either monochromatic or complementary schemes.
* use Light/Neon/Pastel text and border on Dark/Transparent backgrounds. Choose a color that stands out from the background.
* only using font from google fonts. Include a fallback font that supports Thai (in case the primary font doesn't).
* Using "font awesome" free tier icon
* Don't alter the standard font size or line-height, keeping the text clean and comfortable to read.
{{setvar::uicreation::darkjs}}
</ui_creation>`,
    },
    uiCustom: {
        label: "UI Creation - Custom Theme",
        tokens: ["custom"],
        default: `# UI Creation - Custom Theme

<ui_creation>
When the user ask you to create a UI, a textbox, or any HTML/CSS, You'll generate beautiful inline CSS (<div style="...;">) that represents in-world objects (screens, posters, books, signs, letters, logos, insignias, crests, plaques, seals, medallions, coins, labels, etc.). 

Main Color, Element, Styles of the UI:
{{custom}}

Additional Principles:
* these custom styles won't be limited to generic system windows. You have free reign to add things such as animations, 3D renderings, pop outs, hover overs, drop downs, and scrolling menus.
* exclude jarring elements that don't suit the narrative. Formatted to fit  the user's phone screen
* limit the palette at 3-4 colors, choosing either monochromatic or complementary schemes.
* use Light text and border on Dark backgrounds. use Dark text and border on Light backgrounds. Choose a color that stands out from the background.
* No jarring shades—only soft, muted tones. (neon, cyberpunk theme is the exception)
* only using font from google fonts. Include a fallback font that supports Thai (in case the primary font doesn't).
* Using "font awesome" free tier icon
* Don't alter the standard font size or line-height, keeping the text clean and comfortable to read.
{{setvar::uicreation::custom}}
</ui_creation>`,
    },
    dialogue: {
        label: "Dialogue (ข้อความสี / UI)",
        tokens: [],
        default: `# Dialogue Tags
- ครอบบทพูดทุกช่วงของ {{char}} และ NPC ด้วยแท็กนี้ทุกครั้ง: <say name="ชื่อตัวละคร" mood="อารมณ์">"บทพูด"</say>
- name: ชื่อเดิมของตัวละครนั้นทุกครั้ง (ชื่อเดียว ไม่สลับไปมาระหว่างชื่อเล่น) NPC ที่ยังไม่มีชื่อให้ใช้คำเรียกที่ชัดเจนและคงที่ เช่น "คนขายขนม"
- mood: อารมณ์ของบทพูดนั้น 1 คำสั้น ๆ ในภาษาเดียวกับคำตอบ (เว้นได้ถ้าไม่ชัด)
- หนึ่งแท็กต่อหนึ่งช่วงบทพูด วางแท็กในบรรทัดของตัวเอง ไม่ปนกับคำบรรยาย
- คำบรรยาย การกระทำ และความคิด อยู่นอกแท็กเสมอ
- ห้ามเขียนบทพูดของ {{user}}
{{moods}}`,
    },
    rng: {
        label: "RNG Situation",
        tokens: [],
        default: `# RNG Situation
- ทอยลูกเต๋า 1 d100 แล้วเทียบผลตัวเลขเพื่อ initiate สถานการณ์ในโรลเพลย์ ใช้เมื่อเปลี่ยนฉากไปเหตุการณ์ถัดไป (ไม่ใช้หากยังดำเนินฉากเดิมอยู่) เพื่อเสริมเรื่องราวให้ดีขึ้นหรือแย่ลงด้วยโชค
- ผลต่ำ (<50): สถานการณ์เชิงลบ ยิ่งใกล้ 1 ยิ่งย่ำแย่
- ผลสูง (>50): สถานการณ์เชิงบวก
- ผลลูกเต๋าที่ทอยได้ (ใช้ค่านี้ในการเทียบ ไม่ใช่ placeholder): [{{roll:d100}}]`,
    },
    log: {
        label: "Tiramisu's Log",
        tokens: [],
        default: `# Tiramisu's Log
- บันทึกสถานการณ์ในโรลเพลย์ทุกครั้งที่ส่วน header ของการตอบกลับ
- รูปแบบ (ต้องมีแท็กทุกครั้ง): \`<tiramisu_log>{{สถานที่}}|{{hh:mm น.}}|{{สภาพอากาศ}}|{{ชุดที่ตัวละครใส่}}|{{สถานะความสัมพันธ์}}|{{ค่าความสัมพันธ์}}</tiramisu_log>\`
- เขียนคำตอบสั้น ๆ
- ชุดที่ตัวละครใส่: ชุดของ {{char}} ใช้ลูกน้ำ (,) คั่นถ้ามีหลายชิ้น
- สถานะความสัมพันธ์: นิยามตามคาแรกเตอร์ของ {{char}} ไม่เกิน 1-3 ประโยค
- ค่าความสัมพันธ์: ค่าความรักของ {{char}} ต่อ {{user}} ช่วง 0-100 ตอบเป็นตัวเลขเท่านั้น (20=เพื่อน, 40=เพื่อนสนิท, 50=เริ่มมีใจ, 70=คู่รัก, 100=พร้อมขอแต่งงาน ปลดล็อกฉากแต่งงาน)`,
    },
    charNote: {
        label: "Char's Note",
        tokens: [],
        default: `# Char's Note
- เพิ่มกล่องความคิดของตัวละครไว้ท้ายสุดของทุกการตอบกลับ (ก่อน footer หรือแทน footer ถ้าไม่มีอย่างอื่นต่อ)
- ใช้รูปแบบ (ต้องมีแท็กทุกครั้ง): \`<char_note>{{ความคิดของตัวละคร}}</char_note>\`
- ความคิดของตัวละคร: คำพูดในหัวของตัวละครที่มีต่อ {{user}}/สถานการณ์/event ในการตอบกลับปัจจุบัน เขียนในเครื่องหมายคำพูด (") เหมือนตัวละครกำลังพูดกับตัวเอง`,
    },
    rpgStatus: {
        label: "RPG Status",
        tokens: [],
        default: `# RPG Status
- บันทึกค่าสถานะสไตล์ RPG ของ {{user}} เป็น footer ปิดจบทุกการตอบกลับ
- รูปแบบ (ต้องมีแท็กทุกครั้ง): \`<rpg_status>{{user}}|{{Class}}|{{HP}}|{{MP}}|{{STR}}|{{INT}}|{{AGI}}|{{LUCK}}|{{CHARM}}</rpg_status>\`
- Class: อาชีพของ {{user}} เขียนสั้น ๆ พร้อมอีโมจิ เช่น ✨ Tiramisu Maker ✨
- HP, MP: ช่วง 0-100 ตอบเป็นตัวเลขเท่านั้น
- ทุกค่าสถานะต้องตอบเป็นตัวเลขเท่านั้น`,
    },
    livechat: {
        label: "Livestream Chat",
        tokens: [],
        default: `# Livestream Chat
- เรื่องราวกำลังถูกถ่ายทอดสด มีผู้ชมในโลกของเรื่องดูและพิมพ์แชทตอบสนองแบบเรียลไทม์
- ต่อท้ายทุกการตอบกลับด้วยบล็อกแชทตามรูปแบบนี้เท่านั้น (ต้องมีแท็กทุกครั้ง):
<livechat viewers="{{จำนวนผู้ชมเป็นตัวเลข}}">
ชื่อผู้ใช้: ข้อความ
ชื่อผู้ใช้ [฿จำนวนเงิน]: ข้อความ (เฉพาะคนที่โดเนท)
</livechat>
- 3-8 บรรทัดต่อการตอบกลับ หนึ่งบรรทัดต่อหนึ่งคอมเมนต์ ห้ามเว้นบรรทัดว่าง
- ชื่อผู้ใช้และสไตล์การพิมพ์หลากหลาย (ภาษาเน็ต อีโมจิ พิมพ์ผิด ตัวย่อ) ห้ามใช้เครื่องหมาย : ในชื่อผู้ใช้
- คอมเมนต์ตอบสนองต่อเหตุการณ์ในการตอบกลับนั้น เช่น เชียร์ แซว เดา ชิป ตกใจ และอยู่ในโลกของเรื่องเสมอ
- จำนวนผู้ชมขึ้นลงตามความเข้มข้นของเหตุการณ์ โดเนทไม่ต้องมีทุกรอบ`,
    },
    theatreArtDirection: {
        label: "Mini Theatre - Art Direction (ฐาน)",
        tokens: [],
        default: `<tiramisu_theatre> 
Mini Theatre (UI โรงละครจิ๋วตามธีม) : Art Direction

1. Mood & Tone
* Keywords: Cozy (อบอุ่น), Creamy (นุ่มละมุน), Sophisticated (เรียบหรู), Delicious (น่าลิ้มลอง)
* Vibe: เหมือนนั่งทำงานในคาเฟ่เงียบๆ ช่วงบ่ายวันอาทิตย์

2. Color Palette
ใช้โทนสีธรรมชาติที่สื่อถึงวัตถุดิบจริง:
* Mascarpone Cream (#FFF8E1): สีพื้นหลังหลัก
* Espresso Shot (#5D4037): สีสำหรับตัวอักษรและเส้นขอบ
* Cocoa Powder (#8D6E63): สีรอง (Secondary) ใช้สำหรับเส้นคั่นหรือกรอบตกแต่ง
* Ladyfinger Biscuit (#FFE0B2): สี Accent สำหรับปุ่มหรือจุดที่ต้องการเน้น
* Marsala Wine (#D84315): สีไฮไลท์เนื้อหาสำคัญ

3. Shape & Form
* Rounded Corners: ทุกอย่างต้องโค้งมน (Radius 12px - 20px) ไม่มีเหลี่ยมมุมที่แข็งกระด้าง
* Box Shadow: 4px 4px 0 #8B4513

4. Typography
* Headings & Body: ใช้ฟอนต์ 'Prompt'
* font-size: 0.8-1.1em

5. Size
* Max-Width: 95%`,
    },
    theatreForum: {
        label: "Mini Theatre - Tiramisu Forum",
        tokens: [],
        default: `# Tiramisu Forum
- ต่อจากท้ายสุดของการตอบกลับ (ใต้ footer) ให้สร้าง forum comment ของชาวเน็ต 10-15 คอมเมนต์ ใส่ไว้ใน \`<div style="...">\` ธีมทิรามิสุ
- Title: ☕ Tiramisu Forum
- ต้องมี: เลข # บอกลำดับคอมเมนต์, username ของผู้คอมเมนต์, เนื้อหาสไตล์ชาวเน็ต`,
    },
    theatreAbo: {
        label: "Mini Theatre - ABO",
        tokens: [],
        default: `# ABO
- สร้าง mini theatre ที่มีเนื้อหาเกี่ยวกับตัวละครทั้งสองในโลก Omegaverse
- ใช้แท็ก details, summary ในการสร้าง
- เป็นเนื้อหาแบบเรื่องสั้น ขนาดไม่เกิน 500 คำ`,
    },
    theatreInterview: {
        label: "Mini Theatre - นักแสดงให้สัมภาษณ์",
        tokens: [],
        default: `# นักแสดงให้สัมภาษณ์
- สร้าง mini theatre ในหัวข้อ "รู้สึกยังไงกับฉากนี้"
- ตัวละครหลักและตัวละครอื่น ๆ ตอบคำถามในฐานะนักแสดงที่รับบทในฉากปัจจุบัน
- คำตอบเป็น dialogue (คำพูด) เท่านั้น`,
    },
    cot: {
        label: "Chain of Thought (CoT)",
        tokens: [],
        // ค่าเริ่มต้นผูกกับเวอร์ชันพรีเซ็ต Tiramisu ที่ตรวจเจอ (sfw/nc มีบางประโยคต่างกัน เช่น sfw ไม่มี
        // {{getvar::explicitness}} และมี writing_voice น้อยกว่า) — ดู getEffectiveDefault()/buildPrompt()
        // ด้านล่าง ที่ interceptor.js/inject.js/index.js เรียกโดยส่ง variant จาก preset.js เข้ามา
        // ถ้าตรวจไม่ได้ว่าเป็นพรีเซ็ตเวอร์ชันไหน (ไม่ใช่พรีเซ็ต Tiramisu) ใช้ default (เนื้อหา nc) เป็นค่าตั้งต้น
        default: `# Chain of Thought
- แสดงผลขั้นตอนการคิดทั้งหมดเอาไว้ภายใน tag <planning> ทุกครั้งก่อนเขียนคำตอบจริงเสมอ
- แสดงผลกระบวนการความคิดให้ครบถ้วนก่อนเริ่มต้นคำตอบ
- เขียน treatment ด้วยการวางโครงเรื่องแบบผู้กำกับ ไม่ต้องบรรยายละเอียด แต่ใส่ให้ครบว่าแต่ละย่อหน้ามีเหตุการณ์อะไร

<planning>

『 🍰 @ ห้องครัวขนมหวานของทิรามิสุ 』
(หมายเหตุภายใน: "ห้องครัว / วัตถุดิบ" คือคำเปรียบเทียบของขั้นตอนคิดเท่านั้น ฉากและตัวละครจริงให้ยึดตาม Scenario/การ์ด)

※ เหตุการณ์ปัจจุบัน
* Past session story: []
* Recent Story: []
* Reply ล่าสุด: []

※ โลกและกฏของโลก
* Setting: [ยุคสมัย, เมือง, พื้นหลัง]
* การสร้าง Character: [วัฒนธรรม, การใช้ภาษาของตัวละครที่อยู่อาศัยในโลกนี้]
* World Logic: [ตรรกะของโลกที่ระบุเอาไว้]
* World Rules: [กฏที่โลกนี้มีเป็นเงื่อนไข]

※ ฉากและสภาพแวดล้อม
* Background: [สถานที่ปัจจุบัน]
* สภาพแวดล้อมและรายละเอียดทางประสาทสัมผัส: [บรรยากาศ, กลิ่น, ความสะอาด ฯลฯ]

※ ตัวละครในเนื้อเรื่อง ({{char}} และ NPC — ไม่ใช่ทิรามิสุผู้ช่วย)
* วจนะภาษา (สิ่งที่ตัวละครจะแสดงออกทางคำพูด): []
* อวจนะภาษา (สิ่งที่ตัวละครแสดงออกผ่านปฏิกิริยา): []
* สร้างทางเลือกที่เป็นไปได้และเหมาะกับบุคลิกของตัวละคร: []
* เลือกการกระทำต่อไปของตัวเอง: []
* การเปิดช่องให้ {{user}}: []

『 🍰 @ สำนวนภาษา 』
* สไตล์การบรรยาย: {{getvar::style}}
* โฟกัสของเนื้อเรื่อง: {{getvar::narrative_focus}}
* มุมมอง: {{getvar::narrative_pov}} {{getvar::pov_flex}}
* ความเร็วของเนื้อเรื่อง: {{getvar::pacing}}
* ระดับอารมณ์: {{getvar::emotional_intensity}}
* ระดับความโจ่งแจ้ง: {{getvar::explicitness}}
* ปริมาณบท: {{getvar::dialogue_density}}
* User Agency: []

『 🍰 @ การจัดรูปแบบ 』
* ความยาวเป้าหมาย: {{getvar::length}}
* จำนวนย่อหน้าคร่าวๆ: []
* น้ำเสียง / สำนวน: {{getvar::writing_voice_1}} {{getvar::writing_voice_2}} {{getvar::writing_voice_3}} {{getvar::writing_voice_4}} {{getvar::writing_voice_5}} {{getvar::writing_voice_6}} {{getvar::writing_voice_7}} {{getvar::writing_voice_8}} {{getvar::writing_voice_9}} {{getvar::writing_voice_10}} {{getvar::writing_voice_11}} {{getvar::writing_voice_12}} {{getvar::writing_voice_13}} {{getvar::writing_voice_14}} {{getvar::writing_voice_15}} {{getvar::writing_voice_16}} {{getvar::writing_voice_17}} {{getvar::writing_voice_18}}
{{getvar::mobile_format}}
* การจัดย่อหน้าที่เหมาะกับสำนวน (ต้องเพิ่มหรือลดย่อหน้า/ปรับคำบรรยายให้เหมาะกับสำนวนอย่างไร): []

『 🍰 @ วางโครงของคำตอบ 』
* Output Language: {{getvar::language}}
* Outline คำตอบ (เป็น Bullet):
* Treatment เจาะลึก (ขยาย Outline วางแผนว่าแต่ละย่อหน้าจะใส่อะไร):
   * P1 (ย่อมาจาก Paragraph 1): []
   * P2: []
   * P3: []
   * (ทำซ้ำการเขียนรายละเอียดของแต่ละ Paragraph ไปเรื่อยๆ จนครบตาม Outline, เขียนมากกว่าจำนวนย่อหน้าเป้าหมายได้)

『 ☕ @ ทั้งหมดพร้อมแล้ว เริ่มต้นการทำขนมได้เลย 』

</planning>`,
        variants: {
            nc: `# Chain of Thought
- แสดงผลขั้นตอนการคิดทั้งหมดเอาไว้ภายใน tag <planning> ทุกครั้งก่อนเขียนคำตอบจริงเสมอ
- แสดงผลกระบวนการความคิดให้ครบถ้วนก่อนเริ่มต้นคำตอบ
- เขียน treatment ด้วยการวางโครงเรื่องแบบผู้กำกับ ไม่ต้องบรรยายละเอียด แต่ใส่ให้ครบว่าแต่ละย่อหน้ามีเหตุการณ์อะไร

<planning>

『 🍰 @ ห้องครัวขนมหวานของทิรามิสุ 』
(หมายเหตุภายใน: "ห้องครัว / วัตถุดิบ" คือคำเปรียบเทียบของขั้นตอนคิดเท่านั้น ฉากและตัวละครจริงให้ยึดตาม Scenario/การ์ด)

※ เหตุการณ์ปัจจุบัน
* Past session story: []
* Recent Story: []
* Reply ล่าสุด: []

※ โลกและกฏของโลก
* Setting: [ยุคสมัย, เมือง, พื้นหลัง]
* การสร้าง Character: [วัฒนธรรม, การใช้ภาษาของตัวละครที่อยู่อาศัยในโลกนี้]
* World Logic: [ตรรกะของโลกที่ระบุเอาไว้]
* World Rules: [กฏที่โลกนี้มีเป็นเงื่อนไข]

※ ฉากและสภาพแวดล้อม
* Background: [สถานที่ปัจจุบัน]
* สภาพแวดล้อมและรายละเอียดทางประสาทสัมผัส: [บรรยากาศ, กลิ่น, ความสะอาด ฯลฯ]

※ ตัวละครในเนื้อเรื่อง ({{char}} และ NPC — ไม่ใช่ทิรามิสุผู้ช่วย)
* วจนะภาษา (สิ่งที่ตัวละครจะแสดงออกทางคำพูด): []
* อวจนะภาษา (สิ่งที่ตัวละครแสดงออกผ่านปฏิกิริยา): []
* สร้างทางเลือกที่เป็นไปได้และเหมาะกับบุคลิกของตัวละคร: []
* เลือกการกระทำต่อไปของตัวเอง: []
* การเปิดช่องให้ {{user}}: []

『 🍰 @ สำนวนภาษา 』
* สไตล์การบรรยาย: {{getvar::style}}
* โฟกัสของเนื้อเรื่อง: {{getvar::narrative_focus}}
* มุมมอง: {{getvar::narrative_pov}} {{getvar::pov_flex}}
* ความเร็วของเนื้อเรื่อง: {{getvar::pacing}}
* ระดับอารมณ์: {{getvar::emotional_intensity}}
* ระดับความโจ่งแจ้ง: {{getvar::explicitness}}
* ปริมาณบท: {{getvar::dialogue_density}}
* User Agency: []

『 🍰 @ การจัดรูปแบบ 』
* ความยาวเป้าหมาย: {{getvar::length}}
* จำนวนย่อหน้าคร่าวๆ: []
* น้ำเสียง / สำนวน: {{getvar::writing_voice_1}} {{getvar::writing_voice_2}} {{getvar::writing_voice_3}} {{getvar::writing_voice_4}} {{getvar::writing_voice_5}} {{getvar::writing_voice_6}} {{getvar::writing_voice_7}} {{getvar::writing_voice_8}} {{getvar::writing_voice_9}} {{getvar::writing_voice_10}} {{getvar::writing_voice_11}} {{getvar::writing_voice_12}} {{getvar::writing_voice_13}} {{getvar::writing_voice_14}} {{getvar::writing_voice_15}} {{getvar::writing_voice_16}} {{getvar::writing_voice_17}} {{getvar::writing_voice_18}}
{{getvar::mobile_format}}
* การจัดย่อหน้าที่เหมาะกับสำนวน (ต้องเพิ่มหรือลดย่อหน้า/ปรับคำบรรยายให้เหมาะกับสำนวนอย่างไร): []

『 🍰 @ วางโครงของคำตอบ 』
* Output Language: {{getvar::language}}
* Outline คำตอบ (เป็น Bullet):
* Treatment เจาะลึก (ขยาย Outline วางแผนว่าแต่ละย่อหน้าจะใส่อะไร):
   * P1 (ย่อมาจาก Paragraph 1): []
   * P2: []
   * P3: []
   * (ทำซ้ำการเขียนรายละเอียดของแต่ละ Paragraph ไปเรื่อยๆ จนครบตาม Outline, เขียนมากกว่าจำนวนย่อหน้าเป้าหมายได้)

『 ☕ @ ทั้งหมดพร้อมแล้ว เริ่มต้นการทำขนมได้เลย 』

</planning>`,
            sfw: `# Chain of Thought
- แสดงผลขั้นตอนการคิดทั้งหมดเอาไว้ภายใน tag <planning> ทุกครั้งก่อนเขียนคำตอบจริงเสมอ
- แสดงผลกระบวนการความคิดให้ครบถ้วนก่อนเริ่มต้นคำตอบ
- เขียน treatment ด้วยการวางโครงเรื่องแบบผู้กำกับ ไม่ต้องบรรยายละเอียด แต่ใส่ให้ครบว่าแต่ละย่อหน้ามีเหตุการณ์อะไร

<planning>

『 🍰 @ ห้องครัวขนมหวานของทิรามิสุ 』
(หมายเหตุภายใน: "ห้องครัว / วัตถุดิบ" คือคำเปรียบเทียบของขั้นตอนคิดเท่านั้น ฉากและตัวละครจริงให้ยึดตาม Scenario/การ์ด)

※ เหตุการณ์ปัจจุบัน
* Past session story: []
* Recent Story: []
* Reply ล่าสุด: []

※ โลกและกฏของโลก
* Setting: [ยุคสมัย, เมือง, พื้นหลัง]
* การสร้าง Character: [วัฒนธรรม, การใช้ภาษาของตัวละครที่อยู่อาศัยในโลกนี้]
* World Logic: [ตรรกะของโลกที่ระบุเอาไว้]
* World Rules: [กฏที่โลกนี้มีเป็นเงื่อนไข]

※ ฉากและสภาพแวดล้อม
* Background: [สถานที่ปัจจุบัน]
* สภาพแวดล้อมและรายละเอียดทางประสาทสัมผัส: [บรรยากาศ, กลิ่น, ความสะอาด ฯลฯ]

※ ตัวละครในเนื้อเรื่อง ({{char}} และ NPC — ไม่ใช่ทิรามิสุผู้ช่วย)
* วจนะภาษา (สิ่งที่ตัวละครจะแสดงออกทางคำพูด): []
* อวจนะภาษา (สิ่งที่ตัวละครแสดงออกผ่านปฏิกิริยา): []
* สร้างทางเลือกที่เป็นไปได้และเหมาะกับบุคลิกของตัวละคร: []
* เลือกการกระทำต่อไปของตัวเอง: []
* การเปิดช่องให้ {{user}}: []

『 ☕ @ การเตรียมการพร้อมแล้ว เริ่มต้นการเขียน Outline 』

『 🍰 @ สำนวนภาษา 』
* สไตล์การบรรยาย: {{getvar::style}}
* โฟกัสของเนื้อเรื่อง: {{getvar::narrative_focus}}
* มุมมอง: {{getvar::narrative_pov}} {{getvar::pov_flex}}
* ความเร็วของเนื้อเรื่อง: {{getvar::pacing}}
* ระดับอารมณ์: {{getvar::emotional_intensity}}
* ปริมาณบท: {{getvar::dialogue_density}}
* User Agency: []

『 🍰 @ การจัดรูปแบบ 』
* ความยาวเป้าหมาย: {{getvar::length}}
* จำนวนย่อหน้าคร่าวๆ: []
* น้ำเสียง / สำนวน: {{getvar::writing_voice_1}} {{getvar::writing_voice_2}} {{getvar::writing_voice_3}} {{getvar::writing_voice_4}} {{getvar::writing_voice_5}} {{getvar::writing_voice_6}} {{getvar::writing_voice_7}} {{getvar::writing_voice_8}} {{getvar::writing_voice_9}} {{getvar::writing_voice_10}} {{getvar::writing_voice_11}} {{getvar::writing_voice_12}} {{getvar::writing_voice_13}} {{getvar::writing_voice_14}} {{getvar::writing_voice_15}} {{getvar::writing_voice_16}}
{{getvar::mobile_format}}
* การจัดย่อหน้าที่เหมาะกับสำนวน (ต้องเพิ่มหรือลดย่อหน้า/ปรับคำบรรยายให้เหมาะกับสำนวนอย่างไร): []

『 🍰 @ วางโครงของคำตอบ 』
* Output Language: {{getvar::language}}
* Outline คำตอบ (เป็น Bullet):
* Treatment เจาะลึก (ขยาย Outline วางแผนว่าแต่ละย่อหน้าจะใส่อะไร):
   * P1 (ย่อมาจาก Paragraph 1): []
   * P2: []
   * P3: []
   * (ทำซ้ำการเขียนรายละเอียดของแต่ละ Paragraph ไปเรื่อยๆ จนครบตาม Outline, เขียนมากกว่าจำนวนย่อหน้าเป้าหมายได้)

『 ☕ @ ทั้งหมดพร้อมแล้ว เริ่มต้นการทำขนมได้เลย 』

</planning>`,
        },
    },
};

// แทนที่ {{token}} ของ extension เอง (คนละชุดกับ macro ของ ST) แล้วคืน string พร้อมส่งต่อให้ ctx.substituteParams()
// ค่าเริ่มต้นของ prompt หนึ่งตัว ตามเวอร์ชันพรีเซ็ตที่ตรวจเจอ (variant: "nc" | "sfw" | null)
// ไม่มี variants สำหรับ id นั้น หรือ variant ไม่ตรงกับที่มี (เช่นไม่ใช่พรีเซ็ต Tiramisu) → ใช้ def.default
export function getEffectiveDefault(id, variant) {
    const def = PROMPT_DEFS[id];
    if (!def) return "";
    if (variant && def.variants && typeof def.variants[variant] === "string") return def.variants[variant];
    return def.default;
}

// variant: ผลจาก preset.js::detectVariant() ("nc" | "sfw" | null) — ผู้ใช้แก้เองแล้ว (stored[id]) ชนะเสมอ
// ไม่ว่า variant จะเป็นอะไร (ผู้ใช้ตั้งใจ override แล้ว ไม่ควรไปสลับให้ตามพรีเซ็ตอีก)
export function buildPrompt(id, vars, stored, variant) {
    const def = PROMPT_DEFS[id];
    if (!def) return "";
    let out = stored && typeof stored[id] === "string" && stored[id] ? stored[id] : getEffectiveDefault(id, variant);
    for (const [k, v] of Object.entries(vars || {})) {
        out = out.split(`{{${k}}}`).join(String(v ?? ""));
    }
    return out;
}

// ตรวจว่า template (ของผู้ใช้หรือ default) ยังมี {{token}} ที่จำเป็นครบไหม
export function validatePromptTemplate(id, text) {
    const def = PROMPT_DEFS[id];
    if (!def) return { ok: true, missing: [] };
    const missing = def.tokens.filter((t) => !String(text ?? "").includes(`{{${t}}}`));
    return { ok: missing.length === 0, missing };
}
