# Product Service

## Responsibilities

- Product Management
- SKU Management
- Category Management
- Product Variants
- Product Images
- Product Attributes

## Domain Model

```text
Product
 ├── SKU
 ├── Variant
 ├── Images
 ├── Attributes
 └── Categories
```

## Database Tables

```sql
products
product_skus
product_images
product_categories
product_attributes
brands
```

## APIs

```http
GET    /products
GET    /products/:id
POST   /products
PUT    /products/:id
DELETE /products/:id
```

## Search Integration

Sync product data to Elasticsearch.

## Events

```text
ProductCreated
ProductUpdated
ProductDeleted
```
