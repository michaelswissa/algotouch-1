
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

    const { messages, action, threadId, runId, ttsConfig } = await req.json()

    // Initialize with a detailed system message for AlgoTouch trading
    const systemMessage = {
      role: "system",
      content: `אתה מומחה למסחר אלגוריתמי המיועד לשילוב בין מערכת AlgoTouch לפלטפורמת TradeStation.
תפקידך לספק הסברים טכניים ומעמיקים בכל הנוגע להגדרות המערכת, ניהול סיכונים, אופטימיזציה של פרמטרים ואסטרטגיות מסחר מתקדמות.
הקפד לתת תשובות טכניות, מפורטות וברורות, תוך פירוק נושאים מורכבים לשלבים מובנים ודוגמאות קונקרטיות.
התמקד בנושאים כמו הגדרת רמות תמיכה והתנגדות, Position Sizing, Stop Loss, BE Stop, Trailing Stop, Dollar Cost Averaging (DCA), Martingale, ושלושת רמות הרווח (Profit Targets).
הסבר בפירוט כיצד להגדיר את הפרמטרים השונים ואת השימוש בכלי המסחר, הגדרות המסך, וכיצד להפעיל את הפונקציות השונות של מערכת AlgoTouch.`
    }

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

          // Use the OpenAI o3-mini model for better reasoning capabilities
          const completion = await openai.chat.completions.create({
            model: "gpt-4o", // Using gpt-4o for better reasoning and response quality
            messages: chatMessages,
            temperature: 0.5, // Slightly lower temperature for more technical/factual responses
            reasoning_effort: "high", // Higher reasoning effort for detailed explanations
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
        const run = await openai.beta.threads.runs.create(thread.id, {
          assistant_id: "asst_KqyUxYuP1v5eHlILJEsH6Czz", // Using the provided assistant ID
          instructions: `אתה מומחה למסחר אלגוריתמי, מומחה למערכת AlgoTouch, ובקיא בכל הקשור לפלטפורמת TradeStation.
ענה בעברית בצורה טכנית, מפורטת ומדויקת.
התמקד בנושאים כמו הגדרת רמות תמיכה והתנגדות, Position Sizing, Stop Loss, BE Stop, 
Trailing Stop, שלושת רמות הרווח (Profit Targets), Dollar Cost Averaging (DCA), ושיטת Martingale.
הסבר את הפרמטרים הטכניים בצורה מפורטת וברורה, הדגם עם מספרים ודוגמאות מוחשיות.
נתח נושאים טכניים צעד אחר צעד, והתייחס למאפיינים ספציפיים של המערכת.`,
          model: "gpt-4o", // Using the most capable model for the assistant
          tools: [{"type": "file_search"}],
          tool_resources: {
            "file_search": {
              "vector_store_ids": ["vs_67b64215c8548191b5984ab5316ee63a"] // Provided vector store ID
            }
          }
        })

        // Poll for run completion
        let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id)
        
        // Simple polling mechanism with timeout
        let attempts = 0
        const maxAttempts = 60 // About 120 seconds max (increased from 30 attempts)
        
        while (runStatus.status !== 'completed' && runStatus.status !== 'failed' && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000))
          runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id)
          console.log(`Run status: ${runStatus.status}, attempt: ${attempts}`)
          attempts++
        }

        if (runStatus.status === 'failed') {
          throw new Error(`Run failed with error: ${runStatus.last_error?.message || 'Unknown error'}`)
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
