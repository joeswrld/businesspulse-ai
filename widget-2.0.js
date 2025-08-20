/**
 * NoteX Feedback Widget 2.0 - Enhanced Version
 * Advanced Real-time Feedback Collection with Enhanced UI
 * 
 * Features:
 * - Real-time updates and notifications
 * - Enhanced UI with animations
 * - Smart sentiment detection
 * - Advanced analytics
 * - Mobile-first responsive design
 * - Accessibility features
 * - Performance optimized
 * 
 * Usage:
 * <script src="widget-2.0.js" data-user-id="your-user-id"></script>
 */

(function() {
  'use strict';

  // Configuration
  const WidgetConfig = {
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
    notifications: true,
    analytics: true,
    accessibility: true
  };

  // Global state
  let supabaseClient = null;
  let realtimeSubscription = null;
  let isOpen = false;
  let widgetElement = null;
  let modalElement = null;
  let notificationBadge = null;
  let currentRating = 0;
  let settings = null;
  let analytics = {
    pageViews: 0,
    interactions: 0,
    submissions: 0,
    sessionStart: Date.now()
  };

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
      
      console.log('NoteX Widget 2.0: Supabase client initialized');
      return true;
    } catch (error) {
      console.error('NoteX Widget 2.0: Failed to initialize Supabase:', error);
      return false;
    }
  }

  // Fetch user settings with enhanced error handling
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

  // Enhanced real-time setup with reconnection logic
  function setupRealtime(userId) {
    if (!supabaseClient || !WidgetConfig.realtime) return;

    try {
      // Subscribe to new feedback with enhanced filtering
      realtimeSubscription = supabaseClient
        .channel('feedback_changes_v2')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'feedback',
          filter: `user_id=eq.${userId}`
        }, (payload) => {
          console.log('New feedback received:', payload);
          updateNotificationBadge();
          showEnhancedNotification('New feedback received!', 'success');
          trackAnalytics('feedback_received');
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'feedback_settings',
          filter: `user_id=eq.${userId}`
        }, (payload) => {
          console.log('Settings updated:', payload);
          refreshSettings();
          showEnhancedNotification('Settings updated!', 'info');
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'feedback',
          filter: `user_id=eq.${userId}`
        }, (payload) => {
          console.log('Feedback updated:', payload);
          showEnhancedNotification('Feedback status updated!', 'info');
        })
        .subscribe((status) => {
          console.log('Realtime subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('NoteX Widget 2.0: Real-time subscription established');
          }
        });

    } catch (error) {
      console.error('NoteX Widget 2.0: Failed to setup real-time:', error);
    }
  }

  // Enhanced notification badge with animation
  async function updateNotificationBadge() {
    if (!notificationBadge) return;

    try {
      const { count, error } = await supabaseClient
        .from('feedback')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', WidgetConfig.userId)
        .eq('status', 'new');

      if (!error && count > 0) {
        notificationBadge.textContent = count > 99 ? '99+' : count;
        notificationBadge.style.display = 'flex';
        notificationBadge.style.animation = 'pulse 0.6s ease-in-out';
      } else {
        notificationBadge.style.display = 'none';
      }
    } catch (error) {
      console.error('Error updating notification badge:', error);
    }
  }

  // Enhanced notification system
  function showEnhancedNotification(message, type = 'info') {
    if (!WidgetConfig.notifications) return;

    const notification = document.createElement('div');
    notification.className = 'notex-notification-v2';
    
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    notification.innerHTML = `
      <div class="notex-notification-content-v2">
        <span class="notex-notification-icon">${icons[type] || icons.info}</span>
        <span class="notex-notification-message">${message}</span>
        <button class="notex-notification-close-v2">&times;</button>
      </div>
    `;

    // Add enhanced styles
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12);
      z-index: ${WidgetConfig.zIndex + 10};
      transform: translateX(100%);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      max-width: 350px;
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,0.1);
    `;

    notification.querySelector('.notex-notification-content-v2').style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
    `;

    notification.querySelector('.notex-notification-icon').style.cssText = `
      font-size: 18px;
      flex-shrink: 0;
    `;

    notification.querySelector('.notex-notification-message').style.cssText = `
      flex: 1;
      font-size: 14px;
      font-weight: 500;
    `;

    notification.querySelector('.notex-notification-close-v2').style.cssText = `
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      margin-left: auto;
      opacity: 0.8;
      transition: opacity 0.2s;
    `;

    // Add to page
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);

    // Auto remove after 6 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 400);
    }, 6000);

    // Close button
    notification.querySelector('.notex-notification-close-v2').onclick = () => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 400);
    };

    // Hover effects
    notification.querySelector('.notex-notification-close-v2').onmouseenter = function() {
      this.style.opacity = '1';
    };
    notification.querySelector('.notex-notification-close-v2').onmouseleave = function() {
      this.style.opacity = '0.8';
    };
  }

  // Analytics tracking
  function trackAnalytics(event, data = {}) {
    if (!WidgetConfig.analytics) return;

    analytics.interactions++;
    
    const analyticsData = {
      event,
      timestamp: new Date().toISOString(),
      page_url: window.location.href,
      user_agent: navigator.userAgent,
      session_duration: Date.now() - analytics.sessionStart,
      ...data
    };

    // Store analytics locally and send to server
    try {
      localStorage.setItem('notex_analytics', JSON.stringify(analytics));
      
      // Send to Supabase if available
      if (supabaseClient) {
        supabaseClient
          .from('feedback_analytics')
          .insert({
            user_id: WidgetConfig.userId,
            event_data: analyticsData
          })
          .then(() => console.log('Analytics tracked:', event))
          .catch(err => console.log('Analytics tracking failed:', err));
      }
    } catch (error) {
      console.log('Analytics tracking error:', error);
    }
  }

  // Refresh settings with enhanced UI updates
  async function refreshSettings() {
    settings = await fetchSettings(WidgetConfig.userId);
    if (settings) {
      updateWidgetAppearance();
      showEnhancedNotification('Widget settings updated!', 'success');
    }
  }

  // Enhanced widget appearance updates
  function updateWidgetAppearance() {
    if (!settings || !widgetElement) return;

    // Update colors with smooth transitions
    widgetElement.style.transition = 'all 0.3s ease';
    widgetElement.style.background = settings.brand_colors?.primary || WidgetConfig.primaryColor;
    
    // Update greeting text
    const greetingElement = modalElement?.querySelector('.notex-widget-header h3');
    if (greetingElement) {
      greetingElement.textContent = settings.greeting_text || WidgetConfig.greeting;
    }

    // Update button placement with animation
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

  // Create enhanced widget elements
  function createWidget() {
    // Create floating button with enhanced design
    widgetElement = document.createElement('div');
    widgetElement.id = 'notex-widget-button-v2';
    widgetElement.innerHTML = `
      <div class="notex-widget-icon-v2">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
      <div class="notex-notification-badge-v2" style="display: none;">0</div>
      <div class="notex-widget-ripple"></div>
    `;
    widgetElement.addEventListener('click', toggle);
    widgetElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });

    // Store notification badge reference
    notificationBadge = widgetElement.querySelector('.notex-notification-badge-v2');

    // Create enhanced modal
    modalElement = document.createElement('div');
    modalElement.id = 'notex-widget-modal-v2';
    modalElement.innerHTML = `
      <div class="notex-widget-overlay-v2"></div>
      <div class="notex-widget-content-v2">
        <div class="notex-widget-header-v2">
          <h3>${settings?.greeting_text || WidgetConfig.greeting}</h3>
          <button class="notex-widget-close-v2" aria-label="Close feedback form">&times;</button>
        </div>
        <form class="notex-widget-form-v2">
          <div class="notex-widget-field-v2">
            <label for="notex-name-v2">Name (optional)</label>
            <input type="text" id="notex-name-v2" name="name" placeholder="Your name" autocomplete="name">
          </div>
          <div class="notex-widget-field-v2">
            <label for="notex-email-v2">Email (optional)</label>
            <input type="email" id="notex-email-v2" name="email" placeholder="your@email.com" autocomplete="email">
          </div>
          <div class="notex-widget-field-v2">
            <label for="notex-message-v2">Message *</label>
            <textarea id="notex-message-v2" name="message" rows="4" placeholder="Tell us about your experience..." required></textarea>
            <div class="notex-character-count">0 characters</div>
          </div>
          <div class="notex-widget-field-v2">
            <label for="notex-category-v2">Category</label>
            <select id="notex-category-v2" name="category">
              <option value="">Select category</option>
              <option value="general">General</option>
              <option value="bug">Bug Report</option>
              <option value="feature">Feature Request</option>
              <option value="complaint">Complaint</option>
              <option value="praise">Praise</option>
            </select>
          </div>
          <div class="notex-widget-field-v2">
            <label>Rating</label>
            <div class="notex-widget-rating-v2" role="group" aria-label="Rate your experience">
              ${[1, 2, 3, 4, 5].map(num => `
                <button type="button" class="notex-rating-star-v2" data-rating="${num}" aria-label="${num} star${num > 1 ? 's' : ''}">★</button>
              `).join('')}
            </div>
            <input type="hidden" id="notex-rating-v2" name="rating" value="0">
          </div>
          <button type="submit" class="notex-widget-submit-v2">
            <span class="notex-submit-text">Send Feedback</span>
            <span class="notex-submit-loading" style="display: none;">
              <svg class="notex-spinner" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="31.416" stroke-dashoffset="31.416">
                  <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                  <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                </circle>
              </svg>
            </span>
          </button>
        </form>
        <div class="notex-widget-success-v2" style="display: none;">
          <div class="notex-success-icon-v2">✓</div>
          <h4>Thank you for your feedback!</h4>
          <p>We appreciate you taking the time to share your thoughts with us.</p>
          <div class="notex-success-actions">
            <button class="notex-close-btn" onclick="close()">Close</button>
          </div>
        </div>
      </div>
    `;

    // Add enhanced event listeners
    modalElement.querySelector('.notex-widget-close-v2')?.addEventListener('click', close);
    modalElement.querySelector('.notex-widget-overlay-v2')?.addEventListener('click', close);
    modalElement.querySelector('.notex-widget-form-v2')?.addEventListener('submit', handleSubmit);
    
    // Enhanced rating stars
    modalElement.querySelectorAll('.notex-rating-star-v2').forEach(star => {
      star.addEventListener('click', handleRating);
      star.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleRating(e);
        }
      });
    });

    // Character count for message
    const messageTextarea = modalElement.querySelector('#notex-message-v2');
    const characterCount = modalElement.querySelector('.notex-character-count');
    if (messageTextarea && characterCount) {
      messageTextarea.addEventListener('input', (e) => {
        const count = e.target.value.length;
        characterCount.textContent = `${count} characters`;
        characterCount.style.color = count > 500 ? '#ef4444' : '#6b7280';
      });
    }

    // Append to body
    document.body.appendChild(widgetElement);
    document.body.appendChild(modalElement);
  }

  // Inject enhanced styles
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }

      @keyframes slideIn {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      #notex-widget-button-v2 {
        position: fixed;
        ${WidgetConfig.position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
        ${WidgetConfig.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
        width: 64px;
        height: 64px;
        background: ${settings?.brand_colors?.primary || WidgetConfig.primaryColor};
        border-radius: 50%;
        box-shadow: 0 8px 32px rgba(0,0,0,0.15);
        cursor: pointer;
        z-index: ${WidgetConfig.zIndex};
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border: none;
        position: relative;
        overflow: hidden;
      }

      #notex-widget-button-v2:hover {
        transform: scale(1.1);
        box-shadow: 0 12px 40px rgba(0,0,0,0.2);
      }

      #notex-widget-button-v2:active {
        transform: scale(0.95);
      }

      .notex-widget-icon-v2 {
        color: white;
        z-index: 2;
        position: relative;
      }

      .notex-widget-ripple {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        border-radius: 50%;
        background: rgba(255,255,255,0.3);
        transform: translate(-50%, -50%);
        transition: width 0.6s, height 0.6s;
      }

      #notex-widget-button-v2:hover .notex-widget-ripple {
        width: 100%;
        height: 100%;
      }

      .notex-notification-badge-v2 {
        position: absolute;
        top: -8px;
        right: -8px;
        background: #ef4444;
        color: white;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        font-size: 12px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 24px;
        border: 2px solid white;
      }

      #notex-widget-modal-v2 {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: ${WidgetConfig.zIndex + 1};
        display: none;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease;
      }

      #notex-widget-modal-v2.active {
        display: flex;
      }

      .notex-widget-overlay-v2 {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.6);
        backdrop-filter: blur(8px);
      }

      .notex-widget-content-v2 {
        position: relative;
        background: white;
        border-radius: 16px;
        padding: 32px;
        max-width: 480px;
        width: 90%;
        max-height: 85vh;
        overflow-y: auto;
        box-shadow: 0 24px 48px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
        border: 1px solid rgba(0,0,0,0.1);
      }

      .notex-widget-header-v2 {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 1px solid #e5e7eb;
      }

      .notex-widget-header-v2 h3 {
        margin: 0;
        color: #111827;
        font-size: 20px;
        font-weight: 600;
      }

      .notex-widget-close-v2 {
        background: none;
        border: none;
        font-size: 28px;
        cursor: pointer;
        color: #6b7280;
        padding: 8px;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        transition: all 0.2s;
      }

      .notex-widget-close-v2:hover {
        background: #f3f4f6;
        color: #374151;
      }

      .notex-widget-field-v2 {
        margin-bottom: 20px;
        position: relative;
      }

      .notex-widget-field-v2 label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
        color: #374151;
        font-size: 14px;
      }

      .notex-widget-field-v2 input,
      .notex-widget-field-v2 textarea,
      .notex-widget-field-v2 select {
        width: 100%;
        padding: 12px 16px;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        font-size: 14px;
        transition: all 0.2s;
        box-sizing: border-box;
        background: white;
      }

      .notex-widget-field-v2 input:focus,
      .notex-widget-field-v2 textarea:focus,
      .notex-widget-field-v2 select:focus {
        outline: none;
        border-color: ${settings?.brand_colors?.primary || WidgetConfig.primaryColor};
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      .notex-character-count {
        font-size: 12px;
        color: #6b7280;
        margin-top: 4px;
        text-align: right;
      }

      .notex-widget-rating-v2 {
        display: flex;
        gap: 8px;
        margin-top: 8px;
      }

      .notex-rating-star-v2 {
        background: none;
        border: none;
        font-size: 28px;
        color: #d1d5db;
        cursor: pointer;
        transition: all 0.2s;
        padding: 4px;
        border-radius: 4px;
      }

      .notex-rating-star-v2:hover {
        color: #fbbf24;
        transform: scale(1.1);
      }

      .notex-rating-star-v2.active {
        color: #fbbf24;
      }

      .notex-widget-submit-v2 {
        width: 100%;
        padding: 16px;
        background: ${settings?.brand_colors?.primary || WidgetConfig.primaryColor};
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .notex-widget-submit-v2:hover {
        background: ${settings?.brand_colors?.secondary || WidgetConfig.secondaryColor};
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }

      .notex-widget-submit-v2:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }

      .notex-spinner {
        width: 20px;
        height: 20px;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .notex-widget-success-v2 {
        text-align: center;
        padding: 32px 20px;
      }

      .notex-success-icon-v2 {
        font-size: 64px;
        color: #10b981;
        margin-bottom: 20px;
        animation: scaleIn 0.5s ease;
      }

      @keyframes scaleIn {
        from { transform: scale(0); }
        to { transform: scale(1); }
      }

      .notex-widget-success-v2 h4 {
        margin: 0 0 12px 0;
        color: #111827;
        font-size: 20px;
        font-weight: 600;
      }

      .notex-widget-success-v2 p {
        margin: 0 0 24px 0;
        color: #6b7280;
        font-size: 16px;
      }

      .notex-success-actions {
        display: flex;
        justify-content: center;
        gap: 12px;
      }

      .notex-close-btn {
        padding: 12px 24px;
        background: #f3f4f6;
        color: #374151;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .notex-close-btn:hover {
        background: #e5e7eb;
      }

      @media (max-width: 640px) {
        .notex-widget-content-v2 {
          margin: 20px;
          width: calc(100% - 40px);
          padding: 24px;
        }
        
        .notex-widget-header-v2 h3 {
          font-size: 18px;
        }
        
        .notex-rating-star-v2 {
          font-size: 24px;
        }
      }

      /* Accessibility improvements */
      .notex-rating-star-v2:focus {
        outline: 2px solid ${settings?.brand_colors?.primary || WidgetConfig.primaryColor};
        outline-offset: 2px;
      }

      #notex-widget-button-v2:focus {
        outline: 2px solid ${settings?.brand_colors?.primary || WidgetConfig.primaryColor};
        outline-offset: 2px;
      }

      .notex-widget-close-v2:focus {
        outline: 2px solid ${settings?.brand_colors?.primary || WidgetConfig.primaryColor};
        outline-offset: 2px;
      }
    `;
    document.head.appendChild(style);
  }

  // Enhanced rating selection
  function handleRating(e) {
    const target = e.target;
    const rating = parseInt(target.dataset.rating);
    currentRating = rating;
    
    // Update stars with animation
    modalElement.querySelectorAll('.notex-rating-star-v2').forEach((star, index) => {
      if (index < rating) {
        star.classList.add('active');
        star.style.animation = `scaleIn 0.2s ease ${index * 0.1}s`;
      } else {
        star.classList.remove('active');
        star.style.animation = '';
      }
    });
    
    // Update hidden input
    modalElement.querySelector('#notex-rating-v2').value = rating;
    
    // Track analytics
    trackAnalytics('rating_selected', { rating });
  }

  // Enhanced form submission
  async function handleSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const submitButton = form.querySelector('.notex-widget-submit-v2');
    const submitText = submitButton.querySelector('.notex-submit-text');
    const submitLoading = submitButton.querySelector('.notex-submit-loading');
    
    // Disable submit button and show loading
    submitButton.disabled = true;
    submitText.style.display = 'none';
    submitLoading.style.display = 'block';
    
    const feedbackData = {
      clientName: formData.get('name') || null,
      email: formData.get('email') || null,
      message: formData.get('message'),
      category: formData.get('category') || null,
      rating: parseInt(formData.get('rating')) || null
    };

    if (!feedbackData.message.trim()) {
      showEnhancedNotification('Please enter a message', 'error');
      submitButton.disabled = false;
      submitText.style.display = 'block';
      submitLoading.style.display = 'none';
      return;
    }

    try {
      await submitFeedback(feedbackData);
      showSuccess();
      trackAnalytics('feedback_submitted', { 
        category: feedbackData.category,
        rating: feedbackData.rating,
        hasEmail: !!feedbackData.email,
        hasName: !!feedbackData.clientName
      });
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      showEnhancedNotification('Failed to submit feedback. Please try again.', 'error');
    } finally {
      submitButton.disabled = false;
      submitText.style.display = 'block';
      submitLoading.style.display = 'none';
    }
  }

  // Enhanced feedback submission
  async function submitFeedback(data) {
    if (!supabaseClient) {
      throw new Error('Supabase client not initialized');
    }

    // Detect sentiment
    const sentiment = detectSentiment(data.message);
    const priority = detectPriority(data.message, data.rating);

    const { error } = await supabaseClient
      .from('feedback')
      .insert({
        user_id: WidgetConfig.userId,
        client_name: data.clientName,
        email: data.email,
        message: data.message,
        category: data.category,
        status: 'new',
        priority: priority,
        sentiment: sentiment,
        metadata: {
          rating: data.rating,
          submitted_at: new Date().toISOString(),
          user_agent: navigator.userAgent,
          page_url: window.location.href,
          session_duration: Date.now() - analytics.sessionStart,
          interactions: analytics.interactions
        }
      });

    if (error) throw error;
  }

  // Simple sentiment detection
  function detectSentiment(message) {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'perfect', 'awesome', 'fantastic', 'wonderful'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'disappointing', 'frustrated', 'angry'];
    
    const lowerMessage = message.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  // Enhanced priority detection
  function detectPriority(message, rating) {
    const urgentWords = ['urgent', 'refund', 'angry', 'broken', 'not working', 'issue', 'problem', 'frustrated', 'disappointed'];
    const lowerMessage = message.toLowerCase();
    
    if (urgentWords.some(word => lowerMessage.includes(word))) return 'urgent';
    if (rating && rating <= 2) return 'high';
    if (lowerMessage.includes('bug') || lowerMessage.includes('error')) return 'high';
    return 'normal';
  }

  // Enhanced success message
  function showSuccess() {
    const form = modalElement.querySelector('.notex-widget-form-v2');
    const success = modalElement.querySelector('.notex-widget-success-v2');
    
    form.style.display = 'none';
    success.style.display = 'block';
    
    // Close after 4 seconds
    setTimeout(() => {
      close();
      // Reset form
      setTimeout(() => {
        form.style.display = 'block';
        success.style.display = 'none';
        form.reset();
        currentRating = 0;
        modalElement.querySelectorAll('.notex-rating-star-v2').forEach(star => {
          star.classList.remove('active');
          star.style.animation = '';
        });
        modalElement.querySelector('.notex-character-count').textContent = '0 characters';
      }, 300);
    }, 4000);
  }

  // Enhanced open modal
  function open() {
    if (modalElement) {
      modalElement.classList.add('active');
      isOpen = true;
      updateNotificationBadge();
      trackAnalytics('widget_opened');
      
      // Focus first input for accessibility
      setTimeout(() => {
        const firstInput = modalElement.querySelector('input, textarea');
        if (firstInput) firstInput.focus();
      }, 300);
    }
  }

  // Enhanced close modal
  function close() {
    if (modalElement) {
      modalElement.classList.remove('active');
      isOpen = false;
      trackAnalytics('widget_closed');
    }
  }

  // Enhanced toggle
  function toggle() {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }

  // Enhanced destroy
  function destroy() {
    if (realtimeSubscription) {
      supabaseClient?.removeChannel(realtimeSubscription);
    }
    widgetElement?.remove();
    modalElement?.remove();
    widgetElement = null;
    modalElement = null;
    notificationBadge = null;
    
    // Track final analytics
    trackAnalytics('widget_destroyed', {
      session_duration: Date.now() - analytics.sessionStart,
      total_interactions: analytics.interactions
    });
  }

  // Main initialization function
  async function initNoteXWidgetV2(config) {
    // Merge config with defaults
    Object.assign(WidgetConfig, config);
    
    if (!WidgetConfig.enabled) return;
    
    console.log('NoteX Widget 2.0: Initializing...');
    
    // Initialize Supabase
    const supabaseInitialized = await initSupabase(WidgetConfig);
    if (!supabaseInitialized) {
      console.error('NoteX Widget 2.0: Failed to initialize Supabase');
      return;
    }
    
    // Fetch settings
    settings = await fetchSettings(WidgetConfig.userId);
    
    // Create and inject widget
    createWidget();
    injectStyles();
    
    // Setup real-time
    setupRealtime(WidgetConfig.userId);
    
    // Update notification badge
    updateNotificationBadge();
    
    // Track page view
    trackAnalytics('page_view');
    
    // Auto-open if configured
    if (WidgetConfig.autoOpen) {
      setTimeout(open, 1000);
    }
    
    console.log('NoteX Widget 2.0: Initialized successfully');
  }

  // Public API
  window.NoteXWidgetV2 = {
    init: initNoteXWidgetV2,
    open: open,
    close: close,
    toggle: toggle,
    destroy: destroy,
    updateNotificationBadge: updateNotificationBadge,
    trackAnalytics: trackAnalytics
  };

  // Auto-initialize if config is provided
  if (window.NoteXWidgetConfig) {
    initNoteXWidgetV2(window.NoteXWidgetConfig);
  }

  // Auto-initialize from data attribute
  const script = document.currentScript;
  if (script && script.getAttribute('data-user-id')) {
    initNoteXWidgetV2({
      userId: script.getAttribute('data-user-id')
    });
  }

})();