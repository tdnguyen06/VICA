export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface HealthStatus {
  status: string;
  app: string;
  version: string;
  timestamp: string;
  environment: string;
}

export interface CulturalHeritagePoint {
  id: string;
  name: string;
  category: string;
  location: {
    province: string;
    latitude: number;
    longitude: number;
  };
  description: string;
}

