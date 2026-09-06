"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Database,
  Download,
  FolderSync,
  HardDrive,
  RefreshCw,
  Server,
  ShieldCheck,
  Trash2,
  UploadCloud,
  UserRound,
  CheckCircle2,
} from "lucide-react";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useUiStore } from "@/lib/store";
import { getFavorites } from "@/lib/utils/favorites";
import SetupStatus from "@/components/home/SetupStatus";

interface DisplaySettings {
  language: "en" | "th";
  privateMode: boolean;
  blurredJav: boolean;
}

const SETTINGS_KEY = "mv:settings";

function loadSettings(): DisplaySettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { language: "en", privateMode: false, blurredJav: true, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { language: "en", privateMode: false, blurredJav: true };
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Database;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass card-surface p-5">
      <h2 className="font-display mb-4 flex items-center gap-2 text-sm font-bold tracking-wide text-white">
        <Icon className="h-4 w-4 text-accent" />
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<DisplaySettings>(loadSettings);
  const pushToast = useUiStore((s) => s.pushToast);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const exportFavorites = () => {
    const blob = new Blob([JSON.stringify(getFavorites(), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "movievault-favorites.json";
    a.click();
    URL.revokeObjectURL(url);
    pushToast("Favorites exported successfully", "success");
  };

  const clearHistory = () => {
    localStorage.removeItem("mv:resume");
    pushToast("Watch history cleared", "info");
  };

  // --- Category 2: Local Harddisk Scanner ---
  const [scanFolder, setScanFolder] = useState("/mnt/storage/movievault/downloads");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ totalFound: number; addedCount: number; skippedCount: number } | null>(null);

  const handleScanLocal = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch("/api/library/scan-local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderPath: scanFolder }),
      });
      const data = await res.json();
      if (!res.ok) {
        pushToast(data.error || "Failed to scan folder", "error");
      } else {
        setScanResult(data);
        pushToast(`Scan completed! Added: ${data.addedCount}, Existing: ${data.skippedCount}`, "success");
      }
    } catch {
      pushToast("Error connecting to media scanner", "error");
    } finally {
      setScanning(false);
    }
  };

  // --- Category 2: qBittorrent Integration ---
  const [qbUrl, setQbUrl] = useState("http://127.0.0.1:8080");
  const [qbUsername, setQbUsername] = useState("admin");
  const [qbPassword, setQbPassword] = useState("");
  const [qbSavePath, setQbSavePath] = useState("/mnt/storage/movievault/downloads");
  const [savingQb, setSavingQb] = useState(false);

  useEffect(() => {
    fetch("/api/admin/torrent")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          if (d.qbUrl) setQbUrl(d.qbUrl);
          if (d.qbUsername) setQbUsername(d.qbUsername);
          if (d.qbSavePath) setQbSavePath(d.qbSavePath);
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveQbConfig = async () => {
    setSavingQb(true);
    try {
      const res = await fetch("/api/admin/torrent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_config",
          qbUrl,
          qbUsername,
          qbPassword: qbPassword || undefined,
          qbSavePath,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        pushToast("qBittorrent settings saved successfully", "success");
      } else {
        pushToast(data.error || "Failed to save qBittorrent config", "error");
      }
    } catch {
      pushToast("Error saving qBittorrent config", "error");
    } finally {
      setSavingQb(false);
    }
  };

  // --- Category 2: Database Snapshots & Backup Manager ---
  interface BackupFile {
    name: string;
    size: number;
    createdAt: number;
  }
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [creatingBackup, setCreatingBackup] = useState(false);

  const fetchBackups = async () => {
    try {
      const res = await fetch("/api/admin/backup");
      if (res.ok) {
        const d = await res.json();
        setBackups(d.backups || []);
      }
    } catch {}
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    try {
      const res = await fetch("/api/admin/backup", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        pushToast("Database snapshot created successfully!", "success");
        fetchBackups();
      } else {
        pushToast(data.error || "Backup failed", "error");
      }
    } catch {
      pushToast("Failed to initiate backup", "error");
    } finally {
      setCreatingBackup(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-xl font-bold text-white">Settings</h1>

      <Section icon={UserRound} title="Profile & Account">
        {isFirebaseConfigured ? (
          <p className="text-sm text-mist">
            Firebase connected — Auth system (Email/Password + Google) active.
          </p>
        ) : (
          <div className="rounded-lg border border-accent/20 bg-accent/5 p-4 text-sm text-slate-200">
            Local Mode: Settings are saved on this device (localStorage) until Firebase is configured in .env.local.
          </div>
        )}
      </Section>

      <Section icon={ShieldCheck} title="Display Preferences">
        <div className="space-y-4">
          <label className="flex items-center justify-between gap-4 text-sm text-slate-200">
            Language
            <select
              value={settings.language}
              disabled
              className="rounded-lg border border-white/10 bg-obsidian/60 px-3 py-2 text-sm text-slate-200 outline-none opacity-80 cursor-not-allowed"
            >
              <option value="en">English (System Default)</option>
            </select>
          </label>
          <label className="flex items-center justify-between gap-4 text-sm text-slate-200">
            Private Mode (Do not record watch history)
            <input
              type="checkbox"
              checked={settings.privateMode}
              onChange={(e) =>
                setSettings((s) => ({ ...s, privateMode: e.target.checked }))
              }
              className="h-5 w-5 accent-accent"
            />
          </label>
          <label className="flex items-center justify-between gap-4 text-sm text-slate-200">
            Blur adult covers until age verification
            <input
              type="checkbox"
              checked={settings.blurredJav}
              onChange={(e) =>
                setSettings((s) => ({ ...s, blurredJav: e.target.checked }))
              }
              className="h-5 w-5 accent-accent"
            />
          </label>
        </div>
      </Section>

      {/* Harddisk Media Scanner */}
      <Section icon={FolderSync} title="Local Storage & Harddisk Scanner">
        <div className="space-y-4">
          <p className="text-sm text-mist">
            Scan your connected external drive or media folder (e.g. NTFS mounted at <code className="rounded bg-white/10 px-1 py-0.5 text-accent">/mnt/storage/movievault/downloads</code>). Automatically recognizes JAV catalog codes (e.g. SSIS-842, FC2-PPV) and movies, importing them into your Vault.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={scanFolder}
              onChange={(e) => setScanFolder(e.target.value)}
              placeholder="/mnt/storage/movievault/downloads"
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-accent/60"
            />
            <button
              onClick={handleScanLocal}
              disabled={scanning}
              className="flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-obsidian shadow-neon-cyan transition hover:brightness-110 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
              {scanning ? "Scanning Media..." : "Scan Harddisk Folder"}
            </button>
          </div>

          {scanResult && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs sm:text-sm text-emerald-200">
              <div className="flex items-center gap-2 font-bold mb-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Folder Scan Completed
              </div>
              <div>Files Discovered: <strong>{scanResult.totalFound}</strong> | Newly Added: <strong>{scanResult.addedCount}</strong> | Skipped / Existing: <strong>{scanResult.skippedCount}</strong></div>
            </div>
          )}
        </div>
      </Section>

      {/* qBittorrent Integration */}
      <Section icon={Server} title="qBittorrent WebUI Downloader">
        <div className="space-y-4">
          <p className="text-sm text-mist">
            Send magnet links directly from the JAV catalog to your local qBittorrent daemon running on Orange Pi or your server.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-mist block mb-1">qBittorrent WebUI URL</label>
              <input
                type="text"
                value={qbUrl}
                onChange={(e) => setQbUrl(e.target.value)}
                placeholder="http://127.0.0.1:8080"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent/60"
              />
            </div>
            <div>
              <label className="text-xs text-mist block mb-1">Target Save Path</label>
              <input
                type="text"
                value={qbSavePath}
                onChange={(e) => setQbSavePath(e.target.value)}
                placeholder="/mnt/storage/movievault/downloads"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent/60"
              />
            </div>
            <div>
              <label className="text-xs text-mist block mb-1">Username</label>
              <input
                type="text"
                value={qbUsername}
                onChange={(e) => setQbUsername(e.target.value)}
                placeholder="admin"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent/60"
              />
            </div>
            <div>
              <label className="text-xs text-mist block mb-1">Password</label>
              <input
                type="password"
                value={qbPassword}
                onChange={(e) => setQbPassword(e.target.value)}
                placeholder="Leave blank to keep current"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent/60"
              />
            </div>
          </div>

          <button
            onClick={handleSaveQbConfig}
            disabled={savingQb}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-accent to-neon px-4 py-2 text-sm font-semibold text-obsidian shadow-neon-cyan transition hover:brightness-110 disabled:opacity-50"
          >
            {savingQb ? "Saving..." : "Save qBittorrent Configuration"}
          </button>
        </div>
      </Section>

      {/* Database Backup & Snapshot Manager */}
      <Section icon={HardDrive} title="Database Snapshots & Auto Backup">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white">Full SQLite Database Snapshots</p>
              <p className="text-xs text-mist">
                Automated rotating snapshots stored securely in <code className="rounded bg-white/10 px-1 py-0.5 text-accent">data/backups/</code> (keeps newest 14 snapshots).
              </p>
            </div>
            <button
              onClick={handleCreateBackup}
              disabled={creatingBackup}
              className="flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent transition hover:bg-accent/20 disabled:opacity-50 shrink-0"
            >
              <UploadCloud className={`h-4 w-4 ${creatingBackup ? "animate-bounce" : ""}`} />
              {creatingBackup ? "Creating..." : "Create Backup Snapshot"}
            </button>
          </div>

          {backups.length > 0 ? (
            <div className="divide-y divide-white/5 rounded-xl border border-white/10 bg-white/[0.02]">
              {backups.slice(0, 5).map((b) => (
                <div key={b.name} className="flex items-center justify-between p-3 text-xs sm:text-sm">
                  <div className="flex items-center gap-2 text-slate-200">
                    <Database className="h-4 w-4 text-neon" />
                    <span className="font-mono">{b.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-mist text-xs">
                    <span>{(b.size / (1024 * 1024)).toFixed(2)} MB</span>
                    <span>{new Date(b.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-mist italic">No backup snapshots generated yet.</p>
          )}
        </div>
      </Section>

      <Section icon={Database} title="Data Management">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={exportFavorites}
            className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-200 transition hover:bg-white/5"
          >
            <Download className="h-4 w-4" />
            Export Favorites (JSON)
          </button>
          <button
            onClick={clearHistory}
            className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-200 transition hover:bg-white/5"
          >
            <Trash2 className="h-4 w-4" />
            Clear Watch History
          </button>
          <button
            onClick={() => router.push("/history")}
            className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-200 transition hover:bg-white/5"
          >
            View Watch History
          </button>
        </div>
      </Section>

      <Section icon={ShieldCheck} title="System Diagnostics & Status">
        <SetupStatus />
      </Section>
    </div>
  );
}