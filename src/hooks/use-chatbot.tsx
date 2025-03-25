
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

type TTSConfig = {
  speakingRate?: number;
  pitch?: number;
};

export function useChatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content: 'אתה עוזר מומחה למערכת AlgoTouch ולמסחר אלגוריתמי. התשובות שלך הן בעברית, מדויקות וקצרות.'
    },
    {
      role: 'assistant',
      content: 'שלום, אני העוזר החכם של AlgoTouch. איך אוכל לעזור לך היום?'
    }
  ]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
  }, [messages, threadId]);

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
        content: 'אתה עוזר מומחה למערכת AlgoTouch ולמסחר אלגוריתמי. התשובות שלך הן בעברית, מדויקות וקצרות.'
      },
      {
        role: 'assistant',
        content: 'שלום, אני העוזר החכם של AlgoTouch. איך אוכל לעזור לך היום?'
      }
    ]);
    setThreadId(null);
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
    clearMessages
  };
}
