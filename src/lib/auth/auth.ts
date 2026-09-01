import { getSupabaseClient } from "@/src/lib/supabase";
import type {
  Session,
  User,
} from "@supabase/supabase-js";

export type AuthResult = {
  success: boolean;
  error?: string;
  session?: Session | null;
  user?: User | null;
};

export async function signIn(
  email: string,
  password: string
): Promise<AuthResult> {
  const supabase =
    getSupabaseClient();

  const {
    data,
    error,
  } =
    await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

  if (error) {
    return {
      success: false,
      error: translateAuthError(
        error.message
      ),
    };
  }

  if (!data.session || !data.user) {
    return {
      success: false,
      error:
        "ورود انجام شد اما نشست کاربر ایجاد نشد.",
    };
  }

  return {
    success: true,
    session: data.session,
    user: data.user,
  };
}

export async function signOut(): Promise<AuthResult> {
  const supabase =
    getSupabaseClient();

  const { error } =
    await supabase.auth.signOut();

  if (error) {
    return {
      success: false,
      error: translateAuthError(
        error.message
      ),
    };
  }

  return {
    success: true,
    session: null,
    user: null,
  };
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase =
    getSupabaseClient();

  const {
    data,
    error,
  } =
    await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export async function getCurrentSession(): Promise<Session | null> {
  const supabase =
    getSupabaseClient();

  const {
    data,
    error,
  } =
    await supabase.auth.getSession();

  if (error) {
    console.error(
      "GET CURRENT SESSION ERROR:",
      error
    );

    return null;
  }

  return data.session;
}

function translateAuthError(
  message: string
): string {
  const normalized =
    message.toLowerCase();

  if (
    normalized.includes(
      "invalid login credentials"
    ) ||
    normalized.includes(
      "invalid credentials"
    )
  ) {
    return "ایمیل یا رمز عبور صحیح نیست.";
  }

  if (
    normalized.includes(
      "email not confirmed"
    )
  ) {
    return "ایمیل کاربر هنوز تأیید نشده است.";
  }

  if (
    normalized.includes(
      "too many requests"
    )
  ) {
    return "تعداد تلاش‌ها زیاد است. چند دقیقه بعد دوباره تلاش کنید.";
  }

  if (
    normalized.includes("network")
  ) {
    return "ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید.";
  }

  return message;
}