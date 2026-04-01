
-- Create client_tokens table for CLI registration tokens
CREATE TABLE public.client_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  label TEXT,
  token_type TEXT NOT NULL DEFAULT 'one_time' CHECK (token_type IN ('one_time', 'expiry')),
  expires_at TIMESTAMP WITH TIME ZONE,
  used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  client_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- No RLS needed - this table is accessed by edge function with service role key
-- But enable RLS and add a policy for safety
ALTER TABLE public.client_tokens ENABLE ROW LEVEL SECURITY;

-- Allow the edge function (service role) to manage tokens
-- No anon access - all access goes through the edge function
CREATE POLICY "No direct access to tokens"
ON public.client_tokens
FOR ALL
USING (false);
