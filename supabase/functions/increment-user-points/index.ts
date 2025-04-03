
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserPoints {
  user_id: string;
  points: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Create Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Parse the request body
    const { user_id, points } = await req.json() as UserPoints;
    
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id parameter' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }
    
    // Check if user has a reputation record
    const { data: existingRep, error: checkError } = await supabase
      .from('community_reputation')
      .select('id, points')
      .eq('user_id', user_id)
      .maybeSingle();
      
    if (checkError) {
      console.error('Error checking reputation record:', checkError);
      return new Response(
        JSON.stringify({ error: checkError.message }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }
    
    let result;
    
    if (existingRep) {
      // Update existing reputation record
      const { data, error } = await supabase
        .from('community_reputation')
        .update({ 
          points: existingRep.points + points,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRep.id)
        .select('points, level')
        .single();
        
      if (error) {
        console.error('Error updating reputation:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          }
        );
      }
      
      result = data;
    } else {
      // Create new reputation record
      const { data, error } = await supabase
        .from('community_reputation')
        .insert({ 
          user_id: user_id,
          points: points,
          level: 1
        })
        .select('points, level')
        .single();
        
      if (error) {
        console.error('Error creating reputation:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          }
        );
      }
      
      result = data;
    }
    
    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
