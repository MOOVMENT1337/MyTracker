CREATE TABLE users (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE CHECK (email = lower(trim(email))),
  password_hash text,
  display_name text NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 120),
  initials text NOT NULL,
  avatar text NOT NULL,
  avatar_color text NOT NULL DEFAULT '#4F8EF7' CHECK (avatar_color ~ '^#[0-9a-fA-F]{6}$'),
  role text NOT NULL DEFAULT 'Employee',
  is_admin boolean NOT NULL DEFAULT false,
  provider text NOT NULL DEFAULT 'local' CHECK (provider IN ('local','google','yandex','mail')),
  theme text NOT NULL DEFAULT 'light' CHECK (theme IN ('light','dark')),
  language text NOT NULL DEFAULT 'en' CHECK (language IN ('en','ru')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_expiry_idx ON sessions(expires_at);
CREATE INDEX sessions_user_idx ON sessions(user_id);
CREATE TABLE oauth_states (
  state_hash text PRIMARY KEY,
  browser_hash text NOT NULL,
  verifier text NOT NULL,
  provider text NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX oauth_states_expiry_idx ON oauth_states(expires_at);
CREATE TABLE oauth_identities (
  provider text NOT NULL,
  subject text NOT NULL,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (provider, subject),
  UNIQUE (user_id, provider)
);
CREATE TABLE queues (
  id text PRIMARY KEY,
  key text NOT NULL UNIQUE CHECK (key ~ '^[A-Z][A-Z0-9_]{1,19}$'),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  color text NOT NULL DEFAULT '#4F8EF7' CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  counter integer NOT NULL DEFAULT 0 CHECK (counter >= 0)
);
CREATE TABLE issues (
  id text PRIMARY KEY,
  key text NOT NULL UNIQUE,
  queue_id text NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
  summary text NOT NULL CHECK (length(trim(summary)) BETWEEN 1 AND 500),
  description text NOT NULL DEFAULT '' CHECK (length(description) <= 50000),
  status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open','In Progress','Need Info','Done','Closed')),
  priority text NOT NULL DEFAULT 'Medium' CHECK (priority IN ('High','Medium','Low')),
  type text NOT NULL DEFAULT 'Task' CHECK (type IN ('Task','Bug','Story','Epic')),
  assignee_id text REFERENCES users(id) ON DELETE SET NULL,
  reporter_id text NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  status_changed_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);
CREATE INDEX issues_queue_idx ON issues(queue_id);
CREATE INDEX issues_assignee_idx ON issues(assignee_id);
CREATE INDEX issues_updated_idx ON issues(updated_at DESC, id);
CREATE INDEX issues_status_priority_idx ON issues(status, priority);
CREATE TABLE comments (
  id text PRIMARY KEY,
  issue_id text NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  author_id text NOT NULL REFERENCES users(id),
  text text NOT NULL CHECK (length(trim(text)) BETWEEN 1 AND 10000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX comments_issue_idx ON comments(issue_id, created_at, id);
CREATE TABLE activity_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id text REFERENCES users(id) ON DELETE SET NULL,
  msg text NOT NULL,
  time timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activity_log_time_idx ON activity_log(time DESC, id DESC);
