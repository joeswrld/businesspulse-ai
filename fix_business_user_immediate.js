// IMMEDIATE FIX for Business Plan Users
// Run this in your browser console to fix your account

console.log('🔧 Fixing Business Plan User Account...');

// Get current user ID
const userId = localStorage.getItem('supabase.auth.token') ? 
  JSON.parse(localStorage.getItem('supabase.auth.token')).user?.id : 
  null;

if (!userId) {
  console.log('❌ No user ID found. Please log in first.');
} else {
  console.log('✅ User ID found:', userId);
  
  // Force set Business plan in localStorage
  const businessKey = `business_${userId}`;
  const businessData = {
    isActive: true,
    upgraded: new Date().toISOString(),
    plan: 'business',
    fixed: true,
    created: new Date().toISOString()
  };
  
  localStorage.setItem(businessKey, JSON.stringify(businessData));
  console.log('✅ Business plan status set in localStorage:', businessData);
  
  // Also set trial data to business
  const trialKey = `trial_${userId}`;
  const trialData = {
    trialEnd: new Date().toISOString(), // Set to now for business users
    created: new Date().toISOString(),
    plan: 'business',
    isActive: true
  };
  
  localStorage.setItem(trialKey, JSON.stringify(trialData));
  console.log('✅ Trial data updated for business user:', trialData);
  
  // Clear any old data
  localStorage.removeItem(`trial_${userId}_old`);
  localStorage.removeItem(`business_${userId}_old`);
  
  console.log('✅ Account fixed! Please refresh the page.');
  console.log('🔄 Refreshing page in 2 seconds...');
  
  // Force page refresh
  setTimeout(() => {
    window.location.reload();
  }, 2000);
}