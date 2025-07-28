import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export interface Product {
  id: number;
  barcode: string;
  model_name: string;
  line_info: string;
  final_position: number;
  final_press_force: number;
  result: string;
  created_at: string;
}

export interface ProductsResponse {
  total: number;
  items: Product[];
}

const initialProducts: ProductsResponse = {
  total: 5,
  items: [
    {
      id: 1,
      barcode: "2401020001C",
      model_name: "KAPPA-1.0",
      line_info: "CM1P9",
      final_position: 18.67,
      final_press_force: 30.38,
      result: "OK",
      created_at: new Date(Date.now() - 50000).toISOString(),
    },
    {
      id: 2,
      barcode: "2401020002C",
      model_name: "KAPPA-1.0",
      line_info: "CM1P9",
      final_position: 18.68,
      final_press_force: 30.45,
      result: "OK",
      created_at: new Date(Date.now() - 40000).toISOString(),
    },
    {
      id: 3,
      barcode: "2401020003C",
      model_name: "KAPPA-1.0",
      line_info: "CM1P9",
      final_position: 19.1,
      final_press_force: 31.1,
      result: "NG",
      created_at: new Date(Date.now() - 30000).toISOString(),
    },
    {
      id: 4,
      barcode: "2401020004C",
      model_name: "KAPPA-1.0",
      line_info: "CM1P9",
      final_position: 18.65,
      final_press_force: 30.31,
      result: "OK",
      created_at: new Date(Date.now() - 20000).toISOString(),
    },
    {
      id: 5,
      barcode: "2401020005C",
      model_name: "KAPPA-1.0",
      line_info: "CM1P9",
      final_position: 18.7,
      final_press_force: 30.5,
      result: "OK",
      created_at: new Date(Date.now() - 10000).toISOString(),
    },
  ],
};

const fetchProducts = async (
  startDate: string,
  endDate: string,
  page: number,
  size: number
): Promise<ProductsResponse> => {
  const { data } = await axios.get("/api/data/products", {
    params: { start_date: startDate, end_date: endDate, page, size },
  });
  return data.data;
};

export const useProducts = (
  startDate: string,
  endDate: string,
  page: number,
  size: number
) => {
  return useQuery<ProductsResponse>({
    queryKey: ["products", { startDate, endDate, page, size }],
    queryFn: () => fetchProducts(startDate, endDate, page, size),
    initialData: initialProducts,
  });
};
