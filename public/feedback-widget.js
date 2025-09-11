(function () {
  'use strict';

  // 🔑 Your Supabase Project Ref
  const SUPABASE_REF = "xjbrqeqizpoqdjkiyqzt";
  const API_BASE_URL = `https://${SUPABASE_REF}.supabase.co/functions/v1`;

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

  const state = { projectId: null, config: null };

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
      const res = await fetch(`${API_BASE_URL}/widget-config?project_id=${projectId}`);
      if (!res.ok) throw new Error('Failed to load widget config');
      const json = await res.json();
      return { ...CONFIG.defaultSettings, ...json.config };
    },
    async submitFeedback(projectId, data) {
      const res = await fetch(`${API_BASE_URL}/submit-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, ...data }),
      });
      if (!res.ok) throw new Error('Failed to submit feedback');
      return res.json();
    },
  };

  // --- UI ---
  const UI = {
    styles(c) {
      DOM.style(`
        .nx-btn {
          position: fixed; bottom:20px; right:20px;
          width:56px; height:56px; border-radius:50%;
          background:${c.primaryColor}; color:#fff;
          border:none; cursor:pointer; font-size:20px;
          display:flex; align-items:center; justify-content:center;
          box-shadow:0 4px 6px rgba(0,0,0,.1);
          z-index:9999;
        }
        .nx-modal {
          position: fixed; bottom:90px; right:20px;
          width:300px; background:${c.backgroundColor};
          color:${c.textColor}; border-radius:${c.borderRadius};
          box-shadow:0 4px 12px rgba(0,0,0,.15);
          padding:16px; display:none; flex-direction:column;
          z-index:9999; font-family:${c.fontFamily};
          font-size:${c.fontSize};
        }
        .nx-modal h3 { margin:0 0 8px 0; font-size:16px; }
        .nx-modal textarea {
          width:100%; min-height:80px; resize:vertical;
          padding:8px; border:1px solid #ccc;
          border-radius:6px; margin-bottom:8px;
          font-family:${c.fontFamily}; font-size:${c.fontSize};
        }
        .nx-modal input {
          width:100%; padding:8px; border:1px solid #ccc;
          border-radius:6px; margin-bottom:8px;
        }
        .nx-modal button {
          background:${c.primaryColor}; color:#fff;
          border:none; padding:10px; border-radius:6px;
          cursor:pointer; font-size:14px;
        }
        .nx-thankyou { display:none; text-align:center; padding:20px; }
      `);
    },
    render(c) {
      // Button
      const btn = DOM.el('button', 'nx-btn', '✉️');
      document.body.appendChild(btn);

      // Modal
      const modal = DOM.el('div', 'nx-modal');
      modal.innerHTML = `
        <h3>${c.title}</h3>
        ${c.showEmailField ? '<input type="email" placeholder="Your email">' : ''}
        <textarea placeholder="${c.placeholder}"></textarea>
        <button>${c.submitText}</button>
        <div class="nx-thankyou">${c.thankYouMessage}</div>
      `;
      document.body.appendChild(modal);

      // Events
      btn.addEventListener('click', () => {
        modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
        modal.style.flexDirection = 'column';
      });

      modal.querySelector('button').addEventListener('click', async () => {
        const email = c.showEmailField ? modal.querySelector('input').value : null;
        const message = modal.querySelector('textarea').value;
        if (c.requireEmail && !email) {
          alert('Email is required');
          return;
        }
        try {
          await API.submitFeedback(state.projectId, {
            user_email: email,
            content: message,
          });
          modal.querySelector('textarea').value = '';
          if (c.showEmailField) modal.querySelector('input').value = '';
          DOM.hide(modal.querySelector('textarea'));
          DOM.hide(modal.querySelector('input'));
          DOM.hide(modal.querySelector('button'));
          DOM.show(modal.querySelector('.nx-thankyou'));
          if (c.closeOnSubmit) {
            setTimeout(() => { modal.style.display = 'none'; }, 2000);
          }
        } catch (err) {
          alert('Failed to send feedback');
        }
      });
    },
  };

  // --- Init ---
  (async function init() {
    const script = document.currentScript;
    const projectId = script.getAttribute('data-project-id');
    if (!projectId) return console.error("⚠️ Missing data-project-id in embed code");
    state.projectId = projectId;
    try {
      const config = await API.getConfig(projectId);
      state.config = config;
      UI.styles(config);
      UI.render(config);
    } catch (err) {
      console.error('Widget init failed:', err);
    }
  })();

})();
