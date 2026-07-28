import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadAuthSession, saveAuthSession } from "@/app/lib/storage";
import { authApi, toAuthSession } from "@/app/services/apiClient";
import type { AuthSession, UserRole } from "@/types";

interface LoginInput {
  email: string;
  password: string;
  remember: boolean;
  role: UserRole;
}

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

interface AuthContextValue {
  session: AuthSession | null;
  pendingOtp: RegisterInput | null;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  verifyOtp: (otp: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<AuthSession | null>(() => loadAuthSession());
  const [pendingOtp, setPendingOtp] = useState<RegisterInput | null>(null);
  const navigate = useNavigate();

  function setSession(next: AuthSession | null) {
    setSessionState(next);
    saveAuthSession(next);
  }

  useEffect(() => {
    const handleUnauthorized = () => {
      setSession(null);
      navigate("/login", { replace: true });
    };
    window.addEventListener("mediflow:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("mediflow:unauthorized", handleUnauthorized);
  }, [navigate]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      pendingOtp,
      async login(input) {
        const result = await authApi.login(input);
        setSession(toAuthSession(result.user, input.remember));
        navigate("/dashboard");
      },
      async register(input) {
        await authApi.register(input);
        setPendingOtp(input);
        navigate("/verify-otp");
      },
      async verifyOtp(otp) {
        if (!pendingOtp) throw new Error("No pending registration found.");
        const result = await authApi.verifyOtp(pendingOtp.email, otp);
        setSession(toAuthSession(result.user, true));
        setPendingOtp(null);
        navigate("/dashboard");
      },
      async requestPasswordReset(email) {
        await authApi.forgotPassword(email);
      },
      async logout() {
        await authApi.logout();
        setSession(null);
        navigate("/login");
      },
    }),
    [navigate, pendingOtp, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
