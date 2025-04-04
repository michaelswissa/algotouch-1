
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as nodemailer from "npm:nodemailer@6.9.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { to, subject, html, text, replyTo, attachmentData } = await req.json();
    
    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: 'Missing required email fields (to, subject, html)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Get SMTP configuration from environment variables
    const smtpHost = Deno.env.get('SMTP_HOST');
    const smtpPort = Deno.env.get('SMTP_PORT');
    const smtpUser = Deno.env.get('SMTP_USER');
    const smtpPass = Deno.env.get('SMTP_PASS');
    
    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      console.error('Missing SMTP environment variables');
      return new Response(
        JSON.stringify({ error: 'SMTP configuration is missing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    // Create transporter
    const transporter = nodemailer.default.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: parseInt(smtpPort) === 465, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
    
    // Prepare email options
    const mailOptions = {
      from: `"Lovable" <${smtpUser}>`,
      to: to,
      subject: subject,
      html: html,
      text: text || undefined,
      replyTo: replyTo || undefined,
      attachments: [],
    };
    
    // Add attachments if present
    if (attachmentData && Array.isArray(attachmentData)) {
      for (const attachment of attachmentData) {
        mailOptions.attachments.push({
          filename: attachment.filename,
          content: attachment.content,
          contentType: attachment.mimeType,
        });
      }
    }
    
    // Send email
    console.log(`Sending email to ${to}`);
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    
    return new Response(
      JSON.stringify({ success: true, messageId: info.messageId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error sending email' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
