# PROJECT CONSTITUTION — MESUB AI

Version: 1.2
Status: Project Source of Truth
Scope: Web + LINE OA

## 1. Project Identity
ชื่อโครงการคือ Mesub AI (เดิม KhaoKho AI)
Mesub AI เป็นแพลตฟอร์มกลางสำหรับตัวแทน/นายหน้าอสังหาริมทรัพย์ ให้ผู้ใช้แต่ละรายสามารถนำทรัพย์ของตนเองเข้าระบบ และให้ระบบช่วยจัดการข้อมูล เผยแพร่ และรับ Lead ผ่าน Web + LINE OA

## 2. Core Principle
Mesub AI ไม่ใช่เว็บประกาศของนายหน้ารายเดียว แต่เป็นระบบ Multi-Agent / Multi-Tenant
ข้อมูลทรัพย์ทุกชิ้นต้องผูกกับเจ้าของข้อมูล (Agent/Owner) อย่างชัดเจน และผู้ใช้แต่ละรายจัดการได้เฉพาะข้อมูลที่ตนมีสิทธิ์

## 3. Core Flow
Agent สมัคร/เข้าสู่ระบบ
→ เพิ่มข้อมูลทรัพย์ + รูปภาพ
→ AI ช่วยอ่าน จัดโครงสร้าง และเขียนรายละเอียด
→ Agent ตรวจสอบและยืนยัน
→ ระบบ Publish ขึ้นเว็บไซต์
→ ลูกค้าค้นหา/ดูทรัพย์ผ่าน Web หรือสนทนาผ่าน LINE OA
→ AI ช่วยค้นหา/จับคู่ทรัพย์
→ ระบบเก็บ Lead และ Route กลับไปยัง Agent เจ้าของทรัพย์
→ Agent Follow-up

## 4. Property Ownership & Permissions
- Property ทุกชิ้นต้องมี owner_id / agent_id
- Agent แก้ไข ซ่อน ปิดการขาย หรือลบทรัพย์ของตนเองได้
- Agent ต้องไม่สามารถเข้าถึงข้อมูลหลังบ้านของ Agent รายอื่นโดยไม่ได้รับสิทธิ์
- Admin มีสิทธิ์ดูแล ตรวจสอบ ระงับ หรือจัดการข้อมูลตามกติกาแพลตฟอร์ม

## 5. Property Lifecycle
สถานะหลักของทรัพย์:
Draft → Pending Review/Confirmation → Published → Sold/Inactive

ก่อน Publish ต้องมีขั้นตอนให้ Agent ตรวจสอบและยืนยันข้อมูลที่ AI ประมวลผล เพื่อลดความผิดพลาดของราคา พิกัด รายละเอียด และข้อมูลสำคัญ

## 6. Free Plan & Monetization
- ผู้สมัครใหม่เริ่มที่ Free Plan
- Free Plan มีสิทธิ์เปิดใช้งานได้สูงสุด 3 Active Properties พร้อมกัน
- Sold/Inactive ไม่นับรวมในโควตา Active
- เมื่อต้องการ Active Property รายการที่ 4 ต้อง Upgrade เป็นแพ็กเกจเสียเงิน
- ระบบต้องออกแบบ Plan / Subscription / Usage / Quota / Billing / Payment ไว้ตั้งแต่ V1 แม้ช่วงเปิดตัวอาจยังไม่เปิดรับเงินจริง
- ราคาของแพ็กเกจยังไม่ล็อกจนกว่าจะมีข้อมูลต้นทุนและพฤติกรรมการใช้งานจริง

## 7. Usage Metering
ฟีเจอร์ที่มีต้นทุนต้องวัด Usage ได้ โดยเฉพาะ:
- จำนวน Active Properties
- จำนวน/พื้นที่จัดเก็บรูปภาพ
- จำนวนครั้งหรือปริมาณการใช้ AI
- จำนวน Lead
- Traffic/การเข้าชมที่จำเป็นต่อการคำนวณต้นทุน

