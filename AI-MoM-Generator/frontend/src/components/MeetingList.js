import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  Users, 
  Eye,
  Trash2,
  RefreshCw,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { apiClient, formatDate, formatDuration, getStatusColor, getStatusIcon } from '../api';

const MeetingList = () => {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadFileId, setUploadFileId] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadMeetings();
  }, [statusFilter]);

  const loadMeetings = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) {
        params.status_filter = statusFilter;
      }
      
      const response = await apiClient.getMeetings(params);
      setMeetings(response.meetings || []);
    } catch (error) {
      console.error('Error loading meetings:', error);
      toast.error('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const handleManualUpload = async () => {
    if (!uploadFileId.trim()) {
      toast.error('Please enter a Google Drive file ID');
      return;
    }

    try {
      setUploading(true);
      const result = await apiClient.manualProcessFile(uploadFileId.trim());
      
      toast.success('Processing started! The meeting will appear in the list once ready.');
      setShowUploadDialog(false);
      setUploadFileId('');
      
      // Refresh the list
      loadMeetings();
      
      // Navigate to the new meeting if we have an ID
      if (result.meeting_id) {
        setTimeout(() => {
          navigate(`/meeting/${result.meeting_id}`);
        }, 1000);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Failed to process file. Please check the file ID and try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMeeting = async (meetingId, meetingTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${meetingTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiClient.deleteMeeting(meetingId);
      toast.success('Meeting deleted successfully');
      loadMeetings();
    } catch (error) {
      console.error('Error deleting meeting:', error);
      toast.error('Failed to delete meeting');
    }
  };

  const filteredMeetings = meetings.filter(meeting => {
    const matchesSearch = !searchTerm || 
      meeting.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meeting.attendees?.some(attendee => 
        attendee.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    return matchesSearch;
  });

  const getStatusStats = () => {
    const stats = {
      total: meetings.length,
      processing: meetings.filter(m => m.status === 'processing').length,
      draft_ready: meetings.filter(m => m.status === 'draft_ready').length,
      sent: meetings.filter(m => m.status === 'sent').length,
      error: meetings.filter(m => m.status === 'error').length
    };
    return stats;
  };

  const stats = getStatusStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading meetings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Meeting Minutes</h1>
              <p className="text-sm text-gray-600">
                Manage your AI-generated meeting minutes
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowUploadDialog(true)}
                className="btn btn-primary"
              >
                <Upload className="h-4 w-4 mr-2" />
                Process Recording
              </button>
              
              <button
                onClick={loadMeetings}
                className="btn btn-secondary"
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-warning-600">Processing</p>
                <p className="text-2xl font-bold text-warning-900">{stats.processing}</p>
              </div>
              <Loader2 className="h-8 w-8 text-warning-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-primary-600">Draft Ready</p>
                <p className="text-2xl font-bold text-primary-900">{stats.draft_ready}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-primary-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-success-600">Sent</p>
                <p className="text-2xl font-bold text-success-900">{stats.sent}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-error-600">Errors</p>
                <p className="text-2xl font-bold text-error-900">{stats.error}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-error-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search meetings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">All Status</option>
                  <option value="processing">Processing</option>
                  <option value="draft_ready">Draft Ready</option>
                  <option value="sent">Sent</option>
                  <option value="error">Error</option>
                </select>
              </div>
            </div>
            
            <div className="text-sm text-gray-600">
              Showing {filteredMeetings.length} of {meetings.length} meetings
            </div>
          </div>
        </div>

        {/* Meetings List */}
        {filteredMeetings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {meetings.length === 0 ? 'No meetings yet' : 'No meetings match your search'}
              </h3>
              <p className="text-gray-600 mb-6">
                {meetings.length === 0 
                  ? 'Upload your first meeting recording to get started with AI-generated minutes.'
                  : 'Try adjusting your search terms or filters.'
                }
              </p>
              {meetings.length === 0 && (
                <button
                  onClick={() => setShowUploadDialog(true)}
                  className="btn btn-primary"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Process Your First Recording
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMeetings.map((meeting) => (
              <div key={meeting.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {meeting.title || 'Untitled Meeting'}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(meeting.status)}`}>
                          <span className="mr-1">{getStatusIcon(meeting.status)}</span>
                          {meeting.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-6 text-sm text-gray-600 mb-3">
                        {meeting.date && (
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {formatDate(meeting.date)}
                          </span>
                        )}
                        {meeting.duration && (
                          <span>{formatDuration(meeting.duration)}</span>
                        )}
                        {meeting.attendees && meeting.attendees.length > 0 && (
                          <span className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {meeting.attendees.length} attendees
                          </span>
                        )}
                      </div>
                      
                      {meeting.discussion_summary && (
                        <p className="text-gray-700 text-sm line-clamp-2 mb-3">
                          {meeting.discussion_summary}
                        </p>
                      )}
                      
                      {meeting.action_items && meeting.action_items.length > 0 && (
                        <div className="flex items-center text-sm text-gray-600">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          {meeting.action_items.length} action item{meeting.action_items.length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => navigate(`/meeting/${meeting.id}`)}
                        className="btn btn-secondary btn-sm"
                        title="View/Edit Meeting"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDeleteMeeting(meeting.id, meeting.title)}
                        className="btn btn-error btn-sm"
                        title="Delete Meeting"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  {meeting.status === 'processing' && meeting.processing_stage && (
                    <div className="mt-4 p-3 bg-warning-50 border border-warning-200 rounded-md">
                      <div className="flex items-center">
                        <Loader2 className="h-4 w-4 text-warning-600 animate-spin mr-2" />
                        <span className="text-sm text-warning-800">
                          Processing: {meeting.processing_stage}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {meeting.status === 'error' && meeting.error_message && (
                    <div className="mt-4 p-3 bg-error-50 border border-error-200 rounded-md">
                      <div className="flex items-center">
                        <AlertCircle className="h-4 w-4 text-error-600 mr-2" />
                        <span className="text-sm text-error-800">
                          Error: {meeting.error_message}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      {showUploadDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Process Meeting Recording</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Google Drive File ID
                  </label>
                  <input
                    type="text"
                    value={uploadFileId}
                    onChange={(e) => setUploadFileId(e.target.value)}
                    placeholder="Enter the Google Drive file ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    You can find the file ID in the Google Drive URL: drive.google.com/file/d/<strong>FILE_ID</strong>/view
                  </p>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <h4 className="text-sm font-medium text-blue-800 mb-1">How it works:</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Upload your meeting recording to Google Drive</li>
                    <li>• Copy the file ID from the sharing URL</li>
                    <li>• Paste it here to start AI processing</li>
                    <li>• Review and edit the generated minutes</li>
                  </ul>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowUploadDialog(false);
                    setUploadFileId('');
                  }}
                  className="btn btn-secondary"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleManualUpload}
                  disabled={uploading || !uploadFileId.trim()}
                  className="btn btn-primary"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Start Processing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingList;
