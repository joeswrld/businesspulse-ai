// Script to create the uploads bucket in Supabase
// Run this with: node scripts/create-uploads-bucket.js

const { createClient } = require('@supabase/supabase-js');

// You'll need to set these environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   - VITE_SUPABASE_URL or SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('Please set these variables and try again.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createUploadsBucket() {
  try {
    console.log('🔍 Checking if uploads bucket exists...');
    
    // List existing buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      return;
    }

    const uploadsBucket = buckets?.find(bucket => bucket.name === 'uploads');
    
    if (uploadsBucket) {
      console.log('✅ Uploads bucket already exists!');
      return;
    }

    console.log('📦 Creating uploads bucket...');
    
    // Create the uploads bucket
    const { data, error } = await supabase.storage.createBucket('uploads', {
      public: false,
      allowedMimeTypes: [
        'text/csv',
        'application/pdf', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ],
      fileSizeLimit: 10485760 // 10MB
    });

    if (error) {
      console.error('❌ Error creating bucket:', error);
      return;
    }

    console.log('✅ Uploads bucket created successfully!');
    console.log('📋 Bucket details:', data);

    // Create storage policies
    console.log('🔒 Creating storage policies...');
    
    // Policy for users to upload their own files
    const { error: uploadPolicyError } = await supabase.rpc('create_storage_policy', {
      bucket_name: 'uploads',
      policy_name: 'Users can upload their own files',
      policy_definition: `
        CREATE POLICY "Users can upload their own files"
        ON storage.objects
        FOR INSERT
        WITH CHECK (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1])
      `
    });

    if (uploadPolicyError) {
      console.warn('⚠️  Warning: Could not create upload policy:', uploadPolicyError);
    }

    // Policy for users to view their own files
    const { error: viewPolicyError } = await supabase.rpc('create_storage_policy', {
      bucket_name: 'uploads',
      policy_name: 'Users can view their own files',
      policy_definition: `
        CREATE POLICY "Users can view their own files"
        ON storage.objects
        FOR SELECT
        USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1])
      `
    });

    if (viewPolicyError) {
      console.warn('⚠️  Warning: Could not create view policy:', viewPolicyError);
    }

    // Policy for service role to access all files
    const { error: servicePolicyError } = await supabase.rpc('create_storage_policy', {
      bucket_name: 'uploads',
      policy_name: 'Service role can access all files',
      policy_definition: `
        CREATE POLICY "Service role can access all files"
        ON storage.objects
        FOR ALL
        USING (bucket_id = 'uploads' AND auth.role() = 'service_role')
      `
    });

    if (servicePolicyError) {
      console.warn('⚠️  Warning: Could not create service role policy:', servicePolicyError);
    }

    console.log('✅ Storage setup complete!');
    console.log('');
    console.log('🎉 Your uploads bucket is ready to use!');
    console.log('   You can now upload files through the AI Insights page.');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Manual policy creation function (if RPC doesn't work)
async function createPoliciesManually() {
  console.log('🔧 Creating policies manually...');
  
  try {
    // Note: These policies should be created via SQL in the Supabase dashboard
    // or through migrations, but here's the SQL for reference:
    
    const policies = [
      {
        name: 'Users can upload their own files',
        sql: `
          CREATE POLICY "Users can upload their own files"
          ON storage.objects
          FOR INSERT
          WITH CHECK (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
        `
      },
      {
        name: 'Users can view their own files',
        sql: `
          CREATE POLICY "Users can view their own files"
          ON storage.objects
          FOR SELECT
          USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
        `
      },
      {
        name: 'Service role can access all files',
        sql: `
          CREATE POLICY "Service role can access all files"
          ON storage.objects
          FOR ALL
          USING (bucket_id = 'uploads' AND auth.role() = 'service_role');
        `
      }
    ];

    console.log('📋 Please run these SQL commands in your Supabase dashboard:');
    console.log('   Go to: SQL Editor > New Query');
    console.log('');
    
    policies.forEach(policy => {
      console.log(`-- ${policy.name}`);
      console.log(policy.sql);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error creating policies:', error);
  }
}

// Run the script
createUploadsBucket().then(() => {
  console.log('');
  console.log('📝 Next steps:');
  console.log('   1. If policies weren\'t created automatically, run the SQL commands above');
  console.log('   2. Test the upload functionality in your app');
  console.log('   3. Check the Supabase dashboard to verify the bucket exists');
});