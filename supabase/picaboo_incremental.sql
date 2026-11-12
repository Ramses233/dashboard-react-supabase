-- ============================================================
-- PICABOO · SQL INCREMENTAL (para quien ya hizo la guía)
-- Ya existen: usuario, multimedia, crear_perfil, es_admin, proteger_rol
-- y sus políticas. Aquí solo se agrega lo NUEVO. Ejecutar UNA vez.
-- ============================================================

-- 1. Tabla snap: el envío de una foto a un destinatario, con temporizador
create table public.snap (
  id bigint generated always as identity primary key,
  remitente_id uuid not null references public.usuario (id) on delete cascade,
  destinatario_id uuid not null references public.usuario (id) on delete cascade,
  multimedia_id bigint not null references public.multimedia (id) on delete cascade,
  segundos int not null default 5 check (segundos between 1 and 10),
  creado_en timestamptz not null default now(),
  visto_en timestamptz,                       -- null = todavía no se ha abierto
  check (remitente_id <> destinatario_id)
);

create index snap_destinatario_idx on public.snap (destinatario_id, creado_en desc);

alter table public.snap enable row level security;

-- 2. Bucket de Storage donde viven las fotos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('snaps', 'snaps', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- 3. Políticas de snap
create policy "ver snaps propios o admin" on public.snap
  for select to authenticated
  using (remitente_id = auth.uid() or destinatario_id = auth.uid() or public.es_admin());

create policy "enviar snap propio" on public.snap
  for insert to authenticated
  with check (
    remitente_id = auth.uid()
    and visto_en is null
    and exists (
      select 1 from public.multimedia m
      where m.id = multimedia_id and m.usuario_id = auth.uid()
    )
  );

create policy "borrar snap propio o admin" on public.snap
  for delete to authenticated
  using (remitente_id = auth.uid() or public.es_admin());

-- 4. Políticas del bucket "snaps"
create policy "subir fotos a mi carpeta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'snaps' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "borrar fotos de mi carpeta o admin" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'snaps'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.es_admin())
  );

-- 5. Funciones que llama la app con supabase.rpc(...)
create function public.buscar_usuarios(p_texto text default '')
returns table (id uuid, nombre text)
language sql
stable
security definer set search_path = ''
as $$
  select u.id, u.nombre
  from public.usuario u
  where u.id <> auth.uid()
    and u.nombre ilike '%' || p_texto || '%'
  order by u.nombre
  limit 30;
$$;

create function public.mis_snaps()
returns table (
  id bigint,
  remitente_id uuid,
  remitente text,
  segundos int,
  creado_en timestamptz,
  visto_en timestamptz
)
language sql
stable
security definer set search_path = ''
as $$
  select s.id, s.remitente_id, u.nombre, s.segundos, s.creado_en, s.visto_en
  from public.snap s
  join public.usuario u on u.id = s.remitente_id
  where s.destinatario_id = auth.uid()
  order by s.creado_en desc
  limit 50;
$$;

create function public.mis_envios()
returns table (
  id bigint,
  destinatario text,
  segundos int,
  creado_en timestamptz,
  visto_en timestamptz
)
language sql
stable
security definer set search_path = ''
as $$
  select s.id, u.nombre, s.segundos, s.creado_en, s.visto_en
  from public.snap s
  join public.usuario u on u.id = s.destinatario_id
  where s.remitente_id = auth.uid()
  order by s.creado_en desc
  limit 50;
$$;

create function public.abrir_snap(p_snap bigint)
returns table (url text, segundos int)
language plpgsql
security definer set search_path = ''
as $$
declare
  v_mid bigint;
  v_seg int;
begin
  update public.snap s
     set visto_en = now()
   where s.id = p_snap
     and s.destinatario_id = auth.uid()
     and s.visto_en is null
  returning s.multimedia_id, s.segundos into v_mid, v_seg;

  if v_mid is null then
    raise exception 'Este snap ya se vio o no existe';
  end if;

  return query
    select m.url, v_seg from public.multimedia m where m.id = v_mid;
end;
$$;

create function public.admin_eliminar_usuario(p_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un admin puede eliminar usuarios';
  end if;
  if p_id = auth.uid() then
    raise exception 'No puedes eliminar tu propia cuenta';
  end if;
  delete from auth.users where id = p_id;
end;
$$;

revoke execute on function public.buscar_usuarios(text)        from public, anon;
revoke execute on function public.mis_snaps()                  from public, anon;
revoke execute on function public.mis_envios()                 from public, anon;
revoke execute on function public.abrir_snap(bigint)           from public, anon;
revoke execute on function public.admin_eliminar_usuario(uuid) from public, anon;
grant  execute on function public.buscar_usuarios(text)        to authenticated;
grant  execute on function public.mis_snaps()                  to authenticated;
grant  execute on function public.mis_envios()                 to authenticated;
grant  execute on function public.abrir_snap(bigint)           to authenticated;
grant  execute on function public.admin_eliminar_usuario(uuid) to authenticated;

-- 6. Dos snaps de ejemplo con las fotos que ya tienes (Ana → Luis y Luis → Ana)
insert into public.snap (remitente_id, destinatario_id, multimedia_id, segundos)
select a.id, l.id, (select min(m.id) from public.multimedia m where m.usuario_id = a.id), 5
from public.usuario a, public.usuario l
where a.correo = 'ana@prueba.com' and l.correo = 'luis@prueba.com';

insert into public.snap (remitente_id, destinatario_id, multimedia_id, segundos)
select l.id, a.id, (select min(m.id) from public.multimedia m where m.usuario_id = l.id), 8
from public.usuario a, public.usuario l
where a.correo = 'ana@prueba.com' and l.correo = 'luis@prueba.com';
