import { supabase } from "../auth/client";
import type { DocumentRepository, PythonDocument } from "./model";
const table = "python_documents";
export function repository(user: string): DocumentRepository {
  return {
    async list() {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("user_id", user)
        .order("updated_at", { ascending: false })
        .abortSignal(AbortSignal.timeout(10000));
      if (error) throw error;
      return data as PythonDocument[];
    },
    async get(id) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("id", id)
        .eq("user_id", user)
        .abortSignal(AbortSignal.timeout(10000))
        .maybeSingle();
      if (error) throw error;
      return data as PythonDocument | null;
    },
    async save(doc) {
      const query =
        doc.revision === 0
          ? supabase
              .from(table)
              .insert({
                id: doc.id,
                user_id: user,
                kind: doc.kind,
                name: doc.name,
                content: doc.content,
              })
          : supabase
              .from(table)
              .update({ name: doc.name, content: doc.content })
              .eq("id", doc.id)
              .eq("user_id", user)
              .eq("revision", doc.revision);
      const { data, error } = await query
        .select()
        .abortSignal(AbortSignal.timeout(10000))
        .maybeSingle();
      if (error?.code === "23505") return null;
      if (error) throw error;
      return data as PythonDocument | null;
    },
    async remove(doc) {
      const { data, error } = await supabase
        .from(table)
        .delete()
        .eq("id", doc.id)
        .eq("user_id", user)
        .eq("revision", doc.revision)
        .select("id")
        .abortSignal(AbortSignal.timeout(10000));
      if (error) throw error;
      return Boolean(data?.length);
    },
  };
}
