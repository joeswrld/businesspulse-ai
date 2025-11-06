import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { commentId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get comment details
    const { data: comment, error: commentError } = await supabase
      .from("blog_comments")
      .select(`
        *,
        blog_posts (
          title,
          slug,
          user_id,
          profiles:user_id (
            email,
            full_name
          )
        )
      `)
      .eq("id", commentId)
      .single();

    if (commentError) throw commentError;

    // Get post author email
    const postAuthorEmail = comment.blog_posts.profiles?.email;
    const postAuthorName = comment.blog_posts.profiles?.full_name || "Author";

    if (!postAuthorEmail) {
      console.log("No email found for post author");
      return new Response(
        JSON.stringify({ message: "No email for author" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send notification email
    const emailResponse = await resend.emails.send({
      from: "Blog Comments <onboarding@resend.dev>",
      to: [postAuthorEmail],
      subject: `New comment on "${comment.blog_posts.title}"`,
      html: `
        <h2>New Comment on Your Blog Post</h2>
        <p>Hi ${postAuthorName},</p>
        <p>You have received a new comment on your blog post "<strong>${comment.blog_posts.title}</strong>".</p>
        
        <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <p><strong>From:</strong> ${comment.author_name}</p>
          <p><strong>Comment:</strong></p>
          <p>${comment.content}</p>
        </div>

        <p>
          <a href="https://notex.com.ng/blog/${comment.blog_posts.slug}" 
             style="background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Post & Moderate Comment
          </a>
        </p>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error sending comment notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
