# server-panel-bot

Telegram orqali serverni (pm2 jarayonlari va telefon holatini) tugmalar bilan boshqaruvchi panel bot.
Faqat `OWNER_IDS` dagi foydalanuvchilarga javob beradi, boshqalarga jim turadi.

## O'rnatish (Termux)

```sh
cd ~/server/bots/server-panel-bot
npm install
cp .env.example .env
nano .env            # BOT_TOKEN ni yozing (BotFather dan)
```

pm2 orqali ishga tushirish va saqlash:

```sh
pm2 start ecosystem.config.cjs
pm2 save
```

Telefon yonganda avtomatik tiklash (Termux:Boot ilovasi kerak):

```sh
mkdir -p ~/.termux/boot
cp termux-boot/start-panel.sh ~/.termux/boot/
chmod +x ~/.termux/boot/start-panel.sh
```

Holatni tekshirish: `pm2 status` va `pm2 logs server-panel-bot`.

## Qo'llanma

`/start` — asosiy menyu:

- **📋 Jarayonlar** — pm2 dagi har bir jarayon: 🟢/🔴 holati, uptime, RAM.
  Har birida: ▶️ Yoqish, ⏹ O'chirish, 🔄 Qayta yoqish, 📄 Log (oxirgi 50 qator).
- **📱 Telefon holati** — batareya va zaryad, harorat, CPU va RAM yuklamasi, server uptime.
- **🔄 Hammasini qayta yoqish** — tasdiqlash so'raydi. Panel bot o'zi bundan mustasno.

Avtomatik ogohlantirishlar (har 2 daqiqada tekshiriladi):

- jarayon to'xtab qolsa yoki crash bo'lsa
- batareya 20% dan tushsa (25% dan oshguncha qayta xabar bermaydi)
- harorat 45 °C dan oshsa (42 °C dan tushguncha qayta xabar bermaydi)

Panel orqali o'zingiz to'xtatgan jarayon haqida ogohlantirish kelmaydi.

## Muammolar

- **Batareya "ma'lumot yo'q"** — Termux:API ilovasi va `pkg install termux-api` o'rnatilganini tekshiring.
  proot ichida bo'lsa, `.env` ga `TERMUX_BATTERY_CMD=/data/data/com.termux/files/usr/bin/termux-battery-status` qo'shing.
- **pm2 topilmasa** — `.env` da `PM2_BIN=/to/'liq/yo/'l/pm2` ko'rsating.
- **Telefon qayta yonganda bot yo'q** — `~/.termux/boot/` ichida skript borligini va Termux:Boot ruxsatlarini tekshiring.
