insert into public.regions (id_region, region)
values (0, 'Непосочен регион')
on conflict (id_region) do nothing;
