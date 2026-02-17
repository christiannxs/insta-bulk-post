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

export type ScheduledPostWithLogsInsert = {
  video_url: string;
  video_name?: string | null;
  caption?: string | null;
  scheduled_at: string;
  user_id: string;
  account_ids: string[];
};

/** Insere um post agendado e um log de publicação por conta selecionada. */
export async function insertScheduledPostWithLogs(
  post: ScheduledPostWithLogsInsert
): Promise<ScheduledPost> {
  const { account_ids, ...postFields } = post;
  const { data: newPost, error: postError } = await supabase
    .from("scheduled_posts")
    .insert({
      ...postFields,
      status: "pending",
    })
    .select()
    .single();
  if (postError) throw postError;
  if (account_ids.length > 0) {
    const { error: logsError } = await supabase.from("post_publish_logs").insert(
      account_ids.map((account_id) => ({
        post_id: newPost.id,
        account_id,
        status: "pending",
      }))
    );
    if (logsError) throw logsError;
  }
  return newPost;
}

export async function updateScheduledPostStatus(
  postId: string,
  status: ScheduledPost["status"]
): Promise<void> {
  const { error } = await supabase.from("scheduled_posts").update({ status }).eq("id", postId);
  if (error) throw error;
}

export async function updatePublishLog(
  logId: string,
  updates: Partial<Pick<PostPublishLog, "status" | "ig_media_id" | "error_message" | "published_at">>
): Promise<void> {
  const { error } = await supabase.from("post_publish_logs").update(updates).eq("id", logId);
  if (error) throw error;
}

/** Cria logs pendentes para um post (útil quando o post foi criado antes do fluxo com contas). */
export async function insertPublishLogsForPost(postId: string, accountIds: string[]): Promise<void> {
  if (accountIds.length === 0) return;
  const { error } = await supabase.from("post_publish_logs").insert(
    accountIds.map((account_id) => ({
      post_id: postId,
      account_id,
      status: "pending",
    }))
  );
  if (error) throw error;
}
