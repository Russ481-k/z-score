"use client";

import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import "ag-grid-community/styles/ag-theme-quartz.css";
import "./Grid.scss"; // 반짝이는 효과를 위한 SCSS 파일 임포트
import {
  ColDef,
  RowClickedEvent,
  RowClassParams,
  GetRowIdParams,
} from "ag-grid-community";
import { useProducts, Product } from "@/hooks/useProducts";
import { useEffect, useState, useMemo, useRef, memo } from "react";
import { useQueryClient } from "@tanstack/react-query";

ModuleRegistry.registerModules([AllCommunityModule]);

interface GridProps {
  onRowSelected: (productId: number) => void;
  filter: "all" | "OK" | "NG";
}

const Grid = memo(function Grid({ onRowSelected, filter }: GridProps) {
  const queryClient = useQueryClient();
  const { data: productsData, isLoading } = useProducts({
    startDate: "",
    endDate: "",
    page: 1,
    size: 1000,
  });
  const [highlightedRowId, setHighlightedRowId] = useState<number | null>(null);
  const prevFirstRowId = useRef<number | null>(null);

  const filteredData = useMemo(() => {
    const allItems = productsData?.items || [];
    if (filter === "all") {
      return allItems.slice(0, 11);
    }

    // 임시로 바코드 기반 필터링 (실제로는 측정 데이터 기반)
    const filtered = allItems.filter((item) => {
      const isOK =
        item.barcode &&
        (item.barcode.endsWith("1C") ||
          item.barcode.endsWith("2C") ||
          item.barcode.endsWith("4C") ||
          item.barcode.endsWith("5C"));
      return filter === "OK" ? isOK : !isOK;
    });

    return filtered.slice(0, 11); // 항상 최신 11개의 데이터만 표시
  }, [productsData, filter]);

  useEffect(() => {
    if (productsData?.items?.length && productsData.items.length > 0) {
      const currentFirstRowId = productsData.items[0].id;
      if (
        prevFirstRowId.current !== null &&
        prevFirstRowId.current !== currentFirstRowId
      ) {
        setHighlightedRowId(currentFirstRowId);
        setTimeout(() => setHighlightedRowId(null), 1000); // 1초 후 하이라이트 제거
      }
      prevFirstRowId.current = currentFirstRowId;
    }
  }, [productsData]);

  const [colDefs] = useState<ColDef[]>([
    { field: "barcode", headerName: "Barcode", filter: true },
    { field: "model_name", headerName: "Model" },
    { field: "line_info", headerName: "Line" },
    {
      field: "timestamp",
      headerName: "Production Time",
      valueFormatter: (params) => {
        return new Date(params.value).toLocaleString();
      },
    },
  ]);

  const handleRowClick = (event: RowClickedEvent<Product>) => {
    if (event.data) {
      onRowSelected(event.data.id);
    }
  };

  const getRowClass = (params: RowClassParams<Product>) => {
    if (params.data && params.data.id === highlightedRowId) {
      return "new-row-highlight";
    }
  };

  const getRowId = useMemo(() => {
    return (params: GetRowIdParams<Product>) => params.data.id.toString();
  }, []);

  return (
    <div className="ag-theme-quartz-dark" style={{ height: "100%" }}>
      <AgGridReact
        rowData={filteredData || []}
        columnDefs={colDefs}
        rowSelection={{ mode: "singleRow" }}
        onRowClicked={handleRowClick}
        getRowClass={getRowClass}
        getRowId={getRowId}
        rowBuffer={100}
      />
    </div>
  );
});

export default Grid;
