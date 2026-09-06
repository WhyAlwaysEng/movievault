"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lock } from "lucide-react";
import { PIN_HASH_KEY } from "@/lib/constants";
import { useUiStore } from "@/lib/store";
import { sha256Hex } from "@/lib/utils/hash";

export default function PinLock() {
  const pinRequired = useUiStore((s) => s.pinRequired);
  const pushToast = useUiStore((s) => s.pushToast);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const hash = typeof window !== "undefined" ? localStorage.getItem(PIN_HASH_KEY) : null;
  const needsUnlock = pinRequired && Boolean(hash) && !unlocked;

  const submit = async () => {
    if (!hash) return;
    const ok = (await sha256Hex(pin)) === hash;
    if (ok) {
      setUnlocked(true);
      setError(false);
      pushToast("Adult vault unlocked", "success");
    } else {
      setError(true);
      setPin("");
    }
  };

  return (
    <AnimatePresence>
      {needsUnlock && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[65] grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.94, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            className="glass-strong w-full max-w-sm rounded-2xl p-8 text-center shadow-glass"
          >
            <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-accent/10 text-accent shadow-neon-cyan">
              <Lock className="h-6 w-6" />
            </span>
            <h2 className="font-display text-lg font-bold text-white">
              Parental PIN Lock
            </h2>
            <p className="mt-2 text-sm text-mist">
              Enter security PIN to access the adult vault
            </p>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="• • • •"
              autoFocus
              className={`mt-5 w-full rounded-lg border bg-white/5 px-4 py-3 text-center text-xl tracking-[0.5em] outline-none transition ${
                error
                  ? "border-red-400/60 text-red-300"
                  : "border-white/10 text-white focus:border-accent/60"
              }`}
            />
            {error && (
              <p className="mt-2 text-xs text-red-300">Invalid PIN passcode</p>
            )}
            <button
              onClick={submit}
              className="mt-4 w-full rounded-lg bg-gradient-to-r from-accent to-neon px-4 py-3 text-sm font-semibold text-obsidian shadow-neon-cyan transition hover:brightness-110"
            >
              Unlock
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}