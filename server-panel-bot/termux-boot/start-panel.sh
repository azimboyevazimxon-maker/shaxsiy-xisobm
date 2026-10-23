#!/data/data/com.termux/files/usr/bin/sh
# Termux:Boot skripti. Nusxasini ~/.termux/boot/ ga qo'ying:
#   cp termux-boot/start-panel.sh ~/.termux/boot/
# Telefon yonganda saqlangan pm2 jarayonlarini (shu jumladan panel botni) tiklaydi.
# Agar pm2 proot-distro ichida bo'lsa, oxirgi qatorni almashtiring:
#   proot-distro login ubuntu -- bash -lc 'pm2 resurrect'

termux-wake-lock
export PATH=/data/data/com.termux/files/usr/bin:$PATH
sleep 20
pm2 resurrect
