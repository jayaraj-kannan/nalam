import React, { useState, useEffect } from 'react';
import { Button, Text } from '../accessible';
import { HealthOverviewWidget } from './widgets/HealthOverviewWidget';
import { AlertsPanelWidget } from './widgets/AlertsPanelWidget';
import { CommunicationHubWidget } from './widgets/CommunicationHubWidget';
import { HealthReportsWidget } from './widgets/HealthReportsWidget';
import { CareCircleSettingsWidget } from './widgets/CareCircleSettingsWidget';
import './SecondaryUserDashboard.css';

export interface SecondaryUserDashboardProps {
  userId: string;
  primaryUserId: string;
  userName: string;
  primaryUserName: string;
}

/**
 * Secondary User Dashboard for family members and caregivers
 * Features:
 * - Health overview showing primary user's current status
 * - Alerts panel with filtering and sorting
 * - Communication hub for family messaging
 * - Health reports viewer
 * - Care circle settings panel
 * 
 * Unlike the Primary User interface, this can be more information-dense
 * and feature-rich to support monitoring and caregiving activities.
 * 
 * Requirements: 4.1
 */
export const SecondaryUserDashboard: React.FC<SecondaryUserDashboardProps> = ({
  userId,
  primaryUserId,
  userName,
  primaryUserName,
}) => {
  const [activeView, setActiveView] = useState<'overview' | 'alerts' | 'communication' | 'reports' | 'settings'>('overview');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // In a real implementation, this would call the API
        // const response = await fetch(`/api/v1/care-circle/${primaryUserId}`, {
        //   headers: { Authorization: `Bearer ${token}` }
        // });
        // const data = await response.json();
        
        // Mock data for now
        const mockData = {
          primaryUser: {
            id: primaryUserId,
            name: primaryUserName,
            lastActive: new Date().toISOString(),
          },
          healthStatus: {
            vitalsTrend: 'stable' as const,
            lastRecorded: new Date().toISOString(),
          },
          medications: {
            upcomingCount: 3,
            adherenceScore: 92,
            missedToday: 0,
          },
          appointments: {
            upcomingCount: 2,
          },
          alerts: {
            unacknowledgedCount: 1,
            criticalCount: 0,
          },
        };

        setDashboardData(mockData);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [primaryUserId, primaryUserName]);

  const handleViewChange = (view: typeof activeView) => {
    setActiveView(view);
  };

  if (loading) {
    return (
      <div className="secondary-dashboard secondary-dashboard--loading">
        <Text variant="body" size="large">Loading dashboard...</Text>
      </div>
    );
  }

  if (error) {
    return (
      <div className="secondary-dashboard secondary-dashboard--error">
        <Text variant="body" size="large" color="error">{error}</Text>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="secondary-dashboard">
      {/* Header */}
      <header className="secondary-dashboard__header">
        <div className="secondary-dashboard__header-content">
          <Text variant="heading" size="large" weight="bold" as="h1">
            Care Dashboard
          </Text>
          <Text variant="body" size="medium" className="secondary-dashboard__subtitle">
            Monitoring {primaryUserName}
          </Text>
        </div>
        
        {/* Quick status indicators */}
        <div className="secondary-dashboard__status-bar">
          {dashboardData?.alerts?.criticalCount > 0 && (
            <div className="status-indicator status-indicator--critical">
              <span className="status-indicator__icon">⚠️</span>
              <Text variant="body" size="small" weight="bold">
                {dashboardData.alerts.criticalCount} Critical Alert{dashboardData.alerts.criticalCount !== 1 ? 's' : ''}
              </Text>
            </div>
          )}
          {dashboardData?.alerts?.unacknowledgedCount > 0 && (
            <div className="status-indicator status-indicator--warning">
              <span className="status-indicator__icon">🔔</span>
              <Text variant="body" size="small">
                {dashboardData.alerts.unacknowledgedCount} Unread Alert{dashboardData.alerts.unacknowledgedCount !== 1 ? 's' : ''}
              </Text>
            </div>
          )}
          <div className="status-indicator status-indicator--info">
            <span className="status-indicator__icon">💊</span>
            <Text variant="body" size="small">
              Adherence: {dashboardData?.medications?.adherenceScore || 0}%
            </Text>
          </div>
        </div>
      </header>

      {/* Navigation tabs */}
      <nav className="secondary-dashboard__nav" role="tablist">
        <button
          role="tab"
          aria-selected={activeView === 'overview'}
          className={`nav-tab ${activeView === 'overview' ? 'nav-tab--active' : ''}`}
          onClick={() => handleViewChange('overview')}
        >
          <span className="nav-tab__icon">📊</span>
          <span className="nav-tab__label">Overview</span>
        </button>
        <button
          role="tab"
          aria-selected={activeView === 'alerts'}
          className={`nav-tab ${activeView === 'alerts' ? 'nav-tab--active' : ''}`}
          onClick={() => handleViewChange('alerts')}
        >
          <span className="nav-tab__icon">🔔</span>
          <span className="nav-tab__label">Alerts</span>
          {dashboardData?.alerts?.unacknowledgedCount > 0 && (
            <span className="nav-tab__badge">{dashboardData.alerts.unacknowledgedCount}</span>
          )}
        </button>
        <button
          role="tab"
          aria-selected={activeView === 'communication'}
          className={`nav-tab ${activeView === 'communication' ? 'nav-tab--active' : ''}`}
          onClick={() => handleViewChange('communication')}
        >
          <span className="nav-tab__icon">💬</span>
          <span className="nav-tab__label">Messages</span>
        </button>
        <button
          role="tab"
          aria-selected={activeView === 'reports'}
          className={`nav-tab ${activeView === 'reports' ? 'nav-tab--active' : ''}`}
          onClick={() => handleViewChange('reports')}
        >
          <span className="nav-tab__icon">📄</span>
          <span className="nav-tab__label">Reports</span>
        </button>
        <button
          role="tab"
          aria-selected={activeView === 'settings'}
          className={`nav-tab ${activeView === 'settings' ? 'nav-tab--active' : ''}`}
          onClick={() => handleViewChange('settings')}
        >
          <span className="nav-tab__icon">⚙️</span>
          <span className="nav-tab__label">Settings</span>
        </button>
      </nav>

      {/* Main content area */}
      <main className="secondary-dashboard__content" role="tabpanel">
        {activeView === 'overview' && (
          <HealthOverviewWidget 
            primaryUserId={primaryUserId}
            dashboardData={dashboardData}
          />
        )}
        
        {activeView === 'alerts' && (
          <AlertsPanelWidget 
            primaryUserId={primaryUserId}
            userId={userId}
          />
        )}
        
        {activeView === 'communication' && (
          <CommunicationHubWidget 
            primaryUserId={primaryUserId}
            userId={userId}
            primaryUserName={primaryUserName}
          />
        )}
        
        {activeView === 'reports' && (
          <HealthReportsWidget 
            primaryUserId={primaryUserId}
          />
        )}
        
        {activeView === 'settings' && (
          <CareCircleSettingsWidget 
            primaryUserId={primaryUserId}
            userId={userId}
          />
        )}
      </main>
    </div>
  );
};
