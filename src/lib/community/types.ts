
// Types related to the community system

// Activity types
export const ACTIVITY_TYPES = {
  NEW_POST: 'NEW_POST',
  POST_LIKED: 'POST_LIKED',
  COMMENT_ADDED: 'COMMENT_ADDED',
  DAILY_LOGIN: 'DAILY_LOGIN',
  PROFILE_COMPLETED: 'PROFILE_COMPLETED',
  LESSON_WATCHED: 'LESSON_WATCHED',
  MODULE_COMPLETED: 'MODULE_COMPLETED',
  COURSE_COMPLETED: 'COURSE_COMPLETED',
} as const;

// Define the type for activity types
export type ActivityType = keyof typeof ACTIVITY_TYPES;

// Points for each activity type
export const ACTIVITY_POINTS = {
  [ACTIVITY_TYPES.NEW_POST]: 10,
  [ACTIVITY_TYPES.POST_LIKED]: 5,
  [ACTIVITY_TYPES.COMMENT_ADDED]: 3,
  [ACTIVITY_TYPES.DAILY_LOGIN]: 2,
  [ACTIVITY_TYPES.PROFILE_COMPLETED]: 15,
  [ACTIVITY_TYPES.LESSON_WATCHED]: 5,
  [ACTIVITY_TYPES.MODULE_COMPLETED]: 20,
  [ACTIVITY_TYPES.COURSE_COMPLETED]: 50,
};

// Interface for reputation data
export interface ReputationData {
  points: number;
  level: number;
  userId: string;
}

// Interface for badge data
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  points_required: number;
}

// Interface for user badges
export interface UserBadge {
  id: string;
  badge: Badge;
  earned_at: string;
}

// Interface for post data
export interface Post {
  id: string;
  user_id: string;
  title: string;
  content: string;
  likes: number;
  comments: number;
  created_at: string;
  updated_at: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  };
}

// Interface for course progress data
export interface CourseProgress {
  courseId: string;
  userId: string;
  lessonsWatched: string[]; // Array of lesson IDs
  modulesCompleted: string[]; // Array of module IDs
  isCompleted: boolean;
  lastWatched: string;
  created_at: string;
  updated_at: string;
}
