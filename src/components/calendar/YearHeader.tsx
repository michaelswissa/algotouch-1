
import React from 'react';

interface YearHeaderProps {
  year: number;
}

export const YearHeader = ({ year }: YearHeaderProps) => {
  return (
    <h2 className="text-2xl font-bold mb-4 text-center">{year} - תצוגת שנה</h2>
  );
};
