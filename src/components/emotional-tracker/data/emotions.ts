
// Define the emotion data structure
export interface Emotion {
  id: string;
  label: string;
  color: string;
}

// Export the emotions array for use throughout the application
export const emotions: Emotion[] = [
  { id: 'confidence', label: 'ביטחון', color: 'bg-green-500' },
  { id: 'doubt', label: 'ספק', color: 'bg-blue-500' },
  { id: 'fear', label: 'פחד', color: 'bg-red-500' },
  { id: 'greed', label: 'חמדנות', color: 'bg-orange-500' },
  { id: 'frustration', label: 'תסכול', color: 'bg-purple-500' },
];
