-- New accounts start in Russian and dark mode. Existing explicit preferences
-- are retained; the one-time workspace reset applies the defaults to its admin.
ALTER TABLE users ALTER COLUMN theme SET DEFAULT 'dark';
ALTER TABLE users ALTER COLUMN language SET DEFAULT 'ru';
