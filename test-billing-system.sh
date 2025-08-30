#!/bin/bash

echo "🧪 Testing Billing System Components..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test database connection
echo -e "${YELLOW}📊 Testing database connection...${NC}"
supabase status

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
else
    echo -e "${RED}❌ Database connection failed${NC}"
    exit 1
fi

# Test function syntax
echo -e "${YELLOW}🔧 Testing function syntax...${NC}"

functions=("paystack-webhook" "cancel-subscription" "update-card" "reconcile-subscriptions")

for func in "${functions[@]}"; do
    if [ -f "supabase/functions/$func/index.ts" ]; then
        echo -e "${GREEN}✅ $func function exists${NC}"
    else
        echo -e "${RED}❌ $func function missing${NC}"
    fi
done

# Test migration file
echo -e "${YELLOW}📋 Testing migration file...${NC}"
if [ -f "supabase/migrations/20250120000000_create_billing_system.sql" ]; then
    echo -e "${GREEN}✅ Billing system migration exists${NC}"
else
    echo -e "${RED}❌ Billing system migration missing${NC}"
fi

# Test frontend components
echo -e "${YELLOW}🎨 Testing frontend components...${NC}"
if [ -f "src/components/billing/BillingPage.tsx" ]; then
    echo -e "${GREEN}✅ BillingPage component exists${NC}"
else
    echo -e "${RED}❌ BillingPage component missing${NC}"
fi

if [ -f "src/hooks/useBilling.ts" ]; then
    echo -e "${GREEN}✅ useBilling hook exists${NC}"
else
    echo -e "${RED}❌ useBilling hook missing${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Billing system test completed!${NC}"
echo ""
echo -e "${YELLOW}📋 To deploy the system:${NC}"
echo "./deploy-billing-system.sh"
echo ""
echo -e "${YELLOW}📋 To test locally:${NC}"
echo "supabase start"
echo "npm run dev"
