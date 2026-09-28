import { useQuery } from "@tanstack/react-query";

import { checkHealth } from "@/services/api";

/** Polls GET /health; when unreachable the app stays fully usable in Demo Mode. */
export function useBackendStatus() {
  const { data, isLoading } = useQuery({
    queryKey: ["backend-health"],
    queryFn: checkHealth,
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: false,
  });

  return { online: data === true, loading: isLoading };
}
