"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { signIn } from "@/src/lib/auth/auth";
import { useAuth } from "@/src/lib/auth/AuthProvider";

export default function LoginPage() {
  const router = useRouter();

  const {
    isAuthenticated,
    loading,
  } = useAuth();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (
      !loading &&
      isAuthenticated
    ) {
      router.replace("/");
    }
  }, [
    loading,
    isAuthenticated,
    router,
  ]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!email.trim()) {
      setError(
        "ایمیل را وارد کنید."
      );
      return;
    }

    if (!password) {
      setError(
        "رمز عبور را وارد کنید."
      );
      return;
    }

    setSubmitting(true);

    try {
      const result =
        await signIn(
          email,
          password
        );

      if (!result.success) {
        setError(
          result.error ??
            "ورود انجام نشد."
        );
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (err) {
      console.error(
        "Login error:",
        err
      );

      setError(
        "خطایی هنگام ورود رخ داد. لطفاً اتصال اینترنت و اطلاعات ورود را بررسی کنید."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main
        dir="rtl"
        className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4"
      >
        <div className="absolute inset-0">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
        </div>

        <div className="relative text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          </div>

          <p className="mt-4 text-sm font-medium text-slate-300">
            در حال بررسی وضعیت ورود...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-slate-950"
    >
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute right-[-8%] top-[-12%] h-[420px] w-[420px] rounded-full bg-amber-400/10 blur-3xl" />

        <div className="absolute bottom-[-12%] left-[-8%] h-[420px] w-[420px] rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/5 blur-3xl" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.08),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.08),transparent_28%)]" />
      </div>

      {/* Decorative grid */}
      <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)] [background-size:42px_42px]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-8">

        <div className="grid w-full overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/30 backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">

          {/* Brand Side */}
          <section className="relative hidden min-h-[720px] overflow-hidden lg:flex">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900" />

            <div className="absolute right-[-120px] top-[-100px] h-[420px] w-[420px] rounded-full bg-amber-400/10 blur-3xl" />

            <div className="absolute bottom-[-120px] left-[-120px] h-[420px] w-[420px] rounded-full bg-cyan-400/10 blur-3xl" />

            <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-14">

              {/* Logo */}
              <div>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-2xl font-black text-slate-950 shadow-xl shadow-amber-500/20">
                    گچ
                  </div>

                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-white">
                      گچ آهوان
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">
                      نسخه هوشمند فروش
                    </p>
                  </div>
                </div>

                <div className="mt-16 max-w-xl">
                  <span className="inline-flex items-center rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs font-bold text-amber-300">
                    سیستم مدیریت فروش
                  </span>

                  <h1 className="mt-5 text-4xl font-black leading-[1.3] tracking-tight text-white xl:text-5xl">
                    فروش را
                    <span className="block bg-gradient-to-l from-amber-300 via-amber-400 to-white bg-clip-text text-transparent">
                      هوشمندتر مدیریت کنید
                    </span>
                  </h1>

                  <p className="mt-6 max-w-lg text-base leading-8 text-slate-400">
                    مدیریت مشتریان، سفارش‌ها، تماس‌ها و پیگیری‌های فروش در یک پنل یکپارچه و حرفه‌ای.
                  </p>
                </div>
              </div>

              {/* Feature Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
                  <div className="text-xl">
                    👥
                  </div>

                  <p className="mt-3 text-sm font-bold text-white">
                    مشتریان
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    مدیریت و پیگیری
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
                  <div className="text-xl">
                    📦
                  </div>

                  <p className="mt-3 text-sm font-bold text-white">
                    سفارش‌ها
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    ثبت و کنترل فروش
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
                  <div className="text-xl">
                    📊
                  </div>

                  <p className="mt-3 text-sm font-bold text-white">
                    داشبورد
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    گزارش لحظه‌ای
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Login Side */}
          <section className="relative flex min-h-[680px] items-center justify-center bg-white px-5 py-8 sm:px-8 lg:min-h-[720px] xl:px-14">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-amber-400 via-amber-500 to-cyan-500 lg:hidden" />

            <div className="w-full max-w-md">

              {/* Mobile Logo */}
              <div className="mb-8 text-center lg:hidden">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-xl font-black text-slate-950 shadow-lg shadow-amber-100">
                  گچ
                </div>

                <h2 className="mt-4 text-2xl font-black text-slate-900">
                  گچ آهوان
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  نسخه هوشمند فروش
                </p>
              </div>

              {/* Heading */}
              <div className="mb-8">
                <span className="inline-flex rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                  پنل فروش
                </span>

                <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                  خوش آمدید
                </h1>

                <p className="mt-3 text-sm leading-7 text-slate-500">
                  برای ورود به پنل مدیریت فروش، اطلاعات حساب خود را وارد کنید.
                </p>
              </div>

              {/* Form */}
              <form
                onSubmit={
                  handleSubmit
                }
                className="space-y-5"
              >
                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    ایمیل
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                      ✉
                    </span>

                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(
                        event
                      ) =>
                        setEmail(
                          event.target.value
                        )
                      }
                      placeholder="example@gmail.com"
                      disabled={
                        submitting
                      }
                      dir="ltr"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pr-11 pl-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    رمز عبور
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                      🔒
                    </span>

                    <input
                      id="password"
                      name="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      autoComplete="current-password"
                      value={password}
                      onChange={(
                        event
                      ) =>
                        setPassword(
                          event.target.value
                        )
                      }
                      placeholder="رمز عبور خود را وارد کنید"
                      disabled={
                        submitting
                      }
                      dir="ltr"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pr-11 pl-12 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (current) =>
                            !current
                        )
                      }
                      disabled={
                        submitting
                      }
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-bold text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                      aria-label={
                        showPassword
                          ? "پنهان کردن رمز عبور"
                          : "نمایش رمز عبور"
                      }
                    >
                      {showPassword
                        ? "پنهان"
                        : "نمایش"}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div
                    role="alert"
                    className="overflow-hidden rounded-2xl border border-red-200 bg-red-50"
                  >
                    <div className="h-1 bg-red-500" />

                    <div className="flex items-start gap-3 p-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white font-black text-red-600">
                        !
                      </div>

                      <div>
                        <p className="text-sm font-bold text-red-800">
                          ورود ناموفق بود
                        </p>

                        <p className="mt-1 text-xs leading-6 text-red-600">
                          {error}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={
                    submitting
                  }
                  className="group relative w-full overflow-hidden rounded-2xl bg-slate-950 px-4 py-4 text-sm font-black text-white shadow-xl shadow-slate-200 transition hover:-translate-y-0.5 hover:bg-slate-900 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="absolute inset-0 bg-gradient-to-l from-amber-400/20 via-transparent to-cyan-400/20 opacity-0 transition group-hover:opacity-100" />

                  <span className="relative flex items-center justify-center gap-2">
                    {submitting ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        در حال ورود...
                      </>
                    ) : (
                      <>
                        ورود به پنل
                        <span className="text-base transition-transform group-hover:-translate-x-1">
                          ←
                        </span>
                      </>
                    )}
                  </span>
                </button>
              </form>

              {/* Footer */}
              <div className="mt-8 border-t border-slate-100 pt-6">
                <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  سیستم مدیریت فروش گچ آهوان
                </div>

                <p className="mt-2 text-center text-[11px] text-slate-400">
                  دسترسی فقط برای کاربران مجاز
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}