# ทดสอบ

ต้องมี Node.js, Playwright และ Chromium

```
python3 src/build.py --plain /tmp/app/vocab-trainer.html
cp -r audio /tmp/app/audio
node src/tests/t2.js /tmp/app /tmp/app/shots    # ศัพท์: 9 ขั้น ทบทวน เสียง การบันทึก
node src/tests/gt2.js /tmp/app /tmp/app/gshots  # ไวยากรณ์ 64 บท
node src/tests/t3.js /tmp/app /tmp/app/shots3   # วันนี้ แถบเฉลย ตั้งค่า อ่าน-ฟัง วัดระดับ สำรองความคืบหน้า
node src/tests/sp.js /tmp/app /tmp/app/spshots  # ฝึกพูด: ปุ่มไมค์ ตรวจทีละคำ ฟังต้นแบบ ฟังเสียงตัวเอง
node src/tests/pwatest.js .                      # แอปติดตั้งได้ ใช้ออฟไลน์ได้ (รันจากโฟลเดอร์หลักของ repo)
```

ทุกไฟล์ควรจบด้วย `ALL PASSED`

เทสต์หา Chromium ที่ `/opt/pw-browsers/chromium` ถ้าอยู่ที่อื่นให้ตั้ง `CHROMIUM` เป็นที่อยู่ของเบราว์เซอร์ (เช่น Chrome ในเครื่อง Windows)
บน Windows ให้ส่งโฟลเดอร์แบบ `C:\...` (ทับขวา) ให้เทสต์ ไม่ใช่ `/c/...`
