import pandas as pd
import sys
import warnings

# 경고 메시지 무시
warnings.simplefilter(action='ignore', category=FutureWarning)

# 터미널 출력을 위한 UTF-8 설정
sys.stdout.reconfigure(encoding='utf-8')

FILE_PATH = 'data/2024/01/Cam_20240102.csv'

def inspect_csv_header(file_path: str):
    """
    지정된 CSV 파일의 헤더 구조를 분석하고 출력합니다.
    1. 파일을 EUC-KR로 읽습니다.
    2. Pandas의 Multi-index header 기능을 사용하여 처음 두 줄을 헤더로 읽습니다.
    3. 생성된 컬럼 구조를 확인하기 위해 출력합니다.
    """
    print(f"'{file_path}' 파일의 헤더 구조 분석을 시작합니다.\n")
    try:
        # Pandas가 멀티-레벨 헤더를 어떻게 해석하는지 직접 확인
        # header=[0, 1] 옵션은 첫 번째와 두 번째 줄을 헤더로 사용하라는 의미
        df = pd.read_csv(file_path, header=[0, 1], encoding='EUC-KR')

        print("--- Pandas가 해석한 Multi-index 컬럼 구조 ---")
        for i, col in enumerate(df.columns):
            print(f"컬럼 {i+1}: {col}")

        print("\n분석 완료.")

    except Exception as e:
        print(f"파일 분석 중 오류가 발생했습니다: {e}")

if __name__ == "__main__":
    inspect_csv_header(FILE_PATH) 