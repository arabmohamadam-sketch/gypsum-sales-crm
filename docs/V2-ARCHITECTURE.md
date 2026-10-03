# V2 Architecture

## معماری مرجع سیستم فروش و توزیع گچ آهوان

> این سند مرجع اصلی توسعه V2 است.
>
> V1 نباید بازنویسی یا تخریب شود.
> تمام توسعه‌های جدید باید روی branch `v2` انجام شوند.

---

# 1. هدف V2

هدف V2 تبدیل CRM فعلی به هسته مرکزی یک اکوسیستم یکپارچه برای:

* مدیریت مشتریان
* ثبت سفارش
* تأیید سفارش
* مدیریت محموله
* اعلام بار
* صدور حواله
* بارگیری
* ارسال
* تحویل
* گزارش‌گیری
* کنترل مرکزی
* Offline / Sync
* Audit و تاریخچه عملیات

است.

معماری باید به گونه‌ای باشد که چند Application مختلف بتوانند از یک هسته اطلاعاتی مشترک استفاده کنند.

---

# 2. اصل طلایی معماری

یک دیتابیس مرکزی PostgreSQL در Supabase وجود دارد.

```text
                    Supabase / PostgreSQL
                            │
                    Shared Domain Model
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
       CRM              Load Announcement   Waybill
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                       Loading / Delivery
```

هیچ Application نباید برای داده‌های اصلی خود دیتابیس مستقل و جداگانه ایجاد کند.

---

# 3. Application های نهایی

اکوسیستم نهایی شامل پنج Application است:

## 3.1 نرم‌افزار گچ آهوان

برای مشتری / نماینده فروش

قابلیت‌های اصلی:

* ثبت‌نام مشتری
* مشاهده محصولات
* ثبت سفارش
* مشاهده وضعیت سفارش
* مشاهده تاریخچه سفارش
* پیگیری ارسال

---

## 3.2 CRM

نسخه فعلی CRM پایه این سیستم است.

قابلیت‌های اصلی:

* مشتریان
* سفارش‌ها
* تماس‌ها
* پیگیری‌ها
* بازدیدها
* اهداف
* گزارش‌ها
* مدیریت منطقه
* تأیید سفارش
* مدیریت فروش

V1 حفظ می‌شود و V2 روی آن توسعه پیدا می‌کند.

---

## 3.3 نرم‌افزار اعلام بار

برای مدیریت محموله‌ها و آماده‌سازی ارسال.

قابلیت‌های اصلی:

* مشاهده سفارش‌های تأییدشده
* ایجاد Shipment
* انتخاب خودرو
* انتخاب راننده
* مقدار بار
* نوع بار
* ثبت هدیه
* وضعیت بار
* اعلام بار
* ارسال شده
* لغو شده

---

## 3.4 نرم‌افزار صدور حواله

برای کاربر مسئول حواله.

قابلیت‌های اصلی:

* دریافت محموله تأییدشده
* صدور حواله
* شماره‌گذاری اتمیک
* مشاهده تاریخچه
* اصلاح کنترل‌شده
* لغو حواله
* چاپ / خروجی حواله

---

## 3.5 پنل مدیریت مرکزی

برای کنترل کل سیستم:

* کاربران
* نقش‌ها
* مجوزها
* مناطق
* محصولات
* خودروها
* رانندگان
* تنظیمات
* Audit
* گزارش‌های مدیریتی
* کنترل Sync
* تعارضات داده

---

# 4. تکنولوژی

## Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS

## Backend / Database

* Supabase
* PostgreSQL
* Supabase Auth
* PostgreSQL Functions
* PostgreSQL Transactions
* Row Level Security

## Desktop

* Tauri

## Mobile

* Android packaging / Tauri-compatible architecture

## Offline

Local Database + Sync Queue

---

# 5. اصل حفظ V1

V1 نقطه مرجع پایدار است.

```text
desktop-mobile
      │
      └── v1-baseline
```

V2:

```text
v2
```

تمام توسعه‌های جدید فقط روی V2 انجام می‌شوند.

هیچ Migration جدیدی نباید اطلاعات V1 را حذف کند مگر اینکه بعداً Migration رسمی و کنترل‌شده برای آن طراحی شود.

---

# 6. مدل مفهومی کسب‌وکار

زنجیره اصلی:

```text
Customer
    ↓
Order
    ↓
Regional Approval
    ↓
Sales Approval
    ↓
Shipment
    ↓
Waybill
    ↓
Loading
    ↓
Sent
    ↓
Delivery
```

