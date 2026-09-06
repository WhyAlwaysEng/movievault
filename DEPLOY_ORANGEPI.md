# 🚀 คู่มือการย้าย MovieVault ไปยัง Orange Pi (ขั้นตอน 4 - 5 - 6)

คู่มือนี้สรุปขั้นตอนสำหรับย้ายโค้ดเว็บและฐานข้อมูลจากเครื่องพัฒนา (Windows) ไปรันบน **Orange Pi Zero 3** ที่เชื่อมต่อกับ External Harddisk (`/mnt/storage`) เพื่อเปิดให้บริการ 24/7 ภายในบ้าน

---

## 📋 ข้อมูลที่ตั้งไฟล์บน Orange Pi

| ส่วนประกอบ | ตำแหน่งบน Orange Pi | คำอธิบาย |
|---|---|---|
| **โปรเจกต์ (Code)** | `/home/orangepi/movievault` | โค้ด Next.js ทำงานบน MicroSD หรือ eMMC |
| **ฐานข้อมูล & สื่อ (Data)** | `/mnt/storage/movievault/data` | อยู่บน External Harddisk 500GB เพื่อถนอม MicroSD |
| **Database File** | `/mnt/storage/movievault/data/db/movievault.db` | ไฟล์ SQLite หลัก |
| **Media / Covers** | `/mnt/storage/movievault/data/media/` | ไฟล์ภาพโปสเตอร์และแบ็คดร็อปที่โหลดเก็บไว้ |
| **Actresses Photos** | `/mnt/storage/movievault/data/actresses/` | รูปโปรไฟล์นักแสดง |

---

## 📦 ขั้นตอนที่ 4: การส่งข้อมูลและโค้ดข้ามเครื่อง (Transfer)

> [!IMPORTANT]
> **ห้าม** ก๊อปปี้โฟลเดอร์ `node_modules` และ `.next` ข้ามเครื่องเด็ดขาด เพราะต้องทำการติดตั้งและคอมไพล์ใหม่บนชิป ARM64 ของ Orange Pi เท่านั้น

เลือกทำวิธีใดวิธีหนึ่งที่สะดวก:

### วิธี A: ใช้โปรแกรม WinSCP หรือ FileZilla บน Windows (แนะนำ ง่ายสุด)
1. เปิดโปรแกรม WinSCP หรือ FileZilla
2. ใส่ข้อมูลการเชื่อมต่อ:
   - **Protocol**: SFTP (หรือ SSH)
   - **Host / IP**: `<IP_ของ_Orange_Pi>` (ดูได้จากคำสั่ง `hostname -I` บน Orange Pi)
   - **Username**: `orangepi`
   - **Password**: รหัสผ่านของ Orange Pi (ค่าเริ่มต้นมักเป็น `orangepi`)
   - **Port**: `22`
3. ทำการอัปโหลดไฟล์:
   - อัปโหลดโฟลเดอร์โปรเจกต์ `movievault` (ยกเว้น `node_modules` และ `.next`) ไปไว้ที่ `/home/orangepi/movievault`
   - อัปโหลดไฟล์ฐานข้อมูล `data/db/movievault.db` ไปไว้ที่ `/mnt/storage/movievault/data/db/movievault.db`
   - อัปโหลดโฟลเดอร์ `data/media` ไปไว้ที่ `/mnt/storage/movievault/data/media` (ถ้ามี)
   - อัปโหลดไฟล์ `.env.local` ไปไว้ที่ `/home/orangepi/movievault/.env.local`

---

### วิธี B: ใช้คำสั่งผ่าน Windows PowerShell
เปิด PowerShell ในโฟลเดอร์โปรเจกต์ `E:\ENGWEB\movievault` แล้วรันคำสั่ง:

```powershell
# 1. กำหนด IP ของ Orange Pi
$OPI_IP = "192.168.1.xxx"  # เปลี่ยนเป็น IP จริงของ Orange Pi

# 2. ก๊อปปี้โค้ดโปรเจกต์ (แยกไฟล์ที่ไม่จำเป็นออก)
tar --exclude="node_modules" --exclude=".next" --exclude=".git" -czf temp_deploy.tar.gz .
scp temp_deploy.tar.gz orangepi@${OPI_IP}:~/
ssh orangepi@${OPI_IP} "mkdir -p ~/movievault && tar -xzf ~/temp_deploy.tar.gz -C ~/movievault && rm ~/temp_deploy.tar.gz"
Remove-Item temp_deploy.tar.gz

# 3. ก๊อปปี้ฐานข้อมูล SQLite ไปไว้ที่ External Harddisk
scp data/db/movievault.db orangepi@${OPI_IP}:/mnt/storage/movievault/data/db/movievault.db

# 4. ก๊อปปี้ไฟล์ .env.local
scp .env.local orangepi@${OPI_IP}:~/movievault/.env.local
```

