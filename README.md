# OLYMPUS ACADEMY — ระบบส่ง Whitelist

Next.js 16 + Supabase + Discord Login/Bot

## ติดตั้งครั้งแรก

### 1. Supabase
1. สร้างโปรเจกต์ที่ https://supabase.com
2. เปิด **SQL Editor → New query** วางไฟล์ `supabase/schema.sql` ทั้งไฟล์ แล้วกด **Run**
   (สร้างตาราง + bucket `whitelist` สำหรับไฟล์ PDF/สลิปให้อัตโนมัติ)
3. **Project Settings → API** คัดลอก
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` / publishable key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` / secret key → `SUPABASE_SERVICE_ROLE_KEY` (**ห้ามเผยแพร่**)

### 2. Discord
1. https://discord.com/developers/applications → Application ของคุณ
2. **OAuth2 → Redirects** เพิ่ม
   - `http://localhost:3000/api/auth/callback`
   - `https://โดเมนจริง/api/auth/callback`
3. คัดลอก Client ID / Client Secret / Bot Token / Server ID

### 3. ไฟล์ .env.local
คัดลอก `.env.example` เป็น `.env.local` แล้วกรอกค่า
- `AUTH_SECRET` สุ่มได้ด้วยคำสั่ง `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `ADMIN_DISCORD_IDS` ใส่ Discord ID ของคุณ เพื่อเข้าหน้าแอดมินครั้งแรก

### 4. รัน
```
npm install
npm run dev
```
เปิด http://localhost:3000

### 5. ตั้งค่าในเว็บ
ล็อกอิน → **แอดมิน → ตั้งค่า** ใส่ Role ID ของแต่ละประเภท/สายเลือด, Channel ID ห้อง Log, ลิงก์ Ticket, QR Code

## โครงสร้าง
| ส่วน | ไฟล์ |
|---|---|
| ฐานข้อมูล | `supabase/schema.sql` |
| ล็อกอิน Discord | `src/app/api/auth/*`, `src/lib/session.ts` |
| บอท (ให้ยศ/DM/Log) | `src/lib/discord.ts` |
| ค่าเริ่มต้น (เทพ, ราคา, บัญชี) | `src/lib/settings.ts` |
| ฟอร์มผู้เล่น | `src/components/application-form.tsx`, `src/app/submit/*` |
| หลังบ้าน | `src/app/admin/*` |

## Deploy
ใช้ได้ทั้ง Vercel และ VPS (`npm run build && npm start`) — ไฟล์อัปโหลดตรงเข้า Supabase Storage จึงไม่ติดลิมิตขนาด request
อย่าลืมเปลี่ยน `APP_URL` เป็นโดเมนจริง และเพิ่ม Redirect URI ใน Discord
