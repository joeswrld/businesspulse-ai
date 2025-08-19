(function() {
  'use strict';

  // Widget configuration
  let config = {
    userId: null,
    colors: {
      primary: '#3b82f6',
      secondary: '#1e40af'
    },
    greeting: 'How was your experience?',
    placement: 'bottom-right',
    enabled: true
  };

  // Widget state
  let widgetState = {
    isOpen: false,
    isSubmitting: false
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
    console.log('🔧 NoteX Widget Debug: Initializing...');
    
    // Get configuration from script tag
    const script = document.currentScript || document.querySelector('script[src*="widget"]');
    if (script) {
      config.userId = script.getAttribute('data-user-id');
      console.log('🔧 NoteX Widget Debug: User ID found:', config.userId);
    }

    if (!config.userId) {
      console.error('❌ NoteX Widget Debug: Missing data-user-id attribute');
      return;
    }

    // Create widget immediately
    createWidget();
    injectStyles();
    
    console.log('✅ NoteX Widget Debug: Initialized successfully!');
  }

  // Create widget elements
  function createWidget() {
    console.log('🔧 NoteX Widget Debug: Creating widget elements...');
    
    // Create floating button
    elements.button = document.createElement('div');
    elements.button.id = 'notex-feedback-button';
    elements.button.innerHTML = `
      <div class="notex-feedback-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
    `;
    elements.button.addEventListener('click', openModal);
    console.log('🔧 NoteX Widget Debug: Button created');

    // Create modal overlay
    elements.overlay = document.createElement('div');
    elements.overlay.id = 'notex-feedback-overlay';
    elements.overlay.addEventListener('click', closeModal);
    console.log('🔧 NoteX Widget Debug: Overlay created');

    // Create modal
    elements.modal = document.createElement('div');
    elements.modal.id = 'notex-feedback-modal';
    elements.modal.innerHTML = `
      <div class="notex-feedback-header">
        <h3>${config.greeting}</h3>
        <button class="notex-feedback-close" onclick="window.notexFeedback.close()">×</button>
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
          <button type="button" class="notex-feedback-cancel" onclick="window.notexFeedback.close()">Cancel</button>
          <button type="submit" class="notex-feedback-submit">Submit Feedback</button>
        </div>
      </form>
    `;
    console.log('🔧 NoteX Widget Debug: Modal created');

    // Add event listeners
    elements.form = elements.modal.querySelector('#notex-feedback-form');
    if (elements.form) {
      elements.form.addEventListener('submit', handleSubmit);
      console.log('🔧 NoteX Widget Debug: Form event listener added');
    } else {
      console.error('❌ NoteX Widget Debug: Form not found in modal');
    }

    // Append to body
    document.body.appendChild(elements.button);
    document.body.appendChild(elements.overlay);
    document.body.appendChild(elements.modal);
    
    console.log('🔧 NoteX Widget Debug: Elements added to page');
    console.log('🔧 NoteX Widget Debug: Button element:', elements.button);
    console.log('🔧 NoteX Widget Debug: Overlay element:', elements.overlay);
    console.log('🔧 NoteX Widget Debug: Modal element:', elements.modal);
  }

  // Inject CSS styles
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #notex-feedback-button {
        position: fixed !important;
        ${config.placement.includes('bottom') ? 'bottom: 20px !important;' : 'top: 20px !important;'}
        ${config.placement.includes('right') ? 'right: 20px !important;' : 'left: 20px !important;'}
        width: 60px !important;
        height: 60px !important;
        background: ${config.colors.primary} !important;
        border-radius: 50% !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
        cursor: pointer !important;
        z-index: 99999 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        transition: all 0.3s ease !important;
        border: none !important;
      }

      #notex-feedback-button:hover {
        transform: scale(1.1) !important;
        box-shadow: 0 6px 20px rgba(0,0,0,0.2) !important;
      }

      .notex-feedback-icon {
        color: white !important;
      }

      #notex-feedback-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background: rgba(0,0,0,0.5) !important;
        backdrop-filter: blur(4px) !important;
        z-index: 100000 !important;
        display: none !important;
        align-items: center !important;
        justify-content: center !important;
      }

      #notex-feedback-overlay.active {
        display: flex !important;
      }

      #notex-feedback-modal {
        background: white !important;
        border-radius: 12px !important;
        padding: 24px !important;
        max-width: 400px !important;
        width: 90% !important;
        max-height: 80vh !important;
        overflow-y: auto !important;
        box-shadow: 0 20px 40px rgba(0,0,0,0.1) !important;
        position: relative !important;
      }

      .notex-feedback-header {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        margin-bottom: 20px !important;
      }

      .notex-feedback-header h3 {
        margin: 0 !important;
        color: #333 !important;
        font-size: 18px !important;
      }

      .notex-feedback-close {
        background: none !important;
        border: none !important;
        font-size: 24px !important;
        cursor: pointer !important;
        color: #666 !important;
        padding: 0 !important;
        width: 30px !important;
        height: 30px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }

      .notex-feedback-field {
        margin-bottom: 16px !important;
      }

      .notex-feedback-field label {
        display: block !important;
        margin-bottom: 6px !important;
        font-weight: 500 !important;
        color: #333 !important;
      }

      .notex-feedback-field input,
      .notex-feedback-field textarea,
      .notex-feedback-field select {
        width: 100% !important;
        padding: 10px 12px !important;
        border: 1px solid #ddd !important;
        border-radius: 6px !important;
        font-size: 14px !important;
        transition: border-color 0.3s ease !important;
        box-sizing: border-box !important;
      }

      .notex-feedback-field input:focus,
      .notex-feedback-field textarea:focus,
      .notex-feedback-field select:focus {
        outline: none !important;
        border-color: ${config.colors.primary} !important;
      }

      .notex-feedback-actions {
        display: flex !important;
        gap: 10px !important;
        margin-top: 20px !important;
      }

      .notex-feedback-cancel {
        padding: 10px 16px !important;
        background: #f3f4f6 !important;
        color: #374151 !important;
        border: none !important;
        border-radius: 6px !important;
        cursor: pointer !important;
        font-size: 14px !important;
        transition: background-color 0.3s ease !important;
      }

      .notex-feedback-cancel:hover {
        background: #e5e7eb !important;
      }

      .notex-feedback-submit {
        padding: 10px 16px !important;
        background: ${config.colors.primary} !important;
        color: white !important;
        border: none !important;
        border-radius: 6px !important;
        cursor: pointer !important;
        font-size: 14px !important;
        font-weight: 500 !important;
        transition: background-color 0.3s ease !important;
        flex: 1 !important;
      }

      .notex-feedback-submit:hover {
        background: ${config.colors.secondary} !important;
      }

      .notex-feedback-submit:disabled {
        opacity: 0.6 !important;
        cursor: not-allowed !important;
      }

      .notex-feedback-success {
        text-align: center !important;
        padding: 20px !important;
      }

      .notex-feedback-success h3 {
        color: #10b981 !important;
        margin-bottom: 10px !important;
      }

      @media (max-width: 480px) {
        #notex-feedback-modal {
          margin: 20px !important;
          width: calc(100% - 40px) !important;
        }
      }
    `;
    document.head.appendChild(style);
    console.log('🔧 NoteX Widget Debug: Styles injected with !important');
  }

  // Open modal
  function openModal() {
    console.log('🔧 NoteX Widget Debug: openModal called');
    console.log('🔧 NoteX Widget Debug: Current state:', widgetState);
    console.log('🔧 NoteX Widget Debug: Elements:', elements);
    
    if (widgetState.isOpen) {
      console.log('🔧 NoteX Widget Debug: Modal already open, returning');
      return;
    }
    
    if (!elements.overlay) {
      console.error('❌ NoteX Widget Debug: Overlay element not found');
      return;
    }
    
    widgetState.isOpen = true;
    elements.overlay.classList.add('active');
    console.log('🔧 NoteX Widget Debug: Modal opened, overlay classes:', elements.overlay.className);
    console.log('🔧 NoteX Widget Debug: Overlay display style:', window.getComputedStyle(elements.overlay).display);
  }

  // Close modal
  function closeModal() {
    console.log('🔧 NoteX Widget Debug: closeModal called');
    
    if (!widgetState.isOpen) {
      console.log('🔧 NoteX Widget Debug: Modal not open, returning');
      return;
    }
    
    if (!elements.overlay) {
      console.error('❌ NoteX Widget Debug: Overlay element not found');
      return;
    }
    
    widgetState.isOpen = false;
    elements.overlay.classList.remove('active');
    console.log('🔧 NoteX Widget Debug: Modal closed');
  }

  // Handle form submission
  async function handleSubmit(event) {
    event.preventDefault();
    console.log('🔧 NoteX Widget Debug: Form submitted');
    
    if (widgetState.isSubmitting) return;
    
    widgetState.isSubmitting = true;
    const submitButton = elements.form.querySelector('.notex-feedback-submit');
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';

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
      console.log('🔧 NoteX Widget Debug: Feedback submitted:', feedbackData);
      
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
              <h3>${config.greeting}</h3>
              <button class="notex-feedback-close" onclick="window.notexFeedback.close()">×</button>
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
                <button type="button" class="notex-feedback-cancel" onclick="window.notexFeedback.close()">Cancel</button>
                <button type="submit" class="notex-feedback-submit">Submit Feedback</button>
              </div>
            </form>
          `;
          elements.form = elements.modal.querySelector('#notex-feedback-form');
          elements.form.addEventListener('submit', handleSubmit);
        }, 100);
      }, 3000);
      
    } catch (error) {
      console.error('❌ NoteX Widget Debug: Error submitting feedback:', error);
      alert('Sorry, there was an error submitting your feedback. Please try again.');
    } finally {
      widgetState.isSubmitting = false;
      submitButton.disabled = false;
      submitButton.textContent = 'Submit Feedback';
    }
  }

  // Public API
  window.notexFeedback = {
    open: openModal,
    close: closeModal,
    openModal: openModal,
    closeModal: closeModal,
    debug: function() {
      console.log('🔧 NoteX Widget Debug Info:');
      console.log('Config:', config);
      console.log('State:', widgetState);
      console.log('Elements:', elements);
      console.log('Button visible:', !!elements.button);
      console.log('Overlay visible:', !!elements.overlay);
      console.log('Modal visible:', !!elements.modal);
      if (elements.overlay) {
        console.log('Overlay classes:', elements.overlay.className);
        console.log('Overlay display:', window.getComputedStyle(elements.overlay).display);
      }
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('🔧 NoteX Widget Debug: Script loaded successfully');
})();