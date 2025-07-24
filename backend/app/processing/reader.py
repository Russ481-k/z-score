import pandas as pd
from pathlib import Path
import re
from typing import List

# 헤더가 없는 파일을 위한 기본 컬럼명 목록 (모든 가능성을 포함)
DEFAULT_COLUMNS = [
    '바코드', '모델명', 'line_info', '일시', '최종위치', '압입력', '종합판정',
    'CAM1_최고압입력', 'CAM1_최종압입력', 'CAM1_판정', 'CAM2_최고압입력', 'CAM2_최종압입력', 'CAM2_판정',
    'CAM3_최고압입력', 'CAM3_최종압입력', 'CAM3_판정', 'CAM4_최고압입력', 'CAM4_최종압입력', 'CAM4_판정',
    'CAM5_최고압입력', 'CAM5_최종압입력', 'CAM5_판정', 'CAM6_최고압입력', 'CAM6_최종압입력', 'CAM6_판정',
    'CAM7_최고압입력', 'CAM7_최종압입력', 'CAM7_판정', 'CAM8_최고압입력', 'CAM8_최종압입력', 'CAM8_판정',
    'CAM9_최고압입력', 'CAM9_최종압입력', 'CAM9_판정', 'CAM1_토크_1번째', 'CAM1_토크_1번째_판정',
    'CAM1_토크_2번째', 'CAM1_토크_2번째_판정', 'CAM2_토크_1번째', 'CAM2_토크_1번째_판정', 'CAM2_토크_2번째',
    'CAM2_토크_2번째_판정', 'CAM3_토크_1번째', 'CAM3_토크_1번째_판정', 'CAM3_토크_2번째', 'CAM3_토크_2번째_판정',
    'CAM4_토크_1번째', 'CAM4_토크_1번째_판정', 'CAM4_토크_2번째', 'CAM4_토크_2번째_판정', 'CAM5_토크_1번째',
    'CAM5_토크_1번째_판정', 'CAM5_토크_2번째', 'CAM5_토크_2번째_판정', 'CAM6_토크_1번째', 'CAM6_토크_1번째_판정',
    'CAM6_토크_2번째', 'CAM6_토크_2번째_판정', 'CAM7_토크_1번째', 'CAM7_토크_1번째_판정', 'CAM7_토크_2번째',
    'CAM7_토크_2번째_판정', 'CAM8_토크_1번째', 'CAM8_토크_1번째_판정', 'CAM8_토크_2번째', 'CAM8_토크_2번째_판정',
    'CAM9_토크_1번째', 'CAM9_토크_1번째_판정', 'CAM9_토크_2번째', 'CAM9_토크_2번째_판정', 'CAM1_위상각',
    'CAM1_위상각_판정', 'CAM2_위상각', 'CAM2_위상각_판정', 'CAM3_위상각', 'CAM3_위상각_판정',
    'CAM4_위상각', 'CAM4_위상각_판정', 'CAM5_위상각', 'CAM5_위상각_판정', 'CAM6_위상각',
    'CAM6_위상각_판정', 'CAM7_위상각', 'CAM7_위상각_판정'
]

def clean_header_name(name: str) -> str:
    """헤더 이름에서 불필요한 문자를 제거하고 표준화합니다."""
    if not isinstance(name, str):
        return ''
    name = re.sub(r'\\(.*?\\)', '', name).strip()
    name = re.sub(r'\\s*[-/\\s]+\\s*', '_', name)
    return name

def read_and_parse_csv(file_path: Path) -> pd.DataFrame:
    try:
        try:
            df = pd.read_csv(file_path, header=None, encoding='EUC-KR', dtype=str, engine='python')
        except UnicodeDecodeError:
            df = pd.read_csv(file_path, header=None, encoding='utf-8', dtype=str, engine='python')
        
        if df.empty:
            return pd.DataFrame()

        first_row_str = ''.join(map(str, df.iloc[0].dropna().tolist()))
        has_header = '바코드' in first_row_str or '일시' in first_row_str

        if has_header:
            if len(df) < 2: return pd.DataFrame()
            header_row_1 = df.iloc[0].ffill()
            header_row_2 = df.iloc[1]
            new_header = [clean_header_name(f"{t}_{s}" if 'CAM' in str(t) else s or t) for t, s in zip(header_row_1, header_row_2)]
            df_data = df.iloc[2:].copy()
            df_data.columns = new_header
        else:
            df_data = df.copy()
            num_cols = len(df_data.columns)
            df_data.columns = DEFAULT_COLUMNS[:num_cols]

        df_data.rename(columns=lambda c: c.replace('라인_장비_팔레트', 'line_info').replace(' ', '_'), inplace=True)
        
        if '종합판정' not in df_data.columns:
            return pd.DataFrame()
            
        return df_data
    except Exception:
        return pd.DataFrame()