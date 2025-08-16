-- Check current constraint values for data_sources.type
SELECT conname, consrc
FROM pg_constraint
WHERE conrelid = 'data_sources'::regclass
AND contype = 'c';

-- Also check the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'data_sources'
AND column_name = 'type';