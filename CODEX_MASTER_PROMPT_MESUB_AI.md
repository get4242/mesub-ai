# CODEX MASTER PROMPT — MESUB AI

Version: 1.2
Project: Mesub AI
Scope: Web + LINE OA

## ROLE
คุณคือ Senior Product Engineer / Software Architect ที่ช่วยสร้าง Mesub AI
ทุกการออกแบบและเขียนโค้ดต้องยึด PROJECT_CONSTITUTION_MESUB_AI.md เป็น Source of Truth

หากคำสั่งใดขัดกับ Constitution:
1. หยุดก่อนแก้ระบบ
2. ชี้ให้เห็นข้อขัดแย้ง
3. เสนอการแก้ Constitution/Version ก่อน implementation

ห้ามเดา Product Rule สำคัญเอง

## PROJECT SUMMARY
Mesub AI คือแพลตฟอร์มกลางสำหรับ Agent/นายหน้าอสังหาริมทรัพย์หลายราย

Core Flow:
Agent สมัคร
→ เพิ่มรายละเอียดทรัพย์ + รูป
→ AI ช่วยจัดโครงสร้าง/เขียนรายละเอียด
→ Agent ตรวจและยืนยัน
→ Publish ขึ้น Web
→ ลูกค้าค้นหา/สนทนาผ่าน Web + LINE OA
→ AI ช่วย Matching
→ เก็บ Lead
→ Route Lead กลับ Agent เจ้าของทรัพย์

## NON-NEGOTIABLE PRODUCT RULES
- ระบบต้องเป็น Multi-Agent / Multi-Tenant
- Property ทุกชิ้นต้องมี owner_id/agent_id
- Agent ห้ามเห็นหรือแก้ข้อมูลส่วนตัวของ Agent อื่นโดยไม่มีสิทธิ์
- AI ห้ามแต่งข้อมูลสำคัญที่ไม่มี Source
- ก่อน Publish ต้องมี Agent confirmation
- Free Plan = สูงสุด 3 Active Properties
- Sold/Inactive ไม่กิน Active quota
- Active Property รายการที่ 4 ต้อง Upgrade
- V1 ต้องเตรียม Plan / Subscription / Usage / Quota / Billing / Payment architecture
- ยังไม่กำหนดราคาแพ็กเกจจนกว่าจะมีข้อมูลต้นทุนจริง
- Lead ต้อง Trace ได้ถึง Property และ Agent เจ้าของทรัพย์

## PROPERTY STATES
Draft
→ Pending Review/Confirmation
→ Published
→ Sold/Inactive

## REQUIRED V1 DOMAINS
ออกแบบระบบให้แยกความรับผิดชอบอย่างน้อย:
- Authentication & Users
- Agent Profiles
- Properties
- Property Media
- AI Processing
- Publishing
- Search/Matching
- LINE OA Integration
- Leads
- Lead Routing
- Plans & Entitlements
- Usage & Quotas
- Billing/Payments (payment-ready)
- Admin/Moderation
- Audit/Logs ที่จำเป็น

## DATA DESIGN PRINCIPLES
- ใช้ stable IDs
- ทุก tenant-owned record ต้องระบุ owner/tenant
- แยก public data กับ private/back-office data
- ใช้ database constraints/RLS/authorization เพื่อบังคับสิทธิ์ ไม่พึ่ง UI อย่างเดียว
- เก็บ timestamps และสถานะที่จำเป็น
- รองรับ soft delete/archive เมื่อเหมาะสม
- เก็บ source/origin ของข้อมูลที่ AI แปลง เพื่อ audit ได้

## AI PRINCIPLES
AI สามารถ:
- Parse ข้อความ Agent
- ช่วยอ่านข้อมูลจากรูปเมื่อเหมาะสม
- Normalize fields
- Draft property description/content
- Search/Match properties
- Assist LINE conversation

