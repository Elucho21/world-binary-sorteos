import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// Shared by page.tsx (generateMetadata + Page) and opengraph-image.tsx so the
// same slug only triggers one query per request where React's cache() applies.
export const getPublicSorteo = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data } = await supabase.from("public_sorteos").select("*").eq("slug", slug).single();
  return data;
});
