import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Sector, Legend,
} from "recharts";
import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Shared glass tooltip style ───────────────────────────────────────────────
const tooltipStyle = {
  background: "rgba(15,12,41,0.92)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(139,92,246,0.25)",
  borderRadius: "12px",
};

// ─── BAR CHART ────────────────────────────────────────────────────────────────
interface BarData { name: string; value: number; }

function BarCustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-4 py-3 rounded-xl shadow-2xl border border-violet-500/20" style={tooltipStyle}>
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <p className="text-lg font-bold text-white">
        {payload[0].value}
        <span className="text-xs font-normal text-muted-foreground ml-1">events</span>
      </p>
    </div>
  );
}

export function BarChartComponent({ data, title, className }: { data: BarData[]; title: string; className?: string }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [selected, setSelected] = useState<BarData | null>(null);

  return (
    <div className={cn("glass-card p-4 sm:p-6 relative", className)}>
      <h3 className="font-semibold mb-4 text-foreground">{title}</h3>
      <div className="h-64 relative">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} onMouseLeave={() => setActiveIndex(null)} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={1} />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.55} />
              </linearGradient>
              <linearGradient id="barGradHover" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#A78BFA" stopOpacity={1} />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.8} />
              </linearGradient>
              <filter id="barShadow">
                <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#8B5CF6" floodOpacity="0.35" />
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<BarCustomTooltip />} cursor={{ fill: "rgba(139,92,246,0.08)" }} />
            <Bar
              dataKey="value"
              radius={[8, 8, 0, 0]}
              onMouseEnter={(_, i) => setActiveIndex(i)}
              onClick={(d) => setSelected({ name: String(d.name), value: Number(d.value) })}
              animationDuration={1200}
              animationEasing="ease-out"
            >
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={activeIndex === i ? "url(#barGradHover)" : "url(#barGrad)"}
                  filter={activeIndex === i ? "url(#barShadow)" : "none"}
                  style={{ cursor: "pointer", transition: "all 0.2s" }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex items-center justify-center z-20"
            >
              <div className="glass-card p-4 rounded-xl relative text-center min-w-[160px] shadow-2xl border border-violet-500/20">
                <button onClick={() => setSelected(null)} className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/10 transition-colors">
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <p className="text-sm text-muted-foreground">{selected.name}</p>
                <p className="text-3xl font-bold text-foreground mt-1">{selected.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{selected.value} events in {selected.name}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── DONUT CHART ──────────────────────────────────────────────────────────────
const DONUT_COLORS = ["#8B5CF6", "#EC4899", "#F59E0B", "#06B6D4", "#3B82F6", "#10B981"];

interface DonutData { name: string; value: number; color?: string; }

interface ActiveShapeProps {
  cx: number; cy: number; innerRadius: number; outerRadius: number;
  startAngle: number; endAngle: number; fill: string;
  payload: DonutData; percent: number; value: number;
}

function ActiveShape(props: ActiveShapeProps) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  return (
    <g>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius - 4} outerRadius={outerRadius + 12}
        startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.18}
        style={{ filter: "blur(8px)" }} />
      <Sector cx={cx} cy={cy} innerRadius={innerRadius - 2} outerRadius={outerRadius + 8}
        startAngle={startAngle} endAngle={endAngle} fill={fill} stroke="hsl(var(--background))" strokeWidth={2} />
      <text x={cx} y={cy - 8} textAnchor="middle" fill="hsl(var(--foreground))" fontSize={16} fontWeight={700}>{value}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={11}>{payload.name}</text>
      <text x={cx} y={cy + 28} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={10}>{`${(percent * 100).toFixed(0)}%`}</text>
    </g>
  );
}

function DonutTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: DonutData & { color: string } }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-4 py-3 rounded-xl shadow-2xl border border-violet-500/20" style={tooltipStyle}>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-3 h-3 rounded-full" style={{ background: payload[0].payload.color }} />
        <span className="text-sm font-medium text-white">{payload[0].name}</span>
      </div>
      <p className="text-lg font-bold text-white">{payload[0].value}<span className="text-xs font-normal text-muted-foreground ml-1">events</span></p>
    </div>
  );
}

export function DonutChart({ data, title, className }: { data: DonutData[]; title: string; className?: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selected, setSelected] = useState<(DonutData & { color: string; percent: number }) | null>(null);

  const coloredData = useMemo(() => data.map((d, i) => ({ ...d, color: d.color || DONUT_COLORS[i % DONUT_COLORS.length] })), [data]);
  const total = useMemo(() => coloredData.reduce((s, d) => s + d.value, 0), [coloredData]);

  const onEnter = useCallback((_: unknown, i: number) => setActiveIndex(i), []);
  const onClickSlice = useCallback((_: unknown, i: number) => {
    const e = coloredData[i];
    setSelected({ ...e, percent: total > 0 ? (e.value / total) * 100 : 0 });
  }, [coloredData, total]);

  return (
    <div className={cn("glass-card p-4 sm:p-6 relative", className)}>
      <h3 className="font-semibold mb-4 text-foreground">{title}</h3>
      <div className="h-64 relative">
        {total === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-20 h-20 rounded-full border-4 border-dashed border-white/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-muted-foreground/30">0</span>
            </div>
            <p className="text-sm text-muted-foreground">No events yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                {...({ activeIndex, activeShape: ActiveShape } as Record<string, unknown>)}
                data={coloredData} cx="50%" cy="50%"
                innerRadius={55} outerRadius={75} paddingAngle={3} dataKey="value"
                onMouseEnter={onEnter} onClick={onClickSlice}
                animationDuration={1200} animationEasing="ease-out" stroke="none"
              >
                {coloredData.map((e, i) => <Cell key={i} fill={e.color} style={{ cursor: "pointer" }} />)}
              </Pie>
              <Tooltip content={<DonutTooltip />} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8}
                formatter={(v: string) => <span className="text-xs text-muted-foreground font-medium">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        )}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex items-center justify-center z-20"
            >
              <div className="glass-card p-4 rounded-xl relative text-center min-w-[160px] shadow-2xl border border-violet-500/20">
                <button onClick={() => setSelected(null)} className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/10 transition-colors">
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ background: selected.color }} />
                  <p className="text-sm text-muted-foreground">{selected.name}</p>
                </div>
                <p className="text-3xl font-bold text-foreground">{selected.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{selected.percent.toFixed(1)}% of total</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
