"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Bell,
  ChevronDown,
  LayoutDashboard,
  PlusCircle,
  Search,
  Sparkles,
} from "lucide-react";

type PageInfo = {
  title: string;
  description: string;
};

function getPageInfo(
  pathname: string
): PageInfo {
  if (pathname === "/") {
    return {
      title: "داشبورد CRM",
      description:
        "نمای کلی مدیریت فروش و مشتریان گچ آهوان",
    };
  }

  if (pathname === "/customers") {
    return {
      title: "مشتریان",
      description:
        "مدیریت، جستجو و پیگیری مشتریان",
    };
  }

  if (pathname.startsWith("/customers/")) {
    if (pathname.endsWith("/edit")) {
      return {
        title: "ویرایش مشتری",
        description:
          "ویرایش و بروزرسانی اطلاعات مشتری",
      };
    }

    if (pathname.endsWith("/new")) {
      return {
        title: "افزودن مشتری",
        description:
          "ثبت مشتری جدید در سیستم فروش",
      };
    }

    return {
      title: "جزئیات مشتری",
      description:
        "مشاهده سوابق و اطلاعات مشتری",
    };
  }

  if (pathname === "/orders") {
    return {
      title: "سفارش‌ها",
      description:
        "مدیریت و پیگیری سفارش‌های فروش",
    };
  }

  if (pathname === "/orders/new") {
    return {
      title: "ثبت سفارش",
      description:
        "ایجاد سفارش جدید برای مشتری",
    };
  }

  if (pathname.startsWith("/orders/")) {
    return {
      title: "جزئیات سفارش",
      description:
        "مشاهده و ویرایش اطلاعات سفارش",
    };
  }

  if (pathname === "/activities") {
    return {
      title: "فعالیت‌ها",
      description:
        "مدیریت فعالیت‌های فروش و ارتباط با مشتریان",
    };
  }

  if (pathname === "/activities/calls") {
    return {
      title: "تماس‌های مشتریان",
      description:
        "ثبت و مدیریت تماس‌های انجام‌شده",
    };
  }

  if (pathname === "/activities/calls/new") {
    return {
      title: "ثبت تماس جدید",
      description:
        "ثبت تماس و نتیجه گفت‌وگو با مشتری",
    };
  }

  if (
    pathname.startsWith("/activities/calls/")
  ) {
    return {
      title: "ویرایش تماس",
      description:
        "ویرایش اطلاعات تماس ثبت‌شده",
    };
  }

  if (
    pathname === "/activities/follow-ups"
  ) {
    return {
      title: "پیگیری‌های مشتریان",
      description:
        "مدیریت و پیگیری فعالیت‌های آتی فروش",
    };
  }

  if (
    pathname ===
    "/activities/follow-ups/new"
  ) {
    return {
      title: "ثبت پیگیری جدید",
      description:
        "ثبت زمان و اطلاعات پیگیری مشتری",
    };
  }

  if (
    pathname.startsWith(
      "/activities/follow-ups/"
    )
  ) {
    return {
      title: "ویرایش پیگیری",
      description:
        "ویرایش اطلاعات پیگیری مشتری",
    };
  }

  return {
    title: "CRM فروش گچ آهوان",
    description:
      "سیستم مدیریت فروش و مشتریان",
  };
}

export default function Header() {
  const pathname = usePathname();
  const pageInfo = getPageInfo(pathname);

  return (
    <header
      dir="rtl"
      className="relative z-30 overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-sm backdrop-blur-xl"
    >
      <div className="pointer-events-none absolute -left-20 -top-24 h-52 w-52 rounded-full bg-blue-100/40 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-28 right-10 h-52 w-52 rounded-full bg-cyan-100/30 blur-3xl" />

      <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-l from-transparent via-blue-300 to-transparent sm:inset-x-8" />

      <div className="relative flex min-h-[72px] items-center justify-between gap-3 px-3 py-3 sm:min-h-[78px] sm:gap-4 sm:px-6">
        {/* Title */}

        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-white shadow-md sm:h-11 sm:w-11 lg:hidden">
            <LayoutDashboard size={18} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-black tracking-tight text-slate-900 sm:text-xl">
                {pageInfo.title}
              </h1>

              <span className="hidden items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                فعال
              </span>
            </div>

            <p className="mt-1 hidden max-w-xl truncate text-xs text-slate-500 sm:block">
              {pageInfo.description}
            </p>
          </div>
        </div>

        {/* Actions */}

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          {/* Search */}

          <div className="relative hidden xl:block">
            <Search
              size={17}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              placeholder="جستجو در CRM..."
              className="w-64 rounded-2xl border border-slate-200 bg-slate-50 py-3 pr-10 pl-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </div>

          {/* AI */}

          <div className="hidden items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 xl:flex">
            <Sparkles
              size={15}
              className="text-emerald-600"
            />

            <span className="text-[11px] font-bold text-emerald-700">
              سیستم هوشمند
            </span>
          </div>

          {/* Notifications */}

          <button
            type="button"
            aria-label="اعلان‌ها"
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 sm:h-11 sm:w-11"
          >
            <Bell size={18} />

            <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-red-500 sm:right-2.5 sm:top-2" />
          </button>

          {/* User */}

          <button
            type="button"
            className="hidden items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-2.5 py-2 transition hover:bg-slate-50 sm:flex"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 text-xs font-black text-white">
              م
            </div>

            <div className="max-w-[105px] text-right">
              <p className="truncate text-xs font-black text-slate-800">
                محمد عرب
              </p>

              <p className="mt-0.5 truncate text-[10px] text-slate-400">
                مدیر فروش
              </p>
            </div>

            <ChevronDown
              size={14}
              className="text-slate-400"
            />
          </button>

          {/* New Order */}

          <Link
            href="/orders/new"
            aria-label="ثبت سفارش جدید"
            className="group flex h-10 shrink-0 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-3 text-sm font-black text-white shadow-lg shadow-slate-200 transition hover:-translate-y-0.5 hover:bg-blue-600 hover:shadow-xl sm:h-11 sm:px-4"
          >
            <PlusCircle
              size={18}
              className="transition-transform duration-200 group-hover:rotate-90"
            />

            <span className="hidden sm:inline">
              ثبت سفارش
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}