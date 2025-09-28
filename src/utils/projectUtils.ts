import { supabase } from '@/integrations/supabase/client';

export interface Project {
  id: string;
  name: string;
  user_id: string;
  logo_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface FeedbackSettings {
  id: string;
  user_id: string;
  project_id: string;
  widget_title: string;
  widget_color: string;
  greeting_text: string;
  created_at: string;
  updated_at?: string;
}

export interface ProjectWithSettings extends Project {
  settings?: FeedbackSettings;
}

/**
 * Create a new project with default feedback settings
 */
export async function createProject(userId: string, name: string, logoUrl?: string): Promise<Project> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!name || name.trim() === '') {
    throw new Error('Project name is required');
  }

  try {
    // Use the database function to create project with settings
    const { data, error } = await supabase.rpc('create_project_with_settings', {
      p_user_id: userId,
      p_name: name.trim(),
      p_logo_url: logoUrl || null
    });

    if (error) {
      console.error('Error creating project:', error);
      throw new Error(`Failed to create project: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('No data returned from project creation');
    }

    const { project_id, settings_id } = data[0];

    // Fetch the created project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .single();

    if (projectError) {
      console.error('Error fetching created project:', projectError);
      throw new Error(`Failed to fetch created project: ${projectError.message}`);
    }

    return project;
  } catch (error) {
    console.error('Error in createProject:', error);
    throw error;
  }
}

/**
 * Get all projects for a user with their feedback settings
 * Includes retry logic for JWT token refresh
 */
export async function getUserProjects(userId: string): Promise<ProjectWithSettings[]> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const attemptFetch = async (isRetry = false): Promise<ProjectWithSettings[]> => {
    try {
      const { data, error } = await supabase.rpc('get_user_projects_with_settings', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error fetching user projects:', error);
        
        // Check if it's a JWT expired error and we haven't retried yet
        if (error.message.includes('JWT expired') && !isRetry) {
          console.log('JWT expired, attempting to refresh token...');
          
          // Try to refresh the session
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            console.error('Failed to refresh session:', refreshError);
            throw new Error('Session expired. Please log in again.');
          }
          
          console.log('Token refreshed successfully, retrying...');
          // Retry the original request
          return attemptFetch(true);
        }
        
        // Check if server returned HTML instead of JSON (common with 404/500 errors)
        if (error.message.includes('Unexpected token') || error.message.includes('<')) {
          throw new Error('Server returned an error page. Please check your connection and try again.');
        }
        
        throw new Error(`Failed to fetch projects: ${error.message}`);
      }

      // Transform the data to match our interface
      return (data || []).map((row: any) => ({
        id: row.project_id,
        name: row.project_name,
        user_id: userId,
        logo_url: row.project_logo_url,
        created_at: row.project_created_at,
        updated_at: row.project_created_at, // Use created_at as fallback
        settings: row.settings_id ? {
          id: row.settings_id,
          user_id: userId,
          project_id: row.project_id,
          widget_title: row.widget_title,
          widget_color: row.widget_color,
          greeting_text: row.greeting_text,
          created_at: row.project_created_at,
          updated_at: row.settings_updated_at
        } : undefined
      }));
    } catch (error) {
      console.error('Error in getUserProjects:', error);
      throw error;
    }
  };

  return attemptFetch();
}

/**
 * Get feedback settings for a specific project
 */
export async function getFeedbackSettings(projectId: string, userId: string): Promise<FeedbackSettings | null> {
  if (!projectId || !userId) {
    throw new Error('Project ID and User ID are required');
  }

  try {
    const { data, error } = await supabase
      .from('feedback_settings')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching feedback settings:', error);
      throw new Error(`Failed to fetch settings: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in getFeedbackSettings:', error);
    throw error;
  }
}

/**
 * Create default feedback settings for a project
 */
export async function createDefaultFeedbackSettings(projectId: string, userId: string): Promise<FeedbackSettings> {
  if (!projectId || !userId) {
    throw new Error('Project ID and User ID are required');
  }

  try {
    const defaultSettings = {
      user_id: userId,
      project_id: projectId,
      widget_title: 'We love your feedback!',
      widget_color: '#3B82F6',
      greeting_text: 'Help us improve by sharing your thoughts'
    };

    const { data, error } = await supabase
      .from('feedback_settings')
      .insert(defaultSettings)
      .select()
      .single();

    if (error) {
      console.error('Error creating default settings:', error);
      throw new Error(`Failed to create settings: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in createDefaultFeedbackSettings:', error);
    throw error;
  }
}

/**
 * Update feedback settings
 */
export async function updateFeedbackSettings(
  settingsId: string, 
  updates: Partial<Omit<FeedbackSettings, 'id' | 'user_id' | 'project_id' | 'created_at'>>
): Promise<FeedbackSettings> {
  if (!settingsId) {
    throw new Error('Settings ID is required');
  }

  try {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('feedback_settings')
      .update(updateData)
      .eq('id', settingsId)
      .select()
      .single();

    if (error) {
      console.error('Error updating feedback settings:', error);
      throw new Error(`Failed to update settings: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in updateFeedbackSettings:', error);
    throw error;
  }
}

/**
 * Delete a project and all its associated data
 */
export async function deleteProject(projectId: string, userId: string): Promise<void> {
  if (!projectId || !userId) {
    throw new Error('Project ID and User ID are required');
  }

  try {
    // Delete the project (cascade will handle feedback_settings and feedback)
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting project:', error);
      throw new Error(`Failed to delete project: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in deleteProject:', error);
    throw error;
  }
}

/**
 * Automatically create a default project for a user if they don't have one
 * This function ensures every user has exactly one project
 */
export async function ensureUserHasProject(userId: string): Promise<Project> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    console.log('🔍 Checking if user has a project:', userId);
    
    // First, check if user already has a project
    const { data: existingProjects, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .limit(1);

    if (fetchError) {
      console.error('Error checking existing projects:', fetchError);
      throw new Error(`Failed to check existing projects: ${fetchError.message}`);
    }

    // If user already has a project, return it
    if (existingProjects && existingProjects.length > 0) {
      console.log('✅ User already has a project:', existingProjects[0].id);
      return existingProjects[0];
    }

    // User doesn't have a project, create one automatically
    console.log('📝 Creating default project for user:', userId);
    
    const { data, error } = await supabase.rpc('create_project_with_settings', {
      p_user_id: userId,
      p_name: 'My Project',
      p_logo_url: null
    });

    if (error) {
      console.error('Error creating default project:', error);
      throw new Error(`Failed to create default project: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('No data returned from project creation');
    }

    const { project_id } = data[0];

    // Fetch the created project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .single();

    if (projectError) {
      console.error('Error fetching created project:', projectError);
      throw new Error(`Failed to fetch created project: ${projectError.message}`);
    }

    console.log('✅ Default project created successfully:', project.id);
    return project;
  } catch (error) {
    console.error('Error in ensureUserHasProject:', error);
    throw error;
  }
}

/**
 * Upload project logo to storage
 */
export async function uploadProjectLogo(userId: string, file: File): Promise<string> {
  if (!userId || !file) {
    throw new Error('User ID and file are required');
  }

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('project-logos')
      .upload(fileName, file);

    if (error) {
      console.error('Error uploading logo:', error);
      throw new Error(`Failed to upload logo: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('project-logos')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Error in uploadProjectLogo:', error);
    throw error;
  }
}