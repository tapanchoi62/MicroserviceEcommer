# Order Service

## Responsibilities

- Create Order
- Order Lifecycle
- Order Tracking
- Refund Management
- Order History

## Order State Machine

```text
PENDING
PAID
PROCESSING
SHIPPING
COMPLETED
CANCELLED
REFUNDED
```

## Database Tables

```sql
orders
order_items
order_status_logs
payments
```

## APIs

```http
POST /orders
GET  /orders/:id
GET  /orders/user/:userId
POST /orders/:id/cancel
```

## Saga Flow

```text
Create Order
 → Reserve Inventory
 → Create Payment
 → Confirm Shipment
```

## Events

```text
OrderCreated
OrderPaid
OrderCancelled
OrderCompleted
```