---

## ⚙️ ขั้นตอนที่ 5: ตั้งค่าไฟล์ `.env.local` บน Orange Pi

เข้า Terminal ของ Orange Pi (ผ่าน SSH หรือหน้าจอตรง):

```bash
cd ~/movievault
nano .env.local
```

ตรวจเช็คให้แน่ใจว่าตัวแปร **`DATA_DIR`** ชี้ไปยัง External Harddisk ถูกต้อง:

```env
# ชี้ที่เก็บฐานข้อมูลและไฟล์มีเดียไปยัง External Harddisk
DATA_DIR=/mnt/storage/movievault/data

# พอร์ตสำหรับรันเว็บ (default: 3000)
PORT=3000
NODE_ENV=production

# ตัวแปรระบบ Firebase Authentication (คัดลอกค่าเดิมมาจากเครื่อง Windows)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=movievault-...firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=movievault-...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=movievault-...appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Secret Key สำหรับระบบความปลอดภัยและ Token
JWT_SECRET=your_jwt_secret_key_here
NEXTAUTH_SECRET=your_nextauth_secret_here
```

*(กด `Ctrl + O` แล้ว `Enter` เพื่อเซฟ และกด `Ctrl + X` เพื่อออก)*

---

## 🚀 ขั้นตอนที่ 6: ติดตั้ง Build และเปิดรัน 24/7 ด้วย PM2

รันคำสั่งตามลำดับนี้บน Terminal ของ Orange Pi:

### 1. ติดตั้ง Dependencies
```bash
cd ~/movievault
npm install
```
*(ระบบจะทำการ compile โมดูล `better-sqlite3` ให้เข้ากับชิปสถาปัตยกรรม ARM64 ของ Orange Pi โดยอัตโนมัติ)*

### 2. Build โปรเจกต์ Next.js สำหรับ Production
```bash
npm run build
```
*(รอจนหน้าจอขึ้นข้อความ Compiled successfully)*

### 3. เริ่มต้นรันเซิร์ฟเวอร์เบื้องหลังด้วย PM2
```bash
pm2 start npm --name "movievault" -- start
```

### 4. ตรวจสอบสถานะการทำงาน
```bash
pm2 status
pm2 logs movievault
```
*(ถ้าขึ้น `Ready in ...ms` หรือ `Listening on port 3000` แสดงว่าระบบทำงานสมบูรณ์แล้ว)*

### 5. ตั้งค่าให้เปิดตัวเองอัตโนมัติเมื่อ Orange Pi บูตเครื่อง (Auto-Startup on Boot)
```bash
pm2 save
pm2 startup
```
*(PM2 จะแสดงคำสั่งที่มีคำว่า `sudo env PATH=...` ออกมา ให้คัดลอกคำสั่งนั้นมารันซ้ำอีกครั้งตามที่ PM2 แนะนำ)*

---

## 🌐 การเข้าใช้งาน
เมื่อรันเสร็จแล้ว อุปกรณ์ทุกเครื่องในวง LAN เดียวกัน (คอมพิวเตอร์, มือถือ, แท็บเล็ต, Smart TV) สามารถเข้าใช้งานได้ทันทีที่:

👉 **`http://<IP_ของ_Orange_Pi>:3000`**

---

## 🔄 คำสั่งที่มีประโยชน์สำหรับการดูแลระบบ

| การทำงาน | คำสั่ง |
|---|---|
| ดูสถานะการทำงาน | `pm2 status` |
| ดู Realtime Logs | `pm2 logs movievault` |
| รีสตาร์ตเซิร์ฟเวอร์ | `pm2 restart movievault` |
| หยุดการทำงาน | `pm2 stop movievault` |
| ตรวจสอบพื้นที่ Harddisk | `df -h /mnt/storage` |

### เมื่อมีการอัปเดตโค้ดใหม่ในอนาคต:
```bash
cd ~/movievault
# ก๊อปปี้ไฟล์ที่แก้ไขมาทับ แล้วรัน:
npm run build
pm2 restart movievault
```
