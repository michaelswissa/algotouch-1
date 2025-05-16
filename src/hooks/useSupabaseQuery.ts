
import { useQuery, useMutation, QueryKey, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { PostgrestError } from '@supabase/supabase-js';
import { toast } from 'sonner';

type SupabaseQueryFn<T> = () => Promise<T>;
type SupabaseMutationFn<T, V> = (variables: V) => Promise<T>;

export function useSupabaseQuery<T>(
  queryKey: QueryKey,
  queryFn: SupabaseQueryFn<T>,
  options?: Omit<UseQueryOptions<T, PostgrestError, T>, 'queryKey' | 'queryFn'> & {
    showErrorToast?: boolean;
    errorMessage?: string;
  }
) {
  const { showErrorToast = true, errorMessage = 'שגיאה בטעינת נתונים', ...queryOptions } = options || {};
  
  return useQuery<T, PostgrestError>({
    queryKey,
    queryFn: async () => {
      try {
        return await queryFn();
      } catch (error: any) {
        console.error(`Error fetching data for ${queryKey}:`, error);
        if (showErrorToast) {
          toast.error(errorMessage);
        }
        throw error;
      }
    },
    ...queryOptions
  });
}

export function useSupabaseMutation<T, V = unknown>(
  mutationFn: SupabaseMutationFn<T, V>,
  options?: Omit<UseMutationOptions<T, PostgrestError, V>, 'mutationFn'> & {
    showSuccessToast?: boolean;
    showErrorToast?: boolean;
    successMessage?: string;
    errorMessage?: string;
  }
) {
  const { 
    showSuccessToast = true, 
    showErrorToast = true, 
    successMessage = 'הפעולה הושלמה בהצלחה',
    errorMessage = 'שגיאה בביצוע הפעולה',
    ...mutationOptions 
  } = options || {};
  
  return useMutation<T, PostgrestError, V>({
    mutationFn: async (variables) => {
      try {
        return await mutationFn(variables);
      } catch (error: any) {
        console.error('Mutation error:', error);
        if (showErrorToast) {
          toast.error(errorMessage);
        }
        throw error;
      }
    },
    onSuccess: (data, variables, context) => {
      if (showSuccessToast) {
        toast.success(successMessage);
      }
      if (mutationOptions.onSuccess) {
        mutationOptions.onSuccess(data, variables, context);
      }
    },
    ...mutationOptions
  });
}
