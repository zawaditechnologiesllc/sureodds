"use client";

import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import type { User } from "@supabase/supabase-js";

const TOKEN_KEY = "access_token";

function saveToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load initial session and save token for API calls
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      saveToken(session?.access_token ?? null);
      setLoading(false);
    });

    // Keep token in sync on sign-in / sign-out / token refresh
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      saveToken(session?.access_token ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return { user, loading, isAuthenticated: !!user };
}
