// public/widget.js
// NoteX Feedback Widget - With Trial Access Control

if (typeof window !== 'undefined' && !window.ethereum) {
  console.info("NoteX: No Ethereum provider found, skipping Web3 init...");
}

(function() {
  'use strict';

  var config = {
    projectId: null,
    theme: 'light',
    brandColor: '#3B82F6',
    greeting: 'We value your feedback!',
    supabaseUrl: 'https://xjbrqeqizpoqdjkiyqzt.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqYnJxZXFpenBvcWRqa2l5cXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNTAzMjcsImV4cCI6MjA3MDYyNjMyN30.cxMH9tUGYEOTUauzluSEeNyjG1iMtUZnNIj4QYGNi84'
  };

  var widgetState = {
    isAccessValid: false,
    isChecking: true,
    errorMessage: null
  };

  function initWidget() {
    var script = document.currentScript || getCurrentScript();
    if (script) {
      config.projectId = script.getAttribute('data-project-id');
      config.theme = script.getAttribute('data-theme') || config.theme;
      config.brandColor = script.getAttribute('data-brand-color') || config.brandColor;
      config.greeting = script.getAttribute('data-greeting') || config.greeting;
    }

    if (!config.projectId) {
      console.error('NoteX: data-project-id attribute is required');
      return;
    }

    // Validate project ID format (UUID)
    var uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(config.projectId)) {
      console.error('NoteX: Invalid project ID format. Must be a valid UUID.');
      return;
    }

    // Check access before creating widget
    checkWidgetAccess();
  }

  function getCurrentScript() {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  }

  function checkWidgetAccess() {
    // Check if the project owner has an active subscription or valid trial
    fetch(config.supabaseUrl + '/rest/v1/rpc/check_widget_access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.supabaseKey,
        'Authorization': 'Bearer ' + config.supabaseKey
      },
      body: JSON.stringify({ project_id_param: config.projectId })
    })
    .then(function(response) {
      if (!response.ok) {
        throw new Error('Access check failed');
      }
      return response.json();
    })
    .then(function(data) {
      widgetState.isAccessValid = data === true || (data && data.has_access === true);
      widgetState.isChecking = false;
      
      if (widgetState.isAccessValid) {
        createWidget();
      } else {
        console.warn('NoteX: Widget disabled - Trial expired or subscription inactive');
        widgetState.errorMessage = 'Trial expired';
      }
    })
    .catch(function(error) {
      console.error('NoteX: Access check error:', error);
      // Fail open - create widget anyway if check fails
      widgetState.isAccessValid = true;
      widgetState.isChecking = false;
      createWidget();
    });
  }

  function createWidget() {
    if (!widgetState.isAccessValid) {
      console.warn('NoteX: Widget access denied');
      return;
    }

    // Create floating button with text
    var button = document.createElement('button');
    button.id = 'notex-feedback-button';
    button.setAttribute('aria-label', 'Share your feedback');
    
    // Button content with emoji and text
    button.innerHTML = '<span style="margin-right: 6px;">💬</span><span>Feedback</span>';
    
    var buttonStyles = {
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      padding: '12px 20px',
      borderRadius: '25px',
      backgroundColor: config.brandColor,
      color: 'white',
      border: 'none',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: '10000',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    };

    Object.assign(button.style, buttonStyles);

    button.addEventListener('mouseenter', function() {
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)';
    });

    button.addEventListener('mouseleave', function() {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    });

    button.addEventListener('click', openFeedbackModal);

    document.body.appendChild(button);
  }

  function openFeedbackModal() {
    var existing = document.getElementById('notex-feedback-modal');
    if (existing) {
      existing.remove();
    }

    var modal = document.createElement('div');
    modal.id = 'notex-feedback-modal';
    
    var modalStyles = {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: '10001',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      animation: 'noteXFadeIn 0.3s ease'
    };

    Object.assign(modal.style, modalStyles);

    var content = document.createElement('div');
    var contentStyles = {
      backgroundColor: config.theme === 'dark' ? '#1f2937' : 'white',
      borderRadius: '12px',
      padding: '0',
      maxWidth: '500px',
      width: '90%',
      maxHeight: '80vh',
      overflowY: 'auto',
      position: 'relative',
      animation: 'noteXSlideUp 0.3s ease'
    };

    Object.assign(content.style, contentStyles);

    content.innerHTML = createModalHTML();

    modal.appendChild(content);
    document.body.appendChild(modal);

    addCSS();
    setupModalEvents(modal);
  }

  function createModalHTML() {
    var textColor = config.theme === 'dark' ? '#ffffff' : '#1f2937';
    var inputBg = config.theme === 'dark' ? '#374151' : '#ffffff';
    var borderColor = config.theme === 'dark' ? '#4b5563' : '#d1d5db';

    return `
      <div style="padding: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="margin: 0; color: ${textColor}; font-size: 20px; font-weight: 600;">
            ${config.greeting}
          </h2>
          <button id="notex-close-btn" style="background: none; border: none; font-size: 24px; cursor: pointer; color: ${textColor}; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
            ×
          </button>
        </div>

        <form id="notex-feedback-form">
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 500; color: ${textColor};">
              Feedback Type
            </label>
            <select id="feedback-type" style="width: 100%; padding: 12px; border: 1px solid ${borderColor}; border-radius: 6px; background-color: ${inputBg}; color: ${textColor}; font-size: 14px;">
              <option value="satisfaction">Customer Satisfaction</option>
              <option value="product">Product Feedback</option>
            </select>
          </div>

          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 500; color: ${textColor};">
              Rating
            </label>
            <div id="rating-stars" style="display: flex; gap: 8px; margin-bottom: 8px;">
              ${[1,2,3,4,5].map(i => `<span class="star" data-rating="${i}" style="font-size: 32px; cursor: pointer; color: #d1d5db; transition: color 0.2s ease;">☆</span>`).join('')}
            </div>
          </div>

          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 500; color: ${textColor};">
              Your Feedback
            </label>
            <textarea id="feedback-message" placeholder="Tell us what you think..." style="width: 100%; padding: 12px; border: 1px solid ${borderColor}; border-radius: 6px; background-color: ${inputBg}; color: ${textColor}; font-size: 14px; min-height: 100px; resize: vertical; font-family: inherit;"></textarea>
          </div>

          <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 500; color: ${textColor};">
              Email 
            </label>
            <input type="email" id="feedback-email" placeholder="your@email.com" style="width: 100%; padding: 12px; border: 1px solid ${borderColor}; border-radius: 6px; background-color: ${inputBg}; color: ${textColor}; font-size: 14px; ">
          </div>

          <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button type="button" id="notex-cancel-btn" style="padding: 10px 20px; border: 1px solid ${borderColor}; background-color: transparent; color: ${textColor}; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;">
              Cancel
            </button>
            <button type="submit" style="padding: 10px 20px; background-color: ${config.brandColor}; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;">
              Submit Feedback
            </button>
          </div>
        </form>
      </div>

      <!-- Powered by NoteX -->
      <div style="background-color: ${config.theme === 'dark' ? '#111827' : '#f3f4f6'}; padding: 12px; text-align: center; border-top: 1px solid ${borderColor}; border-radius: 0 0 12px 12px;">
        <a href="https://notex.com.ng/" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: #6b7280; text-decoration: none; transition: color 0.2s ease;">
          Powered by <span style="font-weight: 600;">NoteX</span>
        </a>
      </div>
    `;
  }

  function addCSS() {
    if (document.getElementById('notex-css')) return;

    var style = document.createElement('style');
    style.id = 'notex-css';
    style.textContent = `
      @keyframes noteXFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes noteXSlideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .star.active {
        color: #fbbf24 !important;
      }
      .star.active::before {
        content: '★';
      }
      .star:not(.active)::before {
        content: '☆';
      }
      #notex-feedback-modal a:hover {
        color: #3b82f6 !important;
      }
    `;
    document.head.appendChild(style);
  }

  function setupModalEvents(modal) {
    var closeBtn = document.getElementById('notex-close-btn');
    var cancelBtn = document.getElementById('notex-cancel-btn');
    var form = document.getElementById('notex-feedback-form');
    var stars = document.querySelectorAll('.star');

    function closeModal() {
      modal.remove();
    }

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', function(e) {
      if (e.target === modal) closeModal();
    });

    var selectedRating = 0;
    stars.forEach(function(star) {
      star.addEventListener('click', function() {
        selectedRating = parseInt(this.getAttribute('data-rating'));
        updateStars(selectedRating);
      });

      star.addEventListener('mouseenter', function() {
        var hoverRating = parseInt(this.getAttribute('data-rating'));
        updateStars(hoverRating);
      });
    });

    document.getElementById('rating-stars').addEventListener('mouseleave', function() {
      updateStars(selectedRating);
    });

    function updateStars(rating) {
      stars.forEach(function(star, index) {
        if (index < rating) {
          star.classList.add('active');
          star.textContent = '★';
        } else {
          star.classList.remove('active');
          star.textContent = '☆';
        }
      });
    }

    form.addEventListener('submit', function(e) {
      e.preventDefault();
      submitFeedback(selectedRating, closeModal);
    });
  }

  function submitFeedback(rating, closeCallback) {
    var type = document.getElementById('feedback-type').value;
    var message = document.getElementById('feedback-message').value.trim();
    var email = document.getElementById('feedback-email').value.trim();

    if (!message) {
      alert('Please provide your feedback message.');
      return;
    }

    if (!config.projectId) {
      alert('Invalid project configuration. Please contact support.');
      return;
    }

    var feedbackData = {
      project_id: config.projectId,
      message: message,
      form_type: type === 'satisfaction' ? 'customer_satisfaction' : 'product_feedback',
      rating: rating || null,
      metadata: {
        email: email || null,
        user_agent: navigator.userAgent,
        page_url: window.location.href,
        original_type: type
      }
    };

    var submitBtn = document.querySelector('#notex-feedback-form button[type="submit"]');
    var originalText = submitBtn.textContent;
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;

    fetch(config.supabaseUrl + '/rest/v1/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.supabaseKey,
        'Authorization': 'Bearer ' + config.supabaseKey,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(feedbackData)
    })
    .then(function(response) {
      if (!response.ok) {
        return response.text().then(function(text) {
          var errorMessage = 'HTTP ' + response.status;
          try {
            var errorData = JSON.parse(text);
            errorMessage = errorData.message || errorData.hint || errorMessage;
          } catch (e) {
            if (text) errorMessage = text;
          }
          throw new Error(errorMessage);
        });
      }
      
      return response.status === 201 ? { success: true } : response.json();
    })
    .then(function(data) {
      console.log('Feedback submitted successfully');
      showSuccessMessage();
      setTimeout(closeCallback, 2000);
    })
    .catch(function(error) {
      console.error('Error submitting feedback:', error);
      
      var errorMessage = 'Failed to submit feedback. Please try again.';
      
      if (error.message.includes('JWT')) {
        errorMessage = 'Authentication error. Please refresh the page and try again.';
      } else if (error.message.includes('permission')) {
        errorMessage = 'Permission denied. Please contact support.';
      } else if (error.message.includes('duplicate') || error.message.includes('unique')) {
        errorMessage = 'This feedback has already been submitted.';
      } else if (error.message.includes('violates foreign key constraint') || 
                 error.message.includes('project_id')) {
        errorMessage = 'Invalid project ID. Please verify your widget configuration.';
      } else if (error.message && error.message !== 'Failed to fetch') {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
      
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    });
  }

  function showSuccessMessage() {
    var form = document.getElementById('notex-feedback-form');
    var textColor = config.theme === 'dark' ? '#ffffff' : '#1f2937';
    
    form.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
        <h3 style="margin: 0 0 12px 0; color: ${textColor}; font-size: 18px; font-weight: 600;">
          Thank you for your feedback!
        </h3>
        <p style="margin: 0; color: ${textColor}; opacity: 0.7; font-size: 14px;">
          Your message has been received and we'll review it soon.
        </p>
      </div>
    `;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }

})();
