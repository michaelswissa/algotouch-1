
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, Send, Volume2, VolumeX, RefreshCw, Bot } from "lucide-react";
import { useChatbot } from '@/hooks/use-chatbot';
import { toast } from '@/hooks/use-toast';

const ChatBot = () => {
  const [input, setInput] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { messages, isLoading, sendMessage, speakText, clearMessages } = useChatbot();
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoadComplete(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    const userInput = input;
    setInput('');
    try {
      await sendMessage(userInput);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "שגיאה בשליחת ההודעה",
        description: "אירעה שגיאה בעת שליחת ההודעה. אנא נסה שוב.",
        variant: "destructive",
      });
    }
  };

  const handleSpeakLatestMessage = async () => {
    if (isSpeaking) {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsSpeaking(false);
      }
      return;
    }

    const latestAssistantMessage = [...messages]
      .reverse()
      .find(msg => msg.role === 'assistant');
      
    if (latestAssistantMessage) {
      try {
        setIsSpeaking(true);
        
        const { audioUrl } = await speakText(latestAssistantMessage.content, {
          speakingRate: 1.0,
          pitch: -4
        });
        
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };
        
        audio.play();
      } catch (error) {
        console.error('Error playing audio:', error);
        setIsSpeaking(false);
        toast({
          title: "שגיאה בהפעלת הקול",
          description: "אירעה שגיאה בעת ניסיון להקריא את ההודעה",
          variant: "destructive",
        });
      }
    }
  };

  const handleResetChat = () => {
    clearMessages();
    toast({
      title: "הצ'אט אופס",
      description: "כל ההודעות נמחקו והצ'אט הותחל מחדש",
    });
  };

  const handleQuickQuestion = (question: string) => {
    setInput(question);
    setTimeout(() => handleSendMessage(), 100);
  };

  return (
    <div className="container mx-auto py-8 max-w-5xl" dir="rtl">
      <div>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 ml-2 rtl:mr-2 rtl:ml-0">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-2xl">העוזר החכם של AlgoTouch</CardTitle>
                  <CardDescription>
                    העוזר מתמחה במערכת AlgoTouch, אסטרטגיות מסחר וניתוח נתונים. שאל כל שאלה הקשורה למערכת ולמסחר אלגוריתמי.
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost" 
                size="sm" 
                onClick={handleResetChat}
                title="אפס שיחה"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 h-[500px] overflow-y-auto p-4 rounded-lg bg-gray-50 dark:bg-gray-900/30">
              {initialLoadComplete && messages.filter(msg => msg.role !== 'system').map((message, index) => (
                <div 
                  key={index} 
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`rounded-lg px-4 py-2 max-w-[80%] shadow-sm ${
                      message.role === 'user' 
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
                        : 'bg-white dark:bg-gray-800 text-foreground'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-lg px-4 py-2 bg-white dark:bg-gray-800 shadow-sm">
                    <div className="flex gap-2">
                      <Skeleton className="h-4 w-4 rounded-full animate-pulse bg-blue-200 dark:bg-blue-700" />
                      <Skeleton className="h-4 w-4 rounded-full animate-pulse bg-blue-200 dark:bg-blue-700" />
                      <Skeleton className="h-4 w-4 rounded-full animate-pulse bg-blue-200 dark:bg-blue-700" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4">
            <div className="flex w-full gap-2">
              <Input
                placeholder="שאל שאלה על מערכת AlgoTouch..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isLoading}
                className="flex-1"
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={isLoading || !input.trim()}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
              >
                <Send className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
                שלח
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">שאלות נפוצות</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start text-right hover:bg-blue-50 dark:hover:bg-blue-900/20" 
              onClick={() => handleQuickQuestion('איך מגדירים רמות תמיכה והתנגדות?')}
              disabled={isLoading}
            >
              <ArrowUpRight className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
              איך מגדירים רמות תמיכה והתנגדות?
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start text-right hover:bg-blue-50 dark:hover:bg-blue-900/20" 
              onClick={() => handleQuickQuestion('מהם יעדי הרווח (Profit Targets) ואיך מגדירים אותם?')}
              disabled={isLoading}
            >
              <ArrowUpRight className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
              מהם יעדי הרווח (Profit Targets)?
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start text-right hover:bg-blue-50 dark:hover:bg-blue-900/20" 
              onClick={() => handleQuickQuestion('איך בוחרים את הפרמטרים האופטימליים למסחר?')}
              disabled={isLoading}
            >
              <ArrowUpRight className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
              בחירת פרמטרים אופטימליים למסחר
            </Button>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2 bg-gradient-to-br from-blue-50/90 to-indigo-50/90 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-200/50 dark:border-blue-900/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-blue-700 dark:text-blue-400 flex justify-between items-center">
              <span>טיפ מקצועי</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300" 
                onClick={handleSpeakLatestMessage}
                disabled={isLoading || messages.length <= 1}
              >
                {isSpeaking ? (
                  <>
                    <VolumeX className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
                    הפסק הקראה
                  </>
                ) : (
                  <>
                    <Volume2 className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
                    הקרא הודעה אחרונה
                  </>
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              <strong>הגדרת 3 רמות רווח</strong> מאפשרת לנעול רווחים מוקדם ובטוח (Target 1) ועדיין לאפשר לחלק מהפוזיציה להמשיך לרוץ לרווחים גבוהים יותר בעסקאות מוצלחות במיוחד (Target 3).
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChatBot;
