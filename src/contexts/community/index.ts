
import { useContext, createContext } from 'react';

// Define types for community context
interface CourseProgress {
  courseId: string;
  lessonsWatched: string[];
  modulesCompleted: string[];
  completionDate?: Date | null;
}

interface UserBadge {
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
  recordLessonWatched?: (courseId: string, lessonId: string) => Promise<void>;
  completeModule?: (courseId: string, moduleId: string) => Promise<void>;
  completeCourse?: (courseId: string) => Promise<void>;
}

// Create context with default values
const CommunityContext = createContext<CommunityContextType>({});

// Create hook for using community context
export function useCommunity(): CommunityContextType {
  return useContext(CommunityContext);
}

export default CommunityContext;
