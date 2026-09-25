import {
  initialCode,
  newDocument,
  type DocumentRepository,
  type Entry,
  type PythonDocument,
} from "./model";
type Snapshot = { entries: Entry[]; loaded: boolean; notice: string };
/** One serial save queue per document. CAS revisions also protect against other tabs/devices. */
export class DocumentStore {
  private entries = new Map<string, Entry>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private locks = new Map<string, Promise<void>>();
  private listeners = new Set<() => void>();
  private snapshot: Snapshot = { entries: [], loaded: false, notice: "" };
  private disposed = false;
  readonly cacheKey: string;
  constructor(
    private user: string,
    private repo: DocumentRepository,
    private storage: Storage,
    private online = () => navigator.onLine,
  ) {
    this.cacheKey = `rayzk-python.documents.${user}`;
  }
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  getSnapshot = () => this.snapshot;
  private publish(notice = this.snapshot.notice) {
    try {
      this.storage.setItem(
        this.cacheKey,
        JSON.stringify([...this.entries.values()]),
      );
    } catch {
      notice =
        "Stockage local indisponible ou plein : télécharge ton code avant de fermer.";
    }
    this.snapshot = {
      ...this.snapshot,
      notice,
      entries: [...this.entries.values()],
    };
    this.listeners.forEach((fn) => fn());
  }
  async load() {
    try {
      const cached: unknown = JSON.parse(
        this.storage.getItem(this.cacheKey) || "[]",
      );
      if (Array.isArray(cached))
        for (const value of cached) {
          const entry = value as Entry;
          if (
            entry.doc?.user_id === this.user &&
            typeof entry.doc.content === "string" &&
            typeof entry.doc.id === "string" &&
            Number.isInteger(entry.doc.revision)
          ) {
            this.entries.set(entry.doc.id, {
              ...entry,
              status: entry.pending ? "local" : "saved",
            });
          }
        }
    } catch {
      this.snapshot.notice =
        "La copie locale est illisible. Récupération depuis Supabase…";
    }
    await this.refresh();
    if (this.disposed) return;
    if (![...this.entries.values()].some((e) => e.doc.kind === "draft")) {
      const doc = newDocument(this.user, "draft", initialCode);
      this.entries.set(doc.id, { doc, pending: true, status: "local" });
    }
    this.snapshot.loaded = true;
    this.publish();
    this.retry();
  }
  async refresh() {
    try {
      const remote = await this.repo.list();
      if (this.disposed) return;
      for (const doc of remote) {
        const local = this.entries.get(doc.id);
        // A draft first created offline on another device has a different UUID.
        const otherDraft =
          doc.kind === "draft"
            ? [...this.entries.values()].find(
                (e) => e.doc.kind === "draft" && e.doc.id !== doc.id,
              )
            : undefined;
        if (otherDraft) {
          this.entries.delete(otherDraft.doc.id);
          const recovered = { ...otherDraft.doc, id: doc.id };
          this.entries.set(doc.id, {
            doc: recovered,
            pending: true,
            status: "conflict",
            remote: doc,
          });
        } else if (!local || (!local.pending && !this.locks.has(doc.id))) {
          this.entries.set(doc.id, { doc, pending: false, status: "saved" });
        } else if (
          local.pending &&
          !this.locks.has(doc.id) &&
          local.doc.revision !== doc.revision
        ) {
          if (local.doc.content === doc.content && local.doc.name === doc.name)
            this.entries.set(doc.id, { doc, pending: false, status: "saved" });
          else
            this.entries.set(doc.id, {
              ...local,
              status: "conflict",
              remote: doc,
            });
        }
      }
      for (const [id, entry] of this.entries) {
        if (
          entry.doc.revision > 0 &&
          !remote.some((d) => d.id === id) &&
          !this.locks.has(id)
        ) {
          if (entry.pending)
            this.entries.set(id, {
              ...entry,
              status: "conflict",
              remote: null,
            });
          else this.entries.delete(id);
        }
      }
      this.publish("");
    } catch {
      this.publish(
        "Synchronisation indisponible. Copie locale conservée. Vérifie le réseau ou SUPABASE_SETUP.md.",
      );
    }
  }
  update(
    id: string,
    change: Partial<Pick<PythonDocument, "content" | "name">>,
  ) {
    const entry = this.entries.get(id);
    if (!entry) return;
    if (
      Object.entries(change).every(
        ([key, value]) => entry.doc[key as "content" | "name"] === value,
      )
    )
      return;
    this.entries.set(id, {
      ...entry,
      doc: { ...entry.doc, ...change, updated_at: new Date().toISOString() },
      pending: true,
      status:
        entry.status === "conflict"
          ? "conflict"
          : this.online()
            ? "saving"
            : "local",
    });
    this.publish();
    clearTimeout(this.timers.get(id));
    this.timers.set(
      id,
      setTimeout(() => {
        void this.flush(id);
      }, 650),
    );
  }
  create(name: string, content: string) {
    const doc = newDocument(
      this.user,
      "saved",
      content,
      name.trim().slice(0, 100),
    );
    this.entries.set(doc.id, { doc, pending: true, status: "saving" });
    this.publish();
    void this.flush(doc.id);
    return doc.id;
  }
  flush(id: string): Promise<void> {
    clearTimeout(this.timers.get(id));
    const previous = this.locks.get(id);
    if (previous) return previous;
    const task = this.saveLoop(id).finally(() => {
      this.locks.delete(id);
    });
    this.locks.set(id, task);
    return task;
  }
  private async saveLoop(id: string) {
    while (!this.disposed) {
      const entry = this.entries.get(id);
      if (!entry?.pending || entry.status === "conflict") return;
      if (!this.online()) {
        this.entries.set(id, { ...entry, status: "local" });
        this.publish();
        return;
      }
      const sent = entry.doc;
      this.entries.set(id, { ...entry, status: "saving" });
      this.publish();
      try {
        const saved = await this.repo.save(sent);
        const current = this.entries.get(id);
        if (!current || this.disposed) return;
        if (!saved) {
          let remote = await this.repo.get(id);
          if (!remote && sent.kind === "draft")
            remote =
              (await this.repo.list()).find((d) => d.kind === "draft") ?? null;
          const latest = this.entries.get(id);
          if (!latest || this.disposed) return;
          // A successful write can lose its HTTP response. Acknowledge it without
          // creating a false conflict, while retaining edits typed during get().
          if (
            remote?.id === id &&
            remote.content === sent.content &&
            remote.name === sent.name
          ) {
            const changed =
              latest.doc.content !== sent.content ||
              latest.doc.name !== sent.name;
            this.entries.set(id, {
              doc: changed
                ? { ...latest.doc, revision: remote.revision }
                : remote,
              pending: changed,
              status: changed ? "saving" : "saved",
            });
            this.publish();
            continue;
          }
          this.entries.set(id, { ...latest, status: "conflict", remote });
          this.publish();
          return;
        }
        const changed =
          current.doc.content !== sent.content ||
          current.doc.name !== sent.name;
        this.entries.set(id, {
          doc: changed ? { ...current.doc, revision: saved.revision } : saved,
          pending: changed,
          status: changed ? "saving" : "saved",
        });
        this.publish();
      } catch {
        const current = this.entries.get(id);
        if (current)
          this.entries.set(id, {
            ...current,
            status: this.online() ? "error" : "local",
          });
        this.publish();
        return;
      }
    }
  }
  retry = () => {
    for (const id of this.entries.keys()) void this.flush(id);
  };
  resolve(id: string, choice: "local" | "remote") {
    const entry = this.entries.get(id);
    if (!entry || entry.status !== "conflict") return;
    const remote = entry.remote;
    if (choice === "remote") {
      // Preserve the displaced local work as a separate library document.
      this.create(`${entry.doc.name} — copie locale`, entry.doc.content);
      this.entries.delete(id);
      if (remote)
        this.entries.set(remote.id, {
          doc: remote,
          pending: false,
          status: "saved",
        });
    } else {
      this.entries.delete(id);
      const doc = remote
        ? { ...entry.doc, id: remote.id, revision: remote.revision }
        : { ...entry.doc, id: crypto.randomUUID(), revision: 0 };
      this.entries.set(doc.id, { doc, pending: true, status: "saving" });
    }
    this.publish();
    this.retry();
  }
  async remove(id: string) {
    await this.flush(id);
    const entry = this.entries.get(id);
    if (!entry || entry.doc.kind === "draft") return;
    if (entry.pending)
      throw new Error("Synchronise ou résous le conflit avant de supprimer.");
    if (!(await this.repo.remove(entry.doc)))
      throw new Error(
        "Le document a changé sur un autre appareil. Actualise la bibliothèque.",
      );
    const latest = this.entries.get(id);
    if (latest && latest.doc !== entry.doc)
      this.entries.set(id, {
        ...latest,
        pending: true,
        status: "conflict",
        remote: null,
      });
    else this.entries.delete(id);
    this.publish();
  }
  async flushAll() {
    await Promise.all([...this.entries.keys()].map((id) => this.flush(id)));
  }
  hasPending() {
    return [...this.entries.values()].some((e) => e.pending);
  }
  clearLocal() {
    this.storage.removeItem(this.cacheKey);
  }
  dispose() {
    this.disposed = true;
    this.timers.forEach(clearTimeout);
    this.listeners.clear();
  }
}
