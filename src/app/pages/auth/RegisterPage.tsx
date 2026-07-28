import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AuthShell } from "@/app/pages/auth/AuthShared";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { useAuth } from "@/app/context/AuthContext";
import type { UserRole } from "@/types";
import { InlineLoader } from "@/app/components/common/LoadingStates";

export function RegisterPage() {
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "PATIENT" as UserRole });

  return (
    <AuthShell title="Create patient account" subtitle="Staff accounts are provisioned by hospital administrators." footer={<span>Already registered? <Link className="text-cyan-300" to="/login">Back to login</Link></span>}>
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,128}$/.test(form.password)) {
            toast.error("Use 12+ characters with uppercase, lowercase, number, and symbol.");
            return;
          }
          setLoading(true);
          try {
            await register(form);
            toast.success("Verification code sent.");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to register.");
          } finally {
            setLoading(false);
          }
        }}
      >
        <label className="block space-y-2"><span className="text-sm text-slate-300">Full name</span><Input value={form.name} autoComplete="name" onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required /></label>
        <label className="block space-y-2"><span className="text-sm text-slate-300">Email</span><Input type="email" value={form.email} autoComplete="email" onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required /></label>
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Password</span>
          <Input type="password" value={form.password} autoComplete="new-password" aria-describedby="password-help" onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required />
          <span id="password-help" className="block text-xs leading-5 text-slate-500">At least 12 characters with uppercase, lowercase, number, and symbol.</span>
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Account type</span>
          <Select value={form.role} onValueChange={(value) => setForm((current) => ({ ...current, role: value as UserRole }))} disabled>
            <SelectTrigger aria-label="Account type"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="PATIENT">Patient</SelectItem></SelectContent>
          </Select>
        </label>
        <Button className="w-full" disabled={loading}>{loading ? <InlineLoader label="Creating account" /> : "Continue to OTP"}</Button>
      </form>
    </AuthShell>
  );
}
