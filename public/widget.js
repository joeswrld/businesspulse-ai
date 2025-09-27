(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    API_BASE_URL: window.location.origin,
    WIDGET_VERSION: '1.0.0',
    DEBOUNCE_DELAY: 300
  };

  // Get project ID from script tag
  function getProjectId() {
    const script = document.currentScript || 
      document.querySelector('script[data-project-id]');
    return script ? script.getAttribute('data-project-id') : null;
  }

  // Fetch widget settings
  async function fetchWidgetSettings(projectId) {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/widget/settings/${projectId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch widget settings');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching widget settings:', error);
      return getDefaultSettings();
    }
  }

  // Default settings fallback
  function getDefaultSettings() {
    return {
      customer_satisfaction_enabled: true,
      product_feedback_enabled: true,
      widget_title: 'We love your feedback!',
      widget_color: '#3B82F6',
      greeting_text: 'Help us improve by sharing your thoughts',
      widget_position: 'bottom-right',
      show_branding: true
    };
  }

  // Create floating button
  function createFloatingButton(settings) {
    const button = document.createElement('button');
    button.id = 'notex-feedback-button';
    button.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    
    // Apply styles
    Object.assign(button.style, {
      position: 'fixed',
      width: '56px',
      height: '56px',
      borderRadius: '50%',
      backgroundColor: settings.widget_color,
      color: 'white',
      border: 'none',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      zIndex: '9999',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s ease',
      fontSize: '0'
    });

    // Position based on settings
    const position = settings.widget_position || 'bottom-right';
    switch (position) {
      case 'bottom-left':
        button.style.bottom = '20px';
        button.style.left = '20px';
        break;
      case 'top-right':
        button.style.top = '20px';
        button.style.right = '20px';
        break;
      case 'top-left':
        button.style.top = '20px';
        button.style.left = '20px';
        break;
      default: // bottom-right
        button.style.bottom = '20px';
        button.style.right = '20px';
    }

    // Hover effects
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.1)';
      button.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    });

    return button;
  }

  // Create modal
  function createModal(settings, projectId) {
    const modal = document.createElement('div');
    modal.id = 'notex-feedback-modal';
    modal.innerHTML = `
      <div class="notex-modal-overlay">
        <div class="notex-modal-content">
          <div class="notex-modal-header">
            <h3 class="notex-modal-title">${settings.widget_title}</h3>
            <button class="notex-modal-close">&times;</button>
          </div>
          <div class="notex-modal-body">
            <p class="notex-modal-greeting">${settings.greeting_text}</p>
            <div class="notex-modal-tabs">
              ${settings.customer_satisfaction_enabled ? `
                <button class="notex-tab-button active" data-tab="satisfaction">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z" fill="currentColor"/>
                  </svg>
                  Satisfaction
                </button>
              ` : ''}
              ${settings.product_feedback_enabled ? `
                <button class="notex-tab-button ${!settings.customer_satisfaction_enabled ? 'active' : ''}" data-tab="feedback">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
                  </svg>
                  Feedback
                </button>
              ` : ''}
            </div>
            <div class="notex-modal-forms">
              ${settings.customer_satisfaction_enabled ? createSatisfactionForm(projectId) : ''}
              ${settings.product_feedback_enabled ? createProductFeedbackForm(projectId) : ''}
            </div>
          </div>
          ${settings.show_branding ? `
            <div class="notex-modal-footer">
              <p class="notex-branding">Powered by <strong>NoteX</strong></p>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    // Apply styles
    const style = document.createElement('style');
    style.textContent = `
      .notex-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
      }
      
      .notex-modal-content {
        background: white;
        border-radius: 12px;
        max-width: 500px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      }
      
      .notex-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 24px 0;
        border-bottom: 1px solid #e5e7eb;
        margin-bottom: 20px;
      }
      
      .notex-modal-title {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #111827;
      }
      
      .notex-modal-close {
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
      
      .notex-modal-close:hover {
        background-color: #f3f4f6;
      }
      
      .notex-modal-body {
        padding: 0 24px 20px;
      }
      
      .notex-modal-greeting {
        margin: 0 0 20px;
        color: #6b7280;
        font-size: 14px;
      }
      
      .notex-modal-tabs {
        display: flex;
        gap: 8px;
        margin-bottom: 20px;
        border-bottom: 1px solid #e5e7eb;
      }
      
      .notex-tab-button {
        background: none;
        border: none;
        padding: 12px 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 500;
        color: #6b7280;
        border-bottom: 2px solid transparent;
        transition: all 0.2s;
      }
      
      .notex-tab-button.active {
        color: ${settings.widget_color};
        border-bottom-color: ${settings.widget_color};
      }
      
      .notex-tab-button:hover {
        color: ${settings.widget_color};
      }
      
      .notex-modal-forms {
        min-height: 300px;
      }
      
      .notex-form {
        display: none;
      }
      
      .notex-form.active {
        display: block;
      }
      
      .notex-form-group {
        margin-bottom: 16px;
      }
      
      .notex-form-label {
        display: block;
        margin-bottom: 6px;
        font-size: 14px;
        font-weight: 500;
        color: #374151;
      }
      
      .notex-form-label.required::after {
        content: ' *';
        color: #ef4444;
      }
      
      .notex-form-input,
      .notex-form-textarea,
      .notex-form-select {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 14px;
        transition: border-color 0.2s;
        box-sizing: border-box;
      }
      
      .notex-form-input:focus,
      .notex-form-textarea:focus,
      .notex-form-select:focus {
        outline: none;
        border-color: ${settings.widget_color};
        box-shadow: 0 0 0 3px ${settings.widget_color}20;
      }
      
      .notex-form-textarea {
        resize: vertical;
        min-height: 80px;
      }
      
      .notex-rating {
        display: flex;
        gap: 4px;
        margin-bottom: 8px;
      }
      
      .notex-star {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 24px;
        color: #d1d5db;
        transition: color 0.2s;
      }
      
      .notex-star.active,
      .notex-star:hover {
        color: #fbbf24;
      }
      
      .notex-form-button {
        width: 100%;
        padding: 12px;
        background-color: ${settings.widget_color};
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      
      .notex-form-button:hover {
        background-color: ${darkenColor(settings.widget_color, 10)};
      }
      
      .notex-form-button:disabled {
        background-color: #9ca3af;
        cursor: not-allowed;
      }
      
      .notex-modal-footer {
        padding: 16px 24px;
        border-top: 1px solid #e5e7eb;
        text-align: center;
      }
      
      .notex-branding {
        margin: 0;
        font-size: 12px;
        color: #6b7280;
      }
      
      .notex-success {
        text-align: center;
        padding: 40px 20px;
      }
      
      .notex-success-icon {
        width: 48px;
        height: 48px;
        background-color: #10b981;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 16px;
        color: white;
        font-size: 24px;
      }
      
      .notex-success-title {
        font-size: 18px;
        font-weight: 600;
        color: #111827;
        margin: 0 0 8px;
      }
      
      .notex-success-message {
        color: #6b7280;
        font-size: 14px;
        margin: 0;
      }
      
      @media (max-width: 640px) {
        .notex-modal-overlay {
          padding: 10px;
        }
        
        .notex-modal-content {
          max-height: 95vh;
        }
        
        .notex-modal-header,
        .notex-modal-body {
          padding-left: 16px;
          padding-right: 16px;
        }
      }
    `;
    
    document.head.appendChild(style);
    return modal;
  }

  // Create satisfaction form
  function createSatisfactionForm(projectId) {
    return `
      <div class="notex-form ${document.querySelector('.notex-tab-button[data-tab="satisfaction"]')?.classList.contains('active') ? 'active' : ''}" id="satisfaction-form">
        <form>
          <div class="notex-form-group">
            <label class="notex-form-label required">How would you rate your experience?</label>
            <div class="notex-rating" id="satisfaction-rating">
              <button type="button" class="notex-star" data-rating="1">★</button>
              <button type="button" class="notex-star" data-rating="2">★</button>
              <button type="button" class="notex-star" data-rating="3">★</button>
              <button type="button" class="notex-star" data-rating="4">★</button>
              <button type="button" class="notex-star" data-rating="5">★</button>
            </div>
            <div id="rating-text" style="font-size: 12px; color: #6b7280; margin-top: 4px;"></div>
          </div>
          
          <div class="notex-form-group">
            <label class="notex-form-label" for="satisfaction-message">Additional Comments (Optional)</label>
            <textarea class="notex-form-textarea" id="satisfaction-message" placeholder="Tell us more about your experience..."></textarea>
          </div>
          
          <div class="notex-form-group">
            <label class="notex-form-label" for="satisfaction-email">Email (Optional)</label>
            <input type="email" class="notex-form-input" id="satisfaction-email" placeholder="your@email.com">
            <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
              We'll only use this to follow up on your feedback if needed
            </div>
          </div>
          
          <button type="submit" class="notex-form-button" id="satisfaction-submit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Submit Feedback
          </button>
        </form>
      </div>
    `;
  }

  // Create product feedback form
  function createProductFeedbackForm(projectId) {
    return `
      <div class="notex-form ${!document.querySelector('.notex-tab-button[data-tab="satisfaction"]')?.classList.contains('active') ? 'active' : ''}" id="feedback-form">
        <form>
          <div class="notex-form-group">
            <label class="notex-form-label required" for="feedback-type">What type of feedback is this?</label>
            <select class="notex-form-select" id="feedback-type">
              <option value="">Select feedback type</option>
              <option value="bug">🐛 Bug Report</option>
              <option value="feature">💡 Feature Request</option>
              <option value="general">💬 General Feedback</option>
              <option value="other">❓ Other</option>
            </select>
          </div>
          
          <div class="notex-form-group">
            <label class="notex-form-label" for="feedback-priority">Priority Level</label>
            <select class="notex-form-select" id="feedback-priority">
              <option value="low">🟢 Low</option>
              <option value="medium" selected>🟡 Medium</option>
              <option value="high">🟠 High</option>
              <option value="urgent">🔴 Urgent</option>
            </select>
          </div>
          
          <div class="notex-form-group">
            <label class="notex-form-label required" for="feedback-message">Detailed Description</label>
            <textarea class="notex-form-textarea" id="feedback-message" placeholder="Describe your feedback in detail..."></textarea>
          </div>
          
          <div class="notex-form-group">
            <label class="notex-form-label" for="feedback-email">Email (Optional)</label>
            <input type="email" class="notex-form-input" id="feedback-email" placeholder="your@email.com">
            <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
              We'll use this to follow up on your feedback if needed
            </div>
          </div>
          
          <button type="submit" class="notex-form-button" id="feedback-submit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Submit Feedback
          </button>
        </form>
      </div>
    `;
  }

  // Darken color utility
  function darkenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  // Submit feedback
  async function submitFeedback(data) {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/widget/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      return await response.json();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  }

  // Show success message
  function showSuccessMessage(container) {
    container.innerHTML = `
      <div class="notex-success">
        <div class="notex-success-icon">✓</div>
        <h3 class="notex-success-title">Thank You!</h3>
        <p class="notex-success-message">Your feedback has been submitted successfully. We appreciate your input!</p>
      </div>
    `;
  }

  // Setup form handlers
  function setupFormHandlers(modal, projectId) {
    // Tab switching
    const tabButtons = modal.querySelectorAll('.notex-tab-button');
    const forms = modal.querySelectorAll('.notex-form');

    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tab = button.getAttribute('data-tab');
        
        // Update active tab
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Show corresponding form
        forms.forEach(form => form.classList.remove('active'));
        modal.querySelector(`#${tab}-form`).classList.add('active');
      });
    });

    // Rating system for satisfaction form
    const ratingStars = modal.querySelectorAll('#satisfaction-rating .notex-star');
    const ratingText = modal.querySelector('#rating-text');
    let selectedRating = 0;

    ratingStars.forEach((star, index) => {
      star.addEventListener('click', () => {
        selectedRating = index + 1;
        updateRatingDisplay();
      });

      star.addEventListener('mouseenter', () => {
        highlightStars(index + 1);
      });
    });

    modal.querySelector('#satisfaction-rating').addEventListener('mouseleave', () => {
      updateRatingDisplay();
    });

    function highlightStars(rating) {
      ratingStars.forEach((star, index) => {
        star.classList.toggle('active', index < rating);
      });
    }

    function updateRatingDisplay() {
      highlightStars(selectedRating);
      const texts = ['', 'Very Poor', 'Poor', 'Average', 'Good', 'Excellent'];
      ratingText.textContent = selectedRating > 0 ? texts[selectedRating] : '';
    }

    // Form submissions
    const satisfactionForm = modal.querySelector('#satisfaction-form form');
    const feedbackForm = modal.querySelector('#feedback-form form');

    if (satisfactionForm) {
      satisfactionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (selectedRating === 0) {
          alert('Please provide a rating');
          return;
        }

        const submitButton = satisfactionForm.querySelector('#satisfaction-submit');
        const originalText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<div style="width: 16px; height: 16px; border: 2px solid #ffffff; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div> Submitting...';

        try {
          const data = {
            project_id: projectId,
            form_type: 'customer_satisfaction',
            rating: selectedRating,
            message: modal.querySelector('#satisfaction-message').value || 'No additional comments',
            metadata: {
              email: modal.querySelector('#satisfaction-email').value || null,
              page_url: window.location.href,
              user_agent: navigator.userAgent,
              timestamp: new Date().toISOString()
            }
          };

          await submitFeedback(data);
          showSuccessMessage(modal.querySelector('.notex-modal-forms'));
        } catch (error) {
          alert('Failed to submit feedback. Please try again.');
          submitButton.disabled = false;
          submitButton.innerHTML = originalText;
        }
      });
    }

    if (feedbackForm) {
      feedbackForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const feedbackType = modal.querySelector('#feedback-type').value;
        const message = modal.querySelector('#feedback-message').value;

        if (!feedbackType || !message.trim()) {
          alert('Please fill in all required fields');
          return;
        }

        const submitButton = feedbackForm.querySelector('#feedback-submit');
        const originalText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<div style="width: 16px; height: 16px; border: 2px solid #ffffff; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div> Submitting...';

        try {
          const data = {
            project_id: projectId,
            form_type: 'product_feedback',
            message: message,
            metadata: {
              feedback_type: feedbackType,
              priority: modal.querySelector('#feedback-priority').value,
              email: modal.querySelector('#feedback-email').value || null,
              page_url: window.location.href,
              user_agent: navigator.userAgent,
              timestamp: new Date().toISOString()
            }
          };

          await submitFeedback(data);
          showSuccessMessage(modal.querySelector('.notex-modal-forms'));
        } catch (error) {
          alert('Failed to submit feedback. Please try again.');
          submitButton.disabled = false;
          submitButton.innerHTML = originalText;
        }
      });
    }

    // Close modal handlers
    const closeButton = modal.querySelector('.notex-modal-close');
    const overlay = modal.querySelector('.notex-modal-overlay');

    closeButton.addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(modal);
      }
    });

    // ESC key handler
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape' && document.body.contains(modal)) {
        document.body.removeChild(modal);
        document.removeEventListener('keydown', escHandler);
      }
    });
  }

  // Initialize widget
  async function init() {
    const projectId = getProjectId();
    
    if (!projectId) {
      console.error('NoteX Widget: Project ID not found');
      return;
    }

    try {
      const settings = await fetchWidgetSettings(projectId);
      
      // Create and add floating button
      const button = createFloatingButton(settings);
      document.body.appendChild(button);

      // Button click handler
      button.addEventListener('click', async () => {
        // Remove existing modal if any
        const existingModal = document.getElementById('notex-feedback-modal');
        if (existingModal) {
          document.body.removeChild(existingModal);
        }

        // Create and show modal
        const modal = createModal(settings, projectId);
        document.body.appendChild(modal);
        setupFormHandlers(modal, projectId);
      });

    } catch (error) {
      console.error('NoteX Widget initialization failed:', error);
    }
  }

  // Add spin animation
  const spinStyle = document.createElement('style');
  spinStyle.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(spinStyle);

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();