---

# 7. تفاوت Order و Shipment

Order درخواست تجاری مشتری است.

Shipment اجرای فیزیکی آن سفارش است.

این دو نباید با یک Entity ترکیب شوند.

مثال:

```text
Order
18 ton
│
├── Shipment 1
│   └── 10 ton
│
└── Shipment 2
    └── 8 ton
```

---

# 8. Order Item

هر محصول یک Order Item مستقل است.

مثال:

```text
Order #10025

Item 1
گچ سفید
10 ton

Item 2
گچ میکرونیزه
5 ton

Item 3
گچ پلیمری
2 ton
Gift
```

Gift یک Order Item واقعی است و از جریان اصلی خارج نمی‌شود.

---

# 9. Gift

فیلدهای اصلی:

```text
is_gift
gift_reason
gift_note
gift_approved_by
gift_approved_at
```

Gift باید در تمام مراحل سفارش، Shipment و Waybill قابل شناسایی باشد.

---

# 10. تقسیم یک Order Item

یک Order Item می‌تواند در چند Shipment اجرا شود.

مثال:

```text
Order Item
گچ سفید = 18 ton

        ┌── Shipment A = 10 ton
        │
18 ton ─┤
        │
        └── Shipment B = 8 ton
```

مقدار تخصیص‌یافته نباید از مقدار سفارش بیشتر شود.

این قانون باید در Backend / Database نیز کنترل شود.

---

# 11. مقدارهای اجرایی

سیستم باید بتواند این مقدارها را کنترل کند:

```text
ordered_quantity
allocated_quantity
loaded_quantity
delivered_quantity
remaining_quantity
```

قاعده:

```text
allocated_quantity <= ordered_quantity
loaded_quantity <= allocated_quantity
delivered_quantity <= loaded_quantity
```

استثنا فقط از طریق مسیر رسمی و مجاز سیستم قابل انجام است.

---

# 12. Waybill

حواله یک سند رسمی عملیاتی است.

هر قلم کالا که برای اجرا ارسال می‌شود باید حواله مستقل خود را داشته باشد.

مثال:

```text
Order #10025

گچ سفید 10 ton
→ Waybill 12501

گچ میکرونیزه 5 ton
→ Waybill 12502

گچ پلیمری Gift 2 ton
→ Waybill 12503
```

---

# 13. Waybill Number

شماره حواله:

* توسط PostgreSQL ایجاد می‌شود.
* در Frontend تولید نمی‌شود.
* با `MAX + 1` تولید نمی‌شود.
* باید Unique باشد.
* عملیات صدور باید Atomic باشد.
* در برابر صدور همزمان مقاوم باشد.

مثال:

```text
User A → 12501
User B → 12502
```

حتی اگر هر دو همزمان روی دو دستگاه اقدام کنند.

---

# 14. قانون لغو حواله

حواله حذف فیزیکی نمی‌شود.

مثال:

```text
12501
Issued
   ↓
Edited
   ↓
Cancelled
```

شماره 12501 در تاریخچه باقی می‌ماند.

حواله لغوشده باید حداقل داشته باشد:

```text
cancelled_by
cancelled_at
cancel_reason
```

شماره قبلی نباید به صورت عادی دوباره استفاده شود.

---

# 15. تاریخچه Waybill

برای عملیات مهم History نگهداری می‌شود.

نمونه:

```text
10:15
Created

10:20
Issued
By: User X

11:40
Edited
Reason: Quantity change

12:10
Cancelled
By: Sales Manager
Reason: Vehicle change
```

---

# 16. Status Separation

یک Status بزرگ برای کل سیستم استفاده نمی‌شود.

مفاهیم زیر مستقل هستند:

```text
order_status
approval_status
fulfillment_status
delivery_status
```

در Shipment نیز Status مستقل وجود دارد.

---

# 17. Approval Workflow

فرآیند استاندارد:

```text
Customer
   ↓
Order Created
   ↓
Regional Manager
   ↓
Approved / Rejected
   ↓
Sales Manager
   ↓
Approved / Rejected
   ↓
Ready for Fulfillment
```

هر Approval باید ثبت کند:

```text
who
when
status
reason
notes
```

---

# 18. Shipment

Shipment اجرای فیزیکی بخشی از سفارش است.

فیلدهای کلیدی:

```text
id
company_id
order_id
shipment_number
status
vehicle_id
driver_id
shipment_date
notes
created_by
created_at
updated_at
```

---

# 19. Vehicle

Vehicle موجودیت مستقل است.

اطلاعات اصلی:

```text
plate_number
vehicle_type
owner_name
owner_phone
is_active
```

در زمان Shipment اطلاعات مهم خودرو می‌تواند به صورت Snapshot نیز ذخیره شود.

---

# 20. Driver

Driver موجودیت مستقل است.

اطلاعات اصلی:

```text
first_name
last_name
phone
national_id
is_active
```

اطلاعات هویتی عملیاتی مورد نیاز Shipment نیز می‌تواند Snapshot شود.

---

# 21. Snapshot Principle

اطلاعاتی که برای سند تجاری/عملیاتی مهم هستند، نباید فقط از جدول Master خوانده شوند.

مثلاً در زمان حواله ممکن است نام راننده بعداً تغییر کند.

بنابراین سند باید Snapshot اطلاعات مهم زمان عملیات را حفظ کند.

---

# 22. Loading

جریان بارگیری:

```text
Waybill Issued
      ↓
Loading Pending
      ↓
Loading Confirmed
      ↓
Loaded
```

بارگیری نباید بتواند حواله نامعتبر یا لغوشده را تأیید کند.

---

# 23. Delivery

بعد از ارسال:

```text
Sent
 ↓
Delivery Pending
 ↓
Delivered
```

در صورت تحویل ناقص:

```text
Partially Delivered
```

اطلاعات تحویل باید شامل مقدار واقعی تحویل‌شده باشد.

---

# 24. Concurrency

چند کاربر می‌توانند همزمان عملیات انجام دهند.

سیستم باید برای این موارد مقاوم باشد:

* ثبت همزمان سفارش
* تأیید همزمان
* ایجاد Shipment همزمان
* تخصیص مقدار همزمان
* صدور حواله همزمان
* Sync همزمان

راهکار:

```text
Database Transaction
+
Unique Constraint
+
Atomic Operation
+
Row Lock where required
+
Idempotency
```

---

# 25. Idempotency

هر عملیات حساس باید Idempotency داشته باشد.

عملیات مهم:

```text
Create Order
Approve Order
Create Shipment
Issue Waybill
Confirm Loading
Confirm Delivery
```

در صورت Retry یا Double Click نباید یک عملیات دو بار اجرا شود.

---

# 26. Offline First

تمام Application ها باید قابلیت Offline داشته باشند.

ساختار:

```text
              Supabase
                  ↑
                  │
              Sync Engine
                  ↑
                  │
              Sync Queue
                  ↑
                  │
              Local DB
                  ↑
                  │
               UI/App
```

کاربر در حالت Offline بتواند عملیات مجاز خود را انجام دهد.

---

# 27. Local Identity

هر عملیات Offline یک شناسه محلی یکتا دارد:

```text
client_operation_id
```

هر موجودیت نیز باید بتواند شناسه پایدار Client داشته باشد.

---

# 28. Sync States

Sync Operation:

```text
pending
syncing
synced
failed
conflict
```

در خطا:

```text
failed
 ↓
retry
 ↓
syncing
 ↓
synced
```

---

# 29. Conflict Resolution

سیستم نباید در صورت Conflict به صورت کورکورانه اطلاعات محلی را روی سرور بنویسد.

باید مشخص باشد:

```text
local version
server version
operation
entity
timestamp
user
```

سپس Resolution انجام شود.

---

# 30. Waybill Number در Offline

شماره رسمی حواله در Offline توسط Client تولید نمی‌شود.

در حالت Offline:

```text
Waybill Number = Pending
```

بعد از اتصال:

```text
Local Operation
       ↓
Sync
       ↓
PostgreSQL Transaction
       ↓
Official Waybill Number
       ↓
Synced
```

این قانون برای جلوگیری از Duplicate Number ضروری است.

---

# 31. Audit

عملیات حساس باید قابل ردیابی باشند:

```text
CREATE
UPDATE
APPROVE
REJECT
CANCEL
ISSUE
LOAD
SEND
DELIVER
SYNC
```

Audit باید مشخص کند:

```text
who
what
when
entity
entity_id
old data
new data
reason
```

---

# 32. Security

امنیت مبتنی بر:

```text
Authentication
+
Role
+
Permission
+
Company
+
Region
+
RLS
```

کاربر فقط باید داده‌ای را ببیند که مجوز دیدن آن را دارد.