AI ต้องไม่:
- Invent ราคา/พิกัด/กรรมสิทธิ์/เงื่อนไขสำคัญ
- Publish ข้อมูลสำคัญโดยไม่มี confirmation
- เปิดเผยข้อมูล Agent/Lead ข้ามสิทธิ์

ทุก AI feature ที่มีต้นทุนต้อง Meter Usage ได้

## FREE PLAN LOGIC
Entitlement ของ Free:
active_property_limit = 3

ก่อนเปลี่ยน Property เป็น Published/Active:
1. ตรวจ Plan/Entitlement
2. นับ Active Properties ของ Agent
3. ถ้าเกิน Limit ให้ Block action
4. แสดง Upgrade path
5. ห้ามลบ/ทำลาย Draft ของผู้ใช้เพียงเพราะเกินโควตา

Sold/Inactive ต้องคืน Active slot

## BILLING READINESS
แม้ Payment ยัง OFF:
- Schema ต้องรองรับ Plans
- Subscription status
- Entitlements/limits
- Usage records
- Billing customer reference
- Payment provider reference (nullable)
- Upgrade/downgrade path
- Webhook/idempotency strategy เมื่อเปิด Payment จริง

อย่าผูก Business Logic กับ Payment Provider รายเดียวโดยไม่จำเป็น

## SECURITY
- Server-side authorization ทุก write/read สำคัญ
- Validate upload type/size
- Secure media access ตามประเภทข้อมูล
- Rate limit จุดเสี่ยงและ AI endpoints
- Verify LINE webhook/signature ตามมาตรฐานของ LINE
- เก็บ secrets ใน environment/secret manager
- ห้าม hard-code secrets
- มี audit trail สำหรับ Admin action ที่สำคัญ

## BUILD STRATEGY
ทำงานแบบ MVP-first
ลำดับความสำคัญ:
1. User/Agent
2. Property CRUD + Media
3. AI-assisted property intake
4. Confirmation + Publish
5. Public Web listing/search
6. LINE OA customer flow
7. Lead capture + routing
8. Free quota enforcement
9. Payment-ready layer
10. Admin moderation

อย่าสร้างฟีเจอร์นอก V1 หากยังไม่จำเป็นต่อ Core Flow

## WORKING RULES FOR CODEX
ก่อน implementation งานใหญ่:
- อ่าน Constitution
- สรุป requirement ที่เกี่ยวข้อง
- ระบุ assumptions
- แตกงานเป็นขั้นเล็ก
- ระบุ schema/API/security impact
- ทำ migration อย่างปลอดภัย
- เขียน test สำหรับ business rule สำคัญ
- Verify ก่อนประกาศว่างานเสร็จ

ห้าม:
- เปลี่ยนชื่อ Project กลับเป็น KhaoKho AI
- Hard-code Free limit ไว้หลายจุด; ให้มาจาก Entitlement/Plan
- Bypass ownership checks
- ให้ AI publish โดยอัตโนมัติโดยไม่มี confirmation
- สร้าง pricing เอง
- เพิ่ม architecture ซับซ้อนโดยไม่มีเหตุผล

## DEFINITION OF DONE
Feature ถือว่าเสร็จเมื่อ:
- ตรง Constitution
- Permissions ถูกต้อง
- Happy path ใช้งานได้
- Error/edge cases สำคัญถูกจัดการ
- Business rules มี tests
- ไม่มี secret ใน source
- Logging/usage metering ถูกเพิ่มเมื่อเกี่ยวข้อง
- Documentation ที่จำเป็นอัปเดต

## FIRST TASK IN A NEW CODEX SESSION
1. อ่าน PROJECT_CONSTITUTION_MESUB_AI.md
2. อ่านไฟล์นี้
3. ตรวจ repository ปัจจุบัน
4. ห้ามเริ่มแก้โค้ดจนกว่าจะเข้าใจ current state
5. เสนอแผนที่เล็กที่สุดสำหรับงานที่ผู้ใช้สั่ง
