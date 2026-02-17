import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchScheduledPosts,
  insertScheduledPost,
  insertScheduledPostWithLogs,
  deleteScheduledPost,
  fetchPublishLogsByPostIds,
} from "@/lib/supabase/posts";
import type { ScheduledPostInsert, ScheduledPostWithLogsInsert } from "@/lib/supabase/posts";

export function useScheduledPosts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["scheduled_posts", user?.id],
    queryFn: () => fetchScheduledPosts(user!.id),
    enabled: !!user?.id,
  });

  const insertMutation = useMutation({
    mutationFn: insertScheduledPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled_posts", user?.id] });
    },
  });

  const insertWithLogsMutation = useMutation({
    mutationFn: insertScheduledPostWithLogs,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled_posts", user?.id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteScheduledPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled_posts", user?.id] });
    },
  });

  return {
    posts: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    addPost: insertMutation.mutateAsync,
    addPostWithLogs: insertWithLogsMutation.mutateAsync,
    isAdding: insertMutation.isPending || insertWithLogsMutation.isPending,
    removePost: deleteMutation.mutateAsync,
    isRemoving: deleteMutation.isPending,
  };
}

export type { ScheduledPostWithLogsInsert };

export function usePostPublishLogs(postIds: string[]) {
  const query = useQuery({
    queryKey: ["post_publish_logs", postIds],
    queryFn: () => fetchPublishLogsByPostIds(postIds),
    enabled: postIds.length > 0,
  });

  return {
    logs: query.data ?? [],
    isLoading: query.isLoading,
  };
}
