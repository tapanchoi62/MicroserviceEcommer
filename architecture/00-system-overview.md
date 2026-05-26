# System Overview

## High Level Architecture

```text
Client Apps
    ↓
API Gateway
    ↓
--------------------------------------
Auth Service
User Service
Product Service
Cart Service
Order Service
Inventory Service
Payment Service
Shipping Service
Search Service
Notification Service
--------------------------------------
    ↓
Kafka Event Bus
    ↓
--------------------------------------
PostgreSQL
Redis
Elasticsearch
S3 Storage
--------------------------------------
    ↓
Kubernetes Cluster
```

## System Goals

- High availability
- Horizontal scalability
- Fault isolation
- Independent deployment
- Fast CI/CD
- Event-driven communication

## Communication Strategy

### Synchronous

- REST API
- gRPC

### Asynchronous

- Kafka Events

## Main Design Patterns

- Saga Pattern
- CQRS
- Outbox Pattern
- Circuit Breaker
- API Composition
