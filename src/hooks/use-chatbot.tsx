
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calculatePositionSize, calculateProfitTargets } from '@/lib/chatbot/calculation-utils';
import { 
  DEFAULT_SYSTEM_PROMPT, 
  DEFAULT_ASSISTANT_GREETING,
  type Message,
  type ToolCall,
  type TTSConfig
} from '@/lib/chatbot/constants';
import { base64ToBlob } from '@/lib/chatbot/audio-utils';
import { logger } from '@/lib/logger';

export function useChatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content: DEFAULT_SYSTEM_PROMPT
    },
    {
      role: 'assistant',
      content: DEFAULT_ASSISTANT_GREETING
    }
  ]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingToolCalls, setPendingToolCalls] = useState<ToolCall[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Handle function calls from the assistant
  const handleFunctionCall = useCallback(async (toolCall: ToolCall) => {
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
  }, []);
  
  // Handle tool calls from the assistant
  const processToolCalls = useCallback(async (toolCalls: ToolCall[]) => {
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
      logger.error('Error processing tool calls:', err);
      setMessages(prev => [...prev.slice(0, -1), {
        role: 'assistant',
        content: 'אירעה שגיאה בביצוע החישובים. אנא נסה שוב או שאל שאלה אחרת.'
      }]);
      setIsLoading(false);
    }
  }, [threadId, runId]);
  
  // Poll for run completion after submitting tool outputs
  const pollForRunCompletion = useCallback(async (currentThreadId: string, currentRunId: string) => {
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
      logger.error('Error polling for run completion:', err);
      // Add error message
      setMessages(prev => [...prev.filter(msg => msg.content !== 'מבצע חישובים... אנא המתן.'), {
        role: 'assistant',
        content: 'התרחשה שגיאה בתקשורת. אנא נסה שוב מאוחר יותר.'
      }]);
    } finally {
      setIsLoading(false);
      setPendingToolCalls([]);
    }
  }, [processToolCalls]);

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
      logger.error('Error sending message:', err);
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
  }, [messages, threadId, processToolCalls]);

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
      logger.error('Error in text-to-speech:', err);
      throw err;
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([
      {
        role: 'system',
        content: DEFAULT_SYSTEM_PROMPT
      },
      {
        role: 'assistant',
        content: DEFAULT_ASSISTANT_GREETING
      }
    ]);
    setThreadId(null);
    setRunId(null);
    setPendingToolCalls([]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    speakText,
    clearMessages,
    pendingToolCalls
  };
}