---

# 33. Shared Domain

تمام Application ها باید از Domain Model مشترک استفاده کنند.

نباید یک مفهوم مثل Order در پنج Application با ساختارهای متناقض تعریف شود.

```text
Order
OrderItem
Shipment
ShipmentItem
Waybill
WaybillItem
Loading
Delivery
```

همه باید یک مدل مرکزی داشته باشند.

---

# 34. Data Ownership

Supabase / PostgreSQL:

```text
Source of Truth
```

Local DB:

```text
Offline Cache
+
Pending Operations
```

Local DB منبع نهایی اطلاعات نیست.

---

# 35. Database Rules

قوانین مهم باید تا حد امکان در Database نیز enforce شوند.

نمونه:

```text
Uniqueness
Foreign Keys
Check Constraints
Transactions
Locks
Authorization/RLS
```

تنها به Validation سمت UI اعتماد نمی‌کنیم.

---

# 36. Soft Delete

اسناد تجاری مهم مانند:

```text
Order
Shipment
Waybill
Loading
Delivery
```

نباید به صورت عادی Hard Delete شوند.

حذف باید با وضعیت یا Soft Delete کنترل شود.

---

# 37. تاریخ و زمان

Database:

```text
UTC / TIMESTAMPTZ
```

UI:

```text
Jalali
```

تبدیل تاریخ فقط در Presentation Layer انجام شود.

---

# 38. Migration Strategy

V2 باید به صورت Incremental روی V1 ساخته شود.

اصل:

```text
V1 Schema
   ↓
V2 Migration
   ↓
V2 Schema
```

نه:

```text
DROP DATABASE
REBUILD
```

تمام Migration ها باید شماره‌گذاری و مستقل باشند.

---

# 39. ساختار کلی Domain

پیشنهاد معماری نرم‌افزار:

```text
src/
├── app/
├── components/
├── lib/
│   ├── domain/
│   │   ├── orders/
│   │   ├── approvals/
│   │   ├── shipments/
│   │   ├── waybills/
│   │   ├── loading/
│   │   └── deliveries/
│   │
│   ├── offline/
│   ├── sync/
│   ├── permissions/
│   ├── audit/
│   └── supabase/
│
└── types/
```

ساختار واقعی باید ابتدا با V1 تطبیق داده شود و فایل‌های موجود بدون دلیل بازنویسی نشوند.

---

# 40. اولویت توسعه

ترتیب رسمی توسعه V2:

```text
1. Architecture
2. Database Foundation
3. Order Workflow
4. Approval
5. Shipment
6. Quantity Allocation
7. Waybill
8. Loading
9. Delivery
10. Audit
11. Security / RLS
12. Offline Database
13. Sync Engine
14. Conflict Resolution
15. CRM UI
16. Load Announcement UI
17. Waybill UI
18. Integration Testing
```

---

# 41. قانون توسعه با Cursor

Cursor نباید به صورت مستقل معماری سیستم را تغییر دهد.

کد باید بر اساس معماری این سند ایجاد شود.

تغییر معماری فقط پس از تصمیم معماری جدید انجام می‌شود.

---

# 42. قانون توسعه دستی

در صورت ایجاد فایل جدید:

1. مسیر فایل مشخص باشد.
2. نام فایل مشخص باشد.
3. کل محتوای فایل ارائه شود.
4. وابستگی‌های جدید مشخص شوند.
5. دستور تست مشخص باشد.

هیچ فایل مهمی با محتوای ناقص ایجاد نشود.

---

# 43. قانون تست

هر Feature جدید باید:

```text
Build
+
Type Check
+
Database Migration
+
Business Rule Test
+
UI Test
```

را طی کند.

---

# 44. Definition of Done

یک Feature زمانی Done است که:

* کد ساخته شده باشد.
* Migration اجرا شده باشد.
* TypeScript بدون خطای مربوطه باشد.
* Business Rules تست شده باشند.
* مسیر Offline بررسی شده باشد، در صورت مرتبط بودن.
* Permission بررسی شده باشد.
* Audit بررسی شده باشد.
* V1 آسیب ندیده باشد.

---

# 45. وضعیت فعلی پروژه

در زمان ایجاد این سند:

```text
Current Branch:
v2

Base Commit:
1ac430e

V1 Tag:
v1-baseline

Working Tree:
Clean

Remote:
origin/v2
```

این وضعیت مرجع شروع توسعه V2 است.
