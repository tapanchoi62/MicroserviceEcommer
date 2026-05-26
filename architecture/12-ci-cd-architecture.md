# CI/CD Architecture

## Pipeline Flow

```text
Git Push
   ↓
Lint
   ↓
Unit Test
   ↓
Integration Test
   ↓
Security Scan
   ↓
Docker Build
   ↓
Push Registry
   ↓
Deploy Kubernetes
   ↓
Health Check
```

## Tools

- GitHub Actions
- Docker
- Kubernetes
- Helm

## Deployment Strategy

- Rolling Update
- Blue/Green Deployment
- Canary Release
