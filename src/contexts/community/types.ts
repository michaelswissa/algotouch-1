
import { 
  Badge, 
  UserBadge, 
  Post, 
  Comment,
  Tag,
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
  
  // Tags data
  tags: Tag[];

  // Course progress data
  courseProgress: CourseProgress[];

  // User streak data
  userStreak: UserStreak | null;

  // Active post for viewing/commenting
  activePostId: string | null;
  activePost: Post | null;
  activePostComments: Comment[];
  
  // Actions
  refreshData: () => Promise<void>;
  handlePostCreated: () => Promise<void>;
  handlePostLiked: (postId: string) => Promise<void>;
  checkAndAwardDailyLogin: () => Promise<void>;
  recordLessonWatched: (courseId: string, lessonId: string) => Promise<boolean>;
  completeModule: (courseId: string, moduleId: string) => Promise<boolean>;
  completeCourse: (courseId: string) => Promise<boolean>;
  
  // New actions for comments, media, and post details
  setActivePostId: (postId: string | null) => void;
  handleCommentAdded: (postId: string) => Promise<void>;
  addNewComment: (postId: string, content: string, parentId?: string) => Promise<string | null>;
  uploadMedia: (file: File) => Promise<string | null>;
}
