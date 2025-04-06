
import { BaseDatabase } from './base';
import { CommunityDatabase } from './community';
import { CourseDatabase } from './courses';
import { PaymentsDatabase } from './payments';
import { ProfilesDatabase } from './profiles';
import { FunctionsDatabase } from './functions';

// Merge all database types together
export type ExtendedDatabase = BaseDatabase & 
  Omit<CommunityDatabase, 'public'> & 
  Omit<CourseDatabase, 'public'> & 
  Omit<PaymentsDatabase, 'public'> & 
  Omit<ProfilesDatabase, 'public'> & 
  Omit<FunctionsDatabase, 'public'> & {
    public: {
      Tables: BaseDatabase['public']['Tables'] &
        CommunityDatabase['public']['Tables'] &
        CourseDatabase['public']['Tables'] &
        PaymentsDatabase['public']['Tables'] &
        ProfilesDatabase['public']['Tables'];
      Views: BaseDatabase['public']['Views'];
      Functions: BaseDatabase['public']['Functions'] & FunctionsDatabase['public']['Functions'];
      Enums: BaseDatabase['public']['Enums'];
      CompositeTypes: BaseDatabase['public']['CompositeTypes'];
    }
  };

export * from './base';
export * from './community';
export * from './courses';
export * from './payments';
export * from './profiles';
export * from './functions';
