# backend/Dockerfile
FROM python:3.12.10-slim

# Install poetry
RUN pip install poetry

# Set working directory
WORKDIR /app

# Copy dependency definition files
COPY pyproject.toml poetry.lock* /app/

# Install dependencies
RUN poetry config virtualenvs.create false && \
    poetry install --no-root

# Copy the rest of the application
COPY . /app

# The command to run the application will be specified in docker-compose.yml 