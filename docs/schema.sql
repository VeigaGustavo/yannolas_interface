-- Modelo PostgreSQL planejado para a API Spring Boot.
-- Cada estúdio é um tenant isolado: toda tabela de negócio carrega studio_id
-- e as chaves estrangeiras compostas impedem vínculos entre estúdios.
-- Valores monetários em centavos (bigint).
BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE studio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  professional_name text NOT NULL,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  policies text NOT NULL DEFAULT '',
  notifications boolean NOT NULL DEFAULT true,
  -- prazos de follow-up, % padrão por benefício e mensagens modelo
  follow_up_settings jsonb NOT NULL DEFAULT '{}',
  benefit_pct jsonb NOT NULL DEFAULT '{}',
  message_templates jsonb NOT NULL DEFAULT '{}',
  brand jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE app_user (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studio,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'OWNER' CHECK (role IN ('OWNER')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE business_hours (
  studio_id uuid NOT NULL REFERENCES studio,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  opens_at time NOT NULL,
  closes_at time NOT NULL CHECK (closes_at > opens_at),
  PRIMARY KEY (studio_id, weekday, opens_at)
);

CREATE TABLE procedure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studio,
  name text NOT NULL,
  return_days integer NOT NULL CHECK (return_days > 0),
  UNIQUE (studio_id, name),
  UNIQUE (studio_id, id)
);

CREATE TABLE customer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studio,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  birthday date,
  referred_by uuid,
  stage text NOT NULL CHECK (stage IN ('NEW','QUALIFICATION','QUOTE','AWAITING_APPROVAL','BOOKED','COMPLETED')),
  project text NOT NULL DEFAULT '',
  marketing_consent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (studio_id, phone),
  UNIQUE (studio_id, id),
  FOREIGN KEY (studio_id, referred_by) REFERENCES customer (studio_id, id),
  CHECK (referred_by IS NULL OR referred_by <> id)
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

CREATE TABLE customer_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  kind text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (studio_id, customer_id) REFERENCES customer (studio_id, id)
);

CREATE TABLE attachment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  storage_key text NOT NULL UNIQUE,
  mime_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (studio_id, id),
  FOREIGN KEY (studio_id, customer_id) REFERENCES customer (studio_id, id)
);

CREATE TABLE quote (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  description text NOT NULL,
  -- campos do estúdio: local/tamanho/estilo (tatuagem) ou região/produto/quantidade (estética)
  details jsonb NOT NULL DEFAULT '{}',
  total_cents bigint NOT NULL CHECK (total_cents > 0),
  deposit_cents bigint NOT NULL CHECK (deposit_cents >= 0 AND deposit_cents <= total_cents),
  valid_until date NOT NULL,
  status text NOT NULL CHECK (status IN ('DRAFT','PENDING','APPROVED','DECLINED')),
  reference_attachment_id uuid,
  UNIQUE (studio_id, id),
  FOREIGN KEY (studio_id, customer_id) REFERENCES customer (studio_id, id),
  FOREIGN KEY (studio_id, reference_attachment_id) REFERENCES attachment (studio_id, id)
);

CREATE TABLE studio_session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studio,
  customer_id uuid,
  quote_id uuid,
  procedure_id uuid,
  title text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL CHECK (ends_at > starts_at),
  status text NOT NULL CHECK (status IN ('CONFIRMED','PENDING','CANCELED','BLOCKED','COMPLETED')),
  CHECK (quote_id IS NULL OR customer_id IS NOT NULL),
  CHECK (customer_id IS NOT NULL OR status IN ('BLOCKED','CANCELED')),
  FOREIGN KEY (studio_id, customer_id) REFERENCES customer (studio_id, id),
  FOREIGN KEY (studio_id, quote_id) REFERENCES quote (studio_id, id),
  FOREIGN KEY (studio_id, procedure_id) REFERENCES procedure (studio_id, id),
  EXCLUDE USING gist (studio_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&)
    WHERE (status <> 'CANCELED'),
  UNIQUE (studio_id, id)
);
CREATE UNIQUE INDEX session_active_quote ON studio_session (quote_id) WHERE status <> 'CANCELED';

-- Fidelidade -------------------------------------------------------------

CREATE TABLE coupon (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studio,
  code text NOT NULL CHECK (code = upper(code)),
  pct smallint NOT NULL CHECK (pct BETWEEN 1 AND 100),
  valid_until date NOT NULL,
  max_uses integer NOT NULL CHECK (max_uses > 0),
  uses integer NOT NULL DEFAULT 0 CHECK (uses >= 0 AND uses <= max_uses),
  UNIQUE (studio_id, code),
  UNIQUE (studio_id, id)
);

CREATE TABLE promotion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studio,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('PROMOTION','RAFFLE')),
  pct smallint NOT NULL CHECK (pct BETWEEN 1 AND 100),
  valid_until date NOT NULL,
  UNIQUE (studio_id, id)
);

