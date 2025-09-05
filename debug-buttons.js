// Debug script to check button functionality
console.log('🔍 Debugging Button Issues...');

// Check if functions exist
console.log('handleUpdateCard exists:', typeof handleUpdateCard);
console.log('handleCancelSubscription exists:', typeof handleCancelSubscription);

// Check billing profile data
console.log('billingProfile:', billingProfile);
console.log('billingProfile?.paystack_customer_id:', billingProfile?.paystack_customer_id);
console.log('billingProfile?.paystack_subscription_id:', billingProfile?.paystack_subscription_id);

// Check if buttons are rendered
const updateButton = document.querySelector('button[onclick*="handleUpdateCard"]');
const cancelButton = document.querySelector('button[onclick*="handleCancelSubscription"]');

console.log('Update Payment Method button found:', !!updateButton);
console.log('Cancel Subscription button found:', !!cancelButton);

// Check button states
if (updateButton) {
    console.log('Update button disabled:', updateButton.disabled);
    console.log('Update button text:', updateButton.textContent);
}

if (cancelButton) {
    console.log('Cancel button disabled:', cancelButton.disabled);
    console.log('Cancel button text:', cancelButton.textContent);
}

// Check for any console errors
console.log('🔍 Button debugging complete');