import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export interface DistributionDataPoint {
  cam_number: string;
  mean: number;
  std_dev: number;
}

const fetchProcessDistribution = async (
  metric: "angle" | "torque"
): Promise<DistributionDataPoint[]> => {
  const { data } = await axios.get("/api/analysis/distribution", {
    params: { metric },
  });
  return data.data;
};

export const useProcessDistribution = (metric: "angle" | "torque") => {
  return useQuery<DistributionDataPoint[]>({
    queryKey: ["distribution", metric],
    queryFn: () => fetchProcessDistribution(metric),
    // 실시간 업데이트를 위해 initialData를 사용하지 않고, staleTime을 짧게 설정할 수 있습니다.
    // 하지만 지금은 시뮬레이션에서 직접 캐시를 업데이트하므로 추가 설정은 불필요합니다.
  });
};
