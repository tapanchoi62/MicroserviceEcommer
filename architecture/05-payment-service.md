# Payment Service

## Responsibilities

- Payment Processing
- Refund Processing
- Payment Verification
- Webhook Handling

## Payment Providers

- Stripe
- PayPal
- VNPay
- Momo
- ZaloPay

## Payment Flow

```text
Create Payment Intent
    ↓
Redirect User
    ↓
Webhook Callback
    ↓
Verify Signature
    ↓
Publish Payment Event
```

## Security

- Signature Verification
- PCI Compliance
- Idempotency
- Fraud Detection
