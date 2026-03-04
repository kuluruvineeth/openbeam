export const EDGE_TASKS_DDL = `
CREATE TABLE IF NOT EXISTS edge_tasks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  payload TEXT DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  priority INTEGER DEFAULT 2,
  retry_policy TEXT DEFAULT '{}',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_at INTEGER,
  started_at INTEGER,
  completed_at INTEGER,
  failed_at INTEGER,
  last_error TEXT,
  cron_expression TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)`;

export const EDGE_DEAD_LETTER_DDL = `
CREATE TABLE IF NOT EXISTS edge_dead_letter (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  name TEXT NOT NULL,
  payload TEXT,
  error TEXT,
  attempts INTEGER,
  failed_at INTEGER NOT NULL
)`;
