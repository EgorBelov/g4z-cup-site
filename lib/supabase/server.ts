// import { createClient } from "@supabase/supabase-js";

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// export function getSupabaseServerClient() {
//   return createClient(supabaseUrl, supabaseAnonKey);
// }

import { createClient } from "@supabase/supabase-js";

export function getSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing");
  }

  if (!supabaseAnonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing");
  }

  try {
    new URL(supabaseUrl);
  } catch {
    throw new Error(`NEXT_PUBLIC_SUPABASE_URL is invalid: "${supabaseUrl}"`);
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}
