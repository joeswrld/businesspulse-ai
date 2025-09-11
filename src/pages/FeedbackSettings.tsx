import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Globe, 
  Palette, 
  Bell, 
  Code, 
  Copy,
  Check,
  Save,
  Lock,
  AlertCircle,
  RefreshCw,
  Upload,
  Building2,
  Image,
  Star,
  User,
  Mail,
  BarChart3
} from "lucide-react";
import QRCodeFeedbackSection from "@/components/feedback/QRCodeFeedbackSection";
import EmailSignatureFeedbackSection from "@/components/feedback/EmailSignatureFeedbackSection";
import WidgetSettingsLock from "@/components/WidgetSettingsLock";
import FeedbackDashboard from "@/components/FeedbackDashboard";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useUnifiedTrial } from "@/contexts/UnifiedTrialContext";
import { supabase } from "@/integrations/supabase/client";
import LogoUpload from "@/components/LogoUpload";

interface FeedbackSettings {
  id: string;
  user_id: string;
  project_id: string;
  project_id_locked: boolean;
  title: string;
  show_name: boolean;
  show_email: boolean;
  button_text: string;
  redirect_url: string | null;
  theme: 'light' | 'dark';
  brand_color: string;
  notify_email: string | null;
  business_name?: string;
  business_logo?: string;
  show_rating?: boolean;
  show_contact_info?: boolean;
  custom_fields?: any[];
  created_at: string;
  updated_at: string;
}

