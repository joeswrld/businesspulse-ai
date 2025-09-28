// public/widget.js
// NoteX Feedback Widget - Fixed Version

// Suppress MetaMask/Ethereum injection warnings
if (typeof window !== 'undefined' && !window.ethereum) {
  console.info("NoteX: No Ethereum provider found, skipping Web3 init...");
}

(function() {
  'use strict';

  // Widget configuration
  var config = {
    projectId: null,
    theme: 'light',
    brandColor: '#3B82F6',
    greeting: 'We value your feedback!',
    supabaseUrl: 'https://xjbrqeqizpoqdjkiyqzt.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqYnJxZXFpenBvcWRqa2l5cXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNTAzMjcsImV4cCI6MjA3MDYyNjMyN30.cxMH9tUGYEOTUauzluSEeNyjG1iMtUZnNIj4QYGNi84'
  };

  // Initialize widget
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

    createWidget();
  }

  // Fallback for older browsers
  function getCurrentScript() {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  }

  // Create widget DOM
  function createWidget() {
    // Create floating button
    var button = document.createElement('button');
    button.id = 'notex-feedback-button';
    button.innerHTML = '💬';
    button.setAttribute('aria-label', 'Open feedback widget');
    
    // Button styles
    var buttonStyles = {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      backgroundColor: config.brandColor,
      color: 'white',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: '10000',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    };

    Object.assign(button.style, buttonStyles);

    // Hover effects
    button.addEventListener('mouseenter', function() {
      button.style.transform = 'scale(1.1)';
      button.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)';
    });

    button.addEventListener('mouseleave', function() {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    });

    // Click handler
    button.addEventListener('click', openFeedbackModal);

    document.body.appendChild(button);
  }

  // Open feedback modal
  function openFeedbackModal() {
    // Remove existing modal if present
    var existing = document.getElementById('notex-feedback-modal');
    if (existing) {
      existing.remove();
    }

    // Create modal
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

    // Create modal content
    var content = document.createElement('div');
    var contentStyles = {
      backgroundColor: config.theme === 'dark' ? '#1f2937' : 'white',
      borderRadius: '12px',
      padding: '24px',
      maxWidth: '500px',
      width: '90%',
      maxHeight: '80vh',
      overflowY: 'auto',
      position: 'relative',
      animation: 'noteXSlideUp 0.3s ease'
    };

    Object.assign(content.style, contentStyles);

    // Modal HTML
    content.innerHTML = createModalHTML();

    modal.appendChild(content);
    document.body.appendChild(modal);

    // Add CSS animations
    addCSS();

    // Add event listeners
    setupModalEvents(modal);
  }

  // Create modal HTML
  function createModalHTML() {
    var textColor = config.theme === 'dark' ? '#ffffff' : '#1f2937';
    var inputBg = config.theme === 'dark' ? '#374151' : '#ffffff';
    var borderColor = config.theme === 'dark' ? '#4b5563' : '#d1d5db';

    return `
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
          <div id="rating-stars" style="display: flex; gap: 4px; margin-bottom: 8px;">
            ${[1,2,3,4,5].map(i => `<span class="star" data-rating="${i}" style="font-size: 24px; cursor: pointer; color: #d1d5db;">⭐</span>`).join('')}
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
            Email (Optional)
          </label>
          <input type="email" id="feedback-email" placeholder="your@email.com" style="width: 100%; padding: 12px; border: 1px solid ${borderColor}; border-radius: 6px; background-color: ${inputBg}; color: ${textColor}; font-size: 14px;">
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
    `;
  }

  // Add CSS animations
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
      .star:hover, .star.active {
        color: #fbbf24 !important;
      }
    `;
    document.head.appendChild(style);
  }

  // Setup modal event listeners
  function setupModalEvents(modal) {
    var closeBtn = document.getElementById('notex-close-btn');
    var cancelBtn = document.getElementById('notex-cancel-btn');
    var form = document.getElementById('notex-feedback-form');
    var stars = document.querySelectorAll('.star');

    // Close modal
    function closeModal() {
      modal.remove();
    }

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', function(e) {
      if (e.target === modal) closeModal();
    });

    // Star rating
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
        } else {
          star.classList.remove('active');
        }
      });
    }

    // Form submission
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      submitFeedback(selectedRating, closeModal);
    });
  }

  // Submit feedback
  function submitFeedback(rating, closeCallback) {
    var type = document.getElementById('feedback-type').value;
    var message = document.getElementById('feedback-message').value.trim();
    var email = document.getElementById('feedback-email').value.trim();

    if (!message) {
      alert('Please provide your feedback message.');
      return;
    }

    // Fixed data structure to match the feedback table schema
    var feedbackData = {
      project_id: config.projectId,
      message: message, // This matches your 'message' column
      form_type: type === 'satisfaction' ? 'customer_satisfaction' : 'product_feedback', // Must match your CHECK constraint
      rating: rating || null, // This matches your 'rating' column
      metadata: {
        email: email || null,
        user_agent: navigator.userAgent,
        page_url: window.location.href,
        original_type: type // Store the original type in metadata
      }
    };

    // Show loading state
    var submitBtn = document.querySelector('#notex-feedback-form button[type="submit"]');
    var originalText = submitBtn.textContent;
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;

    // Submit to Supabase with better error handling
    fetch(config.supabaseUrl + '/rest/v1/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.supabaseKey,
        'Authorization': 'Bearer ' + config.supabaseKey,
        'Prefer': 'return=minimal' // Don't return the inserted row
      },
      body: JSON.stringify(feedbackData)
    })
    .then(function(response) {
      // Check if the response is ok
      if (!response.ok) {
        // Try to get error details from response
        return response.text().then(function(text) {
          var errorMessage = 'HTTP ' + response.status;
          try {
            var errorData = JSON.parse(text);
            errorMessage = errorData.message || errorData.hint || errorMessage;
          } catch (e) {
            // If not JSON, use the text as error message
            if (text) errorMessage = text;
          }
          throw new Error(errorMessage);
        });
      }
      
      // For successful responses, we don't need to parse JSON if using Prefer: return=minimal
      return response.status === 201 ? { success: true } : response.json();
    })
    .then(function(data) {
      // Success
      console.log('Feedback submitted successfully');
      showSuccessMessage();
      setTimeout(closeCallback, 2000);
    })
    .catch(function(error) {
      console.error('Error submitting feedback:', error);
      
      // Show more specific error messages
      var errorMessage = 'Failed to submit feedback. Please try again.';
      
      if (error.message.includes('JWT')) {
        errorMessage = 'Authentication error. Please refresh the page and try again.';
      } else if (error.message.includes('permission')) {
        errorMessage = 'Permission denied. Please contact support.';
      } else if (error.message.includes('duplicate') || error.message.includes('unique')) {
        errorMessage = 'This feedback has already been submitted.';
      } else if (error.message.includes('project_id')) {
        errorMessage = 'Invalid project configuration. Please contact support.';
      } else if (error.message && error.message !== 'Failed to fetch') {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
      
      // Reset button
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    });
  }

  // Show success message
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

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }

})();
