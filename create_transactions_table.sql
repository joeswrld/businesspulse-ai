-- Migration: Create transactions table
-- Description: Creates a table to store payment transaction history
-- Date: 2024-01-XX

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing table if it exists (for idempotency)
DROP TABLE IF EXISTS transactions CASCADE;

-- Create the transactions table
CREATE TABLE transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    paystack_transaction_id VARCHAR(255) UNIQUE,
    amount INTEGER NOT NULL, -- Amount in kobo (smallest currency unit)
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('success', 'pending', 'failed')),
    description TEXT,
    invoice_url TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_paystack_id ON transactions(paystack_transaction_id);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at on row updates
DROP TRIGGER IF EXISTS trigger_update_transactions_updated_at ON transactions;
CREATE TRIGGER trigger_update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_transactions_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (for idempotency)
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;

-- Create RLS policies
-- Policy for SELECT: Users can only view their own transactions
CREATE POLICY "Users can view their own transactions" ON transactions
    FOR SELECT
    USING (user_id = auth.uid());

-- Policy for INSERT: Users can only insert their own transactions
CREATE POLICY "Users can insert their own transactions" ON transactions
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Policy for UPDATE: Users can only update their own transactions
CREATE POLICY "Users can update their own transactions" ON transactions
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Create a function to create a new transaction
CREATE OR REPLACE FUNCTION create_transaction(
    p_user_id UUID,
    p_paystack_transaction_id VARCHAR(255),
    p_amount INTEGER,
    p_currency VARCHAR(3) DEFAULT 'NGN',
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS transactions AS $$
DECLARE
    new_transaction transactions;
BEGIN
    INSERT INTO transactions (
        user_id,
        paystack_transaction_id,
        amount,
        currency,
        description,
        metadata
    ) VALUES (
        p_user_id,
        p_paystack_transaction_id,
        p_amount,
        p_currency,
        p_description,
        p_metadata
    )
    RETURNING * INTO new_transaction;
    
    RETURN new_transaction;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to update transaction status
CREATE OR REPLACE FUNCTION update_transaction_status(
    p_paystack_transaction_id VARCHAR(255),
    p_status VARCHAR(20),
    p_invoice_url TEXT DEFAULT NULL
)
RETURNS transactions AS $$
DECLARE
    updated_transaction transactions;
BEGIN
    UPDATE transactions 
    SET 
        status = p_status,
        invoice_url = COALESCE(p_invoice_url, invoice_url),
        updated_at = NOW()
    WHERE paystack_transaction_id = p_paystack_transaction_id
    RETURNING * INTO updated_transaction;
    
    RETURN updated_transaction;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON transactions TO authenticated;
GRANT EXECUTE ON FUNCTION create_transaction(UUID, VARCHAR(255), INTEGER, VARCHAR(3), TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_transaction_status(VARCHAR(255), VARCHAR(20), TEXT) TO authenticated;

-- Insert comment for documentation
COMMENT ON TABLE transactions IS 'Stores payment transaction history for users';
COMMENT ON COLUMN transactions.user_id IS 'References the user from auth.users';
COMMENT ON COLUMN transactions.paystack_transaction_id IS 'Unique transaction ID from Paystack';
COMMENT ON COLUMN transactions.amount IS 'Transaction amount in kobo (smallest currency unit)';
COMMENT ON COLUMN transactions.currency IS 'Currency code (e.g., NGN for Nigerian Naira)';
COMMENT ON COLUMN transactions.status IS 'Transaction status: success, pending, or failed';
COMMENT ON COLUMN transactions.invoice_url IS 'URL to download the invoice PDF';
COMMENT ON COLUMN transactions.metadata IS 'Additional transaction metadata from Paystack';

-- Verify the migration
DO $$
BEGIN
    -- Check if table exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transactions') THEN
        RAISE EXCEPTION 'Table transactions was not created successfully';
    END IF;
    
    -- Check if RLS is enabled
    IF NOT EXISTS (
        SELECT FROM pg_tables 
        WHERE tablename = 'transactions' 
        AND rowsecurity = true
    ) THEN
        RAISE EXCEPTION 'Row Level Security is not enabled on transactions table';
    END IF;
    
    -- Check if policies exist
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'transactions' 
        AND policyname = 'Users can view their own transactions'
    ) THEN
        RAISE EXCEPTION 'RLS policies were not created successfully';
    END IF;
    
    RAISE NOTICE 'Migration completed successfully!';
END $$;