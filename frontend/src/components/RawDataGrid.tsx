"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { ColDef, GridReadyEvent, GridApi } from "ag-grid-community";
import { apiClient } from "@/lib/api";

ModuleRegistry.registerModules([AllCommunityModule]);

interface InfiniteScrollData {
  id: number;
  [key: string]: any;
}

interface InfiniteScrollResponse {
  items: InfiniteScrollData[];
  next_cursor?: number;
  prev_cursor?: number;
  has_more: boolean;
  total_count?: number;
  column_mapping: Record<string, string>;
}

interface Model {
  model_name: string;
  display_name: string;
}

interface DynamicQueryResponse {
  items: InfiniteScrollData[];
  column_definitions: Array<{
    field: string;
    headerName: string;
    raw_column: string;
  }>;
  total_count: number;
  model_info?: {
    model_name: string;
    query_applied: boolean;
  };
}

const RawDataGrid: React.FC = () => {
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>(
    {}
  );
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [rowData, setRowData] = useState<InfiniteScrollData[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const gridRef = useRef<AgGridReact>(null);
  const gridApiRef = useRef<GridApi | null>(null);
  const isLoadingRef = useRef(false);

  // 쿼리 관련 상태
  const [queryMode, setQueryMode] = useState<"default" | "custom" | "model">(
    "default"
  );
  const [customQuery, setCustomQuery] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [queryResults, setQueryResults] = useState<DynamicQueryResponse | null>(
    null
  );
  const [isQueryMode, setIsQueryMode] = useState(false);

  const PAGE_SIZE = 50;

  // 동적 컬럼 정의 생성
  const columnDefs: ColDef[] = useMemo(() => {
    // 쿼리 결과가 있는 경우 해당 컬럼 정의 사용
    if (queryResults?.column_definitions) {
      return queryResults.column_definitions.map((col) => ({
        headerName: col.headerName,
        field: col.field,
        sortable: true,
        filter: true,
        resizable: true,
        minWidth: 120,
        flex: 1,
      }));
    }

    // 기본 모드의 경우 기존 컬럼 매핑 사용
    if (Object.keys(columnMapping).length === 0) return [];

    return Object.entries(columnMapping).map(
      ([rawColumnName, mappedColumnName]) => ({
        headerName: mappedColumnName,
        field: mappedColumnName,
        sortable: true,
        filter: true,
        resizable: true,
        minWidth: 120,
        flex: 1,
      })
    );
  }, [columnMapping, queryResults]);

  // 데이터 로드 함수
  const loadMoreData = useCallback(
    async (page: number) => {
      if (isLoadingRef.current || !hasMore) return;

      isLoadingRef.current = true;
      setLoading(true);

      try {
        const startRow = page * PAGE_SIZE;

        const response = await apiClient.get("/raw-data/infinite-scroll", {
          params: {
            start_row: startRow,
            limit: PAGE_SIZE,
            direction: "forward",
          },
        });

        const data: InfiniteScrollResponse = response.data;

        // 첫 요청시 컬럼 매핑과 총 개수 설정
        if (page === 0) {
          setColumnMapping(data.column_mapping);
          setRowData(data.items);
          if (data.total_count !== undefined) {
            setTotalCount(data.total_count);
          }
        } else {
          // 추가 데이터 append
          setRowData((prev) => [...prev, ...data.items]);
        }

        setHasMore(data.has_more);
        setCurrentPage(page);

        console.log("Data loaded:", {
          page,
          itemsCount: data.items.length,
          totalItems:
            page === 0 ? data.items.length : rowData.length + data.items.length,
          hasMore: data.has_more,
        });
      } catch (error: any) {
        console.error("Data load failed:", error);
      } finally {
        setLoading(false);
        isLoadingRef.current = false;
      }
    },
    [hasMore, rowData.length]
  );

  // 초기 데이터 로드
  // 모델 목록 로드
  const loadModels = useCallback(async () => {
    try {
      const response = await apiClient.get("/raw-data/models");
      setAvailableModels(response.data.models || []);
    } catch (error) {
      console.error("Failed to load models:", error);
    }
  }, []);

  // 커스텀 쿼리 실행
  const executeCustomQuery = useCallback(async () => {
    if (!customQuery.trim()) return;

    setLoading(true);
    try {
      const response = await apiClient.post("/raw-data/query", {
        sql_query: customQuery,
        model_name: selectedModel || null,
        limit: 1000,
      });

      const data: DynamicQueryResponse = response.data;
      setQueryResults(data);
      setRowData(data.items);
      setTotalCount(data.total_count);
      setIsQueryMode(true);
      setHasMore(false); // 쿼리 결과는 페이징 안함

      console.log("Query executed successfully:", data);
    } catch (error: any) {
      console.error("Query execution failed:", error);
      alert(`쿼리 실행 실패: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  }, [customQuery, selectedModel]);

  // 모델별 데이터 로드
  const loadModelData = useCallback(async () => {
    if (!selectedModel) return;

    setLoading(true);
    try {
      const response = await apiClient.get(
        `/raw-data/models/${selectedModel}/data`,
        {
          params: {
            skip: 0,
            limit: 1000,
          },
        }
      );

      const data = response.data;
      setRowData(data.items);
      setColumnMapping(data.column_mapping);
      setTotalCount(data.total);
      setIsQueryMode(true);
      setHasMore(false);

      console.log("Model data loaded:", data);
    } catch (error: any) {
      console.error("Failed to load model data:", error);
      alert(
        `모델 데이터 로드 실패: ${
          error.response?.data?.detail || error.message
        }`
      );
    } finally {
      setLoading(false);
    }
  }, [selectedModel]);

  // 기본 모드로 돌아가기
  const resetToDefaultMode = useCallback(() => {
    setQueryMode("default");
    setCustomQuery("");
    setSelectedModel("");
    setQueryResults(null);
    setIsQueryMode(false);
    setRowData([]);
    setColumnMapping({});
    setCurrentPage(0);
    setHasMore(true);
    loadMoreData(0);
  }, []);

  useEffect(() => {
    loadMoreData(0);
    loadModels();
  }, []);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    console.log("AG Grid Ready");
    gridApiRef.current = params.api;
  }, []);

  // 스크롤 이벤트 핸들러
  const onBodyScroll = useCallback(
    (event: any) => {
      if (!gridApiRef.current || !hasMore || isLoadingRef.current) return;

      const gridApi = gridApiRef.current;
      const lastDisplayedRowIndex = gridApi.getLastDisplayedRowIndex();
      const totalRows = gridApi.getDisplayedRowCount();

      // Load next page when 10 rows remaining
      if (lastDisplayedRowIndex >= totalRows - 10) {
        loadMoreData(currentPage + 1);
      }
    },
    [hasMore, currentPage, loadMoreData]
  );

  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
      minWidth: 100,
    }),
    []
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "80vh",
        overflow: "hidden",
      }}
    >
      <style jsx>{`
        .compact-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.03);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          flex-shrink: 0;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .title {
          font-size: 18px;
          font-weight: 600;
          color: #ffffff;
          margin: 0;
        }

        .stats {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .stat {
          font-size: 12px;
          color: #aaa;
          background: rgba(255, 255, 255, 0.05);
          padding: 4px 8px;
          border-radius: 4px;
        }

        .grid-container {
          flex: 1;
          padding: 16px;
          overflow: hidden;
        }

        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          z-index: 1000;
        }

        .header-right {
          display: flex;
          align-items: center;
        }

        .reset-btn {
          background: rgba(255, 107, 107, 0.8);
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          transition: background 0.2s;
        }

        .reset-btn:hover {
          background: rgba(255, 107, 107, 1);
        }

        .query-panel {
          background: rgba(255, 255, 255, 0.02);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding: 12px 16px;
          flex-shrink: 0;
        }

        .query-controls {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .mode-selector {
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .mode-selector label {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #e0e0e0;
          font-size: 13px;
          cursor: pointer;
        }

        .mode-selector input[type="radio"] {
          accent-color: #4a9eff;
        }

        .model-selector,
        .custom-query {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .model-select,
        .model-filter {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #e0e0e0;
          padding: 6px 10px;
          border-radius: 4px;
          font-size: 13px;
          min-width: 200px;
        }

        .query-textarea {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #e0e0e0;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 13px;
          font-family: "Consolas", "Monaco", monospace;
          resize: vertical;
          width: 100%;
        }

        .query-textarea::placeholder {
          color: #888;
        }

        .query-input-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
        }

        .query-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .query-btn {
          background: rgba(74, 158, 255, 0.8);
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          transition: background 0.2s;
        }

        .query-btn:hover:not(:disabled) {
          background: rgba(74, 158, 255, 1);
        }

        .query-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .query-btn.primary {
          background: rgba(46, 204, 113, 0.8);
        }

        .query-btn.primary:hover:not(:disabled) {
          background: rgba(46, 204, 113, 1);
        }
      `}</style>

      <div className="compact-header">
        <div className="header-left">
          <h1 className="title">
            {isQueryMode
              ? queryResults?.model_info
                ? `Raw Data - ${queryResults.model_info.model_name}`
                : "Raw Data - Custom Query"
              : "Raw Data (AG Grid Infinite Scroll)"}
          </h1>
          <div className="stats">
            {!isQueryMode && <span className="stat">↻ Scroll Loading</span>}
            <span className="stat">
              ▲ Loaded {rowData.length.toLocaleString()} items
            </span>
            <span className="stat">
              ≡{" "}
              {queryResults?.column_definitions?.length ||
                Object.keys(columnMapping).length}{" "}
              columns
            </span>
            {totalCount && (
              <span className="stat">
                ∑ Total {totalCount.toLocaleString()} items
              </span>
            )}
            {loading && <span className="stat">⟳ Loading...</span>}
          </div>
        </div>
        <div className="header-right">
          {isQueryMode && (
            <button onClick={resetToDefaultMode} className="reset-btn">
              ← Back to Default
            </button>
          )}
        </div>
      </div>

      {/* Query Panel */}
      <div className="query-panel">
        <div className="query-controls">
          <div className="mode-selector">
            <label>
              <input
                type="radio"
                value="default"
                checked={queryMode === "default"}
                onChange={(e) => setQueryMode(e.target.value as any)}
              />
              Default View
            </label>
            <label>
              <input
                type="radio"
                value="model"
                checked={queryMode === "model"}
                onChange={(e) => setQueryMode(e.target.value as any)}
              />
              Model Filter
            </label>
            <label>
              <input
                type="radio"
                value="custom"
                checked={queryMode === "custom"}
                onChange={(e) => setQueryMode(e.target.value as any)}
              />
              Custom Query
            </label>
          </div>

          {queryMode === "model" && (
            <div className="model-selector">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="model-select"
              >
                <option value="">Select Model...</option>
                {availableModels.map((model) => (
                  <option key={model.model_name} value={model.model_name}>
                    {model.display_name}
                  </option>
                ))}
              </select>
              <button
                onClick={loadModelData}
                disabled={!selectedModel || loading}
                className="query-btn"
              >
                Load Model Data
              </button>
            </div>
          )}

          {queryMode === "custom" && (
            <div className="custom-query">
              <div className="query-input-section">
                <textarea
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  placeholder="Enter SQL query (SELECT only)&#10;Example: SELECT * FROM HANDY_ZSCORE_RAW_DATA WHERE d001 = 'ATKINSON 3.8 OCV'"
                  className="query-textarea"
                  rows={3}
                />
                <div className="query-actions">
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="model-filter"
                  >
                    <option value="">No Model Filter</option>
                    {availableModels.map((model) => (
                      <option key={model.model_name} value={model.model_name}>
                        {model.display_name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={executeCustomQuery}
                    disabled={!customQuery.trim() || loading}
                    className="query-btn primary"
                  >
                    Execute Query
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid-container" style={{ position: "relative" }}>
        {loading && (
          <div className="loading-overlay">
            <div>Loading data...</div>
          </div>
        )}
        <div
          className="ag-theme-alpine-dark"
          style={{ height: "100%", width: "100%" }}
        >
          <AgGridReact
            ref={gridRef}
            columnDefs={columnDefs}
            rowData={rowData}
            defaultColDef={defaultColDef}
            onGridReady={onGridReady}
            onBodyScroll={onBodyScroll}
            animateRows={true}
            suppressCellFocus={true}
            rowSelection="multiple"
            suppressRowClickSelection={true}
            getRowId={(params) => {
              // 안전한 ID 생성
              if (params.data?.id) {
                return params.data.id.toString();
              }
              // id가 없는 경우 데이터 기반으로 고유 ID 생성
              const firstValue = Object.values(params.data || {})[0] || "";
              const dataHash = JSON.stringify(params.data).slice(0, 20);
              return `row_${firstValue}_${dataHash}`;
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default RawDataGrid;
