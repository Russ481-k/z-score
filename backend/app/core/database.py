from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import os
from dotenv import load_dotenv
import oracledb

# --- Thick Mode 초기화 코드 추가 ---
# FastAPI 애플리케이션이 시작될 때 Oracle Instant Client를 사용하도록 설정합니다.
try:
    oracledb.init_oracle_client(lib_dir=r"C:\workspace\z-score\oracle\instantclient_23_8")
except oracledb.Error as e:
    print("Oracle Instant Client 초기화에 실패했습니다. 경로를 확인해주세요.")
    print(f"오류: {e}")
    # 초기화 실패 시, 애플리케이션이 더 진행되지 않도록 예외를 발생시킬 수 있습니다.
    raise

load_dotenv()

# .env 파일 또는 환경변수에서 DB 접속 정보 가져오기
DATABASE_URL = os.getenv("ORACLE_DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("ORACLE_DATABASE_URL 환경 변수를 설정해야 합니다.")

# SQLAlchemy 엔진 생성
# Oracle은 echo=True 설정 시 많은 출력이 발생하므로, 디버깅 시에만 True로 설정합니다.
engine = create_engine(DATABASE_URL, echo=False)

# 세션 생성을 위한 SessionLocal 클래스
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 모델 클래스들이 상속받을 Base 클래스
Base = declarative_base()

def get_db():
    """
    FastAPI 의존성 주입을 위한 DB 세션 생성 함수
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 