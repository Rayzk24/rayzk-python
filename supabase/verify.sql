-- Read-only checks after applying the migration. All four policies should appear.
select tablename, rowsecurity from pg_tables where schemaname = 'public' and tablename = 'python_documents';
select policyname, cmd, roles, qual, with_check from pg_policies
where schemaname = 'public' and tablename = 'python_documents';
select grantee, privilege_type from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'python_documents' order by grantee, privilege_type;
select grantee, column_name, privilege_type from information_schema.role_column_grants
where table_schema = 'public' and table_name = 'python_documents' and grantee in ('anon', 'authenticated')
order by grantee, privilege_type, column_name;
select indexname, indexdef from pg_indexes where schemaname = 'public' and tablename = 'python_documents';
