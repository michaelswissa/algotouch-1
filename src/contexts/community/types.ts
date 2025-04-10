
import { 
  Badge, 
  UserBadge, 
  Post, 
  ReputationData,
  CourseProgress,
  UserStreak
} from '@/lib/community';

export interface CommunityContextType {
  // Reputation data
  userPoints: number;
  userLevel: number;
  
  // Badge data
  userBadges: UserBadge[];
  allBadges: Badge[];
  
  // Posts data
  posts: Post[];
  loading: boolean;

  // Course progress data
  courseProgress: CourseProgress[];

  // User streak data
  userStreak: UserStreak | null;

  // Actions
  refreshData: () => Promise<void>;
  handlePostCreated: () => Promise<void>;
  handlePostLiked: (postId: string) => Promise<void>;
  checkAndAwardDailyLogin: () => Promise<void>;
  recordLessonWatched: (courseId: string, lessonId: string) => Promise<boolean>;
  completeModule: (courseId: string, moduleId: string) => Promise<boolean>;
  completeCourse: (courseId: string) => Promise<boolean>;
}
