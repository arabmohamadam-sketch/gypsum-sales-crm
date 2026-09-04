"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";

import { getCurrentSession, updatePassword } from "@/src/lib/auth/auth";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const session = await getCurrentSession();

      if (!mounted) {
        return;
      }

      if (!session) {
        setError(
          "لینک تغییر رمز معتبر نیست یا منقضی شده است. دوباره درخواست تغییر رمز بدهید."
        );
      }

      setLoading(false);
    }

    void checkSession();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (password.length < 6) {
      setError("رمز عبور باید حداقل ۶ کاراکتر باشد.");
      return;
    }

    if (password !== confirmPassword) {
      setError("تکرار رمز عبور با رمز عبور جدید یکسان نیست.");
      return;
    }

    setSaving(true);

    const result = await updatePassword(password);

    if (!result.success) {
      setError(result.error || "تغییر رمز عبور انجام نشد.");
      setSaving(false);
      return;
    }

    setSuccess(true);
    setSaving(false);

    setTimeout(() => {
      router.replace("/");
    }, 1500);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="flex items-center gap-3 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>در حال بررسی لینک تغییر رمز...</span>
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-slate-50 p-6"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-600">
            <LockKeyhole className="h-7 w-7" />
          </div>

          <h1 className="text-2xl font-bold text-slate-800">
            تغییر رمز عبور
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            رمز عبور جدید خود را وارد کنید.
          </p>
        </div>

        {success ? (
          <div className="rounded-xl bg-emerald-50 p-5 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-600" />

            <p className="font-semibold text-emerald-700">
              رمز عبور با موفقیت تغییر کرد.
            </p>

            <p className="mt-2 text-sm text-emerald-600">
              در حال انتقال به داشبورد...
            </p>
          </div>
        ) : error ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-700">
              {error}
            </div>

            <button
              type="button"
              onClick={() => router.replace("/login")}
              className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              بازگشت به صفحه ورود
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                رمز عبور جدید
              </label>

              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  disabled={saving}
                  placeholder="حداقل ۶ کاراکتر"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pl-12 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  disabled={saving}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  aria-label={
                    showPassword
                      ? "مخفی کردن رمز عبور"
                      : "نمایش رمز عبور"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                تکرار رمز عبور
              </label>

              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  autoComplete="new-password"
                  disabled={saving}
                  placeholder="رمز عبور را دوباره وارد کنید"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pl-12 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword((value) => !value)
                  }
                  disabled={saving}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  aria-label={
                    showConfirmPassword
                      ? "مخفی کردن تکرار رمز عبور"
                      : "نمایش تکرار رمز عبور"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && <Loader2 className="h-5 w-5 animate-spin" />}
              {saving ? "در حال تغییر رمز..." : "تغییر رمز عبور"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}