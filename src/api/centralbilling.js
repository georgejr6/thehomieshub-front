import axios from 'axios';

const cbApi = axios.create({ baseURL: 'https://backend.viddy.cloud/api' });

cbApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default cbApi;
