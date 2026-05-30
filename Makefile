.PHONY: up down logs migrate seed setup

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

logs-api:
	docker compose logs -f api

shell-api:
	docker compose exec api sh

shell-db:
	docker compose exec postgres psql -U sindiride -d sindiride

migrate:
	docker compose exec api npx prisma migrate dev

seed:
	docker compose exec api npx prisma db seed

studio:
	docker compose exec api npx prisma studio

setup:
	docker compose up -d --build && sleep 8 && docker compose exec api npx prisma migrate dev --name init && docker compose exec api npx prisma db seed
	@echo "✅ Ambiente pronto!"
