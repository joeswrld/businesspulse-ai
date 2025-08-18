// Simple test script to verify the Edge Function works
const testFunction = async () => {
  const functionUrl = "https://xjbrqeqizpoqdjkiyqzt.supabase.co/functions/v1/insightsAnalysis";
  
  console.log("🧪 Testing Edge Function...");
  console.log("URL:", functionUrl);
  console.log("");
  
  try {
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqYnJxZXFpenBvcWRqa2l5cXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNTAzMjcsImV4cCI6MjA3MDYyNjMyN30.cxMH9tUGYEOTUauzluSEeNyjG1iMtUZnNIj4QYGNi84",
      },
      body: JSON.stringify({
        data: "The new dashboard is amazing! I love how fast it loads."
      }),
    });

    console.log("📡 Response Status:", response.status);
    console.log("📡 Response Headers:", Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log("✅ Success!");
      console.log("📄 Response:", JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log("❌ Error Response:", errorText);
    }
  } catch (error) {
    console.log("❌ Network Error:", error.message);
  }
};

// Run the test
testFunction();