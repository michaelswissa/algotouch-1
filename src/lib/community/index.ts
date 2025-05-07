
// Export all community-related services and types
export * from './badges-service';
export * from './posts-service';
export * from './comments-service';
export * from './course-service';
export * from './tags-service';
export * from './storage-service';
export * from './utils';

// Re-export types but handle the duplicate ACTIVITY_TYPES
export * from './types';

// Explicitly re-export the reputation-service items to avoid name conflicts
// with types.ts that also exports ACTIVITY_TYPES
export {
  initUserReputation,
  getUserReputation,
  getUserReputationPoints,
  awardPoints
} from './reputation-service';

// Re-export ACTIVITY_TYPES from reputation-service
// and not from types.ts (this resolves the ambiguity)
export { ACTIVITY_TYPES, POINTS_MAP } from './reputation-service';
