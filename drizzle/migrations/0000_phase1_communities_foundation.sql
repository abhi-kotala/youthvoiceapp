CREATE TABLE public.states (
  code text PRIMARY KEY,
  name text NOT NULL
);
GRANT SELECT ON public.states TO anon, authenticated;
GRANT ALL ON public.states TO service_role;
ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read states" ON public.states FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.states (code, name) VALUES
('AL','Alabama'),('AK','Alaska'),('AZ','Arizona'),('AR','Arkansas'),('CA','California'),('CO','Colorado'),('CT','Connecticut'),('DE','Delaware'),('DC','District of Columbia'),('FL','Florida'),('GA','Georgia'),('HI','Hawaii'),('ID','Idaho'),('IL','Illinois'),('IN','Indiana'),('IA','Iowa'),('KS','Kansas'),('KY','Kentucky'),('LA','Louisiana'),('ME','Maine'),('MD','Maryland'),('MA','Massachusetts'),('MI','Michigan'),('MN','Minnesota'),('MS','Mississippi'),('MO','Missouri'),('MT','Montana'),('NE','Nebraska'),('NV','Nevada'),('NH','New Hampshire'),('NJ','New Jersey'),('NM','New Mexico'),('NY','New York'),('NC','North Carolina'),('ND','North Dakota'),('OH','Ohio'),('OK','Oklahoma'),('OR','Oregon'),('PA','Pennsylvania'),('RI','Rhode Island'),('SC','South Carolina'),('SD','South Dakota'),('TN','Tennessee'),('TX','Texas'),('UT','Utah'),('VT','Vermont'),('VA','Virginia'),('WA','Washington'),('WV','West Virginia'),('WI','Wisconsin'),('WY','Wyoming');

CREATE TABLE public.communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL,
  state_code text NOT NULL REFERENCES public.states(code),
  type text NOT NULL DEFAULT 'city',
  status text NOT NULL DEFAULT 'pending',
  timezone text NOT NULL DEFAULT 'America/Chicago',
  center_lat double precision,
  center_lng double precision,
  legacy_city text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (state_code, slug)
);
GRANT SELECT ON public.communities TO anon, authenticated;
GRANT ALL ON public.communities TO service_role;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active communities" ON public.communities FOR SELECT TO anon, authenticated USING (status = 'active');

INSERT INTO public.communities (slug, name, state_code, type, status, center_lat, center_lng, legacy_city) VALUES
('fargo','Fargo','ND','city','active',46.8772,-96.7898,'Fargo'),
('west-fargo','West Fargo','ND','city','active',46.8750,-96.9004,'West Fargo'),
('moorhead','Moorhead','MN','city','active',46.8738,-96.7678,'Moorhead'),
('north-dakota','North Dakota (statewide)','ND','state','active',47.5,-100.5,'Statewide');

CREATE TABLE public.community_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES public.communities(id) ON DELETE CASCADE,
  name text,
  title text,
  email text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON COLUMN public.community_recipients.community_id IS 'NULL = receives results for every legacy Fargo-Moorhead community';
GRANT ALL ON public.community_recipients TO service_role;
ALTER TABLE public.community_recipients ENABLE ROW LEVEL SECURITY;

INSERT INTO public.community_recipients (community_id, email, verified) VALUES
(NULL,'eric@gjerdevig.com',true),(NULL,'shelly.carlson@moorheadmn.gov',true),(NULL,'steinec@fargo.k12.nd.us',true),(NULL,'lanarakow@gmail.com',true);

ALTER TABLE public.issues ADD COLUMN community_id uuid REFERENCES public.communities(id);
CREATE INDEX issues_community_id_idx ON public.issues(community_id);
UPDATE public.issues i SET community_id = c.id FROM public.communities c WHERE c.legacy_city = i.city AND i.community_id IS NULL;
COMMENT ON COLUMN public.issues.city IS 'DEPRECATED: use community_id';

REVOKE SELECT ON public.votes FROM anon, authenticated;
GRANT SELECT (id, issue_id, choice, created_at) ON public.votes TO anon, authenticated;