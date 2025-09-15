(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    apiUrl: 'https://xjbrqeqizpoqdjkiyqzt.supabase.co',
    apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqYnJxZXFpenBvcWRqa2l5cXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNTAzMjcsImV4cCI6MjA3MDYyNjMyN30.cxMH9tUGYEOTUauzluSEeNyjG1iMtUZnNIj4QYGNi84',
    widgetId: 'notex-feedback-widget',
    buttonId: 'notex-feedback-button',
    modalId: 'notex-feedback-modal',
    overlayId: 'notex-feedback-overlay'
  };

  // Get project ID from script tag
  function getProjectId() {
    const script = document.querySelector('script[data-project-id]');
    return script ? script.getAttribute('data-project-id') : null;
  }

  // Fetch widget settings
  async function fetchWidgetSettings(projectId) {
    try {
      const response = await fetch(`${CONFIG.apiUrl}/rest/v1/feedback_settings?project_id=eq.${projectId}&select=*`, {
        headers: {
          'apikey': CONFIG.apiKey,
          'Authorization': `Bearer ${CONFIG.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch widget settings');
      }
      
      const data = await response.json();
      return data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error fetching widget settings:', error);
      return null;
    }
  }

  // Submit feedback
  async function submitFeedback(projectId, email, message) {
    try {
      const response = await fetch(`${CONFIG.apiUrl}/rest/v1/feedback`, {
        method: 'POST',
        headers: {
          'apikey': CONFIG.apiKey,
          'Authorization': `Bearer ${CONFIG.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          project_id: projectId,
          email: email || null,
          message: message
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`API Error: ${response.status}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error; // Re-throw to be handled by caller
    }
  }

  // Create widget styles
  function createStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #${CONFIG.widgetId} {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      #${CONFIG.buttonId} {
        background: #3B82F6;
        color: white;
        border: none;
        border-radius: 50px;
        padding: 12px 20px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 120px;
        justify-content: center;
      }
      
      #${CONFIG.buttonId}:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
      }
      
      #${CONFIG.overlayId} {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10001;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      
      #${CONFIG.modalId} {
        background: white;
        border-radius: 12px;
        padding: 0;
        max-width: 500px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        animation: slideIn 0.3s ease;
      }
      
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes slideOutRight {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(100%);
        }
      }
      
      .notex-modal-header {
        padding: 24px 24px 0 24px;
        border-bottom: 1px solid #e5e7eb;
        margin-bottom: 24px;
      }
      
      .notex-modal-title {
        font-size: 20px;
        font-weight: 600;
        color: #111827;
        margin: 0 0 8px 0;
      }
      
      .notex-modal-subtitle {
        font-size: 14px;
        color: #6b7280;
        margin: 0;
      }
      
      .notex-modal-body {
        padding: 0 24px 24px 24px;
      }
      
      .notex-form-group {
        margin-bottom: 20px;
      }
      
      .notex-label {
        display: block;
        font-size: 14px;
        font-weight: 500;
        color: #374151;
        margin-bottom: 6px;
      }
      
      .notex-input {
        width: 100%;
        padding: 12px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 14px;
        transition: border-color 0.2s;
        box-sizing: border-box;
      }
      
      .notex-input:focus {
        outline: none;
        border-color: #3B82F6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }
      
      .notex-textarea {
        width: 100%;
        padding: 12px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 14px;
        min-height: 100px;
        resize: vertical;
        font-family: inherit;
        transition: border-color 0.2s;
        box-sizing: border-box;
      }
      
      .notex-textarea:focus {
        outline: none;
        border-color: #3B82F6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }
      
      .notex-button {
        background: #3B82F6;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 12px 24px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
        width: 100%;
      }
      
      .notex-button:hover {
        background: #2563eb;
      }
      
      .notex-button:disabled {
        background: #9ca3af;
        cursor: not-allowed;
      }
      
      .notex-close {
        position: absolute;
        top: 16px;
        right: 16px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #6b7280;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: background-color 0.2s;
      }
      
      .notex-close:hover {
        background: #f3f4f6;
      }
      
      .notex-success {
        text-align: center;
        padding: 40px 24px;
      }
      
      .notex-success-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }
      
      .notex-success-title {
        font-size: 18px;
        font-weight: 600;
        color: #111827;
        margin: 0 0 8px 0;
      }
      
      .notex-success-message {
        font-size: 14px;
        color: #6b7280;
        margin: 0;
      }
      
      .notex-error {
        color: #dc2626;
        font-size: 12px;
        margin-top: 4px;
      }
      
      @media (max-width: 640px) {
        #${CONFIG.widgetId} {
          bottom: 16px;
          right: 16px;
        }
        
        #${CONFIG.buttonId} {
          padding: 10px 16px;
          font-size: 13px;
          min-width: 100px;
        }
        
        #${CONFIG.overlayId} {
          padding: 16px;
        }
        
        .notex-modal-header,
        .notex-modal-body {
          padding: 20px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Create widget HTML
  function createWidget(settings) {
    const widget = document.createElement('div');
    widget.id = CONFIG.widgetId;
    
    const button = document.createElement('button');
    button.id = CONFIG.buttonId;
    button.innerHTML = '💬 ' + (settings?.widget_title || 'Feedback');
    button.style.backgroundColor = settings?.widget_color || '#3B82F6';
    
    widget.appendChild(button);
    return widget;
  }

  // Create modal HTML
  function createModal(settings) {
    const overlay = document.createElement('div');
    overlay.id = CONFIG.overlayId;
    
    const modal = document.createElement('div');
    modal.id = CONFIG.modalId;
    
    modal.innerHTML = `
      <div class="notex-modal-header">
        <button class="notex-close" onclick="closeFeedbackModal()">&times;</button>
        <h2 class="notex-modal-title">${settings?.widget_title || 'Share your feedback with us!'}</h2>
        <p class="notex-modal-subtitle">${settings?.greeting_text || 'Welcome, tell us what\'s on your mind'}</p>
      </div>
      <div class="notex-modal-body">
        <form id="notex-feedback-form">
          <div class="notex-form-group">
            <label class="notex-label" for="notex-email">Email (optional)</label>
            <input 
              type="email" 
              id="notex-email" 
              class="notex-input" 
              placeholder="your@email.com"
            >
          </div>
          <div class="notex-form-group">
            <label class="notex-label" for="notex-message">Message *</label>
            <textarea 
              id="notex-message" 
              class="notex-textarea" 
              placeholder="Tell us what you think..."
              required
            ></textarea>
            <div id="notex-message-error" class="notex-error"></div>
          </div>
          <button type="submit" class="notex-button" id="notex-submit-btn">
            Send Feedback
          </button>
        </form>
      </div>
    `;
    
    overlay.appendChild(modal);
    return overlay;
  }

  // Show modal
  function showModal() {
    const overlay = document.getElementById(CONFIG.overlayId);
    if (overlay) {
      overlay.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      
      // Focus on first input
      const emailInput = document.getElementById('notex-email');
      if (emailInput) {
        setTimeout(() => emailInput.focus(), 100);
      }
    }
  }

  // Close modal
  function closeModal() {
    const overlay = document.getElementById(CONFIG.overlayId);
    if (overlay) {
      overlay.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  // Show success message
  function showSuccess() {
    const modal = document.getElementById(CONFIG.modalId);
    if (modal) {
      modal.innerHTML = `
        <div class="notex-success">
          <div class="notex-success-icon">✅</div>
          <h3 class="notex-success-title">Thank you!</h3>
          <p class="notex-success-message">Your feedback has been submitted successfully.</p>
        </div>
      `;
      
      // Clear the form
      const messageInput = document.getElementById('notex-message');
      const emailInput = document.getElementById('notex-email');
      if (messageInput) messageInput.value = '';
      if (emailInput) emailInput.value = '';
      
      // Show success toast
      showToast('Feedback submitted successfully!', 'success');
      
      setTimeout(() => {
        closeModal();
        // Reset modal content
        initWidget();
      }, 2000);
    }
  }

  // Show toast notification
  function showToast(message, type = 'success') {
    // Remove existing toast if any
    const existingToast = document.getElementById('notex-toast');
    if (existingToast) {
      existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.id = 'notex-toast';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#10b981' : '#ef4444'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10002;
      font-size: 14px;
      font-weight: 500;
      animation: slideInRight 0.3s ease;
      max-width: 300px;
    `;
    
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
          if (toast.parentNode) {
            toast.remove();
          }
        }, 300);
      }
    }, 3000);
  }

  // Handle form submission
  async function handleSubmit(event, projectId) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('notex-submit-btn');
    const messageInput = document.getElementById('notex-message');
    const emailInput = document.getElementById('notex-email');
    const errorDiv = document.getElementById('notex-message-error');
    
    const message = messageInput.value.trim();
    const email = emailInput.value.trim();
    
    // Clear previous errors
    errorDiv.textContent = '';
    
    // Validate message
    if (!message) {
      errorDiv.textContent = 'Message is required';
      messageInput.focus();
      return;
    }
    
    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    
    try {
      await submitFeedback(projectId, email, message);
      showSuccess();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      // Only show error message for API failures, not validation errors
      errorDiv.textContent = 'Failed to submit feedback. Please try again.';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Feedback';
    }
  }

  // Initialize widget
  async function initWidget() {
    const projectId = getProjectId();
    if (!projectId) {
      console.error('No project ID found. Please add data-project-id to the script tag.');
      return;
    }
    
    // Remove existing widget if any
    const existingWidget = document.getElementById(CONFIG.widgetId);
    if (existingWidget) {
      existingWidget.remove();
    }
    
    const existingOverlay = document.getElementById(CONFIG.overlayId);
    if (existingOverlay) {
      existingOverlay.remove();
    }
    
    // Create styles
    createStyles();
    
    // Fetch settings
    const settings = await fetchWidgetSettings(projectId);
    
    // Create widget
    const widget = createWidget(settings);
    document.body.appendChild(widget);
    
    // Create modal
    const modal = createModal(settings);
    document.body.appendChild(modal);
    
    // Add event listeners
    const button = document.getElementById(CONFIG.buttonId);
    const form = document.getElementById('notex-feedback-form');
    
    if (button) {
      button.addEventListener('click', showModal);
    }
    
    if (form) {
      form.addEventListener('submit', (e) => handleSubmit(e, projectId));
    }
    
    // Close modal on overlay click
    const overlay = document.getElementById(CONFIG.overlayId);
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          closeModal();
        }
      });
    }
  }

  // Global close function
  window.closeFeedbackModal = closeModal;

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }

})();
