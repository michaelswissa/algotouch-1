
import { supabase } from '@/integrations/supabase/client';

/**
 * Logs contract signature activities for auditing and legal purposes
 */
export async function logContractActivity(
  userId: string,
  planId: string,
  action: 'view' | 'sign' | 'download' | 'email_sent',
  metadata: Record<string, any> = {}
): Promise<{ success: boolean; error?: any }> {
  try {
    // Include client IP information when available
    let ipAddress = '';
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      ipAddress = data.ip;
    } catch (ipError) {
      console.warn('Could not get IP address:', ipError);
    }

    const { error } = await supabase
      .from('contract_activity_logs')
      .insert({
        user_id: userId,
        plan_id: planId,
        action_type: action,
        ip_address: ipAddress,
        user_agent: navigator.userAgent,
        metadata: {
          ...metadata,
          language: navigator.language,
          platform: navigator.platform,
          screenSize: `${window.innerWidth}x${window.innerHeight}`,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          date: new Date().toISOString()
        }
      });

    if (error) {
      console.error('Error logging contract activity:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Exception logging contract activity:', error);
    return { success: false, error };
  }
}

/**
 * Generates contract metadata for legal documentation
 */
export function generateContractMetadata(
  userId: string,
  fullName: string,
  email: string,
  phone: string = '',
  idNumber: string = ''
): Record<string, any> {
  return {
    userId,
    fullName,
    email,
    phone,
    idNumber,
    timestamp: new Date().toISOString(),
    browserInfo: {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    contractId: crypto.randomUUID()
  };
}

/**
 * Generates a printable HTML version of the contract with all metadata
 */
export function generateContractHtml(
  contractText: string,
  signature: string,
  metadata: Record<string, any>
): string {
  const formattedDate = new Date(metadata.timestamp).toLocaleDateString('he-IL');
  const formattedTime = new Date(metadata.timestamp).toLocaleTimeString('he-IL');
  
  return `
    <!DOCTYPE html>
    <html lang="he" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>הסכם רישיון - AlgoTouch</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          margin: 20px;
          direction: rtl;
        }
        h1, h2, h3, h4 {
          margin-top: 20px;
          margin-bottom: 10px;
        }
        p {
          margin-bottom: 10px;
        }
        .contract-content {
          margin-bottom: 30px;
        }
        .signature-section {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
        }
        .signature-img {
          max-width: 300px;
          margin-top: 10px;
          border: 1px solid #eee;
          padding: 10px;
        }
        .metadata {
          font-size: 12px;
          color: #666;
          margin-top: 50px;
          border-top: 1px solid #eee;
          padding-top: 20px;
        }
        .contract-id {
          font-family: monospace;
          background: #f5f5f5;
          padding: 2px 4px;
          border-radius: 3px;
        }
      </style>
    </head>
    <body>
      <h1>הסכם רישיון תוכנה</h1>
      <div class="contract-content">
        ${contractText.split('\n').map(paragraph => {
          if (/^\d+\./.test(paragraph.trim())) {
            return `<h3>${paragraph}</h3>`;
          } 
          else if (/^\d+\.\d+/.test(paragraph.trim())) {
            return `<h4>${paragraph}</h4>`;
          } 
          else if (paragraph.trim()) {
            return `<p>${paragraph}</p>`;
          }
          return '<br />';
        }).join('')}
      </div>
      
      <div class="signature-section">
        <h3>חתימת המשתמש</h3>
        <p><strong>שם מלא:</strong> ${metadata.fullName}</p>
        <p><strong>דואר אלקטרוני:</strong> ${metadata.email}</p>
        ${metadata.phone ? `<p><strong>טלפון:</strong> ${metadata.phone}</p>` : ''}
        ${metadata.idNumber ? `<p><strong>מספר ת.ז:</strong> ${metadata.idNumber}</p>` : ''}
        <p><strong>תאריך חתימה:</strong> ${formattedDate} בשעה ${formattedTime}</p>
        ${signature ? `<div><img src="${signature}" alt="חתימה דיגיטלית" class="signature-img" /></div>` : ''}
      </div>
      
      <div class="metadata">
        <p><strong>מידע משפטי:</strong></p>
        <p>מזהה הסכם: <span class="contract-id">${metadata.contractId}</span></p>
        <p>כתובת IP: ${metadata.browserInfo?.ipAddress || 'לא נרשמה'}</p>
        <p>דפדפן: ${metadata.browserInfo?.userAgent || 'לא נרשם'}</p>
        <p>מסמך זה נחתם דיגיטלית בהתאם לחוק החתימה האלקטרונית, התשס"א-2001</p>
      </div>
    </body>
    </html>
  `;
}
