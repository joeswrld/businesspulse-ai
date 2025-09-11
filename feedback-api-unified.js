/**
 * Unified Feedback API for Multi-Channel Feedback System
 * Supports: Widget, QR Code, Email Signature forms
 * 
 * This module provides a robust, production-ready API for submitting
 * feedback from all three entry points with proper error handling
 * and validation.
 */

// Configuration - Update these values for your Supabase project
const FEEDBACK_CONFIG = {
    supabaseUrl: 'https://xjbrqeqizpoqdjkiyqzt.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqYnJxZXFpenBvcWRqa2l5cXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNTAzMjcsImV4cCI6MjA3MDYyNjMyN30.cxMH9tUGYEOTUauzluSEeNyjG1iMtUZnNIj4QYGNi84',
    defaultProjectId: 'your-project-id', // Replace with your actual project ID
    apiVersion: 'v1.0.0'
};

/**
 * Feedback API Class
 * Handles all feedback submissions with proper validation and error handling
 */
class FeedbackAPI {
    constructor(config = {}) {
        this.config = { ...FEEDBACK_CONFIG, ...config };
        this.baseUrl = `${this.config.supabaseUrl}/rest/v1`;
        this.headers = {
            'Content-Type': 'application/json',
            'apikey': this.config.supabaseAnonKey,
            'Authorization': `Bearer ${this.config.supabaseAnonKey}`
        };
    }

    /**
     * Submit feedback using the safe insert function
     * @param {Object} feedbackData - The feedback data
     * @param {string} feedbackData.projectId - Project ID (required)
     * @param {string} feedbackData.channel - Channel type: 'widget', 'qr', or 'email_signature' (required)
     * @param {string} feedbackData.name - User's name (optional)
     * @param {string} feedbackData.email - User's email (optional)
     * @param {string} feedbackData.message - Feedback message (required)
     * @returns {Promise<Object>} - Result of the submission
     */
    async submitFeedback(feedbackData) {
        try {
            // Validate input
            this.validateFeedbackData(feedbackData);

            // Prepare payload for the safe insert function
            const payload = {
                p_project_id: feedbackData.projectId,
                p_channel: feedbackData.channel,
                p_name: feedbackData.name || null,
                p_email: feedbackData.email || null,
                p_message: feedbackData.message
            };

            console.log('📤 Submitting feedback:', {
                project_id: payload.p_project_id,
                channel: payload.p_channel,
                has_name: !!payload.p_name,
                has_email: !!payload.p_email,
                message_length: payload.p_message?.length || 0
            });

            // Submit to Supabase
            const response = await fetch(`${this.baseUrl}/rpc/insert_feedback_safe`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log('✅ Feedback submitted successfully:', result);

            return {
                success: true,
                data: result,
                feedbackId: result
            };

        } catch (error) {
            console.error('❌ Error submitting feedback:', error);
            return {
                success: false,
                error: error.message,
                details: this.getErrorDetails(error)
            };
        }
    }

    /**
     * Submit feedback from widget
     * @param {Object} formData - Form data from widget
     * @param {string} projectId - Project ID
     * @returns {Promise<Object>} - Result of the submission
     */
    async submitWidgetFeedback(formData, projectId = null) {
        return await this.submitFeedback({
            projectId: projectId || this.getProjectIdFromUrl() || this.config.defaultProjectId,
            channel: 'widget',
            name: formData.name,
            email: formData.email,
            message: formData.message
        });
    }

    /**
     * Submit feedback from QR code form
     * @param {Object} formData - Form data from QR form
     * @param {string} projectId - Project ID
     * @returns {Promise<Object>} - Result of the submission
     */
    async submitQRFeedback(formData, projectId = null) {
        return await this.submitFeedback({
            projectId: projectId || this.getProjectIdFromUrl() || this.config.defaultProjectId,
            channel: 'qr',
            name: formData.name,
            email: formData.email,
            message: formData.message
        });
    }

    /**
     * Submit feedback from email signature form
     * @param {Object} formData - Form data from email signature form
     * @param {string} projectId - Project ID
     * @returns {Promise<Object>} - Result of the submission
     */
    async submitEmailSignatureFeedback(formData, projectId = null) {
        return await this.submitFeedback({
            projectId: projectId || this.getProjectIdFromUrl() || this.config.defaultProjectId,
            channel: 'email_signature',
            name: formData.name,
            email: formData.email,
            message: formData.message
        });
    }

    /**
     * Validate feedback data
     * @param {Object} data - Feedback data to validate
     * @throws {Error} - If validation fails
     */
    validateFeedbackData(data) {
        if (!data) {
            throw new Error('Feedback data is required');
        }

        if (!data.projectId || typeof data.projectId !== 'string' || data.projectId.trim() === '') {
            throw new Error('Project ID is required');
        }

        if (!data.channel || !['widget', 'qr', 'email_signature'].includes(data.channel)) {
            throw new Error('Channel must be one of: widget, qr, email_signature');
        }

        if (!data.message || typeof data.message !== 'string' || data.message.trim() === '') {
            throw new Error('Message is required');
        }

        if (data.email && !this.isValidEmail(data.email)) {
            throw new Error('Invalid email address format');
        }

        if (data.name && typeof data.name === 'string' && data.name.trim().length < 2) {
            throw new Error('Name must be at least 2 characters long');
        }
    }

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} - True if valid
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Get project ID from URL parameters
     * @returns {string|null} - Project ID from URL or null
     */
    getProjectIdFromUrl() {
        if (typeof window === 'undefined') return null;
        
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('project_id');
    }

