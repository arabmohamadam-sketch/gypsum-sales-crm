# V2 Batch 2-A — Permission Catalog

## هدف
ایجاد فرهنگ لغت Permission برای محصول تجاری Multi-Tenant بدون حذف یا تغییر Permissionهای V1.

## Migration
`20261005000037_v2_permission_catalog.sql`

## تصمیم‌ها
- Permissionها global هستند و در `public.permissions` بدون `company_id` نگهداری می‌شوند.
- Roleها همچنان company-scoped هستند.
- Permissionهای قدیمی V1 مثل `admin.full_access`, `customers.read`, `customers.write`, `orders.read`, `orders.write`, `targets.read`, `targets.write`, `reports.read`, `settings.read/write`, `users.read/write` حذف یا rename نمی‌شوند.
- Mapping جدید فقط additive و محافظه‌کارانه است.
- `admin.full_access` همچنان برای `company_admin` حفظ می‌شود.
- قابلیت‌های حساس Governance عمداً به Roleهای معمولی داده نمی‌شوند و از Delegation فعلی استفاده می‌کنند.
- `platform.*` به هیچ Role شرکت داده نمی‌شود.

## Permission counts
تعداد Permissionهای جدید تعریف‌شده در Catalog: 152

## Mapping پیش‌فرض
### company_admin
تمام Permissionهای Catalog به‌جز `platform.*` به‌صورت additive برای نقش موجود شرکت Admin ثبت می‌شوند؛ `admin.full_access` نیز دست‌نخورده باقی می‌ماند.

### sales_manager
دسترسی مشاهده/مدیریت فروش در Scope شرکت + تأیید فروش. Permissionهای Critical مثل `targets.manage` و `regions.reassign` عمداً داده نشده‌اند.

### regional_manager
دسترسی مشتری/سفارش در Scope منطقه + تأیید منطقه و گزارش منطقه‌ای. Permissionهای Critical داده نشده‌اند.

### sales_rep
دسترسی مشتری/سفارش در Scope خودش + مشاهده داده‌های عملیاتی و گزارش مشتری.

## نکته
این Migration هیچ Policy مربوط به RLS را تغییر نمی‌دهد. RLS Hardening در Batch 2-B روی همین Catalog ساخته خواهد شد.
