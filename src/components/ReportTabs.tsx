
import React from 'react';

interface ReportTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const ReportTabs = ({ activeTab, onTabChange }: ReportTabsProps) => {
  const tabs = [
    { id: 'overview', label: 'סקירה כללית' },
    { id: 'detailed', label: 'מפורט' },
    { id: 'win-vs-loss', label: 'רווח לעומת הפסד' },
    { id: 'drawdown', label: 'ירידה' },
    { id: 'compare', label: 'השוואה' },
    { id: 'tag-breakdown', label: 'פילוח תגיות' },
    { id: 'advanced', label: 'מתקדם' },
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
