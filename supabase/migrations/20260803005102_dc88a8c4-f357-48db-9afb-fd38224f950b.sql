-- PROFILES: own row or admin only
DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
CREATE POLICY profiles_select_self_or_admin ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'Administrator'));

-- USER_ROLES: own row or admin only
DROP POLICY IF EXISTS user_roles_select ON public.user_roles;
CREATE POLICY user_roles_select_self_or_admin ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'Administrator'));

-- TICKETS: keep org-wide visibility but hide contact number at column level
REVOKE SELECT ON public.tickets FROM authenticated;
GRANT SELECT (id, ejob, tanggal, nama, departement, lokasi, kategori, type_ticket,
              subject, description, status, tanggal_selesai, action, keterangan,
              creator, created_by, created_at, updated_at) ON public.tickets TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tickets TO authenticated;
REVOKE SELECT ON public.tickets FROM anon;

CREATE OR REPLACE FUNCTION public.ticket_contact(_ticket_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT t.no_wa FROM public.tickets t
  WHERE t.id = _ticket_id AND public.is_staff(auth.uid())
$$;
REVOKE ALL ON FUNCTION public.ticket_contact(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ticket_contact(uuid) TO authenticated;

-- SETTINGS: anonymous visitors only get the login background
REVOKE SELECT ON public.settings FROM anon;
GRANT SELECT (id, login_bg_url) ON public.settings TO anon;