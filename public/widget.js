(function() {
  'use strict';

  // Configuration
  const config = {
    workspace: document.currentScript.getAttribute('data-workspace'),
    color: document.currentScript.getAttribute('data-color') || '#3B82F6',
    greeting: document.currentScript.getAttribute('data-greeting') || 'How can we help you today?',
    position: document.currentScript.getAttribute('data-position') || 'bottom-right',
    apiUrl: window.location.origin + '/api/feedback'
  };

  // Create widget HTML
  function createWidget() {
    const widget = document.createElement('div');
    widget.id = 'notex-widget';
    widget.innerHTML = `
      <div id="notex-button" style="
        position: fixed;
        ${config.position.includes('bottom') ? 'bottom' : 'top'}: 20px;
        ${config.position.includes('right') ? 'right' : 'left'}: 20px;
        width: 60px;
        height: 60px;
        background-color: ${config.color};
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        transition: transform 0.2s ease;
      ">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      
      <div id="notex-modal" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 10001;
        display: none;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          background: white;
          border-radius: 12px;
          padding: 24px;
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        ">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #1f2937;">${config.greeting}</h3>
            <button id="notex-close" style="
              background: none;
              border: none;
              font-size: 24px;
              cursor: pointer;
              color: #6b7280;
              padding: 0;
              width: 24px;
              height: 24px;
              display: flex;
              align-items: center;
              justify-content: center;
            ">×</button>
          </div>
          
          <form id="notex-form">
            <div style="margin-bottom: 16px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">Your Message</label>
              <textarea 
                id="notex-message" 
                required 
                style="
                  width: 100%;
                  min-height: 120px;
                  padding: 12px;
                  border: 1px solid #d1d5db;
                  border-radius: 6px;
                  font-family: inherit;
                  font-size: 14px;
                  resize: vertical;
                  box-sizing: border-box;
                "
                placeholder="Tell us what you think..."
              ></textarea>
            </div>
            
            <div style="margin-bottom: 16px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">Rating (Optional)</label>
              <div id="notex-rating" style="display: flex; gap: 4px;">
                ${[1, 2, 3, 4, 5].map(i => `
                  <button type="button" data-rating="${i}" style="
                    background: none;
                    border: 1px solid #d1d5db;
                    border-radius: 4px;
                    width: 32px;
                    height: 32px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                  ">★</button>
                `).join('')}
              </div>
            </div>
            
            <div style="margin-bottom: 16px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">Type</label>
              <select id="notex-type" style="
                width: 100%;
                padding: 12px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 14px;
                box-sizing: border-box;
              ">
                <option value="other">General Feedback</option>
                <option value="bug">Bug Report</option>
                <option value="feature">Feature Request</option>
                <option value="praise">Praise</option>
              </select>
            </div>
            
            <div style="margin-bottom: 20px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">Your Name (Optional)</label>
              <input 
                type="text" 
                id="notex-name" 
                style="
                  width: 100%;
                  padding: 12px;
                  border: 1px solid #d1d5db;
                  border-radius: 6px;
                  font-size: 14px;
                  box-sizing: border-box;
                "
                placeholder="Your name"
              />
            </div>
            
            <div style="margin-bottom: 20px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">Your Email (Optional)</label>
              <input 
                type="email" 
                id="notex-email" 
                style="
                  width: 100%;
                  padding: 12px;
                  border: 1px solid #d1d5db;
                  border-radius: 6px;
                  font-size: 14px;
                  box-sizing: border-box;
                "
                placeholder="your@email.com"
              />
            </div>
            
            <button type="submit" style="
              width: 100%;
              background-color: ${config.color};
              color: white;
              border: none;
              border-radius: 6px;
              padding: 12px;
              font-size: 16px;
              font-weight: 500;
              cursor: pointer;
              transition: background-color 0.2s ease;
            ">Send Feedback</button>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(widget);
    return widget;
  }

  // Initialize widget
  function init() {
    const widget = createWidget();
    let selectedRating = 0;

    // Rating selection
    const ratingButtons = widget.querySelectorAll('[data-rating]');
    ratingButtons.forEach((button, index) => {
      button.addEventListener('click', () => {
        selectedRating = index + 1;
        ratingButtons.forEach((btn, i) => {
          btn.style.backgroundColor = i < selectedRating ? '#fbbf24' : 'white';
          btn.style.borderColor = i < selectedRating ? '#fbbf24' : '#d1d5db';
        });
      });
    });

    // Button hover effect
    const button = widget.querySelector('#notex-button');
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.1)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
    });

    // Open modal
    button.addEventListener('click', () => {
      const modal = widget.querySelector('#notex-modal');
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    });

    // Close modal
    const closeButton = widget.querySelector('#notex-close');
    closeButton.addEventListener('click', closeModal);

    const modal = widget.querySelector('#notex-modal');
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    function closeModal() {
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }

    // Form submission
    const form = widget.querySelector('#notex-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const message = widget.querySelector('#notex-message').value;
      const type = widget.querySelector('#notex-type').value;
      const name = widget.querySelector('#notex-name').value;
      const email = widget.querySelector('#notex-email').value;

      if (!message.trim()) return;

      const submitButton = form.querySelector('button[type="submit"]');
      const originalText = submitButton.textContent;
      submitButton.textContent = 'Sending...';
      submitButton.disabled = true;

      try {
        const response = await fetch(config.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workspace: config.workspace,
            content: message,
            rating: selectedRating || null,
            type: type,
            user_name: name || null,
            user_email: email || null,
            page_url: window.location.href,
            user_agent: navigator.userAgent
          })
        });

        if (response.ok) {
          // Show success message
          form.innerHTML = `
            <div style="text-align: center; padding: 20px;">
              <div style="font-size: 48px; color: #10b981; margin-bottom: 16px;">✓</div>
              <h3 style="margin: 0 0 8px 0; color: #1f2937;">Thank you!</h3>
              <p style="margin: 0; color: #6b7280;">Your feedback has been sent successfully.</p>
            </div>
          `;
          
          setTimeout(() => {
            closeModal();
            // Reset form
            form.innerHTML = form.innerHTML; // This will be replaced by the original form HTML
            location.reload(); // Simple way to reset everything
          }, 2000);
        } else {
          throw new Error('Failed to send feedback');
        }
      } catch (error) {
        console.error('Error sending feedback:', error);
        submitButton.textContent = 'Error - Try Again';
        submitButton.style.backgroundColor = '#ef4444';
        
        setTimeout(() => {
          submitButton.textContent = originalText;
          submitButton.style.backgroundColor = config.color;
          submitButton.disabled = false;
        }, 3000);
      }
    });
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();