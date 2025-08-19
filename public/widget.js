(function() {
  'use strict';

  // Widget configuration
  let config = {
    userId: null,
    apiUrl: 'https://xjbrqeqizpoqdjkiyqzt.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqYnJxZXFpenBvcWRqa2l5cXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNTAzMjcsImV4cCI6MjA3MDYyNjMyN30.cxMH9tUGYEOTUauzluSEeNyjG1iMtUZnNIj4QYGNi84',
    colors: {
      primary: '#3b82f6',
      secondary: '#1e40af'
    },
    greeting: 'How was your experience?',
    placement: 'bottom',
    enabled: true
  };

  // Widget state
  let widgetState = {
    isOpen: false,
    isSubmitting: false,
    settings: null
  };

  // DOM elements
  let elements = {
    button: null,
    modal: null,
    overlay: null,
    form: null
  };

  // Initialize widget
  function init() {
    // Get configuration from script tag
    const script = document.currentScript || document.querySelector('script[src*="widget.js"]');
    if (script) {
      config.userId = script.getAttribute('data-user-id');
    }

    if (!config.userId) {
      console.error('NoteX Feedback Widget: Missing data-user-id attribute');
      return;
    }

    // Load settings from API
    loadSettings().then(() => {
      if (config.enabled) {
        createWidget();
        injectStyles();
      }
    }).catch(error => {
      console.error('NoteX Feedback Widget: Failed to load settings', error);
    });
  }

  // Load widget settings from API
  async function loadSettings() {
    try {
      const response = await fetch(`${config.apiUrl}/rest/v1/feedback_settings?user_id=eq.${config.userId}&select=*`, {
        headers: {
          'apikey': config.supabaseKey,
          'Authorization': `Bearer ${config.supabaseKey}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const settings = data[0];
          config.colors = settings.brand_colors;
          config.greeting = settings.greeting_text;
          config.placement = settings.button_placement;
          config.enabled = settings.widget_enabled;
          widgetState.settings = settings;
        }
      }
    } catch (error) {
      console.error('Failed to load widget settings:', error);
    }
  }

  // Create widget elements
  function createWidget() {
    // Create floating button
    elements.button = document.createElement('div');
    elements.button.id = 'notex-feedback-button';
    elements.button.innerHTML = `
      <div class="notex-feedback-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
      <span class="notex-feedback-text">${config.greeting}</span>
    `;
    elements.button.addEventListener('click', openModal);

    // Create modal overlay
    elements.overlay = document.createElement('div');
    elements.overlay.id = 'notex-feedback-overlay';
    elements.overlay.addEventListener('click', closeModal);

    // Create modal
    elements.modal = document.createElement('div');
    elements.modal.id = 'notex-feedback-modal';
    elements.modal.innerHTML = `
      <div class="notex-feedback-header">
        <h3>Share Your Feedback</h3>
        <button class="notex-feedback-close" onclick="window.notexFeedback.closeModal()">×</button>
      </div>
      <form class="notex-feedback-form" id="notex-feedback-form">
        <div class="notex-feedback-field">
          <label for="notex-name">Name (optional)</label>
          <input type="text" id="notex-name" name="name" placeholder="Your name">
        </div>
        <div class="notex-feedback-field">
          <label for="notex-email">Email (optional)</label>
          <input type="email" id="notex-email" name="email" placeholder="your@email.com">
        </div>
        <div class="notex-feedback-field">
          <label for="notex-message">Your Feedback *</label>
          <textarea id="notex-message" name="message" placeholder="Tell us about your experience..." required rows="4"></textarea>
        </div>
        <div class="notex-feedback-field">
          <label for="notex-category">Category</label>
          <select id="notex-category" name="category">
            <option value="general">General Feedback</option>
            <option value="bug">Bug Report</option>
            <option value="feature">Feature Request</option>
            <option value="complaint">Complaint</option>
            <option value="praise">Praise</option>
          </select>
        </div>
        <div class="notex-feedback-actions">
          <button type="button" class="notex-feedback-cancel" onclick="window.notexFeedback.closeModal()">Cancel</button>
          <button type="submit" class="notex-feedback-submit">Submit Feedback</button>
        </div>
      </form>
    `;

    // Add form submit handler
    elements.form = elements.modal.querySelector('#notex-feedback-form');
    elements.form.addEventListener('submit', handleSubmit);

    // Append elements to DOM
    document.body.appendChild(elements.button);
    document.body.appendChild(elements.overlay);
    document.body.appendChild(elements.modal);
  }

  // Inject CSS styles
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #notex-feedback-button {
        position: fixed;
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        background-color: ${config.colors.primary};
        color: white;
        border: 2px solid ${config.colors.secondary};
        border-radius: 8px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      #notex-feedback-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
      }

      #notex-feedback-button .notex-feedback-icon {
        display: flex;
        align-items: center;
      }

      #notex-feedback-button .notex-feedback-text {
        white-space: nowrap;
      }

      #notex-feedback-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        display: none;
        backdrop-filter: blur(2px);
      }

      #notex-feedback-modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        z-index: 10001;
        display: none;
        width: 90%;
        max-width: 500px;
        max-height: 90vh;
        overflow-y: auto;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .notex-feedback-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        border-bottom: 1px solid #e5e7eb;
      }

      .notex-feedback-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #111827;
      }

      .notex-feedback-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #6b7280;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: background-color 0.2s;
      }

      .notex-feedback-close:hover {
        background-color: #f3f4f6;
      }

      .notex-feedback-form {
        padding: 24px;
      }

      .notex-feedback-field {
        margin-bottom: 20px;
      }

      .notex-feedback-field label {
        display: block;
        margin-bottom: 6px;
        font-size: 14px;
        font-weight: 500;
        color: #374151;
      }

      .notex-feedback-field input,
      .notex-feedback-field textarea,
      .notex-feedback-field select {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 14px;
        transition: border-color 0.2s;
        box-sizing: border-box;
      }

      .notex-feedback-field input:focus,
      .notex-feedback-field textarea:focus,
      .notex-feedback-field select:focus {
        outline: none;
        border-color: ${config.colors.primary};
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      .notex-feedback-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        margin-top: 24px;
      }

      .notex-feedback-cancel {
        padding: 10px 16px;
        background: white;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        color: #374151;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .notex-feedback-cancel:hover {
        background-color: #f9fafb;
        border-color: #9ca3af;
      }

      .notex-feedback-submit {
        padding: 10px 16px;
        background-color: ${config.colors.primary};
        border: 1px solid ${config.colors.primary};
        border-radius: 6px;
        color: white;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .notex-feedback-submit:hover {
        background-color: ${config.colors.secondary};
        border-color: ${config.colors.secondary};
      }

      .notex-feedback-submit:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .notex-feedback-success {
        text-align: center;
        padding: 40px 24px;
      }

      .notex-feedback-success h3 {
        color: #059669;
        margin-bottom: 8px;
      }

      .notex-feedback-success p {
        color: #6b7280;
        margin: 0;
      }

      @media (max-width: 640px) {
        #notex-feedback-button .notex-feedback-text {
          display: none;
        }
        
        #notex-feedback-button {
          padding: 12px;
        }
        
        #notex-feedback-modal {
          width: 95%;
          margin: 20px;
        }
        
        .notex-feedback-actions {
          flex-direction: column;
        }
      }
    `;

    // Set button position based on placement
    switch (config.placement) {
      case 'left':
        style.textContent += `#notex-feedback-button { left: 20px; bottom: 20px; }`;
        break;
      case 'right':
        style.textContent += `#notex-feedback-button { right: 20px; bottom: 20px; }`;
        break;
      case 'bottom':
      default:
        style.textContent += `#notex-feedback-button { left: 50%; bottom: 20px; transform: translateX(-50%); }`;
        break;
    }

    document.head.appendChild(style);
  }

  // Open modal
  function openModal() {
    if (widgetState.isOpen) return;
    
    widgetState.isOpen = true;
    elements.overlay.style.display = 'block';
    elements.modal.style.display = 'block';
    
    // Focus on first input
    setTimeout(() => {
      const firstInput = elements.modal.querySelector('input, textarea');
      if (firstInput) firstInput.focus();
    }, 100);
  }

  // Close modal
  function closeModal() {
    if (!widgetState.isOpen) return;
    
    widgetState.isOpen = false;
    elements.overlay.style.display = 'none';
    elements.modal.style.display = 'none';
    
    // Reset form
    if (elements.form) {
      elements.form.reset();
    }
  }

  // Handle form submission
  async function handleSubmit(event) {
    event.preventDefault();
    
    if (widgetState.isSubmitting) return;
    
    widgetState.isSubmitting = true;
    
    const formData = new FormData(event.target);
    const feedbackData = {
      user_id: config.userId,
      client_name: formData.get('name') || null,
      email: formData.get('email') || null,
      message: formData.get('message'),
      category: formData.get('category') || 'general',
      created_at: new Date().toISOString()
    };

    try {
      // Submit feedback to API
      const response = await fetch(`${config.apiUrl}/rest/v1/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.supabaseKey,
          'Authorization': `Bearer ${config.supabaseKey}`
        },
        body: JSON.stringify(feedbackData)
      });

      if (response.ok) {
        // Show success message
        elements.modal.innerHTML = `
          <div class="notex-feedback-success">
            <h3>Thank You!</h3>
            <p>Your feedback has been submitted successfully. We appreciate your input!</p>
          </div>
        `;
        
        // Close modal after 3 seconds
        setTimeout(() => {
          closeModal();
          // Restore form
          setTimeout(() => {
            elements.modal.innerHTML = `
              <div class="notex-feedback-header">
                <h3>Share Your Feedback</h3>
                <button class="notex-feedback-close" onclick="window.notexFeedback.closeModal()">×</button>
              </div>
              <form class="notex-feedback-form" id="notex-feedback-form">
                <div class="notex-feedback-field">
                  <label for="notex-name">Name (optional)</label>
                  <input type="text" id="notex-name" name="name" placeholder="Your name">
                </div>
                <div class="notex-feedback-field">
                  <label for="notex-email">Email (optional)</label>
                  <input type="email" id="notex-email" name="email" placeholder="your@email.com">
                </div>
                <div class="notex-feedback-field">
                  <label for="notex-message">Your Feedback *</label>
                  <textarea id="notex-message" name="message" placeholder="Tell us about your experience..." required rows="4"></textarea>
                </div>
                <div class="notex-feedback-field">
                  <label for="notex-category">Category</label>
                  <select id="notex-category" name="category">
                    <option value="general">General Feedback</option>
                    <option value="bug">Bug Report</option>
                    <option value="feature">Feature Request</option>
                    <option value="complaint">Complaint</option>
                    <option value="praise">Praise</option>
                  </select>
                </div>
                <div class="notex-feedback-actions">
                  <button type="button" class="notex-feedback-cancel" onclick="window.notexFeedback.closeModal()">Cancel</button>
                  <button type="submit" class="notex-feedback-submit">Submit Feedback</button>
                </div>
              </form>
            `;
            elements.form = elements.modal.querySelector('#notex-feedback-form');
            elements.form.addEventListener('submit', handleSubmit);
          }, 100);
        }, 3000);
      } else {
        throw new Error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Sorry, there was an error submitting your feedback. Please try again.');
    } finally {
      widgetState.isSubmitting = false;
    }
  }

  // Public API
  window.notexFeedback = {
    open: openModal,
    close: closeModal,
    closeModal: closeModal,
    openModal: openModal
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
