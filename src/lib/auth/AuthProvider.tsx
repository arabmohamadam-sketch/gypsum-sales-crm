"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useRouter } from "next/navigation";

import type {
  Session,
  User,
} from "@supabase/supabase-js";

import {
  getSupabaseClient,
} from "@/src/lib/supabase";

import {
  signOut as signOutUser,
} from "@/src/lib/auth/auth";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
};

const AuthContext =
  createContext<AuthContextValue | undefined>(
    undefined
  );

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const router = useRouter();

  const [user, setUser] =
    useState<User | null>(null);

  const [session, setSession] =
    useState<Session | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const supabase =
      getSupabaseClient();

    let mounted = true;

    async function loadInitialSession() {
      try {
        const {
          data,
          error,
        } =
          await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        if (error) {
          console.error(
            "Failed to load Supabase session:",
            error
          );

          setSession(null);
          setUser(null);
          setLoading(false);

          return;
        }

        console.log(
          "AUTH INITIAL SESSION:",
          data.session
        );

        setSession(data.session);
        setUser(
          data.session?.user ?? null
        );

        setLoading(false);
      } catch (error) {
        if (!mounted) {
          return;
        }

        console.error(
          "AUTH INITIAL SESSION ERROR:",
          error
        );

        setSession(null);
        setUser(null);
        setLoading(false);
      }
    }

    void loadInitialSession();

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (
          event,
          nextSession
        ) => {
          if (!mounted) {
            return;
          }

          console.log(
            "AUTH STATE CHANGE:",
            event
          );

          setSession(nextSession);

          setUser(
            nextSession?.user ?? null
          );

          if (
            event === "PASSWORD_RECOVERY"
          ) {
            console.log(
              "Supabase Auth: password recovery started"
            );

            router.replace(
              "/reset-password"
            );

            return;
          }

          if (
            event === "SIGNED_IN"
          ) {
            console.log(
              "Supabase Auth: user signed in"
            );
          }

          if (
            event === "SIGNED_OUT"
          ) {
            console.log(
              "Supabase Auth: user signed out"
            );
          }
        }
      );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function handleSignOut() {
    const result =
      await signOutUser();

    if (!result.success) {
      console.error(
        "Sign out failed:",
        result.error
      );
    }
  }

  const value =
    useMemo<AuthContextValue>(
      () => ({
        user,
        session,
        loading,
        isAuthenticated:
          Boolean(
            user && session
          ),
        signOut:
          handleSignOut,
      }),
      [
        user,
        session,
        loading,
      ]
    );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context =
    useContext(
      AuthContext
    );

  if (!context) {
    throw new Error(
      "useAuth must be used inside an AuthProvider"
    );
  }

  return context;
}