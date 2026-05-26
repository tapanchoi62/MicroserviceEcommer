# Inventory Service

## Responsibilities

- Stock Management
- Warehouse Management
- Inventory Reservation
- Stock Transactions

## Reservation Flow

```text
Order Created
    ↓
Reserve Stock
    ↓
Payment Success
    ↓
Commit Stock
```

## Database Tables

```sql
inventories
inventory_transactions
warehouses
stock_reservations
```

## Events

```text
InventoryReserved
InventoryReleased
InventoryUpdated
```
