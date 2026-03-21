import api from './homieshub';

// Wagers
export const getWagers = (params) => api.get('/wagers', { params });
export const getWager = (id) => api.get(`/wagers/${id}`);
export const createWager = (data) => api.post('/wagers', data);
export const joinWager = (id, data) => api.post(`/wagers/${id}/join`, data);
export const resolveWager = (id, data) => api.post(`/wagers/${id}/resolve`, data);
export const confirmWagerOutcome = (id, data) => api.post(`/wagers/${id}/confirm`, data);
export const disputeWager = (id, data) => api.post(`/wagers/${id}/dispute`, data);
export const castVote = (id, data) => api.post(`/wagers/${id}/vote`, data);
export const getUserWagers = (username) => api.get(`/wagers/user/${username}`);

// Events (multi-outcome)
export const getWagerEvents = () => api.get('/wagers/events');
export const getWagerEvent = (id) => api.get(`/wagers/events/${id}`);
export const createWagerEvent = (data) => api.post('/wagers/events', data);

// Admin
export const adminResolveWager = (id, data) => api.post(`/wagers/admin/resolve`, { wagerId: id, ...data });
export const getAdminWagerStats = () => api.get('/wagers/admin/stats');
