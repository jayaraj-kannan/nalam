import React, { useState, useEffect } from 'react';
import { Button, Text } from '../../accessible';
import { useVoiceNavigationContext } from '../../accessible/VoiceNavigationProvider';
import './FamilyMessagesWidget.css';

export interface FamilyMessagesWidgetProps {
  userId: string;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  read: boolean;
}

/**
 * Family Messages Widget - Shows recent messages from care circle
 * Displays messages with read status and text-to-speech support
 * Requirements: 4.4, 5.2, 5.3, 5.5
 */
export const FamilyMessagesWidget: React.FC<FamilyMessagesWidgetProps> = ({ userId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const { readMessage, speakNotification } = useVoiceNavigationContext();

  useEffect(() => {
    // TODO: Fetch messages from API
    // Mock data for now
    const mockMessages: Message[] = [
      {
        id: '1',
        senderId: 'user2',
        senderName: 'Sarah',
        content: 'Hi Mom! Just checking in. How are you feeling today?',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        read: false,
      },
      {
        id: '2',
        senderId: 'user3',
        senderName: 'John',
        content: 'Don\'t forget your doctor appointment tomorrow at 2 PM!',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        read: true,
      },
    ];

    setTimeout(() => {
      setMessages(mockMessages);
      setLoading(false);
    }, 500);
  }, [userId]);

  const handleMarkAsRead = (messageId: string) => {
    // TODO: Call API to mark message as read
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, read: true } : msg
      )
    );
    speakNotification('Message marked as read');
  };

  const handleReadAloud = (message: Message) => {
    const messageText = `Message from ${message.senderName}. ${message.content}`;
    readMessage(messageText);
  };

  const formatMessageTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="family-messages-widget">
        <Text variant="heading" size="large" weight="bold" as="h2">
          Family Messages
        </Text>
        <Text variant="body" size="large">Loading...</Text>
      </div>
    );
  }

  return (
    <div className="family-messages-widget">
      <Text variant="heading" size="large" weight="bold" as="h2" className="widget-title">
        Family Messages
      </Text>

      <div className="message-list">
        {messages.length === 0 ? (
          <Text variant="body" size="large" color="secondary">
            No new messages
          </Text>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`message-item ${!msg.read ? 'message-unread' : ''}`}>
              <div className="message-header">
                <Text variant="body" size="large" weight="bold">
                  {msg.senderName}
                </Text>
                <Text variant="caption" size="normal" color="secondary">
                  {formatMessageTime(msg.timestamp)}
                </Text>
              </div>
              
              <Text variant="body" size="normal" className="message-content">
                {msg.content}
              </Text>

              <div className="message-actions">
                <Button
                  variant="secondary"
                  size="large"
                  onClick={() => handleReadAloud(msg)}
                  className="read-aloud-button"
                  ariaLabel={`Read message from ${msg.senderName} aloud`}
                >
                  🔊 Read Aloud
                </Button>

                {!msg.read && (
                  <Button
                    variant="secondary"
                    size="large"
                    onClick={() => handleMarkAsRead(msg.id)}
                    className="mark-read-button"
                    ariaLabel={`Mark message from ${msg.senderName} as read`}
                  >
                    Mark as Read
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="widget-footer">
        <Button variant="primary" size="large" className="view-all-button">
          View All Messages
        </Button>
      </div>
    </div>
  );
};
