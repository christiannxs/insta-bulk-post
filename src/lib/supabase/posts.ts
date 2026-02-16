import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type ScheduledPost = Tables<"scheduled_posts">;
export type PostPublishLog = Tables<"post_publish_logs">;

export type ScheduledPostInsert = TablesInsert<"scheduled_posts">;

export async function fetchScheduledPosts(userId: string): Promise<ScheduledPost[]> {
  const { data, error } = await supabase
    .from("scheduled_posts")
    .select("*")
    .eq("user_id", userId)
    .order("scheduled_at", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return data ?? [];
}

export async function insertScheduledPost(post: ScheduledPostInsert): Promise<ScheduledPost> {
  const { data, error } = await supabase.from("scheduled_posts").insert(post).select().single();
  if (error) throw error;
  return data;
}

export async function deleteScheduledPost(id: string): Promise<void> {
  const { error } = await supabase.from("scheduled_posts").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchPublishLogsByPostIds(postIds: string[]): Promise<PostPublishLog[]> {
  if (postIds.length === 0) return [];
  const { data, error } = await supabase
    .from("post_publish_logs")
    .select("*")
    .in("post_id", postIds)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
