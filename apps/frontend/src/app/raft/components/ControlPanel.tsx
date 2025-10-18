'use client';

import React from 'react';
import { Play, Square, RotateCcw, Activity } from 'lucide-react';
import { RaftNodeStatus } from '../hooks/useRaftCluster';

interface ControlPanelProps {
  nodes: RaftNodeStatus[];
  clusterSize: number;
  leaderId: string | null;
  term: number;
  onStartCluster: () => void;
  onStopCluster: () => void;
  onRestartCluster: () => void;
  isStarting: boolean;
  isStopping: boolean;
  isRestarting: boolean;
}

export default function ControlPanel({
  nodes,
  clusterSize,
  leaderId,
  term,
  onStartCluster,
  onStopCluster,
  onRestartCluster,
  isStarting,
  isStopping,
  isRestarting,
}: ControlPanelProps) {
  const activeNodes = nodes.filter((n) => n.state !== 'OFFLINE').length;
  const hasLeader = leaderId !== null;

  return (
    <div className="space-y-4">
      {/* Cluster Status Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Cluster Status
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">Cluster Size</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{clusterSize}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">Active Nodes</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {activeNodes}/{clusterSize}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">Current Term</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{term}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">Leader</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {hasLeader ? `Node ${leaderId}` : 'None'}
            </p>
          </div>
        </div>

        {/* Cluster Health Indicator */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Cluster Health</span>
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  hasLeader && activeNodes >= Math.ceil(clusterSize / 2)
                    ? 'bg-green-500 animate-pulse'
                    : 'bg-red-500'
                }`}
              />
              <span
                className={`text-sm font-semibold ${
                  hasLeader && activeNodes >= Math.ceil(clusterSize / 2)
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {hasLeader && activeNodes >= Math.ceil(clusterSize / 2) ? 'Healthy' : 'Degraded'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cluster Control Buttons */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Cluster Controls
        </h3>

        <div className="flex gap-3">
          <button
            onClick={onStartCluster}
            disabled={isStarting || activeNodes > 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors shadow-md"
          >
            <Play className="w-5 h-5" />
            {isStarting ? 'Starting...' : 'Start Cluster'}
          </button>

          <button
            onClick={onStopCluster}
            disabled={isStopping || activeNodes === 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors shadow-md"
          >
            <Square className="w-5 h-5" />
            {isStopping ? 'Stopping...' : 'Stop Cluster'}
          </button>

          <button
            onClick={onRestartCluster}
            disabled={isRestarting || activeNodes === 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors shadow-md"
          >
            <RotateCcw className="w-5 h-5" />
            {isRestarting ? 'Restarting...' : 'Restart'}
          </button>
        </div>
      </div>

      {/* Node Status Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Node Status
        </h3>

        <div className="space-y-2">
          {nodes.map((node) => (
            <div
              key={node.nodeId}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    node.state === 'OFFLINE' ? 'bg-gray-400' : 'bg-green-500 animate-pulse'
                  }`}
                />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    Node {node.nodeId}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {node.state} | Term {node.currentTerm} | Commit {node.commitIndex}
                  </p>
                </div>
              </div>

              {node.isLeader && (
                <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-100 text-xs font-bold rounded-full">
                  👑 LEADER
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
