
import React from 'react';

interface ReportTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const ReportTabs = ({ activeTab, onTabChange }: ReportTabsProps) => {
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'detailed', label: 'Detailed' },
    { id: 'win-vs-loss', label: 'Win vs Loss' },
    { id: 'drawdown', label: 'Drawdown' },
    { id: 'compare', label: 'Compare' },
    { id: 'tag-breakdown', label: 'Tag Breakdown' },
    { id: 'advanced', label: 'Advanced' },
  ];

  return (
    <div className="border-b border-gray-200 mb-6">
      <div className="flex overflow-x-auto hide-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tradervue-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ReportTabs;
