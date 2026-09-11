-- Finish the stuck integer -> VARCHAR(8) ID migration for recruitment tables.
-- Prisma already expects String @db.VarChar(8); the live DB was still int4 + sequences.
-- Existing numeric IDs are kept as text ('6', '1', ...) so current rows stay linked.
-- Organization, User, and RecruitmentField IDs stay integer.

BEGIN;

-- ---------------------------------------------------------------------------
-- Drop FKs that point at recruitment string-id columns
-- ---------------------------------------------------------------------------
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_candidate_id_fkey;
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_job_id_fkey;
ALTER TABLE job_pipeline_stages DROP CONSTRAINT IF EXISTS job_pipeline_stages_pipeline_id_fkey;
ALTER TABLE recruitment_attachments DROP CONSTRAINT IF EXISTS recruitment_attachments_candidate_id_fkey;
ALTER TABLE recruitment_attachments DROP CONSTRAINT IF EXISTS recruitment_attachments_job_id_fkey;
ALTER TABLE recruitment_candidate_folders DROP CONSTRAINT IF EXISTS recruitment_candidate_folders_candidate_id_fkey;
ALTER TABLE recruitment_candidate_folders DROP CONSTRAINT IF EXISTS recruitment_candidate_folders_folder_id_fkey;
ALTER TABLE recruitment_jobs DROP CONSTRAINT IF EXISTS recruitment_jobs_pipeline_id_fkey;
ALTER TABLE recruitment_logs DROP CONSTRAINT IF EXISTS recruitment_logs_candidate_id_fkey;
ALTER TABLE recruitment_logs DROP CONSTRAINT IF EXISTS recruitment_logs_job_id_fkey;
ALTER TABLE recruitment_matches DROP CONSTRAINT IF EXISTS recruitment_matches_candidate_id_fkey;
ALTER TABLE recruitment_matches DROP CONSTRAINT IF EXISTS recruitment_matches_job_id_fkey;
ALTER TABLE recruitment_matches DROP CONSTRAINT IF EXISTS recruitment_matches_stage_id_fkey;
ALTER TABLE recruitment_notes DROP CONSTRAINT IF EXISTS recruitment_notes_candidate_id_fkey;
ALTER TABLE recruitment_notes DROP CONSTRAINT IF EXISTS recruitment_notes_job_id_fkey;

-- ---------------------------------------------------------------------------
-- Drop sequence defaults before changing column types
-- ---------------------------------------------------------------------------
ALTER TABLE activities ALTER COLUMN id DROP DEFAULT;
ALTER TABLE job_pipelines ALTER COLUMN id DROP DEFAULT;
ALTER TABLE job_pipeline_stages ALTER COLUMN id DROP DEFAULT;
ALTER TABLE recruitment_jobs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE recruitment_candidates ALTER COLUMN id DROP DEFAULT;
ALTER TABLE recruitment_matches ALTER COLUMN id DROP DEFAULT;
ALTER TABLE recruitment_notes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE recruitment_attachments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE recruitment_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE recruitment_folders ALTER COLUMN id DROP DEFAULT;
ALTER TABLE recruitment_candidate_folders ALTER COLUMN id DROP DEFAULT;

-- ---------------------------------------------------------------------------
-- Convert PK / FK columns to VARCHAR(8)
-- ---------------------------------------------------------------------------
ALTER TABLE job_pipelines
  ALTER COLUMN id TYPE VARCHAR(8) USING id::text;

ALTER TABLE job_pipeline_stages
  ALTER COLUMN id TYPE VARCHAR(8) USING id::text,
  ALTER COLUMN pipeline_id TYPE VARCHAR(8) USING pipeline_id::text;

ALTER TABLE recruitment_jobs
  ALTER COLUMN id TYPE VARCHAR(8) USING id::text,
  ALTER COLUMN pipeline_id TYPE VARCHAR(8) USING pipeline_id::text;

ALTER TABLE recruitment_candidates
  ALTER COLUMN id TYPE VARCHAR(8) USING id::text;

ALTER TABLE recruitment_matches
  ALTER COLUMN id TYPE VARCHAR(8) USING id::text,
  ALTER COLUMN candidate_id TYPE VARCHAR(8) USING candidate_id::text,
  ALTER COLUMN job_id TYPE VARCHAR(8) USING job_id::text,
  ALTER COLUMN stage_id TYPE VARCHAR(8) USING stage_id::text;

