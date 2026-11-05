-- Internal trigger/helper functions must not be callable through the REST API.
-- (Triggers still fire normally; EXECUTE is only checked when a trigger is created.)
revoke execute on function public.protect_profile_columns() from public, anon, authenticated;
revoke execute on function public.requests_after_write()    from public, anon, authenticated;
revoke execute on function public.requests_guard_update()   from public, anon, authenticated;
revoke execute on function public.requests_before_insert()  from public, anon, authenticated;
revoke execute on function public.throttle_public_insert()  from public, anon, authenticated;
revoke execute on function public.generate_request_number() from public, anon, authenticated;
