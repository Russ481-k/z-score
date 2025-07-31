#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
통합 CSV 데이터 로더 스크립트

기능:
1. 기존 데이터 삭제 (선택 사항)
2. CSV 파일 구조 분석
3. 데이터 로딩 (EUC-KR 우선 인코딩)
4. 데이터 검증 및 샘플 출력
5. 통계 정보 출력

사용법:
    python load_data.py [옵션]
    
옵션:
    --clear-data: 기존 데이터를 모두 삭제하고 새로 로드
    --analyze-only: CSV 파일 구조만 분석
    --verify-only: 기존 데이터 검증만 수행
    --no-confirm: 확인 없이 자동 실행
"""

import os
import sys
import argparse
import pandas as pd
import oracledb
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime

# ========== 설정 및 유틸리티 함수 ==========

def init_oracle_client():
    """Oracle Instant Client 초기화"""
    try:
        oracle_lib_path = Path(__file__).parent.parent / "oracle" / "instantclient_23_8"
        if oracle_lib_path.exists():
            oracledb.init_oracle_client(lib_dir=str(oracle_lib_path))
            print(f"✓ Oracle Instant Client 초기화 성공")
            return True
        else:
            print("⚠ Oracle Instant Client 경로를 찾을 수 없습니다. Thin 모드로 연결합니다.")
            return True
    except oracledb.Error as e:
        print(f"⚠ Oracle Instant Client 초기화 실패: {e}")
        print("Thin 모드로 시도합니다.")
        return True

def get_db_connection():
    """데이터베이스 연결"""
    load_dotenv()
    db_user = os.getenv("ORACLE_USER")
    db_password = os.getenv("ORACLE_PASSWORD")
    db_dsn = os.getenv("ORACLE_DSN")

    if not all([db_user, db_password, db_dsn]):
        print("❌ .env 파일에 ORACLE_USER, ORACLE_PASSWORD, ORACLE_DSN 환경 변수를 설정해야 합니다.")
        return None
    
    try:
        connection = oracledb.connect(user=db_user, password=db_password, dsn=db_dsn)
        print("✓ Oracle DB 연결 성공")
        return connection
    except oracledb.Error as e:
        print(f"❌ Oracle DB 연결 실패: {e}")
        return None

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

def get_csv_files():
    """CSV 파일 목록 가져오기"""
    data_dir = Path("../.cursor/data")
    if not data_dir.exists():
        print(f"❌ 데이터 디렉토리 '{data_dir}'를 찾을 수 없습니다.")
        return []
    
    csv_files = sorted(list(data_dir.rglob("*.csv")))
    return csv_files

# ========== CSV 파일 구조 분석 ==========

def analyze_csv_structure(csv_files, num_files_to_analyze=5):
    """CSV 파일 구조 분석"""
    print(f"\n🔍 === CSV 파일 구조 분석 ===")
    print(f"발견된 CSV 파일: {len(csv_files)}개")
    print(f"분석할 파일: {min(num_files_to_analyze, len(csv_files))}개")

    for i, csv_file_path in enumerate(csv_files):
        if i >= num_files_to_analyze:
            break
        
        print(f"\n--- 파일 분석: {csv_file_path.name} ---")
        
        # 인코딩 시도
        encodings = ['EUC-KR', 'cp949', 'utf-8-sig', 'utf-8', 'latin-1']
        df = None
        used_encoding = None
        
        for encoding in encodings:
            try:
                df = pd.read_csv(
                    csv_file_path, 
                    encoding=encoding, 
                    header=None, 
                    sep=',',
                    on_bad_lines='skip',
                    engine='python',
                    quoting=1,
                    skipinitialspace=True,
                    nrows=10  # 처음 10행만 읽기
                )
                used_encoding = encoding
                print(f"✓ 인코딩 성공: {encoding}")
                break
            except Exception as e:
                continue
        
        if df is None:
            print("❌ 모든 인코딩 시도 실패")
            continue

        print(f"📊 파일 정보:")
        print(f"  - 총 행 수: {len(df)}")
        print(f"  - 총 컬럼 수: {len(df.columns)}")
        print(f"  - 사용된 인코딩: {used_encoding}")
        
        # 첫 3행 샘플 출력
        if len(df) > 0:
            print(f"  - 첫 번째 행 샘플: {df.iloc[0].head(5).tolist()}")
        if len(df) > 1:
            print(f"  - 두 번째 행 샘플: {df.iloc[1].head(5).tolist()}")
        if len(df) > 2:
            print(f"  - 세 번째 행 샘플: {df.iloc[2].head(5).tolist()}")

# ========== 데이터 삭제 기능 ==========

def clear_existing_data(connection):
    """기존 데이터 삭제"""
    try:
        with connection.cursor() as cursor:
            # 현재 데이터 개수 확인
            cursor.execute("SELECT COUNT(*) FROM HANDY_ZSCORE_RAW_DATA")
            current_count = cursor.fetchone()[0]
            
            if current_count == 0:
                print("✓ 삭제할 데이터가 없습니다.")
                return True
            
            print(f"📊 현재 데이터: {current_count:,}개 행")
            
            # 데이터 삭제
            print("🗑️ 기존 데이터 삭제 중...")
            cursor.execute("DELETE FROM HANDY_ZSCORE_RAW_DATA")
            connection.commit()
            
            # 시퀀스 리셋 (선택사항)
            try:
                cursor.execute("DROP SEQUENCE handy_zscore_raw_data_seq")
                cursor.execute("""
                    CREATE SEQUENCE handy_zscore_raw_data_seq 
                    START WITH 1 
                    INCREMENT BY 1 
                    NOCACHE
                """)
                print("✓ 시퀀스 리셋 완료")
            except:
                print("⚠ 시퀀스 리셋 실패 (기존 시퀀스 사용)")
            
            print(f"✅ 기존 데이터 {current_count:,}개 행 삭제 완료")
            return True
            
    except Exception as e:
        print(f"❌ 데이터 삭제 실패: {e}")
        return False

# ========== 데이터 로딩 기능 ==========

def load_csv_data(connection, csv_files, show_progress=True):
    """CSV 데이터를 Oracle DB에 로딩"""
    print(f"\n📥 === 데이터 로딩 시작 ===")
    print(f"처리할 CSV 파일: {len(csv_files)}개")
    
    total_processed = 0
    total_inserted = 0
    total_skipped = 0
    failed_files = []
    
    # 동적 INSERT 쿼리 생성
    num_data_columns = 150 
    insert_query = create_insert_query(num_data_columns)
    
    try:
        with connection.cursor() as cursor:
            for i, file_path in enumerate(csv_files, 1):
                try:
                    if show_progress and i % 50 == 0:
                        print(f"진행률: {i}/{len(csv_files)} ({i/len(csv_files)*100:.1f}%)")
                    
                    # 여러 인코딩 시도 (EUC-KR 우선)
                    df = None
                    encodings = ['EUC-KR', 'cp949', 'utf-8-sig', 'utf-8', 'latin-1']
                    
                    for encoding in encodings:
                        try:
                            df = pd.read_csv(
                                file_path, 
                                header=None, 
                                skiprows=2,  # 첫 2줄 건너뜀
                                encoding=encoding, 
                                on_bad_lines='skip',
                                dtype=str,
                                engine='python',
                                sep=',',
                                quoting=0,
                                skipinitialspace=True
                            )
                            break
                        except:
                            continue
                    
                    if df is None:
                        failed_files.append((file_path.name, "인코딩 실패"))
                        continue
                        
                    df = df.where(pd.notna(df), None)  # NaN을 None으로 변환

                    if df.empty:
                        total_skipped += 1
                        continue
                    
                    # 유효한 데이터 행만 필터링
                    data_to_insert = []
                    for row in df.itertuples(index=False):
                        row_list = list(row)
                        
                        # 첫 번째 컬럼(바코드)이 있는 행만 처리
                        if row_list and row_list[0] and str(row_list[0]).strip():
                            # 150개 컬럼에 맞게 None으로 패딩
                            padded_row = (row_list + [None] * (num_data_columns - len(row_list)))[:num_data_columns]
                            data_to_insert.append(tuple(padded_row))
                    
                    if not data_to_insert:
                        total_skipped += 1
                        continue
                    
                    # DB에 삽입
                    cursor.setinputsizes(*[oracledb.DB_TYPE_VARCHAR] * num_data_columns)
                    cursor.executemany(insert_query, data_to_insert)
                    connection.commit()
                    
                    total_processed += 1
                    total_inserted += len(data_to_insert)

                except Exception as e:
                    failed_files.append((file_path.name, str(e)[:50]))
                    connection.rollback()
                    continue
            
            print(f"\n✅ === 데이터 로딩 완료 ===")
            print(f"📊 처리된 파일: {total_processed}/{len(csv_files)}")
            print(f"💾 총 삽입 데이터: {total_inserted:,}개 행")
            print(f"⏭️ 건너뛴 파일: {total_skipped}개")
            
            if failed_files:
                print(f"❌ 실패한 파일: {len(failed_files)}개")
                for filename, error in failed_files[:5]:  # 처음 5개만 표시
                    print(f"  - {filename}: {error}")
                if len(failed_files) > 5:
                    print(f"  ... 외 {len(failed_files) - 5}개 파일")
            
            return total_inserted > 0
            
    except Exception as e:
        print(f"❌ 데이터 로딩 실패: {e}")
        return False

# ========== 데이터 검증 기능 ==========

def verify_loaded_data(connection, sample_count=5):
    """로드된 데이터 검증 및 샘플 출력"""
    print(f"\n🔍 === 데이터 검증 ===")
    
    try:
        with connection.cursor() as cursor:
            # 1. 전체 데이터 개수
            cursor.execute("SELECT COUNT(*) FROM HANDY_ZSCORE_RAW_DATA")
            total_count = cursor.fetchone()[0]
            print(f"📊 총 데이터 개수: {total_count:,}개 행")
            
            if total_count == 0:
                print("❌ 데이터가 없습니다.")
                return False
            
            # 2. 컬럼 매퍼 정보 확인
            try:
                cursor.execute("SELECT COUNT(*) FROM HANDY_ZSCORE_COLUMN_MAPPER")
                mapper_count = cursor.fetchone()[0]
                print(f"📋 컬럼 매퍼: {mapper_count}개")
                
                if mapper_count > 0:
                    cursor.execute("SELECT raw_column_name, mapped_column_name FROM HANDY_ZSCORE_COLUMN_MAPPER WHERE ROWNUM <= 10")
                    mappers = cursor.fetchall()
                    column_mapper = {raw: mapped for raw, mapped in mappers}
                else:
                    column_mapper = {}
            except:
                print("⚠ 컬럼 매퍼 테이블 없음")
                column_mapper = {}
            
            # 3. 최신 데이터 샘플 출력
            cursor.execute(f"""
                SELECT * FROM (
                    SELECT * FROM HANDY_ZSCORE_RAW_DATA ORDER BY id DESC
                ) WHERE ROWNUM <= {sample_count}
            """)
            
            raw_column_names = [desc[0].lower() for desc in cursor.description]
            latest_data = cursor.fetchall()
            
            print(f"\n📋 최신 데이터 {len(latest_data)}개 샘플:")
            for i, row in enumerate(latest_data):
                print(f"\n[샘플 #{i+1}]")
                
                mapped_data = {}
                for raw_name, value in zip(raw_column_names, row):
                    mapped_name = column_mapper.get(raw_name, raw_name)
                    if value is not None:
                        mapped_data[mapped_name] = value
                
                # 주요 필드만 출력 (처음 10개)
                shown_count = 0
                for key, value in mapped_data.items():
                    if shown_count >= 10:
                        break
                    if value and str(value).strip():
                        print(f"  {key}: {value}")
                        shown_count += 1
            
            # 4. 데이터 통계
            cursor.execute("""
                SELECT 
                    MIN(id) as min_id,
                    MAX(id) as max_id,
                    MIN(create_time) as min_time,
                    MAX(create_time) as max_time
                FROM HANDY_ZSCORE_RAW_DATA
            """)
            stats = cursor.fetchone()
            if stats:
                print(f"\n📈 데이터 범위:")
                print(f"  ID 범위: {stats[0]} ~ {stats[1]}")
                if stats[2] and stats[3]:
                    print(f"  시간 범위: {stats[2]} ~ {stats[3]}")
            
            return True
            
    except Exception as e:
        print(f"❌ 데이터 검증 실패: {e}")
        return False

# ========== 메인 함수 ==========

def main():
    """메인 함수"""
    parser = argparse.ArgumentParser(description='통합 CSV 데이터 로더')
    parser.add_argument('--clear-data', action='store_true', help='기존 데이터를 모두 삭제하고 새로 로드')
    parser.add_argument('--analyze-only', action='store_true', help='CSV 파일 구조만 분석')
    parser.add_argument('--verify-only', action='store_true', help='기존 데이터 검증만 수행')
    parser.add_argument('--no-confirm', action='store_true', help='확인 없이 자동 실행')
    parser.add_argument('--analyze-count', type=int, default=5, help='분석할 파일 개수 (기본값: 5)')
    
    args = parser.parse_args()
    
    print("🚀 === 통합 CSV 데이터 로더 ===")
    print(f"실행 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Oracle Client 초기화
    if not init_oracle_client():
        return 1
    
    # CSV 파일 목록 가져오기
    csv_files = get_csv_files()
    if not csv_files:
        return 1
    
    # CSV 구조 분석만 수행
    if args.analyze_only:
        analyze_csv_structure(csv_files, args.analyze_count)
        return 0
    
    # DB 연결
    connection = get_db_connection()
    if not connection:
        return 1
    
    try:
        # 기존 데이터 검증만 수행
        if args.verify_only:
            verify_loaded_data(connection)
            return 0
        
        # CSV 파일 구조 분석 (간략히)
        if not args.no_confirm:
            analyze_csv_structure(csv_files, 3)
        
        # 기존 데이터 삭제 여부 확인
        if args.clear_data:
            if not args.no_confirm:
                confirm = input(f"\n⚠️ 기존 데이터를 모두 삭제하고 {len(csv_files)}개 파일을 새로 로드하시겠습니까? (y/N): ").lower().strip()
                if confirm != 'y':
                    print("❌ 작업이 취소되었습니다.")
                    return 0
            
            if not clear_existing_data(connection):
                return 1
        
        # 데이터 로딩
        success = load_csv_data(connection, csv_files, show_progress=True)
        if not success:
            return 1
        
        # 결과 검증
        verify_loaded_data(connection)
        
        print(f"\n🎉 모든 작업이 완료되었습니다!")
        return 0
        
    finally:
        connection.close()

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code) 