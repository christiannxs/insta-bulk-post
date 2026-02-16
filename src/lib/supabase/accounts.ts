import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type InstagramAccount = Tables<"instagram_accounts">;

export async function fetchInstagramAccounts(userId: string): Promise<InstagramAccount[]> {
  const { data, error } = await supabase
    .from("instagram_accounts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function deleteInstagramAccount(id: string): Promise<void> {
  const { error } = await supabase.from("instagram_accounts").delete().eq("id", id);
  if (error) throw error;
}
