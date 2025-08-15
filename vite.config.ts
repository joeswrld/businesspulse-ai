import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      // Proxy API calls to Supabase Edge Functions
      '/api/process-upload': {
        target: 'https://xjbrqeqizpoqdjkiyqzt.supabase.co/functions/v1/process-upload',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/process-upload/, ''),
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
        },
      },
      '/api/generate-report': {
        target: 'https://xjbrqeqizpoqdjkiyqzt.supabase.co/functions/v1/generate-report',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/generate-report/, ''),
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
        },
      },
      '/api/paystack-webhook': {
        target: 'https://xjbrqeqizpoqdjkiyqzt.supabase.co/functions/v1/paystack-webhook',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/paystack-webhook/, ''),
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
        },
      },
    },
  },
});
