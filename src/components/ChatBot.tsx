
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, Send, Volume2, VolumeX, RefreshCw, Bot, Upload } from "lucide-react";
import { useChatbot } from '@/hooks/use-chatbot';
import { toast } from '@/hooks/use-toast';

const ChatBot = () => {
  const [input, setInput] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // You could implement file processing here if needed
    // For now, just notify the user
    toast({
      title: "קובץ נבחר",
      description: `הקובץ "${files[0].name}" הועלה בהצלחה`,
    });
    
    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-5xl" dir="rtl">
      <div>
        <Card className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900/50 dark:to-gray-800/30 border border-blue-50 dark:border-blue-900/20 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-300 ml-2 rtl:mr-2 rtl:ml-0 shadow-sm">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl">העוזר החכם של AlgoTouch</CardTitle>
                  <CardDescription>
                    העוזר מתמחה במערכת AlgoTouch ובמסחר אלגוריתמי. שאל כל שאלה הקשורה לרמות תמיכה והתנגדות, 
                    Position Sizing, Stop Loss, BE Stop, Trailing Stop, DCA, ו-Martingale.
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
            <div className="space-y-4 h-[500px] overflow-y-auto p-4 rounded-lg bg-white/95 dark:bg-gray-900/30 shadow-sm border border-white/80 dark:border-white/5">
              {initialLoadComplete && messages.filter(msg => msg.role !== 'system').map((message, index) => (
                <div 
                  key={index} 
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`rounded-lg px-4 py-2 max-w-[80%] shadow-sm ${
                      message.role === 'user' 
                        ? 'bg-gradient-to-r from-blue-400 to-blue-500 text-white' 
                        : 'bg-white dark:bg-gray-800/60 text-foreground border border-white/80 dark:border-white/5'
                    }`}
                  >
                    <div 
                      className="whitespace-pre-wrap"
                      // Enable rendering of formatted text with line breaks
                      dangerouslySetInnerHTML={{
                        __html: message.content
                          .replace(/\n/g, '<br/>')
                          // Bold important terms
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          // Italic
                          .replace(/\*(.*?)\*/g, '<em>$1</em>')
                      }}
                    />
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-lg px-4 py-2 bg-white dark:bg-gray-800/60 shadow-sm border border-white/80 dark:border-white/5">
                    <div className="flex gap-2">
                      <Skeleton className="h-4 w-4 rounded-full animate-pulse bg-blue-100 dark:bg-blue-700/50" />
                      <Skeleton className="h-4 w-4 rounded-full animate-pulse bg-blue-100 dark:bg-blue-700/50" />
                      <Skeleton className="h-4 w-4 rounded-full animate-pulse bg-blue-100 dark:bg-blue-700/50" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </CardContent>
          <CardFooter className="border-t border-blue-50 dark:border-blue-900/20 pt-4">
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
                className="flex-1 bg-white/95 dark:bg-gray-800/60 border border-white/80 dark:border-white/5 shadow-sm"
              />
              <Button 
                onClick={handleSpeakLatestMessage}
                variant="outline"
                disabled={isLoading || messages.length <= 1}
                className="min-w-[44px] bg-white/95 dark:bg-gray-800/60 border border-white/80 dark:border-white/5"
                title={isSpeaking ? "הפסק הקראה" : "הקרא הודעה אחרונה"}
              >
                {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Button
                onClick={handleFileUpload}
                variant="outline"
                className="min-w-[44px] bg-white/95 dark:bg-gray-800/60 border border-white/80 dark:border-white/5"
                title="העלה קובץ"
              >
                <Upload className="h-4 w-4" />
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileSelected}
                  accept=".pdf,.txt,.docx"
                />
              </Button>
              <Button 
                onClick={handleSendMessage} 
                disabled={isLoading || !input.trim()}
                className="bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 shadow-sm"
              >
                <Send className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
                שלח
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/95 dark:bg-gray-900/30 border border-white/80 dark:border-white/5 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">שאלות נפוצות</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start text-right hover:bg-blue-50/50 dark:hover:bg-blue-900/10 bg-white/95 dark:bg-gray-800/30 border border-white/80 dark:border-white/5" 
              onClick={() => handleQuickQuestion('איך מגדירים רמות תמיכה והתנגדות?')}
              disabled={isLoading}
            >
              <ArrowUpRight className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
              איך מגדירים רמות תמיכה והתנגדות?
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start text-right hover:bg-blue-50/50 dark:hover:bg-blue-900/10 bg-white/95 dark:bg-gray-800/30 border border-white/80 dark:border-white/5" 
              onClick={() => handleQuickQuestion('הסבר על שלושת רמות הרווח (Profit Targets) ואיך להגדיר אותן')}
              disabled={isLoading}
            >
              <ArrowUpRight className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
              הסבר על 3 רמות רווח (Profit Targets)
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start text-right hover:bg-blue-50/50 dark:hover:bg-blue-900/10 bg-white/95 dark:bg-gray-800/30 border border-white/80 dark:border-white/5" 
              onClick={() => handleQuickQuestion('מהו Dollar Cost Averaging (DCA) ואיך משתמשים בו?')}
              disabled={isLoading}
            >
              <ArrowUpRight className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
              Dollar Cost Averaging (DCA)
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start text-right hover:bg-blue-50/50 dark:hover:bg-blue-900/10 bg-white/95 dark:bg-gray-800/30 border border-white/80 dark:border-white/5" 
              onClick={() => handleQuickQuestion('הסבר על שיטת Martingale ומתי להשתמש בה')}
              disabled={isLoading}
            >
              <ArrowUpRight className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0" />
              שיטת Martingale
            </Button>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-blue-900/5 dark:to-indigo-900/5 border border-blue-100/50 dark:border-blue-900/10 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-blue-600 dark:text-blue-300">טיפים מקצועיים למערכת AlgoTouch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-blue-600 dark:text-blue-300">1. הגדרת 3 רמות רווח</h3>
              <p className="text-sm text-blue-600/90 dark:text-blue-300/90">
                הגדרת 3 רמות רווח מאפשרת לנעול רווחים מוקדם ובטוח (Target 1) ועדיין לאפשר לחלק מהפוזיציה להמשיך לרוץ לרווחים גבוהים יותר בעסקאות מוצלחות במיוחד (Target 3).
              </p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-blue-600 dark:text-blue-300">2. בחירת טיים-פריים</h3>
              <p className="text-sm text-blue-600/90 dark:text-blue-300/90">
                בחר את טיים-פריים בהתאם לגודל החשבון: חשבונות קטנים עד $5,000 - עבוד עם נרות של 30 שניות עד 5 דקות; חשבונות גדולים יותר יכולים להשתמש בנרות של עד 60 דקות.
              </p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-blue-600 dark:text-blue-300">3. ניהול סיכונים</h3>
              <p className="text-sm text-blue-600/90 dark:text-blue-300/90">
                הגבל את הסיכון לעסקה בודדת ל-0.25%-1% מסך התיק. השתמש בפקודות Stop Loss, BE Stop, ו-Trailing Stop לניהול סיכונים אופטימלי.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChatBot;
