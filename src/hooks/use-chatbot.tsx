
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

type ToolCall = {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
};

type TTSConfig = {
  speakingRate?: number;
  pitch?: number;
};

export function useChatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content: `אתה מומחה למסחר אלגוריתמי המיועד לשילוב בין מערכת AlgoTouch לפלטפורמת TradeStation. 
      
המערכת AlgoTouch היא מערכת אלגוריתמית חכמה שמאפשרת למשתמשים לסחור בשוק ההון בצורה אוטומטית, קלה ויעילה.
המערכת מזהה רמות תמיכה והתנגדות, מגדירה נקודות כניסה ויציאה חכמות, ומתאימה את עצמה בזמן אמת.

תפקידך לספק מידע מקיף על:
1. פתיחת חשבון בTradeStation והתקנת מערכת AlgoTouch
2. בחירת נכסים למסחר והבנת מבנה הסימולים
3. הגדרת פרקי זמן למסחר
4. זיהוי והגדרת רמות תמיכה והתנגדות
5. הגדרת פרמטרים שונים במערכת כמו Position Sizing, כיוון מסחר, שלושת יעדי הרווח
6. ניהול סיכונים באמצעות Stop Loss, BE Stop, ו-Trailing Stop
7. אסטרטגיות מתקדמות כמו DCA ו-Martingale
8. הגדרת פרמטרים לכניסה מחדש לרמות, תנאי כניסה, וסינון נרות
9. חוקים להצלחה במסחר ועקרונות חשובים

יש לתת תשובות מפורטות ומקצועיות המבוססות על הידע הטכני של המערכת.`
    },
    {
      role: 'assistant',
      content: 'שלום, אני העוזר החכם של AlgoTouch. כיצד אוכל לעזור לך היום בנושאי מסחר אלגוריתמי, הגדרות המערכת, או אסטרטגיות מסחר?'
    }
  ]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingToolCalls, setPendingToolCalls] = useState<ToolCall[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Handle function calls from the assistant
  const handleFunctionCall = async (toolCall: ToolCall) => {
    const { function: { name, arguments: argsString } } = toolCall;
    const args = JSON.parse(argsString);
    
    let result: string;
    
    switch (name) {
      case 'get_position_sizing':
        result = calculatePositionSize(args);
        break;
      case 'calculate_profit_targets':
        result = calculateProfitTargets(args);
        break;
      default:
        result = JSON.stringify({ error: `Function ${name} not implemented` });
    }
    
    return { tool_call_id: toolCall.id, output: result };
  };
  
  // Implement the functions the assistant might call
  const calculatePositionSize = (args: any): string => {
    const { account_size, risk_percentage, entry_price, stop_loss_price } = args;
    const riskAmount = account_size * (risk_percentage / 100);
    const priceDifference = Math.abs(entry_price - stop_loss_price);
    const positionSize = riskAmount / priceDifference;
    
    return JSON.stringify({
      position_size: positionSize.toFixed(2),
      risk_amount: riskAmount.toFixed(2),
      units: Math.floor(positionSize),
      explanation: `על בסיס חשבון בגודל $${account_size} וסיכון של ${risk_percentage}%, הסכום המקסימלי לסיכון הוא $${riskAmount.toFixed(2)}. עם כניסה ב-$${entry_price} ו-Stop Loss ב-$${stop_loss_price}, גודל הפוזיציה המומלץ הוא ${positionSize.toFixed(2)} יחידות.`
    });
  };
  
  const calculateProfitTargets = (args: any): string => {
    const { entry_price, stop_loss_price, risk_reward_ratio_1 = 1.5, risk_reward_ratio_2 = 2.5, risk_reward_ratio_3 = 4, is_long = true } = args;
    
    const risk = Math.abs(entry_price - stop_loss_price);
    let target1, target2, target3;
    
    if (is_long) {
      target1 = entry_price + (risk * risk_reward_ratio_1);
      target2 = entry_price + (risk * risk_reward_ratio_2);
      target3 = entry_price + (risk * risk_reward_ratio_3);
    } else {
      target1 = entry_price - (risk * risk_reward_ratio_1);
      target2 = entry_price - (risk * risk_reward_ratio_2);
      target3 = entry_price - (risk * risk_reward_ratio_3);
    }
    
    return JSON.stringify({
      target1: target1.toFixed(2),
      target2: target2.toFixed(2),
      target3: target3.toFixed(2),
      explanation: `עבור ${is_long ? 'פוזיציית לונג' : 'פוזיציית שורט'} עם כניסה ב-$${entry_price} ו-Stop Loss ב-$${stop_loss_price}:
      - יעד רווח ראשון (RR ${risk_reward_ratio_1}): $${target1.toFixed(2)}
      - יעד רווח שני (RR ${risk_reward_ratio_2}): $${target2.toFixed(2)}
      - יעד רווח שלישי (RR ${risk_reward_ratio_3}): $${target3.toFixed(2)}`
    });
  };

  // Handle tool calls from the assistant
  const processToolCalls = async (toolCalls: ToolCall[]) => {
    // Add a message showing that the assistant is performing calculations
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: 'מבצע חישובים... אנא המתן.'
    }]);
    
    try {
      // Process all tool calls in parallel
      const toolOutputs = await Promise.all(
        toolCalls.map(toolCall => handleFunctionCall(toolCall))
      );
      
      // Submit tool outputs back to the assistant
      const { data, error } = await supabase.functions.invoke('ai-chatbot', {
        body: {
          action: 'chat',
          threadId,
          runId,
          toolOutputs
        }
      });
      
      if (error) throw new Error(error.message);
      
      // Continue polling for the run result
      await pollForRunCompletion(data.threadId, data.runId);
      
    } catch (err) {
      console.error('Error processing tool calls:', err);
      setMessages(prev => [...prev.slice(0, -1), {
        role: 'assistant',
        content: 'אירעה שגיאה בביצוע החישובים. אנא נסה שוב או שאל שאלה אחרת.'
      }]);
      setIsLoading(false);
    }
  };
  
  // Poll for run completion after submitting tool outputs
  const pollForRunCompletion = async (currentThreadId: string, currentRunId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-chatbot', {
        body: {
          action: 'chat',
          threadId: currentThreadId,
          runId: currentRunId
        }
      });
      
      if (error) throw new Error(error.message);
      
      if (data.status === 'requires_action' && data.toolCalls && data.toolCalls.length > 0) {
        // Another round of tool calls is needed
        setPendingToolCalls(data.toolCalls);
        await processToolCalls(data.toolCalls);
        return;
      }
      
      // Update messages from the response
      if (data.messages && data.messages.length > 0) {
        // Remove the "performing calculations" message
        setMessages(prev => {
          const filteredMessages = prev.filter(msg => msg.content !== 'מבצע חישובים... אנא המתן.');
          
          // Sort messages by created_at and filter to only show the latest assistant message
          const sortedMessages = [...data.messages].sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          
          const latestAssistantMessage = sortedMessages
            .filter(msg => msg.role === 'assistant')
            .pop();
            
          if (latestAssistantMessage) {
            return [...filteredMessages, {
              role: 'assistant',
              content: latestAssistantMessage.content
            }];
          }
          
          return filteredMessages;
        });
      }
      
    } catch (err) {
      console.error('Error polling for run completion:', err);
      // Add error message
      setMessages(prev => [...prev.filter(msg => msg.content !== 'מבצע חישובים... אנא המתן.'), {
        role: 'assistant',
        content: 'התרחשה שגיאה בתקשורת. אנא נסה שוב מאוחר יותר.'
      }]);
    } finally {
      setIsLoading(false);
      setPendingToolCalls([]);
    }
  };

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // Add user message to local state
    const userMessage: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Call the edge function
      const { data, error } = await supabase.functions.invoke('ai-chatbot', {
        body: {
          messages: [...messages, userMessage],
          threadId,
          action: 'chat'
        }
      });

      if (error) throw new Error(error.message);

      // Update thread ID for future messages
      if (data.threadId) {
        setThreadId(data.threadId);
      }
      
      // Update run ID
      if (data.runId) {
        setRunId(data.runId);
      }

      // Check if we need to handle tool calls
      if (data.status === 'requires_action' && data.toolCalls && data.toolCalls.length > 0) {
        setPendingToolCalls(data.toolCalls);
        await processToolCalls(data.toolCalls);
        return;
      }

      // Update messages from the response
      if (data.messages && data.messages.length > 0) {
        // Sort messages by created_at and filter to only show the latest assistant message
        const sortedMessages = [...data.messages].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        const latestAssistantMessage = sortedMessages
          .filter(msg => msg.role === 'assistant')
          .pop();
          
        if (latestAssistantMessage) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: latestAssistantMessage.content
          }]);
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
      // Add error message
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'התרחשה שגיאה בתקשורת. אנא נסה שוב מאוחר יותר.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, threadId, runId]);

  const speakText = useCallback(async (text: string, config?: TTSConfig): Promise<{audioUrl: string}> => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-chatbot', {
        body: {
          messages: [{ content: text }],
          action: 'tts',
          ttsConfig: config
        }
      });

      if (error) throw new Error(error.message);

      // Convert the base64 audio to a Blob and create an object URL
      const audioBlob = base64ToBlob(data.audioContent, 'audio/mpeg');
      const audioUrl = URL.createObjectURL(audioBlob);
      
      return { audioUrl };
    } catch (err) {
      console.error('Error in text-to-speech:', err);
      throw err;
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([
      {
        role: 'system',
        content: `אתה מומחה למסחר אלגוריתמי המיועד לשילוב בין מערכת AlgoTouch לפלטפורמת TradeStation. 
      
המערכת AlgoTouch היא מערכת אלגוריתמית חכמה שמאפשרת למשתמשים לסחור בשוק ההון בצורה אוטומטית, קלה ויעילה.
המערכת מזהה רמות תמיכה והתנגדות, מגדירה נקודות כניסה ויציאה חכמות, ומתאימה את עצמה בזמן אמת.

תפקידך לספק מידע מקיף על:
1. פתיחת חשבון בTradeStation והתקנת מערכת AlgoTouch
2. בחירת נכסים למסחר והבנת מבנה הסימולים
3. הגדרת פרקי זמן למסחר
4. זיהוי והגדרת רמות תמיכה והתנגדות
5. הגדרת פרמטרים שונים במערכת כמו Position Sizing, כיוון מסחר, שלושת יעדי הרווח
6. ניהול סיכונים באמצעות Stop Loss, BE Stop, ו-Trailing Stop
7. אסטרטגיות מתקדמות כמו DCA ו-Martingale
8. הגדרת פרמטרים לכניסה מחדש לרמות, תנאי כניסה, וסינון נרות
9. חוקים להצלחה במסחר ועקרונות חשובים

יש לתת תשובות מפורטות ומקצועיות המבוססות על הידע הטכני של המערכת.`
      },
      {
        role: 'assistant',
        content: 'שלום, אני העוזר החכם של AlgoTouch. כיצד אוכל לעזור לך היום בנושאי מסחר אלגוריתמי, הגדרות המערכת, או אסטרטגיות מסחר?'
      }
    ]);
    setThreadId(null);
    setRunId(null);
    setPendingToolCalls([]);
  }, []);

  // Helper function to convert base64 to blob
  function base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteArrays = [];
    
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    
    return new Blob(byteArrays, { type: mimeType });
  }

  return {
    messages,
    isLoading,
    sendMessage,
    speakText,
    clearMessages,
    pendingToolCalls
  };
}
