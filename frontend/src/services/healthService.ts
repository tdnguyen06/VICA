import { apiClient } from './apiClient';
import type { ApiResponse, HealthStatus } from '../types';

export const healthService = {
  checkHealth: async (): Promise<HealthStatus> => {
    const response = await apiClient.get<ApiResponse<HealthStatus>>('/health');
    return response.data.data;
  },
};
