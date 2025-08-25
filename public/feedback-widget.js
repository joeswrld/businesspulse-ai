(function() {
  'use strict';

  // Configuration
  const config = {
    projectId: null,
    brandColor: '#2563eb',
    greetingText: "We'd love to hear your feedback!",
    widgetPosition: 'bottom-right',
    widgetLocation: 'fixed',
    apiUrl: 'https://notex.com.ng/feedback-api'
  };

  // Widget state
  let isOpen = false;
  let isSubmitting = false;

  // Get configuration from script tag
  const script = document.currentScript || document.querySelector('script[data-project-id]');
  if (script) {
    config.projectId = script.getAttribute('data-project-id');
    config.brandColor = script.getAttribute('data-brand-color') || config.brandColor;
    config.greetingText = script.getAttribute('data-greeting-text') || config.greetingText;
    config.widgetPosition = script.getAttribute('data-widget-position') || config.widgetPosition;
    config.widgetLocation = script.getAttribute('data-widget-location') || config.widgetLocation;
  }

  if (!config.projectId) {
    console.error('NoteX Feedback Widget: Project ID is required');
    return;
  }

  // Create widget HTML
  function createWidget() {
    const widget = document.createElement('div');
    widget.id = 'notex-feedback-widget';
    widget.innerHTML = `
      <div class="notex-widget-button" style="
        position: ${config.widgetLocation === 'fixed' ? 'fixed' : 'absolute'};
        ${getPositionStyles()}
        z-index: 9999;
        cursor: pointer;
        background: ${config.brandColor};
        color: white;
        border-radius: 50px;
        padding: 12px 20px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: all 0.3s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>${config.greetingText}</span>
      </div>

      <div class="notex-widget-modal" style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 10000;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 20px;
      ">
        <div class="notex-widget-content" style="
          background: white;
          border-radius: 12px;
          padding: 24px;
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
        ">
          <button class="notex-widget-close" style="
            position: absolute;
            top: 16px;
            right: 16px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">&times;</button>

          <div class="notex-widget-header" style="margin-bottom: 20px;">
            <h3 style="margin: 0 0 8px 0; color: #333; font-size: 20px; font-weight: 600;">
              Share Your Feedback
            </h3>
            <p style="margin: 0; color: #666; font-size: 14px;">
              Help us improve by sharing your thoughts
            </p>
          </div>

          <form class="notex-widget-form">
            <div style="margin-bottom: 16px;">
              <label style="display: block; margin-bottom: 6px; color: #333; font-size: 14px; font-weight: 500;">
                Name (optional)
              </label>
              <input type="text" name="name" placeholder="Your name" style="
                width: 100%;
                padding: 10px 12px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 14px;
                box-sizing: border-box;
              ">
            </div>

            <div style="margin-bottom: 16px;">
              <label style="display: block; margin-bottom: 6px; color: #333; font-size: 14px; font-weight: 500;">
                Email (optional)
              </label>
              <input type="email" name="email" placeholder="your@email.com" style="
                width: 100%;
                padding: 10px 12px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 14px;
                box-sizing: border-box;
              ">
            </div>

            <div style="margin-bottom: 20px;">
              <label style="display: block; margin-bottom: 6px; color: #333; font-size: 14px; font-weight: 500;">
                Message *
              </label>
              <textarea name="message" placeholder="Tell us what you think..." required style="
                width: 100%;
                padding: 10px 12px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 14px;
                min-height: 100px;
                resize: vertical;
                box-sizing: border-box;
                font-family: inherit;
              "></textarea>
            </div>

            <div class="notex-widget-actions" style="display: flex; gap: 12px; justify-content: flex-end;">
              <button type="button" class="notex-widget-cancel" style="
                padding: 10px 20px;
                border: 1px solid #ddd;
                background: white;
                color: #666;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
              ">Cancel</button>
              <button type="submit" class="notex-widget-submit" style="
                padding: 10px 20px;
                background: ${config.brandColor};
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
              ">Submit Feedback</button>
            </div>
          </form>

          <div class="notex-widget-message" style="
            display: none;
            margin-top: 16px;
            padding: 12px;
            border-radius: 6px;
            font-size: 14px;
          "></div>
        </div>
      </div>
    `;

    document.body.appendChild(widget);
    return widget;
  }

  // Get position styles based on configuration
  function getPositionStyles() {
    switch (config.widgetPosition) {
      case 'bottom-left':
        return 'bottom: 20px; left: 20px;';
      case 'top-right':
        return 'top: 20px; right: 20px;';
      case 'top-left':
        return 'top: 20px; left: 20px;';
      case 'center':
        return 'top: 50%; left: 50%; transform: translate(-50%, -50%);';
      default: // bottom-right
        return 'bottom: 20px; right: 20px;';
    }
  }

  // Show widget modal
  function showWidget() {
    const modal = document.querySelector('.notex-widget-modal');
    if (modal) {
      modal.style.display = 'flex';
      isOpen = true;
      document.body.style.overflow = 'hidden';
    }
  }

  // Hide widget modal
  function hideWidget() {
    const modal = document.querySelector('.notex-widget-modal');
    if (modal) {
      modal.style.display = 'none';
      isOpen = false;
      document.body.style.overflow = '';
    }
  }

  // Show message
  function showMessage(message, type = 'info') {
    const messageEl = document.querySelector('.notex-widget-message');
    if (messageEl) {
      messageEl.textContent = message;
      messageEl.style.display = 'block';
      
      // Set color based on type
      if (type === 'error') {
        messageEl.style.background = '#fee2e2';
        messageEl.style.color = '#dc2626';
        messageEl.style.border = '1px solid #fecaca';
      } else if (type === 'success') {
        messageEl.style.background = '#dcfce7';
        messageEl.style.color = '#16a34a';
        messageEl.style.border = '1px solid #bbf7d0';
      } else {
        messageEl.style.background = '#dbeafe';
        messageEl.style.color = '#2563eb';
        messageEl.style.border = '1px solid #bfdbfe';
      }
    }
  }

  // Hide message
  function hideMessage() {
    const messageEl = document.querySelector('.notex-widget-message');
    if (messageEl) {
      messageEl.style.display = 'none';
    }
  }

  // Submit feedback
  async function submitFeedback(formData) {
    if (isSubmitting) return;
    
    isSubmitting = true;
    hideMessage();
    
    try {
      const response = await fetch(config.apiUrl, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showMessage('Thank you for your feedback!', 'success');
        setTimeout(() => {
          hideWidget();
          // Reset form
          document.querySelector('.notex-widget-form').reset();
        }, 2000);
      } else {
        // Handle different error types
        if (response.status === 429 && result.needsUpgrade) {
          // Usage limit reached
          showMessage(result.message + ' Please visit ' + result.upgradeUrl + ' to upgrade your plan.', 'error');
        } else {
          showMessage(result.message || 'Failed to submit feedback. Please try again.', 'error');
        }
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      showMessage('Network error. Please check your connection and try again.', 'error');
    } finally {
      isSubmitting = true;
    }
  }

  // Initialize widget
  function init() {
    const widget = createWidget();
    
    // Event listeners
    const button = widget.querySelector('.notex-widget-button');
    const modal = widget.querySelector('.notex-widget-modal');
    const closeBtn = widget.querySelector('.notex-widget-close');
    const cancelBtn = widget.querySelector('.notex-widget-cancel');
    const form = widget.querySelector('.notex-widget-form');

    // Open widget
    button.addEventListener('click', showWidget);

    // Close widget
    closeBtn.addEventListener('click', hideWidget);
    cancelBtn.addEventListener('click', hideWidget);

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        hideWidget();
      }
    });

    // Handle form submission
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const formData = new FormData();
      formData.append('project_id', config.projectId);
      formData.append('name', form.querySelector('[name="name"]').value);
      formData.append('email', form.querySelector('[name="email"]').value);
      formData.append('message', form.querySelector('[name="message"]').value);

      submitFeedback(formData);
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) {
        hideWidget();
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();