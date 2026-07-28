import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AuthShell } from "@/app/pages/auth/AuthShared";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { useAuth } from "@/app/context/AuthContext";
import { InlineLoader } from "@/app/components/common/LoadingStates";

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <AuthShell title="Reset password" subtitle="We will send reset instructions if the account exists." footer={<Link className="text-cyan-300" to="/login">Back to login</Link>}>
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setLoading(true);
          try {
            await requestPasswordReset(email);
            toast.success("If the account exists, reset instructions have been sent.");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to request a reset.");
          } finally {
            setLoading(false);
          }
        }}
      >
        <label className="block space-y-2"><span className="text-sm text-slate-300">Email</span><Input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <Button className="w-full" disabled={loading}>{loading ? <InlineLoader label="Sending" /> : "Send reset link"}</Button>
      </form>
    </AuthShell>
  );
}
