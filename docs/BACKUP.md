# Backup & Restoration

What's actually configured today, and what remains an operational (not code) task. Do not treat anything in this document as "done" unless it says so explicitly.

## Database (MongoDB)

- **Mechanism today: none, in-repo.** There is no backup script, no scheduled export, and no backup automation anywhere in this codebase (verified by a repo-wide search — zero hits for any backup-related script or config).
- The application is provider-agnostic: `MONGODB_URI` accepts either a self-hosted `mongodb://` connection or an Atlas `mongodb+srv://` connection (`src/server/config/env.ts`), and the code imposes no lock-in either way.
- **What this means operationally**: whichever MongoDB deployment is actually used in staging/production must have backups configured at the provider level — this is not something this application can do on its own.
  - **If MongoDB Atlas**: enable Atlas's built-in continuous or scheduled backups (Cloud Backup) in the Atlas project settings for the production cluster. This is an Atlas dashboard action, not a code change — document the retention window chosen (Atlas's default continuous backups typically retain recent snapshots plus periodic longer-term snapshots, configurable per cluster tier).
  - **If self-hosted MongoDB**: a scheduled `mongodump`/`mongorestore` (or filesystem/volume snapshot) job must be set up at the infrastructure level, with the dump stored somewhere other than the database host itself.
- **Restoration process**: not yet documented, because it depends on which of the above is actually chosen. Once a backup mechanism is live, add here: how to restore to a point in time, who is authorized to trigger a restore, and how to verify the restored data before pointing production traffic at it.
- **Responsible system**: not yet assigned. Whoever provisions the production database is responsible for also provisioning its backup, and for confirming (not assuming) that it's actually running — a configured-but-unverified backup is not a backup.

## Media

- Website media (hero images, team photos, icons — confirmed under `public/media/`, ~90 files) is stored **as static files committed directly in this Git repository**, not in the database and not in external object storage (no S3/CDN media provider is configured; `MEDIA_ALLOWED_HOSTS` is empty by default).
- **Backup mechanism**: Git itself. Every commit to this repository is a full snapshot of all current media files. As long as the source-code backup practice below is followed, media is backed up as a side effect — there is no separate media backup system to build, and building one would duplicate what Git already provides for free.
- The database stores only *references* to these files (URL/alt/width/height), never the image bytes — so a database restore and a source-code restore together are sufficient to recover the full site, with no object-storage recovery step needed.
- If the project later moves to external object storage (e.g., to let non-developers upload media without a deploy), this section must be revisited — that storage would then need its own backup plan, separate from Git.

## Source code

- The project is a Git repository (confirmed) with sensible `.gitignore` coverage (`node_modules`, `.next`, `.env*` excluded; `.env.example` tracked). No oversized or unexpected binaries are tracked — the largest tracked files are the legitimate product images already discussed above (~1-1.4MB each, not database dumps or archives).
- **Backup mechanism**: hosting the repository on a remote Git provider (GitHub/GitLab/etc.) with more than one person having push access is the actual backup here — a single developer's laptop must never be the only copy. Confirm the remote is set up and at least one other maintainer (or the organization's account, not a personal one) has access.
- Branch history and commit history are themselves a form of backup/audit trail for the code, independent of database/media backups above.

## What's pending (operational, not code)

1. Confirm which MongoDB deployment (Atlas or self-hosted) is actually used in production, and enable/verify that provider's backup feature.
2. Document the actual restoration steps once that provider is confirmed — this file currently describes the *options*, not a tested procedure.
3. Confirm the Git remote has redundant access (not one individual's personal account) and that the production deploy pulls from that remote, not a local machine.
4. Decide a retention policy (how far back backups must reach) based on the business's actual tolerance for data loss — this hasn't been specified yet and shouldn't be assumed.

None of the above can be completed from inside this codebase — they require access to the actual deployed database provider's dashboard and the Git hosting provider's settings.
