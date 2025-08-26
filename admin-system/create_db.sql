-- Create CarCleaning010 Database
CREATE DATABASE carcleaning010_db
WITH 
OWNER = postgres
ENCODING = 'UTF8'
LC_COLLATE = 'Dutch_Netherlands.1252'
LC_CTYPE = 'Dutch_Netherlands.1252'
TABLESPACE = pg_default
CONNECTION LIMIT = -1;

GRANT ALL ON DATABASE carcleaning010_db TO postgres;