insert into public.delivery_staff_profiles (
  user_id,
  email,
  full_name,
  service_zone
)
select
  roles.user_id,
  coalesce(auth_user.email, ''),
  coalesce(profile.full_name, ''),
  'Unassigned'
from public.user_roles roles
join auth.users auth_user on auth_user.id = roles.user_id
left join public.profiles profile on profile.user_id = roles.user_id
where roles.role = 'delivery_staff'
on conflict (user_id) do nothing;
