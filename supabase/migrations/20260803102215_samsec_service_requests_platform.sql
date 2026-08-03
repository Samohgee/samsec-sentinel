/*
# SAMSEC LABS — service requests, contact messages, blog, and admins

## Summary
Creates the data layer for the SAMSEC LABS cybersecurity services platform so
visitors can request services and contact the team, and admins can manage those
submissions plus blog content from a secured dashboard.

## New tables
1. admins — allowlist of emails permitted to manage the platform.
   - id (uuid pk), email (text, unique), display_name (text), created_at (timestamptz)
2. service_requests — visitor-submitted service request forms.
   - id (uuid pk), request_id (text, unique, server-generated like SAMSEC-2026-00001)
   - full_name, email, phone, company, service, budget, description, contact_method
   - status (text, default 'new'), notes (text, default '')
   - created_at, updated_at (timestamptz)
3. contact_messages — visitor-submitted contact form messages.
   - id (uuid pk), name, email, subject, message, status (default 'new'), created_at
4. blog_posts — admin-managed blog content.
   - id (uuid pk), slug (unique), title, excerpt, content, author, cover_url
   - status (default 'draft'), created_at, updated_at, published_at

## Security (RLS)
- admins: SELECT/INSERT/UPDATE/DELETE only for is_admin() (no public access).
- service_requests: SELECT/UPDATE/DELETE only for is_admin(); INSERT is NOT granted
  to anon — rows are created exclusively through the submit_service_request()
  SECURITY DEFINER function, which only sets visitor-safe columns (so visitors can
  never inject status or notes).
- contact_messages: SELECT/UPDATE/DELETE only for is_admin(); INSERT only through
  the submit_contact_message() SECURITY DEFINER function.
- blog_posts: SELECT — published rows readable by everyone, all rows by is_admin();
  INSERT/UPDATE/DELETE only for is_admin().

## Helper functions (all SECURITY DEFINER with fixed search_path)
- is_admin(): true when the current JWT email exists in admins.
- submit_service_request(payload jsonb): inserts a request with a sequential
  request_id (SAMSEC-YYYY-00001) and returns that id. Executable by anon+authenticated.
- submit_contact_message(payload jsonb): inserts a contact message, returns the new id.
- set_updated_at(): trigger function keeping updated_at current.

## Notes
1. The first admin (admin@samseclabs.com) is seeded. The owner creates the matching
   auth account from the admin login page using this email; the admins table gates
   dashboard access regardless of who holds an auth account.
2. request_id is generated server-side from a dedicated sequence to guarantee
  uniqueness and a readable format; visitors never supply or override it.
3. No payments, courses, or subscriptions are included in this build.
*/

-- ============================================================
-- admins
-- ============================================================
CREATE TABLE IF NOT EXISTS admins (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text UNIQUE NOT NULL,
    display_name text,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- service_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS service_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id text UNIQUE NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    company text,
    service text NOT NULL,
    budget text,
    description text NOT NULL,
    contact_method text NOT NULL DEFAULT 'Email',
    status text NOT NULL DEFAULT 'new',
    notes text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS service_requests_status_idx ON service_requests(status);
CREATE INDEX IF NOT EXISTS service_requests_created_at_idx ON service_requests(created_at DESC);

-- ============================================================
-- contact_messages
-- ============================================================
CREATE TABLE IF NOT EXISTS contact_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text NOT NULL,
    subject text,
    message text NOT NULL,
    status text NOT NULL DEFAULT 'new',
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS contact_messages_created_at_idx ON contact_messages(created_at DESC);

-- ============================================================
-- blog_posts
-- ============================================================
CREATE TABLE IF NOT EXISTS blog_posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text UNIQUE NOT NULL,
    title text NOT NULL,
    excerpt text,
    content text,
    author text NOT NULL DEFAULT 'SAMSEC LABS',
    cover_url text,
    status text NOT NULL DEFAULT 'draft',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    published_at timestamptz
);
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS blog_posts_status_idx ON blog_posts(status);
CREATE INDEX IF NOT EXISTS blog_posts_published_at_idx ON blog_posts(published_at DESC);

-- ============================================================
-- sequence for human-readable request ids
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS service_requests_seq START 1;

-- ============================================================
-- helper: is_admin
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT coalesce(
        (auth.jwt() ->> 'email') IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM admins a
            WHERE a.email = (auth.jwt() ->> 'email')
        ),
        false
    );
$$;

