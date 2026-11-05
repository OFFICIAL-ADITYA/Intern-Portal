import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const tlApi = axios.create({
  baseURL: `${API_BASE_URL}/api/teamleader`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

export const getRequestsForReview = async () => {
  const response = await tlApi.get('/requests-for-review');
  return response.data;
};

export const getMyInterns = async (params = {}) => {
  const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''));
  const qs = query.toString() ? `?${query.toString()}` : '';
  const response = await tlApi.get(`/interns${qs}`);
  return response.data;
};

export const getAssignedInternById = async (id) => {
  const response = await tlApi.get(`/interns/${id}`);
  return response.data;
};

export const updateAssignedIntern = async (id, payload) => {
  try {
    const response = await tlApi.patch(`/interns/${id}`, payload);
    return response.data;
  } catch (error) {
    const data = error.response?.data;
    const validationMessage = data?.errors?.map(({ msg }) => msg).join(' ');
    throw new Error(validationMessage || data?.message || 'Unable to update intern.', { cause: error });
  }
};

export const reviewRequest = async (id, action, rejectionReason) => {
  const payload = action === 'reject' ? { action, rejectionReason } : { action };
  const response = await tlApi.patch(`/requests/${id}/review`, payload);
  return response.data;
};

export const createIntern = async (payload) => {
  try {
    const response = await tlApi.post('/create-intern', payload);
    return response.data;
  } catch (error) {
    const data = error.response?.data;
    const validationMessage = data?.errors?.map(({ msg }) => msg).join(' ');
    throw new Error(validationMessage || data?.message || 'Unable to create intern.', { cause: error });
  }
};

export const getUpcomingCompletions = async () => {
  const response = await tlApi.get('/upcoming-completions');
  return response.data;
};
