/**
 * Multi-Channel Feedback System
 * Centralized API for sending feedback from all entry points
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Your project ID - replace with your actual project ID
const PROJECT_ID = 'your-project-id';

/**
 * Send feedback to Supabase from any channel
 * @param {Object} feedbackData - The feedback data
 * @param {string} feedbackData.channel - 'widget', 'qr', or 'email_signature'
 * @param {string} feedbackData.name - User's name (optional)
 * @param {string} feedbackData.email - User's email (optional)
 * @param {string} feedbackData.message - Feedback message (required)
 * @returns {Promise<Object>} - Result of the insert operation
 */
export async function submitFeedback({ channel, name, email, message }) {
  try {
    // Validate required fields
    if (!channel || !message) {
      throw new Error('Channel and message are required');
    }

    // Validate channel
    const validChannels = ['widget', 'qr', 'email_signature'];
    if (!validChannels.includes(channel)) {
      throw new Error(`Invalid channel. Must be one of: ${validChannels.join(', ')}`);
    }

    // Prepare data for insertion
    const feedbackData = {
      project_id: PROJECT_ID,
      channel,
      name: name?.trim() || null,
      email: email?.trim() || null,
      message: message.trim()
    };

    // Insert into Supabase
    const { data, error } = await supabase
      .from('feedback')
      .insert([feedbackData])
      .select()
      .single();

    if (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }

    console.log('Feedback submitted successfully:', data);
    return { success: true, data };

  } catch (error) {
    console.error('Failed to submit feedback:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Widget-specific feedback submission
 * Call this from your embedded widget
 */
export async function submitWidgetFeedback(formData) {
  return await submitFeedback({
    channel: 'widget',
    name: formData.name,
    email: formData.email,
    message: formData.message
  });
}

/**
 * QR Code form feedback submission
 * Call this from your QR code landing page
 */
export async function submitQRFeedback(formData) {
  return await submitFeedback({
    channel: 'qr',
    name: formData.name,
    email: formData.email,
    message: formData.message
  });
}

/**
 * Email signature form feedback submission
 * Call this from your email signature form
 */
export async function submitEmailSignatureFeedback(formData) {
  return await submitFeedback({
    channel: 'email_signature',
    name: formData.name,
    email: formData.email,
    message: formData.message
  });
}

/**
 * Utility function to handle form submissions
 * Use this as a generic handler for any feedback form
 */
export function handleFeedbackForm(formElement, channel) {
  formElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(formElement);
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      message: formData.get('message')
    };

    // Show loading state
    const submitButton = formElement.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Submitting...';
    submitButton.disabled = true;

    try {
      const result = await submitFeedback({ ...data, channel });
      
      if (result.success) {
        // Show success message
        showFeedbackMessage('Thank you for your feedback!', 'success');
        formElement.reset();
      } else {
        // Show error message
        showFeedbackMessage('Failed to submit feedback. Please try again.', 'error');
      }
    } catch (error) {
      showFeedbackMessage('An error occurred. Please try again.', 'error');
    } finally {
      // Reset button state
      submitButton.textContent = originalText;
      submitButton.disabled = false;
    }
  });
}

/**
 * Show feedback message to user
 * Customize this based on your UI framework
 */
function showFeedbackMessage(message, type = 'info') {
  // Create or update a message element
  let messageEl = document.getElementById('feedback-message');
  if (!messageEl) {
    messageEl = document.createElement('div');
    messageEl.id = 'feedback-message';
    messageEl.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 4px;
      color: white;
      font-weight: 500;
      z-index: 1000;
      transition: opacity 0.3s ease;
    `;
    document.body.appendChild(messageEl);
  }

  // Set message and style based on type
  messageEl.textContent = message;
  messageEl.style.backgroundColor = type === 'success' ? '#10b981' : 
                                  type === 'error' ? '#ef4444' : '#3b82f6';
  messageEl.style.opacity = '1';

  // Auto-hide after 3 seconds
  setTimeout(() => {
    messageEl.style.opacity = '0';
  }, 3000);
}

// Export for use in your forms
export { supabase, PROJECT_ID };