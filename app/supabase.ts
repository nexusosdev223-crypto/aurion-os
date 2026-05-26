rest:
version: '3.8'

services:
  db:
    image: supabase/postgres:15.1.0.147
    environment:
      - POSTGRES_PASSWORD=postgres
    ports:
      - "5432:5432"
    volumes:
      - ./pgdata:/var/lib/postgresql/data

  rest:
    image: postgrest/postgrest:v11.2.0
    environment:
      - PGRST_DB_URI=postgresql://postgres:postgres@db:5432/postgres
      - PGRST_DB_SCHEMA=public
      - PGRST_DB_ANON_ROLE=postgres
      - PGRST_CORS_ALLOWED_ORIGINS=http://localhost:3001
    ports:
      - "3000:3000"
    depends_on:
      - db

  aurion-api:
    build: .
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/postgres
    depends_on:
      - db
