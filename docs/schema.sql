BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE studio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  policies text NOT NULL DEFAULT '',
  notifications boolean NOT NULL DEFAULT true
);

CREATE TABLE artist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studio,
  name text NOT NULL,
  UNIQUE (studio_id, id)
);

CREATE TABLE business_hours (
  studio_id uuid NOT NULL REFERENCES studio,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  opens_at time NOT NULL,
  closes_at time NOT NULL CHECK (closes_at > opens_at),
  PRIMARY KEY (studio_id, weekday, opens_at)
);

CREATE TABLE customer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studio,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  marketing_consent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (studio_id, phone),
  UNIQUE (studio_id, id)
);

CREATE TABLE tag (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studio,
  name text NOT NULL,
  UNIQUE (studio_id, name),
  UNIQUE (studio_id, id)
);

CREATE TABLE customer_tag (
  studio_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  PRIMARY KEY (customer_id, tag_id),
  FOREIGN KEY (studio_id, customer_id) REFERENCES customer (studio_id, id),
  FOREIGN KEY (studio_id, tag_id) REFERENCES tag (studio_id, id)
);

CREATE TABLE opportunity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customer,
  description text NOT NULL,
  stage text NOT NULL CHECK (stage IN ('NEW','QUALIFICATION','QUOTE','AWAITING_APPROVAL','BOOKED','COMPLETED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, id)
);

CREATE TABLE customer_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customer,
  kind text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE attachment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customer,
  storage_key text NOT NULL UNIQUE,
  mime_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, id)
);

CREATE TABLE conversation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customer,
  channel text NOT NULL DEFAULT 'WHATSAPP',
  mode text NOT NULL CHECK (mode IN ('AGENT','HUMAN')),
  summary text,
  last_read_at timestamptz,
  UNIQUE (customer_id, channel),
  UNIQUE (customer_id, id)
);

CREATE TABLE message (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  conversation_id uuid NOT NULL,
  attachment_id uuid,
  external_id text,
  sender text NOT NULL CHECK (sender IN ('CUSTOMER','HUMAN','AGENT')),
  body text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, external_id),
  CHECK (nullif(btrim(body), '') IS NOT NULL OR attachment_id IS NOT NULL),
  FOREIGN KEY (customer_id, conversation_id) REFERENCES conversation (customer_id, id),
  FOREIGN KEY (customer_id, attachment_id) REFERENCES attachment (customer_id, id)
);

CREATE TABLE agent_config (
  studio_id uuid PRIMARY KEY REFERENCES studio,
  tone text NOT NULL,
  knowledge text NOT NULL,
  rules text NOT NULL,
  tools jsonb NOT NULL DEFAULT '[]',
  enabled boolean NOT NULL DEFAULT false
);

CREATE TABLE agent_run (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studio,
  customer_id uuid,
  attachment_id uuid,
  reviewer_id uuid,
  kind text NOT NULL,
  status text NOT NULL CHECK (status IN ('SIMULATED','PENDING','APPROVED','REJECTED')),
  simulated boolean NOT NULL DEFAULT false,
  result jsonb NOT NULL DEFAULT '{}',
  decision jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  CHECK (attachment_id IS NULL OR customer_id IS NOT NULL),
  FOREIGN KEY (studio_id, customer_id) REFERENCES customer (studio_id, id),
  FOREIGN KEY (studio_id, reviewer_id) REFERENCES artist (studio_id, id),
  FOREIGN KEY (customer_id, attachment_id) REFERENCES attachment (customer_id, id)
);

CREATE TABLE quote (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customer,
  opportunity_id uuid,
  description text NOT NULL,
  size text NOT NULL,
  placement text NOT NULL,
  total numeric(12,2) NOT NULL CHECK (total > 0),
  deposit numeric(12,2) NOT NULL CHECK (deposit >= 0 AND deposit <= total),
  valid_until date NOT NULL,
  status text NOT NULL CHECK (status IN ('DRAFT','PENDING','APPROVED','DECLINED')),
  UNIQUE (customer_id, id),
  FOREIGN KEY (customer_id, opportunity_id) REFERENCES opportunity (customer_id, id)
);

CREATE TABLE quote_attachment (
  customer_id uuid NOT NULL,
  quote_id uuid NOT NULL,
  attachment_id uuid NOT NULL,
  PRIMARY KEY (quote_id, attachment_id),
  FOREIGN KEY (customer_id, quote_id) REFERENCES quote (customer_id, id),
  FOREIGN KEY (customer_id, attachment_id) REFERENCES attachment (customer_id, id)
);

CREATE TABLE studio_session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studio,
  artist_id uuid NOT NULL,
  customer_id uuid,
  quote_id uuid,
  title text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL CHECK (ends_at > starts_at),
  status text NOT NULL CHECK (status IN ('CONFIRMED','PENDING','CANCELED','BLOCKED','COMPLETED')),
  CHECK (quote_id IS NULL OR customer_id IS NOT NULL),
  CHECK (customer_id IS NOT NULL OR status IN ('BLOCKED','CANCELED')),
  FOREIGN KEY (studio_id, artist_id) REFERENCES artist (studio_id, id),
  FOREIGN KEY (studio_id, customer_id) REFERENCES customer (studio_id, id),
  FOREIGN KEY (customer_id, quote_id) REFERENCES quote (customer_id, id),
  EXCLUDE USING gist (artist_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&)
    WHERE (status <> 'CANCELED'),
  UNIQUE (customer_id, id)
);
CREATE UNIQUE INDEX session_active_quote ON studio_session (quote_id) WHERE status <> 'CANCELED';

CREATE TABLE campaign (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studio,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('PROMOTION','NOTICE','FLASH')),
  audience_tag_id uuid,
  message text NOT NULL,
  scheduled_at timestamptz,
  status text NOT NULL CHECK (status IN ('DRAFT','SCHEDULED','SIMULATED','SENT')),
  UNIQUE (studio_id, id),
  FOREIGN KEY (studio_id, audience_tag_id) REFERENCES tag (studio_id, id)
);

CREATE TABLE campaign_delivery (
  studio_id uuid NOT NULL,
  campaign_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  status text NOT NULL,
  simulated boolean NOT NULL DEFAULT true,
  attempted_at timestamptz,
  PRIMARY KEY (campaign_id, customer_id),
  FOREIGN KEY (studio_id, campaign_id) REFERENCES campaign (studio_id, id),
  FOREIGN KEY (studio_id, customer_id) REFERENCES customer (studio_id, id)
);

CREATE TABLE feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customer,
  session_id uuid,
  rating smallint CHECK (rating BETWEEN 1 AND 5),
  comment text,
  follow_up_on date NOT NULL,
  status text NOT NULL CHECK (status IN ('PENDING','RECEIVED','COMPLETED')),
  CHECK (status <> 'RECEIVED' OR rating IS NOT NULL),
  FOREIGN KEY (customer_id, session_id) REFERENCES studio_session (customer_id, id)
);

CREATE INDEX activity_timeline ON customer_activity (customer_id, created_at DESC);
CREATE INDEX conversation_messages ON message (conversation_id, created_at);
CREATE INDEX studio_schedule ON studio_session (studio_id, starts_at);
CREATE INDEX agent_history ON agent_run (studio_id, created_at DESC);
CREATE INDEX feedback_follow_up ON feedback (follow_up_on) WHERE status <> 'COMPLETED';
COMMIT;
