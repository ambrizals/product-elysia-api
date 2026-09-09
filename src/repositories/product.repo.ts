import { eq, isNull } from "drizzle-orm";
import { DBClient } from "../database/client";
import { products } from "../database/schema";

export class ProductRepository {
  constructor(private readonly db: DBClient) {}

  public async create(payload: { name: string; description?: string | null }) {
    return this.db
      .insert(products)
      .values({
        name: payload.name,
        description: payload.description,
      })
      .returning()
      .then((res) => res[0]);
  }

  public async find(id: number) {
    return this.db.query.products.findFirst({
      where: (fields, { eq, and }) =>
        and(eq(fields.id, id), isNull(fields.deletedAt)),
    });
  }

  public async update(
    id: number,
    payload: {
      name?: string;
      description?: string | null;
    },
  ) {
    let current = await this.find(id);

    if (!current) {
      return {
        message: "Product tidak ditemukan !",
      };
    }

    current = await this.db
      .update(products)
      .set({
        name: payload.name,
        description: payload.description,
      })
      .where(eq(products.id, current.id))
      .returning()
      .then((res) => res[0]);

    return current;
  }

  public async destroy(id: number) {
    let current = await this.find(id);

    if (!current) {
      return {
        message: "Product tidak ditemukan !",
      };
    }

    await this.db
      .update(products)
      .set({
        deletedAt: new Date(),
      })
      .where(eq(products.id, id));
  }
}
