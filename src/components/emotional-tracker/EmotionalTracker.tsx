
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TrackTab from './TrackTab';
import AnalysisTab from './AnalysisTab';
import InsightsTab from './InsightsTab';

const EmotionalTracker: React.FC = () => {
  const [activeTab, setActiveTab] = useState('track');
  const [selectedEmotion, setSelectedEmotion] = useState('');
  
  return (
    <div className="w-full space-y-6" dir="rtl">
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="w-full"
      >
        <TabsList className="mb-6 bg-slate-900/30 dark:bg-white/5 p-1 rounded-lg w-full flex justify-end">
          <TabsTrigger value="insights" className="text-sm font-medium">תובנות</TabsTrigger>
          <TabsTrigger value="analysis" className="text-sm font-medium">ניתוח נתונים</TabsTrigger>
          <TabsTrigger value="track" className="text-sm font-medium">מעקב רגשי</TabsTrigger>
        </TabsList>
        
        <TabsContent value="track" className="space-y-6">
          <TrackTab 
            selectedEmotion={selectedEmotion}
            setSelectedEmotion={setSelectedEmotion}
          />
        </TabsContent>
        
        <TabsContent value="analysis" className="space-y-6">
          <AnalysisTab />
        </TabsContent>
        
        <TabsContent value="insights" className="space-y-6 rtl-fade-in">
          <InsightsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmotionalTracker;