    /**
     * Get detailed error information
     * @param {Error} error - Error object
     * @returns {Object} - Error details
     */
    getErrorDetails(error) {
        return {
            message: error.message,
            name: error.name,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
            online: typeof navigator !== 'undefined' ? navigator.onLine : 'Unknown'
        };
    }

    /**
     * Get feedback for a project (requires authentication)
     * @param {string} projectId - Project ID
     * @returns {Promise<Object>} - Feedback data
     */
    async getFeedbackForProject(projectId) {
        try {
            const response = await fetch(`${this.baseUrl}/rpc/get_feedback_for_project`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({ p_project_id: projectId })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching feedback:', error);
            throw error;
        }
    }
}

/**
 * Form Handler Utility
 * Provides easy form handling for HTML forms
 */
class FeedbackFormHandler {
    constructor(api, options = {}) {
        this.api = api;
        this.options = {
            showSuccessMessage: true,
            showErrorMessage: true,
            successMessageDuration: 5000,
            errorMessageDuration: 8000,
            ...options
        };
    }

    /**
     * Attach form handler to a form element
     * @param {HTMLElement} formElement - Form element
     * @param {string} channel - Channel type
     * @param {string} projectId - Project ID (optional)
     */
    attachToForm(formElement, channel, projectId = null) {
        formElement.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleFormSubmit(formElement, channel, projectId);
        });
    }

    /**
     * Handle form submission
     * @param {HTMLElement} formElement - Form element
     * @param {string} channel - Channel type
     * @param {string} projectId - Project ID
     */
    async handleFormSubmit(formElement, channel, projectId) {
        const submitButton = formElement.querySelector('button[type="submit"]');
        const originalText = submitButton?.textContent || 'Submit';
        
        try {
            // Set loading state
            this.setLoadingState(submitButton, true);
            this.hideMessages(formElement);

            // Get form data
            const formData = this.getFormData(formElement);
            
            // Submit based on channel
            let result;
            switch (channel) {
                case 'widget':
                    result = await this.api.submitWidgetFeedback(formData, projectId);
                    break;
                case 'qr':
                    result = await this.api.submitQRFeedback(formData, projectId);
                    break;
                case 'email_signature':
                    result = await this.api.submitEmailSignatureFeedback(formData, projectId);
                    break;
                default:
                    throw new Error(`Unknown channel: ${channel}`);
            }

            if (result.success) {
                this.showSuccessMessage(formElement, 'Thank you for your feedback!');
                formElement.reset();
            } else {
                this.showErrorMessage(formElement, result.error || 'Failed to submit feedback');
            }

        } catch (error) {
            console.error('Form submission error:', error);
            this.showErrorMessage(formElement, 'An error occurred. Please try again.');
        } finally {
            this.setLoadingState(submitButton, false, originalText);
        }
    }

    /**
     * Get form data from form element
     * @param {HTMLElement} formElement - Form element
     * @returns {Object} - Form data
     */
    getFormData(formElement) {
        const formData = new FormData(formElement);
        return {
            name: formData.get('name')?.trim() || null,
            email: formData.get('email')?.trim() || null,
            message: formData.get('message')?.trim() || ''
        };
    }

    /**
     * Set loading state for submit button
     * @param {HTMLElement} button - Submit button
     * @param {boolean} loading - Loading state
     * @param {string} originalText - Original button text
     */
    setLoadingState(button, loading, originalText = 'Submit') {
        if (!button) return;

        button.disabled = loading;
        button.textContent = loading ? 'Submitting...' : originalText;
        
        // Add spinner if it exists
        const spinner = button.querySelector('.spinner');
        if (spinner) {
            spinner.style.display = loading ? 'inline-block' : 'none';
        }
    }

    /**
     * Show success message
     * @param {HTMLElement} formElement - Form element
     * @param {string} message - Success message
     */
    showSuccessMessage(formElement, message) {
        if (!this.options.showSuccessMessage) return;
        
        this.showMessage(formElement, message, 'success');
        
        if (this.options.successMessageDuration > 0) {
            setTimeout(() => this.hideMessages(formElement), this.options.successMessageDuration);
        }
    }

    /**
     * Show error message
     * @param {HTMLElement} formElement - Form element
     * @param {string} message - Error message
     */
    showErrorMessage(formElement, message) {
        if (!this.options.showErrorMessage) return;
        
        this.showMessage(formElement, message, 'error');
        
        if (this.options.errorMessageDuration > 0) {
            setTimeout(() => this.hideMessages(formElement), this.options.errorMessageDuration);
        }
    }

    /**
     * Show message in form
     * @param {HTMLElement} formElement - Form element
     * @param {string} message - Message text
     * @param {string} type - Message type (success, error)
     */
    showMessage(formElement, message, type) {
        let messageDiv = formElement.querySelector('.feedback-message');
        
        if (!messageDiv) {
            messageDiv = document.createElement('div');
            messageDiv.className = 'feedback-message';
            formElement.appendChild(messageDiv);
        }

        messageDiv.textContent = message;
        messageDiv.className = `feedback-message ${type}`;
        messageDiv.style.display = 'block';
    }

    /**
     * Hide all messages in form
     * @param {HTMLElement} formElement - Form element
     */
    hideMessages(formElement) {
        const messageDiv = formElement.querySelector('.feedback-message');
        if (messageDiv) {
            messageDiv.style.display = 'none';
        }
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FeedbackAPI, FeedbackFormHandler, FEEDBACK_CONFIG };
}

// Global exports for browser use
if (typeof window !== 'undefined') {
    window.FeedbackAPI = FeedbackAPI;
    window.FeedbackFormHandler = FeedbackFormHandler;
    window.FEEDBACK_CONFIG = FEEDBACK_CONFIG;
}