import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { COMMISSION_RATES } from '@/lib/constants';

/**
 * Lemon Squeezy Webhook Handler
 * Receives payment confirmations and creates orders
 * 
 * TODO: When API keys are available:
 * 1. Verify webhook signature
 * 2. Extract order details from payload
 * 3. Create order in database
 * 4. Update seller balance
 * 5. Send confirmation email
 */
export async function POST(req: Request) {
  try {
    // Get webhook signature for verification
    const signature = req.headers.get('X-Signature');
    const webhookSecret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

    // TODO: Verify signature when API keys are available
    // if (!verifySignature(signature, body, webhookSecret)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    const body = await req.json();
    const { meta, data } = body;

    // Handle different event types
    switch (meta?.event_name) {
      case 'order_created':
        await handleOrderCreated(data);
        break;

      case 'order_refunded':
        await handleOrderRefunded(data);
        break;

      default:
        console.log('Unhandled webhook event:', meta?.event_name);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle order_created event
 * Creates order in database and unlocks content
 */
async function handleOrderCreated(data: {
  id: string;
  attributes: {
    total: number;
    currency: string;
    status: string;
    first_order_item: {
      product_id: number;
      variant_id: number;
    };
    user_email: string;
    meta?: {
      prompt_id?: string;
      buyer_id?: string;
      seller_id?: string;
    };
  };
}) {
  const supabase = await createClient();

  // Extract order details
  const {
    id: lemonOrderId,
    attributes: {
      total,
      currency,
      status,
      user_email,
      meta: customData,
    },
  } = data;

  // Validate required custom data
  if (!customData?.prompt_id || !customData?.buyer_id || !customData?.seller_id) {
    console.error('Missing custom data in order:', lemonOrderId);
    return;
  }

  const { prompt_id, buyer_id, seller_id } = customData;

  // Calculate commission (20% platform, 80% seller)
  const amount = total / 100; // Lemon Squeezy sends cents
  const platformFee = amount * COMMISSION_RATES.PLATFORM;
  const sellerAmount = amount * COMMISSION_RATES.SELLER;

  // Create order record
  const { error: orderError } = await supabase.from('orders').insert({
    buyer_id,
    prompt_id,
    amount,
    seller_amount: sellerAmount,
    platform_fee: platformFee,
    status: 'completed',
    payment_provider: 'lemon_squeezy',
    payment_id: lemonOrderId,
  });

  if (orderError) {
    console.error('Failed to create order:', orderError);
    return;
  }

  // Update prompt sales count
  await supabase.rpc('increment_purchase_count', { prompt_id });

  // Update seller balance
  const { error: balanceError } = await supabase
    .from('profiles')
    .update({
      balance: supabase.rpc('increment_balance', {
        user_id: seller_id,
        amount: sellerAmount,
      }),
    })
    .eq('id', seller_id);

  if (balanceError) {
    console.error('Failed to update seller balance:', balanceError);
  }

  // TODO: Send confirmation email
  // await sendOrderConfirmationEmail(user_email, prompt_id, amount);

  console.log('Order created successfully:', lemonOrderId);
}

/**
 * Handle order_refunded event
 * Updates order status and reverses balance changes
 */
async function handleOrderRefunded(data: {
  id: string;
  attributes: {
    meta?: {
      prompt_id?: string;
      seller_id?: string;
    };
  };
}) {
  const supabase = await createClient();

  const lemonOrderId = data.id;

  // Update order status
  const { error } = await supabase
    .from('orders')
    .update({ status: 'refunded' })
    .eq('payment_id', lemonOrderId);

  if (error) {
    console.error('Failed to update refunded order:', error);
    return;
  }

  // TODO: Reverse seller balance
  // TODO: Decrement purchase count
  // TODO: Send refund notification email

  console.log('Order refunded:', lemonOrderId);
}

/**
 * Verify webhook signature
 * TODO: Implement when API keys are available
 */
function verifySignature(
  signature: string | null,
  body: string,
  secret: string | undefined
): boolean {
  if (!signature || !secret) return false;

  // TODO: Implement HMAC verification
  // const hmac = crypto.createHmac('sha256', secret);
  // hmac.update(body);
  // const expectedSignature = hmac.digest('hex');
  // return crypto.timingSafeEqual(
  //   Buffer.from(signature),
  //   Buffer.from(expectedSignature)
  // );

  return true; // Placeholder - always returns true until implemented
}
