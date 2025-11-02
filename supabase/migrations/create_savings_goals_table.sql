-- Create savings_goals table
CREATE TABLE IF NOT EXISTS public.savings_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount BIGINT NOT NULL, -- Stored in cents
  current_amount BIGINT NOT NULL DEFAULT 0, -- Stored in cents
  target_date DATE,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS savings_goals_user_id_idx ON public.savings_goals(user_id);

-- Enable Row Level Security
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own savings goals" ON public.savings_goals;
DROP POLICY IF EXISTS "Users can create their own savings goals" ON public.savings_goals;
DROP POLICY IF EXISTS "Users can update their own savings goals" ON public.savings_goals;
DROP POLICY IF EXISTS "Users can delete their own savings goals" ON public.savings_goals;

-- Create RLS policies
-- Users can view their own goals
CREATE POLICY "Users can view their own savings goals"
  ON public.savings_goals
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own goals
CREATE POLICY "Users can create their own savings goals"
  ON public.savings_goals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own goals
CREATE POLICY "Users can update their own savings goals"
  ON public.savings_goals
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own goals
CREATE POLICY "Users can delete their own savings goals"
  ON public.savings_goals
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_savings_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists (to avoid conflicts)
DROP TRIGGER IF EXISTS update_savings_goals_updated_at ON public.savings_goals;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_savings_goals_updated_at
  BEFORE UPDATE ON public.savings_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_savings_goals_updated_at();

-- Add comment to table
COMMENT ON TABLE public.savings_goals IS 'User savings goals with target amounts and progress tracking';
