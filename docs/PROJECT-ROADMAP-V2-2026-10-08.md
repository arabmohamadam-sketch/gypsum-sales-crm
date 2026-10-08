# نقشه راه پروژه Ahuan / Gypsum Sales CRM — V2

> آخرین به‌روزرسانی: 2026-10-08  
> این فایل مرجع ادامه پروژه بعد از بازگشت است.  
> اصل مهم: **V1 نباید تحت تأثیر Workflow یا Permissionهای جدید V2 قرار بگیرد.**

---

## 1) مشخصات پروژه

- Repository: `arabmohamadam-sketch/gypsum-sales-crm`
- Backend: Node.js + Next.js + Supabase
- Frontend: Next.js 16.3.1 / Turbopack
- Branch فعلی کار: `v2-operational-fulfillment`
- Branch اصلی توسعه V2: `v2`
- Baseline V1: tag `v1-baseline`
- هدف معماری: Desktop EXE + Android APK + Web، با قابلیت Offline-first و Sync
- قانون توسعه: هر مرحله پس از تست محلی باید یک Safe Point روی GitHub داشته باشد.

---

## 2) وضعیت دقیق پروژه در پایان 2026-10-08

آخرین Commit روی branch عملیاتی:

```
0e80ed9a705406465708a7406429bcb5d070300e
fix: narrow nullable order relation results
```

آخرین وضعیت تأییدشده روی سیستم:

- `npm run lint` → PASS، بدون Error، فقط 7 Warning
- `npm run build` → PASS
- TypeScript → PASS
- Static pages → 32/32
- `npx supabase db push` برای Migration 50 → PASS

Warningهای باقی‌مانده فعلاً مانع Build نیستند:

- 3 warning در `app/orders/view/page.tsx`
- 1 warning dependency در `app/waybills/page.tsx`
- 2 warning در `scripts/prepare-tauri-static-v2.mjs`
- 1 warning مربوط به `<img>` در Sidebar

---

## 3) مرز V1 و V2

Migration:

```
20261007000047_v2_order_workflow_version_boundary.sql
```

قواعد:

- سفارش‌های قدیمی → `workflow_version = v1`
- سفارش‌های جدید V2 → `workflow_version = v2`
- مقدار پیش‌فرض DB → `v1`
- تغییر `workflow_version` بعد از ایجاد سفارش ممنوع
- V2 باید از Draft شروع شود.
- V2 فقط پس از تأیید نهایی می‌تواند Confirmed شود.
- Approval row برای V2 فعال است.

**هیچ منطق جدیدی نباید رفتار V1 را تغییر دهد.**

---

## 4) Workflow تأیید سفارش V2

نیاز نهایی:

### مدیر منطقه
صف اقدام او شامل:

- سفارش‌های در انتظار تأیید منطقه
- Draftهای متعلق به حوزه خودش
- سفارش‌های برگشتی/عدم تأیید شده از مدیر فروش که نیاز به اصلاح دارند

محدوده:

- فقط مشتریان متعلق به همان مدیر منطقه

### مدیر فروش
فقط:

- سفارش‌های نهایی در انتظار تأیید مدیر فروش

صف Sidebar باید فقط تعداد مربوط به همان مدیر را نشان دهد.

Route:

```
/orders/approvals
```

---

## 5) تغییر مهم معماری: نرم‌افزار حواله‌نویسی مستقل

تصمیم نهایی گرفته‌شده در پایان امروز:

**حواله‌نویس نباید کاربر عملیاتی CRM باشد.**

معماری هدف:

```
CRM
├─ مدیر کل
├─ مدیر فروش
├─ مدیر منطقه
├─ کارشناس فروش
└─ کارمند اداری

        │
        ▼

Shipment / داده عملیاتی

        │
        ▼

نرم‌افزار مستقل حواله‌نویسی
└─ حواله‌نویس
```

حواله‌نویس باید Backend/Supabase مشترک داشته باشد، ولی UI و محیط کاری مستقل داشته باشد.

بنابراین:

- به `orders.view` در CRM نیاز ندارد.
- به تنظیمات CRM نیاز ندارد.
- نباید برای حل مشکلات UI او دسترسی CRM باز شود.
- Role مخصوص `waybill_writer` که امروز برای تست داخل CRM ساخته شد، **راه‌حل نهایی نیست** و بعداً باید در معماری مستقل بازبینی شود.

---

## 6) Migrationهای مرتبط با Shipment / Waybill

### Migration 49

```
20261008000049_v2_operational_waybill_and_loading_quantity.sql
```

هدف:

- رفتار Waybill قدیمی V1 حفظ شود.
- Waybill V2 از Shipment ساخته شود.
- مقدار عملیاتی Waybill از Order Item مستقل باشد.
- جدول `loading_items` برای مقدار واقعی بارگیری ایجاد شده است.
- برنامه منطقه‌ای V2 باید بر پایه مقدار واقعی `loading_items.tonnage` باشد.
- برای Waybill V2 مقدار بیشتر از مقدار Shipment allocation مجاز است، چون مقدار عملیاتی حواله عمداً مستقل تعریف شده است.

