# SindiRide — Documento de Contexto Completo

## Visão Geral do Projeto

SindiRide é um sistema web de agendamento de viagens urbanas **gratuitas** para síndicos
da cidade de Londrina-PR. Funciona de forma similar ao Uber/99, mas sem custo algum para
o usuário final. O sistema conecta síndicos de condomínios a motoristas cadastrados,
permitindo que síndicos agendem corridas para realizar tarefas administrativas do
condomínio (ex: ir à prefeitura, cartório, bancos, fóruns, etc).

---

## Objetivos do Sistema

- Oferecer mobilidade gratuita para síndicos de Londrina no exercício de suas funções
- Facilitar o agendamento e acompanhamento de corridas em tempo real
- Garantir rastreabilidade e controle administrativo completo
- Escalar para outras cidades futuramente

---

## Atores do Sistema

### Síndico
- Usuário principal do sistema
- Realiza cadastro e aguarda aprovação do administrador
- Agenda corridas com origem e destino definidos
- Acompanha a corrida em tempo real
- Avalia o motorista ao final da corrida
- Acessa histórico de corridas

### Motorista
- Cadastrado pelo administrador (não faz auto-cadastro)
- Recebe notificações de novas corridas disponíveis
- Aceita, inicia e conclui corridas
- Tem disponibilidade controlada (online/offline)
- Possui avaliação média calculada automaticamente

### Administrador
- Aprova ou rejeita cadastros de síndicos
- Cadastra e gerencia motoristas
- Monitora todas as corridas em tempo real
- Bloqueia usuários quando necessário
- Acessa relatórios e métricas do sistema
- Configura rotas pré-cadastradas (destinos sugeridos)

---

## Funcionalidades Detalhadas

### Autenticação
- Login via CPF + senha (não e-mail)
- Cadastro de síndico em 2 etapas: dados pessoais + dados do condomínio
- Fluxo de aprovação: após cadastro, síndico fica com status PENDENTE até admin aprovar
- JWT com access token (15min) + refresh token (7 dias) com rotação automática
- Logout com revogação de refresh token
- Recuperação de senha via e-mail

### Corridas
Ciclo de vida completo:
AGENDADA → ACEITA → EM_ANDAMENTO → CONCLUÍDA
                 ↓
             CANCELADA (em qualquer etapa antes de EM_ANDAMENTO)

- Síndico cria corrida com origem, destino, data e hora
- Sistema calcula rota, distância e tempo estimado via Google Maps API
- Motoristas disponíveis são notificados via Socket.io
- Motorista aceita a corrida
- Síndico acompanha localização do motorista em tempo real no mapa
- Motorista inicia e conclui a corrida
- Síndico avalia o motorista (1-5 estrelas + comentário opcional)
- Corrida pode ser cancelada pelo síndico, motorista ou admin
- **Todas as corridas são 100% gratuitas — nenhum valor é cobrado**

### Agendamento
- Corrida imediata ("agora")
- Corrida agendada para data/hora futura
- Não permite agendar para datas passadas
- Síndico não pode ter mais de uma corrida ativa simultaneamente
- Destinos sugeridos pré-cadastrados pelo admin (Prefeitura, Cartório, Fórum, etc)

### Mapas e Rotas (INTEGRAÇÃO OBRIGATÓRIA)
**Google Maps Platform APIs:**
- **Directions API**: calcular rota entre origem e destino
- **Geocoding API**: converter endereço em coordenadas (lat/lng)
- **Places API**: autocomplete de endereços ao digitar
- **Maps JavaScript API**: exibir mapa interativo no frontend
- **Distance Matrix API**: calcular distância e tempo estimado

Funcionalidades de mapa:
- Mapa interativo na tela de agendamento para visualizar rota
- Pin de origem (azul) e destino (verde) no mapa
- Polyline mostrando o trajeto calculado
- Exibição de distância em km e tempo estimado em minutos
- Rastreamento em tempo real da localização do motorista durante a corrida
- Motorista atualiza localização via Socket.io a cada 5 segundos
- Área de cobertura limitada à cidade de Londrina e região metropolitana

### Notificações
- In-app via Socket.io (tempo real)
- Push notifications via Firebase Cloud Messaging (FCM)
- Tipos: corrida aceita, corrida iniciada, corrida concluída, corrida cancelada,
  cadastro aprovado, cadastro rejeitado, sem motorista disponível

