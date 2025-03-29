
import React from 'react';
import Layout from '@/components/Layout';
import EmotionalTracker from '@/components/EmotionalTracker';
import TradeJournalHeader from '@/components/trade-journal/TradeJournalHeader';
import TradeNotes from '@/components/trade-journal/TradeNotes';
import { tradeNotes } from '@/components/trade-journal/mockData';

const TradeJournalPage = () => {
  const handleNewNote = () => {
    // Future functionality for creating a new note
  };

  return (
    <Layout>
      <div className="tradervue-container py-6">
        <TradeJournalHeader onNewNote={handleNewNote} />
        
        {/* Horizontal scrollable notes section */}
        <TradeNotes notes={tradeNotes} />
        
        {/* Main content area - Only the emotional analysis tab remains */}
        <div className="space-y-6 animate-fade-in">
          <EmotionalTracker />
        </div>
      </div>
    </Layout>
  );
};

export default TradeJournalPage;
