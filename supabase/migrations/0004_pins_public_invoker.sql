-- Switch the pins_public view to SECURITY INVOKER so it respects the
-- calling user's RLS instead of the view creator's elevated privileges.
-- Clears the Supabase advisor "Security Definer View" critical warning
-- and removes a footgun if RLS on `pins` is tightened later.

alter view public.pins_public set (security_invoker = true);
