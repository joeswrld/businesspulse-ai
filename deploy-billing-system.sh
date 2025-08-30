#!/bin/bash

echo "🚀 Deploying Production-Ready Billing System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found. Please install it first:${NC}"
    echo "npm install -g supabase"
    exit 1
fi

echo -e "${YELLOW}📊 Applying database migrations...${NC}"
supabase db push

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database migrations applied successfully${NC}"
else
    echo -e "${RED}❌ Database migration failed${NC}"
    exit 1
fi

echo -e "${YELLOW}🚀 Deploying Edge Functions...${NC}"

# Deploy all functions
functions=("paystack-webhook" "cancel-subscription" "update-card" "reconcile-subscriptions")

for func in "${functions[@]}"; do
    echo -e "${YELLOW}Deploying $func...${NC}"
    supabase functions deploy $func
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $func deployed successfully${NC}"
    else
        echo -e "${RED}❌ $func deployment failed${NC}"
        exit 1
    fi
done

echo -e "${GREEN}🎉 Billing system deployed successfully!${NC}"
echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "1. Set environment variables in Supabase dashboard"
echo "2. Configure Paystack webhook URL"
echo "3. Test the system with a test payment"
echo "4. Monitor webhook delivery and function logs"
echo ""
echo -e "${YELLOW}🔗 Useful commands:${NC}"
echo "• View function logs: supabase functions logs paystack-webhook"
echo "• Check database: supabase db reset"
echo "• Local development: supabase start"
echo ""
echo -e "${GREEN}✨ Your production-ready billing system is now live!${NC}"
