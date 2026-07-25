-- Local/dev bootstrap helpers. Run manually after applying 0001_init.sql.
--
-- 1. Sign up through the app (/signup) with the account you want as Super Admin.
-- 2. Promote that account by email:
--
--   update public.profiles
--   set role = 'super_admin', status = 'approved'
--   where id = (select id from auth.users where email = 'admin@example.com');
--
-- 3. Sign up a second test account as an educator, then approve it from
--    /admin/educators once the super admin above is set up, or directly:
--
--   update public.profiles
--   set status = 'approved'
--   where id = (select id from auth.users where email = 'educador-test@example.com');

update public.admin_settings
set site_name = 'World Binary Sorteos', support_email = 'soporte@worldbinary.pro'
where id = true;
