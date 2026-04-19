# OsonBooking — Konsept Hujjati

## 1. Umumiy Ma'lumot

- **Nomi**: OsonBooking
- **Shiori**: Sartaroshga bron qiling — oson va tez!
- **Tavsifi**: O'zbekistondagi mijozlarni sartaroshlar bilan Telegram bot orqali bog'lovchi platforma
- **Boshlang'ich bozor**: Yuqori Chirchiq tumani (muvaffaqiyatli bo'lsa, kengaytiriladi)
- **Maqsadli foydalanuvchilar**: Yakka sartaroshlar va ko'p sartaroshli sartaroshxonalar
- **Biznes modeli**: MVP bosqichida hammaga bepul

---

## 2. Muammo

- Mijozlar sartaroshxonada navbat kutib vaqtlarini behuda sarflashadi
- Mijozlar yaqin atrofdagi qaysi sartaroshlar bo'sh yoki yaxshi ekanligini bilishmaydi
- Sartaroshlar bronlarni telefon qo'ng'iroqlari va chat xabarlari orqali boshqarishadi, natijada uchrashuvlarni yo'qotishadi
- O'zbekistondagi sartaroshlik sohasida tartibli bron qilish tizimi mavjud emas

---

## 3. Yechim

Mijozlar va sartaroshlar uchun bitta Telegram bot + menejerlar uchun bitta admin veb-panel.

---

## 4. Platforma va Texnologiyalar

- **Bot**: Bitta Telegram bot (grammY + Node.js) — faqat inline tugmalar, webapp yo'q
- **API**: Express.js + PostgreSQL
- **Admin panel**: Next.js (React) + Tailwind CSS
- **Deploy**: Docker Compose + PM2
- **Tillar**: O'zbek (Lotin), Rus, Qozoq, O'zbek (Kirill) — barcha kontent ko'p tilli

---

## 5. Ro'yxatdan O'tish Jarayoni

### Mijoz ro'yxatdan o'tishi:
Juda oddiy — oldindan ro'yxatdan o'tish shart emas:
1. Mijoz botni ochadi → `/start`
2. Tilni tanlaydi
3. **"Siz kimsiz?"** — "Mijozman" ni tanlaydi
4. Tayyor! Darhol ko'rib chiqish va bron qilish mumkin
5. Faqat **birinchi bron** qilganda bot ism va telefon raqamini so'raydi
6. Ma'lumotlar saqlanadi — keyingi safar qayta so'ralmaydi

### Sartarosh ro'yxatdan o'tishi:

**A usul — Admin qo'shadi:**
1. Menejer admin panelni ochadi → "Sartaroshlar" sahifasiga o'tadi
2. Sartaroshni qo'lda qo'shadi (ism, telefon, sartaroshxonaga biriktiradi)
3. Sartarosh botni ochganda tizim uning Telegram ID / telefoni orqali taniydi

**B usul — O'zi ro'yxatdan o'tadi:**
1. Sartarosh botni ochadi → `/start` → tilni tanlaydi
2. **"Siz kimsiz?"** — "Sartaroshman" ni tanlaydi
3. Bot so'raydi: ism, telefon raqami, qaysi sartaroshxonaga tegishli (ro'yxatdan tanlaydi)
4. Ro'yxatdan o'tish **"kutilmoqda"** holatiga o'tadi
5. Admin panelda menejer so'rovni ko'radi → tasdiqlaydi yoki rad etadi
6. Sartaroshga natija haqida xabar beriladi → tasdiqlangandan keyin bron qabul qila boshlaydi

> **Muhim**: Sartaroshxonalarni faqat admin/menejer yaratishi mumkin. Sartaroshlar o'zlari sartaroshxona ochishmaydi — faqat mavjud sartaroshxonalardan tanlashadi. Yakka sartaroshlar uchun ham admin alohida sartaroshxona yaratib beradi.

---

## 6. Foydalanuvchi Oqimlari

### Mijoz — Bron Qilish Oqimi:
1. `/start` → tilni tanlash → "Mijozman"
2. Asosiy menyu: **"Bron qilish"** | **"Mening bronlarim"**
3. Bron qilish bosqichlari:
   - **1-qadam**: Joylashuvni tanlash (masalan: "Yuqori Chirchiq")
   - **2-qadam**: Sartaroshxonani tanlash (shu joylashuvdagi do'konlar ro'yxati)
   - **3-qadam**: Sartaroshni tanlash (shu do'kondagi sartaroshlar ro'yxati)
   - **4-qadam**: Xizmatlarni tanlash (shu sartaroshning o'z xizmatlari va narxlari). Bir nechta xizmat tanlash mumkin. Bot jami summani ko'rsatib boradi:
     ```
     Tanlangan:
     ✅ Soch olish — 25,000 so'm (30 daq)
     ✅ Soqol olish — 15,000 so'm (20 daq)
     ───────────────
     Jami: 40,000 so'm (50 daq)

     [Davom etish] [Bekor qilish]
     ```
   - **5-qadam**: Sana va vaqtni kiritish (erkin matn, masalan: "15-aprel 14:00")
   - **6-qadam**: Xulosa ko'rsatiladi → Mijoz tasdiqlaydi
4. Bron sartaroshga tasdiqlash uchun yuboriladi
5. Sartarosh qabul/rad qilganda mijozga xabar beriladi

### Sartarosh — Bron Boshqarish Oqimi:
1. Tasdiqlangandan keyin asosiy menyu:
   - **"Yangi bronlar"** — kutilayotgan bronlar ro'yxati
   - **"Tasdiqlangan"** — qabul qilingan bronlar
   - **"Tarix"** — o'tgan bronlar
   - **"Mening xizmatlarim"** — xizmatlarni boshqarish
   - **"Bugungi jadval"** — bugungi tasdiqlangan bronlar
2. Yangi bron xabarnomasi kelganda:
   ```
   Yangi bron!
   👤 Mijoz: Ahmad
   📱 Telefon: +998 90 123 45 67
   ✂️ Xizmatlar: Soch olish + Soqol olish
   💰 Jami: 40,000 so'm
   📅 Sana: 15-aprel, 14:00

   [✅ Qabul qilish] [❌ Rad etish]
   ```
3. Sartarosh qo'lda tasdiqlaydi yoki rad etadi (vaqt cheklovi yo'q)
4. Mijozga natija haqida xabar beriladi

