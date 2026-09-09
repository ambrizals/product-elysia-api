import * as p from "drizzle-orm/pg-core";

export const products = p.pgTable("products", {
  id: p.serial(),
  name: p.varchar().notNull(),
  description: p.varchar(),
  deletedAt: p.timestamp(),
});
