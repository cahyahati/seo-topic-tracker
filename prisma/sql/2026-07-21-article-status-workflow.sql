-- Migrasi enum ArticleStatus ke workflow Topic Tracker yang baru.
--
-- Workflow baru (berurutan):
--   NOT_ASSIGNED     -> Belum Didelegasikan
--   ASSIGNED         -> Didelegasikan
--   DRAFT_RECEIVED   -> Draft Diterima
--   PENDING_APPROVAL -> Pengajuan Approval   (BARU)
--   APPROVED         -> Disetujui            (BARU)
--   PUBLISHED        -> Published
--
-- Nilai lama COMPLETED dan CANCELED dihapus. Baris yang masih memakainya
-- dipetakan ulang: COMPLETED -> APPROVED, CANCELED -> NOT_ASSIGNED.
-- Ubah pemetaan di bawah bila Anda ingin perlakuan berbeda.
--
-- Jalankan di Supabase SQL Editor atau: psql "$DATABASE_URL" -f <file ini>

BEGIN;

ALTER TYPE "ArticleStatus" RENAME TO "ArticleStatus_old";

CREATE TYPE "ArticleStatus" AS ENUM (
  'NOT_ASSIGNED', 'ASSIGNED', 'DRAFT_RECEIVED', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED'
);

ALTER TABLE "Article" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Article"
  ALTER COLUMN "status" TYPE "ArticleStatus"
  USING (
    CASE "status"::text
      WHEN 'COMPLETED' THEN 'APPROVED'
      WHEN 'CANCELED'  THEN 'NOT_ASSIGNED'
      ELSE "status"::text
    END::"ArticleStatus"
  );

ALTER TABLE "Article" ALTER COLUMN "status" SET DEFAULT 'NOT_ASSIGNED';

ALTER TABLE "TopicStatusHistory"
  ALTER COLUMN "toStatus" TYPE "ArticleStatus"
  USING (
    CASE "toStatus"::text
      WHEN 'COMPLETED' THEN 'APPROVED'
      WHEN 'CANCELED'  THEN 'NOT_ASSIGNED'
      ELSE "toStatus"::text
    END::"ArticleStatus"
  );

ALTER TABLE "TopicStatusHistory"
  ALTER COLUMN "fromStatus" TYPE "ArticleStatus"
  USING (
    CASE "fromStatus"::text
      WHEN 'COMPLETED' THEN 'APPROVED'
      WHEN 'CANCELED'  THEN 'NOT_ASSIGNED'
      ELSE "fromStatus"::text
    END::"ArticleStatus"
  );

DROP TYPE "ArticleStatus_old";

COMMIT;