### Painel Administrativo
- Dashboard com métricas: síndicos ativos, corridas do mês, pendências, motoristas disponíveis
- Listagem e aprovação/rejeição de cadastros pendentes
- Gestão completa de síndicos (aprovar, rejeitar, bloquear)
- Gestão de motoristas (cadastrar, editar, bloquear)
- Visualização de todas as corridas com filtros por status e data
- Mapa ao vivo com posição de todos os motoristas
- Relatórios exportáveis (CSV/PDF)
- Configuração de rotas/destinos sugeridos
- Log de auditoria de todas as ações administrativas

---

## Stack Tecnológica

### Frontend (apps/web)
- React 18 + TypeScript + Vite
- Tailwind CSS (estilização)
- React Router DOM v6 (roteamento)
- React Query / TanStack Query v5 (cache e estado servidor)
- Zustand (estado global — autenticação persistida no localStorage)
- React Hook Form + Zod (formulários e validação)
- Axios (HTTP client com interceptor de refresh token automático)
- Socket.io Client (tempo real)
- Google Maps JavaScript API (mapas e rotas)
- Lucide React (ícones)
- date-fns (formatação de datas)

### Backend (apps/api)
- Node.js 20 + TypeScript
- Fastify v4 (framework HTTP)
- Prisma v5 (ORM + migrations)
- PostgreSQL 16 + PostGIS (banco + geoespacial)
- Redis 7 (cache e sessões)
- Socket.io v4 (WebSocket para tempo real)
- JWT (@fastify/jwt) com access + refresh token
- Zod (validação de inputs)
- bcryptjs (hash de senhas)
- Firebase Admin SDK (push notifications)
- Google Maps Services (cálculo de rotas no backend)

### Infraestrutura
- Docker + Docker Compose (ambiente local)
- Nginx (reverse proxy)
- GitHub Actions (CI/CD)
- Railway (deploy MVP) → AWS (escala futura)

---

## Arquitetura

```
sindiride/
├── apps/
│   ├── web/                    # Frontend React
│   │   └── src/
│   │       ├── components/
│   │       │   ├── ui/         # Button, Input, Badge, Card, Spinner
│   │       │   └── layout/     # AuthLayout, SindicoLayout, AdminLayout
│   │       ├── pages/
│   │       │   ├── auth/       # LoginPage, RegisterPage, PendingPage
│   │       │   ├── sindico/    # DashboardPage, NewRidePage, RideTrackingPage, RideHistoryPage
│   │       │   └── admin/      # AdminDashboardPage, AdminSindicosPage, AdminRidesPage
│   │       ├── hooks/          # React Query hooks (useLogin, useRide, useCreateRide...)
│   │       ├── services/       # api.client.ts (Axios), services/index.ts
│   │       ├── store/          # auth.store.ts (Zustand)
│   │       ├── types/          # Tipos TypeScript do domínio
│   │       └── styles/         # globals.css (Tailwind)
│   └── api/                    # Backend Fastify
│       └── src/
│           ├── modules/
│           │   ├── auth/       # login, register, refresh, logout, me
│           │   ├── ride/       # criar, aceitar, iniciar, concluir, cancelar, avaliar
│           │   ├── sindico/    # perfil do síndico
│           │   ├── motorista/  # perfil, disponibilidade, corridas pendentes
│           │   ├── route/      # destinos sugeridos
│           │   ├── admin/      # dashboard, aprovar, rejeitar, bloquear
│           │   └── notification/ # listar, marcar lida
│           ├── shared/
│           │   ├── plugins/    # prisma.plugin, jwt.plugin, redis.plugin, socket.plugin
│           │   ├── middlewares/ # error.handler
│           │   └── errors/     # AppError, NotFoundError, ForbiddenError...
│           └── config/         # env.ts (validação com Zod)
├── docker-compose.yml
├── Makefile
└── .env
```

---

## Banco de Dados — Entidades Principais

```
User (base)
  ├── Sindico (1:1) — dados do condomínio e mandato
  ├── Motorista (1:1) — dados do veículo e CNH
  └── Admin (1:1)

Ride — corrida
  ├── sindicoId → Sindico
  ├── motoristaId → Motorista (nullable)
  ├── routeId → Route (nullable, destino sugerido)
  └── statusHistory → RideStatusHistory[]

Route — destinos pré-cadastrados (Prefeitura, Cartório, etc)
Notification — notificações do sistema
RefreshToken — tokens de refresh (JWT)
AuditLog — log de ações administrativas
```

