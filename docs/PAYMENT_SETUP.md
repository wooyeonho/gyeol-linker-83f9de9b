# Payment Integration Guide - Lemon Squeezy

This guide documents the payment integration setup for Prompt Jeongeom marketplace.

## 1. Account Setup

1. Create account at https://lemonsqueezy.com
2. Add business information (company name, address, tax ID)
3. Connect bank account for payouts
4. Enable test mode for development

## 2. API Configuration

### Environment Variables

Add these to your `.env.local` file:

```env
# Lemon Squeezy API
LEMON_SQUEEZY_API_KEY=your_api_key_here
LEMON_SQUEEZY_STORE_ID=your_store_id
LEMON_SQUEEZY_WEBHOOK_SECRET=your_webhook_secret

# App URL (for redirects)
NEXT_PUBLIC_SITE_URL=https://prompt-jeongeum.com
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/checkouts` | POST | Create checkout session |
| `/v1/orders/:id` | GET | Get order details |
| `/api/webhooks/lemon` | POST | Receive webhook events |

## 3. Order Flow

```
1. User clicks "Buy Now"
   ↓
2. Create Lemon Squeezy checkout (API call)
   ↓
3. Redirect user to payment page
   ↓
4. User completes payment
   ↓
5. Webhook receives confirmation
   ↓
6. Create order in database (status: 'completed')
   ↓
7. Send confirmation email
   ↓
8. Unlock content for buyer
```

## 4. Commission Structure

| Party | Percentage | Example ($29.99) |
|-------|------------|------------------|
| Seller | 80% | $23.99 |
| Platform | 20% | $6.00 |

Commission is calculated using `lib/utils/currency.ts`:
```typescript
import { calculateEarnings } from '@/lib/utils/currency';

const { sellerEarnings, platformFee } = calculateEarnings(29.99);
// sellerEarnings: 23.99
// platformFee: 6.00
```

## 5. Webhook Handler

Location: `app/api/webhooks/lemon/route.ts`

### Supported Events

- `order_created` - New purchase completed
- `order_refunded` - Refund processed
- `subscription_created` - (Future) Subscription started
- `subscription_cancelled` - (Future) Subscription ended

### Security

Always verify webhook signatures:
```typescript
const signature = req.headers.get('X-Signature');
const isValid = verifyWebhookSignature(signature, body, WEBHOOK_SECRET);
```

## 6. Database Updates

When order is confirmed:

```sql
-- Create order record
INSERT INTO orders (
  buyer_id,
  prompt_id,
  amount,
  seller_amount,
  platform_fee,
  status,
  payment_provider,
  payment_id
) VALUES (
  :buyer_id,
  :prompt_id,
  :amount,
  :seller_amount,
  :platform_fee,
  'completed',
  'lemon_squeezy',
  :lemon_order_id
);

-- Update prompt sales count
UPDATE prompts
SET purchase_count = purchase_count + 1
WHERE id = :prompt_id;

-- Update seller balance
UPDATE profiles
SET balance = balance + :seller_amount
WHERE id = :seller_id;
```

## 7. Testing Checklist

### Development (Test Mode)

- [ ] Test mode enabled in Lemon Squeezy dashboard
- [ ] Test API key configured
- [ ] Webhook endpoint accessible (use ngrok for local)
- [ ] Test card: 4242 4242 4242 4242

### Pre-Production

- [ ] Live API key configured
- [ ] Webhook secret rotated
- [ ] SSL certificate valid
- [ ] Error logging enabled

### Production

- [ ] Test purchase with real card
- [ ] Verify webhook receives events
- [ ] Verify order created in database
- [ ] Verify content unlocks
- [ ] Verify seller balance updates
- [ ] Verify email confirmation sent
- [ ] Test refund flow

## 8. Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Invalid API key | Check LEMON_SQUEEZY_API_KEY |
| `404 Not Found` | Invalid store ID | Check LEMON_SQUEEZY_STORE_ID |
| `400 Bad Request` | Invalid checkout data | Verify product/variant IDs |
| `Webhook signature invalid` | Wrong secret | Rotate LEMON_SQUEEZY_WEBHOOK_SECRET |

### Retry Logic

Implement exponential backoff for failed API calls:
```typescript
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

async function createCheckoutWithRetry(data) {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      return await createCheckout(data);
    } catch (error) {
      if (i === MAX_RETRIES - 1) throw error;
      await sleep(RETRY_DELAY * Math.pow(2, i));
    }
  }
}
```

## 9. Future Enhancements

- [ ] Subscription support for prompt bundles
- [ ] Multi-currency support (KRW, EUR)
- [ ] Automatic payout to sellers
- [ ] Refund automation
- [ ] Fraud detection

## 10. Support

For payment issues:
- Lemon Squeezy Support: https://lemonsqueezy.com/help
- Platform Support: support@prompt-jeongeum.com
