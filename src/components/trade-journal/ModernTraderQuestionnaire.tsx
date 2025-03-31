
import React from 'react';
import QuestionnaireForm from './questionnaire/QuestionnaireForm';

interface ModernTraderQuestionnaireProps {
  onSubmit: (data: any) => void;
}

const ModernTraderQuestionnaire: React.FC<ModernTraderQuestionnaireProps> = ({ onSubmit }) => {
  return (
    <div className="w-full max-w-4xl mx-auto" dir="rtl">
      <QuestionnaireForm onSubmit={onSubmit} />
    </div>
  );
};

export default ModernTraderQuestionnaire;
