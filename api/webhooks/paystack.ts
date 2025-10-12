import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    // Verify Paystack signature
    const hash = crypto
      .createHmac('sha512', paystackSecretKey)
      .update(JSON.stringify(req.body))
      .digest('hex')

    if (hash !== req.headers['x-paystack-signature']) {
      console.error('Invalid Paystack signature')
      return res.status(400).json({ message: 'Invalid signature' })
    }

    const event = req.body
    console.log('Paystack webhook event:', event.event)

    // Handle different event types
    switch (event.event) {
      case 'subscription.create':
        await handleSubscriptionCreate(event.data)
        break
      
      case 'charge.success':
        await handleChargeSuccess(event.data)
        break
      
      case 'subscription.disable':
        await handleSubscriptionDisable(event.data)
        break
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data)
        break
      
      default:
        console.log('Unhandled event type:', event.event)
    }

    // Log the event
    await supabase
      .from('payment_logs')
      .insert({
        user_id: event.data.customer?.email || 'unknown',
        event_type: event.event,
        paystack_reference: event.data.reference,
        amount: event.data.amount ? event.data.amount / 100 : null,
        status: 'processed',
        metadata: event.data
      })

    res.status(200).json({ message: 'Webhook processed successfully' })
  } catch (error) {
    console.error('Webhook error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

async function handleSubscriptionCreate(data: any) {
  try {
    const email = data.customer?.email
    if (!email) return

    // Find user by email
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (!profile) return

    // Update subscription status
    await supabase
      .from('profiles')
      .update({
        subscription_status: 'active',
        plan_type: 'pro',
        paystack_customer_code: data.customer?.customer_code,
        paystack_subscription_code: data.subscription_code
      })
      .eq('id', profile.id)

    console.log('Subscription created for user:', email)
  } catch (error) {
    console.error('Error handling subscription create:', error)
  }
}

async function handleChargeSuccess(data: any) {
  try {
    const email = data.customer?.email
    if (!email) return

    // Find user by email
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (!profile) return

    // Update subscription status
    await supabase
      .from('profiles')
      .update({
        subscription_status: 'active',
        plan_type: 'pro',
        paystack_customer_code: data.customer?.customer_code,
        paystack_authorization_code: data.authorization?.authorization_code
      })
      .eq('id', profile.id)

    console.log('Charge successful for user:', email)
  } catch (error) {
    console.error('Error handling charge success:', error)
  }
}

async function handleSubscriptionDisable(data: any) {
  try {
    const email = data.customer?.email
    if (!email) return

    // Find user by email
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (!profile) return

    // Update subscription status
    await supabase
      .from('profiles')
      .update({
        subscription_status: 'cancelled'
      })
      .eq('id', profile.id)

    console.log('Subscription disabled for user:', email)
  } catch (error) {
    console.error('Error handling subscription disable:', error)
  }
}

async function handlePaymentFailed(data: any) {
  try {
    const email = data.customer?.email
    if (!email) return

    // Find user by email
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (!profile) return

    // Update subscription status
    await supabase
      .from('profiles')
      .update({
        subscription_status: 'failed'
      })
      .eq('id', profile.id)

    // Create notification
    await supabase
      .from('notifications')
      .insert({
        user_id: profile.id,
        type: 'payment_failed',
        title: 'Payment Failed',
        message: 'There was an issue with your payment. Please update your billing information.'
      })

    console.log('Payment failed for user:', email)
  } catch (error) {
    console.error('Error handling payment failed:', error)
  }
}