Migration 49 روی Remote اعمال شده و PASS است.

### Migration 50

```
20261008000050_v2_waybill_writer_role_and_rls.sql
```

کارهای فعلی:

- Role غیرسیستمی `waybill_writer`
- Permissionهای Waybill
- RLS جداگانه برای Waybill/Waybill Items
- V1 rows با `shipment_id IS NULL` حفظ می‌شوند.
- V2 rows با Permissionهای عملیاتی کنترل می‌شوند.
- یک Waybill فعال V2 برای هر Shipment
- Waybill لغوشده می‌تواند برای Reissue دوباره استفاده شود.

Migration 50 روی Remote اعمال شده و PASS است.

**قبل از Merge به `v2` باید تصمیم نهایی درباره نقش حواله‌نویس مستقل بازبینی شود.**

---

## 7) وضعیت کد Waybill V2

### `src/lib/types/waybill.ts`

اضافه شده:

- `shipment_id` در Waybill
- `CreateV2WaybillFromShipmentInput`
- `UpdateWaybillItemInput`
- `V2ShipmentForWaybill`
- `shipment_item_id` در CreateWaybillItemInput

### `src/lib/services/waybills.ts`

وضعیت:

- Waybill V1 قدیمی همچنان از مسیر قبلی استفاده می‌کند.
- برای سفارش V2، `create()` مستقیم از Order مسدود شده است.
- V2 باید از Shipment آماده ساخته شود.
- `getAssignedShipments()`
- `createV2FromShipment()`
- `updateV2Item()`
- `issueV2()`

### UI

```
/waybills
/waybills/view?id=...
```

قابلیت‌های آزمایشی:

- نمایش Shipmentهای آماده
- ساخت Draft Waybill از Shipment
- ویرایش تعداد اقلام در Draft V2
- ذخیره مقدار جدید
- صدور Waybill V2

---

## 8) مشکل Console که امروز بررسی شد

در صفحه حواله‌ها، حساب حواله‌نویس برای خواندن Orderهای مربوط به Waybillهای قدیمی خطا می‌گرفت:

```
PGRST116
HTTP 406
Cannot coerce the result to a single JSON object
The result contains 0 rows
```

علت:

- حواله‌نویس مجوز مشاهده Order ندارد.
- صفحه Waybill از `.single()` در `ordersService.getById()` استفاده می‌کرد.

اصلاح انجام شد:

```
ordersService.getByIdIfVisible()
```

این متد در صورت نبود دسترسی/ردیف، `null` می‌دهد و صفحه Waybill سفارش غیرقابل‌مشاهده را نادیده می‌گیرد.

Build بعد از اصلاح PASS شد.

---

## 9) نکته unresolved درباره حساب حواله‌نویس در CRM

در پایان تست، هنگام ورود حساب حواله‌نویس به بخش حواله‌ها پیام:

```
دسترسی محدود است
شما مجوز مشاهده تنظیمات سیستم را ندارید.
```

دیده شد.

با توجه به تصمیم معماری مستقل بودن نرم‌افزار حواله‌نویسی، **نباید برای رفع این پیام Permissionهای CRM را به حواله‌نویس اضافه کنیم.**

در بازگشت، این قسمت باید در قالب تصمیم معماری حل شود، نه با باز کردن دسترسی بیشتر به CRM.

---

## 10) کار ناتمام بسیار مهم: Loading واقعی

در حال حاضر Trigger موجود هنگام Issue شدن V2 Waybill، Parent مربوط به Loading را ایجاد می‌کند؛ اما فرآیند کامل عملیاتی بارگیری هنوز تکمیل نشده است.

نیاز بعدی:

- ایجاد/مدیریت `loading_items`
- مقدار واقعی بارگیری برای هر Waybill Item
- امکان ثبت مقدار واقعی کمتر/بیشتر مطابق قواعد کسب‌وکار
- محاسبه تناژ واقعی
- Confirm Loading بر اساس `loading_items`
- اتصال مقدار واقعی بارگیری به Regional Plan
- ثبت تاریخ/کاربر/تاریخچه تغییرات
- کنترل همزمانی کاربران و Offline Sync

**این مرحله بعدی اصلی Backend + UI است.**

---

## 11) Shipment / اعلام بار

باید Workflow کامل Shipment نیز بررسی و تکمیل شود.

اطلاعات موردنیاز اعلام بار:

- تاریخ جلالی
- مدیر منطقه
- استان
- شهر
- خودرو
- راننده
- نوع خودرو
- ظرفیت/نوع بار
- هدیه بله/خیر
- نوع هدیه
- تناژ هدیه

مدیران منطقه شناخته‌شده:

- اسدی
- کرکه آبادی
- یغمایی
- فولادی
- عرب

Known UI issue قبلی:

- «کرکه آبادی» به‌درستی نمایش/تفکیک نشده بود.
- برخی شهرهای مازندران در Dropdown وجود نداشتند.
- گزینه‌های خودرو باید از وانت تا انواع تریلی تکمیل باشند.

