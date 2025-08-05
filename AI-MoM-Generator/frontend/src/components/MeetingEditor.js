import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, 
  Save, 
  Send, 
  RefreshCw, 
  Download,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { apiClient, pollMeetingStatus, formatDate, formatDuration, getStatusColor } from '../api';
import MomForm from './MomForm';

const MeetingEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    loadMeeting();
  }, [id]);

  useEffect(() => {
    // Poll for updates if meeting is processing
    if (meeting && meeting.status === 'processing') {
      pollMeetingStatus(meeting.id, handleMeetingUpdate);
    }
  }, [meeting?.status]);

  const loadMeeting = async () => {
    try {
      setLoading(true);
      const meetingData = await apiClient.getMeeting(id);
      setMeeting(meetingData);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error loading meeting:', error);
      toast.error('Failed to load meeting');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleMeetingUpdate = (updatedMeeting) => {
    if (updatedMeeting.error) {
      toast.error(`Processing error: ${updatedMeeting.error}`);
      return;
    }

    setMeeting(updatedMeeting);

    // Show notification when processing completes
    if (updatedMeeting.status === 'draft_ready' && meeting?.status === 'processing') {
      toast.success('Meeting processing completed! You can now review and edit the minutes.');
    } else if (updatedMeeting.status === 'error') {
      toast.error('Meeting processing failed. Please try again.');
    }
  };

  const handleFormChange = (updatedData) => {
    setMeeting(prev => ({ ...prev, ...updatedData }));
    setHasUnsavedChanges(true);
  };

  const handleSaveDraft = async (formData) => {
    try {
      setSaving(true);
      const updatedMeeting = await apiClient.updateMeeting(id, formData);
      setMeeting(updatedMeeting);
      setHasUnsavedChanges(false);
      toast.success('Draft saved successfully');
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handleSendMeeting = async (sendData) => {
    try {
      setSending(true);
      
      // Save any pending changes first
      if (hasUnsavedChanges) {
        await apiClient.updateMeeting(id, sendData.updateData);
      }

      const result = await apiClient.sendMeeting(id, {
        recipients: sendData.recipients,
        custom_message: sendData.custom_message
      });

      setMeeting(prev => ({ ...prev, status: 'sent', email_sent_at: result.sent_at }));
      setHasUnsavedChanges(false);
      
      toast.success(`Meeting minutes sent to ${result.recipients.length} recipients`);
    } catch (error) {
      console.error('Error sending meeting:', error);
      toast.error('Failed to send meeting minutes');
    } finally {
      setSending(false);
    }
  };

  const handleRegenerate = async () => {
    if (!window.confirm('Are you sure you want to regenerate the meeting content? This will overwrite your current changes.')) {
      return;
    }

    try {
      setRegenerating(true);
      const updatedMeeting = await apiClient.regenerateMeeting(id);
      setMeeting(updatedMeeting);
      setHasUnsavedChanges(false);
      toast.success('Meeting content regenerated successfully');
    } catch (error) {
      console.error('Error regenerating meeting:', error);
      toast.error('Failed to regenerate meeting content');
    } finally {
      setRegenerating(false);
    }
  };

  const handleExport = async (format = 'json') => {
    try {
      const exportData = await apiClient.exportMeeting(id, format);
      
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meeting-${id}-minutes.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === 'html') {
        const blob = new Blob([exportData.html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meeting-${id}-minutes.html`;
        a.click();
        URL.revokeObjectURL(url);
      }
      
      toast.success(`Meeting exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting meeting:', error);
      toast.error('Failed to export meeting');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading meeting...</p>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-error-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Meeting Not Found</h2>
          <p className="text-gray-600 mb-4">The requested meeting could not be found.</p>
          <button
            onClick={() => navigate('/')}
            className="btn btn-primary"
          >
            Back to Meetings
          </button>
        </div>
      </div>
    );
  }

  const isProcessing = meeting.status === 'processing';
  const isDraftReady = meeting.status === 'draft_ready';
  const isSent = meeting.status === 'sent';
  const hasError = meeting.status === 'error';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Meetings
              </button>
              
              <div className="h-6 border-l border-gray-300"></div>
              
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {meeting.title || 'Meeting Minutes'}
                </h1>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
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
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Status Badge */}
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(meeting.status)}`}>
                {meeting.status === 'processing' && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {meeting.status === 'draft_ready' && <CheckCircle className="h-4 w-4 mr-1" />}
                {meeting.status === 'sent' && <CheckCircle className="h-4 w-4 mr-1" />}
                {meeting.status === 'error' && <AlertCircle className="h-4 w-4 mr-1" />}
                {meeting.status.replace('_', ' ').toUpperCase()}
              </span>

              {/* Action Buttons */}
              {isDraftReady && (
                <>
                  <button
                    onClick={() => handleExport('json')}
                    className="btn btn-secondary"
                    title="Export as JSON"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="btn btn-secondary"
                    title="Regenerate with AI"
                  >
                    {regenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isProcessing && (
          <div className="bg-warning-50 border border-warning-200 rounded-lg p-6 mb-8">
            <div className="flex items-center">
              <Loader2 className="h-6 w-6 text-warning-600 animate-spin mr-3" />
              <div>
                <h3 className="text-lg font-medium text-warning-800">Processing Meeting Recording</h3>
                <p className="text-warning-700 mt-1">
                  We're transcribing the audio, identifying speakers, and generating meeting minutes. 
                  This usually takes 3-5 minutes depending on the recording length.
                </p>
                {meeting.processing_stage && (
                  <p className="text-sm text-warning-600 mt-2">
                    Current stage: {meeting.processing_stage}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {hasError && (
          <div className="bg-error-50 border border-error-200 rounded-lg p-6 mb-8">
            <div className="flex items-center">
              <AlertCircle className="h-6 w-6 text-error-600 mr-3" />
              <div>
                <h3 className="text-lg font-medium text-error-800">Processing Error</h3>
                <p className="text-error-700 mt-1">
                  {meeting.error_message || 'An error occurred while processing the meeting recording.'}
                </p>
                <button
                  onClick={loadMeeting}
                  className="mt-3 btn btn-error"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {isSent && (
          <div className="bg-success-50 border border-success-200 rounded-lg p-6 mb-8">
            <div className="flex items-center">
              <CheckCircle className="h-6 w-6 text-success-600 mr-3" />
              <div>
                <h3 className="text-lg font-medium text-success-800">Meeting Minutes Sent</h3>
                <p className="text-success-700 mt-1">
                  The meeting minutes were successfully sent to all participants on {formatDate(meeting.email_sent_at)}.
                </p>
                {meeting.email_recipients && (
                  <p className="text-sm text-success-600 mt-2">
                    Recipients: {meeting.email_recipients.join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {(isDraftReady || isSent) && (
          <MomForm
            meeting={meeting}
            onSave={handleSaveDraft}
            onSend={handleSendMeeting}
            onChange={handleFormChange}
            saving={saving}
            sending={sending}
            hasUnsavedChanges={hasUnsavedChanges}
            readOnly={isSent}
          />
        )}
      </div>
    </div>
  );
};

export default MeetingEditor;
