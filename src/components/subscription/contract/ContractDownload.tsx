
import React from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContractDisplayProps } from '@/services/subscription/types/contract';

// HTML Sanitization function to prevent XSS attacks
const escapeHtml = (unsafe: string | null | undefined): string => {
  if (!unsafe) return '';
  return unsafe
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const ContractDownload: React.FC<ContractDisplayProps> = ({ contractData, contractHtml }) => {
  const downloadContract = () => {
    if (!contractHtml || !contractData) return;
    
    const element = document.createElement('a');
    
    // Enhance the HTML with additional metadata - with sanitization of all user inputs
    const enhancedHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>הסכם חתום - ${escapeHtml(contractData.full_name || 'לקוח')}</title>
        <style>
          body { font-family: Arial, sans-serif; direction: rtl; padding: 20px; }
          h2 { color: #333; }
          .signature-block { margin-top: 30px; border-top: 1px solid #ccc; padding-top: 20px; }
          .metadata { margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 10px; }
        </style>
      </head>
      <body>
        <h2>הסכם חתום</h2>
        <p>תאריך חתימה: ${escapeHtml(new Date(contractData.created_at).toLocaleDateString('he-IL'))}</p>
        
        <div class="contract-content">
          ${contractHtml}
        </div>
        
        <div class="signature-block">
          <h3>פרטי החותם:</h3>
          <p><strong>שם מלא:</strong> ${escapeHtml(contractData.full_name || 'לא צוין')}</p>
          <p><strong>אימייל:</strong> ${escapeHtml(contractData.email || 'לא צוין')}</p>
          <p><strong>כתובת:</strong> ${escapeHtml(contractData.address || 'לא צוין')}</p>
          <p><strong>טלפון:</strong> ${escapeHtml(contractData.phone || 'לא צוין')}</p>
          ${contractData.signature ? `<p><strong>חתימה:</strong><br><img src="${escapeHtml(contractData.signature)}" alt="חתימה דיגיטלית" style="max-width: 300px; border: 1px solid #eee;" /></p>` : ''}
          <p><strong>תאריך חתימה:</strong> ${escapeHtml(new Date(contractData.created_at).toLocaleString('he-IL'))}</p>
        </div>
        
        <div class="metadata">
          <h4>מידע נוסף:</h4>
          <p>מזהה הסכם: ${escapeHtml(contractData.id)}</p>
          <p>גרסת הסכם: ${escapeHtml(contractData.contract_version || '1.0')}</p>
          <p>הוסכם לתנאי שימוש: ${contractData.agreed_to_terms ? 'כן' : 'לא'}</p>
          <p>הוסכם למדיניות פרטיות: ${contractData.agreed_to_privacy ? 'כן' : 'לא'}</p>
        </div>
      </body>
      </html>
    `;
    
    const file = new Blob([enhancedHtml], {type: 'text/html'});
    element.href = URL.createObjectURL(file);
    element.download = `contract-${escapeHtml(contractData.full_name || 'user')}-${new Date().toISOString().slice(0,10)}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="border rounded-md p-4 bg-slate-50 dark:bg-slate-900">
      <p className="text-sm text-center mb-2">ההסכם נחתם ונשמר בהצלחה</p>
      <div className="flex justify-center">
        <Button onClick={downloadContract} variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          הורד עותק של ההסכם
        </Button>
      </div>
    </div>
  );
};

export default ContractDownload;
