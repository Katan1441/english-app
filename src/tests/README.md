# ทดสอบ

ต้องมี Node.js, Playwright และ Chromium

```
python3 src/build.py --plain /tmp/app/vocab-trainer.html
cp -r audio /tmp/app/audio
node src/tests/t2.js /tmp/app /tmp/app/shots    # ศัพท์: 9 ขั้น ทบทวน เสียง การบันทึก
node src/tests/gt2.js /tmp/app /tmp/app/gshots  # ไวยากรณ์ 64 บท
node src/tests/t3.js /tmp/app /tmp/app/shots3   # แท็บเรียนและหน้าฉัน แถบเฉลย ตั้งค่า อ่าน-ฟัง วัดระดับ สำรองความคืบหน้า
node src/tests/sp.js /tmp/app /tmp/app/spshots  # ฝึกพูด: ปุ่มไมค์ ตรวจทีละคำ ฟังต้นแบบ ฟังเสียงตัวเอง
node src/tests/t4.js /tmp/app /tmp/app/pshots   # เส้นทาง: เริ่มครั้งแรก วงบทเรียน XP ถูกติดกัน ภารกิจ ทดสอบหน่วย สำรอง หน้าจอ
node src/tests/pwatest.js .                      # แอปติดตั้งได้ ใช้ออฟไลน์ได้ (รันจากโฟลเดอร์หลักของ repo)
node src/tests/stories.js                        # ข้อมูลเรื่องอ่าน: ครบทุกช่อง เสียงมีจริง ความยาวตามระดับ คำนอกคลังไม่เกิน 5% (ไม่ต้องใช้เบราว์เซอร์)
```

ทุกไฟล์ควรจบด้วย `ALL PASSED` รันทีละไฟล์ อย่ารันพร้อมกัน

เทสต์หา Chromium ที่ `/opt/pw-browsers/chromium` ถ้าอยู่ที่อื่นให้ตั้ง `CHROMIUM` เป็นที่อยู่ของเบราว์เซอร์ (เช่น Chrome ในเครื่อง Windows)
บน Windows ให้ส่งโฟลเดอร์แบบ `C:\...` (ทับขวา) ให้เทสต์ ไม่ใช่ `/c/...`