## 8. AI Rules
AI มีหน้าที่ช่วย ไม่ใช่เป็นแหล่งข้อมูลจริงสูงสุด
- AI ช่วยแยกข้อมูลจากข้อความและรูป
- AI ช่วยเขียนคำอธิบาย/Content
- AI ช่วยค้นหาและจับคู่ทรัพย์
- ห้าม AI สร้างข้อมูลสำคัญที่ไม่มีหลักฐาน เช่น ราคา พิกัด กรรมสิทธิ์ หรือเงื่อนไขการขาย
- ข้อมูลสำคัญต้องอ้างอิงจากข้อมูลที่ Agent ให้และ/หรือข้อมูลที่ระบบยืนยันได้

## 9. Web
เว็บไซต์เป็น Public Property Marketplace + Agent Platform
ต้องรองรับ:
- หน้าแสดง/ค้นหาทรัพย์
- หน้ารายละเอียดทรัพย์
- บัญชี Agent
- เพิ่ม/แก้ไขทรัพย์
- Upload รูป
- Dashboard
- Lead
- Plan/Quota
- Billing/Payment readiness

## 10. LINE OA
LINE OA เป็นช่องทางสนทนาของลูกค้าและอาจใช้เป็นช่องทางช่วยงาน Agent ตามที่กำหนดใน Blueprint
เป้าหมายหลัก:
- ตอบคำถามลูกค้า
- ค้นหา/แนะนำทรัพย์
- เก็บความต้องการ
- เก็บ Lead
- ส่งต่อ Lead ไป Agent เจ้าของทรัพย์อย่างถูกต้อง

## 11. Lead Routing
Lead ที่เกิดจาก Property ต้องสามารถ Trace กลับไปยัง Property และ Agent เจ้าของทรัพย์
ระบบต้องป้องกันการส่ง Lead ผิด Agent และเก็บประวัติที่จำเป็นต่อการติดตามงาน

## 12. Trust & Safety
ระบบต้องเตรียมรับปัญหา:
- ทรัพย์ซ้ำ
- ทรัพย์ปลอม
- รูป/ข้อมูลของผู้อื่น
- Spam
- Agent ที่ไม่เหมาะสม
V1 อย่างน้อยต้องมี Admin moderation และสถานะทรัพย์ที่ควบคุมการ Publish ได้ ส่วน Duplicate Detection / Verification ขั้นสูงเพิ่มภายหลังได้

## 13. V1 Priority
V1 เน้นให้ Flow หลักใช้งานจริงก่อน:
Agent → Property Upload → AI Processing → Confirm → Web Publish → Customer Web/LINE → AI Matching → Lead Routing → Agent

หลีกเลี่ยงฟีเจอร์ใหญ่ที่ยังไม่จำเป็นต่อ Flow นี้

## 14. Architecture Rule
การเลือก Technology Stack ต้องเน้น:
1. สร้างและดูแลง่าย
2. ต้นทุนเริ่มต้นต่ำ
3. รองรับการเติบโต
4. เปลี่ยน/ขยายบริการได้โดยไม่รื้อระบบหลัก
5. Security และแยกข้อมูลผู้ใช้เป็นพื้นฐาน ไม่ใช่ของเพิ่มทีหลัง

## 15. Change Control
เอกสารนี้คือ Source of Truth ของ Project Mesub AI
หากมีการเปลี่ยน Product Rule, Business Model, User Role, Core Flow หรือ Architecture Principle ต้องอัปเดต Constitution และเพิ่ม Version ก่อนให้ Codex/AI นำไปสร้างระบบ

---
Locked decisions as of 16 Aug 2026:
- Project name: Mesub AI
- Scope: Web + LINE OA
- Platform: Multi-Agent property platform
- Free Plan: 3 Active Properties
- Property #4 requires paid upgrade
- Billing/Payment architecture prepared from V1
