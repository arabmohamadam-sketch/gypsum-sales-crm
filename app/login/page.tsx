"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { signIn } from "@/src/lib/auth/auth";
import { useAuth } from "@/src/lib/auth/AuthProvider";

export default function LoginPage() {
  const router = useRouter();

  const { isAuthenticated, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/");
    }
  }, [loading, isAuthenticated, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!email.trim()) {
      setError("ایمیل را وارد کنید.");
      return;
    }

    if (!password) {
      setError("رمز عبور را وارد کنید.");
      return;
    }

    setSubmitting(true);

    try {
      const result = await signIn(email, password);

      if (!result.success) {
        setError(result.error ?? "ورود انجام نشد.");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (err) {
      console.error("Login error:", err);

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
        className="min-h-screen flex items-center justify-center bg-slate-50"
      >
        <div className="text-sm text-slate-500">
          در حال بررسی وضعیت ورود...
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen flex items-center justify-center bg-slate-50 px-4"
    >
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200 sm:p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-2xl font-bold text-white shadow-lg">
              CRM
            </div>

            <h1 className="text-2xl font-bold text-slate-900">
              ورود به سیستم فروش
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              برای ورود به پنل CRM اطلاعات حساب خود را وارد کنید.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                ایمیل
              </label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="example@gmail.com"
                disabled={submitting}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-left text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
                dir="ltr"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                رمز عبور
              </label>

              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="رمز عبور"
                disabled={submitting}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-left text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
                dir="ltr"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "در حال ورود..." : "ورود به CRM"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          سیستم مدیریت فروش گچ آهوان
        </p>
      </div>
    </main>
  );
}