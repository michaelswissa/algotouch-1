
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Plan } from '@/types/payment';

export const usePlans = () => {
  return useQuery({
    queryKey: ['plans'],
    queryFn: async (): Promise<Plan[]> => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('price');
      
      if (error) throw error;
      return data;
    },
  });
};
