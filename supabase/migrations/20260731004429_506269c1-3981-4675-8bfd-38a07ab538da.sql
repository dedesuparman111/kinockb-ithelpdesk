-- Roles
CREATE TYPE public.app_role AS ENUM ('Administrator', 'Petugas IT', 'User Biasa', 'User Public');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  nama VARCHAR(100) NOT NULL,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('Administrator', 'Petugas IT')
  )
$$;

CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'Administrator')) WITH CHECK (public.has_role(auth.uid(), 'Administrator'));

CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'Administrator')) WITH CHECK (public.has_role(auth.uid(), 'Administrator'));

-- Tickets
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ejob VARCHAR(30) UNIQUE NOT NULL,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  nama VARCHAR(100) NOT NULL,
  no_wa VARCHAR(30),
  departement VARCHAR(50) NOT NULL,
  lokasi VARCHAR(100),
  kategori VARCHAR(50) NOT NULL,
  type_ticket VARCHAR(20) NOT NULL DEFAULT 'Request',
  subject VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Open',
  tanggal_selesai DATE,
  action TEXT,
  keterangan TEXT,
  creator VARCHAR(50),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tickets TO authenticated;
GRANT ALL ON public.tickets TO service_role;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tickets_select" ON public.tickets FOR SELECT TO authenticated USING (true);
CREATE POLICY "tickets_insert" ON public.tickets FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "tickets_update_staff" ON public.tickets FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "tickets_update_own_open" ON public.tickets FOR UPDATE TO authenticated USING (created_by = auth.uid() AND status = 'Open') WITH CHECK (created_by = auth.uid());
CREATE POLICY "tickets_delete_staff" ON public.tickets FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_created_at ON public.tickets(created_at DESC);
CREATE INDEX idx_tickets_departement ON public.tickets(departement);
CREATE INDEX idx_tickets_kategori ON public.tickets(kategori);

-- Settings
CREATE TABLE public.settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  departments TEXT NOT NULL DEFAULT 'IT,HRD,Finance,Produksi,Warehouse,QA/QC,Logistik,Purchasing',
  categories TEXT NOT NULL DEFAULT 'Hardware,Software,Network,Printer,Email,ERP/System,Lainnya',
  login_bg_url TEXT,
  it_phone VARCHAR(30) DEFAULT '6281234567890',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_select_public" ON public.settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "settings_admin_all" ON public.settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'Administrator')) WITH CHECK (public.has_role(auth.uid(), 'Administrator'));

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tickets_updated BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed
INSERT INTO public.settings (id, departments, categories, login_bg_url, it_phone)
VALUES (1,
  'IT,HRD,Finance,Produksi,Warehouse,QA/QC,Logistik,Purchasing',
  'Hardware,Software,Network,Printer,Email,ERP/System,Lainnya',
  'https://res.cloudinary.com/dedtb3vnj/image/upload/v1785044494/header-brands0526_co10uq.jpg',
  '6281234567890');

INSERT INTO public.tickets (ejob, tanggal, nama, no_wa, departement, lokasi, kategori, type_ticket, subject, description, status, creator)
VALUES (
  'EJOB/' || TO_CHAR(CURRENT_DATE, 'YYYY/MM') || '/001', CURRENT_DATE,
  'Siti Rahma', '08123456789', 'Produksi', 'Gedung B Lt.2 Area QC', 'Printer', 'Incident',
  'Printer thermal barcode label macet / error paper jam',
  'Printer label barcode cetak tidak jelas dan kertas sering tersangkut saat pemindaian kemasan.',
  'Open', 'user_kino'
);