CREATE TABLE benefit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('REFERRAL','PROMOTION','RAFFLE','COUPON','BIRTHDAY')),
  pct smallint NOT NULL CHECK (pct BETWEEN 0 AND 100),
  label text NOT NULL,
  status text NOT NULL CHECK (status IN ('PENDING','AVAILABLE','USED')),
  valid_until date,
  source_customer_id uuid,
  promotion_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (studio_id, id),
  FOREIGN KEY (studio_id, customer_id) REFERENCES customer (studio_id, id),
  FOREIGN KEY (studio_id, source_customer_id) REFERENCES customer (studio_id, id),
  FOREIGN KEY (studio_id, promotion_id) REFERENCES promotion (studio_id, id)
);
-- uma indicação gera no máximo um benefício para quem indicou
CREATE UNIQUE INDEX benefit_referral ON benefit (source_customer_id) WHERE kind = 'REFERRAL';

-- Faturamento ------------------------------------------------------------

CREATE TABLE payment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  session_id uuid,
  quote_id uuid,
  kind text NOT NULL CHECK (kind IN ('DEPOSIT','SERVICE')),
  paid_on date NOT NULL,
  method text NOT NULL CHECK (method IN ('PIX','CASH','DEBIT','CREDIT')),
  gross_cents bigint NOT NULL CHECK (gross_cents > 0),
  discount_cents bigint NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  discount_reason text NOT NULL DEFAULT '',
  deposit_cents bigint NOT NULL DEFAULT 0 CHECK (deposit_cents >= 0),
  net_cents bigint NOT NULL CHECK (net_cents = gross_cents - discount_cents - deposit_cents AND net_cents >= 0),
  benefit_id uuid,
  coupon_id uuid,
  CHECK (benefit_id IS NULL OR coupon_id IS NULL),
  UNIQUE (studio_id, id),
  FOREIGN KEY (studio_id, customer_id) REFERENCES customer (studio_id, id),
  FOREIGN KEY (studio_id, session_id) REFERENCES studio_session (studio_id, id),
  FOREIGN KEY (studio_id, quote_id) REFERENCES quote (studio_id, id),
  FOREIGN KEY (studio_id, benefit_id) REFERENCES benefit (studio_id, id),
  FOREIGN KEY (studio_id, coupon_id) REFERENCES coupon (studio_id, id)
);
-- um atendimento é pago uma única vez; um benefício é usado uma única vez
CREATE UNIQUE INDEX payment_service_once ON payment (session_id) WHERE kind = 'SERVICE';
CREATE UNIQUE INDEX payment_benefit_once ON payment (benefit_id) WHERE benefit_id IS NOT NULL;

CREATE TABLE installment (
  payment_id uuid NOT NULL REFERENCES payment ON DELETE CASCADE,
  n smallint NOT NULL CHECK (n BETWEEN 1 AND 12),
  due_on date NOT NULL,
  cents bigint NOT NULL CHECK (cents > 0),
  -- NULL: recebida automaticamente na data; true/false: marcação manual
  received boolean,
  PRIMARY KEY (payment_id, n)
);

CREATE TABLE expense (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studio,
  spent_on date NOT NULL,
  category text NOT NULL CHECK (category IN ('MATERIAL','RENT','MARKETING','OTHER')),
  description text NOT NULL,
  cents bigint NOT NULL CHECK (cents > 0),
  stock_movement_id uuid
);

-- Follow-up --------------------------------------------------------------

CREATE TABLE follow_up (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN ('QUOTE_NO_REPLY','POST_SERVICE','RETURN','INACTIVE','BIRTHDAY','REFERRAL','MANUAL')),
  due_on date NOT NULL,
  stage text NOT NULL CHECK (stage IN ('TODO','CONTACTED','REPLIED','NO_REPLY','CONVERTED','LOST')),
  attempts smallint NOT NULL DEFAULT 0,
  ref_id text,
  converted_to uuid,
  rating smallint CHECK (rating BETWEEN 1 AND 5),
  comment text,
  note text,
  UNIQUE (studio_id, id),
  FOREIGN KEY (studio_id, customer_id) REFERENCES customer (studio_id, id)
);
-- deduplicação: um follow-up aberto por cliente e motivo (exceto manual)
CREATE UNIQUE INDEX follow_up_open_once ON follow_up (customer_id, reason)
  WHERE reason <> 'MANUAL' AND stage IN ('TODO','CONTACTED','REPLIED','NO_REPLY');
CREATE UNIQUE INDEX follow_up_ref_once ON follow_up (customer_id, reason, ref_id)
  WHERE reason <> 'MANUAL' AND ref_id IS NOT NULL;

CREATE TABLE follow_up_event (
  id bigserial PRIMARY KEY,
  follow_up_id uuid NOT NULL REFERENCES follow_up ON DELETE CASCADE,
  stage text NOT NULL,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Estoque ----------------------------------------------------------------

CREATE TABLE stock_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studio,
  name text NOT NULL,
  unit text NOT NULL,
  qty numeric(12,3) NOT NULL CHECK (qty >= 0),
  min_qty numeric(12,3) NOT NULL DEFAULT 0 CHECK (min_qty >= 0),
  last_cost_cents bigint NOT NULL DEFAULT 0,
  UNIQUE (studio_id, name),
  UNIQUE (studio_id, id)
);

CREATE TABLE stock_movement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL,
  stock_item_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('PURCHASE','ADJUSTMENT')),
  qty numeric(12,3) NOT NULL,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (studio_id, stock_item_id) REFERENCES stock_item (studio_id, id)
);
ALTER TABLE expense ADD FOREIGN KEY (stock_movement_id) REFERENCES stock_movement;

COMMIT;
