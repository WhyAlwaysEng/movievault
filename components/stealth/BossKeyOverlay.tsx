"use client";

import { useEffect, useState } from "react";
import { useUiStore } from "@/lib/store";
import {
  AlignLeft,
  Bold,
  ChevronDown,
  Code2,
  FileSpreadsheet,
  Filter,
  Grid,
  Italic,
  RotateCcw,
  Save,
  Search,
  Share2,
  Table,
  Underline,
  X,
} from "lucide-react";

export default function BossKeyOverlay() {
  const bossKeyActive = useUiStore((s) => s.bossKeyActive);
  const setBossKey = useUiStore((s) => s.setBossKey);
  const [decoyMode, setDecoyMode] = useState<"excel" | "code">("excel");

  // Global key listener for ~ (tilde/backtick) or Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is actively writing inside an input or textarea
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (e.key === "`" || e.key === "~") {
        if (!isInput || bossKeyActive) {
          e.preventDefault();
          setBossKey(!bossKeyActive);
        }
      } else if (e.key === "Escape" && bossKeyActive) {
        e.preventDefault();
        setBossKey(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [bossKeyActive, setBossKey]);

  // When Boss Key becomes active, immediately pause all media
  useEffect(() => {
    if (bossKeyActive) {
      document.querySelectorAll("video, audio").forEach((el) => {
        try {
          (el as HTMLMediaElement).pause();
        } catch {
          /* ignore */
        }
      });
    }
  }, [bossKeyActive]);

  if (!bossKeyActive) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col bg-[#107c41] select-none text-black font-sans"
      style={{ fontFamily: "'Segoe UI', Roboto, sans-serif" }}
    >
      {decoyMode === "excel" ? (
        <div className="flex h-full w-full flex-col bg-white">
          {/* Top Title Bar */}
          <div className="flex items-center justify-between bg-[#107c41] px-4 py-1.5 text-white">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <FileSpreadsheet className="h-4 w-4" />
              <span>AutoSave On</span>
              <span className="opacity-40">|</span>
              <span className="font-bold tracking-wide">
                FY26_Q3_Consolidated_Budget_Analysis_v4.xlsx - Excel
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <button
                onClick={() => setDecoyMode("code")}
                className="flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-[11px] hover:bg-white/20"
                title="Switch to Code view"
              >
                <Code2 className="h-3 w-3" />
                IDE View
              </button>
              <button
                onClick={() => setBossKey(false)}
                className="flex items-center gap-1 rounded bg-white/20 px-2 py-0.5 text-xs font-bold hover:bg-red-600 hover:text-white"
                title="Press ~ or Esc to return"
              >
                <X className="h-3.5 w-3.5" />
                <span>Exit (Esc)</span>
              </button>
            </div>
          </div>

          {/* Ribbon Menu Tabs */}
          <div className="flex border-b border-gray-200 bg-[#f3f2f1] px-2 text-xs text-gray-800">
            {["File", "Home", "Insert", "Page Layout", "Formulas", "Data", "Review", "View", "Automate", "Help"].map(
              (tab, idx) => (
                <button
                  key={tab}
                  className={`px-3 py-1.5 ${
                    idx === 1
                      ? "border-b-2 border-[#107c41] font-semibold text-[#107c41]"
                      : "hover:bg-gray-200"
                  }`}
                >
                  {tab}
                </button>
              ),
            )}
          </div>

          {/* Ribbon Toolbar */}
          <div className="flex items-center gap-4 border-b border-gray-200 bg-[#f3f2f1] px-4 py-2 text-xs text-gray-700">
            <div className="flex items-center gap-1 border-r border-gray-300 pr-3">
              <button className="rounded p-1 hover:bg-gray-200"><Save className="h-4 w-4" /></button>
              <button className="rounded p-1 hover:bg-gray-200"><RotateCcw className="h-4 w-4" /></button>
            </div>
            <div className="flex items-center gap-1 border-r border-gray-300 pr-3">
              <select className="h-6 rounded border border-gray-300 bg-white px-2 text-[11px]" defaultValue="Aptos">
                <option>Aptos</option>
                <option>Calibri</option>
                <option>Segoe UI</option>
              </select>
              <select className="h-6 rounded border border-gray-300 bg-white px-1 text-[11px]" defaultValue="11">
                <option>10</option>
                <option>11</option>
                <option>12</option>
              </select>
              <button className="rounded p-1 font-bold hover:bg-gray-200"><Bold className="h-3.5 w-3.5" /></button>
              <button className="rounded p-1 italic hover:bg-gray-200"><Italic className="h-3.5 w-3.5" /></button>
              <button className="rounded p-1 underline hover:bg-gray-200"><Underline className="h-3.5 w-3.5" /></button>
            </div>
            <div className="flex items-center gap-2 border-r border-gray-300 pr-3">
              <button className="rounded p-1 hover:bg-gray-200"><Table className="h-4 w-4" /></button>
              <button className="rounded p-1 hover:bg-gray-200"><Grid className="h-4 w-4" /></button>
              <button className="rounded p-1 hover:bg-gray-200"><Filter className="h-4 w-4" /></button>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-gray-500">General</span>
              <span className="ml-2 font-mono text-[11px] text-gray-600">$ %,</span>
            </div>
          </div>

          {/* Formula Bar */}
          <div className="flex items-center border-b border-gray-200 bg-white px-3 py-1 text-xs">
            <span className="w-12 font-mono font-semibold text-gray-600">D14</span>
            <span className="px-2 font-serif italic text-gray-400">fx</span>
            <div className="flex-1 font-mono text-gray-800">
              =SUM(D4:D13)*1.085 - SUM(F4:F13)
            </div>
          </div>

          {/* Spreadsheet Grid */}
          <div className="flex-1 overflow-auto bg-white text-xs">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#f3f2f1] text-gray-600 font-normal">
                  <th className="w-10 border border-gray-300 p-1 text-center font-normal"></th>
                  {["A", "B", "C", "D", "E", "F", "G", "H"].map((col) => (
                    <th key={col} className="border border-gray-300 p-1 text-center font-normal">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { id: 1, a: "Cost Center", b: "Department", c: "Q1 Actual", d: "Q2 Actual", e: "Q3 Forecast", f: "YoY Growth", g: "Variance", h: "Status" },
                  { id: 2, a: "CC-1020", b: "Cloud Infrastructure", c: "$124,500", d: "$138,200", e: "$142,000", f: "+14.1%", g: "-$3,800", h: "Approved" },
                  { id: 3, a: "CC-1044", b: "Engineering Payroll", c: "$482,000", d: "$491,500", e: "$510,000", f: "+5.8%", g: "-$18,500", h: "Approved" },
                  { id: 4, a: "CC-2010", b: "Enterprise Sales", c: "$298,400", d: "$310,000", e: "$345,000", f: "+15.6%", g: "+$35,000", h: "Exceeding" },
                  { id: 5, a: "CC-2055", b: "Marketing & Growth", c: "$89,000", d: "$92,400", e: "$95,000", f: "+6.7%", g: "-$2,600", h: "Under Review" },
                  { id: 6, a: "CC-3080", b: "Cybersecurity & Audit", c: "$64,200", d: "$66,800", e: "$71,500", f: "+11.4%", g: "-$4,700", h: "Approved" },
                  { id: 7, a: "CC-3092", b: "Legal & Compliance", c: "$45,000", d: "$47,200", e: "$48,000", f: "+6.7%", g: "-$800", h: "Approved" },
                  { id: 8, a: "CC-4011", b: "Office & Facilities", c: "$31,500", d: "$32,100", e: "$32,000", f: "+1.6%", g: "+$100", h: "Stable" },
                  { id: 9, a: "CC-5012", b: "Product Design (UX/UI)", c: "$78,600", d: "$81,200", e: "$85,000", f: "+8.1%", g: "-$3,800", h: "Approved" },
                  { id: 10, a: "CC-6001", b: "Data Science & AI Pipeline", c: "$182,400", d: "$204,500", e: "$228,000", f: "+25.0%", g: "-$23,500", h: "Flagged" },
                  { id: 11, a: "CC-7023", b: "Customer Success", c: "$56,100", d: "$58,000", e: "$60,200", f: "+7.3%", g: "-$2,200", h: "Approved" },
                  { id: 12, a: "CC-8800", b: "R&D Innovations", c: "$115,000", d: "$120,400", e: "$130,000", f: "+13.0%", g: "-$9,600", h: "Pending" },
                  { id: 13, a: "CC-9010", b: "Contingency Reserve", c: "$40,000", d: "$40,000", e: "$50,000", f: "+25.0%", g: "-$10,000", h: "Approved" },
                  { id: 14, a: "TOTAL", b: "Consolidated Sum", c: "$1,526,700", d: "$1,622,300", e: "$1,716,700", f: "+12.4%", g: "-$44,400", h: "ON TRACK" },
                ].map((row, idx) => {
                  const isHeader = idx === 0;
                  const isTotal = row.a === "TOTAL";
                  return (
                    <tr
                      key={row.id}
                      className={
                        isHeader
                          ? "bg-gray-100 font-bold text-gray-700"
                          : isTotal
                          ? "bg-[#e2f0d9] font-bold text-gray-900 border-t-2 border-b-2 border-black"
                          : idx % 2 === 0
                          ? "bg-white"
                          : "bg-[#fcfcfc]"
                      }
                    >
                      <td className="border border-gray-300 bg-[#f3f2f1] text-center text-gray-500 font-mono text-[11px]">
                        {row.id}
                      </td>
                      <td className="border border-gray-300 px-3 py-1 font-mono">{row.a}</td>
                      <td className="border border-gray-300 px-3 py-1 font-medium">{row.b}</td>
                      <td className="border border-gray-300 px-3 py-1 text-right font-mono">{row.c}</td>
                      <td className="border border-gray-300 px-3 py-1 text-right font-mono">{row.d}</td>
                      <td className="border border-gray-300 px-3 py-1 text-right font-mono font-semibold">{row.e}</td>
                      <td className={`border border-gray-300 px-3 py-1 text-right font-mono ${row.f.startsWith("+") ? "text-emerald-700" : "text-rose-700"}`}>{row.f}</td>
                      <td className="border border-gray-300 px-3 py-1 text-right font-mono text-gray-600">{row.g}</td>
                      <td className="border border-gray-300 px-3 py-1 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          row.h === "Approved" || row.h === "ON TRACK" ? "bg-emerald-100 text-emerald-800" :
                          row.h === "Flagged" ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-700"
                        }`}>
                          {row.h}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Sheet Tabs & Status Bar */}
          <div className="flex items-center justify-between border-t border-gray-300 bg-[#f3f2f1] px-4 py-1 text-xs text-gray-700">
            <div className="flex items-center gap-1">
              {["Q3_Consolidated", "Department_CapEx", "P&L_Detail", "Staffing_Model"].map((sheet, i) => (
                <button
                  key={sheet}
                  className={`rounded-t px-3 py-1 text-[11px] font-medium ${
                    i === 0
                      ? "border-t-2 border-[#107c41] bg-white font-bold text-[#107c41]"
                      : "hover:bg-gray-200"
                  }`}
                >
                  {sheet}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4 text-[11px] text-gray-600 font-mono">
              <span>Ready</span>
              <span>Average: $472,100</span>
              <span>Count: 48</span>
              <span className="font-bold text-gray-900">Sum: $1,716,700</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      ) : (
        /* VS Code IDE Decoy */
        <div className="flex h-full w-full flex-col bg-[#1e1e1e] text-[#d4d4d4] font-mono text-xs">
          <div className="flex items-center justify-between bg-[#323233] px-4 py-1.5 text-xs text-gray-300">
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-blue-400" />
              <span>kubernetes-cluster-deploy.ts — MovieVault Production — Visual Studio Code</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDecoyMode("excel")}
                className="rounded bg-white/10 px-2 py-0.5 text-[11px] hover:bg-white/20"
              >
                Excel View
              </button>
              <button
                onClick={() => setBossKey(false)}
                className="rounded bg-white/20 px-2 py-0.5 text-xs font-bold hover:bg-red-600"
              >
                Exit (Esc)
              </button>
            </div>
          </div>
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Explorer */}
            <div className="w-56 border-r border-[#2d2d2d] bg-[#252526] p-3 text-[11px] leading-relaxed">
              <p className="font-bold uppercase tracking-wider text-gray-400">EXPLORER</p>
              <p className="mt-2 text-white font-semibold">📁 src/services/infra</p>
              <p className="pl-3 text-emerald-400">📄 cluster-config.yaml</p>
              <p className="pl-3 text-blue-400 font-bold">📄 kubernetes-deploy.ts</p>
              <p className="pl-3 text-yellow-400">📄 load-balancer.conf</p>
              <p className="pl-3 text-gray-400">📄 health-probe.go</p>
            </div>
            {/* Code editor pane */}
            <div className="flex-1 overflow-auto p-4 leading-relaxed">
              <pre className="text-gray-300">
{`import { KubernetesCluster, PodSpec, ServiceMesh } from "@cloud/k8s-engine";
import { Logger } from "../logging/telemetry";

/**
 * Production Microservice Orchestration & Rolling Deployment Policy
 */
export async function deployProductionWorkloads(): Promise<DeploymentResult> {
  const cluster = new KubernetesCluster({
    region: "ap-southeast-1",
    nodePools: [
      { name: "primary-compute", minNodes: 6, maxNodes: 32, machineType: "c3-standard-8" },
      { name: "gpu-inference", minNodes: 2, maxNodes: 8, machineType: "a2-highgpu-1g" },
    ],
    ingress: { tlsEnabled: true, hsts: true, rateLimitPerIp: 1200 },
  });

  Logger.info("Initiating zero-downtime rolling update (Blue/Green canary deployment)...");

  const mesh = new ServiceMesh(cluster);
  await mesh.applyTrafficSplitting({
    baselineWeight: 90,
    canaryWeight: 10,
    healthCheckIntervalSeconds: 3,
  });

  Logger.info("Cluster healthy. Latency p99: 14.2ms. All checks passed.");
  return { status: "ACTIVE", healthyPods: 48, replicas: 12 };
}`}
              </pre>
            </div>
          </div>
          <div className="flex items-center justify-between bg-[#007acc] px-4 py-1 text-[11px] text-white">
            <span>main* — Ready</span>
            <span>UTF-8 · TypeScript · Prettier</span>
          </div>
        </div>
      )}
    </div>
  );
}