ALTER TABLE activities
  ALTER COLUMN id TYPE VARCHAR(8) USING id::text,
  ALTER COLUMN candidate_id TYPE VARCHAR(8) USING candidate_id::text,
  ALTER COLUMN job_id TYPE VARCHAR(8) USING job_id::text;

ALTER TABLE recruitment_notes
  ALTER COLUMN id TYPE VARCHAR(8) USING id::text,
  ALTER COLUMN candidate_id TYPE VARCHAR(8) USING candidate_id::text,
  ALTER COLUMN job_id TYPE VARCHAR(8) USING job_id::text;

ALTER TABLE recruitment_attachments
  ALTER COLUMN id TYPE VARCHAR(8) USING id::text,
  ALTER COLUMN candidate_id TYPE VARCHAR(8) USING candidate_id::text,
  ALTER COLUMN job_id TYPE VARCHAR(8) USING job_id::text;

ALTER TABLE recruitment_logs
  ALTER COLUMN id TYPE VARCHAR(8) USING id::text,
  ALTER COLUMN entity_id TYPE TEXT USING entity_id::text,
  ALTER COLUMN candidate_id TYPE VARCHAR(8) USING candidate_id::text,
  ALTER COLUMN job_id TYPE VARCHAR(8) USING job_id::text;

ALTER TABLE recruitment_folders
  ALTER COLUMN id TYPE VARCHAR(8) USING id::text;

ALTER TABLE recruitment_candidate_folders
  ALTER COLUMN id TYPE VARCHAR(8) USING id::text,
  ALTER COLUMN folder_id TYPE VARCHAR(8) USING folder_id::text,
  ALTER COLUMN candidate_id TYPE VARCHAR(8) USING candidate_id::text;

-- ---------------------------------------------------------------------------
-- 8-char hash defaults for new rows
-- ---------------------------------------------------------------------------
ALTER TABLE job_pipelines ALTER COLUMN id SET DEFAULT substr(md5(random()::text || clock_timestamp()::text), 1, 8);
ALTER TABLE job_pipeline_stages ALTER COLUMN id SET DEFAULT substr(md5(random()::text || clock_timestamp()::text), 1, 8);
ALTER TABLE recruitment_jobs ALTER COLUMN id SET DEFAULT substr(md5(random()::text || clock_timestamp()::text), 1, 8);
ALTER TABLE recruitment_candidates ALTER COLUMN id SET DEFAULT substr(md5(random()::text || clock_timestamp()::text), 1, 8);
ALTER TABLE recruitment_matches ALTER COLUMN id SET DEFAULT substr(md5(random()::text || clock_timestamp()::text), 1, 8);
ALTER TABLE activities ALTER COLUMN id SET DEFAULT substr(md5(random()::text || clock_timestamp()::text), 1, 8);
ALTER TABLE recruitment_notes ALTER COLUMN id SET DEFAULT substr(md5(random()::text || clock_timestamp()::text), 1, 8);
ALTER TABLE recruitment_attachments ALTER COLUMN id SET DEFAULT substr(md5(random()::text || clock_timestamp()::text), 1, 8);
ALTER TABLE recruitment_logs ALTER COLUMN id SET DEFAULT substr(md5(random()::text || clock_timestamp()::text), 1, 8);
ALTER TABLE recruitment_folders ALTER COLUMN id SET DEFAULT substr(md5(random()::text || clock_timestamp()::text), 1, 8);
ALTER TABLE recruitment_candidate_folders ALTER COLUMN id SET DEFAULT substr(md5(random()::text || clock_timestamp()::text), 1, 8);

-- ---------------------------------------------------------------------------
-- Recreate FKs
-- ---------------------------------------------------------------------------
ALTER TABLE job_pipeline_stages
  ADD CONSTRAINT job_pipeline_stages_pipeline_id_fkey
  FOREIGN KEY (pipeline_id) REFERENCES job_pipelines(id) ON DELETE CASCADE;

ALTER TABLE recruitment_jobs
  ADD CONSTRAINT recruitment_jobs_pipeline_id_fkey
  FOREIGN KEY (pipeline_id) REFERENCES job_pipelines(id);

