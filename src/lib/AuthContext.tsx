import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  signInWithMock: (email: string) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to create a fake user object structure matching Supabase User
const createFakeUser = (email: string): User => ({
  id: "d0000000-0000-0000-0000-000000000001",
  email,
  created_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  role: "authenticated",
});

const createFakeSession = (user: User): Session => ({
  access_token: "mock-token-secret-vitals-jwt-12345",
  token_type: "bearer",
  expires_in: 3600,
  refresh_token: "mock-refresh-token",
  user,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if we have a saved mock login in localStorage
    const savedMockEmail = localStorage.getItem("vitals_mock_email");
    if (savedMockEmail) {
      const fakeUser = createFakeUser(savedMockEmail);
      setUser(fakeUser);
      setSession(createFakeSession(fakeUser));
      setIsLoading(false);
      return;
    }

    // Otherwise, check Supabase
    supabase.auth
      .getSession()
      .then(({ data: { session: sbSession } }) => {
        if (sbSession) {
          setSession(sbSession);
          setUser(sbSession.user ?? null);
        } else {
          setUser(null);
          setSession(null);
        }
        setIsLoading(false);
      })
      .catch(() => {
        setUser(null);
        setSession(null);
        setIsLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, sbSession) => {
      if (sbSession) {
        setSession(sbSession);
        setUser(sbSession.user ?? null);
      } else {
        setUser(null);
        setSession(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    localStorage.removeItem("vitals_mock_email");
    await supabase.auth.signOut().catch(() => {});
    setUser(null);
    setSession(null);
  };

  const signInWithMock = (email: string) => {
    localStorage.setItem("vitals_mock_email", email);
    const fakeUser = createFakeUser(email);
    setUser(fakeUser);
    setSession(createFakeSession(fakeUser));
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signOut, signInWithMock }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
