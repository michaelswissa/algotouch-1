
import { 
  Post, 
  Comment,
  Tag,
  UserBadge
} from '@/lib/community/types';

export interface CommunityContextType {
  posts: Post[];
  tags: Tag[];
  badges: UserBadge[];
  reputationPoints: number;
  loading: boolean;
  activePostId: string | null;
  activePost: Post | null;
  activePostComments: Comment[];
  
  // Post functions
  addNewPost: (title: string, content: string, mediaUrls?: string[], tagIds?: string[], newTags?: string[]) => Promise<boolean>;
  handlePostLiked: (postId: string) => Promise<void>;
  
  // Comment functions
  addNewComment: (postId: string, content: string, parentCommentId?: string) => Promise<string | null>;
  handleCommentAdded: (postId: string) => Promise<void>;
  setActivePostId: (postId: string | null) => void;
  
  // Media upload
  createPost: {
    uploadMedia: (file: File) => Promise<string | null>;
  };
  
  // Data refresh functions
  refreshData: {
    fetchPosts: () => Promise<void>;
    fetchTags: () => Promise<void>;
    fetchUserBadges: () => void;
    fetchUserReputation: () => void;
  };
}
