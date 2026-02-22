import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    // Check admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin");

    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u: any) => u.email === email
    );

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: "Este email já está cadastrado no sistema." }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create user with a random password (they'll reset it)
    const tempPassword = crypto.randomUUID() + "Aa1!";
    const { data: newUser, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
      });

    if (createError) {
      throw createError;
    }

    // Update profile: set status to approved and unlimited access
    await adminClient
      .from("profiles")
      .update({
        status: "approved",
        has_unlimited_access: true,
      })
      .eq("user_id", newUser.user.id);

    // Generate password reset link
    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: `${req.headers.get("origin") || supabaseUrl}/redefinir-senha`,
        },
      });

    if (linkError) {
      throw linkError;
    }

    // Build the redirect URL with the token
    const actionLink = linkData?.properties?.action_link;

    // Send email via Resend
    const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);
    const { error: emailError } = await resend.emails.send({
      from: "Posologia <noreply@tbl.posologia.app>",
      to: [email],
      subject: "Você foi convidado para o Posologia!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a1a2e; font-size: 24px; margin-bottom: 8px;">Bem-vindo ao Posologia!</h1>
            <p style="color: #666; font-size: 16px;">Você foi convidado para acessar a plataforma com acesso ilimitado.</p>
          </div>
          <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <p style="color: #333; margin-bottom: 16px;">Para começar, clique no botão abaixo para definir sua senha:</p>
            <div style="text-align: center;">
              <a href="${actionLink}" style="display: inline-block; background: #6366f1; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Definir minha senha</a>
            </div>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center;">Se você não esperava este convite, pode ignorar este email.</p>
        </div>
      `,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      throw new Error("Falha ao enviar email de convite.");
    }

    return new Response(
      JSON.stringify({ success: true, message: "Convite enviado com sucesso!" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in invite-user:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
