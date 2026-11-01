-- TRACE PostgreSQL 초기 스키마 (V1). 서비스별 스키마 7개, 테이블 30개. 2026-10-31 기준.
-- 원본 설명: design/ddl.md · Crowfoot ERD: https://crowfoot.java21.net/workspaces/68/models/688
-- 실제 배포에서는 각 서버가 자기 스키마 부분만 Flyway V1으로 가져간다(서비스 간 외래 키 금지).

CREATE SCHEMA IF NOT EXISTS rental;

CREATE TABLE rental.device_model (
  id            uuid PRIMARY KEY,
  model_code    varchar(64)  NOT NULL UNIQUE,
  name          varchar(128) NOT NULL,
  manufacturer  varchar(64),
  form_factor   varchar(16)  NOT NULL DEFAULT 'CLAMSHELL' CHECK (form_factor IN ('CLAMSHELL')),
  spec          jsonb,
  width_mm      numeric(6,1) NOT NULL,
  depth_mm      numeric(6,1) NOT NULL,
  base_h_mm     numeric(5,1) NOT NULL,
  lid_h_mm      numeric(5,1) NOT NULL,
  updated_by    uuid,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE rental.device (
  id               uuid PRIMARY KEY,
  serial           varchar(64) NOT NULL UNIQUE,
  device_model_id  uuid NOT NULL REFERENCES rental.device_model(id),
  os               varchar(8)  NOT NULL CHECK (os IN ('MACOS','WINDOWS')),
  color            varchar(32),
  asset_no         varchar(64),
  status           varchar(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','MAINTENANCE','RETIRED')),
  retired_at       timestamptz,
  updated_by       uuid,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'RETIRED') = (retired_at IS NOT NULL))
);
CREATE INDEX ix_device_model_status ON rental.device(device_model_id, status);

CREATE TABLE rental.rental (
  id          uuid PRIMARY KEY,
  device_id   uuid NOT NULL REFERENCES rental.device(id),
  renter_ref  varchar(128) NOT NULL,
  status      varchar(16)  NOT NULL CHECK (status IN ('OPEN','RETURNED','CLOSED')),
  started_at  timestamptz,
  ended_at    timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_rental_open_device ON rental.rental(device_id) WHERE status = 'OPEN';

CREATE TABLE rental.checkpoint (
  id           uuid PRIMARY KEY,
  rental_id    uuid NOT NULL REFERENCES rental.rental(id),
  type         varchar(3)  NOT NULL CHECK (type IN ('OUT','RCV','RET')),
  status       varchar(16) NOT NULL CHECK (status IN ('OPEN','CAPTURED','GRADED','SEALED')),
  occurred_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rental_id, type)
);

