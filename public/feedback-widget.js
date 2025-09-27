(function() {
  'use strict';

  // Configuration
  const config = {
    projectId: null,
    widgetColor: '#3B82F6',
    widgetTitle: 'Share your feedback with us!',
    greetingText: 'Welcome, tell us what\'s on your mind',
    position: 'bottom-right',
    zIndex: 9999
  };

  // Get configuration from script tag attributes
  function loadConfig() {
    const script = document.querySelector('script[src*="feedback-widget.js"]');
    if (script) {
      config.projectId = script.getAttribute('data-project-id') || config.projectId;
      config.widgetColor = script.getAttribute('data-widget-color') || config.widgetColor;
      config.widgetTitle = script.getAttribute('data-widget-title') || config.widgetTitle;
      config.greetingText = script.getAttribute('data-greeting-text') || config.greetingText;
      config.position = script.getAttribute('data-position') || config.position;
    }
  }

  // Create widget HTML
  function createWidgetHTML() {
    return `
      <div id="notex-feedback-widget" style="
        position: fixed;
        ${config.position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
        ${config.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
        z-index: ${config.zIndex};
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div id="notex-feedback-button" style="
          width: 56px;
          height: 56px;
          background-color: ${config.widgetColor};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transition: all 0.3s ease;
          color: white;
        ">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        
        <div id="notex-feedback-form" style="
          position: absolute;
          ${config.position.includes('bottom') ? 'bottom: 70px;' : 'top: 70px;'}
          ${config.position.includes('right') ? 'right: 0;' : 'left: 0;'}
          width: 320px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
          display: none;
          overflow: hidden;
        ">
          <div style="padding: 20px; border-bottom: 1px solid #e5e7eb;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">
                ${config.widgetTitle}
              </h3>
              <button id="notex-feedback-close" style="
                background: none;
                border: none;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                color: #6b7280;
              ">×</button>
            </div>
            <p style="margin: 0; font-size: 14px; color: #6b7280;">
              ${config.greetingText}
            </p>
          </div>
          
          <div style="padding: 20px;">
            <div style="margin-bottom: 16px;">
              <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 8px;">
                Email (optional)
              </label>
              <input type="email" id="notex-feedback-email" placeholder="your.email@example.com" style="
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 14px;
                box-sizing: border-box;
              ">
            </div>
            
            <div style="margin-bottom: 16px;">
              <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 8px;">
                Your Feedback *
              </label>
              <textarea id="notex-feedback-message" placeholder="Tell us what you think..." rows="4" style="
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 14px;
                resize: vertical;
                box-sizing: border-box;
                font-family: inherit;
              "></textarea>
            </div>
            
            <div style="margin-bottom: 16px;">
              <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 8px;">
                Rating (1-5 stars)
              </label>
              <div id="notex-feedback-rating" style="display: flex; gap: 4px;">
                ${Array.from({length: 5}, (_, i) => `
                  <button type="button" data-rating="${i + 1}" style="
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 24px;
                    color: #d1d5db;
                    transition: color 0.2s;
                  ">★</button>
                `).join('')}
              </div>
            </div>
            
            <div id="notex-feedback-error" style="
              display: none;
              background: #fef2f2;
              border: 1px solid #fecaca;
              color: #dc2626;
              padding: 8px 12px;
              border-radius: 6px;
              font-size: 14px;
              margin-bottom: 16px;
            "></div>
            
            <button id="notex-feedback-submit" style="
              width: 100%;
              background-color: ${config.widgetColor};
              color: white;
              border: none;
              padding: 12px;
              border-radius: 6px;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              transition: opacity 0.2s;
            ">Submit Feedback</button>
          </div>
        </div>
      </div>
    `;
  }

  // Initialize widget
  function initWidget() {
    loadConfig();
    
    if (!config.projectId) {
      console.error('Notex Feedback Widget: Project ID is required');
      return;
    }

    // Create and insert widget
    const widgetContainer = document.createElement('div');
    widgetContainer.innerHTML = createWidgetHTML();
    document.body.appendChild(widgetContainer);

    // Get elements
    const button = document.getElementById('notex-feedback-button');
    const form = document.getElementById('notex-feedback-form');
    const closeBtn = document.getElementById('notex-feedback-close');
    const submitBtn = document.getElementById('notex-feedback-submit');
    const emailInput = document.getElementById('notex-feedback-email');
    const messageInput = document.getElementById('notex-feedback-message');
    const ratingContainer = document.getElementById('notex-feedback-rating');
    const errorDiv = document.getElementById('notex-feedback-error');

    let isOpen = false;
    let selectedRating = 0;

    // Toggle form visibility
    function toggleForm() {
      isOpen = !isOpen;
      form.style.display = isOpen ? 'block' : 'none';
      
      if (isOpen) {
        button.style.transform = 'scale(0.9)';
        button.style.backgroundColor = '#6b7280';
      } else {
        button.style.transform = 'scale(1)';
        button.style.backgroundColor = config.widgetColor;
      }
    }

    // Rating functionality
    function setupRating() {
      const stars = ratingContainer.querySelectorAll('button[data-rating]');
      stars.forEach((star, index) => {
        star.addEventListener('click', () => {
          selectedRating = index + 1;
          updateStars();
        });
        
        star.addEventListener('mouseenter', () => {
          highlightStars(index + 1);
        });
      });
      
      ratingContainer.addEventListener('mouseleave', () => {
        updateStars();
      });
    }

    function highlightStars(count) {
      const stars = ratingContainer.querySelectorAll('button[data-rating]');
      stars.forEach((star, index) => {
        star.style.color = index < count ? '#fbbf24' : '#d1d5db';
      });
    }

    function updateStars() {
      highlightStars(selectedRating);
    }

    // Submit feedback
    async function submitFeedback() {
      const email = emailInput.value.trim();
      const message = messageInput.value.trim();
      
      // Validation
      if (!message) {
        showError('Please enter your feedback message');
        return;
      }
      
      if (email && !isValidEmail(email)) {
        showError('Please enter a valid email address');
        return;
      }

      // Show loading state
      submitBtn.textContent = 'Submitting...';
      submitBtn.disabled = true;

      try {
        const response = await fetch('/api/feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            project_id: config.projectId,
            user_email: email || null,
            content: message,
            rating: selectedRating || null,
            metadata: {
              form_type: 'widget',
              page_url: window.location.href,
              user_agent: navigator.userAgent,
              timestamp: new Date().toISOString()
            }
          })
        });

        if (response.ok) {
          // Success
          form.innerHTML = `
            <div style="padding: 40px 20px; text-align: center;">
              <div style="font-size: 48px; color: #10b981; margin-bottom: 16px;">✓</div>
              <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #111827;">Thank you!</h3>
              <p style="margin: 0; color: #6b7280;">Your feedback has been submitted successfully.</p>
            </div>
          `;
          
          // Close after 3 seconds
          setTimeout(() => {
            toggleForm();
            // Reset form
            setTimeout(() => {
              location.reload();
            }, 1000);
          }, 3000);
        } else {
          throw new Error('Failed to submit feedback');
        }
      } catch (error) {
        console.error('Feedback submission error:', error);
        showError('Failed to submit feedback. Please try again.');
        submitBtn.textContent = 'Submit Feedback';
        submitBtn.disabled = false;
      }
    }

    function showError(message) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
      setTimeout(() => {
        errorDiv.style.display = 'none';
      }, 5000);
    }

    function isValidEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // Event listeners
    button.addEventListener('click', toggleForm);
    closeBtn.addEventListener('click', toggleForm);
    submitBtn.addEventListener('click', submitFeedback);
    
    // Close on outside click
    document.addEventListener('click', (e) => {
      if (isOpen && !form.contains(e.target) && !button.contains(e.target)) {
        toggleForm();
      }
    });

    // Setup rating
    setupRating();

    // Hover effects
    button.addEventListener('mouseenter', () => {
      if (!isOpen) {
        button.style.transform = 'scale(1.1)';
      }
    });
    
    button.addEventListener('mouseleave', () => {
      if (!isOpen) {
        button.style.transform = 'scale(1)';
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();