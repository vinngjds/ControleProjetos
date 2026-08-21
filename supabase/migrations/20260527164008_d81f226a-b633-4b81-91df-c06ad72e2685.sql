
-- Revoke public/anon execute on all SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_project_analyst(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.tick_task_progress() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- has_role and is_project_analyst are used in RLS policies, so authenticated must keep EXECUTE
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_analyst(uuid, uuid) TO authenticated;

-- Keep service_role access for admin/cron usage
GRANT EXECUTE ON FUNCTION public.tick_task_progress() TO service_role;
