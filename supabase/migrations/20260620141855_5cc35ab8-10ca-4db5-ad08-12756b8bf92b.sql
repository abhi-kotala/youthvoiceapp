
-- ISSUES
CREATE TABLE public.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.issues TO anon, authenticated;
GRANT ALL ON public.issues TO service_role;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read issues" ON public.issues FOR SELECT TO anon, authenticated USING (true);

-- VOTES
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  choice TEXT NOT NULL CHECK (choice IN ('agree','disagree','neutral')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (issue_id, device_id)
);
GRANT SELECT, INSERT, UPDATE ON public.votes TO anon, authenticated;
GRANT ALL ON public.votes TO service_role;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read votes" ON public.votes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can cast a vote" ON public.votes FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update votes" ON public.votes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- COMMENTS
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT 'Anonymous',
  stance TEXT NOT NULL CHECK (stance IN ('agree','disagree','neutral')),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.comments TO anon, authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read visible comments" ON public.comments FOR SELECT TO anon, authenticated USING (hidden = false);
CREATE POLICY "Anyone can post comments" ON public.comments FOR INSERT TO anon, authenticated WITH CHECK (true);

-- REPORTS
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reports TO anon, authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit reports" ON public.reports FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Seed sample issues (placeholder; user should replace with real local topics)
INSERT INTO public.issues (title, description, category) VALUES
('Should our city expand the protected bike lane network downtown?',
 'A proposal would add 12 miles of protected bike lanes through downtown, removing one car lane on three major streets. Supporters say it improves safety and reduces traffic; opponents worry about congestion and parking loss.',
 'Transportation'),
('Should our city raise the local minimum wage to $20/hour by 2027?',
 'A draft ordinance would phase in a $20/hr minimum wage for businesses with more than 25 employees. Supporters cite cost of living; opponents say small businesses will cut jobs.',
 'Economy'),
('Should the city impose a curfew for minors after 11pm?',
 'A proposed ordinance would make it illegal for anyone under 18 to be in public spaces between 11pm and 5am without a guardian. Supporters point to crime statistics; opponents call it unfair to teens with jobs and responsibilities.',
 'Public Safety');
