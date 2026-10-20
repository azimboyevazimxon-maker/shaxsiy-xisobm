# Shaxsiy xarajatlar

Ozimmi xarajatlarni hisoblash uchun PWA (progressive web app). Faqat HTML, CSS va JavaScript — server kerak emas. GitHub Pages'da joylanadi, ma'lumotlar brauzerning `localStorage`'ida saqlanadi.

## Imkoniyatlar

| Bo'lim | Nima qiladi |
|---|---|
| **Asosiy** | Bugun / hafta / oy jami. Tezkor kiritish: `taksi 30000` yoki `5 ming taksi`. Summa yozilsa, "Mahsulot qilib saqlaymi?" deb so'raydi. Daromad qo'shish. |
| **Mahsulotlar** | Nomi, narxi, kategoriyasi, joyi. Bosilsa darhol xarajatga qo'shiladi. Ushlab turilsa miqdor tanlanadi (masalan 6 000 so'mdan 5 ta). |
| **Statistika** | Oy bo'yicha kirim, chiqim va `kirim - chiqim` farqi. Kategoriyalar bo'yicha diagramma. Oylar orasida o'tish. |
| **Kopilka** | Maqsad (nomi va summa), qo'shilgan pullar, foiz va qolgani. Pullar haftalik guruhlab ko'rsatiladi. |
| **Qarzlar** | Har bir odam bo'yicha "Oldim" / "Qaytardim" yozuvlari va joriy qoldiq. |
| **Sozlamalar** | Valyuta belgisi, JSON eksport/import (zaxira), ilovani o'rnatish, hammasini o'chirish. |

Kategoriyalar: ovqat, ichimlik, taksi/yo'l, samokat/velo, do'stlar bilan, uy-ro'zg'or, boshqa.

## Ishga tushirish

Brauzerda `index.html` ni to'g'ridan-to'g'ri ochish mumkin emas (ES modullar va service worker uchun HTTP kerak). Mahalliy test uchun:

```bash
python3 -m http.server 8000
# so'ng http://localhost:8000 ni oching
```

## GitHub Pages'ga joylash

1. Repozitoriyada **Settings → Pages** bo'limiga kiring.
2. **Source**: `Deploy from a branch`, branch: `main` (yoki kerakli branch), papka: `/ (root)`.
3. Bir necha daqiqadan so'ng sayt `https://<username>.github.io/<repo>/` manzilida ochiladi.

Barcha yo'llar nisbiy (`./`), shuning uchun repozitoriy nomi ostida ham to'g'ri ishlaydi.

## Telefonga o'rnatish

- **Android (Chrome)**: manzilni oching → menyu → *Ilovani o'rnatish* (yoki Sozlamalar sahifasidagi tugma).
- **iPhone (Safari)**: *Ulashish* → *Bosh ekranga qo'shish*.

O'rnatilgandan keyin ilova internetsiz ham ochiladi (service worker qobiqni keshlaydi).

## Ma'lumotlar

- Hamma ma'lumot `localStorage`da, kalit: `xarajat-pwa:v1`. Ma'lumot faqat shu brauzer/qurilmada turadi.
- Brauzer ma'lumotlarini tozalasangiz yoki boshqa telefonga o'tsangiz, **Sozlamalar → Eksport (JSON)** bilan zaxira oling va yangi joyda **Import** qiling.
- Yangi versiya chiqarganda `sw.js` dagi `CACHE_VERSION` ni o'zgartiring — eski kesh tozalanadi.

### Ma'lumot modeli

```
settings   { currency, savingsTitle, savingsTarget }
products   { id, name, price, category, place }
expenses   { id, name, amount, qty, unitPrice, category, place, productId, date, createdAt }
incomes    { id, name, amount, date, createdAt }
deposits   { id, amount, date, note, createdAt }          # kopilka
debts      { id, name, createdAt }                        # odam
debtEntries{ id, debtId, type: 'olgan' | 'qaytargan', amount, date, note, createdAt }
```

`date` har doim `YYYY-MM-DD` ko'rinishida (mahalliy vaqt). Summalar butun son.

## Kod tuzilishi

```
index.html            qobiq: yuqori panel, pastki menyu, oyna osti, xabar
css/style.css         dizayn (yorug' va qorong'i rejim)
js/app.js             hash-marshrutlash, tab holati, service worker'ni ulash
js/store.js           MA'LUOT QATLAMI — Firebase'ga o'tganda faqat shu fayl almashadi
js/parser.js          tezkor kiritish matnini tahlil qilish
js/categories.js      kategoriyalar va kalit so'zlar bo'yicha avto-tanlash
js/ui.js              DOM yordamchilari, oyna osti (sheet), tasdiqlash, uzoq bosish
js/utils.js           sana, pul formati, hafta/oy hisoblari
js/pwa.js             o'rnatish tugmasi, service worker ro'yxati
js/views/*.js         har bir sahifa (home, products, stats, savings, debts, settings)
manifest.webmanifest  PWA manifesti
sw.js                 offline kesh
icons/                ilova ikonkalari
```

Views faqat `store` ning async metodlarini chaqiradi, to'g'ridan-to'g'ri `localStorage`ga tegmaydi. Shuning uchun kelajakda Firebase'ga o'tish quyidagicha:

1. `js/store.js` ni Firestore bilan ishlaydigan versiya bilan almashtirish. Metodlar nomi va qaytaradigan qiymatlari o'sha-o'sha qoladi (`list`, `add`, `update`, `remove`, `removeWhere`, `getSettings`, `updateSettings`, `exportJson`, `importJson`, `clear`).
2. `add` da hozir `uid()` ishlatiladi — u Firestore hujjat id'siga mos UUID. Firestore'da `addDoc` o'rniga `setDoc(doc(db, ...), item)` bilan shu id'ni ishlatish mumkin.
3. Foydalanuvchi bo'yicha ma'lumot: `users/{uid}/expenses/{id}` kabi subcollection'lar. Autentifikatsiya (Google yoki email) qo'shilgandan keyin `store` ichidagi yo'lni `users/{uid}` ga bog'lang.
4. Real vaqtda yangilanish kerak bo'lsa, `list` o'rniga `onSnapshot` ishlating va views'ga `rerender` chaqiruvini qo'shing.
5. Pullik versiya uchun Firestore Security Rules: har bir foydalanuvchi faqat o'z `users/{uid}` yo'lini o'qiy va yoza olsin.

## Tekshirish

Hozircha avtomatik test yo'q. Tezkor kiritish parseri (`js/parser.js`) qo'lda tekshirilgan: `taksi 30000`, `5 ming taksi`, `kofe 50 000`, `1,5 mln mashina`, `choy 6k`.
