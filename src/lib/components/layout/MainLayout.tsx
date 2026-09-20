"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/src/lib/auth/AuthProvider";

import Sidebar from "./Sidebar";
import Header from "./Header";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const {
    loading,
    isAuthenticated,
    company,
  } = useAuth();

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/reset-password";

  const brandName =
    company?.branding.display_name?.trim() ||
    company?.name?.trim() ||
    "CRM مدیریت فروش";

  useEffect(() => {
    if (isAuthPage || loading) {
      return;
    }

    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [
    isAuthPage,
    loading,
    isAuthenticated,
    router,
  ]);

  if (isAuthPage) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-slate-50"
      >
        {children}
      </div>
    );
  }

  if (loading) {
    return (
      <div
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-slate-50"
      >
        <div className="text-center">
          <div className="mb-3 text-lg font-semibold text-slate-800">
            {brandName}
          </div>

          <div className="text-sm text-slate-500">
            در حال بررسی ورود کاربر...
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-slate-50"
      >
        <div className="text-sm text-slate-500">
          در حال انتقال به صفحه ورود...
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-50 text-slate-900"
    >
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="min-w-0 flex-1">
          <main className="min-h-screen px-3 pb-28 pt-3 sm:px-5 sm:pb-28 sm:pt-5 lg:px-8 lg:pb-8 lg:pt-6">
            <div className="mx-auto w-full max-w-[1600px]">
              <Header />

              <div className="mt-5 sm:mt-6">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
