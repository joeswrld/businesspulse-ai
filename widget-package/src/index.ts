export interface NoteXWidgetConfig {
  userId: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  theme?: 'light' | 'dark' | 'auto';
  greeting?: string;
  primaryColor?: string;
  secondaryColor?: string;
  enabled?: boolean;
  autoOpen?: boolean;
  zIndex?: number;
}

export interface FeedbackData {
  clientName?: string;
  email?: string;
  message: string;
  category?: string;
  rating?: number;
}

class NoteXWidget {
  private config: NoteXWidgetConfig;
  private isOpen: boolean = false;
  private widgetElement: HTMLElement | null = null;
  private modalElement: HTMLElement | null = null;
  private supabaseClient: any = null;

  constructor(config: NoteXWidgetConfig) {
    this.config = {
      position: 'bottom-right',
      theme: 'light',
      greeting: 'How was your experience?',
      primaryColor: '#3b82f6',
      secondaryColor: '#1e40af',
      enabled: true,
      autoOpen: false,
      zIndex: 9999,
      ...config
    };

    this.init();
  }

  private async init() {
    if (!this.config.enabled) return;

    // Initialize Supabase client
    await this.initSupabase();
    
    // Create and inject widget
    this.createWidget();
    this.injectStyles();
    
    // Auto-open if configured
    if (this.config.autoOpen) {
      setTimeout(() => this.open(), 1000);
    }
  }

  private async initSupabase() {
    try {
      // Dynamic import to avoid bundling issues
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      
      this.supabaseClient = createClient(
        this.config.supabaseUrl || 'https://your-project.supabase.co',
        this.config.supabaseKey || 'your-anon-key'
      );
    } catch (error) {
      console.error('NoteX Widget: Failed to initialize Supabase:', error);
    }
  }

  private createWidget() {
    // Create floating button
    this.widgetElement = document.createElement('div');
    this.widgetElement.id = 'notex-widget-button';
    this.widgetElement.innerHTML = `
      <div class="notex-widget-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
    `;
    this.widgetElement.addEventListener('click', () => this.toggle());

    // Create modal
    this.modalElement = document.createElement('div');
    this.modalElement.id = 'notex-widget-modal';
    this.modalElement.innerHTML = `
      <div class="notex-widget-overlay"></div>
      <div class="notex-widget-content">
        <div class="notex-widget-header">
          <h3>${this.config.greeting}</h3>
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
          </div>
          <button type="submit" class="notex-widget-submit">Send Feedback</button>
        </form>
      </div>
    `;

    // Add event listeners
    this.modalElement.querySelector('.notex-widget-close')?.addEventListener('click', () => this.close());
    this.modalElement.querySelector('.notex-widget-overlay')?.addEventListener('click', () => this.close());
    this.modalElement.querySelector('.notex-widget-form')?.addEventListener('submit', (e) => this.handleSubmit(e));
    
    // Rating stars
    this.modalElement.querySelectorAll('.notex-rating-star').forEach(star => {
      star.addEventListener('click', (e) => this.handleRating(e));
    });

    // Append to body
    document.body.appendChild(this.widgetElement);
    document.body.appendChild(this.modalElement);
  }

  private injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #notex-widget-button {
        position: fixed;
        ${this.config.position?.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
        ${this.config.position?.includes('right') ? 'right: 20px;' : 'left: 20px;'}
        width: 60px;
        height: 60px;
        background: ${this.config.primaryColor};
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        cursor: pointer;
        z-index: ${this.config.zIndex};
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        border: none;
      }

      #notex-widget-button:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(0,0,0,0.2);
      }

      .notex-widget-icon {
        color: white;
      }

      #notex-widget-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: ${(this.config.zIndex || 9999) + 1};
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
      }

      .notex-widget-field input:focus,
      .notex-widget-field textarea:focus,
      .notex-widget-field select:focus {
        outline: none;
        border-color: ${this.config.primaryColor};
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
        background: ${this.config.primaryColor};
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 16px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.3s ease;
      }

      .notex-widget-submit:hover {
        background: ${this.config.secondaryColor};
      }

      .notex-widget-submit:disabled {
        opacity: 0.6;
        cursor: not-allowed;
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

  private handleRating(e: Event) {
    const target = e.target as HTMLElement;
    const rating = parseInt(target.dataset.rating || '0');
    
    // Update stars
    this.modalElement?.querySelectorAll('.notex-rating-star').forEach((star, index) => {
      if (index < rating) {
        star.classList.add('active');
      } else {
        star.classList.remove('active');
      }
    });
    
    // Store rating
    (this.modalElement?.querySelector('#notex-rating') as HTMLInputElement).value = rating.toString();
  }

  private async handleSubmit(e: Event) {
    e.preventDefault();
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const feedbackData: FeedbackData = {
      clientName: formData.get('name') as string || undefined,
      email: formData.get('email') as string || undefined,
      message: formData.get('message') as string,
      category: formData.get('category') as string || undefined,
      rating: parseInt(formData.get('rating') as string) || undefined
    };

    if (!feedbackData.message.trim()) {
      alert('Please enter a message');
      return;
    }

    try {
      await this.submitFeedback(feedbackData);
      this.showSuccess();
      this.close();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    }
  }

  private async submitFeedback(data: FeedbackData) {
    if (!this.supabaseClient) {
      throw new Error('Supabase client not initialized');
    }

    const { error } = await this.supabaseClient
      .from('feedback')
      .insert({
        user_id: this.config.userId,
        client_name: data.clientName,
        email: data.email,
        message: data.message,
        category: data.category,
        metadata: {
          rating: data.rating,
          submitted_at: new Date().toISOString()
        }
      });

    if (error) throw error;
  }

  private showSuccess() {
    // You can customize this success message
    alert('Thank you for your feedback!');
  }

  public open() {
    if (this.modalElement) {
      this.modalElement.classList.add('active');
      this.isOpen = true;
    }
  }

  public close() {
    if (this.modalElement) {
      this.modalElement.classList.remove('active');
      this.isOpen = false;
    }
  }

  public toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public destroy() {
    this.widgetElement?.remove();
    this.modalElement?.remove();
  }

  public updateConfig(newConfig: Partial<NoteXWidgetConfig>) {
    this.config = { ...this.config, ...newConfig };
    // Re-initialize with new config
    this.destroy();
    this.init();
  }
}

// Global instance
let widgetInstance: NoteXWidget | null = null;

// Initialize function
export function initNoteXWidget(config: NoteXWidgetConfig): NoteXWidget {
  if (widgetInstance) {
    widgetInstance.destroy();
  }
  
  widgetInstance = new NoteXWidget(config);
  return widgetInstance;
}

// Get instance
export function getNoteXWidget(): NoteXWidget | null {
  return widgetInstance;
}

// Default export
export default NoteXWidget;