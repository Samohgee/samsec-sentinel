/*
# Add INSERT policy for contact_messages

1. Why
- The contact_messages table currently has SELECT, UPDATE, DELETE policies for admins,
  but NO INSERT policy. This means anon/public visitors cannot submit contact messages
  through the contact form — every insert is rejected by RLS.
2. Security changes
- Add an INSERT policy allowing anon + authenticated to insert new contact messages.
  This is intentionally public so visitors can submit the contact form without signing in.
*/

DROP POLICY IF EXISTS "contact_messages_insert_public" ON contact_messages;

CREATE POLICY "contact_messages_insert_public"
ON contact_messages FOR INSERT
TO anon, authenticated
WITH CHECK (true);
