/**
 * NoteX Feedback Widget - Production Ready
 * Full Supabase Integration with Real-time Features
 * 
 * Usage:
 * <script src="widget.js"></script>
 * <script>
 *   initNoteXWidget({
 *     userId: 'your-user-id',
 *     supabaseUrl: 'https://xjbrqeqizpoqdjkiyqzt.supabase.co',
 *     supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqYnJxZXFpenBvcWRqa2l5cXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNTAzMjcsImV4cCI6MjA3MDYyNjMyN30.cxMH9tUGYEOTUauzluSEeNyjG1iMtUZnNIj4QYGNi84'
 *   });
 * </script>
 */

(function() {
  'use strict';

  // Configuration interface
  const NoteXWidgetConfig = {
    userId: '',
    supabaseUrl: 'https://xjbrqeqizpoqdjkiyqzt.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqYnJxZXFpenBvcWRqa2l5cXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNTAzMjcsImV4cCI6MjA3MDYyNjMyN30.cxMH9tUGYEOTUauzluSEeNyjG1iMtUZnNIj4QYGNi84',
    position: 'bottom-right',
    theme: 'light',
    greeting: 'How was your experience?',
    primaryColor: '#3b82f6',
    secondaryColor: '#1e40af',
    enabled: true,
    autoOpen: false,
    zIndex: 9999,
    realtime: true,
    notifications: true
  };

  // Supabase client
  let supabaseClient = null;
  let realtimeSubscription = null;

  // Widget state
  let isOpen = false;
  let widgetElement = null;
  let modalElement = null;
  let notificationBadge = null;
  let currentRating = 0;
  let settings = null;

  // Initialize Supabase client
  async function initSupabase(config) {
    try {
      // Load Supabase from CDN if not already loaded
      if (typeof window.supabase === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.async = true;
        document.head.appendChild(script);
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });
      }

      // Create Supabase client
      supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
      
      console.log('NoteX Widget: Supabase client initialized');
      return true;
    } catch (error) {
      console.error('NoteX Widget: Failed to initialize Supabase:', error);
      return false;
    }
  }

  // Fetch user settings
  async function fetchSettings(userId) {
    try {
      const { data, error } = await supabaseClient
        .from('feedback_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching settings:', error);
        return null;
      }

      return data || {
        brand_colors: { primary: '#3b82f6', secondary: '#1e40af' },
        greeting_text: 'How was your experience?',
        button_placement: 'bottom',
        widget_enabled: true,
        auto_notifications: true
      };
    } catch (error) {
      console.error('Error fetching settings:', error);
      return null;
    }
  }

  // Setup real-time subscriptions
  function setupRealtime(userId) {
    if (!supabaseClient || !NoteXWidgetConfig.realtime) return;

    try {
      // Subscribe to new feedback
      realtimeSubscription = supabaseClient
        .channel('feedback_changes')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'feedback',
          filter: `user_id=eq.${userId}`
        }, (payload) => {
          console.log('New feedback received:', payload);
          updateNotificationBadge();
          showNotification('New feedback received!');
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'feedback_settings',
          filter: `user_id=eq.${userId}`
        }, (payload) => {
          console.log('Settings updated:', payload);
          refreshSettings();
        })
        .subscribe();

      console.log('NoteX Widget: Real-time subscription established');
    } catch (error) {
      console.error('NoteX Widget: Failed to setup real-time:', error);
    }
  }

  // Update notification badge
  async function updateNotificationBadge() {
    if (!notificationBadge) return;

    try {
      const { count, error } = await supabaseClient
        .from('feedback')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', NoteXWidgetConfig.userId)
        .eq('status', 'new');

      if (!error && count > 0) {
        notificationBadge.textContent = count > 99 ? '99+' : count;
        notificationBadge.style.display = 'block';
      } else {
        notificationBadge.style.display = 'none';
      }
    } catch (error) {
      console.error('Error updating notification badge:', error);
    }
  }

  // Show notification
  function showNotification(message) {
    if (!NoteXWidgetConfig.notifications) return;

    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notex-notification';
    notification.innerHTML = `
      <div class="notex-notification-content">
        <span>${message}</span>
        <button class="notex-notification-close">&times;</button>
      </div>
    `;

    // Add styles
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${NoteXWidgetConfig.primaryColor};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: ${NoteXWidgetConfig.zIndex + 10};
      transform: translateX(100%);
      transition: transform 0.3s ease;
      max-width: 300px;
    `;

    notification.querySelector('.notex-notification-content').style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
    `;

    notification.querySelector('.notex-notification-close').style.cssText = `
      background: none;
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      padding: 0;
      margin-left: auto;
    `;

    // Add to page
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);

    // Auto remove after 5 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    }, 5000);

    // Close button
    notification.querySelector('.notex-notification-close').onclick = () => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    };
  }

  // Refresh settings
  async function refreshSettings() {
    settings = await fetchSettings(NoteXWidgetConfig.userId);
    if (settings) {
      // Update widget appearance
      updateWidgetAppearance();
    }
  }

  // Update widget appearance based on settings
  function updateWidgetAppearance() {
    if (!settings || !widgetElement) return;

    // Update colors
    widgetElement.style.background = settings.brand_colors?.primary || NoteXWidgetConfig.primaryColor;
    
    // Update greeting text
    const greetingElement = modalElement?.querySelector('.notex-widget-header h3');
    if (greetingElement) {
      greetingElement.textContent = settings.greeting_text || NoteXWidgetConfig.greeting;
    }

    // Update button placement
    const position = settings.button_placement === 'left' ? 'bottom-left' : 
                    settings.button_placement === 'right' ? 'bottom-right' : 'bottom-right';
    
    widgetElement.style.cssText = widgetElement.style.cssText.replace(
      /(bottom|top|left|right):\s*\d+px/g,
      position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'
    );
    widgetElement.style.cssText = widgetElement.style.cssText.replace(
      /(left|right):\s*\d+px/g,
      position.includes('right') ? 'right: 20px;' : 'left: 20px;'
    );
  }

  // Create widget elements
  function createWidget() {
    // Create floating button
    widgetElement = document.createElement('div');
    widgetElement.id = 'notex-widget-button';
    widgetElement.innerHTML = `
      <div class="notex-widget-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
      <div class="notex-notification-badge" style="display: none;">0</div>
    `;
    widgetElement.addEventListener('click', toggle);

    // Store notification badge reference
    notificationBadge = widgetElement.querySelector('.notex-notification-badge');

    // Create modal
    modalElement = document.createElement('div');
    modalElement.id = 'notex-widget-modal';
    modalElement.innerHTML = `
      <div class="notex-widget-overlay"></div>
      <div class="notex-widget-content">
        <div class="notex-widget-header">
          <h3>${settings?.greeting_text || NoteXWidgetConfig.greeting}</h3>
          <button class="notex-widget-close">&times;</button>
        </div>
        <form class="notex-widget-form">
          <div class="notex-widget-field">
            <label for="notex-name">Name (optional)</label>
            <input type="text" id="notex-name" name="name" placeholder="Your name">
          </div>
          <div class="notex-widget-field">
            <label for="notex-email">Email (optional)</label>
            <input type="email" id="notex-email" name="email" placeholder="your@email.com">
          </div>
          <div class="notex-widget-field">
            <label for="notex-message">Message *</label>
            <textarea id="notex-message" name="message" rows="4" placeholder="Tell us about your experience..." required></textarea>
          </div>
          <div class="notex-widget-field">
            <label for="notex-category">Category</label>
            <select id="notex-category" name="category">
              <option value="">Select category</option>
              <option value="general">General</option>
              <option value="bug">Bug Report</option>
              <option value="feature">Feature Request</option>
              <option value="complaint">Complaint</option>
              <option value="praise">Praise</option>
            </select>
          </div>
          <div class="notex-widget-field">
            <label>Rating</label>
            <div class="notex-widget-rating">
              ${[1, 2, 3, 4, 5].map(num => `
                <button type="button" class="notex-rating-star" data-rating="${num}">★</button>
              `).join('')}
            </div>
            <input type="hidden" id="notex-rating" name="rating" value="0">
          </div>
          <button type="submit" class="notex-widget-submit">Send Feedback</button>
        </form>
        <div class="notex-widget-success" style="display: none;">
          <div class="notex-success-icon">✓</div>
          <h4>Thank you for your feedback!</h4>
          <p>We appreciate you taking the time to share your thoughts with us.</p>
        </div>
      </div>
    `;

    // Add event listeners
    modalElement.querySelector('.notex-widget-close').addEventListener('click', close);
    modalElement.querySelector('.notex-widget-overlay').addEventListener('click', close);
    modalElement.querySelector('.notex-widget-form').addEventListener('submit', handleSubmit);
    
    // Rating stars
    modalElement.querySelectorAll('.notex-rating-star').forEach(star => {
      star.addEventListener('click', handleRating);
    });

    // Append to body
    document.body.appendChild(widgetElement);
    document.body.appendChild(modalElement);
  }

  // Inject styles
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #notex-widget-button {
        position: fixed;
        ${NoteXWidgetConfig.position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
        ${NoteXWidgetConfig.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
        width: 60px;
        height: 60px;
        background: ${settings?.brand_colors?.primary || NoteXWidgetConfig.primaryColor};
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        cursor: pointer;
        z-index: ${NoteXWidgetConfig.zIndex};
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        border: none;
        position: relative;
      }

      #notex-widget-button:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(0,0,0,0.2);
      }

      .notex-widget-icon {
        color: white;
      }

      .notex-notification-badge {
        position: absolute;
        top: -5px;
        right: -5px;
        background: #ef4444;
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        font-size: 12px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 20px;
      }

      #notex-widget-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: ${NoteXWidgetConfig.zIndex + 1};
        display: none;
        align-items: center;
        justify-content: center;
      }

      #notex-widget-modal.active {
        display: flex;
      }

      .notex-widget-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        backdrop-filter: blur(4px);
      }

      .notex-widget-content {
        position: relative;
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 400px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 40px rgba(0,0,0,0.1);
      }

      .notex-widget-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }

      .notex-widget-header h3 {
        margin: 0;
        color: #333;
        font-size: 18px;
      }

      .notex-widget-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .notex-widget-field {
        margin-bottom: 16px;
      }

      .notex-widget-field label {
        display: block;
        margin-bottom: 6px;
        font-weight: 500;
        color: #333;
      }

      .notex-widget-field input,
      .notex-widget-field textarea,
      .notex-widget-field select {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        transition: border-color 0.3s ease;
        box-sizing: border-box;
      }

      .notex-widget-field input:focus,
      .notex-widget-field textarea:focus,
      .notex-widget-field select:focus {
        outline: none;
        border-color: ${settings?.brand_colors?.primary || NoteXWidgetConfig.primaryColor};
      }

      .notex-widget-rating {
        display: flex;
        gap: 4px;
      }

      .notex-rating-star {
        background: none;
        border: none;
        font-size: 24px;
        color: #ddd;
        cursor: pointer;
        transition: color 0.3s ease;
      }

      .notex-rating-star.active {
        color: #ffd700;
      }

      .notex-widget-submit {
        width: 100%;
        padding: 12px;
        background: ${settings?.brand_colors?.primary || NoteXWidgetConfig.primaryColor};
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 16px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.3s ease;
      }

      .notex-widget-submit:hover {
        background: ${settings?.brand_colors?.secondary || NoteXWidgetConfig.secondaryColor};
      }

      .notex-widget-submit:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .notex-widget-success {
        text-align: center;
        padding: 20px;
      }

      .notex-success-icon {
        font-size: 48px;
        color: #10b981;
        margin-bottom: 16px;
      }

      .notex-widget-success h4 {
        margin: 0 0 8px 0;
        color: #333;
      }

      .notex-widget-success p {
        margin: 0;
        color: #666;
      }

      @media (max-width: 480px) {
        .notex-widget-content {
          margin: 20px;
          width: calc(100% - 40px);
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Handle rating selection
  function handleRating(e) {
    const target = e.target;
    const rating = parseInt(target.dataset.rating);
    currentRating = rating;
    
    // Update stars
    modalElement.querySelectorAll('.notex-rating-star').forEach((star, index) => {
      if (index < rating) {
        star.classList.add('active');
      } else {
        star.classList.remove('active');
      }
    });
    
    // Update hidden input
    modalElement.querySelector('#notex-rating').value = rating;
  }

  // Handle form submission
  async function handleSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const submitButton = form.querySelector('.notex-widget-submit');
    
    // Disable submit button
    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';
    
    const feedbackData = {
      clientName: formData.get('name') || null,
      email: formData.get('email') || null,
      message: formData.get('message'),
      category: formData.get('category') || null,
      rating: parseInt(formData.get('rating')) || null
    };

    if (!feedbackData.message.trim()) {
      alert('Please enter a message');
      submitButton.disabled = false;
      submitButton.textContent = 'Send Feedback';
      return;
    }

    try {
      await submitFeedback(feedbackData);
      showSuccess();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Send Feedback';
    }
  }

  // Submit feedback to Supabase
  async function submitFeedback(data) {
    if (!supabaseClient) {
      throw new Error('Supabase client not initialized');
    }

    const { error } = await supabaseClient
      .from('feedback')
      .insert({
        user_id: NoteXWidgetConfig.userId,
        client_name: data.clientName,
        email: data.email,
        message: data.message,
        category: data.category,
        status: 'new',
        priority: data.rating && data.rating <= 2 ? 'high' : 'normal',
        metadata: {
          rating: data.rating,
          submitted_at: new Date().toISOString(),
          user_agent: navigator.userAgent,
          page_url: window.location.href
        }
      });

    if (error) throw error;
  }

  // Show success message
  function showSuccess() {
    const form = modalElement.querySelector('.notex-widget-form');
    const success = modalElement.querySelector('.notex-widget-success');
    
    form.style.display = 'none';
    success.style.display = 'block';
    
    // Close after 3 seconds
    setTimeout(() => {
      close();
      // Reset form
      setTimeout(() => {
        form.style.display = 'block';
        success.style.display = 'none';
        form.reset();
        currentRating = 0;
        modalElement.querySelectorAll('.notex-rating-star').forEach(star => {
          star.classList.remove('active');
        });
      }, 300);
    }, 3000);
  }

  // Open modal
  function open() {
    if (modalElement) {
      modalElement.classList.add('active');
      isOpen = true;
      // Update notification badge when opened
      updateNotificationBadge();
    }
  }

  // Close modal
  function close() {
    if (modalElement) {
      modalElement.classList.remove('active');
      isOpen = false;
    }
  }

  // Toggle modal
  function toggle() {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }

  // Destroy widget
  function destroy() {
    if (realtimeSubscription) {
      supabaseClient?.removeChannel(realtimeSubscription);
    }
    widgetElement?.remove();
    modalElement?.remove();
    widgetElement = null;
    modalElement = null;
    notificationBadge = null;
  }

  // Main initialization function
  async function initNoteXWidget(config) {
    // Merge config with defaults
    Object.assign(NoteXWidgetConfig, config);
    
    if (!NoteXWidgetConfig.enabled) return;
    
    console.log('NoteX Widget: Initializing...');
    
    // Initialize Supabase
    const supabaseInitialized = await initSupabase(NoteXWidgetConfig);
    if (!supabaseInitialized) {
      console.error('NoteX Widget: Failed to initialize Supabase');
      return;
    }
    
    // Fetch settings
    settings = await fetchSettings(NoteXWidgetConfig.userId);
    
    // Create and inject widget
    createWidget();
    injectStyles();
    
    // Setup real-time
    setupRealtime(NoteXWidgetConfig.userId);
    
    // Update notification badge
    updateNotificationBadge();
    
    // Auto-open if configured
    if (NoteXWidgetConfig.autoOpen) {
      setTimeout(open, 1000);
    }
    
    console.log('NoteX Widget: Initialized successfully');
  }

  // Public API
  window.NoteXWidget = {
    init: initNoteXWidget,
    open: open,
    close: close,
    toggle: toggle,
    destroy: destroy,
    updateNotificationBadge: updateNotificationBadge
  };

  // Auto-initialize if config is provided
  if (window.NoteXWidgetConfig) {
    initNoteXWidget(window.NoteXWidgetConfig);
  }

})();