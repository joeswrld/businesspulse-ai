(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    apiUrl: window.location.origin,
    widgetId: 'notex-feedback-widget',
    buttonId: 'notex-feedback-button',
    modalId: 'notex-feedback-modal',
    overlayId: 'notex-feedback-overlay'
  };

  // State management
  let widgetSettings = null;
  let currentForm = null;

  // Get project ID from script tag
  function getProjectId() {
    const script = document.querySelector('script[data-project-id]');
    return script ? script.getAttribute('data-project-id') : null;
  }

  // Fetch widget settings from API
  async function fetchWidgetSettings(projectId) {
    try {
      const response = await fetch(`${CONFIG.apiUrl}/api/widget/settings/${projectId}`);
      
      if (!response.ok) {
        console.warn('Failed to fetch widget settings, using defaults');
        return getDefaultSettings();
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.warn('Error fetching widget settings, using defaults:', error);
      return getDefaultSettings();
    }
  }

  // Default settings fallback
  function getDefaultSettings() {
    return {
      widget_title: 'We love your feedback!',
      widget_color: '#3B82F6',
      greeting_text: 'Help us improve by sharing your thoughts',
      customer_satisfaction_enabled: true,
      product_feedback_enabled: true,
      widget_position: 'bottom-left',
      show_branding: true
    };
  }

  // Submit feedback to API
  async function submitFeedback(projectId, formType, data) {
    try {
      const response = await fetch(`${CONFIG.apiUrl}/api/widget/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: projectId,
          form_type: formType,
          ...data
        })
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  }

  // Create widget styles
  function createStyles() {
    if (document.getElementById('notex-widget-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'notex-widget-styles';
    style.textContent = `
      #${CONFIG.widgetId} {
        position: fixed;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .notex-position-bottom-left {
        bottom: 20px;
        left: 20px;
      }
      
      .notex-position-bottom-right {
        bottom: 20px;
        right: 20px;
      }
      
      .notex-position-top-left {
        top: 20px;
        left: 20px;
      }
      
      .notex-position-top-right {
        top: 20px;
        right: 20px;
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
        min-width: 140px;
        justify-content: center;
        border: 2px solid transparent;
      }
      
      #${CONFIG.buttonId}:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
        border-color: rgba(255, 255, 255, 0.3);
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
        backdrop-filter: blur(4px);
      }
      
      #${CONFIG.modalId} {
        background: white;
        border-radius: 16px;
        padding: 0;
        max-width: 500px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        animation: slideIn 0.3s ease;
        position: relative;
      }
      
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      .notex-modal-header {
        padding: 24px 24px 16px 24px;
        border-bottom: 1px solid #e5e7eb;
        position: relative;
      }
      
      .notex-modal-title {
        font-size: 20px;
        font-weight: 600;
        color: #111827;
        margin: 0 0 8px 0;
        padding-right: 40px;
      }
      
      .notex-modal-subtitle {
        font-size: 14px;
        color: #6b7280;
        margin: 0;
        line-height: 1.5;
      }
      
      .notex-modal-body {
        padding: 24px;
      }
      
      .notex-form-tabs {
        display: flex;
        border-bottom: 1px solid #e5e7eb;
        margin: -24px -24px 24px -24px;
        padding: 0 24px;
      }
      
      .notex-tab {
        flex: 1;
        padding: 12px 16px;
        background: none;
        border: none;
        font-size: 14px;
        font-weight: 500;
        color: #6b7280;
        cursor: pointer;
        border-bottom: 2px solid transparent;
        transition: all 0.2s;
        text-align: center;
      }
      
      .notex-tab:hover {
        color: #374151;
        background: #f9fafb;
      }
      
      .notex-tab.active {
        color: #3B82F6;
        border-bottom-color: #3B82F6;
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
      
      .notex-input, .notex-select {
        width: 100%;
        padding: 12px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 14px;
        transition: border-color 0.2s;
        box-sizing: border-box;
      }
      
      .notex-input:focus, .notex-select:focus {
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
      
      .notex-rating {
        display: flex;
        justify-content: center;
        gap: 8px;
        margin: 16px 0;
      }
      
      .notex-rating-star {
        width: 40px;
        height: 40px;
        border: 2px solid #d1d5db;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
        background: white;
      }
      
      .notex-rating-star:hover {
        border-color: #3B82F6;
        background: rgba(59, 130, 246, 0.1);
      }
      
      .notex-rating-star.active {
        border-color: #3B82F6;
        background: #3B82F6;
        color: white;
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
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
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
        top: 20px;
        right: 20px;
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #6b7280;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.2s;
      }
      
      .notex-close:hover {
        background: #f3f4f6;
        color: #374151;
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
      
      .notex-branding {
        text-align: center;
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid #e5e7eb;
        font-size: 11px;
        color: #9ca3af;
      }
      
      .notex-branding a {
        color: #3B82F6;
        text-decoration: none;
      }
      
      .notex-form-content {
        display: none;
      }
      
      .notex-form-content.active {
        display: block;
      }
      
      @media (max-width: 640px) {
        #${CONFIG.widgetId} {
          bottom: 16px;
          right: 16px;
          left: auto !important;
          top: auto !important;
        }
        
        #${CONFIG.buttonId} {
          padding: 10px 16px;
          font-size: 13px;
          min-width: 120px;
        }
        
        #${CONFIG.overlayId} {
          padding: 16px;
        }
        
        #${CONFIG.modalId} {
          max-width: 100%;
        }
        
        .notex-modal-header,
        .notex-modal-body {
          padding: 20px;
        }
        
        .notex-form-tabs {
          margin: -20px -20px 20px -20px;
          padding: 0 20px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Create widget HTML
  function createWidget(settings) {
    const widget = document.createElement('div');
    widget.id = CONFIG.widgetId;
    widget.className = `notex-position-${settings.widget_position || 'bottom-left'}`;
    
    const button = document.createElement('button');
    button.id = CONFIG.buttonId;
    button.innerHTML = `💬 ${settings.widget_title || 'Feedback'}`;
    button.style.backgroundColor = settings.widget_color || '#3B82F6';
    
    widget.appendChild(button);
    return widget;
  }

  // Create modal HTML
  function createModal(settings) {
    const overlay = document.createElement('div');
    overlay.id = CONFIG.overlayId;
    
    const modal = document.createElement('div');
    modal.id = CONFIG.modalId;
    
    const hasBothForms = settings.customer_satisfaction_enabled && settings.product_feedback_enabled;
    
    modal.innerHTML = `
      <div class="notex-modal-header">
        <button class="notex-close" onclick="closeFeedbackModal()">×</button>
        <h2 class="notex-modal-title">${settings.widget_title || 'Share your feedback'}</h2>
        <p class="notex-modal-subtitle">${settings.greeting_text || 'Help us improve by sharing your thoughts'}</p>
      </div>
      <div class="notex-modal-body">
        ${hasBothForms ? `
          <div class="notex-form-tabs">
            <button class="notex-tab ${settings.customer_satisfaction_enabled ? 'active' : ''}" 
                    onclick="switchForm('csat')" id="csat-tab"
                    style="display: ${settings.customer_satisfaction_enabled ? 'block' : 'none'}">
              Satisfaction Survey
            </button>
            <button class="notex-tab" 
                    onclick="switchForm('product')" id="product-tab"
                    style="display: ${settings.product_feedback_enabled ? 'block' : 'none'}">
              Product Feedback
            </button>
          </div>
        ` : ''}
        
        ${settings.customer_satisfaction_enabled ? createCSATForm() : ''}
        ${settings.product_feedback_enabled ? createProductForm() : ''}
        
        ${settings.show_branding !== false ? `
          <div class="notex-branding">
            Powered by <a href="https://notex.com.ng" target="_blank">NoteX</a>
          </div>
        ` : ''}
      </div>
    `;
    
    overlay.appendChild(modal);
    return overlay;
  }

  // Create CSAT form
  function createCSATForm() {
    return `
      <div class="notex-form-content ${!widgetSettings.product_feedback_enabled || currentForm === 'csat' ? 'active' : ''}" id="csat-form">
        <form id="notex-csat-form">
          <div class="notex-form-group">
            <label class="notex-label">How satisfied are you? *</label>
            <div class="notex-rating" id="csat-rating">
              ${[1,2,3,4,5].map(i => `
                <button type="button" class="notex-rating-star" data-rating="${i}">
                  ⭐
                </button>
              `).join('')}
            </div>
            <div id="csat-rating-error" class="notex-error"></div>
          </div>
          <div class="notex-form-group">
            <label class="notex-label" for="csat-email">Email (optional)</label>
            <input type="email" id="csat-email" class="notex-input" placeholder="your@email.com">
          </div>
          <div class="notex-form-group">
            <label class="notex-label" for="csat-comments">Additional Comments (optional)</label>
            <textarea id="csat-comments" class="notex-textarea" placeholder="Tell us more about your experience..." rows="4"></textarea>
          </div>
          <button type="submit" class="notex-button" id="csat-submit-btn">
            Submit Feedback
          </button>
        </form>
      </div>
    `;
  }

  // Create Product feedback form
  function createProductForm() {
    return `
      <div class="notex-form-content ${!widgetSettings.customer_satisfaction_enabled || currentForm === 'product' ? 'active' : ''}" id="product-form">
        <form id="notex-product-form">
          <div class="notex-form-group">
            <label class="notex-label" for="product-type">Feedback Type *</label>
            <select id="product-type" class="notex-select" required>
              <option value="">Select feedback type</option>
              <option value="Bug Report">Bug Report</option>
              <option value="Feature Request">Feature Request</option>
              <option value="General Feedback">General Feedback</option>
              <option value="Usability Issue">Usability Issue</option>
              <option value="Performance Issue">Performance Issue</option>
              <option value="Other">Other</option>
            </select>
            <div id="product-type-error" class="notex-error"></div>
          </div>
          <div class="notex-form-group">
            <label class="notex-label" for="product-email">Email (optional)</label>
            <input type="email" id="product-email" class="notex-input" placeholder="your@email.com">
          </div>
          <div class="notex-form-group">
            <label class="notex-label">Overall Rating (optional)</label>
            <div class="notex-rating" id="product-rating">
              ${[1,2,3,4,5].map(i => `
                <button type="button" class="notex-rating-star" data-rating="${i}">
                  ⭐
                </button>
              `).join('')}
            </div>
          </div>
          <div class="notex-form-group">
            <label class="notex-label" for="product-message">Your Feedback *</label>
            <textarea id="product-message" class="notex-textarea" placeholder="Please share your detailed feedback..." rows="5" required></textarea>
            <div id="product-message-error" class="notex-error"></div>
          </div>
          <button type="submit" class="notex-button" id="product-submit-btn">
            Submit Feedback
          </button>
        </form>
      </div>
    `;
  }

  // Show modal
  function showModal() {
    const overlay = document.getElementById(CONFIG.overlayId);
    if (overlay) {
      overlay.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      
      // Set initial form if both are available
      if (widgetSettings.customer_satisfaction_enabled && widgetSettings.product_feedback_enabled) {
        currentForm = 'csat';
        switchForm('csat');
      } else if (widgetSettings.customer_satisfaction_enabled) {
        currentForm = 'csat';
      } else if (widgetSettings.product_feedback_enabled) {
        currentForm = 'product';
      }
      
      // Setup rating handlers
      setupRatingHandlers();
    }
  }

  // Close modal
  function closeModal() {
    const overlay = document.getElementById(CONFIG.overlayId);
    if (overlay) {
      overlay.style.display = 'none';
      document.body.style.overflow = '';
      resetForms();
    }
  }

  // Switch between forms
  function switchForm(formType) {
    currentForm = formType;
    
    // Update tab states
    const csatTab = document.getElementById('csat-tab');
    const productTab = document.getElementById('product-tab');
    const csatForm = document.getElementById('csat-form');
    const productForm = document.getElementById('product-form');
    
    if (csatTab) csatTab.classList.toggle('active', formType === 'csat');
    if (productTab) productTab.classList.toggle('active', formType === 'product');
    if (csatForm) csatForm.classList.toggle('active', formType === 'csat');
    if (productForm) productForm.classList.toggle('active', formType === 'product');
  }

  // Setup rating star handlers
  function setupRatingHandlers() {
    setupRatingGroup('csat-rating');
    setupRatingGroup('product-rating');
  }

  function setupRatingGroup(groupId) {
    const ratingGroup = document.getElementById(groupId);
    if (!ratingGroup) return;
    
    const stars = ratingGroup.querySelectorAll('.notex-rating-star');
    
    stars.forEach(star => {
      star.addEventListener('click', (e) => {
        e.preventDefault();
        const rating = parseInt(star.dataset.rating);
        
        // Update visual state
        stars.forEach((s, index) => {
          s.classList.toggle('active', index < rating);
        });
        
        // Store rating value
        ratingGroup.dataset.rating = rating;
      });
    });
  }

  // Reset forms
  function resetForms() {
    // Reset CSAT form
    const csatForm = document.getElementById('notex-csat-form');
    if (csatForm) csatForm.reset();
    
    // Reset Product form
    const productForm = document.getElementById('notex-product-form');
    if (productForm) productForm.reset();
    
    // Reset rating displays
    document.querySelectorAll('.notex-rating-star').forEach(star => {
      star.classList.remove('active');
    });
    
    // Clear rating data
    document.querySelectorAll('.notex-rating').forEach(group => {
      delete group.dataset.rating;
    });
    
    // Clear error messages
    document.querySelectorAll('.notex-error').forEach(error => {
      error.textContent = '';
    });
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
      
      setTimeout(() => {
        closeModal();
        // Reinitialize the modal
        setTimeout(initWidget, 100);
      }, 2000);
    }
  }

  // Handle CSAT form submission
  async function handleCSATSubmit(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('csat-submit-btn');
    const ratingGroup = document.getElementById('csat-rating');
    const emailInput = document.getElementById('csat-email');
    const commentsInput = document.getElementById('csat-comments');
    const errorDiv = document.getElementById('csat-rating-error');
    
    const rating = parseInt(ratingGroup?.dataset.rating || '0');
    const email = emailInput?.value.trim() || '';
    const comments = commentsInput?.value.trim() || '';
    
    // Clear previous errors
    errorDiv.textContent = '';
    
    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      errorDiv.textContent = 'Please select a satisfaction rating';
      return;
    }
    
    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Submitting...';
    
    try {
      const projectId = getProjectId();
      await submitFeedback(projectId, 'customer_satisfaction', {
        rating: rating,
        message: comments || `Customer satisfaction rating: ${rating}/5`,
        metadata: {
          email: email || null,
          page_url: window.location.href,
          user_agent: navigator.userAgent
        }
      });
      
      showSuccess();
    } catch (error) {
      console.error('Error submitting CSAT feedback:', error);
      errorDiv.textContent = 'Failed to submit feedback. Please try again.';
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Submit Feedback';
    }
  }

  // Handle Product form submission
  async function handleProductSubmit(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('product-submit-btn');
    const typeSelect = document.getElementById('product-type');
    const emailInput = document.getElementById('product-email');
    const messageInput = document.getElementById('product-message');
    const ratingGroup = document.getElementById('product-rating');
    const typeError = document.getElementById('product-type-error');
    const messageError = document.getElementById('product-message-error');
    
    const feedbackType = typeSelect?.value || '';
    const email = emailInput?.value.trim() || '';
    const message = messageInput?.value.trim() || '';
    const rating = parseInt(ratingGroup?.dataset.rating || '0') || null;
    
    // Clear previous errors
    typeError.textContent = '';
    messageError.textContent = '';
    
    // Validate required fields
    if (!feedbackType) {
      typeError.textContent = 'Please select a feedback type';
      return;
    }
    
    if (!message) {
      messageError.textContent = 'Please provide your feedback';
      messageInput.focus();
      return;
    }
    
    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Submitting...';
    
    try {
      const projectId = getProjectId();
      await submitFeedback(projectId, 'product_feedback', {
        message: message,
        rating: rating,
        metadata: {
          email: email || null,
          feedback_type: feedbackType,
          page_url: window.location.href,
          user_agent: navigator.userAgent
        }
      });
      
      showSuccess();
    } catch (error) {
      console.error('Error submitting product feedback:', error);
      messageError.textContent = 'Failed to submit feedback. Please try again.';
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Submit Feedback';
    }
  }

  // Initialize widget
  async function initWidget() {
    const projectId = getProjectId();
    if (!projectId) {
      console.error('NoteX Widget: No project ID found. Please add data-project-id to the script tag.');
      return;
    }
    
    // Remove existing widget if any
    const existingWidget = document.getElementById(CONFIG.widgetId);
    if (existingWidget) existingWidget.remove();
    
    const existingOverlay = document.getElementById(CONFIG.overlayId);
    if (existingOverlay) existingOverlay.remove();
    
    try {
      // Fetch settings
      widgetSettings = await fetchWidgetSettings(projectId);
      
      // Check if any forms are enabled
      if (!widgetSettings.customer_satisfaction_enabled && !widgetSettings.product_feedback_enabled) {
        console.warn('NoteX Widget: No feedback forms are enabled for this project.');
        return;
      }
      
      // Create styles
      createStyles();
      
      // Create widget
      const widget = createWidget(widgetSettings);
      document.body.appendChild(widget);
      
      // Create modal
      const modal = createModal(widgetSettings);
      document.body.appendChild(modal);
      
      // Add event listeners
      const button = document.getElementById(CONFIG.buttonId);
      if (button) {
        button.addEventListener('click', showModal);
      }
      
      // Form submission handlers
      const csatForm = document.getElementById('notex-csat-form');
      if (csatForm) {
        csatForm.addEventListener('submit', handleCSATSubmit);
      }
      
      const productForm = document.getElementById('notex-product-form');
      if (productForm) {
        productForm.addEventListener('submit', handleProductSubmit);
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
      
      console.log('NoteX Widget: Successfully initialized');
      
    } catch (error) {
      console.error('NoteX Widget: Failed to initialize:', error);
    }
  }

  // Global functions
  window.closeFeedbackModal = closeModal;
  window.switchForm = switchForm;

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }

})();
