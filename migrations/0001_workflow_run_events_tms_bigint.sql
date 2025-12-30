-- workflows: widen workflow_run_events.t_ms to bigint (Date.now() ms overflows int4)

alter table "workflow_run_events"
  alter column "t_ms" type bigint using "t_ms"::bigint;

