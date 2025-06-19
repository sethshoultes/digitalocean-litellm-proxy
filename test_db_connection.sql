-- Test database connection
SELECT 'Database connection successful!' as status;
SELECT current_database(), current_user, version();
\l+
\dt