(function () {
  'use strict';

  console.log('🚀 Feedback Widget: Script loaded');

  // 🔑 Your Supabase Project Ref
  const SUPABASE_REF = "xjbrqeqizpoqdjkiyqzt";
  const API_BASE_URL = `https://${SUPABASE_REF}.supabase.co/functions/v1`;
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqYnJxZXFpenBvcWRqa2l5cXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNTAzMjcsImV4cCI6MjA3MDYyNjMyN30.cxMH9tUGYEOTUauzluSEeNyjG1iMtUZnNIj4QYGNi84";

  // --- Default Config ---
  const CONFIG = {
    defaultSettings: {
      theme: 'light',
      primaryColor: '#2563eb',
      textColor: '#1f2937',
      backgroundColor: '#ffffff',
      title: 'Share Your Feedback',
      placeholder: 'Tell us what you think...',
      submitText: 'Submit',
      thankYouMessage: 'Thank you for your feedback!',
      position: 'bottom-right',
      showEmailField: true,
      requireEmail: false,
      borderRadius: '10px',
      fontSize: '14px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      autoOpen: false,
      autoOpenDelay: 5000,
      closeOnSubmit: true,
      trackEvents: true,
    },
  };

  const state = { projectId: null, config: null, isInitialized: false };

  // --- Utils ---
  const DOM = {
    el: (tag, cls, html) => {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      if (html) e.innerHTML = html;
      return e;
    },
    style: (css) => {
      const style = document.createElement('style');
      style.textContent = css;
      document.head.appendChild(style);
    },
    qs: (sel, ctx = document) => ctx.querySelector(sel),
    show: (el) => (el.style.display = 'block'),
    hide: (el) => (el.style.display = 'none'),
  };

  // --- API ---
  const API = {
    async getConfig(projectId) {
      console.log('📡 Feedback Widget: Fetching config for project:', projectId);
      try {
        const res = await fetch(`${API_BASE_URL}/widget-config?project_id=${projectId}`, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
          }
        });
        if (!res.ok) {
          console.warn('⚠️ Feedback Widget: Config fetch failed with status:', res.status);
          throw new Error(`Failed to load widget config: ${res.status}`);
        }
        const json = await res.json();
        console.log('✅ Feedback Widget: Config fetched successfully:', json);
        return { ...CONFIG.defaultSettings, ...json.config };
      } catch (error) {
        console.warn('⚠️ Feedback Widget: Config fetch error:', error.message);
        throw error;
      }
    },
    async submitFeedback(projectId, data) {
      console.log('📤 Feedback Widget: Submitting feedback:', data);
      try {
        const res = await fetch(`${API_BASE_URL}/submit-feedback`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY
          },
          body: JSON.stringify({ project_id: projectId, ...data }),
        });
        if (!res.ok) {
          console.warn('⚠️ Feedback Widget: Submit failed with status:', res.status);
          throw new Error(`Failed to submit feedback: ${res.status}`);
        }
        const result = await res.json();
        console.log('✅ Feedback Widget: Feedback submitted successfully:', result);
        return result;
      } catch (error) {
        console.warn('⚠️ Feedback Widget: Submit error:', error.message);
        throw error;
      }
    },
  };

  // --- UI ---
  const UI = {
    styles(c) {
      console.log('🎨 Feedback Widget: Injecting styles');
      DOM.style(`
        .nx-btn {
          position: fixed; bottom:20px; right:20px;
          width:56px; height:56px; border-radius:50%;
          background:${c.primaryColor}; color:#fff;
          border:none; cursor:pointer; font-size:20px;
          display:flex; align-items:center; justify-content:center;
          box-shadow:0 4px 6px rgba(0,0,0,.1);
          z-index:9999;
          transition: all 0.2s ease;
        }
        .nx-btn:hover {
          transform: scale(1.05);
          box-shadow:0 6px 8px rgba(0,0,0,.15);
        }
        .nx-modal {
          position: fixed; bottom:90px; right:20px;
          width:300px; background:${c.backgroundColor};
          color:${c.textColor}; border-radius:${c.borderRadius};
          box-shadow:0 4px 12px rgba(0,0,0,.15);
          padding:16px; display:none; flex-direction:column;
          z-index:9999; font-family:${c.fontFamily};
          font-size:${c.fontSize};
          border: 1px solid rgba(0,0,0,0.1);
        }
        .nx-modal h3 { 
          margin:0 0 8px 0; font-size:16px; 
          color: ${c.textColor};
        }
        .nx-modal textarea {
          width:100%; min-height:80px; resize:vertical;
          padding:8px; border:1px solid #ccc;
          border-radius:6px; margin-bottom:8px;
          font-family:${c.fontFamily}; font-size:${c.fontSize};
          box-sizing: border-box;
        }
        .nx-modal input {
          width:100%; padding:8px; border:1px solid #ccc;
          border-radius:6px; margin-bottom:8px;
          font-family:${c.fontFamily}; font-size:${c.fontSize};
          box-sizing: border-box;
        }
        .nx-modal button {
          background:${c.primaryColor}; color:#fff;
          border:none; padding:10px; border-radius:6px;
          cursor:pointer; font-size:14px;
          transition: background-color 0.2s ease;
        }
        .nx-modal button:hover {
          opacity: 0.9;
        }
        .nx-modal button:disabled {
          opacity: 0.6; cursor: not-allowed;
        }
        .nx-thankyou { 
          display:none; text-align:center; padding:20px; 
          color: ${c.textColor};
        }
        .nx-error {
          color: #dc2626; font-size: 12px; margin-top: 4px;
        }
        .nx-loading {
          opacity: 0.6; pointer-events: none;
        }
      `);
    },
    render(c) {
      console.log('🎨 Feedback Widget: Rendering UI with config:', c);
      
      // Check if already rendered
      if (document.querySelector('.nx-btn')) {
        console.log('⚠️ Feedback Widget: UI already rendered, skipping');
        return;
      }

      // Button
      const btn = DOM.el('button', 'nx-btn', '✉️');
      btn.setAttribute('aria-label', 'Open feedback form');
      document.body.appendChild(btn);

      // Modal
      const modal = DOM.el('div', 'nx-modal');
      modal.innerHTML = `
        <h3>${c.title}</h3>
        ${c.showEmailField ? '<input type="email" placeholder="Your email (optional)" class="nx-email">' : ''}
        <textarea placeholder="${c.placeholder}" class="nx-message"></textarea>
        <button class="nx-submit">${c.submitText}</button>
        <div class="nx-thankyou">${c.thankYouMessage}</div>
        <div class="nx-error" style="display: none;"></div>
      `;
      document.body.appendChild(modal);

      // Events
      btn.addEventListener('click', () => {
        const isVisible = modal.style.display === 'flex';
        modal.style.display = isVisible ? 'none' : 'flex';
        modal.style.flexDirection = 'column';
        console.log('🔄 Feedback Widget: Modal toggled, visible:', !isVisible);
      });

      // Close modal when clicking outside
      document.addEventListener('click', (e) => {
        if (!modal.contains(e.target) && !btn.contains(e.target)) {
          modal.style.display = 'none';
        }
      });

      const submitBtn = modal.querySelector('.nx-submit');
      const emailInput = modal.querySelector('.nx-email');
      const messageInput = modal.querySelector('.nx-message');
      const thankYouDiv = modal.querySelector('.nx-thankyou');
      const errorDiv = modal.querySelector('.nx-error');

      submitBtn.addEventListener('click', async () => {
        const email = c.showEmailField && emailInput ? emailInput.value.trim() : null;
        const message = messageInput.value.trim();
        
        // Validation
        if (!message) {
          this.showError('Please enter your feedback message');
          return;
        }
        
        if (c.requireEmail && (!email || !email.includes('@'))) {
          this.showError('Please enter a valid email address');
          return;
        }

        // Show loading state
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
        modal.classList.add('nx-loading');
        this.hideError();

        try {
          await API.submitFeedback(state.projectId, {
            user_email: email,
            content: message,
          });
          
          // Success
          messageInput.value = '';
          if (emailInput) emailInput.value = '';
          DOM.hide(messageInput);
          DOM.hide(emailInput);
          DOM.hide(submitBtn);
          DOM.show(thankYouDiv);
          
          console.log('✅ Feedback Widget: Feedback submitted successfully');
          
          if (c.closeOnSubmit) {
            setTimeout(() => { 
              modal.style.display = 'none';
              // Reset modal state
              DOM.show(messageInput);
              if (emailInput) DOM.show(emailInput);
              DOM.show(submitBtn);
              DOM.hide(thankYouDiv);
            }, 2000);
          }
        } catch (err) {
          console.error('❌ Feedback Widget: Submit failed:', err);
          this.showError('Failed to send feedback. Please try again.');
        } finally {
          // Reset loading state
          submitBtn.disabled = false;
          submitBtn.textContent = c.submitText;
          modal.classList.remove('nx-loading');
        }
      });

      // Helper methods
      this.showError = (message) => {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => this.hideError(), 5000);
      };

      this.hideError = () => {
        errorDiv.style.display = 'none';
      };

      console.log('✅ Feedback Widget: UI rendered successfully');
    },
  };

  // --- Safe Script Detection ---
  function getProjectId() {
    console.log('🔍 Feedback Widget: Looking for project ID');
    
    // Try document.currentScript first
    if (document.currentScript) {
      const projectId = document.currentScript.getAttribute('data-project-id');
      if (projectId) {
        console.log('✅ Feedback Widget: Project ID found via currentScript:', projectId);
        return projectId;
      }
    }
    
    // Fallback: search all scripts for data-project-id
    const scripts = document.querySelectorAll('script[data-project-id]');
    for (const script of scripts) {
      const projectId = script.getAttribute('data-project-id');
      if (projectId) {
        console.log('✅ Feedback Widget: Project ID found via script search:', projectId);
        return projectId;
      }
    }
    
    console.error('❌ Feedback Widget: No project ID found in any script tag');
    return null;
  }

  // --- DOM Ready Check ---
  function waitForDOM() {
    return new Promise((resolve) => {
      if (document.readyState === 'loading') {
        console.log('⏳ Feedback Widget: Waiting for DOM to be ready');
        document.addEventListener('DOMContentLoaded', resolve);
      } else {
        console.log('✅ Feedback Widget: DOM already ready');
        resolve();
      }
    });
  }

  // --- Main Initialization ---
  async function init() {
    try {
      console.log('🚀 Feedback Widget: Starting initialization');
      
      // Wait for DOM to be ready
      await waitForDOM();
      
      // Get project ID
      const projectId = getProjectId();
      if (!projectId) {
        console.error('❌ Feedback Widget: Missing data-project-id in embed code');
        return;
      }
      
      state.projectId = projectId;
      console.log('✅ Feedback Widget: Project ID set:', projectId);
      
      // Try to get config, but don't fail if it doesn't work
      let config = CONFIG.defaultSettings;
      try {
        config = await API.getConfig(projectId);
        console.log('✅ Feedback Widget: Using fetched config');
      } catch (err) {
        console.warn('⚠️ Feedback Widget: Using default config due to API failure:', err.message);
        config = CONFIG.defaultSettings;
      }
      
      state.config = config;
      
      // Always render the widget, even if config fetch failed
      UI.styles(config);
      UI.render(config);
      
      state.isInitialized = true;
      console.log('🎉 Feedback Widget: Initialization complete');
      
    } catch (err) {
      console.error('❌ Feedback Widget: Initialization failed:', err);
      
      // Last resort: render with default config
      if (!state.isInitialized) {
        console.log('🆘 Feedback Widget: Rendering with fallback config');
        const fallbackConfig = CONFIG.defaultSettings;
        UI.styles(fallbackConfig);
        UI.render(fallbackConfig);
        state.isInitialized = true;
      }
    }
  }

  // --- Start Initialization ---
  // Use setTimeout to ensure this runs after the script tag is processed
  setTimeout(init, 0);

})();