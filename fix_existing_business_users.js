// Fix for existing Business plan users
// Run this in browser console to restore access

console.log('🔧 Fixing existing Business plan users...');

// Get current user ID
const userId = localStorage.getItem('supabase.auth.token') ? 
  JSON.parse(localStorage.getItem('supabase.auth.token')).user?.id : 
  null;

if (!userId) {
  console.log('❌ No user ID found. Please log in first.');
} else {
  console.log('✅ User ID found:', userId);
  
  // Set Business plan in localStorage
  const businessKey = `business_${userId}`;
  localStorage.setItem(businessKey, JSON.stringify({
    isActive: true,
    upgraded: new Date().toISOString(),
    fixed: true
  }));
  
  console.log('✅ Business plan status set in localStorage');
  console.log('✅ Please refresh the page to see changes');
  
  // Force page refresh
  setTimeout(() => {
    window.location.reload();
  }, 1000);
}