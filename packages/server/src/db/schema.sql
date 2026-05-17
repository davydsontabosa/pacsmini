CREATE TABLE IF NOT EXISTS alerts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT    NOT NULL,
  message     TEXT    NOT NULL,
  sent_at     TEXT    NOT NULL,
  email_to    TEXT    NOT NULL,
  resolved    INTEGER NOT NULL DEFAULT 0,
  resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS dicom_events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type   TEXT    NOT NULL,
  source_aet   TEXT,
  patient_id   TEXT,
  study_uid    TEXT,
  detail       TEXT,
  occurred_at  TEXT    NOT NULL,
  notified     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS share_tokens (
  id              TEXT    PRIMARY KEY,
  study_uid       TEXT    NOT NULL,
  study_desc      TEXT,
  patient_name    TEXT,
  patient_id      TEXT,
  modalities      TEXT,
  created_at      TEXT    NOT NULL,
  expires_at      TEXT    NOT NULL,
  created_by      TEXT    NOT NULL,
  recipient_email TEXT,
  access_count    INTEGER NOT NULL DEFAULT 0,
  max_accesses    INTEGER,
  revoked         INTEGER NOT NULL DEFAULT 0,
  revoked_at      TEXT,
  allow_download  INTEGER NOT NULL DEFAULT 1,
  password_hash   TEXT
);

CREATE TABLE IF NOT EXISTS share_access_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  token_id    TEXT    NOT NULL REFERENCES share_tokens(id),
  accessed_at TEXT    NOT NULL,
  ip_address  TEXT,
  user_agent  TEXT,
  action      TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dicom_destinations (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  ae_title      TEXT    NOT NULL,
  host          TEXT    NOT NULL,
  port          INTEGER NOT NULL,
  description   TEXT,
  is_active     INTEGER NOT NULL DEFAULT 1,
  last_echo_at  TEXT,
  last_echo_ok  INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dicom_send_log (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  destination_id INTEGER REFERENCES dicom_destinations(id),
  study_uid      TEXT    NOT NULL,
  patient_id     TEXT,
  patient_name   TEXT,
  send_type      TEXT    NOT NULL,
  status         TEXT    NOT NULL DEFAULT 'sent',
  error_message  TEXT,
  sent_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Módulo de Gestão de Médicos
CREATE TABLE IF NOT EXISTS doctors (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT    NOT NULL,
  crm             TEXT    NOT NULL UNIQUE,
  email           TEXT,
  phone           TEXT,
  specialization  TEXT,
  modalities      TEXT    NOT NULL DEFAULT '[]',  -- JSON array: ["CT","MR","US"]
  is_active       INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS doctor_patient_assignments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  doctor_id    INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id   TEXT    NOT NULL,
  patient_name TEXT,
  assigned_by  TEXT    NOT NULL DEFAULT 'admin',
  assigned_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(doctor_id, patient_id)
);
