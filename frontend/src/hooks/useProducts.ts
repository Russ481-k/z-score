import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export interface Product {
  id: number;
  barcode: string;
  model_name: string;
  line_info: string;
  timestamp: string;
  create_time: string;
}

export interface ProductsResponse {
  total: number;
  items: Product[];
}

interface ProductsQueryParams {
  startDate: string;
  endDate: string;
  page: number;
  size: number;
}

const fetchProducts = async (
  params: ProductsQueryParams
): Promise<ProductsResponse> => {
  const response = await apiClient.get("/data/products", {
    params: {
      start_date: params.startDate,
      end_date: params.endDate,
      page: params.page,
      size: params.size,
    },
  });
  return response.data;
};

export const useProducts = (params: ProductsQueryParams) => {
  return useQuery({
    queryKey: ["products", params],
    queryFn: () => fetchProducts(params),
    staleTime: 30000, // 30초 동안 fresh 상태 유지
    refetchInterval: 5000, // 5초마다 백그라운드에서 refetch
  });
};

// 더미 데이터
export const initialProducts: Product[] = [
  {
    id: 1,
    barcode: "24010200001C",
    model_name: "KAPPA-1.0",
    line_info: "CM1P9",
    timestamp: "2024-01-02T09:30:15.123Z",
    create_time: "2024-01-02T09:30:15.123Z",
  },
  {
    id: 2,
    barcode: "24010200002C",
    model_name: "KAPPA-1.0",
    line_info: "CM1P9",
    timestamp: "2024-01-02T09:31:22.456Z",
    create_time: "2024-01-02T09:31:22.456Z",
  },
  {
    id: 3,
    barcode: "24010200003C",
    model_name: "KAPPA-1.0",
    line_info: "CM1P9",
    timestamp: "2024-01-02T09:32:18.789Z",
    create_time: "2024-01-02T09:32:18.789Z",
  },
  {
    id: 4,
    barcode: "24010200004N",
    model_name: "KAPPA-1.0",
    line_info: "CM1P9",
    timestamp: "2024-01-02T09:33:45.012Z",
    create_time: "2024-01-02T09:33:45.012Z",
  },
  {
    id: 5,
    barcode: "24010200005C",
    model_name: "KAPPA-1.0",
    line_info: "CM1P9",
    timestamp: "2024-01-02T09:34:52.345Z",
    create_time: "2024-01-02T09:34:52.345Z",
  },
];
