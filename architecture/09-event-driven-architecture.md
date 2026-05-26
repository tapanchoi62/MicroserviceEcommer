# Event Driven Architecture

## Message Broker

- Apache Kafka

## Main Events

```text
UserRegistered
ProductCreated
OrderCreated
PaymentSucceeded
InventoryReserved
ShipmentCreated
```

## Event Flow Example

```text
User Checkout
    ↓
OrderCreated Event
    ↓
Inventory Service
    ↓
Payment Service
    ↓
Shipping Service
    ↓
Notification Service
```

## Benefits

- Loose coupling
- Better scalability
- Fault tolerance
- Async processing
