// import { drizzle } from "drizzle-orm/postgres-js";
// import postgres from "postgres";

// /**
//  * Database environment configuration.
//  *
//  * Values are read from the environment and fall back to local defaults so the
//  * service can boot without any `.env` file. Override them with `DATABASE_*`
//  * variables (or any standard `PG*` vars) when a real database is available.
//  */
export const ENV_DB = {
  HOST: process.env.DATABASE_HOST ?? process.env.PGHOST ?? "localhost",
  PORT: process.env.DATABASE_PORT ?? process.env.PGPORT ?? "5432",
  USER: process.env.DATABASE_USER ?? process.env.PGUSER ?? "postgres",
  PWD:
    process.env.DATABASE_PASSWORD ??
    process.env.PGPASSWORD ??
    "hy16fxlJj3F1ehx8vWFgQhZ2Z2TNIala55asV6cCSsXF",
  NAME: process.env.DATABASE_NAME ?? process.env.PGDATABASE ?? "products",
};
