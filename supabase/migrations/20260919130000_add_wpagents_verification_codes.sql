-- One-time codes used to prove e-mail ownership before student-performance
-- hands out a student's results (otherwise anyone could type a classmate's
-- e-mail and read their grades/mistakes). RLS is enabled with NO policies,
-- so only the service-role key (used by the edge function) can touch this
-- table — anon/authenticated clients get zero access, by design.
CREATE TABLE wpagents_verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wpagents_verification_codes_email_lower
  ON wpagents_verification_codes (lower(email), created_at DESC);

ALTER TABLE wpagents_verification_codes ENABLE ROW LEVEL SECURITY;
