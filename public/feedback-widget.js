(function() {
  // Get project ID from script tag
  const scriptTag = document.currentScript;
  const projectId = scriptTag.getAttribute("data-project-id") || "default";

  // Create floating button
  const button = document.createElement("button");
  button.innerText = "Give Feedback";
  button.style.position = "fixed";
  button.style.bottom = "20px";
  button.style.right = "20px";
  button.style.padding = "12px 16px";
  button.style.backgroundColor = "#2563eb"; // your brand blue
  button.style.color = "white";
  button.style.border = "none";
  button.style.borderRadius = "8px";
  button.style.cursor = "pointer";
  button.style.zIndex = "9999";

  // On click → open iframe
  button.onclick = function() {
    const iframe = document.createElement("iframe");
    iframe.src = `https://notex.com.ng/feedback-form?project=${projectId}`;
    iframe.style.position = "fixed";
    iframe.style.bottom = "80px";
    iframe.style.right = "20px";
    iframe.style.width = "400px";
    iframe.style.height = "500px";
    iframe.style.border = "1px solid #ddd";
    iframe.style.borderRadius = "12px";
    iframe.style.zIndex = "10000";
    iframe.style.background = "#fff";

    document.body.appendChild(iframe);
  };

  // Inject into page
  document.addEventListener("DOMContentLoaded", function() {
    document.body.appendChild(button);
  });
})();
