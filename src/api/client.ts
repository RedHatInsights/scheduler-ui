import axios from 'axios';
import { SchedulerClient } from '@redhat-cloud-services/scheduler-client/api';
import {
  authInterceptor,
  interceptor401,
  interceptor500,
  errorInterceptor,
} from '@redhat-cloud-services/frontend-components-utilities/interceptors';

const axiosInstance = axios.create();
axiosInstance.interceptors.request.use(authInterceptor);
axiosInstance.interceptors.response.use(undefined, interceptor401);
axiosInstance.interceptors.response.use(undefined, interceptor500);
axiosInstance.interceptors.response.use(undefined, errorInterceptor);

export const schedulerClient = SchedulerClient('/api/scheduler/v1', { axios: axiosInstance });
