# V2 Multi-Tenant — Batch 1

## هدف

این Batch وابستگی Runtime برنامه به Tenant آزمایشی/فعلی را حذف می‌کند تا نام شرکت و `company_id` از Context کاربر احراز‌شده تعیین شود.

## تغییرات

- `getRequiredCurrentCompanyId()` به Company Context اضافه شد.
- Serviceهای دارای `COMPANY_ID` هاردکدشده، `companyId` را از Context فعلی کاربر می‌گیرند.
- فرم ثبت سفارش از Company Context استفاده می‌کند.
- Hook اهداف فروش از Company Context استفاده می‌کند.
- Import Mapper دیگر Company ID را داخل کد نگه نمی‌دارد؛ Analyzer آن را از Context جاری تأمین می‌کند.
- عنوان مرورگر با نام شرکت جاری هماهنگ می‌شود.
- عنوان ثابت Tauri از نام آهوان حذف شد و فعلاً محصول‌محور/عمومی است.
- اسکریپت `verify:tenant-runtime` برای جلوگیری از برگشت Hard-code اضافه شد.

## فایل‌های Runtime اصلاح‌شده

- `src/lib/services/current-company.ts`
- `src/lib/services/activities.ts`
- `src/lib/services/ai.ts`
- `src/lib/services/cities.ts`
- `src/lib/services/customers.ts`
- `src/lib/services/dashboard.ts`
- `src/lib/services/orders.ts`
- `src/lib/services/products.ts`
- `src/lib/services/report-targets.ts`
- `src/lib/services/reports.ts`
- `src/lib/services/targets.ts`
- `src/lib/services/users.ts`
- `src/lib/services/waybills.ts`
- `src/lib/hooks/useTargets.ts`
- `src/lib/import/mapper.ts`
- `src/lib/import/analyze.ts`
- `app/orders/new/page.tsx`
- `src/lib/components/layout/MainLayout.tsx`
- `src-tauri/tauri.conf.json`
- `package.json`
- `scripts/verify-runtime-tenant-isolation.mjs`

## وضعیت Tauri

نام آهوان از عنوان Native حذف شده است تا Hard-code باقی نماند. عنوان Native کاملاً Dynamic در Batch بعدی با Runtime API پنجره Tauri پیاده می‌شود.

## تست‌ها

- اسکن Runtime برای Company ID/نام آهوان: موفق
- Transpile/Syntax check فایل‌های تغییرکرده: موفق
- Type-check کامل محیط محلی در این Snapshot بدون `node_modules` قابل اجرا نبود؛ بعد از نصب وابستگی‌ها باید `npm run lint` و `npm run build` در مخزن اصلی اجرا شوند.