ALTER TABLE recruitment_matches
  ADD CONSTRAINT recruitment_matches_candidate_id_fkey
  FOREIGN KEY (candidate_id) REFERENCES recruitment_candidates(id) ON DELETE CASCADE,
  ADD CONSTRAINT recruitment_matches_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES recruitment_jobs(id) ON DELETE CASCADE,
  ADD CONSTRAINT recruitment_matches_stage_id_fkey
  FOREIGN KEY (stage_id) REFERENCES job_pipeline_stages(id);

ALTER TABLE activities
  ADD CONSTRAINT activities_candidate_id_fkey
  FOREIGN KEY (candidate_id) REFERENCES recruitment_candidates(id),
  ADD CONSTRAINT activities_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES recruitment_jobs(id);

ALTER TABLE recruitment_notes
  ADD CONSTRAINT recruitment_notes_candidate_id_fkey
  FOREIGN KEY (candidate_id) REFERENCES recruitment_candidates(id),
  ADD CONSTRAINT recruitment_notes_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES recruitment_jobs(id);

ALTER TABLE recruitment_attachments
  ADD CONSTRAINT recruitment_attachments_candidate_id_fkey
  FOREIGN KEY (candidate_id) REFERENCES recruitment_candidates(id),
  ADD CONSTRAINT recruitment_attachments_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES recruitment_jobs(id);

ALTER TABLE recruitment_logs
  ADD CONSTRAINT recruitment_logs_candidate_id_fkey
  FOREIGN KEY (candidate_id) REFERENCES recruitment_candidates(id),
  ADD CONSTRAINT recruitment_logs_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES recruitment_jobs(id);

ALTER TABLE recruitment_candidate_folders
  ADD CONSTRAINT recruitment_candidate_folders_folder_id_fkey
  FOREIGN KEY (folder_id) REFERENCES recruitment_folders(id) ON DELETE CASCADE,
  ADD CONSTRAINT recruitment_candidate_folders_candidate_id_fkey
  FOREIGN KEY (candidate_id) REFERENCES recruitment_candidates(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- Drop leftover sequences
-- ---------------------------------------------------------------------------
ALTER SEQUENCE IF EXISTS activities_id_seq OWNED BY NONE;
ALTER SEQUENCE IF EXISTS job_pipelines_id_seq OWNED BY NONE;
ALTER SEQUENCE IF EXISTS job_pipeline_stages_id_seq OWNED BY NONE;
ALTER SEQUENCE IF EXISTS recruitment_jobs_id_seq OWNED BY NONE;
ALTER SEQUENCE IF EXISTS recruitment_candidates_id_seq OWNED BY NONE;
ALTER SEQUENCE IF EXISTS recruitment_matches_id_seq OWNED BY NONE;
ALTER SEQUENCE IF EXISTS recruitment_notes_id_seq OWNED BY NONE;
ALTER SEQUENCE IF EXISTS recruitment_attachments_id_seq OWNED BY NONE;
ALTER SEQUENCE IF EXISTS recruitment_logs_id_seq OWNED BY NONE;
ALTER SEQUENCE IF EXISTS recruitment_folders_id_seq OWNED BY NONE;
ALTER SEQUENCE IF EXISTS recruitment_candidate_folders_id_seq OWNED BY NONE;

DROP SEQUENCE IF EXISTS activities_id_seq;
DROP SEQUENCE IF EXISTS job_pipelines_id_seq;
DROP SEQUENCE IF EXISTS job_pipeline_stages_id_seq;
DROP SEQUENCE IF EXISTS recruitment_jobs_id_seq;
DROP SEQUENCE IF EXISTS recruitment_candidates_id_seq;
DROP SEQUENCE IF EXISTS recruitment_matches_id_seq;
DROP SEQUENCE IF EXISTS recruitment_notes_id_seq;
DROP SEQUENCE IF EXISTS recruitment_attachments_id_seq;
DROP SEQUENCE IF EXISTS recruitment_logs_id_seq;
DROP SEQUENCE IF EXISTS recruitment_folders_id_seq;
DROP SEQUENCE IF EXISTS recruitment_candidate_folders_id_seq;

COMMIT;
