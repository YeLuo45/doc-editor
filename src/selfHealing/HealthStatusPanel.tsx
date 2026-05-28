/**
 * HealthStatusPanel - Visual health dashboard for self-healing system
 * React component showing health metrics and repair history
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { HealthStatus, RepairResult, HealthLevel, IssueSeverity } from './types';

interface PanelProps {
  healthStatus: HealthStatus;
  repairHistory: RepairResult[];
  onRefresh?: () => void;
  onIssueClick?: (issueId: string) => void;
}

interface GaugeProps {
  value: number;
  max: number;
  label: string;
  color: string;
}

function Gauge({ value, max, label, color }: GaugeProps): React.JSX.Element {
  const percent = Math.min(100, (value / max) * 100);
  return (
    <div style={{ textAlign: 'center', margin: '8px' }}>
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        border: '4px solid #333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `conic-gradient(${color} ${percent}%, #222 0%)`,
        margin: '0 auto 8px',
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: '#111',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          fontWeight: 'bold',
        }}>
          {value}
        </div>
      </div>
      <div style={{ fontSize: '12px', color: '#888' }}>{label}</div>
    </div>
  );
}

function HealthBadge({ level }: { level: HealthLevel }): React.JSX.Element {
  const colors: Record<HealthLevel, { bg: string; text: string }> = {
    healthy: { bg: '#1a4d1a', text: '#4ade80' },
    degraded: { bg: '#4d3d1a', text: '#facc15' },
    critical: { bg: '#4d1a1a', text: '#f87171' },
  };
  const { bg, text } = colors[level];
  return (
    <span style={{
      background: bg,
      color: text,
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 'bold',
      textTransform: 'uppercase',
    }}>
      {level}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: IssueSeverity }): React.JSX.Element {
  const colors: Record<IssueSeverity, string> = {
    low: '#4ade80',
    medium: '#facc15',
    high: '#fb923c',
    critical: '#f87171',
  };
  return (
    <span style={{
      color: colors[severity],
      fontSize: '11px',
      fontWeight: 'bold',
    }}>
      {severity.toUpperCase()}
    </span>
  );
}

export function HealthStatusPanel({
  healthStatus,
  repairHistory,
  onRefresh,
  onIssueClick,
}: PanelProps): React.JSX.Element {
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  useEffect(() => {
    setLastUpdate(Date.now());
  }, [healthStatus, repairHistory]);

  const formatDuration = useCallback((ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h`;
  }, []);

  const formatTime = useCallback((ts: number): string => {
    const date = new Date(ts);
    return date.toLocaleTimeString();
  }, []);

  const scoreColor = healthStatus.overall === 'healthy'
    ? '#4ade80'
    : healthStatus.overall === 'degraded'
    ? '#facc15'
    : '#f87171';

  return (
    <div style={{
      background: '#0a0a0a',
      border: '1px solid #222',
      borderRadius: '8px',
      padding: '16px',
      fontFamily: 'system-ui, sans-serif',
      color: '#e0e0e0',
      minWidth: '320px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        borderBottom: '1px solid #222',
        paddingBottom: '12px',
      }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
          Self-Healing Health
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <HealthBadge level={healthStatus.overall} />
          {onRefresh && (
            <button
              onClick={onRefresh}
              style={{
                background: '#222',
                border: 'none',
                color: '#888',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '11px',
              }}
            >
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Gauges */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        marginBottom: '16px',
      }}>
        <Gauge
          value={healthStatus.score}
          max={100}
          label="Health Score"
          color={scoreColor}
        />
        <Gauge
          value={healthStatus.activeIssues}
          max={20}
          label="Active Issues"
          color="#f87171"
        />
        <Gauge
          value={healthStatus.resolvedToday}
          max={50}
          label="Resolved Today"
          color="#4ade80"
        />
      </div>

      {/* Metrics */}
      {healthStatus.metrics.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
            METRICS
          </div>
          {healthStatus.metrics.slice(0, 5).map((metric) => (
            <div key={metric.name} style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12px',
              padding: '4px 0',
              borderBottom: '1px solid #1a1a1a',
            }}>
              <span style={{ color: '#888' }}>{metric.name}</span>
              <span style={{
                color: metric.value <= metric.threshold ? '#4ade80' : '#f87171',
              }}>
                {metric.value.toFixed(1)} / {metric.threshold}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Uptime */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '11px',
        color: '#666',
        marginBottom: '16px',
      }}>
        <span>Uptime</span>
        <span>{formatDuration(healthStatus.uptimeSeconds * 1000)}</span>
      </div>

      {/* Repair History */}
      {repairHistory.length > 0 && (
        <div>
          <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
            REPAIR HISTORY
          </div>
          {repairHistory.slice(-5).reverse().map((result) => (
            <div
              key={result.issueId}
              onClick={() => onIssueClick?.(result.issueId)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 8px',
                marginBottom: '4px',
                background: result.success ? '#0f1a0f' : '#1a0f0f',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: onIssueClick ? 'pointer' : 'default',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  color: result.success ? '#4ade80' : '#f87171',
                  fontSize: '14px',
                }}>
                  {result.success ? '✓' : '✗'}
                </span>
                <span style={{ color: '#aaa' }}>{result.issueId.slice(0, 12)}</span>
              </div>
              <div style={{ color: '#666' }}>
                {formatDuration(result.duration)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: '16px',
        paddingTop: '8px',
        borderTop: '1px solid #222',
        fontSize: '10px',
        color: '#444',
        textAlign: 'right',
      }}>
        Updated {formatTime(lastUpdate)}
      </div>
    </div>
  );
}

export default HealthStatusPanel;