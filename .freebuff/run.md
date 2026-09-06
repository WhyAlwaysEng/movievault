# Run doc — Cyberpunk Neo-Noir Media Vault

The project is a **Next.js (App Router) + TypeScript + Tailwind** app (see README.md and
docs/MASTER_PLAN_v2.md). Dependencies: `npm install` (package-lock.json committed).

## Reproduce artifacts

- `.env.local` — copy from `.env.local.example` if it exists in the main checkout;
  values are per-worktree (Firebase project ids, keys). No `.env.local` → app runs in
  "not configured" mode with empty states (no mock data by design).
- `node_modules` — `npm install`

## Run the dev server (detached)

1. Ensure port is free (Next honors the env `PORT` var if set; otherwise defaults to 3000):
   `netstat -ano | grep LISTENING | grep ":3000"`
2. Start detached (Windows PowerShell — stdout/stderr MUST go to different files):

```powershell
powershell -NoProfile -Command "(Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev' -RedirectStandardOutput 'E:\ENGWEB\movievault\.freebuff\preview-<thread>.log' -RedirectStandardError 'E:\ENGWEB\movievault\.freebuff\preview-<thread>.err' -WindowStyle Hidden -PassThru).Id"
```

3. Wait for `curl -s -o /dev/null -w "%{http_code}" http://localhost:<port>/` → 200.
   Note: the harness may set `PORT` — read the log for the actual URL if 3000 is not used.
4. Get the pid from the listener: `netstat -ano | grep LISTENING | grep ":<port>"`.
5. `register_preview` with `url` (loopback) + `pid`.

## Register static fallback (no server needed)

`.freebuff/preview/plan.html` (generated from docs/MASTER_PLAN_v2.md via
`.freebuff/build-plan-html.cjs`) can be registered with `htmlPath` if the app server is down.