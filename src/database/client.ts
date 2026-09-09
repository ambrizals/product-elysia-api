import { drizzle } from "drizzle-orm/bun-sql";
import { ENV_DB } from "../config/db";
import * as schema from "./schema";

/**
 * Drizzle ORM client bound to the configured PostgreSQL database using
 * Bun's native `bun:sql` driver.
 *
 * Connection is lazy: no socket is opened until the first query runs, so the
 * service boots even when no database server is running.
 */
export const db = drizzle({
  connection: {
    hostname: ENV_DB.HOST,
    port: Number(ENV_DB.PORT),
    username: ENV_DB.USER,
    password: ENV_DB.PWD,
    database: ENV_DB.NAME,
    // Minimal pool for local testing; raise via env when scaling up.
    max: Number(process.env.DATABASE_POOL_SIZE ?? "1"),
  },
  schema,
});

export type DBClient = typeof db;
