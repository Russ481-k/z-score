import pandas as pd

# EUC-KR 인코딩으로 CSV 파일 읽기
# 첫 번째 줄을 건너뛰고, 그 다음 줄을 헤더로 사용합니다.
df = pd.read_csv('data/2024/01/Cam_20240102.csv', encoding='EUC-KR', skiprows=[0])

# 파싱된 데이터프레임의 상위 5개 행 출력
print(df.head()) 