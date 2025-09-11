/**
 * NoteX Feedback Widget
 * A lightweight, embeddable feedback collection widget
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    apiUrl: 'https://notex.com.ng',
    widgetVersion: '1.0.0',
    defaultSettings: {
      theme: 'light',
      primaryColor: '#3b82f6',
      textColor: '#1f2937',
      backgroundColor: '#ffffff',
      title: 'Share Your Feedback',
      placeholder: 'Tell us what you think...',
      submitText: 'Submit',
      thankYouMessage: 'Thank you for your feedback!',
      position: 'bottom-right',
      showEmailField: true,
      requireEmail: false,
      borderRadius: '8px',
      fontSize: '14px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      autoOpen: false,
      autoOpenDelay: 5000,
      closeOnSubmit: true,
      trackEvents: true
    }
  };

  // Widget state
  let widgetState = {
    isOpen: false,
    isLoaded: false,
    config: null,
    projectId: null
  };

  // DOM utilities
  const DOM = {
    create: (tag, className, content) => {
      const element = document.createElement(tag);
      if (className) element.className = className;
      if (content) element.innerHTML = content;
      return element;
    },
    
    addStyles: (styles) => {
      const style = document.createElement('style');
      style.textContent = styles;
      document.head.appendChild(style);
    },
    
    getById: (id) => document.getElementById(id),
    
    addClass: (element, className) => element.classList.add(className),
    
    removeClass: (element, className) => element.classList.remove(className),
    
    show: (element) => element.style.display = 'block',
    
    hide: (element) => element.style.display = 'none'
  };

  // API utilities
  const API = {
    async fetchConfig(projectId) {
      try {
        const response = await fetch(`${CONFIG.apiUrl}/api/widget-config?project_id=${projectId}`);
        if (!response.ok) throw new Error('Failed to fetch config');
        const data = await response.json();
        return data.config;
      } catch (error) {
        console.error('NoteX Widget: Failed to fetch config', error);
        return CONFIG.defaultSettings;
      }
    },

    async submitFeedback(projectId, feedbackData) {
      try {
        const response = await fetch(`${CONFIG.apiUrl}/api/submit-feedback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            project_id: projectId,
            ...feedbackData
          })
        });
        
        if (!response.ok) throw new Error('Failed to submit feedback');
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('NoteX Widget: Failed to submit feedback', error);
        throw error;
      }
    }
  };

  // Analytics
  const Analytics = {
    track: (event, data = {}) => {
      if (!widgetState.config?.trackEvents) return;
      
      try {
        // Send to analytics service
        console.log('NoteX Widget Event:', event, data);
        
        // You can integrate with Google Analytics, Mixpanel, etc.
        if (typeof gtag !== 'undefined') {
          gtag('event', `notex_widget_${event}`, {
            project_id: widgetState.projectId,
            ...data
          });
        }
      } catch (error) {
        console.error('NoteX Widget: Analytics error', error);
      }
    }
  };

  // Widget UI
  const WidgetUI = {
    createButton() {
      const button = DOM.create('button', 'notex-widget-button', `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          <path d="M13 8H7"/>
          <path d="M17 12H7"/>
        </svg>
      `);
      
      button.setAttribute('aria-label', 'Open feedback widget');
      button.setAttribute('title', 'Share your feedback');
      
      return button;
    },

    createModal() {
      const modal = DOM.create('div', 'notex-widget-modal', '');
      modal.innerHTML = `
        <div class="notex-widget-overlay"></div>
        <div class="notex-widget-content">
          <div class="notex-widget-header">
            <h3 class="notex-widget-title"></h3>
            <button class="notex-widget-close" aria-label="Close widget">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="notex-widget-body">
            <form class="notex-widget-form">
              <div class="notex-widget-field">
                <textarea 
                  class="notex-widget-textarea" 
                  placeholder="" 
                  rows="4" 
                  required
                ></textarea>
              </div>
              <div class="notex-widget-email-field" style="display: none;">
                <input 
                  type="email" 
                  class="notex-widget-input" 
                  placeholder="Your email (optional)"
                />
              </div>
              <div class="notex-widget-actions">
                <button type="submit" class="notex-widget-submit">
                  <span class="notex-widget-submit-text"></span>
                  <span class="notex-widget-loading" style="display: none;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 12a9 9 0 11-6.219-8.56"/>
                    </svg>
                  </span>
                </button>
              </div>
            </form>
            <div class="notex-widget-success" style="display: none;">
              <div class="notex-widget-success-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22,4 12,14.01 9,11.01"/>
                </svg>
              </div>
              <p class="notex-widget-success-message"></p>
            </div>
          </div>
        </div>
      `;
      
      return modal;
    },

    applyStyles(config) {
      const styles = `
        .notex-widget-button {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: ${config.primaryColor};
          color: white;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          font-family: ${config.fontFamily};
        }
        
        .notex-widget-button:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }
        
        .notex-widget-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 10001;
          display: none;
        }
        
        .notex-widget-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
        }
        
        .notex-widget-content {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: ${config.backgroundColor};
          border-radius: ${config.borderRadius};
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow: hidden;
          font-family: ${config.fontFamily};
          font-size: ${config.fontSize};
        }
        
        .notex-widget-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px 16px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .notex-widget-title {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: ${config.textColor};
        }
        
        .notex-widget-close {
          background: none;
          border: none;
          cursor: pointer;
          color: #6b7280;
          padding: 4px;
          border-radius: 4px;
          transition: background-color 0.2s;
        }
        
        .notex-widget-close:hover {
          background: #f3f4f6;
        }
        
        .notex-widget-body {
          padding: 24px;
        }
        
        .notex-widget-form {
          display: block;
        }
        
        .notex-widget-field {
          margin-bottom: 16px;
        }
        
        .notex-widget-textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-family: ${config.fontFamily};
          font-size: ${config.fontSize};
          resize: vertical;
          min-height: 100px;
          box-sizing: border-box;
        }
        
        .notex-widget-textarea:focus {
          outline: none;
          border-color: ${config.primaryColor};
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .notex-widget-email-field {
          margin-bottom: 16px;
        }
        
        .notex-widget-input {
          width: 100%;
          padding: 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-family: ${config.fontFamily};
          font-size: ${config.fontSize};
          box-sizing: border-box;
        }
        
        .notex-widget-input:focus {
          outline: none;
          border-color: ${config.primaryColor};
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .notex-widget-actions {
          display: flex;
          justify-content: flex-end;
        }
        
        .notex-widget-submit {
          background: ${config.primaryColor};
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-family: ${config.fontFamily};
          font-size: ${config.fontSize};
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .notex-widget-submit:hover {
          opacity: 0.9;
        }
        
        .notex-widget-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .notex-widget-loading {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .notex-widget-success {
          text-align: center;
          padding: 20px 0;
        }
        
        .notex-widget-success-icon {
          color: #10b981;
          margin-bottom: 16px;
        }
        
        .notex-widget-success-message {
          color: ${config.textColor};
          font-size: 16px;
          margin: 0;
        }
        
        @media (max-width: 640px) {
          .notex-widget-content {
            width: 95%;
            margin: 20px;
          }
          
          .notex-widget-body {
            padding: 20px;
          }
        }
      `;
      
      DOM.addStyles(styles);
    },

    updateContent(config) {
      const title = DOM.getById('notex-widget-title') || document.querySelector('.notex-widget-title');
      const placeholder = document.querySelector('.notex-widget-textarea');
      const submitText = document.querySelector('.notex-widget-submit-text');
      const successMessage = document.querySelector('.notex-widget-success-message');
      const emailField = document.querySelector('.notex-widget-email-field');
      
      if (title) title.textContent = config.title;
      if (placeholder) placeholder.placeholder = config.placeholder;
      if (submitText) submitText.textContent = config.submitText;
      if (successMessage) successMessage.textContent = config.thankYouMessage;
      
      if (emailField) {
        emailField.style.display = config.showEmailField ? 'block' : 'none';
      }
    }
  };

  // Widget controller
  const WidgetController = {
    async init(projectId) {
      try {
        widgetState.projectId = projectId;
        
        // Fetch configuration
        widgetState.config = await API.fetchConfig(projectId);
        
        // Apply styles
        WidgetUI.applyStyles(widgetState.config);
        
        // Create and add widget elements
        this.createWidget();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Auto-open if configured
        if (widgetState.config.autoOpen) {
          setTimeout(() => {
            this.open();
          }, widgetState.config.autoOpenDelay);
        }
        
        widgetState.isLoaded = true;
        Analytics.track('widget_loaded', { project_id: projectId });
        
      } catch (error) {
        console.error('NoteX Widget: Initialization failed', error);
      }
    },

    createWidget() {
      // Create button
      const button = WidgetUI.createButton();
      button.id = 'notex-widget-button';
      document.body.appendChild(button);
      
      // Create modal
      const modal = WidgetUI.createModal();
      modal.id = 'notex-widget-modal';
      document.body.appendChild(modal);
      
      // Update content
      WidgetUI.updateContent(widgetState.config);
    },

    setupEventListeners() {
      const button = DOM.getById('notex-widget-button');
      const modal = DOM.getById('notex-widget-modal');
      const closeBtn = modal.querySelector('.notex-widget-close');
      const overlay = modal.querySelector('.notex-widget-overlay');
      const form = modal.querySelector('.notex-widget-form');
      
      // Button click
      button.addEventListener('click', () => {
        this.open();
      });
      
      // Close button
      closeBtn.addEventListener('click', () => {
        this.close();
      });
      
      // Overlay click
      overlay.addEventListener('click', () => {
        this.close();
      });
      
      // Form submission
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit();
      });
      
      // Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && widgetState.isOpen) {
          this.close();
        }
      });
    },

    open() {
      const modal = DOM.getById('notex-widget-modal');
      DOM.show(modal);
      widgetState.isOpen = true;
      
      // Focus textarea
      const textarea = modal.querySelector('.notex-widget-textarea');
      if (textarea) textarea.focus();
      
      Analytics.track('widget_opened', { project_id: widgetState.projectId });
    },

    close() {
      const modal = DOM.getById('notex-widget-modal');
      DOM.hide(modal);
      widgetState.isOpen = false;
      
      Analytics.track('widget_closed', { project_id: widgetState.projectId });
    },

    async handleSubmit() {
      const modal = DOM.getById('notex-widget-modal');
      const form = modal.querySelector('.notex-widget-form');
      const successDiv = modal.querySelector('.notex-widget-success');
      const submitBtn = modal.querySelector('.notex-widget-submit');
      const loadingSpinner = modal.querySelector('.notex-widget-loading');
      const submitText = modal.querySelector('.notex-widget-submit-text');
      
      const textarea = form.querySelector('.notex-widget-textarea');
      const emailInput = form.querySelector('.notex-widget-input');
      
      const content = textarea.value.trim();
      const email = emailInput ? emailInput.value.trim() : '';
      
      if (!content) {
        textarea.focus();
        return;
      }
      
      if (widgetState.config.requireEmail && !email) {
        if (emailInput) emailInput.focus();
        return;
      }
      
      // Show loading state
      submitBtn.disabled = true;
      submitText.style.display = 'none';
      loadingSpinner.style.display = 'inline-block';
      
      try {
        // Submit feedback
        await API.submitFeedback(widgetState.projectId, {
          content,
          user_email: email || null,
          metadata: {
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: new Date().toISOString()
          }
        });
        
        // Show success
        form.style.display = 'none';
        successDiv.style.display = 'block';
        
        Analytics.track('feedback_submitted', { 
          project_id: widgetState.projectId,
          has_email: !!email,
          content_length: content.length
        });
        
        // Auto-close if configured
        if (widgetState.config.closeOnSubmit) {
          setTimeout(() => {
            this.close();
            this.resetForm();
          }, 2000);
        }
        
      } catch (error) {
        console.error('NoteX Widget: Submit failed', error);
        
        // Show error (you could add error UI here)
        alert('Failed to submit feedback. Please try again.');
        
        // Reset loading state
        submitBtn.disabled = false;
        submitText.style.display = 'inline-block';
        loadingSpinner.style.display = 'none';
      }
    },

    resetForm() {
      const modal = DOM.getById('notex-widget-modal');
      const form = modal.querySelector('.notex-widget-form');
      const successDiv = modal.querySelector('.notex-widget-success');
      const submitBtn = modal.querySelector('.notex-widget-submit');
      const loadingSpinner = modal.querySelector('.notex-widget-loading');
      const submitText = modal.querySelector('.notex-widget-submit-text');
      
      const textarea = form.querySelector('.notex-widget-textarea');
      const emailInput = form.querySelector('.notex-widget-input');
      
      // Reset form
      textarea.value = '';
      if (emailInput) emailInput.value = '';
      
      // Reset UI
      form.style.display = 'block';
      successDiv.style.display = 'none';
      submitBtn.disabled = false;
      submitText.style.display = 'inline-block';
      loadingSpinner.style.display = 'none';
    }
  };

  // Initialize widget when DOM is ready
  function initializeWidget() {
    const script = document.currentScript;
    const projectId = script.getAttribute('data-project-id');
    
    if (!projectId) {
      console.error('NoteX Widget: project-id attribute is required');
      return;
    }
    
    WidgetController.init(projectId);
  }

  // Auto-initialize if DOM is ready, otherwise wait
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWidget);
  } else {
    initializeWidget();
  }

  // Expose widget API globally (optional)
  window.NoteXWidget = {
    open: () => WidgetController.open(),
    close: () => WidgetController.close(),
    isLoaded: () => widgetState.isLoaded,
    getConfig: () => widgetState.config
  };

})();