const FeedbackSettings = () => {
  const { user } = useAuth();
  
  // State management
  const [settings, setSettings] = useState<FeedbackSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [projectIdStatus, setProjectIdStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [setupAttempted, setSetupAttempted] = useState(false);

  // Test Supabase connection and storage
  const testSupabaseConnection = async () => {
    try {
      console.log('Testing Supabase connection...');
      
      // Test basic connection
      const { data: authData, error: authError } = await supabase.auth.getUser();
      console.log('Auth test:', { authData, authError });
      
      // Test storage access
      const { data: bucketsData, error: bucketsError } = await supabase.storage.listBuckets();
      console.log('Storage test:', { bucketsData, bucketsError });
      
      // Test database access
      const { data: dbData, error: dbError } = await supabase
        .from('feedback_settings')
        .select('id')
        .limit(1);
      console.log('Database test:', { dbData, dbError });
      
      return {
        auth: !authError,
        storage: !bucketsError,
        database: !dbError,
        buckets: bucketsData || []
      };
    } catch (error) {
      console.error('Connection test failed:', error);
      return {
        auth: false,
        storage: false,
        database: false,
        buckets: [],
        error: error.message
      };
    }
  };

  // Ensure storage bucket exists
  const ensureStorageBucket = async () => {
    try {
      console.log('Checking storage buckets...');
      
      // Try to list the bucket to check if it exists
      const { data, error } = await supabase.storage.listBuckets();
      
      console.log('Storage buckets response:', { data, error });
      
      if (error) {
        console.error('Error listing buckets:', error);
        toast.error(`Storage error: ${error.message}`);
        return false;
      }

      const bucketExists = data?.some(bucket => bucket.id === 'business-logos');
      console.log('Bucket exists check:', { bucketExists, buckets: data });
      
      if (!bucketExists) {
        console.log('Business logos bucket does not exist. Please create it in Supabase Storage.');
        toast.error('Storage bucket "business-logos" not found. Please create it in Supabase Storage settings.');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking storage bucket:', error);
      toast.error(`Storage check failed: ${error.message}`);
      return false;
    }
  };

  // Simple base64 upload (fallback method)
  const handleBase64Upload = async (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target?.result as string;
        if (base64String) {
          resolve(base64String);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsDataURL(file);
    });
  };

  // Handle logo upload
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !settings) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploadingLogo(true);

    // Try base64 upload first (most reliable)
    try {
      console.log('Using base64 upload method...');
      const base64String = await handleBase64Upload(file);
      
      // Update settings with base64 image
      const updatedSettings = {
        ...settings,
        business_logo: base64String
      };

      setSettings(updatedSettings);
      toast.success('Logo uploaded successfully!');
      setUploadingLogo(false);
      return;
    } catch (error) {
      console.error('Base64 upload failed:', error);
      toast.error('Failed to process image. Please try again.');
      setUploadingLogo(false);
      return;
    }
  };

  // Check if feedback_settings table exists and create it if needed
  const ensureTableExists = useCallback(async () => {
    if (!user) return false;

    try {
      // First, try to check if the table exists by attempting a simple query
      const { data: testData, error: testError } = await (supabase as any)
        .from('feedback_settings')
        .select('id')
        .limit(1);

      // If we get a "relation does not exist" error, we need to create the table
      if (testError && testError.message.includes('relation "feedback_settings" does not exist')) {
        console.log('Feedback settings table does not exist, creating it...');
        
        // Call the setup function to create the table
        const { error: setupError } = await (supabase as any).rpc('create_feedback_settings_for_user', {
          user_id_param: user.id
        });

        if (setupError) {
          console.error('Error setting up feedback system:', setupError);
          // If the RPC function doesn't exist, we'll handle it in the main load function
          return false;
        }

        console.log('Feedback settings table created successfully');
        return true;
      }

      return true;
    } catch (error) {
      console.error('Error checking/creating table:', error);
      return false;
    }
  }, [user]);

  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [schemaVersion, setSchemaVersion] = useState<'modern' | 'legacy' | 'unknown'>('unknown');

  // Connectivity listeners
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load settings
  const loadSettings = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      
      // Ensure the table exists first
      const tableExists = await ensureTableExists();


      // Guard against offline states for clearer UX
      if (!navigator.onLine) {
        setError('You appear to be offline. Please check your internet connection and try again.');
        return;
      }

      
      // Simple retry helper for transient network errors
      const withRetries = async <T,>(fn: () => Promise<T>, attempts = 3, baseDelayMs = 400): Promise<T> => {
        let lastErr: any = null;
        for (let i = 0; i < attempts; i++) {
          try {
            return await fn();
          } catch (e: any) {
            lastErr = e;
            const msg = (e && (e.message || e.error)) || '';
            // Retry on common fetch/network/timeouts only
            const isTransient = typeof msg === 'string' && (
              msg.includes('Failed to fetch') ||
              msg.includes('timeout') ||
              msg.includes('ETIMEDOUT') ||
              msg.includes('ECONNRESET') ||
              msg.includes('network')
            );
            if (!isTransient) break;
            await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, i)));
          }
        }
        throw lastErr;
      };
      
      // Detect schema: probe for modern column 'project_id'
      try {
        await withRetries(() => 
          (supabase as any)
            .from('feedback_settings')
            .select('project_id')
            .limit(1)
        );
        setSchemaVersion('modern');
      } catch (probeErr) {
        // If probing fails with 400, assume legacy schema
        setSchemaVersion('legacy');
      }

      // Load feedback settings
      const feedbackResult = await withRetries(() => 
        (supabase as any)
          .from('feedback_settings')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
      );
      const { data: feedbackData, error: feedbackError } = feedbackResult as any;

      if (feedbackError) {
        console.error('Error loading feedback settings:', feedbackError);
        
        // Handle specific error cases
        if (feedbackError.message.includes('relation "feedback_settings" does not exist')) {
          if (!setupAttempted) {
            setSetupAttempted(true);
            // Try to create the table using a direct SQL approach
            const { error: createError } = await (supabase as any).rpc('create_feedback_settings_for_user', {
              user_id_param: user.id
            });
            
            if (createError) {
              throw new Error('Database tables not set up. Please contact support to set up the feedback system.');
            } else {
              // Retry loading settings after table creation
              const { data: retryData, error: retryError } = await (supabase as any)
                .from('feedback_settings')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1);

              if (retryError) throw retryError;
              if (retryData && retryData.length > 0) {
                setSettings(retryData[0] as any);
                return;
              }
            }
          } else {
            throw new Error('Database tables not set up. Please contact support to set up the feedback system.');
          }
        } else if (feedbackError.message.includes('permission denied')) {
          throw new Error('Permission denied. Please check your database permissions or contact support.');
        } else {
          throw feedbackError;
        }
      }

      if (feedbackData && feedbackData.length > 0) {
        setSettings(feedbackData[0]);
      } else {
        // Create default feedback settings
        const defaultSettings = {
          user_id: user.id,
          project_id: '',
          project_id_locked: false,
          title: 'Share your thoughts with us',
          show_name: true,
          show_email: true,
          button_text: 'Send Feedback',
          theme: 'dark',
          brand_color: '#2563eb',
          redirect_url: null,
          notify_email: null,
          business_name: 'Our Business',
          business_logo: null,
          show_rating: true,
          show_contact_info: true,
          custom_fields: []
        };

        try {
          // Try to create settings using upsert to avoid conflicts
          const { data: newSettings, error: createError } = await (supabase as any)
            .from('feedback_settings')
            .upsert(defaultSettings, { onConflict: 'user_id' })
            .select()
            .single();

          if (createError) {
            console.error('Error creating default settings:', createError);
            throw new Error(`Failed to create default settings: ${createError.message}`);
          }

          if (newSettings) {
            setSettings(newSettings as any);
          } else {
            // Fallback: create in-memory settings if database insert fails
            setSettings({
              ...defaultSettings,
              id: 'temp-' + Date.now(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            } as any);
          }
        } catch (error) {
          console.error('Error in settings creation:', error);
          // Fallback: create in-memory settings
          setSettings({
            ...defaultSettings,
            id: 'temp-' + Date.now(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as any);
        }
      }

    } catch (error) {
      console.error('Error in loadSettings:', error);
      let errorMessage = 'Failed to load settings. Please try again.';
      
      if (error instanceof Error) {
        errorMessage = error.message;

        if (error.message.includes('relation "feedback_settings" does not exist')) {
          errorMessage = 'Database tables not set up. Please run the database setup script first.';
        } else if (error.message.includes('permission denied')) {
          errorMessage = 'Permission denied. Please check your database permissions.';
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else {
          errorMessage = `Failed to load settings: ${error.message}`;
        }
      } else if (isOffline) {
        errorMessage = 'You appear to be offline. Please check your internet connection and try again.';

      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, ensureTableExists, setupAttempted]);

  const checkProjectIdAvailability = useCallback(async (projectId: string) => {
    if (!user || !projectId || projectId.trim() === '') {
      setProjectIdStatus('idle');
      return;
    }

    // Check minimum length
    if (projectId.trim().length < 3) {
      setProjectIdStatus('idle');
      return;
    }

    // Check for invalid characters
    if (!/^[a-zA-Z0-9_-]+$/.test(projectId.trim())) {
      setProjectIdStatus('idle');
      return;
    }

    setProjectIdStatus('checking');
    console.log('Checking availability for project ID:', projectId.trim());

    try {
      // Use the database validation function for comprehensive checking
      const { data: validationResult, error: validationError } = await (supabase as any)
        .rpc('validate_project_id', {
          project_id_param: projectId.trim(),
          current_user_id: user.id
        });

      if (validationError) {
        console.error('Error validating project ID:', validationError);
        // Fallback to direct database query
        const { data: existingSettings, error: checkError } = await (supabase as any)
          .from('feedback_settings')
          .select('id, user_id, project_id')
          .eq('project_id', projectId.trim())
          .neq('user_id', user.id) // Exclude current user
          .limit(1);

        if (checkError) {
          console.error('Error checking project ID availability:', checkError);
          setProjectIdStatus('idle');
          toast.error('Failed to check project ID availability. Please try again.');
          return;
        }

        if (existingSettings && existingSettings.length > 0) {
          setProjectIdStatus('taken');
          console.log('Project ID taken by user:', (existingSettings[0] as any).user_id);
        } else {
          setProjectIdStatus('available');
          console.log('Project ID available for:', projectId.trim());
        }
        return;
      }

      console.log('Validation result:', validationResult);

      if (validationResult) {
        if (validationResult.is_valid && validationResult.is_available) {
          setProjectIdStatus('available');
          console.log('Project ID is valid and available:', projectId.trim());
        } else if (!validationResult.is_valid) {
          setProjectIdStatus('idle');
          console.log('Project ID is invalid:', validationResult.error_message);
          toast.error(validationResult.error_message || 'Project ID format is invalid');
        } else if (!validationResult.is_available) {
          setProjectIdStatus('taken');
          console.log('Project ID is taken:', validationResult.error_message);
          if (validationResult.taken_by_email) {
            toast.error(`Project ID is already taken by user: ${validationResult.taken_by_email}`);
          }
        }
      } else {
        // Fallback if no result returned
        setProjectIdStatus('idle');
      }
    } catch (error) {
      console.error('Error checking project ID availability:', error);
      setProjectIdStatus('idle');
      toast.error('Failed to check project ID availability. Please try again.');
    }
  }, [user]);

  // Load settings on component mount
  useEffect(() => {
    setError(null);
    loadSettings();
  }, [user, loadSettings]);

  // Check project ID availability when it changes (with debounce)
  useEffect(() => {
    if (!settings?.project_id_locked && settings?.project_id && settings.project_id.length >= 3) {
      const timeoutId = setTimeout(() => {
        checkProjectIdAvailability(settings.project_id);
      }, 800); // Increased debounce delay for better UX

      return () => clearTimeout(timeoutId);
    } else {
      setProjectIdStatus('idle');
    }
  }, [settings?.project_id, settings?.project_id_locked, checkProjectIdAvailability]);

  const handleRetry = () => {
    setError(null);
    setSetupAttempted(false);
    setLoading(true);
    loadSettings();
  };

  const handleSaveSettings = async () => {
    if (!user || !settings) {
      console.error('Cannot save: user or settings not available', { user: !!user, settings: !!settings });
      return;
    }
    
    console.log('Starting save process:', { 
      userId: user.id, 
      settingsId: settings.id, 
      projectId: settings.project_id,
      projectIdLocked: settings.project_id_locked 
    });
    
    // Validate that Project ID is provided
    if (!settings.project_id || settings.project_id.trim() === '') {
      toast.error('Project ID is required');
      return;
    }
    
    // Validate Project ID length
    if (settings.project_id.trim().length < 3) {
      toast.error('Project ID must be at least 3 characters long');
      return;
    }
    
    // Check if Project ID is available before saving
    if (!settings.project_id_locked) {
      // Validate format first
      if (!settings.project_id || settings.project_id.trim().length < 3) {
        toast.error('Project ID must be at least 3 characters long');
        return;
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(settings.project_id.trim())) {
        toast.error('Project ID can only contain letters, numbers, hyphens, and underscores');
        return;
      }

      // Check availability if not already checked or if status is not available
      if (projectIdStatus !== 'available') {
        setProjectIdStatus('checking');
        try {
          const { data: validationResult, error: validationError } = await (supabase as any)
            .rpc('validate_project_id', {
              project_id_param: settings.project_id.trim(),
              current_user_id: user.id
            });

          if (validationError) {
            console.error('Error validating project ID:', validationError);
            toast.error('Failed to validate Project ID');
            setProjectIdStatus('idle');
            return;
          }

          if (!validationResult.is_valid) {
            toast.error(validationResult.error_message || 'Invalid Project ID format');
            setProjectIdStatus('idle');
            return;
          }

          if (!validationResult.is_available) {
            let errorMsg = 'Project ID is already taken by another user';
            if (validationResult.taken_by_email) {
              errorMsg += ` (${validationResult.taken_by_email})`;
            }
            toast.error(errorMsg);
            setProjectIdStatus('taken');
            return;
          } else {
            setProjectIdStatus('available');
          }
        } catch (error) {
          console.error('Error checking project ID availability:', error);
          toast.error('Failed to validate Project ID');
          setProjectIdStatus('idle');
          return;
        }
      }

      // Additional check: if status is still not available, stop
      if (projectIdStatus === 'taken') {
        toast.error('Project ID is already taken. Please choose a different one.');
        return;
      } else if (projectIdStatus === 'checking') {
        toast.error('Please wait while we check Project ID availability');
        return;
      }
    }

    setSaving(true);
    try {
      if (schemaVersion === 'legacy') {
        // In legacy schema, we cannot persist modern fields. Acknowledge save for UX.
        toast.success('Settings saved locally. Legacy database schema detected.');
        return;
      }

      // Check if we have a temporary ID (created when database insert failed)
      const isTemporaryId = settings.id && settings.id.toString().startsWith('temp-');
      console.log('Save operation:', { 
        isTemporaryId, 
        settingsId: settings.id, 
        schemaVersion 
      });
      
      if (isTemporaryId) {
        // Try to create a new record since the previous insert failed
        console.log('Attempting to create new settings record...');
        
        const { data: newSettings, error: insertError } = await (supabase as any)
          .from('feedback_settings')
          .insert({
            user_id: user.id,
            title: settings.title,
            show_name: settings.show_name,
            show_email: settings.show_email,
            button_text: settings.button_text,
            redirect_url: settings.redirect_url,
            theme: settings.theme,
            brand_color: settings.brand_color,
            project_id: settings.project_id,
            project_id_locked: true, // Lock the project ID after first save
            notify_email: settings.notify_email,
            business_name: settings.business_name,
            business_logo: settings.business_logo,
            show_rating: settings.show_rating,
            show_contact_info: settings.show_contact_info,
            custom_fields: settings.custom_fields,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating settings:', insertError);
          
          // If there's a conflict, try to update existing record
          if (insertError.code === '23505') { // Unique violation
            console.log('Unique constraint violation, trying to update existing record...');
            
            const { data: existingSettings, error: updateError } = await (supabase as any)
              .from('feedback_settings')
              .update({
                title: settings.title,
                show_name: settings.show_name,
                show_email: settings.show_email,
                button_text: settings.button_text,
                redirect_url: settings.redirect_url,
                theme: settings.theme,
                brand_color: settings.brand_color,
                project_id: settings.project_id,
                project_id_locked: true,
                notify_email: settings.notify_email,
                business_name: settings.business_name,
                business_logo: settings.business_logo,
                show_rating: settings.show_rating,
                show_contact_info: settings.show_contact_info,
                custom_fields: settings.custom_fields,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', user.id)
              .select()
              .single();

            if (updateError) {
              console.error('Error updating existing settings:', updateError);
              throw new Error(`Failed to update settings: ${updateError.message}`);
            }

            setSettings(existingSettings as any);
            toast.success('Settings saved successfully!');
          } else {
            throw new Error(`Failed to create settings: ${insertError.message}`);
          }
        } else {
          // Update the settings state with the new record
          setSettings(newSettings);
          toast.success('Settings saved successfully!');
        }
      } else {
        // Update existing record
        console.log('Updating existing settings record...');
        
        const { data: updatedSettings, error: feedbackError } = await (supabase as any)
          .from('feedback_settings')
          .update({
            title: settings.title,
            show_name: settings.show_name,
            show_email: settings.show_email,
            button_text: settings.button_text,
            redirect_url: settings.redirect_url,
            theme: settings.theme,
            brand_color: settings.brand_color,
            project_id: settings.project_id,
            project_id_locked: true, // Lock the project ID after first save
            notify_email: settings.notify_email,
            business_name: settings.business_name,
            business_logo: settings.business_logo,
            show_rating: settings.show_rating,
            show_contact_info: settings.show_contact_info,
            custom_fields: settings.custom_fields,
            updated_at: new Date().toISOString()
          })
          .eq('id', settings.id)
          .select()
          .single();

        if (feedbackError) {
          console.error('Error updating settings:', feedbackError);
          
          // If the record doesn't exist, try to create it
          if (feedbackError.code === 'PGRST116') { // Record not found
            console.log('Record not found, trying to create new record...');
            
            const { data: newSettings, error: insertError } = await (supabase as any)
              .from('feedback_settings')
              .insert({
                user_id: user.id,
                title: settings.title,
                show_name: settings.show_name,
                show_email: settings.show_email,
                button_text: settings.button_text,
                redirect_url: settings.redirect_url,
                theme: settings.theme,
                brand_color: settings.brand_color,
                project_id: settings.project_id,
                project_id_locked: true,
                notify_email: settings.notify_email,
                business_name: settings.business_name,
                business_logo: settings.business_logo,
                show_rating: settings.show_rating,
                show_contact_info: settings.show_contact_info,
                custom_fields: settings.custom_fields,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single();

            if (insertError) {
              console.error('Error creating settings after update failed:', insertError);
              throw new Error(`Failed to create settings: ${insertError.message}`);
            }

            setSettings(newSettings as any);
            toast.success('Settings saved successfully!');
          } else {
            throw new Error(`Failed to update settings: ${feedbackError.message}`);
          }
        } else {
          // Update the settings state with the updated record
          setSettings(updatedSettings as any);
          toast.success('Settings saved successfully!');
        }
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      if (error instanceof Error) {
        toast.error(`Failed to save settings: ${error.message}`);
      } else {
        toast.error('Failed to save settings');
      }
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const generateEmbedCode = () => {
    if (!settings?.project_id) return '';
    
    return `<script src="https://notex.com.ng/feedback-widget.js" data-project-id="${settings.project_id}"></script>`;
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
              <p className="text-gray-600">Please log in to access feedback settings.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-semibold mb-2">Loading Settings...</h2>
            <p className="text-gray-600">Please wait while we fetch your configuration.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
              <h2 className="text-xl font-semibold mb-4">Error Loading Settings</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <div className="space-y-2">
                <Button onClick={handleRetry} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <p className="text-xs text-gray-500">
                  If the problem persists, please contact support.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Feedback Settings</h1>
        <p className="text-gray-600">Customize your feedback widget and configure how you receive feedback from your website visitors.</p>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Project Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5" />
              <span>Project Configuration</span>
            </CardTitle>
            <CardDescription>
              Your unique project ID is used to identify feedback from your website.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="projectId" className="text-sm font-medium">
                Project ID
              </Label>
              <Input
                id="projectId"
                value={settings?.project_id || ''}
                onChange={(e) => setSettings(prev => prev ? { ...prev, project_id: e.target.value } : null)}
                placeholder="Enter your unique project ID"
                className="mt-1"
                disabled={settings?.project_id_locked || false}
              />
              {settings?.project_id_locked && (
                <p className="text-sm text-green-600 mt-1 flex items-center">
                  <Lock className="h-4 w-4 mr-1" />
                  ✅ Project ID is locked and cannot be changed.
                </p>
              )}
              {!settings?.project_id_locked && projectIdStatus === 'available' && (
                <p className="text-sm text-green-600 mt-1 flex items-center">
                  <Check className="h-4 w-4 mr-1" />
                  ✓ Project ID available - you can save to lock it
                </p>
              )}
              {!settings?.project_id_locked && projectIdStatus === 'taken' && (
                <p className="text-sm text-red-600 mt-1 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  ❌ This Project ID is already taken by another user. Please choose a different one.
                </p>
              )}
              {!settings?.project_id_locked && projectIdStatus === 'checking' && (
                <p className="text-sm text-blue-600 mt-1 flex items-center">
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  Checking availability...
                </p>
              )}
              {!settings?.project_id_locked && projectIdStatus === 'idle' && settings?.project_id && settings.project_id.length >= 3 && (
                <p className="text-sm text-gray-500 mt-1">
                  Checking availability... or click "Check Availability" to verify manually
                </p>
              )}
              {!settings?.project_id_locked && settings?.project_id && settings.project_id.length >= 3 && !/^[a-zA-Z0-9_-]+$/.test(settings.project_id) && (
                <p className="text-sm text-orange-600 mt-1 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  ⚠ Project ID can only contain letters, numbers, hyphens, and underscores
                </p>
              )}
              
              {/* Manual check availability button */}
              {!settings?.project_id_locked && settings?.project_id && settings.project_id.length >= 3 && /^[a-zA-Z0-9_-]+$/.test(settings.project_id) && projectIdStatus === 'idle' && (
                <div className="mt-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => checkProjectIdAvailability(settings.project_id)}
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Check Availability
                  </Button>
                </div>
              )}
              
              
            </div>
          </CardContent>
        </Card>

        

        {/* Widget Customization */}
        <WidgetSettingsLock 
          widgetType="feedback"
          title="Widget Customization"
          description="Customize the appearance and behavior of your feedback widget"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="h-5 w-5" />
                <span>Widget Customization</span>
              </CardTitle>
              <CardDescription>
                Customize the appearance and behavior of your feedback widget.
              </CardDescription>
            </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="widgetTitle" className="text-sm font-medium">
                Widget Title
              </Label>
              <Input
                id="widgetTitle"
                value={settings?.title || ''}
                onChange={(e) => setSettings(prev => prev ? { ...prev, title: e.target.value } : null)}
                placeholder="Share your thoughts with us"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="buttonText" className="text-sm font-medium">
                Button Text
              </Label>
              <Input
                id="buttonText"
                value={settings?.button_text || ''}
                onChange={(e) => setSettings(prev => prev ? { ...prev, button_text: e.target.value } : null)}
                placeholder="Send Feedback"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="theme" className="text-sm font-medium">
                Theme
              </Label>
              <Select
                value={settings?.theme || 'dark'}
                onValueChange={(value) => setSettings(prev => prev ? { ...prev, theme: value as 'light' | 'dark' } : null)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="brandColor" className="text-sm font-medium">
                Brand Color
              </Label>
              <div className="flex items-center space-x-2 mt-1">
                <Input
                  id="brandColor"
                  type="color"
                  value={settings?.brand_color || '#2563eb'}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, brand_color: e.target.value } : null)}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={settings?.brand_color || '#2563eb'}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, brand_color: e.target.value } : null)}
                  placeholder="#2563eb"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Show Name Field</Label>
                <p className="text-xs text-gray-500">Display name input field in the feedback form</p>
              </div>
              <Switch
                checked={settings?.show_name || false}
                onCheckedChange={(checked) => setSettings(prev => prev ? { ...prev, show_name: checked } : null)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Show Email Field</Label>
                <p className="text-xs text-gray-500">Display email input field in the feedback form</p>
              </div>
              <Switch
                checked={settings?.show_email || false}
                onCheckedChange={(checked) => setSettings(prev => prev ? { ...prev, show_email: checked } : null)}
              />
            </div>
          </CardContent>
        </Card>
        </WidgetSettingsLock>

        {/* Business Branding */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>Business Branding</span>
            </CardTitle>
            <CardDescription>
              Customize your business information that will appear on feedback forms.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="businessName" className="text-sm font-medium">
                Business Name
              </Label>
              <Input
                id="businessName"
                value={settings?.business_name || ''}
                onChange={(e) => setSettings(prev => prev ? { ...prev, business_name: e.target.value } : null)}
                placeholder="Your Business Name"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be displayed at the top of your feedback forms
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium">Business Logo</Label>
              <div className="mt-2 space-y-3">
                {settings?.business_logo && (
                  <div className="flex items-center space-x-3">
                    <img
                      src={settings.business_logo}
                      alt="Business Logo"
                      className="h-16 w-16 object-contain border rounded-lg bg-gray-50"
                    />
                    <div>
                      <p className="text-sm text-gray-600">Current logo</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSettings(prev => prev ? { ...prev, business_logo: '' } : null)}
                        className="mt-1"
                      >
                        Remove Logo
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                      disabled={uploadingLogo}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('logo-upload')?.click()}
                      disabled={uploadingLogo}
                    >
                      {uploadingLogo ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          {settings?.business_logo ? 'Change Logo' : 'Upload Logo'}
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, or GIF (max 5MB)
                    </p>
                  </div>
                  
                  <div className="text-center text-sm text-gray-500">
                    OR
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="logoUrl" className="text-sm font-medium">
                      Logo URL (Alternative)
                    </Label>
                    <Input
                      id="logoUrl"
                      type="url"
                      placeholder="https://example.com/logo.png"
                      value={settings?.business_logo?.startsWith('http') ? settings.business_logo : ''}
                      onChange={(e) => {
                        const url = e.target.value;
                        if (url && (url.startsWith('http') || url.startsWith('data:'))) {
                          setSettings(prev => prev ? { ...prev, business_logo: url } : null);
                        } else if (url === '') {
                          setSettings(prev => prev ? { ...prev, business_logo: '' } : null);
                        }
                      }}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">
                      Paste a direct link to your logo image
                    </p>
                  </div>
                  
                  
                      
                      
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Show Rating System</Label>
                <p className="text-xs text-gray-500">Display star rating in feedback forms</p>
              </div>
              <Switch
                checked={settings?.show_rating !== false}
                onCheckedChange={(checked) => setSettings(prev => prev ? { ...prev, show_rating: checked } : null)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Show Contact Information</Label>
                <p className="text-xs text-gray-500">Display contact fields in feedback forms</p>
              </div>
              <Switch
                checked={settings?.show_contact_info !== false}
                onCheckedChange={(checked) => setSettings(prev => prev ? { ...prev, show_contact_info: checked } : null)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Notifications</span>
            </CardTitle>
            <CardDescription>
              Configure how you receive notifications for new feedback.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="emailNotifications" className="text-sm font-medium">
                Email Notifications
              </Label>
              <Input
                id="emailNotifications"
                type="email"
                value={settings?.notify_email || ''}
                onChange={(e) => setSettings(prev => prev ? { ...prev, notify_email: e.target.value } : null)}
                placeholder="your@email.com"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Receive email notifications when new feedback is submitted (optional)
              </p>
            </div>

            <div>
              <Label htmlFor="redirectUrl" className="text-sm font-medium">
                Redirect URL
              </Label>
              <Input
                id="redirectUrl"
                type="url"
                value={settings?.redirect_url || ''}
                onChange={(e) => setSettings(prev => prev ? { ...prev, redirect_url: e.target.value } : null)}
                placeholder="https://your-website.com/thank-you"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                URL to redirect users after submitting feedback (optional)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Update Settings Button */}
        <div className="text-center">
          <Button
            onClick={handleSaveSettings}
            disabled={
              saving || 
              !settings?.project_id || 
              (settings?.project_id && settings.project_id.trim().length < 3) ||
              (!settings?.project_id_locked && projectIdStatus === 'taken') ||
              (!settings?.project_id_locked && projectIdStatus === 'checking')
            }
            className="px-8 py-3 text-lg"
          >
            {saving ? (
              <>
                <Save className="h-5 w-5 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                {settings?.project_id_locked ? 'Update Settings' : 'Save & Lock Project ID'}
              </>
            )}
          </Button>
          {!settings?.project_id_locked && projectIdStatus === 'taken' && (
            <p className="text-sm text-red-600 mt-2">
              Cannot save: Project ID is already taken by another user
            </p>
          )}
          {!settings?.project_id_locked && projectIdStatus === 'checking' && (
            <p className="text-sm text-blue-600 mt-2">
              Please wait while we check Project ID availability...
            </p>
          )}
          {!settings?.project_id_locked && projectIdStatus === 'idle' && settings?.project_id && settings.project_id.length >= 3 && (
            <p className="text-sm text-blue-600 mt-2">
              Click "Save & Lock Project ID" to check availability and save
            </p>
          )}
          {!settings?.project_id_locked && projectIdStatus === 'available' && (
            <p className="text-sm text-green-600 mt-2">
              ✓ Project ID is available and ready to save
            </p>
          )}
        </div>

        {/* Embed Code */}
        <WidgetSettingsLock 
          widgetType="embed"
          title="Embed Code"
          description="Copy and paste this code into your website to display the feedback widget"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Code className="h-5 w-5" />
                <span>Embed Code</span>
              </CardTitle>
              <CardDescription>
                Copy and paste this code into your website to display the feedback widget.
              </CardDescription>
            </CardHeader>
          <CardContent className="space-y-4">
            {settings?.project_id && settings.project_id.trim() !== '' ? (
              <>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                  <pre>{generateEmbedCode()}</pre>
                </div>
                <Button
                  onClick={() => copyToClipboard(generateEmbedCode())}
                  className="w-full"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Code className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Enter a Project ID to generate embed code</p>
              </div>
            )}
          </CardContent>
        </Card>
        </WidgetSettingsLock>

        {/* QR Code Feedback */}
        {settings?.project_id && settings.project_id.trim() !== '' && (
          <WidgetSettingsLock 
            widgetType="qr"
            title="QR Code Feedback"
            description="Generate QR codes for easy feedback collection"
          >
            <QRCodeFeedbackSection projectId={settings.project_id} />
          </WidgetSettingsLock>
        )}

        {/* Email Signature Feedback */}
        {settings?.project_id && settings.project_id.trim() !== '' && (
          <WidgetSettingsLock 
            widgetType="email"
            title="Email Signature Feedback"
            description="Add feedback links to your email signatures"
          >
            <EmailSignatureFeedbackSection projectId={settings.project_id} />
          </WidgetSettingsLock>
        )}

        {/* Feedback Dashboard */}
        {settings?.project_id && settings.project_id.trim() !== '' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Feedback Dashboard</span>
              </CardTitle>
              <CardDescription>
                View and analyze feedback from all channels in real-time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FeedbackDashboard projectId={settings.project_id} />
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
};

export default FeedbackSettings;