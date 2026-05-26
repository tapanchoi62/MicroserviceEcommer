# Database Architecture

## Database Per Service

| Service | Database |
|---|---|
| Auth Service | PostgreSQL |
| Product Service | PostgreSQL |
| Order Service | PostgreSQL |
| Cart Service | Redis |
| Search Service | Elasticsearch |
| Analytics Service | ClickHouse |

## Principles

- No shared database
- Independent schema
- Event-based synchronization
- Data ownership by service

## Backup Strategy

- Daily snapshot
- Point-in-time recovery
- Multi-region replication
