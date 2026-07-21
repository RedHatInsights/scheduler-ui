import axios, { AxiosInstance } from 'axios';

/**
 * Create an axios instance configured for the Scheduler API.
 *
 * In development: Uses `/api/scheduler/v1` which is proxied through HCC by `fec dev`.
 * In production: Proxied through the HCC API gateway.
 *
 * Authentication is handled automatically by insights-chrome.
 */
export function createSchedulerClient(): AxiosInstance {
  const client = axios.create({
    baseURL: '/api/scheduler/v1',
    timeout: 30_000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Auth token is injected by insights-chrome proxy, no manual interceptor needed
  return client;
}

export const schedulerClient = createSchedulerClient();
