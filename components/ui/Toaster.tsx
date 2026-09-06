"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useUiStore, type ToastKind } from "@/lib/store";

const STYLES: Record<ToastKind, { ring: string; icon: typeof Info }> = {
  info: { ring: "border-accent/40 text-accent", icon: Info },
  success: { ring: "border-emerald-400/40 text-emerald-300", icon: CheckCircle2 },
  error: { ring: "border-red-400/40 text-red-300", icon: AlertCircle },
};

export default function Toaster() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);

  return (
    <div className="pointer-events-none fixed bottom-20 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 lg:bottom-6">
      <AnimatePresence>
        {toasts.map((toast) => {
          const style = STYLES[toast.kind];
          const Icon = style.icon;
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              className={`pointer-events-auto glass-strong flex items-start gap-2.5 rounded-lg border ${style.ring} p-3 text-sm shadow-glass`}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="flex-1 text-slate-200">{toast.message}</p>
              <button
                onClick={() => dismiss(toast.id)}
                className="text-mist transition-colors hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}