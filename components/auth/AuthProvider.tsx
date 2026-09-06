"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getAuth, onAuthStateChanged, signOut as fbSignOut, type User } from "firebase/auth";
import { getFirebaseApp, isFirebaseConfigured } from "@/lib/firebase";

export interface AuthUser {
  uid: string;
  email: string | null;
  isAdmin: boolean;
  role?: string;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signInLocal: (email: string, role?: "admin" | "user") => void;
  isFirebaseConfigured: boolean;
}

const LOCAL_USER_KEY = "mv:user";
const LOCAL_SIGNOUT_KEY = "mv:signed_out";

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  signOut: async () => {},
  signInLocal: () => {},
  isFirebaseConfigured: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Owner mode / local mode: Firebase not configured
    if (!isFirebaseConfigured) {
      try {
        const isSignedOut = localStorage.getItem(LOCAL_SIGNOUT_KEY) === "true";
        if (isSignedOut) {
          setUser(null);
          setLoading(false);
          return;
        }

        const saved = localStorage.getItem(LOCAL_USER_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setUser(parsed);
          setLoading(false);
          return;
        }

        // Default owner session on first run
        const defaultOwner: AuthUser = {
          uid: "owner",
          email: "owner@movievault.local",
          isAdmin: true,
          role: "admin",
        };
        setUser(defaultOwner);
      } catch {
        setUser({ uid: "owner", email: null, isAdmin: true, role: "admin" });
      }
      setLoading(false);
      return;
    }

    const app = getFirebaseApp();
    if (!app) {
      setUser({ uid: "owner", email: null, isAdmin: true, role: "admin" });
      setLoading(false);
      return;
    }

    const auth = getAuth(app);
    const unsub = onAuthStateChanged(auth, async (u: User | null) => {
      if (!u) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const token = await u.getIdToken();
        const res = await fetch("/api/auth/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: token }),
        });
        const data = (await res.json()) as { uid?: string; email?: string | null; isAdmin?: boolean; role?: string };
        setUser({
          uid: data.uid ?? u.uid,
          email: data.email ?? u.email,
          isAdmin: data.isAdmin === true,
          role: data.role ?? (data.isAdmin ? "admin" : "user"),
        });
      } catch {
        setUser({ uid: u.uid, email: u.email, isAdmin: false, role: "user" });
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signInLocal = (email: string, role: "admin" | "user" = "admin") => {
    const newUser: AuthUser = {
      uid: role === "admin" ? "admin-" + Date.now().toString(36) : "user-" + Date.now().toString(36),
      email: email.trim(),
      isAdmin: role === "admin",
      role,
    };
    try {
      localStorage.removeItem(LOCAL_SIGNOUT_KEY);
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(newUser));
      document.cookie = `mv_token=local:${encodeURIComponent(email.trim())}; path=/; max-age=2592000; SameSite=Lax`;
    } catch {
      /* ignore */
    }
    setUser(newUser);
  };

  const signOut = async () => {
    try {
      localStorage.setItem(LOCAL_SIGNOUT_KEY, "true");
      localStorage.removeItem(LOCAL_USER_KEY);
      document.cookie = "mv_token=; path=/; max-age=0";
    } catch {
      /* ignore */
    }
    const app = getFirebaseApp();
    if (app) {
      try {
        await fbSignOut(getAuth(app));
      } catch {
        /* ignore */
      }
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signOut,
        signInLocal,
        isFirebaseConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}