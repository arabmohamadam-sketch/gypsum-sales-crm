-- Harden internal authorization helper functions.
-- These functions are used by RLS policies and must remain executable by
-- authenticated users, but they should not be directly callable by anon/PUBLIC.

REVOKE EXECUTE ON FUNCTION public.auth_user_company_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.auth_user_is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.auth_user_has_company_role(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.auth_user_can_access_customer(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.auth_user_can_view_user_role(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.auth_user_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_has_company_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_can_access_customer(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_can_view_user_role(uuid) TO authenticated;