/**
 * Real-time Feedback Dashboard
 * Displays all feedback submissions with live updates
 */

import { createClient } from '@supabase/supabase-js';
import { PROJECT_ID } from './feedback-api.js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

class FeedbackDashboard {
  constructor() {
    this.feedback = [];
    this.filteredFeedback = [];
    this.currentFilter = 'all';
    this.isLoading = false;
    
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadInitialFeedback();
    this.setupRealtimeSubscription();
  }

  setupEventListeners() {
    // Filter buttons
    const filterButtons = document.querySelectorAll('[data-filter]');
    filterButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const filter = e.target.dataset.filter;
        this.setFilter(filter);
      });
    });

    // Search input
    const searchInput = document.getElementById('feedback-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterFeedback(e.target.value);
      });
    }

    // Refresh button
    const refreshButton = document.getElementById('refresh-feedback');
    if (refreshButton) {
      refreshButton.addEventListener('click', () => {
        this.loadInitialFeedback();
      });
    }
  }

  async loadInitialFeedback() {
    this.setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .eq('project_id', PROJECT_ID)
        .order('created_at', { ascending: false });

      if (error) throw error;

      this.feedback = data || [];
      this.filteredFeedback = [...this.feedback];
      this.renderFeedback();
      this.updateStats();

    } catch (error) {
      console.error('Error loading feedback:', error);
      this.showError('Failed to load feedback. Please try again.');
    } finally {
      this.setLoading(false);
    }
  }

  setupRealtimeSubscription() {
    const channel = supabase
      .channel('feedback-stream')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'feedback',
          filter: `project_id=eq.${PROJECT_ID}`
        }, 
        (payload) => {
          console.log('New feedback received:', payload.new);
          this.handleNewFeedback(payload.new);
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'feedback',
          filter: `project_id=eq.${PROJECT_ID}`
        },
        (payload) => {
          console.log('Feedback updated:', payload.new);
          this.handleUpdatedFeedback(payload.new);
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          this.showNotification('Connected to live updates', 'success');
        } else if (status === 'CHANNEL_ERROR') {
          this.showNotification('Connection lost. Trying to reconnect...', 'warning');
        }
      });
  }

  handleNewFeedback(newFeedback) {
    // Add to beginning of array (most recent first)
    this.feedback.unshift(newFeedback);
    this.filteredFeedback = [...this.feedback];
    
    // Apply current filter
    this.applyCurrentFilter();
    
    // Render with animation
    this.renderFeedback();
    this.updateStats();
    
    // Show notification
    this.showNotification(`New feedback from ${this.getChannelDisplayName(newFeedback.channel)}`, 'info');
    
    // Scroll to top to show new feedback
    const container = document.getElementById('feedback-container');
    if (container) {
      container.scrollTop = 0;
    }
  }

  handleUpdatedFeedback(updatedFeedback) {
    // Find and update existing feedback
    const index = this.feedback.findIndex(f => f.id === updatedFeedback.id);
    if (index !== -1) {
      this.feedback[index] = updatedFeedback;
      this.filteredFeedback = [...this.feedback];
      this.applyCurrentFilter();
      this.renderFeedback();
    }
  }

  setFilter(filter) {
    this.currentFilter = filter;
    
    // Update active button
    document.querySelectorAll('[data-filter]').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
    
    this.applyCurrentFilter();
    this.renderFeedback();
  }

  applyCurrentFilter() {
    if (this.currentFilter === 'all') {
      this.filteredFeedback = [...this.feedback];
    } else {
      this.filteredFeedback = this.feedback.filter(f => f.channel === this.currentFilter);
    }
  }

  filterFeedback(searchTerm) {
    if (!searchTerm.trim()) {
      this.applyCurrentFilter();
    } else {
      const term = searchTerm.toLowerCase();
      this.filteredFeedback = this.feedback.filter(f => 
        f.message.toLowerCase().includes(term) ||
        (f.name && f.name.toLowerCase().includes(term)) ||
        (f.email && f.email.toLowerCase().includes(term))
      );
    }
    this.renderFeedback();
  }

  renderFeedback() {
    const container = document.getElementById('feedback-container');
    if (!container) return;

    if (this.filteredFeedback.length === 0) {
      container.innerHTML = `
        <div class="no-feedback">
          <p>No feedback found.</p>
          ${this.currentFilter !== 'all' ? '<p>Try changing the filter or search term.</p>' : ''}
        </div>
      `;
      return;
    }

    container.innerHTML = this.filteredFeedback.map(feedback => this.createFeedbackCard(feedback)).join('');
  }

  createFeedbackCard(feedback) {
    const timeAgo = this.getTimeAgo(feedback.created_at);
    const channelIcon = this.getChannelIcon(feedback.channel);
    const channelName = this.getChannelDisplayName(feedback.channel);
    
    return `
      <div class="feedback-card" data-id="${feedback.id}">
        <div class="feedback-header">
          <div class="feedback-channel">
            <span class="channel-icon">${channelIcon}</span>
            <span class="channel-name">${channelName}</span>
          </div>
          <div class="feedback-meta">
            <span class="feedback-time">${timeAgo}</span>
            <span class="feedback-id">#${feedback.id.slice(-8)}</span>
          </div>
        </div>
        
        <div class="feedback-content">
          <p class="feedback-message">${this.escapeHtml(feedback.message)}</p>
        </div>
        
        <div class="feedback-footer">
          <div class="feedback-user">
            ${feedback.name ? `<span class="user-name">${this.escapeHtml(feedback.name)}</span>` : ''}
            ${feedback.email ? `<span class="user-email">${this.escapeHtml(feedback.email)}</span>` : ''}
          </div>
          <div class="feedback-actions">
            <button class="action-btn reply-btn" onclick="dashboard.replyToFeedback('${feedback.id}')">
              Reply
            </button>
            <button class="action-btn resolve-btn" onclick="dashboard.resolveFeedback('${feedback.id}')">
              Resolve
            </button>
          </div>
        </div>
      </div>
    `;
  }

  getChannelIcon(channel) {
    const icons = {
      widget: '🌐',
      qr: '📱',
      email_signature: '✉️'
    };
    return icons[channel] || '📝';
  }

  getChannelDisplayName(channel) {
    const names = {
      widget: 'Website Widget',
      qr: 'QR Code',
      email_signature: 'Email Signature'
    };
    return names[channel] || channel;
  }

  getTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }

  updateStats() {
    const total = this.feedback.length;
    const widget = this.feedback.filter(f => f.channel === 'widget').length;
    const qr = this.feedback.filter(f => f.channel === 'qr').length;
    const email = this.feedback.filter(f => f.channel === 'email_signature').length;

    // Update stats display
    const statsContainer = document.getElementById('feedback-stats');
    if (statsContainer) {
      statsContainer.innerHTML = `
        <div class="stat-item">
          <span class="stat-number">${total}</span>
          <span class="stat-label">Total</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">${widget}</span>
          <span class="stat-label">Widget</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">${qr}</span>
          <span class="stat-label">QR Code</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">${email}</span>
          <span class="stat-label">Email</span>
        </div>
      `;
    }
  }

  setLoading(loading) {
    this.isLoading = loading;
    const container = document.getElementById('feedback-container');
    if (container) {
      if (loading) {
        container.innerHTML = '<div class="loading">Loading feedback...</div>';
      }
    }
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 4px;
      color: white;
      font-weight: 500;
      z-index: 1000;
      transition: opacity 0.3s ease;
      background-color: ${type === 'success' ? '#10b981' : 
                       type === 'error' ? '#ef4444' : 
                       type === 'warning' ? '#f59e0b' : '#3b82f6'};
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Action handlers
  replyToFeedback(feedbackId) {
    const feedback = this.feedback.find(f => f.id === feedbackId);
    if (feedback) {
      // Implement reply functionality
      console.log('Replying to feedback:', feedback);
      // You can open a modal, redirect to email, etc.
    }
  }

  async resolveFeedback(feedbackId) {
    try {
      // You could add a 'resolved' field to your table and update it here
      console.log('Resolving feedback:', feedbackId);
      this.showNotification('Feedback marked as resolved', 'success');
    } catch (error) {
      console.error('Error resolving feedback:', error);
      this.showError('Failed to resolve feedback');
    }
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.dashboard = new FeedbackDashboard();
});

export default FeedbackDashboard;