### Sartarosh — Xizmatlarni Boshqarish:
Har bir sartarosh o'z xizmatlarini to'liq boshqaradi:

**Xizmat qo'shish:**
1. "Mening xizmatlarim" → "Xizmat qo'shish" tugmasini bosadi
2. Bot bosqichma-bosqich so'raydi:
   - **Xizmat nomi** — erkin matn (masalan: "Soch olish premium")
   - **Narxi** — so'mda (masalan: "35000")
   - **Davomiyligi** — daqiqada (masalan: "45")
3. Xizmat saqlanadi

**Xizmatlar ro'yxati:**
```
Mening xizmatlarim:

1. Soch olish — 25,000 so'm (30 daq) [✏️] [🗑️]
2. Soqol olish — 15,000 so'm (20 daq) [✏️] [🗑️]
3. Soch + Soqol — 35,000 so'm (45 daq) [✏️] [🗑️]

[➕ Xizmat qo'shish]
```

**Tahrirlash va o'chirish:**
- ✏️ — xizmat nomini, narxini yoki davomiyligini o'zgartirish
- 🗑️ — xizmatni o'chirish

### Admin panel:
- JWT bilan kirish
- Boshqaruv paneli: bugungi bronlar, kutilayotgan, tasdiqlangan sonlar
- CRUD: joylashuvlar, sartaroshxonalar, sartaroshlar, xizmatlar
- Sartarosh ro'yxatdan o'tishini tasdiqlash/rad etish
- Bronlarni holat/sana bo'yicha ko'rish va filtrlash
- Mijozlar ro'yxatini ko'rish

---

## 7. Xizmatlar Katalogi

Har bir sartarosh o'z xizmatlarini va narxlarini **o'zi belgilaydi**. Namuna xizmatlar:

| Xizmat | Tavsifi |
|--------|---------|
| Soch olish | Turli uslublarda soch kesish |
| Soqol olish | Soqolni tartibga keltirish |
| Soqol qirish | To'liq soqol qirish |
| Bosh yuvish | Soch yuvish xizmati |
| Soch turmaklash | Soch shakllantirish |
| Bolalar soch olish | Bolalar uchun soch kesish |
| Maxsus xizmatlar | Sartarosh tomonidan belgilanadi |

> Sartarosh istalgan vaqtda xizmat qo'shishi, narxini o'zgartirishi yoki o'chirishi mumkin.

---

## 8. Ma'lumotlar Bazasi Jadvallari

| Jadval | Tavsifi |
|--------|---------|
| **users** | id, telegram_id, rol (mijoz/sartarosh), to'liq ism, telefon, til, holat (faol/kutilmoqda), yaratilgan sana |
| **locations** | id, nom (4 tilda) — shahar/tuman darajasida |
| **shops** | id, joylashuv_id, nom (4 tilda), manzil, telefon, yaratilgan sana |
| **barbers** | id, foydalanuvchi_id, do'kon_id, nom (4 tilda), bio (4 tilda), rasm, faol holat, yaratilgan sana |
| **services** | id, sartarosh_id, nom (4 tilda), narx, davomiyligi (daqiqa) |
| **bookings** | id, mijoz_id, sartarosh_id, bron sanasi, bron vaqti, holat (kutilmoqda/tasdiqlangan/rad etilgan/bekor qilingan/tugallangan), yaratilgan/yangilangan sana |
| **booking_services** | id, bron_id, xizmat_id, narx (bron paytidagi narx) — bir bronda bir nechta xizmat |

---

## 9. Kelajakdagi Imkoniyatlar (MVP dan keyin)

- Baholash va sharh tizimi (tugallangan brondan keyin 1-5 yulduz)
- To'lov integratsiyasi (Click/Payme)
- Mijozlar uchun sevimlilar ro'yxati
- Push xabarnomalar va eslatmalar
- Sodiqlik ballari tizimi
- Sartaroshlar uchun analitika paneli
- Ko'proq tuman/shaharlarga kengaytirish
