(function () {
  'use strict';

  // Simple sentiment analyzer
  function getSentiment(text) {
    const t = text.toLowerCase();
    if (t.includes('love') || t.includes('great') || t.includes('good') || t.includes('awesome')) return 'Positive';
    if (t.includes('hate') || t.includes('bad') || t.includes('terrible') || t.includes('worst')) return 'Negative';
    return 'Neutral';
  }

  const CONFIG = {
    apiUrl: 'https://xjbrqeqizpoqdjkiyqzt.supabase.co',
    apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqYnJxZXFpenBvcWRqa2l5cXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNTAzMjcsImV4cCI6MjA3MDYyNjMyN30.cxMH9tUGYEOTUauzluSEeNyjG1iMtUZnNIj4QYGNi84',
    widgetId: 'notex-feedback-widget',
    buttonId: 'notex-feedback-button',
    modalId: 'notex-feedback-modal',
    overlayId: 'notex-feedback-overlay'
  };

  function getProjectId() {
    const script = document.querySelector('script[data-project-id]');
    return script ? script.getAttribute('data-project-id') : null;
  }

  async function fetchWidgetSettings(projectId) {
    try {
      const res = await fetch(`${CONFIG.apiUrl}/rest/v1/feedback_settings?project_id=eq.${projectId}&select=*`, {
        headers: {
          apikey: CONFIG.apiKey,
          Authorization: `Bearer ${CONFIG.apiKey}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch widget settings');
      const data = await res.json();
      return data[0] || null;
    } catch (e) {
      console.error('Error fetching widget settings:', e);
      return null;
    }
  }

  async function submitFeedback(projectId, email, message, sentiment) {
    const res = await fetch(`${CONFIG.apiUrl}/rest/v1/feedback`, {
      method: 'POST',
      headers: {
        apikey: CONFIG.apiKey,
        Authorization: `Bearer ${CONFIG.apiKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({ project_id: projectId, email: email || null, message, sentiment })
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('API Error:', res.status, err);
      throw new Error('Failed to submit feedback');
    }
  }

  function createStyles() {
    const style = document.createElement('style');
    style.textContent = `/* your existing CSS unchanged */`;
    document.head.appendChild(style);
  }

  function createWidget(settings) {
    const widget = document.createElement('div');
    widget.id = CONFIG.widgetId;

    const button = document.createElement('button');
    button.id = CONFIG.buttonId;
    button.innerHTML = '💬 ' + (settings?.widget_title || 'Feedback');
    button.style.backgroundColor = settings?.widget_color || '#3B82F6';

    widget.appendChild(button);
    return widget;
  }

  function createModal(settings) {
    const overlay = document.createElement('div');
    overlay.id = CONFIG.overlayId;

    const modal = document.createElement('div');
    modal.id = CONFIG.modalId;

    modal.innerHTML = `
      <div class="notex-modal-header">
        <button class="notex-close" onclick="closeFeedbackModal()">&times;</button>
        <h2 class="notex-modal-title">${settings?.widget_title || 'Share your feedback with us!'}</h2>
        <p class="notex-modal-subtitle">${settings?.greeting_text || "Welcome, tell us what's on your mind"}</p>
      </div>
      <div class="notex-modal-body">
        <form id="notex-feedback-form">
          <div class="notex-form-group">
            <label class="notex-label" for="notex-email">Email (optional)</label>
            <input type="email" id="notex-email" class="notex-input" placeholder="your@email.com">
          </div>
          <div class="notex-form-group">
            <label class="notex-label" for="notex-message">Message *</label>
            <textarea id="notex-message" class="notex-textarea" placeholder="Tell us what you think..." required></textarea>
            <div id="notex-error" class="notex-error"></div>
          </div>
          <button type="submit" class="notex-button" id="notex-submit-btn">Send Feedback</button>
        </form>
      </div>
    `;
    overlay.appendChild(modal);
    return overlay;
  }

  function showModal() {
    document.getElementById(CONFIG.overlayId).style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    document.getElementById(CONFIG.overlayId).style.display = 'none';
    document.body.style.overflow = '';
  }

  function showSuccess() {
    const modal = document.getElementById(CONFIG.modalId);
    modal.innerHTML = `
      <div class="notex-success">
        <div class="notex-success-icon">✅</div>
        <h3 class="notex-success-title">Thank you!</h3>
        <p class="notex-success-message">Your feedback has been submitted successfully.</p>
      </div>
    `;
    showToast('Feedback submitted successfully!', 'success');
    setTimeout(() => {
      closeModal();
      initWidget();
    }, 2000);
  }

  function showToast(message, type = 'success') {
    const old = document.getElementById('notex-toast');
    if (old) old.remove();
    const toast = document.createElement('div');
    toast.id = 'notex-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed; top:20px; right:20px; background:${type==='success'?'#10b981':'#ef4444'};
      color:white; padding:12px 20px; border-radius:8px; z-index:10002; font-size:14px; 
      box-shadow:0 4px 12px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  async function handleSubmit(e, projectId) {
    e.preventDefault();

    const emailInput = document.getElementById('notex-email');
    const messageInput = document.getElementById('notex-message');
    const errorDiv = document.getElementById('notex-error');
    const submitBtn = document.getElementById('notex-submit-btn');

    const email = emailInput.value.trim();
    const message = messageInput.value.trim();

    errorDiv.textContent = '';
    if (!message) {
      errorDiv.textContent = 'Message is required';
      messageInput.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    try {
      const sentiment = getSentiment(message);
      await submitFeedback(projectId, email, message, sentiment);
      showSuccess();
    } catch (err) {
      console.error('Submit failed:', err);
      errorDiv.textContent = 'Failed to submit feedback. Please try again.';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Feedback';
    }
  }

  async function initWidget() {
    const projectId = getProjectId();
    if (!projectId) {
      console.error('No project ID found.');
      return;
    }

    document.getElementById(CONFIG.widgetId)?.remove();
    document.getElementById(CONFIG.overlayId)?.remove();

    createStyles();
    const settings = await fetchWidgetSettings(projectId);

    const widget = createWidget(settings);
    const modal = createModal(settings);

    document.body.appendChild(widget);
    document.body.appendChild(modal);

    document.getElementById(CONFIG.buttonId)?.addEventListener('click', showModal);
    document.getElementById('notex-feedback-form')?.addEventListener('submit', e => handleSubmit(e, projectId));
    document.getElementById(CONFIG.overlayId)?.addEventListener('click', e => {
      if (e.target.id === CONFIG.overlayId) closeModal();
    });
  }

  window.closeFeedbackModal = closeModal;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }

})();
