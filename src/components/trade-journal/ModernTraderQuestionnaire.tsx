
import React from 'react';
import QuestionnaireForm from './questionnaire/QuestionnaireForm';

interface ModernTraderQuestionnaireProps {
  onSubmit: (data: any) => void;
}

const ModernTraderQuestionnaire: React.FC<ModernTraderQuestionnaireProps> = ({ onSubmit }) => {
  return (
    <div className="w-full mx-auto" dir="rtl">
      <QuestionnaireForm onSubmit={onSubmit} />
    </div>
  );
};

export default ModernTraderQuestionnaire;
