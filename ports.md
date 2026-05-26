# 🗺️ Local Development Port Map

Tổng hợp tất cả port dùng khi chạy local (NODE_ENV=development).

---

## 🖥️ Application Services

| Service             | HTTP Port | gRPC Port | URL                              |
| ------------------- | --------- | --------- | -------------------------------- |
| Frontend (Next.js)  | **3000**  | —         | http://localhost:3000            |
| API Gateway         | **3100**  | —         | http://localhost:3100            |
| Auth Service        | **3001**  | 50051     | http://localhost:3001/api/v1     |
| Product Service     | **3002**  | 50052     | http://localhost:3002/api/v1     |
| Order Service       | **3003**  | 50053     | http://localhost:3003/api/v1     |
| Inventory Service   | **3004**  | 50054     | http://localhost:3004/api/v1     |
| Payment Service     | **3005**  | 50055     | http://localhost:3005/api/v1     |
| Cart Service        | **3006**  | 50056     | http://localhost:3006/api/v1     |
| Search Service      | **3007**  | 50057     | http://localhost:3007/api/v1     |
| Notification Service| **3008**  | 50058     | http://localhost:3008/api/v1     |
| Shipping Service    | **3009**  | 50059     | http://localhost:3009/api/v1     |

---

## 🗄️ Databases (PostgreSQL — mỗi service 1 DB riêng)

| Service             | Port     | Database Name      | Connection String                                           |
| ------------------- | -------- | ------------------ | ----------------------------------------------------------- |
| Auth Service        | **5432** | `auth_db`          | `postgresql://postgres:postgres@localhost:5432/auth_db`     |
| Product Service     | **5433** | `product_db`       | `postgresql://postgres:postgres@localhost:5433/product_db`  |
| Order Service       | **5434** | `order_db`         | `postgresql://postgres:postgres@localhost:5434/order_db`    |
| Inventory Service   | **5435** | `inventory_db`     | `postgresql://postgres:postgres@localhost:5435/inventory_db`|
| Payment Service     | **5436** | `payment_db`       | `postgresql://postgres:postgres@localhost:5436/payment_db`  |
| Notification Service| **5437** | `notification_db`  | `postgresql://postgres:postgres@localhost:5437/notification_db`|
| Shipping Service    | **5438** | `shipping_db`      | `postgresql://postgres:postgres@localhost:5438/shipping_db` |

> **Credentials mặc định local:** user=`postgres` / password=`postgres`

---

## ⚡ Cache & Message Broker

| Service         | Port      | Notes                           |
| --------------- | --------- | ------------------------------- |
| Redis           | **6379**  | Dùng chung, phân biệt bằng `DB` index (0–9) |
| Zookeeper       | **2181**  | Required by Kafka               |
| Kafka Broker    | **9092**  | Internal                        |
| Kafka (external)| **29092** | Kết nối từ host machine         |

### Redis DB Index theo service

| Service              | Redis DB |
| -------------------- | -------- |
| Auth Service         | `0`      |
| Cart Service         | `1`      |
| Product Service      | `2`      |
| Order Service        | `3`      |
| Session/General      | `4`      |

---

## 🔍 Search & Analytics

| Service       | Port      | URL                          |
| ------------- | --------- | ---------------------------- |
| Elasticsearch | **9200**  | http://localhost:9200        |
| Kibana        | **5601**  | http://localhost:5601        |

---

## 📊 Monitoring & Observability

| Service      | Port      | URL                           |
| ------------ | --------- | ----------------------------- |
| Prometheus   | **9090**  | http://localhost:9090         |
| Grafana      | **3030**  | http://localhost:3030         |
| Jaeger UI    | **16686** | http://localhost:16686        |
| Jaeger gRPC  | **14250** | —                             |
| Jaeger HTTP  | **14268** | —                             |

---

## 🛠️ Dev Tools (Admin UI)

| Tool           | Port      | URL                             | Credentials              |
| -------------- | --------- | ------------------------------- | ------------------------ |
| pgAdmin 4      | **5050**  | http://localhost:5050           | admin@local.com / admin  |
| Redis Insight  | **8001**  | http://localhost:8001           | —                        |
| Kafka UI       | **8080**  | http://localhost:8080           | —                        |

---

## 📋 Swagger Docs (mỗi service)

| Service              | Swagger URL                                        |
| -------------------- | -------------------------------------------------- |
| Auth Service         | http://localhost:3001/api/docs                     |
| Product Service      | http://localhost:3002/api/docs                     |
| Order Service        | http://localhost:3003/api/docs                     |
| Inventory Service    | http://localhost:3004/api/docs                     |
| Payment Service      | http://localhost:3005/api/docs                     |
| Cart Service         | http://localhost:3006/api/docs                     |
| Search Service       | http://localhost:3007/api/docs                     |
| Notification Service | http://localhost:3008/api/docs                     |
| Shipping Service     | http://localhost:3009/api/docs                     |

---

## 🐳 Docker Compose — Khởi động hạ tầng local

```bash
# Khởi động tất cả infrastructure
docker-compose -f docker-compose.infra.yml up -d

# Chỉ auth-service
docker-compose -f services/auth-service/docker-compose.yml up -d

# Kiểm tra status
docker ps
```

---

## ⚙️ Biến môi trường theo service

| Service              | ENV File                                    |
| -------------------- | ------------------------------------------- |
| Auth Service         | `services/auth-service/.env`                |
| Product Service      | `services/product-service/.env`             |
| Order Service        | `services/order-service/.env`               |
| Inventory Service    | `services/inventory-service/.env`           |
| Payment Service      | `services/payment-service/.env`             |
| Cart Service         | `services/cart-service/.env`                |
| Search Service       | `services/search-service/.env`              |
| Notification Service | `services/notification-service/.env`        |
| Shipping Service     | `services/shipping-service/.env`            |
