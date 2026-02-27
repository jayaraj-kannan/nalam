// Data Sharing Controls Component
// Requirements: 8.5 - Granular data sharing controls for primary users

import React, { useState, useEffect } from 'react';
import './DataSharingControls.css';

interface PermissionSet {
  canViewVitals: boolean;
  canViewMedications: boolean;
  canViewAppointments: boolean;
  canViewHealthRecords: boolean;
  canReceiveAlerts: boolean;
  canSendMessages: boolean;
  canManageDevices: boolean;
}

interface CareCircleMember {
  secondaryUserId: string;
  name: string;
  email: string;
  relationship: string;
  permissions: PermissionSet;
  joinedAt: string;
  lastActive?: string;
}

interface DataSharingControlsProps {
  primaryUserId: string;
  onPermissionsUpdated?: () => void;
}

const PERMISSION_LABELS: Record<keyof PermissionSet, { label: string; description: string }> = {
  canViewVitals: {
    label: 'View Vital Signs',
    description: 'Heart rate, blood pressure, temperature, oxygen levels',
  },
  canViewMedications: {
    label: 'View Medications',
    description: 'Medication list, schedules, and adherence',
  },
  canViewAppointments: {
    label: 'View Appointments',
    description: 'Doctor appointments and schedules',
  },
  canViewHealthRecords: {
    label: 'View Health Records',
    description: 'Medical history, diagnoses, and lab results',
  },
  canReceiveAlerts: {
    label: 'Receive Health Alerts',
    description: 'Emergency alerts and health notifications',
  },
  canSendMessages: {
    label: 'Send Messages',
    description: 'Send messages through the app',
  },
  canManageDevices: {
    label: 'Manage Devices',
    description: 'Add or remove health monitoring devices',
  },
};

export const DataSharingControls: React.FC<DataSharingControlsProps> = ({
  primaryUserId,
  onPermissionsUpdated,
}) => {
  const [members, setMembers] = useState<CareCircleMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<CareCircleMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadCareCircleMembers();
  }, [primaryUserId]);

  const loadCareCircleMembers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/v1/permissions/${primaryUserId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load care circle members');
      }

      const data = await response.json();
      
      // Convert permission matrix to array of members
      const membersList: CareCircleMember[] = Object.entries(data.permissionMatrix).map(
        ([secondaryUserId, info]: [string, any]) => ({
          secondaryUserId,
          name: info.name || 'Unknown',
          email: info.email || '',
          relationship: info.relationship,
          permissions: info.permissions,
          joinedAt: info.joinedAt,
          lastActive: info.lastActive,
        })
      );

      setMembers(membersList);
      
      if (membersList.length > 0 && !selectedMember) {
        setSelectedMember(membersList[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const updatePermission = async (
    permission: keyof PermissionSet,
    value: boolean
  ) => {
    if (!selectedMember) return;

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch(
        `/api/v1/permissions/${primaryUserId}/members/${selectedMember.secondaryUserId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            permissions: {
              [permission]: value,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update permissions');
      }

      // Update local state
      setSelectedMember({
        ...selectedMember,
        permissions: {
          ...selectedMember.permissions,
          [permission]: value,
        },
      });

      setMembers(
        members.map((m) =>
          m.secondaryUserId === selectedMember.secondaryUserId
            ? {
                ...m,
                permissions: {
                  ...m.permissions,
                  [permission]: value,
                },
              }
            : m
        )
      );

      setSuccessMessage('Permissions updated successfully');
      
      if (onPermissionsUpdated) {
        onPermissionsUpdated();
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update permissions');
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = async (preset: 'full' | 'limited' | 'alerts-only') => {
    if (!selectedMember) return;

    const presets: Record<string, Partial<PermissionSet>> = {
      full: {
        canViewVitals: true,
        canViewMedications: true,
        canViewAppointments: true,
        canViewHealthRecords: true,
        canReceiveAlerts: true,
        canSendMessages: true,
        canManageDevices: true,
      },
      limited: {
        canViewVitals: true,
        canViewMedications: false,
        canViewAppointments: true,
        canViewHealthRecords: false,
        canReceiveAlerts: true,
        canSendMessages: true,
        canManageDevices: false,
      },
      'alerts-only': {
        canViewVitals: false,
        canViewMedications: false,
        canViewAppointments: false,
        canViewHealthRecords: false,
        canReceiveAlerts: true,
        canSendMessages: true,
        canManageDevices: false,
      },
    };

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch(
        `/api/v1/permissions/${primaryUserId}/members/${selectedMember.secondaryUserId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            permissions: presets[preset],
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to apply preset');
      }

      // Reload members to get updated permissions
      await loadCareCircleMembers();
      
      setSuccessMessage(`${preset} preset applied successfully`);
      
      if (onPermissionsUpdated) {
        onPermissionsUpdated();
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply preset');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="data-sharing-controls loading">Loading...</div>;
  }

  if (members.length === 0) {
    return (
      <div className="data-sharing-controls empty">
        <p>No care circle members yet.</p>
        <p>Invite family members to start sharing your health data.</p>
      </div>
    );
  }

  return (
    <div className="data-sharing-controls">
      <h2>Data Sharing Controls</h2>
      <p className="description">
        Control what health information each care circle member can see.
        Changes are logged for your security.
      </p>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="success-message" role="status">
          {successMessage}
        </div>
      )}

      <div className="controls-layout">
        {/* Member List */}
        <div className="member-list">
          <h3>Care Circle Members</h3>
          {members.map((member) => (
            <button
              key={member.secondaryUserId}
              className={`member-item ${
                selectedMember?.secondaryUserId === member.secondaryUserId ? 'selected' : ''
              }`}
              onClick={() => setSelectedMember(member)}
              aria-pressed={selectedMember?.secondaryUserId === member.secondaryUserId}
            >
              <div className="member-name">{member.name}</div>
              <div className="member-relationship">{member.relationship}</div>
            </button>
          ))}
        </div>

        {/* Permission Controls */}
        {selectedMember && (
          <div className="permission-controls">
            <div className="member-header">
              <h3>{selectedMember.name}</h3>
              <p className="member-email">{selectedMember.email}</p>
            </div>

            <div className="preset-buttons">
              <button
                onClick={() => applyPreset('full')}
                disabled={saving}
                className="preset-button"
              >
                Full Access
              </button>
              <button
                onClick={() => applyPreset('limited')}
                disabled={saving}
                className="preset-button"
              >
                Limited Access
              </button>
              <button
                onClick={() => applyPreset('alerts-only')}
                disabled={saving}
                className="preset-button"
              >
                Alerts Only
              </button>
            </div>

            <div className="permissions-list">
              <h4>Individual Permissions</h4>
              {(Object.keys(PERMISSION_LABELS) as Array<keyof PermissionSet>).map(
                (permission) => (
                  <div key={permission} className="permission-item">
                    <label className="permission-label">
                      <input
                        type="checkbox"
                        checked={selectedMember.permissions[permission]}
                        onChange={(e) => updatePermission(permission, e.target.checked)}
                        disabled={saving}
                        aria-describedby={`${permission}-description`}
                      />
                      <div className="permission-info">
                        <div className="permission-title">
                          {PERMISSION_LABELS[permission].label}
                        </div>
                        <div
                          id={`${permission}-description`}
                          className="permission-description"
                        >
                          {PERMISSION_LABELS[permission].description}
                        </div>
                      </div>
                    </label>
                  </div>
                )
              )}
            </div>

            <div className="permission-footer">
              <p className="audit-notice">
                All permission changes are logged for security and compliance.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
