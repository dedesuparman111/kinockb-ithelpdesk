DROP POLICY IF EXISTS "tickets_update_own_open" ON public.tickets;
CREATE POLICY "tickets_update_own_open" ON public.tickets
FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  AND status::text = 'Open'
  AND NOT public.has_role(auth.uid(), 'User Public'::app_role)
)
WITH CHECK (
  created_by = auth.uid()
  AND NOT public.has_role(auth.uid(), 'User Public'::app_role)
);