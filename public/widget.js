/**
 * NoteX Feedback Widget
 * A lightweight, embeddable feedback widget for external websites
 * 
 * Usage: <script src="https://notex.com.ng/widget.js" data-project-id="YOUR_PROJECT_ID"></script>
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    supabaseUrl: 'https://xjbrqeqizpoqdjkiyqzt.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqYnJxZXFpenBvcWRqa2l5cXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0NzQ4NzQsImV4cCI6MjA1MTA1MDg3NH0.placeholder', // This will be replaced with actual anon key
    widgetPosition: 'bottom-right',
    widgetSize: '60px',
    zIndex: 9999
  };

  // Widget state
  let isInitialized = false;
  let isOpen = false;
  let projectId = null;
  let settings = null;

  // DOM elements
  let widgetButton = null;
  let modal = null;
  let form = null;

  /**
   * Initialize the widget
   */
  function init() {
    if (isInitialized) return;

    // Get project ID from script tag
    const scriptTag = document.querySelector('script[src*="widget.js"]');
    if (!scriptTag) {
      console.error('NoteX Widget: Script tag not found');
      return;
    }

    projectId = scriptTag.getAttribute('data-project-id');
    if (!projectId) {
      console.error('NoteX Widget: data-project-id attribute is required');
      return;
    }

    // Load widget settings
    loadSettings();

    // Create widget elements
    createWidget();
    createModal();

    // Add event listeners
    addEventListeners();

    isInitialized = true;
    console.log('NoteX Widget: Initialized with project ID:', projectId);
  }

  /**
   * Load widget settings from Supabase
   */
  async function loadSettings() {
    try {
      const response = await fetch(`${CONFIG.supabaseUrl}/rest/v1/feedback_settings?project_id=eq.${projectId}&select=*`, {
        headers: {
          'apikey': CONFIG.supabaseAnonKey,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          settings = data[0];
        }
      }
    } catch (error) {
      console.error('NoteX Widget: Failed to load settings:', error);
    }

    // Default settings if none loaded
    if (!settings) {
      settings = {
        widget_title: 'Share your feedback with us!',
        widget_color: '#3B82F6'
      };
    }
  }

  /**
   * Create the floating widget button
   */
  function createWidget() {
    widgetButton = document.createElement('div');
    widgetButton.id = 'notex-feedback-widget';
    widgetButton.innerHTML = `
      <div style="
        position: fixed;
        ${CONFIG.widgetPosition === 'bottom-right' ? 'bottom: 20px; right: 20px;' : 'bottom: 20px; left: 20px;'}
        width: ${CONFIG.widgetSize};
        height: ${CONFIG.widgetSize};
        background: ${settings?.widget_color || '#3B82F6'};
        border-radius: 50%;
        cursor: pointer;
        z-index: ${CONFIG.zIndex};
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.3s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
        </svg>
      </div>
    `;

    document.body.appendChild(widgetButton);
  }

  /**
   * Create the feedback modal
   */
  function createModal() {
    modal = document.createElement('div');
    modal.id = 'notex-feedback-modal';
    modal.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: ${CONFIG.zIndex + 1};
        display: none;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="
          background: white;
          border-radius: 12px;
          padding: 24px;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        ">
          <div style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          ">
            <h3 style="
              margin: 0;
              font-size: 20px;
              font-weight: 600;
              color: #1f2937;
            ">${settings?.widget_title || 'Share your feedback with us!'}</h3>
            <button id="notex-close-modal" style="
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
            ">&times;</button>
          </div>
          
          <form id="notex-feedback-form" style="display: flex; flex-direction: column; gap: 16px;">
            <div>
              <label for="notex-email" style="
                display: block;
                margin-bottom: 8px;
                font-weight: 500;
                color: #374151;
              ">Email (optional)</label>
              <input type="email" id="notex-email" style="
                width: 100%;
                padding: 12px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 14px;
                box-sizing: border-box;
              " placeholder="your@email.com">
            </div>
            
            <div>
              <label for="notex-message" style="
                display: block;
                margin-bottom: 8px;
                font-weight: 500;
                color: #374151;
              ">Message *</label>
              <textarea id="notex-message" rows="4" style="
                width: 100%;
                padding: 12px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 14px;
                resize: vertical;
                box-sizing: border-box;
                font-family: inherit;
              " placeholder="Tell us what you think..." required></textarea>
            </div>
            
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
              <button type="button" id="notex-cancel" style="
                padding: 10px 20px;
                border: 1px solid #d1d5db;
                background: white;
                color: #374151;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
              ">Cancel</button>
              <button type="submit" id="notex-submit" style="
                padding: 10px 20px;
                border: none;
                background: ${settings?.widget_color || '#3B82F6'};
                color: white;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
              ">Send Feedback</button>
            </div>
          </form>
          
          <div id="notex-success" style="
            display: none;
            text-align: center;
            padding: 20px;
            color: #059669;
            font-weight: 500;
          ">
            Thank you for your feedback! We'll review it soon.
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  /**
   * Add event listeners
   */
  function addEventListeners() {
    // Widget button click
    widgetButton.addEventListener('click', toggleModal);

    // Close modal buttons
    document.getElementById('notex-close-modal').addEventListener('click', closeModal);
    document.getElementById('notex-cancel').addEventListener('click', closeModal);

    // Form submission
    form = document.getElementById('notex-feedback-form');
    form.addEventListener('submit', handleSubmit);

    // Close modal on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) {
        closeModal();
      }
    });
  }

  /**
   * Toggle modal visibility
   */
  function toggleModal() {
    if (isOpen) {
      closeModal();
    } else {
      openModal();
    }
  }

  /**
   * Open the modal
   */
  function openModal() {
    modal.style.display = 'flex';
    isOpen = true;
    document.body.style.overflow = 'hidden';
  }

  /**
   * Close the modal
   */
  function closeModal() {
    modal.style.display = 'none';
    isOpen = false;
    document.body.style.overflow = '';
    
    // Reset form
    form.reset();
    form.style.display = 'flex';
    document.getElementById('notex-success').style.display = 'none';
  }

  /**
   * Handle form submission
   */
  async function handleSubmit(e) {
    e.preventDefault();

    const email = document.getElementById('notex-email').value;
    const message = document.getElementById('notex-message').value;

    if (!message.trim()) {
      alert('Please enter a message');
      return;
    }

    const submitButton = document.getElementById('notex-submit');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Sending...';
    submitButton.disabled = true;

    try {
      const response = await fetch(`${CONFIG.supabaseUrl}/rest/v1/feedback`, {
        method: 'POST',
        headers: {
          'apikey': CONFIG.supabaseAnonKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          project_id: projectId,
          email: email || null,
          message: message.trim(),
          page_url: window.location.href,
          browser: navigator.userAgent
        })
      });

      if (response.ok) {
        // Show success message
        form.style.display = 'none';
        document.getElementById('notex-success').style.display = 'block';
        
        // Auto-close after 2 seconds
        setTimeout(() => {
          closeModal();
        }, 2000);
      } else {
        throw new Error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('NoteX Widget: Failed to submit feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      submitButton.textContent = originalText;
      submitButton.disabled = false;
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();