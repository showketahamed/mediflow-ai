import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { VitalPoint, WeeklyFlowPoint } from "@/types";

export function VitalChart({ data }: { data: VitalPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220} debounce={100}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="gHR" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.28} /><stop offset="95%" stopColor="#06b6d4" stopOpacity={0} /></linearGradient>
          <linearGradient id="gBP" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.28} /><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient>
          <linearGradient id="gO2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.28} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip />
        <Area isAnimationActive={false} type="monotone" dataKey="hr" stroke="#06b6d4" fill="url(#gHR)" />
        <Area isAnimationActive={false} type="monotone" dataKey="bp" stroke="#8b5cf6" fill="url(#gBP)" />
        <Area isAnimationActive={false} type="monotone" dataKey="spo2" stroke="#10b981" fill="url(#gO2)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function FlowChart({ data }: { data: WeeklyFlowPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220} debounce={100}>
      <BarChart data={data}>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip />
        <Bar isAnimationActive={false} dataKey="admissions" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
        <Bar isAnimationActive={false} dataKey="discharges" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
