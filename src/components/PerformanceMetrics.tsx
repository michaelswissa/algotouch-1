
import React from 'react';
import { Card } from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

const PerformanceMetrics = () => {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="space-y-1">
            <span className="text-xs text-gray-400">סוג רווח/הפסד</span>
            <Select defaultValue="gross">
              <SelectTrigger className="w-28 py-1 h-auto text-sm bg-gray-800 border-gray-700">
                <SelectValue placeholder="סוג רווח/הפסד" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="gross">ברוטו</SelectItem>
                <SelectItem value="net">נטו</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-gray-400">מצב תצוגה</span>
            <Select defaultValue="dollar">
              <SelectTrigger className="w-28 py-1 h-auto text-sm bg-gray-800 border-gray-700">
                <SelectValue placeholder="מצב תצוגה" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="dollar">ערך ₪</SelectItem>
                <SelectItem value="percent">ערך %</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-gray-400">סוג דוח</span>
            <Select defaultValue="aggregate">
              <SelectTrigger className="w-36 py-1 h-auto text-sm bg-gray-800 border-gray-700">
                <SelectValue placeholder="סוג דוח" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="aggregate">רווח/הפסד מצטבר</SelectItem>
                <SelectItem value="daily">רווח/הפסד יומי</SelectItem>
                <SelectItem value="cumulative">רווח/הפסד מצטבר</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-4 relative overflow-hidden bg-gray-800 border-gray-700">
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-16">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#374151"
                  strokeWidth="12"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#0299FF"
                  strokeWidth="12"
                  strokeDasharray="251.2"
                  strokeDashoffset="100"
                  transform="rotate(-90 50 50)"
                />
              </svg>
            </div>
            <div>
              <h4 className="text-xl font-bold">1.24</h4>
              <p className="text-sm text-gray-400">מכפיל רווח</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 relative overflow-hidden bg-gray-800 border-gray-700">
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-16">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#374151"
                  strokeWidth="12"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#0299FF"
                  strokeWidth="12"
                  strokeDasharray="251.2"
                  strokeDashoffset="125"
                  transform="rotate(-90 50 50)"
                />
              </svg>
            </div>
            <div>
              <h4 className="text-xl font-bold">1.24</h4>
              <p className="text-sm text-gray-400">עסקאות רווחיות לעומת הפסדיות</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 relative overflow-hidden bg-gray-800 border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <h4 className="text-xl font-bold">1.24</h4>
              <div className="flex items-center gap-4 mt-1">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-tradervue-green">₪34.82</span>
                  <div className="w-20 h-1 bg-gray-600 rounded-full overflow-hidden">
                    <div className="h-full bg-tradervue-green w-[70%]"></div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-red-500">₪51.32</span>
                  <div className="w-20 h-1 bg-gray-600 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 w-[30%]"></div>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-400 mt-1">עסקה רווחית לעומת מפסידה בממוצע</p>
            </div>
          </div>
        </Card>

        <Card className="md:col-span-3 p-4 relative overflow-hidden bg-gray-800 border-gray-700">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-300">רווח/הפסד</h4>
            <h3 className="text-xl font-bold text-gray-100">₪344,456.78</h3>
          </div>
          <div className="mt-2 h-14 w-full">
            <svg viewBox="0 0 300 60" className="w-full h-full">
              <path
                d="M0,30 C20,40 40,50 60,35 C80,20 100,5 120,15 C140,25 160,45 180,35 C200,25 220,15 240,25 C260,35 280,45 300,30"
                fill="none"
                stroke="#0299FF"
                strokeWidth="2"
              />
            </svg>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PerformanceMetrics;
