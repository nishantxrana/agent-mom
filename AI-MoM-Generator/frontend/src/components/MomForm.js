import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Send, 
  Plus, 
  Trash2, 
  User, 
  Mail, 
  Calendar,
  Clock,
  Target,
  CheckSquare,
  MessageSquare,
  Loader2
} from 'lucide-react';

const MomForm = ({ 
  meeting, 
  onSave, 
  onSend, 
  onChange, 
  saving, 
  sending, 
  hasUnsavedChanges,
  readOnly = false 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    attendees: [],
    agenda_items: [],
    discussion_summary: '',
    decisions_made: [],
    action_items: []
  });
  const [recipients, setRecipients] = useState([]);
  const [customMessage, setCustomMessage] = useState('');
  const [showSendDialog, setShowSendDialog] = useState(false);

  useEffect(() => {
    if (meeting) {
      setFormData({
        title: meeting.title || '',
        attendees: meeting.attendees || [],
        agenda_items: meeting.agenda_items || [],
        discussion_summary: meeting.discussion_summary || '',
        decisions_made: meeting.decisions_made || [],
        action_items: meeting.action_items || []
      });

      // Set suggested recipients
      if (meeting.suggested_recipients) {
        setRecipients(meeting.suggested_recipients);
      }
    }
  }, [meeting]);

  const handleFieldChange = (field, value) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onChange(updatedData);
  };

  const handleArrayFieldChange = (field, index, subField, value) => {
    const updatedArray = [...formData[field]];
    updatedArray[index] = { ...updatedArray[index], [subField]: value };
    handleFieldChange(field, updatedArray);
  };

  const addArrayItem = (field, defaultItem) => {
    const updatedArray = [...formData[field], defaultItem];
    handleFieldChange(field, updatedArray);
  };

  const removeArrayItem = (field, index) => {
    const updatedArray = formData[field].filter((_, i) => i !== index);
    handleFieldChange(field, updatedArray);
  };

  const handleSave = () => {
    onSave(formData);
  };

  const handleSendClick = () => {
    setShowSendDialog(true);
  };

  const handleSendConfirm = () => {
    onSend({
      updateData: formData,
      recipients,
      custom_message: customMessage
    });
    setShowSendDialog(false);
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'bg-error-100 text-error-800 border-error-200',
      medium: 'bg-warning-100 text-warning-800 border-warning-200',
      low: 'bg-success-100 text-success-800 border-success-200'
    };
    return colors[priority?.toLowerCase()] || colors.medium;
  };

  return (
    <div className="space-y-8">
      {/* Meeting Title */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center mb-4">
          <MessageSquare className="h-5 w-5 text-gray-400 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Meeting Details</h2>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Meeting Title
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            disabled={readOnly}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="Enter meeting title"
          />
        </div>
      </div>

      {/* Attendees */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <User className="h-5 w-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Attendees</h2>
          </div>
          {!readOnly && (
            <button
              onClick={() => addArrayItem('attendees', { name: '', role: '', email: '' })}
              className="btn btn-secondary btn-sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Attendee
            </button>
          )}
        </div>

        <div className="space-y-3">
          {formData.attendees.map((attendee, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={attendee.name || ''}
                  onChange={(e) => handleArrayFieldChange('attendees', index, 'name', e.target.value)}
                  disabled={readOnly}
                  placeholder="Name"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                />
                <input
                  type="text"
                  value={attendee.role || ''}
                  onChange={(e) => handleArrayFieldChange('attendees', index, 'role', e.target.value)}
                  disabled={readOnly}
                  placeholder="Role/Title"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                />
                <input
                  type="email"
                  value={attendee.email || ''}
                  onChange={(e) => handleArrayFieldChange('attendees', index, 'email', e.target.value)}
                  disabled={readOnly}
                  placeholder="Email"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                />
              </div>
              {!readOnly && (
                <button
                  onClick={() => removeArrayItem('attendees', index)}
                  className="text-error-600 hover:text-error-800 p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Discussion Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center mb-4">
          <MessageSquare className="h-5 w-5 text-gray-400 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Discussion Summary</h2>
        </div>
        
        <textarea
          value={formData.discussion_summary}
          onChange={(e) => handleFieldChange('discussion_summary', e.target.value)}
          disabled={readOnly}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
          placeholder="Summarize the main discussion points, key topics covered, and overall meeting flow..."
        />
      </div>

      {/* Agenda Items */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Agenda Items</h2>
          </div>
          {!readOnly && (
            <button
              onClick={() => addArrayItem('agenda_items', { title: '', description: '', timestamp: '', duration_minutes: 0 })}
              className="btn btn-secondary btn-sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </button>
          )}
        </div>

        <div className="space-y-4">
          {formData.agenda_items.map((item, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <input
                  type="text"
                  value={item.title || ''}
                  onChange={(e) => handleArrayFieldChange('agenda_items', index, 'title', e.target.value)}
                  disabled={readOnly}
                  placeholder="Agenda item title"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                />
                {!readOnly && (
                  <button
                    onClick={() => removeArrayItem('agenda_items', index)}
                    className="ml-3 text-error-600 hover:text-error-800 p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <textarea
                value={item.description || ''}
                onChange={(e) => handleArrayFieldChange('agenda_items', index, 'description', e.target.value)}
                disabled={readOnly}
                rows={2}
                placeholder="Description"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
              />
              <div className="flex items-center space-x-3 mt-3">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-gray-400 mr-1" />
                  <input
                    type="text"
                    value={item.timestamp || ''}
                    onChange={(e) => handleArrayFieldChange('agenda_items', index, 'timestamp', e.target.value)}
                    disabled={readOnly}
                    placeholder="MM:SS"
                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100"
                  />
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 mr-2">Duration:</span>
                  <input
                    type="number"
                    value={item.duration_minutes || 0}
                    onChange={(e) => handleArrayFieldChange('agenda_items', index, 'duration_minutes', parseInt(e.target.value) || 0)}
                    disabled={readOnly}
                    min="0"
                    className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100"
                  />
                  <span className="text-sm text-gray-500 ml-1">min</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Decisions Made */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <CheckSquare className="h-5 w-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Decisions Made</h2>
          </div>
          {!readOnly && (
            <button
              onClick={() => addArrayItem('decisions_made', { decision: '', rationale: '', impact: '', timestamp: '' })}
              className="btn btn-secondary btn-sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Decision
            </button>
          )}
        </div>

        <div className="space-y-4">
          {formData.decisions_made.map((decision, index) => (
            <div key={index} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <input
                  type="text"
                  value={decision.decision || ''}
                  onChange={(e) => handleArrayFieldChange('decisions_made', index, 'decision', e.target.value)}
                  disabled={readOnly}
                  placeholder="Decision made"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                />
                {!readOnly && (
                  <button
                    onClick={() => removeArrayItem('decisions_made', index)}
                    className="ml-3 text-error-600 hover:text-error-800 p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <textarea
                  value={decision.rationale || ''}
                  onChange={(e) => handleArrayFieldChange('decisions_made', index, 'rationale', e.target.value)}
                  disabled={readOnly}
                  rows={2}
                  placeholder="Rationale"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                />
                <textarea
                  value={decision.impact || ''}
                  onChange={(e) => handleArrayFieldChange('decisions_made', index, 'impact', e.target.value)}
                  disabled={readOnly}
                  rows={2}
                  placeholder="Expected impact"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Items */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Target className="h-5 w-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Action Items</h2>
          </div>
          {!readOnly && (
            <button
              onClick={() => addArrayItem('action_items', { task: '', owner: '', deadline: '', priority: 'Medium', status: 'Assigned' })}
              className="btn btn-secondary btn-sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Action Item
            </button>
          )}
        </div>

        <div className="space-y-4">
          {formData.action_items.map((item, index) => (
            <div key={index} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <textarea
                  value={item.task || ''}
                  onChange={(e) => handleArrayFieldChange('action_items', index, 'task', e.target.value)}
                  disabled={readOnly}
                  rows={2}
                  placeholder="Action item description"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                />
                {!readOnly && (
                  <button
                    onClick={() => removeArrayItem('action_items', index)}
                    className="ml-3 text-error-600 hover:text-error-800 p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  value={item.owner || ''}
                  onChange={(e) => handleArrayFieldChange('action_items', index, 'owner', e.target.value)}
                  disabled={readOnly}
                  placeholder="Owner"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                />
                <input
                  type="date"
                  value={item.deadline || ''}
                  onChange={(e) => handleArrayFieldChange('action_items', index, 'deadline', e.target.value)}
                  disabled={readOnly}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                />
                <select
                  value={item.priority || 'Medium'}
                  onChange={(e) => handleArrayFieldChange('action_items', index, 'priority', e.target.value)}
                  disabled={readOnly}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
                <div className={`px-3 py-2 rounded-md text-sm font-medium text-center ${getPriorityColor(item.priority)}`}>
                  {item.priority || 'Medium'} Priority
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      {!readOnly && (
        <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center space-x-4">
            {hasUnsavedChanges && (
              <span className="text-sm text-warning-600 flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                You have unsaved changes
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
              className="btn btn-secondary"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Draft
            </button>
            
            <button
              onClick={handleSendClick}
              disabled={sending}
              className="btn btn-primary"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send MoM to Everyone
            </button>
          </div>
        </div>
      )}

      {/* Send Dialog */}
      {showSendDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Send Meeting Minutes</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipients
                  </label>
                  <textarea
                    value={recipients.join(', ')}
                    onChange={(e) => setRecipients(e.target.value.split(',').map(email => email.trim()).filter(Boolean))}
                    rows={3}
                    placeholder="Enter email addresses separated by commas"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {recipients.length} recipient{recipients.length !== 1 ? 's' : ''}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Message (Optional)
                  </label>
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    rows={3}
                    placeholder="Add a personal message to include with the meeting minutes"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowSendDialog(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendConfirm}
                  disabled={recipients.length === 0}
                  className="btn btn-primary"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MomForm;
