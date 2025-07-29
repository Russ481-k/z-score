import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export interface ProcessDistribution {
  cam_number: string;
  mean: number;
  std_dev: number;
}

const fetchProcessDistribution = async (
  metric: string
): Promise<ProcessDistribution[]> => {
  const response = await apiClient.get("/analysis/distribution", {
    params: { metric },
  });
  return response.data;
};

export const useProcessDistribution = (metric: string) => {
  return useQuery({
    queryKey: ["distribution", metric],
    queryFn: () => fetchProcessDistribution(metric),
    staleTime: 30000, // 30초 동안 fresh 상태 유지
    refetchInterval: 10000, // 10초마다 백그라운드에서 refetch
  });
};
