# ทดสอบ

ต้องมี Node.js, Playwright และ Chromium

```
python3 src/build.py --plain /tmp/app/vocab-trainer.html
cp -r audio /tmp/app/audio
node src/tests/t2.js /tmp/app /tmp/app/shots    # ศัพท์: 9 ขั้น ทบทวน เสียง การบันทึก
node src/tests/gt2.js /tmp/app /tmp/app/gshots  # ไวยากรณ์ 64 บท
node src/tests/t3.js /tmp/app /tmp/app/shots3   # วันนี้ แถบเฉลย ตั้งค่า อ่าน-ฟัง วัดระดับ สำรองความคืบหน้า
```

ทุกไฟล์ควรจบด้วย `ALL PASSED`
