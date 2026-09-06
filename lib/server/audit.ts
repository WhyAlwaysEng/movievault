import { db } from "@/lib/db";

export function audit(
  userUid: string | null,
  action: string,
  targetType: string,
  targetId: string,
  detail?: unknown,
) {
  db.prepare(
    `INSERT INTO audit_log (user_uid, action, target_type, target_id, detail, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(userUid, action, targetType, targetId, detail ? JSON.stringify(detail).slice(0, 2000) : null, Date.now());
}