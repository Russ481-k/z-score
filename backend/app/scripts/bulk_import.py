import sys
from pathlib import Path
from tqdm import tqdm

# 프로젝트 루트 경로를 sys.path에 추가
sys.path.append(str(Path(__file__).resolve().parents[3]))

from backend.app.db.database import SessionLocal
from backend.app.processing import reader, transformer, loader

def main():
    """
    data 폴더의 모든 CSV 파일을 읽어 DB에 적재합니다.
    """
    print("데이터베이스 세션을 생성합니다...")
    db = SessionLocal()
    try:
        # 1. 모든 CSV 파일 경로 가져오기
        base_path = Path("/app/data")
        print(f"데이터를 검색할 기본 경로: {base_path}")
        all_csv_files = reader.find_csv_files(base_path)
        
        if not all_csv_files:
            print("처리할 CSV 파일이 없습니다.")
            return
        
        print(f"총 {len(all_csv_files)}개의 CSV 파일을 찾았습니다. 시계열 순으로 처리합니다.")

        # 2. 파일 처리 (tqdm으로 진행상황 표시)
        new_products_total = 0
        for file_path in tqdm(all_csv_files, desc="CSV 파일 처리 중"):
            try:
                raw_df = reader.read_and_parse_csv(file_path)
                if raw_df.empty:
                    tqdm.write(f"경고: {file_path.name} 파일 파싱에 실패했거나 비어있습니다.")
                    continue

                products_df, measurements_df = transformer.transform_data(raw_df)
                
                new_count = loader.load_data_to_db(db, products_df, measurements_df)
                new_products_total += new_count

            except Exception as e:
                tqdm.write(f"에러: {file_path.name} 처리 중 오류 발생 - {e}")

        print("\n데이터 적재 완료!")
        print(f"새롭게 추가된 총 제품 수: {new_products_total}")
        
        print("데이터베이스에 변경사항을 커밋합니다...")
        db.commit()
        print("커밋 완료!")

    except Exception as e:
        print(f"전체 프로세스 중 예외 발생: {e}")
        db.rollback()
    finally:
        print("데이터베이스 세션을 닫습니다.")
        db.close()

if __name__ == "__main__":
    main() 