CREATE TABLE rental.pilot_participant (
  id          uuid PRIMARY KEY,
  alias       varchar(16) NOT NULL UNIQUE,
  device_id   uuid NOT NULL REFERENCES rental.device(id),
  consent_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE SCHEMA IF NOT EXISTS capture;
CREATE SCHEMA IF NOT EXISTS inspection;

CREATE TABLE capture.capture_set (
  id             uuid PRIMARY KEY,
  checkpoint_id  uuid NOT NULL,
  source         varchar(8)  NOT NULL CHECK (source IN ('BOOTH','PHONE')),
  booth_id       varchar(32),
  status         varchar(16) NOT NULL CHECK (status IN ('UPLOADING','UPLOADED','INSPECTED','GRADED')),
  quality        varchar(16) NOT NULL DEFAULT 'OK' CHECK (quality IN ('OK','UNJUDGEABLE')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_capture_set_checkpoint ON capture.capture_set(checkpoint_id);

CREATE TABLE capture.photo (
  id              uuid PRIMARY KEY,
  capture_set_id  uuid NOT NULL REFERENCES capture.capture_set(id),
  face            varchar(4)   NOT NULL CHECK (face IN ('TOP','BOT','SF','SB','SL','SR','KB','SCR0','SCR1')),
  light           varchar(4)   NOT NULL CHECK (light IN ('L1','L2','L3','L4','ROOM','OFF')),
  camera          varchar(8)   NOT NULL CHECK (camera IN ('CAM1','CAM2','PHONE')),
  object_key      varchar(512) NOT NULL,
  sha256          char(64)     NOT NULL,
  blur_score      real,
  quality_ok      boolean      NOT NULL DEFAULT true,
  taken_at        timestamptz  NOT NULL,
  created_at      timestamptz  NOT NULL DEFAULT now(),
  updated_at      timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (capture_set_id, face, light)
);

CREATE TABLE inspection.face_alignment (
  id             uuid PRIMARY KEY,
  photo_id       uuid NOT NULL UNIQUE REFERENCES capture.photo(id),
  method         varchar(16)  NOT NULL CHECK (method IN ('CONTOUR','LIGHTGLUE')),
  homography     jsonb        NOT NULL,
  error_px       real,
  rectified_key  varchar(512) NOT NULL,
  created_at     timestamptz  NOT NULL DEFAULT now(),
  updated_at     timestamptz  NOT NULL DEFAULT now()
);

CREATE TABLE inspection.defect (
  id             uuid PRIMARY KEY,
  photo_id       uuid NOT NULL REFERENCES capture.photo(id),
  class          varchar(8)  NOT NULL CHECK (class IN ('scratch','dent','crack','stain')),
  polygon        jsonb       NOT NULL,
  length_mm      real,
  area_mm2       real,
  confidence     real        NOT NULL,
  model_version  varchar(64) NOT NULL,
  source         varchar(8)  NOT NULL DEFAULT 'AUTO' CHECK (source IN ('AUTO','HUMAN')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_defect_photo ON inspection.defect(photo_id);

CREATE TABLE inspection.defect_match (
  id              uuid PRIMARY KEY,
  defect_id       uuid NOT NULL UNIQUE REFERENCES inspection.defect(id),
  prev_defect_id  uuid REFERENCES inspection.defect(id),
  status          varchar(8) NOT NULL CHECK (status IN ('NEW','EXISTING')),
  distance_mm     real,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE inspection.grade_result (
  id             uuid PRIMARY KEY,
  checkpoint_id  uuid NOT NULL UNIQUE,
  grade          char(1)     NOT NULL CHECK (grade IN ('A','B','C','D')),
  rule_version   varchar(32) NOT NULL,
  reasons        jsonb       NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE SCHEMA IF NOT EXISTS diagnostics;

CREATE TABLE diagnostics.diagnostic_run (
  id              uuid PRIMARY KEY,
  checkpoint_id   uuid NOT NULL,
  device_serial   varchar(64)  NOT NULL,
  os              varchar(8)   NOT NULL CHECK (os IN ('MACOS','WINDOWS')),
  agent_version   varchar(32)  NOT NULL,
  conditions      jsonb        NOT NULL,
  raw_object_key  varchar(512) NOT NULL,
  sha256          char(64)     NOT NULL,
  consented_at    timestamptz  NOT NULL,
  created_at      timestamptz  NOT NULL DEFAULT now(),
  updated_at      timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX ix_run_checkpoint ON diagnostics.diagnostic_run(checkpoint_id);
CREATE INDEX ix_run_serial     ON diagnostics.diagnostic_run(device_serial);

CREATE TABLE diagnostics.hardware_component (
  id          uuid PRIMARY KEY,
  run_id      uuid NOT NULL REFERENCES diagnostics.diagnostic_run(id),
  kind        varchar(16)  NOT NULL CHECK (kind IN ('CPU','RAM','SSD','BATTERY','DISPLAY','OTHER')),
  identifier  varchar(128) NOT NULL,
  detail      jsonb,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now()
);

CREATE TABLE diagnostics.battery_reading (
  id                    uuid PRIMARY KEY,
  run_id                uuid NOT NULL UNIQUE REFERENCES diagnostics.diagnostic_run(id),
  cycle_count           integer,
  design_capacity       integer,
  full_charge_capacity  integer,
  capacity_unit         varchar(3) CHECK (capacity_unit IN ('mAh','mWh')),
  max_capacity_pct      numeric(5,2),
  os_max_capacity_pct   smallint,
  condition             varchar(32),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE diagnostics.ssd_health (
  id                   uuid PRIMARY KEY,
  run_id               uuid NOT NULL UNIQUE REFERENCES diagnostics.diagnostic_run(id),
  percent_used         smallint,
  available_spare_pct  smallint,
  critical_warning     smallint,
  power_on_hours       integer,
  media_errors         integer,
  skipped_reason       varchar(128),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE diagnostics.benchmark_result (
  id            uuid PRIMARY KEY,
  run_id        uuid NOT NULL REFERENCES diagnostics.diagnostic_run(id),
  metric        varchar(16) NOT NULL CHECK (metric IN ('CPU_SINGLE','CPU_MULTI','MEM_COPY','DISK_READ','DISK_WRITE')),
  trial_values  jsonb       NOT NULL,
  median        double precision NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, metric)
);

CREATE TABLE diagnostics.inspection_flag (
  id             uuid PRIMARY KEY,
  checkpoint_id  uuid NOT NULL,
  run_id         uuid NOT NULL REFERENCES diagnostics.diagnostic_run(id),
  base_run_id    uuid NOT NULL REFERENCES diagnostics.diagnostic_run(id),
  kind           varchar(24) NOT NULL CHECK (kind IN ('COMPONENT_CHANGED','CAPACITY_DROP','BENCH_DROP')),
  detail         jsonb       NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE SCHEMA IF NOT EXISTS report;

CREATE TABLE report.record_chain (
  id             uuid PRIMARY KEY,
  rental_id      uuid NOT NULL,
  checkpoint_id  uuid NOT NULL,
  seq            integer  NOT NULL,
  payload_hash   char(64) NOT NULL,
  prev_hash      char(64),
  signature      text     NOT NULL,
  signed_at      timestamptz NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rental_id, seq)
);

CREATE TABLE report.report (
  id            uuid PRIMARY KEY,
  rental_id     uuid NOT NULL UNIQUE,
  verify_token  char(32) NOT NULL UNIQUE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE report.report_view (
  id          uuid PRIMARY KEY,
  rental_id   uuid  NOT NULL UNIQUE,
  timeline    jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE SCHEMA IF NOT EXISTS ml;

CREATE TABLE ml.dataset_device (
  id           uuid PRIMARY KEY,
  device_code  varchar(8)  NOT NULL UNIQUE,
  model_name   varchar(128) NOT NULL,
  color        varchar(32),
  split        varchar(8)  NOT NULL CHECK (split IN ('TRAIN','VAL','TEST')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ml.dataset_version (
  id              uuid PRIMARY KEY,
  version         varchar(8)   NOT NULL UNIQUE,
  manifest_key    varchar(512) NOT NULL,
  builder_commit  varchar(40)  NOT NULL,
  counts          jsonb        NOT NULL,
  built_at        timestamptz  NOT NULL,
  created_at      timestamptz  NOT NULL DEFAULT now(),
  updated_at      timestamptz  NOT NULL DEFAULT now()
);

CREATE TABLE ml.training_run (
  id                  uuid PRIMARY KEY,
  dataset_version_id  uuid NOT NULL REFERENCES ml.dataset_version(id),
  base_weights        varchar(128) NOT NULL,
  metrics             jsonb        NOT NULL,
  model_key           varchar(512) NOT NULL,
  onnx_key            varchar(512) NOT NULL,
  created_at          timestamptz  NOT NULL DEFAULT now(),
  updated_at          timestamptz  NOT NULL DEFAULT now()
);

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE auth.account (
  id                 uuid PRIMARY KEY,
  email              varchar(254) UNIQUE,
  password_hash      varchar(100),
  name               varchar(64),
  role               varchar(16)  NOT NULL CHECK (role IN ('ADMIN','CUSTOMER')),
  status             varchar(16)  NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACTIVE','WITHDRAWN')),
  email_verified_at  timestamptz,
  privacy_agreed_at  timestamptz,
  withdrawn_at       timestamptz,
  created_at         timestamptz  NOT NULL DEFAULT now(),
  updated_at         timestamptz  NOT NULL DEFAULT now(),
  CHECK (status = 'WITHDRAWN' OR (email IS NOT NULL AND password_hash IS NOT NULL)),
  CHECK (role <> 'CUSTOMER' OR status = 'WITHDRAWN' OR privacy_agreed_at IS NOT NULL)
);

CREATE TABLE auth.rental_access (
  id          uuid PRIMARY KEY,
  account_id  uuid NOT NULL REFERENCES auth.account(id),
  rental_id   uuid NOT NULL UNIQUE,
  linked_at   timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_access_account ON auth.rental_access(account_id);

CREATE TABLE auth.email_token (
  id          uuid PRIMARY KEY,
  account_id  uuid NOT NULL REFERENCES auth.account(id),
  purpose     varchar(8)  NOT NULL CHECK (purpose IN ('VERIFY','RESET')),
  code_hash   char(64)    NOT NULL,
  attempts    smallint    NOT NULL DEFAULT 0,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_email_token_account ON auth.email_token(account_id, purpose);

CREATE TABLE auth.seal_receipt (
  id               uuid PRIMARY KEY,
  rental_id        uuid NOT NULL,
  checkpoint_id    uuid NOT NULL UNIQUE,
  checkpoint_type  varchar(3)  NOT NULL CHECK (checkpoint_type IN ('OUT','RCV','RET')),
  payload_hash     char(64)    NOT NULL,
  sealed_at        timestamptz NOT NULL,
  sent_at          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_receipt_unsent ON auth.seal_receipt(rental_id) WHERE sent_at IS NULL;

CREATE TABLE auth.client_credential (
  id           uuid PRIMARY KEY,
  client_id    varchar(64)  NOT NULL UNIQUE,
  secret_hash  varchar(100) NOT NULL,
  kind         varchar(16)  NOT NULL CHECK (kind IN ('BOOTH')),
  active       boolean      NOT NULL DEFAULT true,
  created_at   timestamptz  NOT NULL DEFAULT now(),
  updated_at   timestamptz  NOT NULL DEFAULT now()
);

CREATE TABLE auth.capture_link (
  id             uuid PRIMARY KEY,
  checkpoint_id  uuid NOT NULL,
  rental_id      uuid NOT NULL,
  token_hash     char(64) NOT NULL UNIQUE,
  expires_at     timestamptz NOT NULL,
  used_at        timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_link_checkpoint ON auth.capture_link(checkpoint_id);

CREATE TABLE auth.pairing_code (
  id             uuid PRIMARY KEY,
  checkpoint_id  uuid NOT NULL,
  code_hash      char(64)    NOT NULL,
  expires_at     timestamptz NOT NULL,
  used_at        timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_pairing_checkpoint ON auth.pairing_code(checkpoint_id);
