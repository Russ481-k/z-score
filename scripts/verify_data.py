import os
import oracledb
from dotenv import load_dotenv

def verify_data_mapping():
    """
    DB에 연결하여 최신 원본 데이터 5개를 가져오고,
    컬럼 매퍼를 이용해 사람이 읽을 수 있는 형태로 변환하여 출력합니다.
    """
    # Thick 모드를 사용하기 위해 Oracle Instant Client 초기화
    # 아래 lib_dir 경로는 실제 Instant Client를 설치한 경로로 수정해야 합니다.
    try:
        oracledb.init_oracle_client(lib_dir=r"C:\workspace\z-score\oracle\instantclient_23_8")
    except oracledb.Error as e:
        print("Oracle Instant Client 초기화에 실패했습니다. 경로를 확인해주세요.")
        print(f"오류: {e}")
        return

    # .env 파일에서 환경 변수 로드
    load_dotenv()
    db_user = os.getenv("ORACLE_USER")
    db_password = os.getenv("ORACLE_PASSWORD")
    db_dsn = os.getenv("ORACLE_DSN")

    if not all([db_user, db_password, db_dsn]):
        print("오류: .env 파일에 ORACLE_USER, ORACLE_PASSWORD, ORACLE_DSN 환경 변수를 설정해야 합니다.")
        return

    try:
        with oracledb.connect(user=db_user, password=db_password, dsn=db_dsn) as connection:
            with connection.cursor() as cursor:
                print("Oracle DB에 성공적으로 연결되었습니다.\n")

                # 1. 컬럼 매퍼 정보 가져오기
                cursor.execute("SELECT raw_column_name, mapped_column_name FROM HANDY_ZSCORE_COLUMN_MAPPER")
                mapper_rows = cursor.fetchall()
                # {'d000': 'barcode', 'd001': 'model_name', ...} 형태의 딕셔너리 생성
                column_mapper = {raw: mapped for raw, mapped in mapper_rows}

                # 2. 최신 원본 데이터 5개 가져오기
                cursor.execute("""
                    SELECT * FROM (
                        SELECT * FROM HANDY_ZSCORE_RAW_DATA ORDER BY id DESC
                    ) WHERE ROWNUM <= 5
                """)
                
                # 컬럼 설명(cursor.description)을 이용해 컬럼명 리스트 생성
                raw_column_names = [desc[0].lower() for desc in cursor.description]
                latest_data = cursor.fetchall()

                print("--- 최신 데이터 5개 조회 및 매핑 결과 ---")
                if not latest_data:
                    print("데이터가 없습니다.")
                    return

                # 3. 데이터 매핑 및 출력
                for i, row in enumerate(latest_data):
                    mapped_data = {}
                    # raw_column_names와 row 값을 zip으로 묶어 처리
                    for raw_name, value in zip(raw_column_names, row):
                        # 매핑 테이블에 정보가 있는 'd' 컬럼만 변환
                        mapped_name = column_mapper.get(raw_name)
                        if mapped_name:
                            mapped_data[mapped_name] = value
                        else: # id, create_time 등은 그대로 사용
                            mapped_data[raw_name] = value
                    
                    print(f"\n[데이터 #{i+1}]")
                    # 보기 좋게 key: value 형태로 출력
                    for key, value in mapped_data.items():
                        if value is not None: # 값이 있는 항목만 출력
                            print(f"  {key}: {value}")

    except oracledb.Error as e:
        print(f"Oracle DB 작업 중 오류 발생: {e}")

if __name__ == "__main__":
    verify_data_mapping() 