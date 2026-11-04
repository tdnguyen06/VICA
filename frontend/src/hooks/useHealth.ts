import { useQuery } from '@tanstack/react-query';
import { healthService } from '../services/healthService';

export const useHealth = () => {
  return useQuery({
    queryKey: ['health'],
    queryFn: healthService.checkHealth,
    retry: 2,
    refetchInterval: 30000,
  });
};

