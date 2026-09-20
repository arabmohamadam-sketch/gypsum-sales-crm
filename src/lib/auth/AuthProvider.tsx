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

import {
  getCurrentCompanyContext,
  type CurrentCompany,
  type CurrentCompanyProfile,
} from "@/src/lib/services/current-company";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: CurrentCompanyProfile | null;
  company: CurrentCompany | null;
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

  const [profile, setProfile] =
    useState<CurrentCompanyProfile | null>(
      null
    );

  const [company, setCompany] =
    useState<CurrentCompany | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const supabase =
      getSupabaseClient();

    let mounted = true;

    async function loadCompanyContext() {
      try {
        const context =
          await getCurrentCompanyContext();

        if (!mounted) {
          return;
        }

        if (!context) {
          setProfile(null);
          setCompany(null);
          return;
        }

        setProfile(context.profile);
        setCompany(context.company);
      } catch (error) {
        if (!mounted) {
          return;
        }

        console.error(
          "FAILED TO LOAD COMPANY CONTEXT:",
          error
        );

        setProfile(null);
        setCompany(null);
      }
    }

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
          setProfile(null);
          setCompany(null);
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

        if (data.session) {
          await loadCompanyContext();
        } else {
          setProfile(null);
          setCompany(null);
        }

        if (!mounted) {
          return;
        }

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
        setProfile(null);
        setCompany(null);
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
            setProfile(null);
            setCompany(null);

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

            setLoading(true);

            void loadCompanyContext()
              .finally(() => {
                if (mounted) {
                  setLoading(false);
                }
              });

            return;
          }

          if (
            event === "SIGNED_OUT"
          ) {
            console.log(
              "Supabase Auth: user signed out"
            );

            setProfile(null);
            setCompany(null);
            setLoading(false);

            return;
          }

          if (!nextSession) {
            setProfile(null);
            setCompany(null);
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

      return;
    }

    setProfile(null);
    setCompany(null);
    setSession(null);
    setUser(null);
  }

  const value =
    useMemo<AuthContextValue>(
      () => ({
        user,
        session,
        profile,
        company,
        loading,
        isAuthenticated:
          Boolean(
            user &&
            session &&
            profile &&
            company
          ),
        signOut:
          handleSignOut,
      }),
      [
        user,
        session,
        profile,
        company,
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
