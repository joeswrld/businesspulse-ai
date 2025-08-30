(function() {
  'use strict';

  // Widget version
  const WIDGET_VERSION = '1.1.0';
  
  console.log('NoteX Feedback Widget v' + WIDGET_VERSION + ' initializing...');

  // Get project ID from script tag
  const scriptTag = document.currentScript;
  const projectId = scriptTag.dataset.projectId;

  if (!projectId) {
    console.error('NoteX Feedback Widget: Project ID is required');
    return;
  }

  console.log('NoteX Feedback Widget: Project ID loaded:', projectId);

  // Create widget container
  const widgetContainer = document.createElement('div');
  widgetContainer.id = 'notex-feedback-widget';
  widgetContainer.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  // Create feedback button
  const feedbackButton = document.createElement('button');
  feedbackButton.id = 'notex-feedback-button';
  feedbackButton.innerHTML = `
   
   <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 48 45" fill="#ffffff" stroke-width="2"><path fill="none" stroke="#ffffff" stroke-linecap="round" stroke-linejoin="round" d="m14.597 17.362l.851 2.619h2.753l-2.227 1.618l.851 2.619l-2.228-1.618l-2.228 1.618l.851-2.619l-2.228-1.618h2.754zm9.403 0l.851 2.619h2.754l-2.228 1.618l.851 2.619L24 22.6l-2.228 1.618l.851-2.619l-2.228-1.618h2.754zm9.403 0l.851 2.619h2.754l-2.228 1.618l.851 2.619l-2.228-1.618l-2.228 1.618l.851-2.619l-2.227-1.618h2.753z"/><path fill="none" stroke="#ffffff" stroke-linecap="round" stroke-linejoin="round" d="M39.284 8.669H8.716A4.216 4.216 0 0 0 4.5 12.885v15.81a4.216 4.216 0 0 0 4.216 4.217h10.905l3.37 5.837a1.164 1.164 0 0 0 2.017 0l3.37-5.837h10.906a4.216 4.216 0 0 0 4.216-4.217v-15.81a4.216 4.216 0 0 0-4.216-4.217"/></svg>
  `;
  feedbackButton.style.cssText = `
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: #2563eb;
    color: white;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'notex-feedback-overlay';
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 10000;
    display: none;
    align-items: center;
    justify-content: center;
  `;

  // Create modal
  const modal = document.createElement('div');
  modal.id = 'notex-feedback-modal';
  modal.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    position: relative;
  `;

  // Create form
  const form = document.createElement('form');
  form.id = 'notex-feedback-form';
  form.innerHTML = `
    <div style="margin-bottom: 20px;">
      <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 18px; font-weight: 600;">
        Share your thoughts with us
      </h3>
      <p style="margin: 0; color: #6b7280; font-size: 14px;">
        We'd love to hear your feedback to improve our service ❤️.
      </p>
    </div>

    <input type="hidden" name="project_id" value="${projectId}" />

    <div style="margin-bottom: 16px;">
      <input 
        type="text" 
        name="name" 
        placeholder="Your Name"
        required 
        style="
          width: 100%;
          padding: 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
        "
      />
    </div>

    <div style="margin-bottom: 16px;">
      <input 
        type="email" 
        name="email" 
        placeholder="Your Email"
        required
        style="
          width: 100%;
          padding: 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
        "
      />
    </div>

    <div style="margin-bottom: 20px;">
      <textarea 
        name="message" 
        placeholder="Your feedback..." 
        required
        rows="4"
        style="
          width: 100%;
          padding: 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
          resize: vertical;
          font-family: inherit;
        "
      ></textarea>
    </div>

    <div id="notex-quota" style="margin: 8px 0 12px 0; color: #374151; font-size: 12px; display: none;"></div>

    <div style="display: flex; gap: 12px; justify-content: flex-end;">
      <button 
        type="button" 
        id="notex-cancel-button"
        style="
          padding: 10px 16px;
          border: 1px solid #d1d5db;
          background: white;
          color: #374151;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        "
      >
        Cancel
      </button>
      <button 
        type="submit"
        id="notex-submit-button"
        style="
          padding: 10px 20px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        "
      >
        Send Feedback
      </button>
    </div>

    <div 
      id="notex-success-message" 
      style="
        display: none;
        margin-top: 16px;
        padding: 12px;
        background: #d1fae5;
        color: #065f46;
        border-radius: 6px;
        font-size: 14px;
        text-align: center;
      "
    >
      ✅ Thank you! Your feedback has been submitted successfully.<br>
      <small style="opacity: 0.8;">We'll review it and get back to you soon.</small>
    </div>

    <div 
      id="notex-error-message" 
      style="
        display: none;
        margin-top: 16px;
        padding: 12px;
        background: #fee2e2;
        color: #991b1b;
        border-radius: 6px;
        font-size: 14px;
        text-align: center;
      "
    >
      ⚠️ Something went wrong. Please try again.
    </div>
  `;

  // Close button
  const closeButton = document.createElement('button');
  closeButton.innerHTML = '×';
  closeButton.style.cssText = `
    position: absolute;
    top: 12px;
    right: 12px;
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #6b7280;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
  `;

  // Add elements to DOM
  modal.appendChild(closeButton);
  modal.appendChild(form);
  modalOverlay.appendChild(modal);
  widgetContainer.appendChild(feedbackButton);
  widgetContainer.appendChild(modalOverlay);
  document.body.appendChild(widgetContainer);

  // Widget ready
  console.log('NoteX Feedback Widget v' + WIDGET_VERSION + ' ready!');

  // Event handlers
  function openModal() {
    modalOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    // Fetch remaining quota on open
    const quotaEl = document.getElementById('notex-quota');
    const submitButton = document.getElementById('notex-submit-button');
    const projectIdField = form.querySelector('input[name="project_id"]');
    const pid = projectIdField ? projectIdField.value : null;
    if (!pid) return;

    quotaEl.style.display = 'none';
    quotaEl.textContent = '';
    submitButton.disabled = false;
    submitButton.style.opacity = '1';

    const usageCheckUrl = 'https://xjbrqeqizpoqdjkiyqzt.supabase.co/functions/v1/check-usage';
    fetch(usageCheckUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: pid, feature: 'feedback' })
    })
      .then(r => r.json().catch(() => ({})))
      .then(result => {
        if (!result || result.success !== true) return;
        quotaEl.style.display = 'block';
        if (result.isUnlimited || result.limit === -1) {
          quotaEl.textContent = 'Quota: Unlimited';
        } else {
          quotaEl.textContent = `Quota: ${Math.max(0, result.remaining)} remaining`;
          if (result.remaining <= 0) {
            submitButton.disabled = true;
            submitButton.style.opacity = '0.6';
          }
        }
      })
      .catch(() => {});
  }

  function closeModal() {
    modalOverlay.style.display = 'none';
    document.body.style.overflow = '';
    // Reset form
    form.reset();
    document.getElementById('notex-success-message').style.display = 'none';
    document.getElementById('notex-error-message').style.display = 'none';
  }

  // Button hover effects
  feedbackButton.addEventListener('mouseenter', () => {
    feedbackButton.style.transform = 'scale(1.1)';
    feedbackButton.style.boxShadow = '0 6px 16px rgba(37, 99, 235, 0.4)';
  });

  feedbackButton.addEventListener('mouseleave', () => {
    feedbackButton.style.transform = 'scale(1)';
    feedbackButton.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.3)';
  });

  // Event listeners
  feedbackButton.addEventListener('click', openModal);
  closeButton.addEventListener('click', closeModal);
  document.getElementById('notex-cancel-button').addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitButton = document.getElementById('notex-submit-button');
    const successMessage = document.getElementById('notex-success-message');
    const errorMessage = document.getElementById('notex-error-message');

    // Show loading state
    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';
    submitButton.style.opacity = '0.7';
    successMessage.style.display = 'none';
    errorMessage.style.display = 'none';

    try {
      const formData = new FormData(form);
      
      // Log the data being sent for debugging
      console.log('NoteX Feedback Widget: Submitting feedback', {
        projectId: formData.get('project_id'),
        name: formData.get('name'),
        email: formData.get('email'),
        message: formData.get('message')
      });

      // First check usage limits before submitting
      const usageCheckUrl = 'https://xjbrqeqizpoqdjkiyqzt.supabase.co/functions/v1/check-usage';
      console.log('NoteX Feedback Widget: Checking usage limits...');
      
      const usageResponse = await fetch(usageCheckUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: formData.get('project_id'),
          feature: 'feedback'
        })
      });

      let usageResult = null;
      if (usageResponse.ok) {
        usageResult = await usageResponse.json();
      } else {
        console.warn('NoteX Feedback Widget: Usage check failed, proceeding optimistically');
      }
      console.log('NoteX Feedback Widget: Usage check result', usageResult);

      if (usageResult && usageResult.success === true && usageResult.canUse === false) {
        // Show limit reached message
        errorMessage.innerHTML = `
          <div style="text-align: center;">
            <div style="font-weight: 600; margin-bottom: 8px; color: #dc2626;">
              ⚠️ Limit reached — contact admin
            </div>
            <div style="font-size: 13px; color: #991b1b; margin-bottom: 12px;">
              You have reached your feedback submission limit.
            </div>
            <div style="font-size: 12px; color: #7c2d12; background: #fef3c7; padding: 8px; border-radius: 4px; border: 1px solid #f59e0b;">
              Please contact the admin to increase your limit or upgrade your plan.
            </div>
          </div>
        `;
        errorMessage.style.display = 'block';
        return;
      }

      // Use the correct Supabase URL
      const apiUrl = 'https://xjbrqeqizpoqdjkiyqzt.supabase.co/functions/v1/feedback-api';
      console.log('NoteX Feedback Widget: Submitting to', apiUrl);
      console.log('NoteX Feedback Widget: Project ID:', formData.get('project_id'));

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData
      });

      console.log('NoteX Feedback Widget: Response status', response.status);
      console.log('NoteX Feedback Widget: Response headers', Object.fromEntries(response.headers.entries()));

      // Handle different response types
      let result;
      try {
        const responseText = await response.text();
        console.log('NoteX Feedback Widget: Response text', responseText);
        
        if (responseText) {
          result = JSON.parse(responseText);
        } else {
          result = { success: false, error: 'Empty response from server' };
        }
      } catch (parseError) {
        console.error('NoteX Feedback Widget: Failed to parse response', parseError);
        result = { success: false, error: 'Invalid response format' };
      }
      
      console.log('NoteX Feedback Widget: Response data', result);

      if (response.ok && result.success) {
        successMessage.style.display = 'block';
        form.reset();
        // Auto-close after 3 seconds
        setTimeout(closeModal, 3000);
      } else {
        let errorMsg = result.error || `HTTP ${response.status}: ${response.statusText}`;
        
        // Handle specific error cases
        if (response.status === 401) {
          errorMsg = 'API authentication error. Please contact support.';
        } else if (response.status === 404) {
          errorMsg = 'API endpoint not found. The feedback system may be temporarily unavailable.';
        } else if (response.status === 500) {
          errorMsg = 'Server error. Please try again later.';
        } else if (response.status === 0) {
          errorMsg = 'Network error. Please check your connection and try again.';
        } else if (response.status >= 400) {
          errorMsg = `Request failed (${response.status}). Please try again.`;
        }
        
        console.error('NoteX Feedback Widget: API error', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('NoteX Feedback Widget: Submission error', error);
      
      // Show more specific error message
      const errorText = error.message || 'Network error or server unavailable';
      errorMessage.textContent = `⚠️ ${errorText}. Please try again.`;
      errorMessage.style.display = 'block';
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Send Feedback';
      submitButton.style.opacity = '1';
    }
  });

  // Keyboard support
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.style.display === 'flex') {
      closeModal();
    }
  });

})();