FROM python:3.11-slim

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && rm -rf /var/lib/apt/lists/*

# Install fraud_detection_app ML deps first
COPY fraud_detection_app/requirements.txt /app/ml_requirements.txt
RUN pip install --no-cache-dir -r ml_requirements.txt

# Install backend API deps
COPY webapp/backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY fraud_detection_app /app/fraud_detection_app
COPY models /app/models
COPY data /app/data
COPY webapp/backend /app/webapp/backend

WORKDIR /app/webapp/backend

ENV PYTHONPATH=/app

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
