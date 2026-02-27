import React, { useState, useEffect } from 'react';
import { Button, Text } from '../../accessible';
import { CareCircleMember, AlertPreferences, AlertType, AlertSeverity } from '../../../types';
import './CareCircleSettingsWidget.css';

export interface CareCircleSettingsWidgetProps {
  primaryUserId: string;
  userId: string;
}

/**
 * Care Circle Settings Widget for Secondary Users
 * Manage care circle members and notification preferences
 * Requirements: 4.1, 8.5, 9.2
 */
export const CareCircleSettingsWidget: React.FC<CareCircleSettingsWidgetProps> = ({
  primaryUserId,
  userId,
}) => {
  const [members, setMembers] = useState<CareCircleMember[]>([]);
  const [alertPreferences, setAlertPreferences] = useState<AlertPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRelationship, setInviteRelationship] = useState<RelationshipType>('child');
  const [inviting, setInviting] = useState(false);
  const [activeTab, setActiveTab] = useState<'members' | 'notifications'>('members');
  const [editingPermissions, setEditingPermissions] = useState<string | null>(null);
  const [removingMember, setRemovingMember] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // In a real implementation, this would call the API
        // const [membersRes, prefsRes] = await Promise.all([
        //   fetch(`/api/v1/care-circle/${primaryUserId}`, {
        //     headers: { Authorization: `Bearer ${token}` }
        //   }),
        //   fetch(`/api/v1/alert-preferences/${userId}`, {
        //     headers: { Authorization: `Bearer ${token}` }
        //   })
        // ]);
        
        // Mock data for now
        const mockMembers: CareCircleMember[] = [
          {
            userId: userId,
            profile: {
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@example.com',
              phone: '+1234567890',
              dateOfBirth: '1980-01-01',
            },
            relationship: 'child',
            permissions: {
              canViewVitals: true,
              canViewMedications: true,
              canViewAppointments: true,
              canViewHealthRecords: true,
              canReceiveAlerts: true,
              canSendMessages: true,
              canManageDevices: false,
            },
            joinedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
            lastActive: new Date(),
          },
          {
            userId: 'user2',
            profile: {
              firstName: 'Jane',
              lastName: 'Smith',
              email: 'jane.smith@example.com',
              phone: '+1234567891',
              dateOfBirth: '1985-05-15',
            },
            relationship: 'caregiver',
            permissions: {
              canViewVitals: true,
              canViewMedications: true,
              canViewAppointments: true,
              canViewHealthRecords: false,
              canReceiveAlerts: true,
              canSendMessages: true,
              canManageDevices: true,
            },
            joinedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000),
          },
        ];

        const mockPreferences: AlertPreferences = {
          channels: ['push', 'email'],
          quietHours: { start: '22:00', end: '07:00' },
          alertTypes: {
            vital_signs: { enabled: true, urgencyLevels: ['high', 'critical'] },
            medication: { enabled: true, urgencyLevels: ['medium', 'high', 'critical'] },
            appointment: { enabled: true, urgencyLevels: ['medium', 'high'] },
            emergency: { enabled: true, urgencyLevels: ['critical'] },
            device: { enabled: false, urgencyLevels: [] },
            check_in: { enabled: false, urgencyLevels: [] },
            fall_detection: { enabled: true, urgencyLevels: ['high', 'critical'] },
          },
        };

        setMembers(mockMembers);
        setAlertPreferences(mockPreferences);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [primaryUserId, userId]);

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteEmail.trim() || inviting) {
      return;
    }

    try {
      setInviting(true);
      
      // In a real implementation, this would call the API
      // await fetch('/api/v1/care-circle/invite', {
      //   method: 'POST',
      //   headers: { 
      //     'Content-Type': 'application/json',
      //     Authorization: `Bearer ${token}` 
      //   },
      //   body: JSON.stringify({
      //     primaryUserId,
      //     email: inviteEmail,
      //     relationship: inviteRelationship,
      //   })
      // });
      
      alert(`Invitation sent to ${inviteEmail} as ${inviteRelationship}`);
      setInviteEmail('');
      setInviteRelationship('child');
    } catch (error) {
      console.error('Error inviting member:', error);
    } finally {
      setInviting(false);
    }
  };

  const handleUpdatePermissions = async (memberId: string, updatedPermissions: PermissionSet) => {
    try {
      // In a real implementation, this would call the API
      // await fetch(`/api/v1/care-circle/${primaryUserId}/permissions/${memberId}`, {
      //   method: 'PUT',
      //   headers: { 
      //     'Content-Type': 'application/json',
      //     Authorization: `Bearer ${token}` 
      //   },
      //   body: JSON.stringify(updatedPermissions)
      // });
      
      setMembers(members.map(m => 
        m.userId === memberId ? { ...m, permissions: updatedPermissions } : m
      ));
      setEditingPermissions(null);
    } catch (error) {
      console.error('Error updating permissions:', error);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to remove this member from the care circle?')) {
      return;
    }

    try {
      setRemovingMember(memberId);
      
      // In a real implementation, this would call the API
      // await fetch(`/api/v1/care-circle/${primaryUserId}/members/${memberId}`, {
      //   method: 'DELETE',
      //   headers: { 
      //     Authorization: `Bearer ${token}` 
      //   }
      // });
      
      setMembers(members.filter(m => m.userId !== memberId));
      alert('Member removed successfully');
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove member. Please try again.');
    } finally {
      setRemovingMember(null);
    }
  };

  const handleUpdatePreferences = async (updatedPrefs: AlertPreferences) => {
    try {
      // In a real implementation, this would call the API
      // await fetch(`/api/v1/alert-preferences/${userId}`, {
      //   method: 'PUT',
      //   headers: { 
      //     'Content-Type': 'application/json',
      //     Authorization: `Bearer ${token}` 
      //   },
      //   body: JSON.stringify(updatedPrefs)
      // });
      
      setAlertPreferences(updatedPrefs);
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  };

  const toggleAlertType = (type: AlertType) => {
    if (!alertPreferences) return;
    
    const currentSetting = alertPreferences.alertTypes[type];
    const updatedPrefs = {
      ...alertPreferences,
      alertTypes: {
        ...alertPreferences.alertTypes,
        [type]: {
          ...currentSetting,
          enabled: !currentSetting?.enabled,
        },
      },
    };
    
    handleUpdatePreferences(updatedPrefs);
  };

  if (loading) {
    return (
      <div className="care-circle-settings care-circle-settings--loading">
        <Text variant="body" size="medium">Loading settings...</Text>
      </div>
    );
  }

  return (
    <div className="care-circle-settings">
      <div className="care-circle-settings__header">
        <Text variant="heading" size="large" weight="bold" as="h2">
          Care Circle Settings
        </Text>
        <Text variant="body" size="small" className="care-circle-settings__subtitle">
          Manage members and notification preferences
        </Text>
      </div>

      {/* Tabs */}
      <div className="settings-tabs">
        <button
          className={`settings-tab ${activeTab === 'members' ? 'settings-tab--active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          <span className="settings-tab__icon">👥</span>
          <span className="settings-tab__label">Members</span>
        </button>
        <button
          className={`settings-tab ${activeTab === 'notifications' ? 'settings-tab--active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          <span className="settings-tab__icon">🔔</span>
          <span className="settings-tab__label">Notifications</span>
        </button>
      </div>

      {/* Members tab */}
      {activeTab === 'members' && (
        <div className="settings-content">
          {/* Invite new member */}
          <div className="invite-section">
            <Text variant="heading" size="medium" weight="semibold">
              Invite New Member
            </Text>
            <form className="invite-form" onSubmit={handleInviteMember}>
              <div className="invite-form__fields">
                <input
                  type="email"
                  className="invite-input"
                  placeholder="Enter email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={inviting}
                  aria-label="Email address"
                />
                <select
                  className="invite-select"
                  value={inviteRelationship}
                  onChange={(e) => setInviteRelationship(e.target.value as RelationshipType)}
                  disabled={inviting}
                  aria-label="Relationship"
                >
                  <option value="child">Child</option>
                  <option value="spouse">Spouse</option>
                  <option value="sibling">Sibling</option>
                  <option value="parent">Parent</option>
                  <option value="friend">Friend</option>
                  <option value="caregiver">Caregiver</option>
                  <option value="healthcare_provider">Healthcare Provider</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <Button
                type="submit"
                variant="primary"
                size="large"
                disabled={!inviteEmail.trim() || inviting}
              >
                {inviting ? 'Sending...' : 'Send Invite'}
              </Button>
            </form>
          </div>

          {/* Members list */}
          <div className="members-section">
            <Text variant="heading" size="medium" weight="semibold">
              Current Members ({members.length})
            </Text>
            <div className="members-list">
              {members.map(member => (
                <div key={member.userId} className="member-card">
                  <div className="member-card__header">
                    <div className="member-card__avatar">
                      {member.profile.firstName[0]}{member.profile.lastName[0]}
                    </div>
                    <div className="member-card__info">
                      <Text variant="body" size="medium" weight="semibold">
                        {member.profile.firstName} {member.profile.lastName}
                      </Text>
                      <Text variant="body" size="small" className="member-card__relationship">
                        {member.relationship.charAt(0).toUpperCase() + member.relationship.slice(1).replace('_', ' ')}
                      </Text>
                    </div>
                    {member.userId === userId && (
                      <span className="member-badge">You</span>
                    )}
                  </div>

                  <div className="member-card__details">
                    <Text variant="body" size="small">
                      📧 {member.profile.email}
                    </Text>
                    <Text variant="body" size="small">
                      📱 {member.profile.phone}
                    </Text>
                    <Text variant="body" size="small" className="member-card__joined">
                      Joined {member.joinedAt.toLocaleDateString()}
                    </Text>
                  </div>

                  <div className="member-card__permissions">
                    <div className="permissions-header">
                      <Text variant="body" size="small" weight="semibold">Permissions:</Text>
                      {member.userId !== userId && (
                        <button
                          className="edit-permissions-btn"
                          onClick={() => setEditingPermissions(
                            editingPermissions === member.userId ? null : member.userId
                          )}
                          aria-label="Edit permissions"
                        >
                          {editingPermissions === member.userId ? '✓ Done' : '✏️ Edit'}
                        </button>
                      )}
                    </div>
                    
                    {editingPermissions === member.userId ? (
                      <div className="permissions-editor">
                        {(Object.keys(member.permissions) as Array<keyof PermissionSet>).map(key => (
                          <label key={key} className="permission-checkbox">
                            <input
                              type="checkbox"
                              checked={member.permissions[key]}
                              onChange={(e) => {
                                const updatedPermissions = {
                                  ...member.permissions,
                                  [key]: e.target.checked,
                                };
                                handleUpdatePermissions(member.userId, updatedPermissions);
                              }}
                            />
                            <Text variant="body" size="small">
                              {key.replace('can', '').replace(/([A-Z])/g, ' $1').trim()}
                            </Text>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="permissions-grid">
                        {Object.entries(member.permissions).map(([key, value]) => (
                          value && (
                            <span key={key} className="permission-badge">
                              ✓ {key.replace('can', '').replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                          )
                        ))}
                      </div>
                    )}
                  </div>

                  {member.userId !== userId && (
                    <div className="member-card__actions">
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => handleRemoveMember(member.userId)}
                        disabled={removingMember === member.userId}
                      >
                        {removingMember === member.userId ? 'Removing...' : 'Remove Member'}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Notifications tab */}
      {activeTab === 'notifications' && alertPreferences && (
        <div className="settings-content">
          {/* Notification channels */}
          <div className="notification-section">
            <Text variant="heading" size="medium" weight="semibold">
              Notification Channels
            </Text>
            <div className="channels-list">
              {(['push', 'sms', 'email'] as const).map(channel => (
                <label key={channel} className="channel-option">
                  <input
                    type="checkbox"
                    checked={alertPreferences.channels.includes(channel)}
                    onChange={() => {
                      const updatedChannels = alertPreferences.channels.includes(channel)
                        ? alertPreferences.channels.filter(c => c !== channel)
                        : [...alertPreferences.channels, channel];
                      handleUpdatePreferences({
                        ...alertPreferences,
                        channels: updatedChannels,
                      });
                    }}
                  />
                  <Text variant="body" size="medium">
                    {channel.toUpperCase()}
                  </Text>
                </label>
              ))}
            </div>
          </div>

          {/* Quiet hours */}
          <div className="notification-section">
            <Text variant="heading" size="medium" weight="semibold">
              Quiet Hours
            </Text>
            <Text variant="body" size="small" className="section-description">
              Reduce non-critical notifications during these hours
            </Text>
            <div className="quiet-hours">
              <div className="time-input-group">
                <label>
                  <Text variant="body" size="small">Start:</Text>
                  <input
                    type="time"
                    className="time-input"
                    value={alertPreferences.quietHours?.start || '22:00'}
                    onChange={(e) => {
                      handleUpdatePreferences({
                        ...alertPreferences,
                        quietHours: {
                          ...alertPreferences.quietHours!,
                          start: e.target.value,
                        },
                      });
                    }}
                  />
                </label>
                <label>
                  <Text variant="body" size="small">End:</Text>
                  <input
                    type="time"
                    className="time-input"
                    value={alertPreferences.quietHours?.end || '07:00'}
                    onChange={(e) => {
                      handleUpdatePreferences({
                        ...alertPreferences,
                        quietHours: {
                          ...alertPreferences.quietHours!,
                          end: e.target.value,
                        },
                      });
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Alert types */}
          <div className="notification-section">
            <Text variant="heading" size="medium" weight="semibold">
              Alert Types
            </Text>
            <Text variant="body" size="small" className="section-description">
              Choose which types of alerts you want to receive
            </Text>
            <div className="alert-types-list">
              {(Object.keys(alertPreferences.alertTypes) as AlertType[]).map(type => {
                const setting = alertPreferences.alertTypes[type];
                return (
                  <div key={type} className="alert-type-item">
                    <label className="alert-type-toggle">
                      <input
                        type="checkbox"
                        checked={setting?.enabled || false}
                        onChange={() => toggleAlertType(type)}
                      />
                      <Text variant="body" size="medium" weight="semibold">
                        {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Text>
                    </label>
                    {setting?.enabled && setting.urgencyLevels.length > 0 && (
                      <div className="urgency-levels">
                        {setting.urgencyLevels.map(level => (
                          <span key={level} className={`urgency-badge urgency-badge--${level}`}>
                            {level}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
