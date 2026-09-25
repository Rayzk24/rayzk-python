import { afterEach, describe, expect, it, vi } from "vitest";
import { DocumentStore } from "./store";
import {
  newDocument,
  type DocumentRepository,
  type PythonDocument,
} from "./model";
import { memoryStorage } from "../../test/memoryStorage";
function setup() {
  const draft = { ...newDocument("u1", "draft", "old"), revision: 1 };
  const remote = new Map<string, PythonDocument>([[draft.id, draft]]);
  const repo: DocumentRepository = {
    list: vi.fn(async () => [...remote.values()]),
    get: vi.fn(async (id) => remote.get(id) ?? null),
    save: vi.fn(async (doc) => {
      const previous = remote.get(doc.id);
      if (previous && previous.revision !== doc.revision) return null;
      const saved = { ...doc, revision: doc.revision + 1 };
      remote.set(doc.id, saved);
      return saved;
    }),
    remove: vi.fn(async (doc) => remote.delete(doc.id)),
  };
  let online = true;
  const storage = memoryStorage();
  const store = new DocumentStore("u1", repo, storage, () => online);
  return {
    store,
    repo,
    draft,
    remote,
    storage,
    setOnline: (value: boolean) => {
      online = value;
    },
  };
}
afterEach(() => vi.useRealTimers());
describe("document autosave", () => {
  it("debounces typing while immediately backing up locally", async () => {
    vi.useFakeTimers();
    const { store, repo, draft, storage } = setup();
    await store.load();
    store.update(draft.id, { content: "a" });
    await vi.advanceTimersByTimeAsync(400);
    store.update(draft.id, { content: "ab" });
    expect(storage.getItem(store.cacheKey)).toContain("ab");
    expect(repo.save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(650);
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().entries[0]?.status).toBe("saved");
    store.dispose();
  });
  it("serializes writes and saves edits made during an in-flight request with the next revision", async () => {
    const { store, repo, draft } = setup();
    await store.load();
    let finish!: (doc: PythonDocument) => void;
    vi.mocked(repo.save).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    store.update(draft.id, { content: "first" });
    const saving = store.flush(draft.id);
    store.update(draft.id, { content: "latest" });
    expect(store.flush(draft.id)).toBe(saving);
    finish({ ...draft, content: "first", revision: 2 });
    await saving;
    expect(vi.mocked(repo.save).mock.calls[1]?.[0]).toMatchObject({
      content: "latest",
      revision: 2,
    });
    store.dispose();
  });
  it("recovers offline changes across reload and synchronizes after reconnect", async () => {
    const { store, repo, draft, storage, setOnline, remote } = setup();
    await store.load();
    setOnline(false);
    store.update(draft.id, { content: "offline" });
    await store.flush(draft.id);
    expect(store.getSnapshot().entries[0]?.status).toBe("local");
    store.dispose();
    const reopened = new DocumentStore("u1", repo, storage, () => true);
    await reopened.load();
    await reopened.flushAll();
    expect(remote.get(draft.id)?.content).toBe("offline");
    reopened.dispose();
  });
  it("does not overwrite a newer remote revision, and preserves the local conflict copy", async () => {
    const { store, draft, remote } = setup();
    await store.load();
    store.update(draft.id, { content: "local" });
    remote.set(draft.id, { ...draft, content: "other device", revision: 2 });
    await store.flush(draft.id);
    expect(store.getSnapshot().entries[0]?.status).toBe("conflict");
    expect(remote.get(draft.id)?.content).toBe("other device");
    store.resolve(draft.id, "remote");
    await store.flushAll();
    expect(
      store
        .getSnapshot()
        .entries.some(
          (e) => e.doc.kind === "saved" && e.doc.content === "local",
        ),
    ).toBe(true);
    store.dispose();
  });
  it("keeps an unsynced code through errors and retries", async () => {
    const { store, repo, draft } = setup();
    await store.load();
    vi.mocked(repo.save).mockRejectedValueOnce(new Error("network"));
    store.update(draft.id, { content: "safe" });
    await store.flush(draft.id);
    expect(store.getSnapshot().entries[0]).toMatchObject({
      pending: true,
      status: "error",
      doc: { content: "safe" },
    });
    await store.flush(draft.id);
    expect(store.getSnapshot().entries[0]?.status).toBe("saved");
    store.dispose();
  });
  it("preserves typing while fetching the remote version after a CAS conflict", async () => {
    const { store, repo, draft, remote } = setup();
    await store.load();
    store.update(draft.id, { content: "first" });
    remote.set(draft.id, { ...draft, content: "remote", revision: 2 });
    let resolve!: (doc: PythonDocument) => void;
    vi.mocked(repo.get).mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const pending = store.flush(draft.id);
    await Promise.resolve();
    store.update(draft.id, { content: "typed while fetching" });
    resolve(remote.get(draft.id)!);
    await pending;
    expect(store.getSnapshot().entries[0]).toMatchObject({
      status: "conflict",
      doc: { content: "typed while fetching" },
    });
    store.dispose();
  });
  it("recognizes a committed save whose response was lost", async () => {
    const { store, repo, draft, remote } = setup();
    await store.load();
    vi.mocked(repo.save).mockImplementationOnce(async (doc) => {
      remote.set(doc.id, { ...doc, revision: 2 });
      throw new Error("response lost");
    });
    store.update(draft.id, { content: "committed" });
    await store.flush(draft.id);
    await store.flush(draft.id);
    expect(store.getSnapshot().entries[0]).toMatchObject({
      status: "saved",
      pending: false,
      doc: { revision: 2 },
    });
    store.dispose();
  });
  it("keeps draft and library independent, supports rename and delete", async () => {
    const { store, draft } = setup();
    await store.load();
    const id = store.create("Boucles", "for i in range(5): print(i)");
    await store.flushAll();
    store.update(id, { name: "Boucles simples" });
    await store.flush(id);
    expect(
      store.getSnapshot().entries.find((e) => e.doc.id === draft.id)?.doc
        .content,
    ).toBe("old");
    await store.remove(id);
    expect(store.getSnapshot().entries).toHaveLength(1);
    store.dispose();
  });
  it("does not reuse another user’s local cache", async () => {
    const { storage, repo } = setup();
    storage.setItem(
      "rayzk-python.documents.u1",
      JSON.stringify([{ doc: newDocument("u2", "draft", "private") }]),
    );
    const store = new DocumentStore("u1", repo, storage, () => false);
    await store.load();
    expect(
      store.getSnapshot().entries.some((e) => e.doc.content === "private"),
    ).toBe(false);
    store.dispose();
  });
});
