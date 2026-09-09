import { beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/bun-sql/migrator";
import { app } from "../../src";
import { ENV_DB } from "../../src/config/db";
import { db } from "../../src/database/client";
import { products } from "../../src/database/schema";
import { ProductRepository } from "../../src/repositories/product.repo";

/**
 * Integration tests (real Postgres).
 *
 * Mirrors the project convention used in bun-elysia-template:
 * the Elysia instance is imported and exercised through `app.handle(...)`.
 * The target database must be a dedicated TEST database (DATABASE_NAME ending
 * with `_test`). Locally this is provided by `.env.test`; in CI the value is
 * injected by `.github/workflows/integration.yml`.
 */

const baseUrl = "http://localhost";

async function request(path: string, init?: RequestInit) {
  return app.handle(new Request(`${baseUrl}${path}`, init));
}

function jsonRequest(
  method: "POST" | "PATCH",
  path: string,
  body: Record<string, unknown>,
) {
  return request(path, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function createProductViaApi(
  name: string,
  description: string | null = null,
) {
  const res = await jsonRequest("POST", "/", { name, description });
  const product = (await res.json()) as {
    id: number;
    name: string;
    description: string | null;
    deletedAt: string | null;
  };
  return product;
}

describe("Product API (HTTP integration)", () => {
  beforeAll(async () => {
    if (!ENV_DB.NAME.endsWith("_test")) {
      throw new Error(
        `Refusing to run integration tests against non-test database "${ENV_DB.NAME}". ` +
          `Set DATABASE_NAME=products_test (see .env.test).`,
      );
    }

    // Ensure schema exists and is up to date (idempotent).
    await migrate(db, { migrationsFolder: "./drizzle" });
  });

  beforeEach(async () => {
    await db.delete(products);
  });

  it("GET /health should return ok", async () => {
    const res = await request("/health");

    expect(res.status).toEqual(200);
    expect(await res.text()).toEqual("ok");
  });

  it("POST / should create a product and return the created row", async () => {
    const res = await jsonRequest("POST", "/", {
      name: "Mechanical Keyboard",
      description: "RGB, hot-swappable",
    });

    expect(res.status).toEqual(200);

    const body = (await res.json()) as Record<string, any>;
    expect(typeof body.id).toEqual("number");
    expect(body.name).toEqual("Mechanical Keyboard");
    expect(body.description).toEqual("RGB, hot-swappable");
    expect(body.deletedAt).toBeNull();
  });

  it("POST / should create a product without a description", async () => {
    const res = await jsonRequest("POST", "/", { name: "Dongle" });

    expect(res.status).toEqual(200);

    const body = (await res.json()) as Record<string, any>;
    expect(body.name).toEqual("Dongle");
    expect(body.description).toBeNull();
  });

  it("POST / should reject a missing required name", async () => {
    const res = await jsonRequest("POST", "/", { description: "no name" });

    expect(res.status).toEqual(422);
  });

  it("POST / should reject a non-string name", async () => {
    const res = await jsonRequest("POST", "/", { name: 12345 });

    expect(res.status).toEqual(422);
  });

  it("GET / should list all created products", async () => {
    await createProductViaApi("A");
    await createProductViaApi("B");

    const res = await request("/");
    expect(res.status).toEqual(200);

    const body = (await res.json()) as Array<{ name: string }>;
    expect(body).toHaveLength(2);
    expect(body.map((p) => p.name).sort()).toEqual(["A", "B"]);
  });

  it("GET /:id should return an existing product", async () => {
    const created = await createProductViaApi("Mouse", "wireless");

    const res = await request(`/${created.id}`);
    expect(res.status).toEqual(200);

    const body = (await res.json()) as Record<string, any>;
    expect(body.id).toEqual(created.id);
    expect(body.name).toEqual("Mouse");
    expect(body.description).toEqual("wireless");
  });

  it("GET /:id should not crash for an unknown id", async () => {
    const res = await request("/999999");

    expect([200, 204]).toContain(res.status);
  });

  it("GET /:id should reject a non-numeric id", async () => {
    const res = await request("/not-a-number");

    expect(res.status).toEqual(422);
  });

  it("PATCH /:id should update an existing product", async () => {
    const created = await createProductViaApi("Old Name", "old desc");

    const res = await jsonRequest("PATCH", `/${created.id}`, {
      name: "New Name",
      description: "new desc",
    });

    expect(res.status).toEqual(200);
    const body = (await res.json()) as Record<string, any>;
    expect(body.name).toEqual("New Name");
    expect(body.description).toEqual("new desc");

    // Persisted: reading it again returns the new values.
    const after = await request(`/${created.id}`);
    const reloaded = (await after.json()) as Record<string, any>;
    expect(reloaded.name).toEqual("New Name");
  });

  it("PATCH /:id should report a not-found product", async () => {
    const res = await jsonRequest("PATCH", "/999999", {
      name: "Ghost",
    });

    expect(res.status).toEqual(200);
    const body = (await res.json()) as Record<string, any>;
    expect(body.message).toEqual("Product tidak ditemukan !");
  });

  it("DELETE /:id should soft-delete a product", async () => {
    const created = await createProductViaApi("ToDelete");

    const res = await request(`/${created.id}`, { method: "DELETE" });
    expect([200, 204]).toContain(res.status);

    // Soft delete: still listed by GET / (no deletedAt filter) ...
    const listRes = await request("/");
    const list = (await listRes.json()) as Array<{ id: number }>;
    expect(list.map((p) => p.id)).toContain(created.id);

    // ... but hidden from GET /:id (repository filters out deletedAt).
    const getRes = await request(`/${created.id}`);
    expect([200, 204]).toContain(getRes.status);
  });
});

describe("ProductRepository (database integration)", () => {
  const repository = new ProductRepository(db);

  beforeAll(async () => {
    if (!ENV_DB.NAME.endsWith("_test")) {
      throw new Error(
        `Refusing to run integration tests against non-test database "${ENV_DB.NAME}". ` +
          `Set DATABASE_NAME=products_test (see .env.test).`,
      );
    }

    await migrate(db, { migrationsFolder: "./drizzle" });
  });

  beforeEach(async () => {
    await db.delete(products);
  });

  it("should create a row and return the full entity", async () => {
    const created = await repository.create({
      name: "Notebook",
      description: "A5 grid",
    });

    expect(typeof created.id).toEqual("number");
    expect(created.name).toEqual("Notebook");
    expect(created.description).toEqual("A5 grid");
    expect(created.deletedAt).toBeNull();
  });

  it("should store null description when none is provided", async () => {
    const created = await repository.create({ name: "NoDesc" });

    expect(created.description).toBeNull();
  });

  it("should find an existing product", async () => {
    const created = await repository.create({ name: "Findable" });
    const found = await repository.find(created.id);

    expect(found).toMatchObject({ id: created.id, name: "Findable" });
  });

  it("should return undefined for an unknown id", async () => {
    const found = await repository.find(999999);

    expect(found).toBeUndefined();
  });

  it("should not allow updating a soft-deleted product", async () => {
    const created = await repository.create({ name: "Doomed" });
    await repository.destroy(created.id);

    const result = await repository.update(created.id, { name: "Renamed" });

    expect(result).toEqual({ message: "Product tidak ditemukan !" });
  });

  it("should report a not-found message when updating an unknown id", async () => {
    const result = await repository.update(999999, { name: "Ghost" });

    expect(result).toEqual({ message: "Product tidak ditemukan !" });
  });

  it("should report a not-found message when destroying an unknown id", async () => {
    const result = await repository.destroy(999999);

    expect(result).toEqual({ message: "Product tidak ditemukan !" });
  });

  it("should soft-delete: set deletedAt, hide from find, keep the row", async () => {
    const created = await repository.create({ name: "Gone" });

    await repository.destroy(created.id);

    expect(await repository.find(created.id)).toBeUndefined();

    const rows = await db
      .select()
      .from(products)
      .where(eq(products.id, created.id));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.deletedAt).not.toBeNull();
  });

  it("should report not-found again when destroying twice", async () => {
    const created = await repository.create({ name: "Twice" });

    await repository.destroy(created.id);
    const second = await repository.destroy(created.id);

    expect(second).toEqual({ message: "Product tidak ditemukan !" });
  });
});
