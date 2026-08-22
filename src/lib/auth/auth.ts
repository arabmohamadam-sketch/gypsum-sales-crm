import { getSupabaseClient } from "@/src/lib/supabase";
import type { User } from "@supabase/supabase-js";

export type AuthResult = {
  success: boolean;
  error?: string;
};

export async function signIn(
  email: string,
  password: string
): Promise<AuthResult> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    return {
      success: false,
      error: translateAuthError(error.message),
    };
  }

  return {
    success: true,
  };
}

export async function signOut(): Promise<AuthResult> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    return {
      success: false,
      error: translateAuthError(error.message),
    };
  }

  return {
    success: true,
  };
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabaseClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function getCurrentSession() {
  const supabase = getSupabaseClient();

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    return null;
  }

  return session;
}

function translateAuthError(message: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid credentials")
  ) {
    return "ایمیل یا رمز عبور صحیح نیست.";
  }

  if (normalized.includes("email not confirmed")) {
    return "ایمیل کاربر هنوز تأیید نشده است.";
  }

  if (normalized.includes("too many requests")) {
    return "تعداد تلاش‌ها زیاد است. چند دقیقه بعد دوباره امتحان کنید.";
  }

  if (normalized.includes("network")) {
    return "ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید.";
  }

  return message;
}