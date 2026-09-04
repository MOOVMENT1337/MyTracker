-- Match the demo form: 1 to 10 uppercase Latin letters, including single-letter keys.
-- Existing keys must remain usable: issue creation updates the queue counter.
-- A trigger validates new/changed keys without invalidating those counter updates.
ALTER TABLE queues DROP CONSTRAINT queues_key_check;

CREATE FUNCTION enforce_demo_queue_key() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.key = OLD.key THEN RETURN NEW; END IF;
  END IF;
  IF NEW.key !~ '^[A-Z]{1,10}$' THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'Queue key must contain 1 to 10 uppercase Latin letters',
      CONSTRAINT = 'queues_key_check';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER queues_key_check BEFORE INSERT OR UPDATE OF key ON queues
FOR EACH ROW EXECUTE FUNCTION enforce_demo_queue_key();
