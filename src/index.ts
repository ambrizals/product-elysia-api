import { Elysia, t } from "elysia";
import { db } from "./database/client";
import { ProductRepository } from "./repositories/product.repo";

const app = new Elysia()
  .derive(() => {
    const repository = new ProductRepository(db);

    return {
      repository,
    };
  })
  .get("/health", () => "ok")
  .get("/", async () => {
    const products = await db.query.products.findMany();
    return products;
  })
  .post(
    "/",
    async ({ body, repository }) => {
      const result = await repository.create(body);

      return result;
    },
    {
      body: t.Object({
        name: t.String(),
        description: t.Optional(t.Nullable(t.String())),
      }),
    },
  )
  .get(
    "/:id",
    async ({ params, repository }) => {
      const result = await repository.find(params.id);

      return result;
    },
    {
      params: t.Object({
        id: t.Number(),
      }),
    },
  )
  .patch(
    "/:id",
    async ({ body, params, repository }) => {
      const result = await repository.update(params.id, body);

      return result;
    },
    {
      params: t.Object({
        id: t.Number(),
      }),
      body: t.Object({
        name: t.Optional(t.String()),
        description: t.Optional(t.Nullable(t.String())),
      }),
    },
  )
  .delete(
    "/:id",
    async ({ params, repository }) => {
      await repository.destroy(params.id);
    },
    {
      params: t.Object({
        id: t.Number(),
      }),
    },
  )
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
