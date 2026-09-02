"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut, User } from "lucide-react";

import { useAuth } from "@/src/lib/auth/AuthProvider";

function getPageInfo(pathname: string) {
  if (pathname === "/") {
    return {
      title: "داشبورد",
      description: "نمای کلی عملکرد فروش و مشتریان",
    };
  }

  if (pathname.startsWith("/customers")) {
    return {
      title: "مشتریان",
      description: "مدیریت و پیگیری مشتریان",
    };
  }

  if (pathname.startsWith("/orders")) {
    return {
      title: "سفارش‌ها",
      description: "مدیریت سفارش‌های فروش",
    };
  }

  if (pathname.startsWith("/activities")) {
    return {
      title: "فعالیت‌ها",
      description: "پیگیری تماس‌ها و فعالیت‌های فروش",
    };
  }

  if (pathname === "/targets") {
    return {
      title: "اهداف فروش",
      description: "مدیریت اهداف فروش ماهانه و میزان تحقق",
    };
  }

  if (pathname === "/reports") {
    return {
      title: "گزارش‌ها",
      description: "گزارش‌های فروش، مشتریان و عملکرد",
    };
  }

  if (pathname === "/settings") {
    return {
      title: "تنظیمات",
      description: "مدیریت حساب کاربری، نقش‌ها و تنظیمات CRM",
    };
  }

  return {
    title: "CRM فروش",
    description: "سیستم مدیریت ارتباط با مشتریان",
  };
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

  const { title, description } = getPageInfo(pathname);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="flex min-h-20 items-center justify-between px-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>

          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="relative rounded-xl p-2.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="اعلان‌ها"
          >
            <Bell className="h-5 w-5" />

            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
          </button>

          <div className="h-8 w-px bg-slate-200" />

          <div className="flex items-center gap-3">
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium text-slate-900">
                {user?.email || "کاربر سیستم"}
              </p>

              <p className="text-xs text-slate-500">
                حساب کاربری
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <User className="h-5 w-5" />
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-xl p-2.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
              aria-label="خروج"
              title="خروج"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}