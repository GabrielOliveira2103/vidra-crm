import { supabase } from "../lib/supabase";
export const TABLES = [
  "clientes",
  "leads",
  "servicos",
  "orcamentos",
  "visitas",
  "interacoes",
  "arquivos",
  "lead_historico",
];
export async function fetchTable(table) {
  const rows = [];
  const size = 1000;
  for (let offset = 0; ; offset += size) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("id")
      .range(offset, offset + size - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < size) return rows;
  }
}
export async function fetchCRM() {
  return Object.fromEntries(
    await Promise.all(
      TABLES.map(async (table) => [table, await fetchTable(table)]),
    ),
  );
}
export async function saveRecord(table, values, id) {
  const query = id
    ? supabase.from(table).update(values).eq("id", id)
    : supabase.from(table).insert(values);
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}
export async function uploadFile(leadId, file, tipo, descricao) {
  const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowed.includes(file.type) || file.size > 10485760)
    throw new Error("Selecione JPG, PNG, WebP ou PDF de até 10 MB.");
  const path = `${leadId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error } = await supabase.storage
    .from("lead-arquivos")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  try {
    return await saveRecord("arquivos", {
      lead_id: leadId,
      tipo,
      nome: file.name,
      url: path,
      descricao,
    });
  } catch (err) {
    await supabase.storage.from("lead-arquivos").remove([path]);
    throw err;
  }
}
export async function fileUrl(path) {
  const { data, error } = await supabase.storage
    .from("lead-arquivos")
    .createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}
export async function removeFile(file) {
  const { error } = await supabase.storage
    .from("lead-arquivos")
    .remove([file.url]);
  if (error) throw error;
  const { error: dbError } = await supabase
    .from("arquivos")
    .delete()
    .eq("id", file.id);
  if (dbError) throw dbError;
}
