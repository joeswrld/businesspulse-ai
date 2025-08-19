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
    console.log('NoteX Widget: Initializing...');
    
    // Get configuration from script tag
    const script = document.currentScript || document.querySelector('script[src*="widget"]');
    if (script) {
      config.userId = script.getAttribute('data-user-id');
      console.log('NoteX Widget: User ID found:', config.userId);
    }

    if (!config.userId) {
      console.error('NoteX Widget: Missing data-user-id attribute. Please add data-user-id="YOUR_USER_ID" to the script tag.');
      return;
    }

    // Create widget immediately
    createWidget();
    injectStyles();
    
    console.log('NoteX Widget: Initialized successfully!');
  }

  // Create widget elements
  function createWidget() {
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

    // Create modal overlay
    elements.overlay = document.createElement('div');
    elements.overlay.id = 'notex-feedback-overlay';
    elements.overlay.addEventListener('click', closeModal);

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

    // Add event listeners
    elements.form = elements.modal.querySelector('#notex-feedback-form');
    elements.form.addEventListener('submit', handleSubmit);

    // Append to body
    document.body.appendChild(elements.button);
    document.body.appendChild(elements.overlay);
    document.body.appendChild(elements.modal);

    console.log('NoteX Widget: Elements created and added to page');
  }

  // Inject CSS styles
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #notex-feedback-button {
        position: fixed;
        ${config.placement.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
        ${config.placement.includes('right') ? 'right: 20px;' : 'left: 20px;'}
        width: 60px;
        height: 60px;
        background: ${config.colors.primary};
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        cursor: pointer;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        border: none;
      }

      #notex-feedback-button:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(0,0,0,0.2);
      }

      .notex-feedback-icon {
        color: white;
      }

      #notex-feedback-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        backdrop-filter: blur(4px);
        z-index: 10000;
        display: none;
        align-items: center;
        justify-content: center;
      }

      #notex-feedback-overlay.active {
        display: flex;
      }

      #notex-feedback-modal {
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 400px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        position: relative;
      }

      .notex-feedback-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }

      .notex-feedback-header h3 {
        margin: 0;
        color: #333;
        font-size: 18px;
      }

      .notex-feedback-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .notex-feedback-field {
        margin-bottom: 16px;
      }

      .notex-feedback-field label {
        display: block;
        margin-bottom: 6px;
        font-weight: 500;
        color: #333;
      }

      .notex-feedback-field input,
      .notex-feedback-field textarea,
      .notex-feedback-field select {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        transition: border-color 0.3s ease;
        box-sizing: border-box;
      }

      .notex-feedback-field input:focus,
      .notex-feedback-field textarea:focus,
      .notex-feedback-field select:focus {
        outline: none;
        border-color: ${config.colors.primary};
      }

      .notex-feedback-actions {
        display: flex;
        gap: 10px;
        margin-top: 20px;
      }

      .notex-feedback-cancel {
        padding: 10px 16px;
        background: #f3f4f6;
        color: #374151;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.3s ease;
      }

      .notex-feedback-cancel:hover {
        background: #e5e7eb;
      }

      .notex-feedback-submit {
        padding: 10px 16px;
        background: ${config.colors.primary};
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: background-color 0.3s ease;
        flex: 1;
      }

      .notex-feedback-submit:hover {
        background: ${config.colors.secondary};
      }

      .notex-feedback-submit:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .notex-feedback-success {
        text-align: center;
        padding: 20px;
      }

      .notex-feedback-success h3 {
        color: #10b981;
        margin-bottom: 10px;
      }

      @media (max-width: 480px) {
        #notex-feedback-modal {
          margin: 20px;
          width: calc(100% - 40px);
        }
      }
    `;
    document.head.appendChild(style);
    console.log('NoteX Widget: Styles injected');
  }

  // Open modal
  function openModal() {
    if (widgetState.isOpen) return;
    
    widgetState.isOpen = true;
    elements.overlay.classList.add('active');
    console.log('NoteX Widget: Modal opened');
  }

  // Close modal
  function closeModal() {
    if (!widgetState.isOpen) return;
    
    widgetState.isOpen = false;
    elements.overlay.classList.remove('active');
    console.log('NoteX Widget: Modal closed');
  }

  // Handle form submission
  async function handleSubmit(event) {
    event.preventDefault();
    
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
      // For now, just show success message
      // In production, you would submit to your API
      console.log('NoteX Widget: Feedback submitted:', feedbackData);
      
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
      console.error('NoteX Widget: Error submitting feedback:', error);
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
    closeModal: closeModal
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('NoteX Widget: Script loaded successfully');
})();