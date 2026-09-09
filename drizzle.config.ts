import { defineConfig } from "drizzle-kit";
import { ENV_DB } from "./src/config/db";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/database/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    host: ENV_DB.HOST,
    port: Number(ENV_DB.PORT),
    user: ENV_DB.USER,
    password: ENV_DB.PWD,
    database: ENV_DB.NAME,
  },
});
