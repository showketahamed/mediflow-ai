import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AuthShell } from "@/app/pages/auth/AuthShared";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { useAuth } from "@/app/context/AuthContext";
import type { UserRole } from "@/types";
import { InlineLoader } from "@/app/components/common/LoadingStates";

export function LoginPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "admin@mediflow.demo", password: "Mediflow123!", remember: true, role: "HOSPITAL_ADMIN" as UserRole });

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your MediFlow AI workspace."
      footer={<span>Use your hospital credentials or <Link className="text-cyan-300" to="/register">create a patient account</Link>.</span>}
    >
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setLoading(true);
          try {
            await login(form);
            toast.success("Signed in successfully.");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to sign in.");
          } finally {
            setLoading(false);
          }
        }}
      >
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Email</span>
          <Input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} type="email" autoComplete="email" required />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Password</span>
          <div className="relative">
            <Input value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} type={showPassword ? "text" : "password"} autoComplete="current-password" required className="pr-11" />
            <button type="button" className="absolute inset-y-0 right-1 flex min-h-11 min-w-11 items-center justify-center text-slate-400" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Role</span>
          <Select value={form.role} onValueChange={(value) => setForm((current) => ({ ...current, role: value as UserRole }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
              <SelectItem value="HOSPITAL_ADMIN">Hospital Admin</SelectItem>
              <SelectItem value="DOCTOR">Doctor</SelectItem>
              <SelectItem value="NURSE">Nurse</SelectItem>
              <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
              <SelectItem value="LAB_TECHNICIAN">Lab Technician</SelectItem>
              <SelectItem value="PHARMACIST">Pharmacist</SelectItem>
              <SelectItem value="PATIENT">Patient</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input checked={form.remember} onChange={(event) => setForm((current) => ({ ...current, remember: event.target.checked }))} type="checkbox" className="h-4 w-4 rounded border-white/20 bg-white/5" />
          Remember me
        </label>
        <Button className="w-full" disabled={loading}>{loading ? <InlineLoader label="Signing in" /> : "Login"}</Button>
        <div className="flex justify-between text-sm">
          <Link to="/forgot-password" className="text-cyan-300">Forgot password?</Link>
          <Link to="/register" className="text-cyan-300">Register</Link>
        </div>
      </form>
    </AuthShell>
  );
}