Prototype قبلی اعلام بار:

```
cargo-announcement-m-vdrw.bolt.host
```

---

## 12) Shipment Allocation در برابر Waybill Quantity

دو مفهوم را از هم جدا نگه داریم:

### Commercial / Shipment Allocation
`shipment_items.quantity`

برای تخصیص سفارش به Shipment.

### Operational Waybill Quantity
`waybill_items.quantity`

مقدار واقعی/عملیاتی که حواله‌نویس تنظیم می‌کند.

تصمیم فعلی کسب‌وکار:

> ممکن است Shipment مثلاً 16 تن تخصیص داشته باشد ولی حواله برای 20 تن تنظیم شود.

بنابراین Migration/Service نباید دوباره Waybill Quantity را به Shipment Allocation محدود کند، مگر اینکه بعداً تصمیم کسب‌وکار عوض شود.

---

## 13) قابلیت‌های بنیادین که هنوز باید حفظ شوند

در طراحی کلی V2 باید این موارد فراموش نشوند:

### چندقلمی + هدیه
برای هر Order Item و Gift Item در صورت نیاز حواله/کد جداگانه.

### Voucher
- کد حواله
- عدم استفاده مجدد از کد
- تاریخچه لغو
- دلیل لغو
- کاربر لغوکننده
- جلوگیری از Race Condition در دو دستگاه

### Offline-first
- Client UUID
- Sync Version
- Last Synced At
- Idempotency
- Conflict handling

### RLS
- Isolation بر اساس Company
- Permission-based access
- عدم باز کردن ناخواسته V1

---

## 14) اصل بسیار مهم برای ادامه پروژه

قبل از هر تغییر:

1. مشخص کن تغییر مربوط به V1 است یا V2.
2. اگر V2 است، مرز `workflow_version` را حفظ کن.
3. Permission جدید را فقط برای قابلیت موردنیاز ایجاد کن.
4. RLS را قبل از UI بررسی کن.
5. منطق Commercial Order را از Operational Shipment/Waybill/Loading جدا نگه دار.
6. راه‌حل موقت تستی را با معماری نهایی اشتباه نگیر.

---

## 15) ترتیب تست و انتشار

ترتیب استاندارد بعد از هر تغییر:

```
جایگزینی کامل فایل
↓
npm run lint
↓
npm run build
↓
در صورت نیاز npx supabase db push
↓
تست واقعی UI
↓
تست Permission/RLS
↓
Commit
↓
Push
```

برای Migration جدید:

- ابتدا کد را از نظر Syntax/Type تست کن.
- سپس Build.
- سپس `npx supabase db push`.
- بعد رفتار واقعی DB/RLS را تست کن.

---

## 16) نقشه راه پس از بازگشت

### مرحله A — تثبیت معماری
- بازبینی branch `v2-operational-fulfillment`
- تعیین اینکه کدام تغییرات باید به `v2` منتقل شوند.
- حذف/بازطراحی قسمت‌هایی که صرفاً برای تست Waybill Writer داخل CRM ایجاد شده‌اند.

### مرحله B — تکمیل Shipment
- صفحه اعلام بار
- تخصیص خودرو و راننده
- وضعیت‌های Shipment
- دسترسی مدیر منطقه
- تاریخچه تغییرات

### مرحله C — نرم‌افزار مستقل حواله‌نویسی
- Login
- Dashboard عملیاتی
- Shipmentهای آماده حواله
- صدور Draft
- تنظیم Quantity
- Issue
- Reissue / Cancel
- Print
- View History
- Offline-first
- Sync

### مرحله D — Loading عملیاتی
- Loading Items
- ثبت مقدار واقعی
- Confirm / Cancel
- تاریخچه
- محاسبه تناژ واقعی

### مرحله E — اتصال به Regional Plan
- گزارش بر پایه مقدار واقعی بارگیری
- Period Jalali
- تفکیک منطقه
- تفکیک محصول
- وضعیت بارگیری

### مرحله F — تست نهایی امنیت
- Company isolation
- Role isolation
- Permission matrix
- RLS regression
- V1 regression

### مرحله G — خروجی نهایی
- Web
- Desktop EXE
- Android APK
- Offline Sync
- Safe release/tag

---

## 17) دستور شروع پروژه پس از بازگشت

ابتدا:

```powershell
cd C:\Users\sales3\gypsum-sales-crm
git fetch origin
git checkout v2-operational-fulfillment
git pull --ff-only origin v2-operational-fulfillment
git status
```

سپس:

```powershell
npm run lint
npm run build
```

و برای دیدن وضعیت Migrationها:

```powershell
npx supabase migration list
```

**بدون بررسی وضعیت فعلی، مستقیم سراغ تغییر کد نرو.**

مرجع اصلی ادامه پروژه همین فایل است.

---

## 18) آخرین Safe Point

آخرین Safe Point قطعی قبل از ایجاد این Roadmap:

```
0e80ed9a705406465708a7406429bcb5d070300e
```

تمام تصمیم‌های معماری مهم پایان امروز باید از همین نقطه قابل بازسازی باشند.

