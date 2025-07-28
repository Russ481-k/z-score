# z-score Project

캠샤프트 제조 라인의 불량률 예측 및 실시간 알람 시스템입니다.

docker-compose up --build
docker-compose up  
docker-compose up -d --force-recreate && docker-compose exec backend python -m backend.app.scripts.bulk_import

# 백엔드 실행

& ./.venv/Scripts/python.exe -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
