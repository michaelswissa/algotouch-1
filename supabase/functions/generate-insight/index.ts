
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
    const { metrics, experienceLevel = 'מנוסה' } = await req.json();
    const { ess, ii, omrs, tg, ai } = metrics;

    // Generate qualitative assessments
    const essQuality = ess > 3.5 ? "טובה" : ess > 2.5 ? "סבירה" : "נמוכה";
    const iiQuality = ii < 1.5 ? "נמוכה (חיובי)" : ii < 3 ? "בינונית" : "גבוהה (שלילי)";
    const omrsQuality = omrs > 3.5 ? "טובה" : omrs > 2.5 ? "סבירה" : "נמוכה";
    const tgQuality = tg < 1.5 ? "נמוך (חיובי)" : tg < 3 ? "בינוני" : "גבוה (שלילי)";
    const aiQuality = ai < 1.5 ? "נמוך (חיובי)" : ai < 2.5 ? "בינוני" : "גבוה (שלילי)";

    // Create OpenAI prompt
    const prompt = `
בהתבסס על הנתונים הבאים של סוחר ${experienceLevel}:

- יציבות רגשית (ESS): ${ess} (${essQuality})
- מדד התערבות (II): ${ii} (${iiQuality})
- מוכנות מנטלית כוללת (OMRS): ${omrs} (${omrsQuality})
- פער אמון (TG): ${tg} (${tgQuality})
- מדד אזהרה (AI): ${ai} (${aiQuality})

אנא ספק תובנה קצרה (לא יותר מ-3 משפטים) והמלצה ממוקדת למשתמש להמשך היום.
התובנה צריכה להיות:
1. כתובה בעברית ברורה ובגוף שני
2. לא יותר מ-3 משפטים
3. להתייחס לנתון המשמעותי ביותר מבין הנתונים
4. לכלול המלצה פרקטית וישימה אחת להמשך היום

מבנה התשובה:
[תובנה של 1-2 משפטים] [המלצה פרקטית בת משפט אחד]
    `;

    // Call OpenAI API
    console.log('Calling OpenAI with prompt:', prompt);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'אתה יועץ פסיכולוגי לסוחרים בשוק ההון שמספק תובנות והמלצות קצרות, ברורות ומדויקות בעברית.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 150
      }),
    });

    const data = await response.json();
    console.log('OpenAI response:', data);
    
    if (!data.choices || !data.choices[0]) {
      throw new Error('No response from OpenAI');
    }

    const insight = data.choices[0].message.content.trim();

    // Fallback insights if OpenAI fails or returns empty
    const fallbackInsights = {
      high_alert: "רמת האזהרה גבוהה מדי. מומלץ להימנע מהתערבויות ולקחת הפסקה קצרה כדי להירגע.",
      low_trust: "האמון באלגוריתם נמוך מדי היום. כדאי להימנע מהתערבויות ולעקוב אחר הביצועים ללא התערבות.",
      good_condition: "מצבך המנטלי והרגשי נראה יציב היום. המשך עם הגישה הנוכחית ושמור על משמעת.",
      poor_readiness: "המוכנות שלך למסחר היום נמוכה. שקול לקחת יום הפסקה או להגביל את הפעילות למינימום.",
      default: "יש לבדוק את כל המדדים ולהחליט אם לסחור היום בהתאם לנתונים."
    };

    // Return the insight or fallback based on metrics if OpenAI fails
    return new Response(
      JSON.stringify({
        insight: insight || getFallbackInsight(metrics, fallbackInsights),
        source: insight ? 'openai' : 'fallback'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating insight:', error);
    
    return new Response(
      JSON.stringify({
        insight: "אירעה שגיאה בעת יצירת התובנה. בדוק את המדדים שלך ופעל בזהירות היום.",
        source: 'error',
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Helper function to get fallback insight based on metrics
function getFallbackInsight(metrics: any, fallbackInsights: Record<string, string>): string {
  const { ess, ii, omrs, tg, ai } = metrics;
  
  if (ai > 2.5) return fallbackInsights.high_alert;
  if (tg > 3) return fallbackInsights.low_trust;
  if (omrs < 2.5) return fallbackInsights.poor_readiness;
  if (ess > 3.5 && ii < 2) return fallbackInsights.good_condition;
  
  return fallbackInsights.default;
}
