import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function getTournamentBySlug(slug: string) {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error("Error loading tournament:", error);
    throw new Error("Не удалось загрузить турнир");
  }

  return data;
}