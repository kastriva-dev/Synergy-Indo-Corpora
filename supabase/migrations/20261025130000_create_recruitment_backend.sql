-- Migration: create isolated Sinergi Global recruitment schema and private CV bucket.
-- Apply only to the dedicated ACTIVE Supabase project after owner/security review.
-- Apply only to a dedicated ACTIVE Supabase project after owner/security review.
-- Bootstrap document only; it has not been executed against any database.

create table if not exists public.job_postings (
  id uuid primary key,
  slug text not null unique,
  title text not null check (char_length(title) between 2 and 160),
  country text not null check (char_length(country) between 2 and 100),
  category text not null check (char_length(category) between 2 and 80),
  summary text not null check (char_length(summary) between 1 and 400),
  description text not null default '',
  requirements text not null default '',
  image_url text,
  application_deadline date,
  is_published boolean not null default false,
  created_by text not null,
  updated_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.candidate_upload_intents (
  id uuid primary key,
  storage_path text not null unique,
  original_file_name text not null,
  declared_size integer not null check (declared_size between 1 and 5242880),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.candidate_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  target_country text,
  job_id uuid references public.job_postings(id) on delete set null,
  job_title_snapshot text,
  cv_storage_path text unique,
  cv_original_name text,
  status text not null default 'received' check (status in ('received','reviewing','shortlisted','rejected','hired','deleted')),
  privacy_notice_version text not null,
  consent_at timestamptz not null,
  retention_due_at date,
  reviewed_by text,
  reviewed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.candidate_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null check (actor_type in ('candidate','admin','system')),
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists job_postings_public_idx on public.job_postings (is_published, application_deadline, created_at desc);
create index if not exists candidates_created_idx on public.candidate_applications (created_at desc);
create index if not exists candidates_status_idx on public.candidate_applications (status, created_at desc);
create index if not exists candidates_retention_idx on public.candidate_applications (retention_due_at) where status <> 'deleted';
create index if not exists upload_intent_expiry_idx on public.candidate_upload_intents (expires_at) where consumed_at is null;
create index if not exists candidate_audit_entity_idx on public.candidate_audit_logs (entity_type, entity_id, created_at desc);

alter table public.job_postings enable row level security;
alter table public.candidate_upload_intents enable row level security;
alter table public.candidate_applications enable row level security;
alter table public.candidate_audit_logs enable row level security;
revoke all on public.job_postings from public, anon, authenticated;
revoke all on public.candidate_upload_intents from public, anon, authenticated;
revoke all on public.candidate_applications from public, anon, authenticated;
revoke all on public.candidate_audit_logs from public, anon, authenticated;
grant all on public.job_postings to service_role;
grant all on public.candidate_upload_intents to service_role;
grant all on public.candidate_applications to service_role;
grant all on public.candidate_audit_logs to service_role;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('candidate-cvs','candidate-cvs',false,5242880,array['application/pdf'])
on conflict (id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['application/pdf'];

create or replace function public.touch_recruitment_updated_at()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin new.updated_at := now(); return new; end;
$$;
drop trigger if exists job_postings_touch_updated_at on public.job_postings;
create trigger job_postings_touch_updated_at before update on public.job_postings for each row execute function public.touch_recruitment_updated_at();
drop trigger if exists candidate_applications_touch_updated_at on public.candidate_applications;
create trigger candidate_applications_touch_updated_at before update on public.candidate_applications for each row execute function public.touch_recruitment_updated_at();
revoke all on function public.touch_recruitment_updated_at() from public,anon,authenticated;
grant execute on function public.touch_recruitment_updated_at() to service_role;

create or replace function public.submit_candidate_application(
  p_upload_id uuid,p_full_name text,p_phone text,p_email text,p_target_country text,
  p_job_id uuid,p_privacy_notice_version text,p_retention_days integer
) returns jsonb language plpgsql security invoker set search_path = ''
as $$
declare v_intent public.candidate_upload_intents%rowtype; v_job public.job_postings%rowtype; v_id uuid := gen_random_uuid(); v_now timestamptz := now();
begin
  if p_retention_days < 1 or p_retention_days > 3650 then raise exception 'invalid_retention_policy'; end if;
  if p_privacy_notice_version is null or length(p_privacy_notice_version) < 1 then raise exception 'privacy_notice_version_required'; end if;
  select * into v_intent from public.candidate_upload_intents where id=p_upload_id and consumed_at is null and expires_at>v_now for update;
  if not found then raise exception 'upload_intent_expired_or_used'; end if;
  select * into v_job from public.job_postings where id=p_job_id and is_published=true and (application_deadline is null or application_deadline>=current_date);
  if not found or v_job.country<>p_target_country then raise exception 'job_not_available'; end if;
  update public.candidate_upload_intents set consumed_at=v_now where id=p_upload_id;
  insert into public.candidate_applications
    (id,full_name,phone,email,target_country,job_id,job_title_snapshot,cv_storage_path,cv_original_name,status,privacy_notice_version,consent_at,retention_due_at,created_at,updated_at)
  values
    (v_id,p_full_name,p_phone,p_email,p_target_country,v_job.id,v_job.title,v_intent.storage_path,v_intent.original_file_name,'received',p_privacy_notice_version,v_now,current_date+p_retention_days,v_now,v_now);
  insert into public.candidate_audit_logs (actor_type,actor_email,action,entity_type,entity_id,details,created_at)
  values ('candidate',null,'application_submitted','candidate_application',v_id::text,jsonb_build_object('job_id',v_job.id,'privacy_notice_version',p_privacy_notice_version),v_now);
  return jsonb_build_object('id',v_id,'status','received','created_at',v_now);
end;
$$;

create or replace function public.update_candidate_application_status(p_application_id uuid,p_status text,p_actor_email text)
returns jsonb language plpgsql security invoker set search_path = ''
as $$
declare v_old text; v_now timestamptz := now();
begin
  if p_status not in ('received','reviewing','shortlisted','rejected','hired') then raise exception 'invalid_candidate_status'; end if;
  select status into v_old from public.candidate_applications where id=p_application_id and status<>'deleted' for update;
  if not found then raise exception 'candidate_application_not_found'; end if;
  update public.candidate_applications set status=p_status,reviewed_by=p_actor_email,reviewed_at=v_now,updated_at=v_now where id=p_application_id;
  insert into public.candidate_audit_logs (actor_type,actor_email,action,entity_type,entity_id,details,created_at)
  values ('admin',p_actor_email,'status_changed','candidate_application',p_application_id::text,jsonb_build_object('from',v_old,'to',p_status),v_now);
  return jsonb_build_object('id',p_application_id,'status',p_status,'updated_at',v_now);
end;
$$;

create or replace function public.anonymize_candidate_application(p_application_id uuid,p_actor_email text,p_reason text)
returns jsonb language plpgsql security invoker set search_path = ''
as $$
declare v_old text; v_now timestamptz := now();
begin
  select status into v_old from public.candidate_applications where id=p_application_id for update;
  if not found then raise exception 'candidate_application_not_found'; end if;
  if v_old='deleted' then return jsonb_build_object('id',p_application_id,'status','deleted'); end if;
  update public.candidate_applications set full_name='Data dihapus',phone=null,email=null,target_country=null,job_id=null,job_title_snapshot=null,cv_storage_path=null,cv_original_name=null,status='deleted',retention_due_at=null,reviewed_by=p_actor_email,reviewed_at=v_now,deleted_at=v_now,updated_at=v_now where id=p_application_id;
  insert into public.candidate_audit_logs (actor_type,actor_email,action,entity_type,entity_id,details,created_at)
  values (case when p_actor_email='system:retention-job' then 'system' else 'admin' end,p_actor_email,'candidate_anonymized','candidate_application',p_application_id::text,jsonb_build_object('reason',left(coalesce(p_reason,'unspecified'),80),'previous_status',v_old),v_now);
  return jsonb_build_object('id',p_application_id,'status','deleted','deleted_at',v_now);
end;
$$;

revoke all on function public.submit_candidate_application(uuid,text,text,text,text,uuid,text,integer) from public,anon,authenticated;
revoke all on function public.update_candidate_application_status(uuid,text,text) from public,anon,authenticated;
revoke all on function public.anonymize_candidate_application(uuid,text,text) from public,anon,authenticated;
grant execute on function public.submit_candidate_application(uuid,text,text,text,text,uuid,text,integer) to service_role;
grant execute on function public.update_candidate_application_status(uuid,text,text) to service_role;
grant execute on function public.anonymize_candidate_application(uuid,text,text) to service_role;
