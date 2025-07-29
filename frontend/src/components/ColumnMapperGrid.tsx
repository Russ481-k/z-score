"use client";

import React, { useState, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { ColDef, ICellRendererParams } from "ag-grid-community";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

ModuleRegistry.registerModules([AllCommunityModule]);

interface ColumnMapper {
  id: number;
  raw_column_name: string;
  mapped_column_name: string;
  description?: string;
  display_order: number;
  is_active: boolean;
}

interface ColumnMapperCreate {
  raw_column_name: string;
  mapped_column_name: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
}

const ColumnMapperGrid: React.FC = () => {
  const [isAddMode, setIsAddMode] = useState(false);
  const [newMapper, setNewMapper] = useState<ColumnMapperCreate>({
    raw_column_name: "",
    mapped_column_name: "",
    description: "",
    display_order: 0,
    is_active: true,
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  // 컬럼 매퍼 목록 조회
  const { data, isLoading, error } = useQuery({
    queryKey: ["column-mappers"],
    queryFn: async () => {
      const response = await apiClient.get("/raw-data/column-mapper");
      return response.data;
    },
  });

  // 컬럼 매퍼 생성
  const createMutation = useMutation({
    mutationFn: async (mapper: ColumnMapperCreate) => {
      const response = await apiClient.post("/raw-data/column-mapper", mapper);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["column-mappers"] });
      queryClient.invalidateQueries({ queryKey: ["mapped-raw-data"] });
      setIsAddMode(false);
      setNewMapper({
        raw_column_name: "",
        mapped_column_name: "",
        description: "",
        display_order: 0,
        is_active: true,
      });
    },
  });

  // 컬럼 매퍼 수정
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<ColumnMapper>;
    }) => {
      const response = await apiClient.put(
        `/raw-data/column-mapper/${id}`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["column-mappers"] });
      queryClient.invalidateQueries({ queryKey: ["mapped-raw-data"] });
      setEditingId(null);
    },
  });

  // 컬럼 매퍼 삭제
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.delete(`/raw-data/column-mapper/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["column-mappers"] });
      queryClient.invalidateQueries({ queryKey: ["mapped-raw-data"] });
    },
  });

  // 전체 컬럼 초기화
  const initializeAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(
        "/raw-data/column-mapper/initialize-all"
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["column-mappers"] });
      queryClient.invalidateQueries({ queryKey: ["mapped-raw-data"] });
    },
  });

  // 활성화/비활성화 토글
  const toggleActiveMutation = useMutation({
    mutationFn: async ({
      id,
      is_active,
    }: {
      id: number;
      is_active: boolean;
    }) => {
      const response = await apiClient.put(`/raw-data/column-mapper/${id}`, {
        is_active,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["column-mappers"] });
      queryClient.invalidateQueries({ queryKey: ["mapped-raw-data"] });
    },
  });

  // 활성화 토글 렌더러
  const ActiveToggleRenderer = (params: ICellRendererParams) => {
    return (
      <label style={{ display: "flex", alignItems: "center", height: "100%" }}>
        <input
          type="checkbox"
          checked={params.value}
          onChange={(e) => {
            toggleActiveMutation.mutate({
              id: params.data.id,
              is_active: e.target.checked,
            });
          }}
          style={{ marginRight: "5px" }}
        />
        <span style={{ color: params.value ? "#4CAF50" : "#666" }}>
          {params.value ? "활성" : "비활성"}
        </span>
      </label>
    );
  };

  // 액션 버튼 렌더러
  const ActionCellRenderer = (params: ICellRendererParams) => {
    const isEditing = editingId === params.data.id;

    if (isEditing) {
      return (
        <div style={{ display: "flex", gap: "5px" }}>
          <button
            onClick={() => {
              updateMutation.mutate({
                id: params.data.id,
                data: {
                  raw_column_name: params.data.raw_column_name,
                  mapped_column_name: params.data.mapped_column_name,
                  description: params.data.description,
                  display_order: params.data.display_order,
                },
              });
            }}
            style={{
              padding: "4px 8px",
              backgroundColor: "#4CAF50",
              color: "#fff",
              border: "none",
              borderRadius: "3px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            저장
          </button>
          <button
            onClick={() => setEditingId(null)}
            style={{
              padding: "4px 8px",
              backgroundColor: "#666",
              color: "#fff",
              border: "none",
              borderRadius: "3px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            취소
          </button>
        </div>
      );
    }

    return (
      <div style={{ display: "flex", gap: "5px" }}>
        <button
          onClick={() => setEditingId(params.data.id)}
          style={{
            padding: "4px 8px",
            backgroundColor: "#2196F3",
            color: "#fff",
            border: "none",
            borderRadius: "3px",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          수정
        </button>
        <button
          onClick={() => {
            if (confirm("정말 삭제하시겠습니까?")) {
              deleteMutation.mutate(params.data.id);
            }
          }}
          style={{
            padding: "4px 8px",
            backgroundColor: "#f44336",
            color: "#fff",
            border: "none",
            borderRadius: "3px",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          삭제
        </button>
      </div>
    );
  };

  // 편집 가능한 셀 렌더러
  const EditableCellRenderer = (params: ICellRendererParams) => {
    const isEditing = editingId === params.data.id;
    const field = params.colDef?.field;

    if (isEditing && field) {
      if (field === "display_order") {
        return (
          <input
            type="number"
            value={params.value || 0}
            onChange={(e) => {
              params.data[field] = Number(e.target.value);
            }}
            style={{
              width: "100%",
              height: "100%",
              border: "1px solid #333",
              backgroundColor: "#1a1a1a",
              color: "#ededed",
              padding: "2px",
            }}
          />
        );
      } else {
        return (
          <input
            type="text"
            value={params.value || ""}
            onChange={(e) => {
              params.data[field] = e.target.value;
            }}
            style={{
              width: "100%",
              height: "100%",
              border: "1px solid #333",
              backgroundColor: "#1a1a1a",
              color: "#ededed",
              padding: "2px",
            }}
          />
        );
      }
    }

    return <span>{params.value}</span>;
  };

  const colDefs: ColDef[] = useMemo(
    () => [
      {
        field: "raw_column_name",
        headerName: "원본 컬럼명",
        width: 150,
        cellRenderer: EditableCellRenderer,
      },
      {
        field: "mapped_column_name",
        headerName: "매핑된 컬럼명",
        width: 200,
        cellRenderer: EditableCellRenderer,
      },
      {
        field: "description",
        headerName: "설명",
        width: 200,
        cellRenderer: EditableCellRenderer,
      },
      {
        field: "display_order",
        headerName: "표시순서",
        width: 100,
        cellRenderer: EditableCellRenderer,
      },
      {
        field: "is_active",
        headerName: "활성화",
        width: 100,
        cellRenderer: ActiveToggleRenderer,
      },
      {
        headerName: "액션",
        width: 150,
        cellRenderer: ActionCellRenderer,
        sortable: false,
        filter: false,
      },
    ],
    [editingId]
  );

  const handleAddMapper = () => {
    if (!newMapper.raw_column_name || !newMapper.mapped_column_name) {
      alert("원본 컬럼명과 매핑된 컬럼명을 입력해주세요.");
      return;
    }
    createMutation.mutate(newMapper);
  };

  const handleInitializeAll = () => {
    if (
      confirm(
        "전체 컬럼(d000~d149)을 초기화하시겠습니까? 기존 데이터는 모두 삭제됩니다."
      )
    ) {
      initializeAllMutation.mutate();
    }
  };

  if (isLoading) return <div>로딩 중...</div>;
  if (error) return <div>오류가 발생했습니다.</div>;

  return (
    <div style={{ padding: "20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h2>컬럼 매퍼 관리</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={handleInitializeAll}
            disabled={initializeAllMutation.isPending}
            style={{
              padding: "10px 15px",
              backgroundColor: "#FF9800",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {initializeAllMutation.isPending
              ? "초기화 중..."
              : "전체 컬럼 초기화"}
          </button>
          <button
            onClick={() => setIsAddMode(!isAddMode)}
            style={{
              padding: "10px 15px",
              backgroundColor: "#4CAF50",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {isAddMode ? "취소" : "새 매핑 추가"}
          </button>
        </div>
      </div>

      {isAddMode && (
        <div
          style={{
            marginBottom: "20px",
            padding: "15px",
            backgroundColor: "#2a2a2a",
            borderRadius: "5px",
          }}
        >
          <h3 style={{ marginBottom: "15px" }}>새 컬럼 매핑 추가</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: "10px",
            }}
          >
            <input
              type="text"
              placeholder="원본 컬럼명 (예: d001)"
              value={newMapper.raw_column_name}
              onChange={(e) =>
                setNewMapper({ ...newMapper, raw_column_name: e.target.value })
              }
              style={{
                padding: "8px",
                border: "1px solid #333",
                borderRadius: "4px",
                backgroundColor: "#1a1a1a",
                color: "#ededed",
              }}
            />
            <input
              type="text"
              placeholder="매핑된 컬럼명"
              value={newMapper.mapped_column_name}
              onChange={(e) =>
                setNewMapper({
                  ...newMapper,
                  mapped_column_name: e.target.value,
                })
              }
              style={{
                padding: "8px",
                border: "1px solid #333",
                borderRadius: "4px",
                backgroundColor: "#1a1a1a",
                color: "#ededed",
              }}
            />
            <input
              type="text"
              placeholder="설명 (선택사항)"
              value={newMapper.description || ""}
              onChange={(e) =>
                setNewMapper({ ...newMapper, description: e.target.value })
              }
              style={{
                padding: "8px",
                border: "1px solid #333",
                borderRadius: "4px",
                backgroundColor: "#1a1a1a",
                color: "#ededed",
              }}
            />
            <input
              type="number"
              placeholder="표시순서"
              value={newMapper.display_order}
              onChange={(e) =>
                setNewMapper({
                  ...newMapper,
                  display_order: Number(e.target.value),
                })
              }
              style={{
                padding: "8px",
                border: "1px solid #333",
                borderRadius: "4px",
                backgroundColor: "#1a1a1a",
                color: "#ededed",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <label style={{ color: "#ededed" }}>
                <input
                  type="checkbox"
                  checked={newMapper.is_active || false}
                  onChange={(e) =>
                    setNewMapper({ ...newMapper, is_active: e.target.checked })
                  }
                  style={{ marginRight: "5px" }}
                />
                활성화
              </label>
            </div>
          </div>
          <div style={{ marginTop: "15px" }}>
            <button
              onClick={handleAddMapper}
              disabled={createMutation.isPending}
              style={{
                padding: "10px 20px",
                backgroundColor: "#4CAF50",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                marginRight: "10px",
              }}
            >
              {createMutation.isPending ? "추가 중..." : "추가"}
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          marginBottom: "10px",
          color: "#ededed",
          fontSize: "14px",
        }}
      >
        총 {data?.total || 0}개의 컬럼 매핑
        {" · "}
        활성화된 컬럼:{" "}
        {data?.items?.filter((item: ColumnMapper) => item.is_active).length ||
          0}
        개
      </div>

      <div
        className="ag-theme-alpine-dark"
        style={{ height: "600px", width: "100%" }}
      >
        <AgGridReact
          columnDefs={colDefs}
          rowData={data?.items || []}
          defaultColDef={{
            resizable: true,
            sortable: true,
            filter: true,
          }}
          rowSelection={{ mode: "multiRow" }}
          animateRows={true}
          suppressClickEdit={true}
        />
      </div>
    </div>
  );
};

export default ColumnMapperGrid;