-- ============================================================
-- helper: set_updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS service_requests_set_updated_at ON service_requests;
CREATE TRIGGER service_requests_set_updated_at
    BEFORE UPDATE ON service_requests
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS blog_posts_set_updated_at ON blog_posts;
CREATE TRIGGER blog_posts_set_updated_at
    BEFORE UPDATE ON blog_posts
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- helper: submit_service_request(payload jsonb)
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_service_request(payload jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_request_id text;
    seq_val bigint;
BEGIN
    seq_val := nextval('service_requests_seq');
    new_request_id := 'SAMSEC-' || to_char(now(), 'YYYY') || '-' || lpad(seq_val::text, 5, '0');

    INSERT INTO service_requests (
        request_id, full_name, email, phone, company, service, budget, description, contact_method
    ) VALUES (
        new_request_id,
        payload->>'full_name',
        payload->>'email',
        payload->>'phone',
        NULLIF(payload->>'company', ''),
        payload->>'service',
        NULLIF(payload->>'budget', ''),
        payload->>'description',
        COALESCE(payload->>'contact_method', 'Email')
    );

    RETURN new_request_id;
END;
$$;

-- ============================================================
-- helper: submit_contact_message(payload jsonb)
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_contact_message(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_id uuid;
BEGIN
    INSERT INTO contact_messages (name, email, subject, message)
    VALUES (
        payload->>'name',
        payload->>'email',
        NULLIF(payload->>'subject', ''),
        payload->>'message'
    )
    RETURNING id INTO new_id;

    RETURN new_id;
END;
$$;

-- ============================================================
-- grants on functions
-- ============================================================
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_service_request(jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_contact_message(jsonb) TO anon, authenticated;

-- ============================================================
-- RLS policies: admins (admin-only)
-- ============================================================
DROP POLICY IF EXISTS "admins_select_admin" ON admins;
CREATE POLICY "admins_select_admin" ON admins FOR SELECT
    TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admins_insert_admin" ON admins;
CREATE POLICY "admins_insert_admin" ON admins FOR INSERT
    TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admins_update_admin" ON admins;
CREATE POLICY "admins_update_admin" ON admins FOR UPDATE
    TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admins_delete_admin" ON admins;
CREATE POLICY "admins_delete_admin" ON admins FOR DELETE
    TO authenticated USING (public.is_admin());

-- ============================================================
-- RLS policies: service_requests (admin manages, visitors insert via function)
-- ============================================================
DROP POLICY IF EXISTS "service_requests_select_admin" ON service_requests;
CREATE POLICY "service_requests_select_admin" ON service_requests FOR SELECT
    TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "service_requests_update_admin" ON service_requests;
CREATE POLICY "service_requests_update_admin" ON service_requests FOR UPDATE
    TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "service_requests_delete_admin" ON service_requests;
CREATE POLICY "service_requests_delete_admin" ON service_requests FOR DELETE
    TO authenticated USING (public.is_admin());

-- ============================================================
-- RLS policies: contact_messages (admin manages, visitors insert via function)
-- ============================================================
DROP POLICY IF EXISTS "contact_messages_select_admin" ON contact_messages;
CREATE POLICY "contact_messages_select_admin" ON contact_messages FOR SELECT
    TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "contact_messages_update_admin" ON contact_messages;
CREATE POLICY "contact_messages_update_admin" ON contact_messages FOR UPDATE
    TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "contact_messages_delete_admin" ON contact_messages;
CREATE POLICY "contact_messages_delete_admin" ON contact_messages FOR DELETE
    TO authenticated USING (public.is_admin());

-- ============================================================
-- RLS policies: blog_posts (public reads published, admin manages all)
-- ============================================================
DROP POLICY IF EXISTS "blog_posts_select_public_or_admin" ON blog_posts;
CREATE POLICY "blog_posts_select_public_or_admin" ON blog_posts FOR SELECT
    TO anon, authenticated USING (status = 'published' OR public.is_admin());

DROP POLICY IF EXISTS "blog_posts_insert_admin" ON blog_posts;
CREATE POLICY "blog_posts_insert_admin" ON blog_posts FOR INSERT
    TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "blog_posts_update_admin" ON blog_posts;
CREATE POLICY "blog_posts_update_admin" ON blog_posts FOR UPDATE
    TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "blog_posts_delete_admin" ON blog_posts;
CREATE POLICY "blog_posts_delete_admin" ON blog_posts FOR DELETE
    TO authenticated USING (public.is_admin());

-- ============================================================
-- seed first admin
-- ============================================================
INSERT INTO admins (email, display_name)
SELECT 'admin@samseclabs.com', 'SAMSEC Admin'
WHERE NOT EXISTS (SELECT 1 FROM admins WHERE email = 'admin@samseclabs.com');
