import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8002',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API functions
export const apiClient = {
  // Authentication
  async login() {
    const response = await api.get('/auth/login');
    return response.data;
  },

  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Meetings
  async getMeetings(params = {}) {
    const response = await api.get('/api/meetings', { params });
    return response.data;
  },

  async getMeeting(meetingId) {
    const response = await api.get(`/api/meetings/${meetingId}`);
    return response.data;
  },

  async updateMeeting(meetingId, updateData) {
    const response = await api.put(`/api/meetings/${meetingId}`, updateData);
    return response.data;
  },

  async sendMeeting(meetingId, sendData = {}) {
    const response = await api.post(`/api/meetings/${meetingId}/send`, sendData);
    return response.data;
  },

  async regenerateMeeting(meetingId) {
    const response = await api.post(`/api/meetings/${meetingId}/regenerate`);
    return response.data;
  },

  async deleteMeeting(meetingId) {
    const response = await api.delete(`/api/meetings/${meetingId}`);
    return response.data;
  },

  async exportMeeting(meetingId, format = 'json') {
    const response = await api.get(`/api/meetings/${meetingId}/export`, {
      params: { format }
    });
    return response.data;
  },

  // Webhook
  async manualProcessFile(fileId) {
    const response = await api.post(`/webhook/process/${fileId}`);
    return response.data;
  },

  async getProcessingStatus(meetingId) {
    const response = await api.get(`/webhook/status/${meetingId}`);
    return response.data;
  },

  // System
  async getHealthCheck() {
    const response = await api.get('/health');
    return response.data;
  },

  async getAdminStats() {
    const response = await api.get('/admin/stats');
    return response.data;
  }
};

// Helper functions for specific operations
export const fetchDraft = async (meetingId) => {
  try {
    const meeting = await apiClient.getMeeting(meetingId);
    return meeting;
  } catch (error) {
    console.error('Error fetching draft:', error);
    throw error;
  }
};

export const sendMom = async (meetingId, momData) => {
  try {
    // First update the meeting with any changes
    if (momData.updateData) {
      await apiClient.updateMeeting(meetingId, momData.updateData);
    }

    // Then send the meeting
    const result = await apiClient.sendMeeting(meetingId, {
      recipients: momData.recipients,
      custom_message: momData.custom_message
    });

    return result;
  } catch (error) {
    console.error('Error sending MoM:', error);
    throw error;
  }
};

export const pollMeetingStatus = async (meetingId, onUpdate, maxAttempts = 60) => {
  let attempts = 0;
  
  const poll = async () => {
    try {
      const meeting = await apiClient.getMeeting(meetingId);
      onUpdate(meeting);
      
      // Stop polling if meeting is ready or failed
      if (meeting.status === 'draft_ready' || meeting.status === 'sent' || meeting.status === 'error') {
        return meeting;
      }
      
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error('Polling timeout - meeting processing took too long');
      }
      
      // Poll every 5 seconds
      setTimeout(poll, 5000);
    } catch (error) {
      console.error('Error polling meeting status:', error);
      onUpdate({ error: error.message });
    }
  };
  
  poll();
};

// Utility functions
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return dateString;
  }
};

export const formatDuration = (minutes) => {
  if (!minutes || minutes < 1) return 'N/A';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
};

export const getStatusColor = (status) => {
  const colors = {
    processing: 'text-warning-600 bg-warning-50',
    draft_ready: 'text-primary-600 bg-primary-50',
    sent: 'text-success-600 bg-success-50',
    error: 'text-error-600 bg-error-50'
  };
  
  return colors[status] || 'text-gray-600 bg-gray-50';
};

export const getStatusIcon = (status) => {
  const icons = {
    processing: '⏳',
    draft_ready: '📝',
    sent: '✅',
    error: '❌'
  };
  
  return icons[status] || '❓';
};

export default apiClient;
