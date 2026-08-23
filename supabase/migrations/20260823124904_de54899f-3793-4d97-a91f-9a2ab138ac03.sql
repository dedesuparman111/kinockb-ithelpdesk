CREATE TABLE public.ticket_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name varchar,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ticket_comments_ticket_id_idx ON public.ticket_comments (ticket_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_comments TO authenticated;
GRANT ALL ON public.ticket_comments TO service_role;

ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_ticket_comments_updated
BEFORE UPDATE ON public.ticket_comments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Semua user login boleh membaca komentar
CREATE POLICY ticket_comments_select ON public.ticket_comments
  FOR SELECT TO authenticated
  USING (true);

-- Semua user login (kecuali akun public bersama) boleh menulis komentar atas nama sendiri
CREATE POLICY ticket_comments_insert ON public.ticket_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND NOT public.has_role(auth.uid(), 'User Public'::public.app_role)
  );

-- Penulis boleh mengubah komentarnya sendiri
CREATE POLICY ticket_comments_update_own ON public.ticket_comments
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND NOT public.has_role(auth.uid(), 'User Public'::public.app_role))
  WITH CHECK (user_id = auth.uid());

-- Penulis atau staff (Administrator / Petugas IT) boleh menghapus
CREATE POLICY ticket_comments_delete ON public.ticket_comments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

-- Staff boleh mengubah/menghapus komentar apa pun (moderasi)
CREATE POLICY ticket_comments_update_staff ON public.ticket_comments
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));