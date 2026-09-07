"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Info, Trash2, X } from "lucide-react";
import { useUiStore } from "@/lib/store";

export default function ConfirmModalHost() {
  const dialog = useUiStore((s) => s.confirmDialog);
  const close = useUiStore((s) => s.closeConfirm);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dialog) {
        if (dialog.onCancel) dialog.onCancel();
        else close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog, close]);

  if (!dialog) return null;

  const kind = dialog.kind || "danger";
  const isDanger = kind === "danger";
  const isWarning = kind === "warning";

  const handleCancel = () => {
    if (dialog.onCancel) dialog.onCancel();
    else close();
  };

  const handleConfirm = () => {
    dialog.onConfirm();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleCancel}
          className="absolute inset-0 bg-obsidian/85 backdrop-blur-md"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-surface/95 p-6 shadow-2xl backdrop-blur-xl"
          style={{
            boxShadow: isDanger
              ? "0 0 40px rgba(244, 63, 94, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
              : isWarning
                ? "0 0 40px rgba(245, 158, 11, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
                : "0 0 40px rgba(6, 182, 212, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
          }}
        >
          {/* Ambient Glow */}
          <div
            className={`pointer-events-none absolute -top-24 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full blur-3xl ${
              isDanger
                ? "bg-rose-500/20"
                : isWarning
                  ? "bg-amber-500/20"
                  : "bg-cyan-500/20"
            }`}
          />

          {/* Close button */}
          <button
            onClick={handleCancel}
            className="absolute top-4 right-4 rounded-lg p-1.5 text-mist transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-4">
            {/* Icon Bubble */}
            <div
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border ${
                isDanger
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                  : isWarning
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                    : "border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              }`}
            >
              {isDanger ? (
                <Trash2 className="h-6 w-6" />
              ) : isWarning ? (
                <AlertTriangle className="h-6 w-6" />
              ) : (
                <Info className="h-6 w-6" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 space-y-1.5 pt-0.5">
              <h3 className="font-display text-base font-bold text-white tracking-wide">
                {dialog.title || (isDanger ? "ยืนยันการลบรายการ" : "ยืนยันการดำเนินการ")}
              </h3>
              <p className="text-sm leading-relaxed text-slate-300">
                {dialog.message}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white active:scale-95"
            >
              {dialog.cancelText || "ยกเลิก"}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              autoFocus
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition active:scale-95 ${
                isDanger
                  ? "bg-rose-600 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)] hover:bg-rose-500 hover:shadow-[0_0_25px_rgba(244,63,94,0.6)]"
                  : isWarning
                    ? "bg-amber-500 text-obsidian shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:bg-amber-400 hover:shadow-[0_0_25px_rgba(245,158,11,0.6)]"
                    : "bg-cyan-500 text-obsidian shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:bg-cyan-400 hover:shadow-[0_0_25px_rgba(6,182,212,0.6)]"
              }`}
            >
              {isDanger && <Trash2 className="h-3.5 w-3.5" />}
              <span>{dialog.confirmText || (isDanger ? "ลบรายการ" : "ยืนยัน")}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
