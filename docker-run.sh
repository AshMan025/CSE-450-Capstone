#!/bin/bash
# Helper script to safely build and run the system
echo "Starting Exam Application via Docker Compose..."
docker-compose down
docker-compose up --build -d
echo "All services are starting up in the background."
echo "Frontend available at: http://localhost:3000"
echo "API Gateway available at: http://localhost:8000"