---

## Bugs Conhecidos a Corrigir

### Bug 1 — AdminSindicosPage (PRIORIDADE ALTA)
**Arquivo:** `apps/web/src/pages/admin/index.tsx`
**Problema:** A função `AdminSindicosPage` está usando o hook `useAdminRides`
com parâmetros de status de usuário (ATIVO, PENDENTE, BLOQUEADO). Isso causa
erro 500 porque a API `/api/admin/rides` espera `RideStatus` (AGENDADA, ACEITA, etc),
não `UserStatus`.
**Correção:**
1. Criar hook `useSindicos` em `apps/web/src/hooks/index.ts`:
```ts
export function useSindicos(status?: string, page = 1) {
  return useQuery({
    queryKey: ['admin', 'sindicos', status, page],
    queryFn: () => adminService.listSindicos(status, page),
  })
}
```
2. Trocar na `AdminSindicosPage`:
```ts
// De:
const { data, isLoading } = useAdminRides({ status: statusFilter || undefined })
// Para:
const { data, isLoading } = useSindicos(statusFilter || undefined)
```
3. A tabela deve mostrar `data?.users` em vez de `data?.rides`

### Bug 2 — NewRidePage — scheduledAt inválido (PRIORIDADE ALTA)
**Arquivo:** `apps/web/src/pages/sindico/index.tsx`
**Problema:** O formulário não combina corretamente os campos de data e hora,
enviando `scheduledAt` vazio ou inválido para a API, que retorna 400.
**Correção:** Refatorar o componente `NewRidePage` com:
- State separado para data e hora: `const [date, setDate] = useState('')` e `const [time, setTime] = useState('10:00')`
- Combinar no submit: `scheduledAt: new Date(`${date}T${time}:00`).toISOString()`
- Validação antes do submit: verificar se date e time estão preenchidos quando !isImmediate
- Validação: scheduledAt não pode ser no passado

### Bug 3 — NewRidePage — origem hardcoded (PRIORIDADE MÉDIA)
**Arquivo:** `apps/web/src/pages/sindico/index.tsx`
**Problema:** A origem está hardcoded como "Rua das Palmeiras, 320". Deve vir
dos dados do condomínio do síndico logado.
**Correção:** Buscar dados do síndico via `/api/sindicos/me` e usar
`sindico.condominiumAddress` e `sindico.condominiumDistrict` como origem padrão.
Usar React Query: `useQuery({ queryKey: ['sindico', 'me'], queryFn: () => api.get('/api/sindicos/me') })`

---

## Integrações Pendentes de Implementar

### Google Maps (OBRIGATÓRIO)
**Variável de ambiente:** `VITE_GOOGLE_MAPS_API_KEY` (frontend) e `GOOGLE_MAPS_API_KEY` (backend)

**Frontend — o que implementar:**
1. Componente `MapView` em `apps/web/src/components/map/MapView.tsx`
   - Usar `@react-google-maps/api` ou Google Maps JavaScript API direta
   - Exibir mapa com pins de origem e destino
   - Desenhar polyline da rota calculada
   - No acompanhamento, atualizar posição do motorista em tempo real via Socket.io

2. Componente `AddressAutocomplete` em `apps/web/src/components/map/AddressAutocomplete.tsx`
   - Input com autocomplete usando Google Places API
   - Filtrar sugestões para Londrina, PR (location bias)
   - Retornar endereço formatado + lat/lng ao selecionar

3. Tela `NewRidePage` — integrar mapa e autocomplete:
   - Campo de destino com autocomplete
   - Mapa mostrando rota calculada antes de confirmar
   - Exibir distância e tempo estimado calculados

**Backend — o que implementar:**
1. Service `apps/api/src/shared/utils/maps.service.ts`
   - Usar `@googlemaps/google-maps-services-js`
   - `calculateRoute(origin, destination)` — retorna distância, duração e polyline
   - `geocodeAddress(address)` — retorna lat/lng de um endereço
   - Validar se origem e destino estão dentro de Londrina (bounding box)

2. Integrar no `ride.routes.ts` ao criar corrida:
   - Chamar `calculateRoute` com as coordenadas
   - Salvar `estimatedDistanceKm`, `estimatedDurationMin` e `polyline` na corrida

