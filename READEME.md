docker-compose up --build
docker-compose up  
docker-compose up -d --force-recreate && docker-compose exec backend python -m backend.app.scripts.bulk_import
