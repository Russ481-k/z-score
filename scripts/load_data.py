import os
import pandas as pd
import oracledb
from pathlib import Path
from dotenv import load_dotenv

def create_insert_query(num_columns):
    """
    지정된 컬럼 수에 맞는 동적 INSERT 쿼리를 생성합니다.
    id 컬럼에는 시퀀스의 NEXTVAL을 사용합니다.
    """
    # 컬럼 이름을 'd000', 'd001'과 같이 세 자리 숫자로 포맷팅
    column_names = ", ".join([f"d{i:03}" for i in range(num_columns)])
    placeholders = ", ".join([f":{i+1}" for i in range(num_columns)])
    query = (
        f"INSERT INTO HANDY_ZSCORE_RAW_DATA (id, {column_names}) "
        f"VALUES (handy_zscore_raw_data_seq.NEXTVAL, {placeholders})"
    )
    return query

def load_csv_to_oracle():
    """
    'data' 디렉토리 하위의 모든 CSV 파일을 찾아 날짜순으로 Oracle DB에 적재합니다.
    """
    # Thick 모드를 사용하기 위해 Oracle Instant Client 초기화
    # 아래 lib_dir 경로는 실제 Instant Client를 설치한 경로로 수정해야 합니다.
    try:
        oracledb.init_oracle_client(lib_dir=r"C:\workspace\z-score\oracle\instantclient_23_8")
    except oracledb.Error as e:
        print("Oracle Instant Client 초기화에 실패했습니다. 경로를 확인해주세요.")
        print(f"오류: {e}")
        print("도움말: https://python-oracledb.readthedocs.io/en/latest/user_guide/installation.html#setting-up-your-environment")
        return
        
    # .env 파일에서 환경 변수 로드
    load_dotenv()

    # 환경 변수에서 DB 접속 정보 가져오기
    db_user = os.getenv("ORACLE_USER")
    db_password = os.getenv("ORACLE_PASSWORD")
    db_dsn = os.getenv("ORACLE_DSN")

    if not all([db_user, db_password, db_dsn]):
        print("오류: .env 파일에 ORACLE_USER, ORACLE_PASSWORD, ORACLE_DSN 환경 변수를 설정해야 합니다.")
        return

    # 데이터 디렉토리 설정
    data_dir = Path("./data")
    if not data_dir.exists():
        print(f"오류: 데이터 디렉토리 '{data_dir}'를 찾을 수 없습니다.")
        return

    try:
        # Oracle DB에 연결
        with oracledb.connect(user=db_user, password=db_password, dsn=db_dsn) as connection:
            with connection.cursor() as cursor:
                print("Oracle DB에 성공적으로 연결되었습니다.")

                # data 디렉토리 하위의 모든 csv 파일 찾아 날짜순으로 정렬
                csv_files = sorted(list(data_dir.rglob("*.csv")))
                if not csv_files:
                    print("처리할 CSV 파일이 없습니다.")
                    return
                
                print(f"총 {len(csv_files)}개의 CSV 파일을 발견했습니다. 데이터 적재를 시작합니다.")

                for file_path in csv_files:
                    try:
                        # CSV 파일을 pandas로 읽기. 모든 데이터를 문자열로 읽도록 dtype=str 지정.
                        # 첫 2줄(헤더)은 건너뜀.
                        df = pd.read_csv(file_path, header=None, skiprows=2, encoding='EUC-KR', on_bad_lines='warn', dtype=str)
                        df = df.where(pd.notna(df), None) # NaN을 None으로 변환

                        if df.empty:
                            print(f"파일이 비어있거나 데이터가 없습니다: {file_path}")
                            continue
                        
                        # 동적 INSERT 쿼리 생성
                        # RAW 테이블은 150개의 d-컬럼을 가지므로 150개로 고정
                        num_data_columns = 150 
                        insert_query = create_insert_query(num_data_columns)
                        
                        # DataFrame을 튜플 리스트로 변환
                        # 데이터의 실제 컬럼 수와 테이블의 컬럼 수가 다를 경우를 대비하여 패딩 추가
                        data_to_insert = []
                        for row in df.itertuples(index=False):
                            row_list = list(row)
                            # 150개 컬럼에 맞게 None으로 패딩
                            padded_row = (row_list + [None] * (num_data_columns - len(row_list)))[:num_data_columns]
                            data_to_insert.append(tuple(padded_row))

                        # DB에 삽입할 데이터의 타입을 모두 VARCHAR로 명시
                        cursor.setinputsizes(*[oracledb.DB_TYPE_VARCHAR] * num_data_columns)
                        # executemany로 데이터 대량 삽입
                        cursor.executemany(insert_query, data_to_insert)
                        connection.commit()
                        print(f"파일 로드 완료: {file_path} ({len(data_to_insert)}개 행 삽입)")

                    except Exception as e:
                        print(f"파일 처리 중 오류 발생: {file_path}")
                        print(f"오류: {e}")
                        connection.rollback() # 오류 발생 시 현재 파일 트랜잭션 롤백
                        continue
    
    except oracledb.Error as e:
        print(f"Oracle DB 연결 또는 작업 중 오류 발생: {e}")
    
    except Exception as e:
        print(f"알 수 없는 오류 발생: {e}")

if __name__ == "__main__":
    load_csv_to_oracle() 