### Firebase FCM (PRIORIDADE MÉDIA)
**Arquivo:** `apps/api/src/shared/utils/fcm.service.ts`
- Implementar `sendPushNotification(userId, title, body, data)`
- Integrar no módulo de notificações
- Frontend deve registrar o FCM token ao fazer login

---

## Regras de Negócio Importantes

1. **Corridas são 100% gratuitas** — nunca mostrar valor, nunca cobrar
2. **Síndico deve estar ATIVO** para agendar corridas (não PENDENTE/BLOQUEADO)
3. **Um síndico só pode ter uma corrida ativa por vez** (AGENDADA, ACEITA ou EM_ANDAMENTO)
4. **Motoristas são cadastrados apenas pelo admin** — não há auto-cadastro de motoristas
5. **Cancelamento**: síndico e motorista podem cancelar apenas corridas AGENDADAS ou ACEITAS
6. **Avaliação**: síndico só pode avaliar corridas CONCLUÍDAS e que ainda não foram avaliadas
7. **Área de cobertura**: apenas Londrina e região metropolitana
8. **Aprovação manual**: todo cadastro de síndico passa por aprovação do admin antes de ter acesso
9. **Refresh token rotativo**: ao renovar, o token antigo é revogado e um novo é gerado
10. **Auditoria**: ações administrativas sensíveis devem ser registradas no AuditLog

---

## Ambiente Local

### Containers rodando
- `sindiride_postgres` — PostgreSQL 16 + PostGIS na porta 5432
- `sindiride_redis` — Redis 7 na porta 6379
- `sindiride_api` — API Fastify na porta 3333

### URLs
- Frontend: http://localhost:5173
- API: http://localhost:3333
- Health check: http://localhost:3333/health

### Comandos úteis
```bash
make up          # sobe os containers
make down        # para os containers
make logs-api    # logs da API em tempo real
make migrate     # roda migrations do Prisma
make seed        # popula o banco com dados de teste
make shell-api   # entra no container da API
make shell-db    # abre o psql
```

### Credenciais de teste
- Admin:     admin@sindiride.com.br    / admin@123     (CPF: 000.000.000-00)
- Síndico:   carlos.oliveira@email.com / sindico@123  (CPF: 987.654.321-00)
- Motorista: joao.ferreira@sindiride.com.br / motorista@123

### Variáveis de ambiente (.env na raiz)
```
POSTGRES_DB=sindiride
POSTGRES_USER=sindiride
POSTGRES_PASSWORD=sindiride@123
DATABASE_URL="postgresql://sindiride:sindiride@123@postgres:5432/sindiride"
REDIS_PASSWORD=sindiride@123
REDIS_URL="redis://:sindiride@123@redis:6379"
NODE_ENV=development
PORT=3333
JWT_SECRET=sindiride_jwt_secret_chave_super_segura_32chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=sindiride_refresh_secret_chave_super_segura_32chars
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGINS=http://localhost:5173
GOOGLE_MAPS_API_KEY=           # preencher com chave real
FIREBASE_PROJECT_ID=           # preencher
FIREBASE_PRIVATE_KEY=          # preencher
FIREBASE_CLIENT_EMAIL=         # preencher
VITE_API_URL=http://localhost:3333
VITE_SOCKET_URL=http://localhost:3333
VITE_GOOGLE_MAPS_API_KEY=      # preencher com chave real
```

---

## Próximos Passos (em ordem de prioridade)

1. Corrigir Bug 1 (AdminSindicosPage) e Bug 2 (NewRidePage scheduledAt)
2. Corrigir Bug 3 (origem do síndico dinâmica)
3. Implementar integração Google Maps (componentes MapView e AddressAutocomplete)
4. Integrar cálculo de rota no backend ao criar corrida
5. Implementar rastreamento em tempo real do motorista
6. Implementar Firebase FCM para push notifications
7. Adicionar tela de gestão de motoristas no admin
8. Implementar relatórios e exportação CSV
9. Testes automatizados (Vitest + Testing Library)
10. CI/CD com GitHub Actions
11. Deploy no Railway

---

## Identidade Visual

- Estilo: moderno e minimalista (inspirado no Uber/99)
- Cor primária: azul institucional (#185FA5)
- Interface mobile-first para síndico (bottom navigation)
- Interface desktop para admin (sidebar navigation)
- Ícones: Lucide React
- Tipografia: Inter
