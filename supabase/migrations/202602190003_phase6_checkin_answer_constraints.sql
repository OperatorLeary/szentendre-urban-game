-- Phase 6 hardening: enforce answer capture on checkins

update public.checkins
set answer_text = coalesce(nullif(trim(answer_text), ''), 'legacy-answer')
where answer_text is null or trim(answer_text) = '';

update public.checkins
set is_answer_correct = coalesce(is_answer_correct, false)
where is_answer_correct is null;

alter table public.checkins
  alter column answer_text set not null,
  alter column is_answer_correct set not null;
