import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchInstagramAccounts, deleteInstagramAccount, refreshInstagramProfile } from "@/lib/supabase/accounts";

export function useInstagramAccounts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["instagram_accounts", user?.id],
    queryFn: () => fetchInstagramAccounts(user!.id),
    enabled: !!user?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteInstagramAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instagram_accounts", user?.id] });
    },
  });

  const refreshProfileMutation = useMutation({
    mutationFn: refreshInstagramProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instagram_accounts", user?.id] });
    },
  });

  return {
    accounts: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    removeAccount: deleteMutation.mutateAsync,
    isRemoving: deleteMutation.isPending,
    refreshProfile: refreshProfileMutation.mutateAsync,
    isRefreshingProfile: refreshProfileMutation.isPending,
  };
}
