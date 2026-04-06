## Setup (Local Development)

### Prerequisites
- Docker + Docker Compose
- Git

### Clone
```bash
git clone https://github.com/AshMan025/CSE-450-Capstone
cd CSE-450-Capstone
```

###Configure environment files
Each microservice reads its own .env.

Copy the example env (if present) and fill values as needed:
cp services/auth-service/.env.example services/auth-service/.env
# Repeat for other services if you have .env.example files

### Finally run the docker-run.sh

```bash
./docker-run
```
