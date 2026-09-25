import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
it("enforces ownership, anonymous denial, immutable ownership, CAS revision and one draft per user in PostgreSQL", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth, public to authenticated, anon; grant execute on function auth.uid() to authenticated;
      insert into auth.users values ('11111111-1111-4111-a111-111111111111'), ('22222222-2222-4222-a222-222222222222');`);
    await db.exec(
      await readFile(
        new URL(
          "../../supabase/migrations/202609250001_python_documents.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      `set role authenticated; set request.jwt.claim.sub = '11111111-1111-4111-a111-111111111111';`,
    );
    await db.exec(
      `insert into public.python_documents(id, user_id, kind, name, content) values ('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', auth.uid(), 'draft', 'Brouillon', 'print(1)');`,
    );
    await expect(
      db.exec(
        `insert into public.python_documents(user_id, kind, name) values (auth.uid(), 'draft', 'Duplicate');`,
      ),
    ).rejects.toThrow();
    await db.exec(
      `update public.python_documents set content = 'print(2)' where revision = 1;`,
    );
    expect(
      (
        await db.query<{ revision: number }>(
          "select revision from public.python_documents",
        )
      ).rows[0]?.revision,
    ).toBe(2);
    expect(
      (
        await db.query(
          `update public.python_documents set content = 'old' where revision = 1 returning id`,
        )
      ).rows,
    ).toHaveLength(0);
    await expect(
      db.exec(
        `update public.python_documents set user_id = '22222222-2222-4222-a222-222222222222'`,
      ),
    ).rejects.toThrow();
    await expect(
      db.exec(`update public.python_documents set revision = 77`),
    ).rejects.toThrow();
    await db.exec(
      `set request.jwt.claim.sub = '22222222-2222-4222-a222-222222222222';`,
    );
    expect(
      (await db.query("select * from public.python_documents")).rows,
    ).toHaveLength(0);
    expect(
      (
        await db.query(
          `update public.python_documents set content = 'stolen' returning id`,
        )
      ).rows,
    ).toHaveLength(0);
    expect(
      (await db.query("delete from public.python_documents returning id")).rows,
    ).toHaveLength(0);
    await expect(
      db.exec(
        `insert into public.python_documents(user_id, kind, name) values ('11111111-1111-4111-a111-111111111111', 'saved', 'stolen')`,
      ),
    ).rejects.toThrow();
    await db.exec("reset role; set role anon;");
    await expect(
      db.query("select * from public.python_documents"),
    ).rejects.toThrow();
  } finally {
    await db.close();
  }
}, 30000);
