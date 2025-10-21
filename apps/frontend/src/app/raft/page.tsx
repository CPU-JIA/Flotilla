'use client'

import React, { useState, useEffect } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import ClusterTopology from './components/ClusterTopology'
import MetricsChart from './components/MetricsChart'
import ControlPanel from './components/ControlPanel'
import {
  useClusterStatus,
  useClusterMetrics,
  useClusterControl,
  ClusterMetrics,
} from './hooks/useRaftCluster'

export default function RaftVisualizationPage() {
  const { t } = useLanguage()

  // Fetch cluster data with HTTP polling
  const { data: clusterStatus, isLoading: isLoadingStatus, error: statusError } = useClusterStatus()

  const {
    data: clusterMetrics,
    isLoading: isLoadingMetrics,
    error: metricsError,
  } = useClusterMetrics()

  const { startCluster, stopCluster, restartCluster, isStarting, isStopping, isRestarting } =
    useClusterControl()

  // Store historical metrics data for charts
  const [historicalMetrics, setHistoricalMetrics] = useState<ClusterMetrics[]>([])

  useEffect(() => {
    if (clusterMetrics) {
      setHistoricalMetrics((prev) => [...prev.slice(-19), clusterMetrics])
    }
  }, [clusterMetrics])

  // Error state
  if (statusError || metricsError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              <div>
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
                  {t.raft.failedToLoad}
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  {(statusError as Error)?.message || (metricsError as Error)?.message}
                </p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                  {t.raft.ensureBackendRunning}{' '}
                  <code className="px-1 py-0.5 bg-red-100 dark:bg-red-800 rounded">
                    http://localhost:4000
                  </code>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (isLoadingStatus || isLoadingMetrics || !clusterStatus || !clusterMetrics) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 text-lg">{t.raft.loadingVisualization}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white shadow-2xl">
          <h1 className="text-4xl font-bold mb-2">{t.raft.title}</h1>
          <p className="text-blue-100 text-lg">{t.raft.description}</p>
          <div className="mt-4 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span>{t.raft.liveMonitoring}</span>
            </div>
            <div className="px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm">
              {t.raft.term}: {clusterStatus.term}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Topology + Metrics */}
          <div className="lg:col-span-2 space-y-8">
            {/* Cluster Topology */}
            <div>
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                {t.raft.clusterTopology}
              </h2>
              <ClusterTopology nodes={clusterStatus.nodes} leaderId={clusterStatus.leaderId} />
            </div>

            {/* Performance Metrics */}
            <div>
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                {t.raft.performanceMetrics}
              </h2>
              <MetricsChart metrics={clusterMetrics} historicalData={historicalMetrics} />
            </div>
          </div>

          {/* Right Column: Control Panel */}
          <div className="lg:col-span-1">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              {t.raft.controlPanel}
            </h2>
            <ControlPanel
              nodes={clusterStatus.nodes}
              clusterSize={clusterStatus.clusterSize}
              leaderId={clusterStatus.leaderId}
              term={clusterStatus.term}
              onStartCluster={startCluster}
              onStopCluster={stopCluster}
              onRestartCluster={restartCluster}
              isStarting={isStarting}
              isStopping={isStopping}
              isRestarting={isRestarting}
            />
          </div>
        </div>

        {/* Footer Information */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            {t.raft.aboutRaft}
          </h3>
          <p className="text-blue-800 dark:text-blue-200 text-sm leading-relaxed">
            {t.raft.aboutRaftDescription}
          </p>
        </div>
      </div>
    </div>
  )
}
