-- Create events table for tracking user activity (logins, app opens, access events)
-- This table is used to generate admin statistics like:
-- - Access counts by user type (squad, public user, rilevatore, admin)
-- - App open counts by user type
-- - User activity timeline

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,  -- 'app_open', 'login', 'access', 'logout', etc.
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- nullable for anonymous access
  user_category TEXT,  -- 'squadra', 'pubblico', 'rilevatore', 'admin', 'anonimo'
  event_data JSONB,  -- additional metadata (page, device, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_events_event_type ON public.events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_user_category ON public.events(user_category);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to insert their own events
CREATE POLICY "Users can insert their own events" ON public.events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Allow admins to view all events
CREATE POLICY "Admins can view all events" ON public.events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admins 
      WHERE admins.user_id = auth.uid()
    )
  );

-- Policy: Allow authenticated users to view their own events
CREATE POLICY "Users can view their own events" ON public.events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Function to log event (can be called from client or trigger)
CREATE OR REPLACE FUNCTION log_event(
  p_event_type TEXT,
  p_user_category TEXT DEFAULT NULL,
  p_event_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO public.events (event_type, user_id, user_category, event_data)
  VALUES (
    p_event_type,
    auth.uid(),
    p_user_category,
    p_event_data
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION log_event TO authenticated;

-- Query to get stats: count by event type and user category
-- SELECT 
--   event_type,
--   user_category,
--   COUNT(*) as count
-- FROM public.events
-- WHERE created_at >= NOW() - INTERVAL '30 days'
-- GROUP BY event_type, user_category
-- ORDER BY count DESC;

-- Query to get unique users by category in last 30 days
-- SELECT 
--   user_category,
--   COUNT(DISTINCT user_id) as unique_users,
--   COUNT(*) as total_events
-- FROM public.events
-- WHERE created_at >= NOW() - INTERVAL '30 days'
-- GROUP BY user_category;
