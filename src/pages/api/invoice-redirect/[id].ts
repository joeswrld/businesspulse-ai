import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    console.log(`[${new Date().toISOString()}] Method not allowed: ${req.method}`);
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { id } = req.query;
    console.log(`[${new Date().toISOString()}] Processing invoice redirect request for transaction: ${id}`);

    // Validate transaction ID
    if (!id || typeof id !== 'string') {
      console.log(`[${new Date().toISOString()}] Invalid transaction ID: ${id}`);
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction ID'
      });
    }

    // Get authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log(`[${new Date().toISOString()}] Missing or invalid authorization header`);
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Missing or invalid token'
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.log(`[${new Date().toISOString()}] Authentication failed:`, authError?.message);
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Invalid token'
      });
    }

    console.log(`[${new Date().toISOString()}] Authenticated user: ${user.id}`);

    // Query transactions table to get the invoice_url for the given id and user_id
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('id, invoice_url, amount, currency, status, created_at')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (transactionError || !transaction) {
      console.log(`[${new Date().toISOString()}] Transaction not found:`, transactionError?.message);
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    console.log(`[${new Date().toISOString()}] Found transaction: ${transaction.id}, status: ${transaction.status}`);

    // Check if transaction has an invoice URL
    if (!transaction.invoice_url) {
      console.log(`[${new Date().toISOString()}] No invoice URL found for transaction: ${transaction.id}`);
      return res.status(404).json({
        success: false,
        error: 'No invoice available for this transaction'
      });
    }

    // Check if transaction is successful (optional validation)
    if (transaction.status !== 'success') {
      console.log(`[${new Date().toISOString()}] Transaction not successful: ${transaction.status}`);
      return res.status(400).json({
        success: false,
        error: 'Invoice only available for successful transactions'
      });
    }

    console.log(`[${new Date().toISOString()}] Redirecting to invoice URL for transaction: ${transaction.id}`);

    // Redirect to the invoice URL
    return res.redirect(transaction.invoice_url);

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Unexpected error:`, error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}