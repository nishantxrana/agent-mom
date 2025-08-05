import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8002';

function SimpleApp() {
  const [meetings, setMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Fetch meetings
  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/meetings/`);
      setMeetings(response.data.meetings || []);
    } catch (error) {
      console.error('Error fetching meetings:', error);
      setProcessingStatus('❌ Error fetching meetings');
      setTimeout(() => setProcessingStatus(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Delete meeting
  const deleteMeeting = async (meetingId) => {
    try {
      setLoading(true);
      await axios.delete(`${API_BASE}/api/meetings/${meetingId}`);
      setProcessingStatus('✅ Meeting deleted successfully');
      setDeleteConfirm(null);
      if (selectedMeeting?.id === meetingId) {
        setSelectedMeeting(null);
      }
      fetchMeetings();
      setTimeout(() => setProcessingStatus(''), 3000);
    } catch (error) {
      console.error('Error deleting meeting:', error);
      setProcessingStatus('❌ Error deleting meeting');
      setTimeout(() => setProcessingStatus(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Create demo meeting
  const createDemoMeeting = async () => {
    try {
      setLoading(true);
      setProcessingStatus('🤖 Creating demo meeting with AI processing...');
      const response = await axios.post(`${API_BASE}/api/demo/create-meeting`);
      console.log('Demo meeting created:', response.data);
      setProcessingStatus('✅ Demo meeting created successfully!');
      setTimeout(() => setProcessingStatus(''), 3000);
      fetchMeetings();
    } catch (error) {
      console.error('Error creating demo meeting:', error);
      setProcessingStatus('❌ Error creating demo meeting');
      setTimeout(() => setProcessingStatus(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Test AI processing with file ID
  const testAIProcessing = async () => {
    const fileId = prompt('Enter Google Drive file ID to process (or leave empty for demo):');
    if (fileId === null) return;
    
    const testFileId = fileId || 'demo-test-file-123';
    
    try {
      setLoading(true);
      setProcessingStatus(`🤖 Testing AI processing with file: ${testFileId}...`);
      
      const response = await axios.post(`${API_BASE}/webhook/process/${testFileId}`);
      console.log('Processing response:', response.data);
      
      if (response.data.status === 'processing') {
        setProcessingStatus('🔄 AI processing started! Check meeting list for updates.');
        setTimeout(() => {
          fetchMeetings();
          setProcessingStatus('');
        }, 5000);
      } else {
        setProcessingStatus(`Status: ${response.data.status}`);
        setTimeout(() => setProcessingStatus(''), 3000);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      setProcessingStatus('❌ Processing failed (likely invalid file ID or missing Google credentials)');
      setTimeout(() => setProcessingStatus(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Get meeting details
  const getMeetingDetails = async (meetingId) => {
    try {
      const response = await axios.get(`${API_BASE}/api/meetings/${meetingId}`);
      setSelectedMeeting(response.data);
    } catch (error) {
      console.error('Error fetching meeting details:', error);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '10px',
        padding: '30px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <h1 style={{ 
          margin: '0 0 10px 0',
          color: '#2c3e50',
          fontSize: '2.5em',
          fontWeight: 'bold'
        }}>
          🤖 AI Meeting Minutes Generator
        </h1>
        <p style={{ 
          color: '#7f8c8d',
          fontSize: '1.1em',
          margin: '0 0 20px 0'
        }}>
          Automatically transcribe, analyze, and generate professional meeting minutes using AI
        </p>
        
        <div style={{ marginBottom: '20px' }}>
          <button 
            onClick={createDemoMeeting} 
            disabled={loading}
            style={{
              padding: '12px 24px',
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginRight: '15px',
              fontSize: '16px',
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#2980b9'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#3498db'}
          >
            {loading ? '⏳ Creating...' : '🎯 Create Demo Meeting'}
          </button>
          
          <button 
            onClick={testAIProcessing}
            disabled={loading}
            style={{
              padding: '12px 24px',
              backgroundColor: '#27ae60',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginRight: '15px',
              fontSize: '16px',
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#229954'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#27ae60'}
          >
            🤖 Test AI Processing
          </button>
          
          <button 
            onClick={fetchMeetings}
            style={{
              padding: '12px 24px',
              backgroundColor: '#95a5a6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#7f8c8d'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#95a5a6'}
          >
            🔄 Refresh Meetings
          </button>
        </div>

        {processingStatus && (
          <div style={{
            padding: '15px',
            backgroundColor: processingStatus.includes('❌') ? '#f8d7da' : processingStatus.includes('✅') ? '#d4edda' : '#d1ecf1',
            border: `1px solid ${processingStatus.includes('❌') ? '#f5c6cb' : processingStatus.includes('✅') ? '#c3e6cb' : '#bee5eb'}`,
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '16px',
            fontWeight: 'bold'
          }}>
            {processingStatus}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>
        {/* Meetings List */}
        <div style={{ flex: 1 }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '10px',
            padding: '20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ 
              margin: '0 0 20px 0',
              color: '#2c3e50',
              fontSize: '1.8em'
            }}>
              📋 Meetings ({meetings.length})
            </h2>
            
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '4px solid #f3f3f3',
                  borderTop: '4px solid #3498db',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 20px'
                }}></div>
                <p>Loading meetings...</p>
              </div>
            ) : meetings.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px',
                color: '#7f8c8d'
              }}>
                <h3>No meetings found</h3>
                <p>Create a demo meeting to get started!</p>
              </div>
            ) : (
              <div>
                {meetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    style={{
                      border: selectedMeeting?.id === meeting.id ? '2px solid #3498db' : '1px solid #e0e0e0',
                      borderRadius: '10px',
                      padding: '20px',
                      marginBottom: '15px',
                      cursor: 'pointer',
                      backgroundColor: selectedMeeting?.id === meeting.id ? '#f8f9ff' : '#ffffff',
                      transition: 'all 0.3s ease',
                      position: 'relative'
                    }}
                    onClick={() => getMeetingDetails(meeting.id)}
                    onMouseOver={(e) => {
                      if (selectedMeeting?.id !== meeting.id) {
                        e.currentTarget.style.backgroundColor = '#f8f9fa';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (selectedMeeting?.id !== meeting.id) {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ 
                          margin: '0 0 10px 0',
                          color: '#2c3e50',
                          fontSize: '1.3em'
                        }}>
                          {meeting.title}
                        </h3>
                        
                        <div style={{ marginBottom: '10px' }}>
                          <span style={{ 
                            padding: '4px 12px', 
                            borderRadius: '20px', 
                            fontSize: '12px',
                            fontWeight: 'bold',
                            backgroundColor: 
                              meeting.status === 'draft_ready' ? '#d4edda' : 
                              meeting.status === 'processing' ? '#fff3cd' : 
                              meeting.status === 'error' ? '#f8d7da' : '#e2e3e5',
                            color:
                              meeting.status === 'draft_ready' ? '#155724' : 
                              meeting.status === 'processing' ? '#856404' : 
                              meeting.status === 'error' ? '#721c24' : '#6c757d'
                          }}>
                            {meeting.status === 'draft_ready' ? '✅ AI Analysis Complete' : 
                             meeting.status === 'processing' ? '🔄 AI Processing...' :
                             meeting.status === 'error' ? '❌ Processing Failed' : meeting.status}
                          </span>
                        </div>
                        
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                          gap: '10px',
                          fontSize: '14px',
                          color: '#7f8c8d'
                        }}>
                          <div>⏱️ Duration: {meeting.duration || 'Unknown'} min</div>
                          <div>👥 Attendees: {meeting.attendees?.length || 0}</div>
                          <div>🎯 Actions: {meeting.action_items?.length || 0}</div>
                          <div>✅ Decisions: {meeting.decisions_made?.length || 0}</div>
                        </div>
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(meeting.id);
                        }}
                        style={{
                          padding: '8px 12px',
                          backgroundColor: '#e74c3c',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          marginLeft: '15px',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#c0392b'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#e74c3c'}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Meeting Details */}
        <div style={{ flex: 2 }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '10px',
            padding: '20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            minHeight: '600px'
          }}>
            {selectedMeeting ? (
              <div>
                <div style={{ 
                  borderBottom: '2px solid #ecf0f1',
                  paddingBottom: '20px',
                  marginBottom: '25px'
                }}>
                  <h2 style={{ 
                    margin: '0 0 10px 0',
                    color: '#2c3e50',
                    fontSize: '2em'
                  }}>
                    📝 {selectedMeeting.title}
                  </h2>
                  
                  <div style={{ 
                    padding: '15px', 
                    backgroundColor: 
                      selectedMeeting.status === 'draft_ready' ? '#d4edda' :
                      selectedMeeting.status === 'processing' ? '#fff3cd' :
                      selectedMeeting.status === 'error' ? '#f8d7da' : '#e2e3e5',
                    borderRadius: '8px',
                    border: `2px solid ${
                      selectedMeeting.status === 'draft_ready' ? '#c3e6cb' :
                      selectedMeeting.status === 'processing' ? '#ffeaa7' :
                      selectedMeeting.status === 'error' ? '#f5c6cb' : '#d6d8db'
                    }`
                  }}>
                    <strong style={{ fontSize: '16px' }}>🤖 AI Processing Status:</strong>
                    <div style={{ marginTop: '8px', fontSize: '15px' }}>
                      {selectedMeeting.status === 'draft_ready' ? 
                        '✅ AI analysis complete - Meeting minutes are ready for review and distribution' :
                        selectedMeeting.status === 'processing' ? 
                        '🔄 AI is currently analyzing the meeting recording. This may take a few minutes...' :
                        selectedMeeting.status === 'error' ? 
                        '❌ AI processing encountered an error. Please try reprocessing the file.' :
                        `Status: ${selectedMeeting.status}`
                      }
                    </div>
                    {selectedMeeting.error_message && (
                      <div style={{ 
                        color: '#dc3545', 
                        fontSize: '14px', 
                        marginTop: '10px',
                        padding: '10px',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                        borderRadius: '5px'
                      }}>
                        <strong>Error Details:</strong> {selectedMeeting.error_message}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Attendees Section */}
                <div style={{ marginBottom: '25px' }}>
                  <h3 style={{ 
                    color: '#2c3e50',
                    fontSize: '1.5em',
                    marginBottom: '15px',
                    borderLeft: '4px solid #3498db',
                    paddingLeft: '15px'
                  }}>
                    👥 Meeting Attendees
                  </h3>
                  
                  {selectedMeeting.attendees?.length > 0 ? (
                    <div>
                      {/* Check if attendees have generic names */}
                      {selectedMeeting.attendees.some(att => att.name.startsWith('Speaker_')) && (
                        <div style={{
                          backgroundColor: '#fff3cd',
                          border: '1px solid #ffeaa7',
                          borderRadius: '8px',
                          padding: '15px',
                          marginBottom: '15px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '20px', marginRight: '10px' }}>💡</span>
                            <strong style={{ color: '#856404' }}>Tip for Better Results</strong>
                          </div>
                          <p style={{ margin: '0', color: '#856404', fontSize: '14px' }}>
                            The AI detected speakers but couldn't identify their names. For better results in future meetings:
                          </p>
                          <ul style={{ margin: '10px 0 0 20px', color: '#856404', fontSize: '14px' }}>
                            <li>Have participants introduce themselves at the beginning</li>
                            <li>Use name tags or clear introductions</li>
                            <li>Mention names when addressing each other</li>
                          </ul>
                        </div>
                      )}
                      
                      <div style={{ display: 'grid', gap: '15px' }}>
                        {selectedMeeting.attendees.map((attendee, index) => (
                          <div key={index} style={{ 
                            padding: '15px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '8px',
                            border: '1px solid #e9ecef'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                              <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                backgroundColor: attendee.name.startsWith('Speaker_') ? '#95a5a6' : '#3498db',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: 'bold',
                                marginRight: '15px'
                              }}>
                                {attendee.name.startsWith('Speaker_') ? '👤' : attendee.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <strong style={{ fontSize: '16px', color: '#2c3e50' }}>
                                  {attendee.name}
                                </strong>
                                <div style={{ color: '#7f8c8d', fontSize: '14px' }}>
                                  {attendee.role || 'Participant'}
                                </div>
                              </div>
                            </div>
                            {attendee.email && (
                              <div style={{ color: '#7f8c8d', fontSize: '14px', marginLeft: '55px' }}>
                                📧 {attendee.email}
                              </div>
                            )}
                            {attendee.key_contributions && (
                              <div style={{ 
                                marginTop: '10px',
                                marginLeft: '55px',
                                fontSize: '14px',
                                color: '#5a6c7d',
                                fontStyle: 'italic'
                              }}>
                                💬 {attendee.key_contributions}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ 
                      textAlign: 'center',
                      padding: '30px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      color: '#7f8c8d'
                    }}>
                      <p style={{ fontSize: '16px', margin: '0' }}>
                        No attendees identified yet. AI analysis may still be in progress.
                      </p>
                    </div>
                  )}
                </div>

                {/* Agenda Items Section */}
                <div style={{ marginBottom: '25px' }}>
                  <h3 style={{ 
                    color: '#2c3e50',
                    fontSize: '1.5em',
                    marginBottom: '15px',
                    borderLeft: '4px solid #e67e22',
                    paddingLeft: '15px'
                  }}>
                    📋 Meeting Agenda
                  </h3>
                  {selectedMeeting.agenda_items?.length > 0 ? (
                    selectedMeeting.agenda_items.map((item, index) => (
                      <div key={index} style={{ 
                        padding: '15px',
                        backgroundColor: '#fef9e7',
                        marginBottom: '12px',
                        borderRadius: '8px',
                        borderLeft: '4px solid #f39c12'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <strong style={{ fontSize: '16px', color: '#2c3e50' }}>{item.title}</strong>
                          <span style={{ 
                            backgroundColor: '#f39c12',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}>
                            {item.timestamp}
                          </span>
                        </div>
                        <p style={{ margin: '0', color: '#7f8c8d', fontSize: '14px' }}>
                          {item.description}
                        </p>
                        {item.outcome && (
                          <div style={{ 
                            marginTop: '10px',
                            padding: '8px',
                            backgroundColor: 'rgba(243, 156, 18, 0.1)',
                            borderRadius: '5px',
                            fontSize: '14px'
                          }}>
                            <strong>Outcome:</strong> {item.outcome}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div style={{ 
                      textAlign: 'center',
                      padding: '30px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      color: '#7f8c8d'
                    }}>
                      <p>No agenda items identified yet</p>
                    </div>
                  )}
                </div>

                {/* Discussion Summary */}
                <div style={{ marginBottom: '25px' }}>
                  <h3 style={{ 
                    color: '#2c3e50',
                    fontSize: '1.5em',
                    marginBottom: '15px',
                    borderLeft: '4px solid #9b59b6',
                    paddingLeft: '15px'
                  }}>
                    💬 Discussion Summary
                  </h3>
                  <div style={{ 
                    padding: '20px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <p style={{ 
                      margin: '0',
                      lineHeight: '1.6',
                      fontSize: '15px',
                      color: '#2c3e50'
                    }}>
                      {selectedMeeting.discussion_summary || 'No summary generated yet. AI analysis may still be in progress.'}
                    </p>
                  </div>
                </div>

                {/* Decisions Made */}
                <div style={{ marginBottom: '25px' }}>
                  <h3 style={{ 
                    color: '#2c3e50',
                    fontSize: '1.5em',
                    marginBottom: '15px',
                    borderLeft: '4px solid #27ae60',
                    paddingLeft: '15px'
                  }}>
                    ✅ Decisions Made
                  </h3>
                  {selectedMeeting.decisions_made?.length > 0 ? (
                    selectedMeeting.decisions_made.map((decision, index) => (
                      <div key={index} style={{ 
                        padding: '20px',
                        backgroundColor: '#eafaf1',
                        marginBottom: '15px',
                        borderRadius: '8px',
                        borderLeft: '4px solid #27ae60'
                      }}>
                        <div style={{ marginBottom: '10px' }}>
                          <strong style={{ fontSize: '16px', color: '#2c3e50' }}>
                            {decision.decision}
                          </strong>
                        </div>
                        <div style={{ marginBottom: '8px', fontSize: '14px', color: '#7f8c8d' }}>
                          <strong>Rationale:</strong> {decision.rationale}
                        </div>
                        {decision.impact && (
                          <div style={{ fontSize: '14px', color: '#7f8c8d' }}>
                            <strong>Impact:</strong> {decision.impact}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div style={{ 
                      textAlign: 'center',
                      padding: '30px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      color: '#7f8c8d'
                    }}>
                      <p>No decisions identified yet</p>
                    </div>
                  )}
                </div>

                {/* Action Items */}
                <div style={{ marginBottom: '25px' }}>
                  <h3 style={{ 
                    color: '#2c3e50',
                    fontSize: '1.5em',
                    marginBottom: '15px',
                    borderLeft: '4px solid #e74c3c',
                    paddingLeft: '15px'
                  }}>
                    🎯 Action Items
                  </h3>
                  {selectedMeeting.action_items?.length > 0 ? (
                    selectedMeeting.action_items.map((item, index) => (
                      <div key={index} style={{ 
                        padding: '20px',
                        backgroundColor: '#fdf2f2',
                        marginBottom: '15px',
                        borderRadius: '8px',
                        borderLeft: `4px solid ${
                          item.priority === 'High' ? '#e74c3c' : 
                          item.priority === 'Medium' ? '#f39c12' : '#27ae60'
                        }`
                      }}>
                        <div style={{ marginBottom: '12px' }}>
                          <strong style={{ fontSize: '16px', color: '#2c3e50' }}>
                            {item.task}
                          </strong>
                        </div>
                        <div style={{ 
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                          gap: '10px',
                          fontSize: '14px',
                          color: '#7f8c8d'
                        }}>
                          <div><strong>Owner:</strong> {item.owner}</div>
                          <div><strong>Deadline:</strong> {item.deadline}</div>
                          <div>
                            <strong>Priority:</strong> 
                            <span style={{
                              marginLeft: '5px',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              backgroundColor: 
                                item.priority === 'High' ? '#e74c3c' :
                                item.priority === 'Medium' ? '#f39c12' : '#27ae60',
                              color: 'white'
                            }}>
                              {item.priority}
                            </span>
                          </div>
                        </div>
                        {item.success_criteria && (
                          <div style={{ 
                            marginTop: '10px',
                            fontSize: '14px',
                            color: '#7f8c8d'
                          }}>
                            <strong>Success Criteria:</strong> {item.success_criteria}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div style={{ 
                      textAlign: 'center',
                      padding: '30px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      color: '#7f8c8d'
                    }}>
                      <p>No action items identified yet</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ 
                  marginTop: '30px',
                  padding: '20px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <button
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#17a2b8',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      marginRight: '15px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    📧 Send Email Summary
                  </button>
                  <button
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    📄 Export PDF
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '60px 20px',
                color: '#7f8c8d'
              }}>
                <div style={{ fontSize: '4em', marginBottom: '20px' }}>🤖</div>
                <h3 style={{ color: '#2c3e50', marginBottom: '15px' }}>
                  AI-Powered Meeting Analysis
                </h3>
                <p style={{ fontSize: '16px', marginBottom: '20px' }}>
                  Select a meeting to see AI-extracted insights and professional meeting minutes
                </p>
                <div style={{ 
                  backgroundColor: '#f8f9fa',
                  padding: '20px',
                  borderRadius: '8px',
                  textAlign: 'left',
                  display: 'inline-block',
                  maxWidth: '400px'
                }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>AI Features:</h4>
                  <ul style={{ margin: '0', paddingLeft: '20px', lineHeight: '1.8' }}>
                    <li>👥 Automatic attendee identification</li>
                    <li>📋 Agenda item extraction with timestamps</li>
                    <li>💬 Intelligent discussion summarization</li>
                    <li>✅ Decision tracking with rationale</li>
                    <li>🎯 Action item generation with owners</li>
                    <li>📧 Professional email formatting</li>
                  </ul>
                </div>
                <div style={{ marginTop: '30px' }}>
                  <button
                    onClick={createDemoMeeting}
                    style={{
                      padding: '15px 30px',
                      backgroundColor: '#3498db',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                    }}
                  >
                    🎯 Create Demo Meeting to See AI in Action
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '10px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            maxWidth: '400px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '3em', marginBottom: '15px' }}>🗑️</div>
            <h3 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>
              Delete Meeting?
            </h3>
            <p style={{ margin: '0 0 25px 0', color: '#7f8c8d' }}>
              Are you sure you want to delete this meeting? This action cannot be undone.
            </p>
            <div>
              <button
                onClick={() => deleteMeeting(deleteConfirm)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  marginRight: '10px',
                  fontWeight: 'bold'
                }}
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#95a5a6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default SimpleApp;
