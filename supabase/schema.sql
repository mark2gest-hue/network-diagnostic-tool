-- Supabase Schema for Network Diagnostic Tool

-- Users table for custom auth
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Test history table
CREATE TABLE IF NOT EXISTS public.test_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    test_type TEXT NOT NULL, -- 'external' or 'internal'
    target TEXT, -- domain or IP
    results JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_test_history_user_id ON public.test_history(user_id);
CREATE INDEX IF NOT EXISTS idx_test_history_created_at ON public.test_history(created_at);
