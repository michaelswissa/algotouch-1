
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

    const { messages, action, threadId, runId } = await req.json()

    // Initialize with a system message if needed
    const systemMessage = {
      role: "system",
      content: "אתה עוזר מומחה למערכת AlgoTouch ולמסחר אלגוריתמי. התשובות שלך הן בעברית, מדויקות וקצרות. אתה עוזר למשתמשים להבין ניתוח טכני, רמות תמיכה והתנגדות, והגדרת פרמטרים במערכת AlgoTouch."
    }

    // Create or retrieve thread
    let thread
    if (threadId) {
      thread = { id: threadId }
    } else {
      thread = await openai.beta.threads.create()
      console.log("Created new thread:", thread.id)
    }

    // Action switch
    switch (action) {
      case 'chat':
        // Add user message to thread
        if (messages && messages.length > 0) {
          await openai.beta.threads.messages.create(thread.id, {
            role: "user",
            content: messages[messages.length - 1].content
          })
        }

        // Create a run with the assistant
        const run = await openai.beta.threads.runs.create(thread.id, {
          assistant_id: "asst_KqyUxYuP1v5eHlILJEsH6Czz", // Using the assistant ID from the PHP code
          instructions: "אתה מומחה במערכת AlgoTouch ובמסחר אלגוריתמי. ענה בעברית בצורה ברורה וקצרה."
        })

        // Poll for run completion
        let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id)
        
        // Simple polling mechanism with timeout
        let attempts = 0
        const maxAttempts = 30 // About 60 seconds max
        
        while (runStatus.status !== 'completed' && runStatus.status !== 'failed' && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000))
          runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id)
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
        const text = messages[0].content
        // Using OpenAI TTS for simplicity
        const mp3 = await openai.audio.speech.create({
          model: "tts-1",
          voice: "nova",
          input: text,
          response_format: "mp3"
        })

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
