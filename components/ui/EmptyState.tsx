"use client";

import { DatabaseZap, type LucideIcon } from "lucide-react";
import { isFirebaseConfigured } from "@/lib/firebase";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
}

export default function EmptyState({
  title,
  description,
  icon: Icon = DatabaseZap,
}: EmptyStateProps) {
  const notConfigured = !isFirebaseConfigured;

  return (
    <div className="glass card-surface flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-accent/10 text-accent shadow-neon-cyan">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="font-display text-base font-semibold text-white">
        {title ?? (notConfigured ? "No Database Connected" : "No Content Available")}
      </h3>
      <p className="max-w-md text-sm leading-relaxed text-mist">
        {description ??
          (notConfigured
            ? "Configure your SQLite/Firebase settings in .env.local to access media."
            : "Add items using the library ingest panel or wait for synchronization.")}
      </p>
    </div>
  );
}