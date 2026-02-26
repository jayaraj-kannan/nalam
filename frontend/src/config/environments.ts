export interface EnvironmentConfig {
  apiUrl: string;
  region: string;
  userPoolId: string;
  userPoolClientId: string;
  identityPoolId?: string;
  environment: 'dev' | 'staging' | 'prod';
}

const environments: Record<string, EnvironmentConfig> = {
  dev: {
    apiUrl: process.env.VITE_API_URL || 'https://api-dev.healthcare-monitoring.com',
    region: process.env.VITE_AWS_REGION || 'us-east-1',
    userPoolId: process.env.VITE_USER_POOL_ID || '',
    userPoolClientId: process.env.VITE_USER_POOL_CLIENT_ID || '',
    environment: 'dev',
  },
  staging: {
    apiUrl: process.env.VITE_API_URL || 'https://api-staging.healthcare-monitoring.com',
    region: process.env.VITE_AWS_REGION || 'us-east-1',
    userPoolId: process.env.VITE_USER_POOL_ID || '',
    userPoolClientId: process.env.VITE_USER_POOL_CLIENT_ID || '',
    environment: 'staging',
  },
  prod: {
    apiUrl: process.env.VITE_API_URL || 'https://api.healthcare-monitoring.com',
    region: process.env.VITE_AWS_REGION || 'us-east-1',
    userPoolId: process.env.VITE_USER_POOL_ID || '',
    userPoolClientId: process.env.VITE_USER_POOL_CLIENT_ID || '',
    environment: 'prod',
  },
};

const currentEnv = (process.env.VITE_ENVIRONMENT || 'dev') as keyof typeof environments;

export const config: EnvironmentConfig = environments[currentEnv];
