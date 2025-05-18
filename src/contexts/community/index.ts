
import { useContext, createContext } from 'react';

// Define types for community context
export interface CourseProgress {
  courseId: string;
  userId: string;
  lessonsWatched: string[];
  modulesCompleted: string[];
  isCompleted: boolean;
  lastWatched?: string;
  id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  earnedAt: Date;
  badge?: {
    name: string;
    description: string;
    imageUrl: string;
  };
}

export interface CommunityContextType {
  courseProgress?: CourseProgress[];
  userBadges?: UserBadge[];
  recordLessonWatched?: (courseId: string, lessonId: string) => Promise<boolean>;
  completeModule?: (courseId: string, moduleId: string) => Promise<boolean>;
  completeCourse?: (courseId: string) => Promise<boolean>;
}

// Create context with default values
const CommunityContext = createContext<CommunityContextType>({});

// Create hook for using community context
export function useCommunity(): CommunityContextType {
  return useContext(CommunityContext);
}

export default CommunityContext;
