import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { AuthShell } from "@/app/pages/auth/AuthShared";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { useAuth } from "@/app/context/AuthContext";
import { InlineLoader } from "@/app/components/common/LoadingStates";

export function OtpPage() {
  const { pendingOtp, verifyOtp } = useAuth();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  if (!pendingOtp) {
    return <Navigate to="/register" replace />;
  }

  return (
    <AuthShell title="OTP verification" subtitle="Enter the verification code sent to your email." footer={<span>Need a new code? <Link className="text-cyan-300" to="/register">Register again</Link></span>}>
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setLoading(true);
          try {
            await verifyOtp(otp);
            toast.success("Verification complete.");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Invalid OTP.");
          } finally {
            setLoading(false);
          }
        }}
      >
        <label className="block space-y-2"><span className="text-sm text-slate-300">Verification code</span><Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} required /></label>
        <p className="text-xs text-slate-500">Development seed OTP: 246810</p>
        <Button className="w-full" disabled={loading}>{loading ? <InlineLoader label="Verifying" /> : "Verify OTP"}</Button>
      </form>
    </AuthShell>
  );
}
