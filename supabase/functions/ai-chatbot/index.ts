
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import OpenAI from "https://esm.sh/openai@4.20.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY')
    })

    const { messages, action, threadId, runId, ttsConfig, toolOutputs } = await req.json()

    // Initialize with a detailed system message for AlgoTouch trading
    const systemMessage = {
      role: "system",
      content: `אתה מומחה למערכת AlgoTouch לסחר אלגוריתמי באמצעות פלטפורמת TradeStation.
      
יש לך גישה למידע שוק בזמן אמת עבור מדדים ונכסים פיננסיים, כולל S&P 500, Nasdaq, Dow Jones, Tel Aviv 35, Bitcoin, וזהב.

תפקידך לספק הסברים טכניים מפורטים בנוגע לכל ההיבטים של המערכת:
- פתיחת חשבון בTradeStation והתקנת AlgoTouch
- בחירת נכסים למסחר (חוזים עתידיים, מניות) והבנת מבנה הסימולים בפלטפורמה
- הגדרת פרקי זמן למסחר המתאימים לסגנונות מסחר שונים
- זיהוי והגדרת רמות תמיכה והתנגדות בצורה נכונה
- הגדרת פרמטרים כמו Position Sizing, הגדרת כיוון המסחר
- הגדרת שלושת יעדי הרווח (Profit Targets) וניהול רווחים
- ניהול סיכונים חכם באמצעות Stop Loss, BE Stop, ו-Trailing Stop
- אסטרטגיות מתקדמות כמו DCA (Dollar Cost Averaging) ו-Martingale
- שימוש ברמות תמיכה והתנגדות בצורה חוזרת
- הגדרת פרמטרים לתנאי כניסה ושליחת פקודות מדויקות
- יצירת מערכת מסחר יציבה ורווחית

כאשר נשאל על מחירי שוק עדכניים, השתמש בכלי get_stock_price כדי לקבל את המידע העדכני ביותר.

ספק תשובות מפורטות וטכניות, תוך הדגמה עם דוגמאות מספריות ומעשיות. התייחס לתכונות ספציפיות של מערכת AlgoTouch ופרק תהליכים מורכבים לשלבים ברורים.`
    }

    // Define tools for the assistant
    const algoTouchTools = [
      {
        type: "function",
        function: {
          name: "get_position_sizing",
          description: "חישוב גודל פוזיציה מתאים על פי הון וניהול סיכונים",
          parameters: {
            type: "object",
            properties: {
              account_size: {
                type: "number",
                description: "גודל החשבון בדולרים"
              },
              risk_percentage: {
                type: "number",
                description: "אחוז הסיכון לעסקה (בדרך כלל בין 0.5% ל-2%)"
              },
              entry_price: {
                type: "number",
                description: "מחיר הכניסה לפוזיציה"
              },
              stop_loss_price: {
                type: "number",
                description: "מחיר ה-Stop Loss המתוכנן"
              }
            },
            required: ["account_size", "risk_percentage", "entry_price", "stop_loss_price"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "calculate_profit_targets",
          description: "חישוב יעדי רווח על בסיס יחס סיכוי סיכון",
          parameters: {
            type: "object",
            properties: {
              entry_price: {
                type: "number",
                description: "מחיר הכניסה לפוזיציה"
              },
              stop_loss_price: {
                type: "number",
                description: "מחיר ה-Stop Loss המתוכנן"
              },
              risk_reward_ratio_1: {
                type: "number",
                description: "יחס סיכוי/סיכון ליעד הראשון (בד״כ 1 או 1.5)"
              },
              risk_reward_ratio_2: {
                type: "number",
                description: "יחס סיכוי/סיכון ליעד השני (בד״כ 2 או 2.5)"
              },
              risk_reward_ratio_3: {
                type: "number",
                description: "יחס סיכוי/סיכון ליעד השלישי (בד״כ 3 או יותר)"
              },
              is_long: {
                type: "boolean",
                description: "האם הפוזיציה היא לונג (true) או שורט (false)"
              }
            },
            required: ["entry_price", "stop_loss_price", "is_long"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_stock_price",
          description: "קבלת מחירים עדכניים של מניות, מדדים וסחורות",
          parameters: {
            type: "object",
            properties: {
              symbol: {
                type: "string",
                description: "סמל או שם המניה/מדד (S&P 500, Nasdaq, Dow Jones, Tel Aviv 35, Bitcoin, Gold)"
              }
            },
            required: ["symbol"]
          }
        }
      }
    ];

    // Action switch
    switch (action) {
      case 'chat':
        // If using the standard chat completions API (no thread ID)
        if (!threadId) {
          const chatMessages = messages || []
          // Add system message if not present
          if (!chatMessages.some(msg => msg.role === 'system')) {
            chatMessages.unshift(systemMessage)
          }

          // Use the OpenAI GPT-4o model
          const completion = await openai.chat.completions.create({
            model: "gpt-4o", // Using gpt-4o for better reasoning and response quality
            messages: chatMessages,
            temperature: 0.5, // Slightly lower temperature for more technical/factual responses
            tools: algoTouchTools
          })

          return new Response(
            JSON.stringify({
              messages: [...chatMessages, {
                role: 'assistant',
                content: completion.choices[0].message.content,
                created_at: new Date().toISOString()
              }]
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        // Create or retrieve thread for Assistants API
        let thread
        if (threadId) {
          thread = { id: threadId }
          console.log("Using existing thread:", thread.id)
        } else {
          thread = await openai.beta.threads.create()
          console.log("Created new thread:", thread.id)
        }

        // Add user message to thread
        if (messages && messages.length > 0) {
          await openai.beta.threads.messages.create(thread.id, {
            role: "user",
            content: messages[messages.length - 1].content
          })
        }

        // Create a run with the specific assistant ID
        const runOptions = {
          assistant_id: "asst_KqyUxYuP1v5eHlILJEsH6Czz", // Using the provided assistant ID
          instructions: `אתה מומחה למערכת AlgoTouch לסחר אלגוריתמי באמצעות פלטפורמת TradeStation.

ענה בעברית בצורה טכנית, מפורטת ומדויקת על שאלות בנוגע ל:
1. התקנת והגדרת מערכת AlgoTouch
2. בחירת נכסים למסחר והבנת מבנה הסימולים
3. הגדרת פרקי זמן למסחר המתאימים לסגנונות שונים
4. זיהוי והגדרת רמות תמיכה והתנגדות בצורה נכונה
5. הגדרת פרמטרים כמו Position Sizing וכיוון מסחר
6. הגדרת שלושת יעדי הרווח (Profit Targets)
7. ניהול סיכונים באמצעות Stop Loss, BE Stop, ו-Trailing Stop
8. אסטרטגיות DCA (Dollar Cost Averaging) ו-Martingale
9. שימוש חוזר ברמות תמיכה והתנגדות
10. הגדרת תנאי כניסה ושליחת פקודות מדויקות
11. עקרונות להצלחה במסחר אלגוריתמי
12. מחירי שוק עדכניים (השתמש בכלי לקבלת נתוני מחיר בזמן אמת)

הדגם עם מספרים ודוגמאות מוחשיות והתייחס לתכונות הספציפיות של מערכת AlgoTouch.`,
          model: "gpt-4o", // Using the most capable model for the assistant
          tools: [
            {"type": "file_search"},
            ...algoTouchTools
          ],
          tool_resources: {
            "file_search": {
              "vector_store_ids": ["vs_67b64215c8548191b5984ab5316ee63a"] // Vector store ID
            }
          }
        }

        // If we have tool outputs to submit for a run in progress
        if (toolOutputs && runId) {
          console.log("Submitting tool outputs for run:", runId)
          const submissionResponse = await openai.beta.threads.runs.submitToolOutputs(
            thread.id,
            runId,
            { tool_outputs: toolOutputs }
          )
          console.log("Tool outputs submitted, run continuing")
          
          // We'll return the updated run status
          return new Response(
            JSON.stringify({
              threadId: thread.id,
              runId: submissionResponse.id,
              status: submissionResponse.status,
              requiresAction: submissionResponse.required_action
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        // Create new run
        const run = await openai.beta.threads.runs.create(thread.id, runOptions)
        console.log(`Created new run: ${run.id} with status: ${run.status}`)

        // Poll for run completion with better error handling and timeouts
        let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id)
        
        // Enhanced polling mechanism with better timeout handling
        let attempts = 0
        const maxAttempts = 60 // About 120 seconds max
        const pollingInterval = 2000 // 2 seconds
        
        while (!['completed', 'failed', 'expired', 'cancelled', 'requires_action'].includes(runStatus.status) && attempts < maxAttempts) {
          // Wait before checking status again
          await new Promise(resolve => setTimeout(resolve, pollingInterval))
          
          try {
            runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id)
            console.log(`Run status: ${runStatus.status}, attempt: ${attempts + 1}/${maxAttempts}`)
          } catch (retrieveError) {
            console.error(`Error retrieving run status: ${retrieveError.message}`)
            
            // If we've had multiple retrieval errors, we should fail the overall request
            if (attempts > 5) {
              throw new Error(`Multiple failures retrieving run status: ${retrieveError.message}`)
            }
          }
          
          attempts++
        }

        if (runStatus.status === 'failed') {
          throw new Error(`Run failed with error: ${runStatus.last_error?.message || 'Unknown error'}`)
        }

        if (runStatus.status === 'expired' || runStatus.status === 'cancelled') {
          throw new Error(`Run ${runStatus.status}`)
        }

        if (runStatus.status === 'requires_action') {
          // The run needs the client to execute functions and return the outputs
          console.log("Run requires action:", JSON.stringify(runStatus.required_action))
          
          // Return the required actions to the client
          return new Response(
            JSON.stringify({
              threadId: thread.id,
              runId: run.id,
              status: runStatus.status,
              requiresAction: runStatus.required_action,
              toolCalls: runStatus.required_action?.submit_tool_outputs?.tool_calls || []
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        if (attempts >= maxAttempts) {
          throw new Error('Timeout waiting for assistant response')
        }

        // Retrieve messages
        const messages_response = await openai.beta.threads.messages.list(thread.id)
        
        return new Response(
          JSON.stringify({
            threadId: thread.id,
            runId: run.id,
            messages: messages_response.data.map(msg => ({
              role: msg.role,
              content: msg.content[0].type === 'text' ? msg.content[0].text.value : '',
              created_at: msg.created_at
            }))
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )

      case 'tts':
        const text = messages[0]?.content || "";
        
        // Configure voice parameters based on ttsConfig
        const speechConfig = {
          model: "tts-1",
          voice: "nova", // Using Nova voice for Hebrew
          input: text,
          response_format: "mp3",
          speed: ttsConfig?.speakingRate || 1.0
        };
        
        // Using OpenAI TTS with custom parameters
        const mp3 = await openai.audio.speech.create(speechConfig)

        const buffer = await mp3.arrayBuffer()
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(buffer)))
        
        return new Response(
          JSON.stringify({ 
            audioContent: base64Audio
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )

      default:
        throw new Error(`Unknown action: ${action}`)
    }
  } catch (error) {
    console.error('Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message || 'An unknown error occurred' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
