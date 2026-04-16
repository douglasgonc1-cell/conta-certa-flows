DROP POLICY "Authenticated insert audit_log" ON public.audit_log;
CREATE POLICY "Authenticated insert own audit_log" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);