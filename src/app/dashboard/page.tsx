"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Upload,
  Download,
  Share2,
  Globe,
  Activity,
  ArrowLeft,
  Video,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportData {
  totalVisitors: number;
  actions: {
    visit: number;
    upload: number;
    download: number;
    share: number;
    videoGenerate: number;
  };
  sources: {
    source: string;
    count: number;
  }[];
  timeseries: {
    date: string;
    visits: number;
    uploads: number;
    downloads: number;
    shares: number;
  }[];
}

type DateRange = "today" | "7d" | "30d";

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<DateRange>("7d");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchReports = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const res = await fetch(`/api/reports?range=${range}`);
        if (!res.ok) throw new Error("Failed to fetch reports");
        const json: ReportData = await res.json();
        setData(json);
        setError(null);
        setLastUpdated(new Date());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [range]
  );

  // Initial fetch + re-fetch when range changes
  useEffect(() => {
    fetchReports(true);
  }, [fetchReports]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(() => fetchReports(false), 60_000);
    return () => clearInterval(interval);
  }, [fetchReports]);

  // ─── Loading State ──────────────────────────────────────────────────────────
  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Activity className="w-10 h-10 animate-spin text-[#e4006c]" />
          <p className="text-gray-400 text-sm animate-pulse">Loading analytics…</p>
        </div>
      </div>
    );
  }

  // ─── Error State ────────────────────────────────────────────────────────────
  if (error && !data) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex flex-col items-center justify-center text-red-400 p-8 text-center">
        <p className="text-xl font-medium mb-4">Error loading dashboard: {error}</p>
        <Link href="/" className="text-[#e4006c] hover:text-[#e4006c]/80 underline">
          Return Home
        </Link>
      </div>
    );
  }

  if (!data) return null;

  const totalActions =
    data.actions.visit +
    data.actions.upload +
    data.actions.download +
    data.actions.share +
    data.actions.videoGenerate;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0f1117] text-gray-100 font-sans selection:bg-[#e4006c]/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
              Analytics Dashboard
            </h1>
            <p className="text-gray-500 text-sm">
              Live user engagement data from DynamoDB
              {lastUpdated && (
                <span className="ml-2 text-gray-600">
                  · Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              onClick={() => fetchReports(false)}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-[#e4006c] hover:border-[#e4006c]/30 transition-all"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to App
            </Link>
          </div>
        </div>

        {/* ── Date Range Tabs ────────────────────────────────────────────── */}
        <div className="flex gap-2">
          {(["today", "7d", "30d"] as DateRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                range === r
                  ? "bg-gradient-to-r from-[#b60055] to-[#e4006c] text-white shadow-lg shadow-[#e4006c]/20"
                  : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10"
              }`}
            >
              {r === "today" ? "Today" : r === "7d" ? "7 Days" : "30 Days"}
            </button>
          ))}
        </div>

        {/* ── KPI Cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard
            title="Visitors"
            value={data.totalVisitors}
            icon={<Users className="w-5 h-5" />}
            color="#3b82f6"
          />
          <KpiCard
            title="Page Views"
            value={data.actions.visit}
            icon={<Activity className="w-5 h-5" />}
            color="#8b5cf6"
          />
          <KpiCard
            title="Uploads"
            value={data.actions.upload}
            icon={<Upload className="w-5 h-5" />}
            color="#e4006c"
          />
          <KpiCard
            title="Downloads"
            value={data.actions.download}
            icon={<Download className="w-5 h-5" />}
            color="#10b981"
          />
          <KpiCard
            title="Shares"
            value={data.actions.share}
            icon={<Share2 className="w-5 h-5" />}
            color="#f59e0b"
          />
        </div>

        {/* ── Charts Row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Line Chart — Daily Visits */}
          <div className="bg-[#161a25] border border-white/5 rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
              <Activity className="w-5 h-5 text-[#8b5cf6]" />
              Daily Visits
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.timeseries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                  <XAxis
                    dataKey="date"
                    stroke="#4b5563"
                    fontSize={11}
                    tickFormatter={(v: string) => {
                      const d = new Date(v + "T00:00:00");
                      return `${d.getMonth() + 1}/${d.getDate()}`;
                    }}
                  />
                  <YAxis stroke="#4b5563" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e2230",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      color: "#e5e7eb",
                      fontSize: "13px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="visits"
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    dot={{ fill: "#8b5cf6", r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar Chart — Event Breakdown */}
          <div className="bg-[#161a25] border border-white/5 rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
              <Video className="w-5 h-5 text-[#e4006c]" />
              Event Breakdown
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.timeseries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                  <XAxis
                    dataKey="date"
                    stroke="#4b5563"
                    fontSize={11}
                    tickFormatter={(v: string) => {
                      const d = new Date(v + "T00:00:00");
                      return `${d.getMonth() + 1}/${d.getDate()}`;
                    }}
                  />
                  <YAxis stroke="#4b5563" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e2230",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      color: "#e5e7eb",
                      fontSize: "13px",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "12px", color: "#9ca3af" }}
                  />
                  <Bar dataKey="uploads" fill="#e4006c" radius={[4, 4, 0, 0]} name="Uploads" />
                  <Bar dataKey="downloads" fill="#10b981" radius={[4, 4, 0, 0]} name="Downloads" />
                  <Bar dataKey="shares" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Shares" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── Bottom Row — Action Breakdown + Sources ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Action Breakdown */}
          <div className="col-span-1 lg:col-span-2 bg-[#161a25] border border-white/5 rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-white">
              <Activity className="w-5 h-5 text-[#e4006c]" />
              Action Breakdown
            </h3>
            <div className="space-y-5">
              <ActionRow
                label="Page Views"
                count={data.actions.visit}
                total={totalActions}
                color="#8b5cf6"
              />
              <ActionRow
                label="Uploads & Captures"
                count={data.actions.upload}
                total={totalActions}
                color="#e4006c"
              />
              <ActionRow
                label="Video Generations"
                count={data.actions.videoGenerate}
                total={totalActions}
                color="#6366f1"
              />
              <ActionRow
                label="Downloads"
                count={data.actions.download}
                total={totalActions}
                color="#10b981"
              />
              <ActionRow
                label="Shares"
                count={data.actions.share}
                total={totalActions}
                color="#f59e0b"
              />
            </div>
          </div>

          {/* Traffic Sources */}
          <div className="bg-[#161a25] border border-white/5 rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-white">
              <Globe className="w-5 h-5 text-[#3b82f6]" />
              Traffic Sources
            </h3>

            {data.sources.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-600">
                <Globe className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm">No source data yet</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {data.sources
                  .sort((a, b) => b.count - a.count)
                  .map((item, i) => {
                    const maxCount = data.sources[0]?.count || 1;
                    const pct = Math.round((item.count / maxCount) * 100);
                    return (
                      <li
                        key={i}
                        className="relative p-3.5 rounded-xl bg-white/[0.03] border border-white/5 overflow-hidden"
                      >
                        {/* Background bar */}
                        <div
                          className="absolute inset-y-0 left-0 bg-[#3b82f6]/10 transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                        <div className="relative flex items-center justify-between">
                          <span className="font-medium text-gray-300 capitalize text-sm truncate max-w-[160px]">
                            {item.source}
                          </span>
                          <span className="text-sm font-semibold text-[#3b82f6]">
                            {item.count}
                          </span>
                        </div>
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-[#161a25] border border-white/5 rounded-2xl p-5 relative overflow-hidden group hover:border-white/10 transition-all">
      {/* Glow accent */}
      <div
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"
        style={{ backgroundColor: color }}
      />
      <div className="relative">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {icon}
        </div>
        <h4 className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">
          {title}
        </h4>
        <p className="text-2xl font-bold text-white tracking-tight">
          {value.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

function ActionRow({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((count / total) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between mb-2 text-sm">
        <span className="text-gray-400 font-medium">{label}</span>
        <span className="text-white font-semibold">
          {count.toLocaleString()}{" "}
          <span className="text-gray-500 font-normal">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
