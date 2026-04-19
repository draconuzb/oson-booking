.PHONY: up down build logs dev restart clean

# Production
up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose up --build -d

restart:
	docker compose restart

logs:
	docker compose logs -f

logs-api:
	docker compose logs -f api

logs-bot:
	docker compose logs -f api | grep -i bot

logs-db:
	docker compose logs -f db

# Development
dev:
	cd backend && npm run dev

dev-front:
	cd frontend && npm run dev

# Database
db-shell:
	docker compose exec db psql -U booking_admin -d booking_system

db-reset:
	docker compose down -v
	docker compose up -d db
	@echo "Database reset complete. Wait a few seconds for init."

# Cleanup
clean:
	docker compose down -v --rmi local
	@echo "All containers, volumes, and images removed."

# Status
status:
	docker compose ps
