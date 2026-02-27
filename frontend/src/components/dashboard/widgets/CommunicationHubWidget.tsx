import React, { useState, useEffect, useRef } from 'react';
import { Button, Text } from '../../accessible';
import './CommunicationHubWidget.css';

export interface CommunicationHubWidgetProps {
  primaryUserId: string;
  userId: string;
  primaryUserName: string;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  content: string;
  timestamp: Date;
  read: boolean;
  readAt?: Date;
  healthData?: HealthDataAttachment;
}

interface HealthDataAttachment {
  type: 'vitals' | 'medication' | 'appointment';
  data: any;
  summary: string;
}

/**
 * Communication Hub Widget for Secondary Users
 * Enables family messaging with read receipts and health data sharing
 * Requirements: 4.4
 */
export const CommunicationHubWidget: React.FC<CommunicationHubWidgetProps> = ({
  primaryUserId,
  userId,
  primaryUserName,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showHealthDataMenu, setShowHealthDataMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        
        // In a real implementation, this would call the API
        // const response = await fetch(`/api/v1/care-circle/messages?userId=${primaryUserId}`, {
        //   headers: { Authorization: `Bearer ${token}` }
        // });
        // const data = await response.json();
        
        // Mock data for now
        const mockMessages: Message[] = [
          {
            id: '1',
            senderId: primaryUserId,
            senderName: primaryUserName,
            recipientId: userId,
            content: 'Good morning! I took my medications.',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            read: true,
            readAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
          },
          {
            id: '2',
            senderId: userId,
            senderName: 'You',
            recipientId: primaryUserId,
            content: 'Great! How are you feeling today?',
            timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
            read: true,
            readAt: new Date(Date.now() - 0.5 * 60 * 60 * 1000),
          },
          {
            id: '3',
            senderId: primaryUserId,
            senderName: primaryUserName,
            recipientId: userId,
            content: 'Feeling good, thank you for checking!',
            timestamp: new Date(Date.now() - 30 * 60 * 1000),
            read: false,
          },
        ];

        setMessages(mockMessages);
        
        // Mark unread messages as read (simulate read receipt)
        await markMessagesAsRead(mockMessages.filter(m => m.senderId === primaryUserId && !m.read));
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
    
    // Refresh messages every 10 seconds
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [primaryUserId, userId, primaryUserName]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const markMessagesAsRead = async (unreadMessages: Message[]) => {
    if (unreadMessages.length === 0) return;

    try {
      // In a real implementation, this would call the API to mark messages as read
      // This sends a notification to the primary user that their message was read
      // await Promise.all(unreadMessages.map(msg => 
      //   fetch(`/api/v1/care-circle/messages/${msg.id}/read`, {
      //     method: 'POST',
      //     headers: { Authorization: `Bearer ${token}` }
      //   })
      // ));

      // Update local state to mark messages as read
      setMessages(prev => prev.map(msg => {
        if (unreadMessages.find(um => um.id === msg.id)) {
          return { ...msg, read: true, readAt: new Date() };
        }
        return msg;
      }));
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent, healthData?: HealthDataAttachment) => {
    e.preventDefault();
    
    if ((!newMessage.trim() && !healthData) || sending) {
      return;
    }

    try {
      setSending(true);
      
      // In a real implementation, this would call the API
      // await fetch('/api/v1/care-circle/messages', {
      //   method: 'POST',
      //   headers: { 
      //     'Content-Type': 'application/json',
      //     Authorization: `Bearer ${token}` 
      //   },
      //   body: JSON.stringify({
      //     recipientId: primaryUserId,
      //     content: newMessage,
      //     healthData,
      //   })
      // });
      
      const message: Message = {
        id: Date.now().toString(),
        senderId: userId,
        senderName: 'You',
        recipientId: primaryUserId,
        content: newMessage || (healthData ? `Shared ${healthData.type} information` : ''),
        timestamp: new Date(),
        read: false,
        healthData,
      };

      setMessages(prev => [...prev, message]);
      setNewMessage('');
      setShowHealthDataMenu(false);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleShareHealthData = async (type: 'vitals' | 'medication' | 'appointment') => {
    // In a real implementation, this would fetch the latest health data
    let healthData: HealthDataAttachment;
    
    switch (type) {
      case 'vitals':
        healthData = {
          type: 'vitals',
          data: {
            heartRate: 72,
            bloodPressure: '120/80',
            temperature: 98.6,
            oxygenSaturation: 98,
            timestamp: new Date(),
          },
          summary: 'Latest vital signs: HR 72 bpm, BP 120/80, Temp 98.6°F, SpO2 98%',
        };
        break;
      case 'medication':
        healthData = {
          type: 'medication',
          data: {
            adherenceRate: 95,
            lastTaken: new Date(Date.now() - 2 * 60 * 60 * 1000),
            upcomingDoses: 2,
          },
          summary: 'Medication adherence: 95% this week, last dose taken 2 hours ago',
        };
        break;
      case 'appointment':
        healthData = {
          type: 'appointment',
          data: {
            nextAppointment: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            provider: 'Dr. Smith',
            type: 'Cardiology Follow-up',
          },
          summary: 'Next appointment: Cardiology Follow-up with Dr. Smith in 3 days',
        };
        break;
    }

    await handleSendMessage(new Event('submit') as any, healthData);
  };

  const unreadCount = messages.filter(m => m.senderId === primaryUserId && !m.read).length;

  if (loading) {
    return (
      <div className="communication-hub communication-hub--loading">
        <Text variant="body" size="normal">Loading messages...</Text>
      </div>
    );
  }

  return (
    <div className="communication-hub">
      <div className="communication-hub__header">
        <div className="communication-hub__title">
          <Text variant="heading" size="large" weight="bold" as="h2">
            Messages with {primaryUserName}
          </Text>
          {unreadCount > 0 && (
            <span className="unread-badge">
              {unreadCount} new
            </span>
          )}
        </div>
        <Text variant="body" size="normal" className="communication-hub__subtitle">
          Stay connected with your loved one
        </Text>
      </div>

      <div className="communication-hub__messages">
        {messages.length === 0 ? (
          <div className="communication-hub__empty">
            <Text variant="body" size="normal">
              No messages yet. Start a conversation!
            </Text>
          </div>
        ) : (
          <>
            {messages.map(message => (
              <div
                key={message.id}
                className={`message ${message.senderId === userId ? 'message--sent' : 'message--received'}`}
              >
                <div className="message__bubble">
                  <div className="message__header">
                    <Text variant="body" size="normal" weight="semibold" className="message__sender">
                      {message.senderName}
                    </Text>
                    <Text variant="body" size="normal" className="message__timestamp">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </div>
                  <Text variant="body" size="normal" className="message__content">
                    {message.content}
                  </Text>
                  {message.healthData && (
                    <div className="message__health-data">
                      <div className="health-data-badge">
                        <span className="health-data-icon">
                          {message.healthData.type === 'vitals' && '❤️'}
                          {message.healthData.type === 'medication' && '💊'}
                          {message.healthData.type === 'appointment' && '📅'}
                        </span>
                        <Text variant="body" size="normal" className="health-data-summary">
                          {message.healthData.summary}
                        </Text>
                      </div>
                    </div>
                  )}
                  {message.senderId === userId && (
                    <div className="message__status">
                      {message.read ? (
                        <Text variant="body" size="normal" className="message__read">
                          ✓✓ Read {message.readAt ? `at ${message.readAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                        </Text>
                      ) : (
                        <Text variant="body" size="normal" className="message__sent-status">
                          ✓ Sent
                        </Text>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <form className="communication-hub__input" onSubmit={handleSendMessage}>
        <div className="input-actions">
          <button
            type="button"
            className="health-data-button"
            onClick={() => setShowHealthDataMenu(!showHealthDataMenu)}
            disabled={sending}
            aria-label="Share health information"
          >
            <span className="health-data-icon">📊</span>
            Share Health Info
          </button>
          
          {showHealthDataMenu && (
            <div className="health-data-menu">
              <button
                type="button"
                className="health-data-option"
                onClick={() => handleShareHealthData('vitals')}
                disabled={sending}
              >
                <span className="option-icon">❤️</span>
                <span className="option-text">
                  <strong>Vital Signs</strong>
                  <small>Share latest health metrics</small>
                </span>
              </button>
              <button
                type="button"
                className="health-data-option"
                onClick={() => handleShareHealthData('medication')}
                disabled={sending}
              >
                <span className="option-icon">💊</span>
                <span className="option-text">
                  <strong>Medication Status</strong>
                  <small>Share adherence information</small>
                </span>
              </button>
              <button
                type="button"
                className="health-data-option"
                onClick={() => handleShareHealthData('appointment')}
                disabled={sending}
              >
                <span className="option-icon">📅</span>
                <span className="option-text">
                  <strong>Appointments</strong>
                  <small>Share upcoming appointments</small>
                </span>
              </button>
            </div>
          )}
        </div>
        
        <textarea
          className="message-input"
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage(e);
            }
          }}
          rows={3}
          disabled={sending}
        />
        <Button
          type="submit"
          variant="primary"
          size="large"
          disabled={!newMessage.trim() || sending}
        >
          {sending ? 'Sending...' : 'Send Message'}
        </Button>
      </form>

      <div className="communication-hub__tips">
        <Text variant="body" size="normal" className="tip">
          💡 Tip: Messages are delivered with read receipts so you know when {primaryUserName} has seen them.
        </Text>
      </div>
    </div>
  );
};
