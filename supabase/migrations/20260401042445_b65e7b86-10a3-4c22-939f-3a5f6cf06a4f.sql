
-- Drop the old deny-all policy
DROP POLICY IF EXISTS "No direct access to tokens" ON public.client_tokens;

-- Allow anyone to read tokens (host UI, no auth)
CREATE POLICY "Allow read tokens" ON public.client_tokens FOR SELECT USING (true);

-- Allow anyone to insert tokens (host UI generates them)
CREATE POLICY "Allow insert tokens" ON public.client_tokens FOR INSERT WITH CHECK (true);

-- Allow anyone to delete tokens (host UI manages them)
CREATE POLICY "Allow delete tokens" ON public.client_tokens FOR DELETE USING (true);

-- Allow updates (register function uses service role, but just in case)
CREATE POLICY "Allow update tokens" ON public.client_tokens FOR UPDATE USING (true);
