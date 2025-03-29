
import React from 'react';
import EmotionTrendsChart from './charts/EmotionTrendsChart';
import EmotionDistributionChart from './charts/EmotionDistributionChart';
import EmotionOutcomeChart from './charts/EmotionOutcomeChart';

const AnalysisTab: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <EmotionTrendsChart />
      <EmotionDistributionChart />
      <EmotionOutcomeChart />
    </div>
  );
};

export default AnalysisTab;
