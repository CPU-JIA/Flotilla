'use client'

import React, { useMemo } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { ClusterMetrics } from '../hooks/useRaftCluster'

interface MetricsChartProps {
  metrics: ClusterMetrics
  historicalData?: ClusterMetrics[]
}

export default function MetricsChart({ metrics, historicalData = [] }: MetricsChartProps) {
  // Prepare time-series data for performance charts
  const performanceData = useMemo(() => {
    const allData = [...historicalData, metrics].slice(-20) // Keep last 20 data points
    return allData.map((m) => ({
      time: new Date(m.timestamp).toLocaleTimeString(),
      rps: m.requestsPerSecond,
      latency: m.averageLatency,
      consensus: m.consensusRate * 100,
    }))
  }, [metrics, historicalData])

  // Prepare node-level metrics
  const nodeMetricsData = useMemo(() => {
    return metrics.nodeMetrics.map((nm) => ({
      node: `Node ${nm.nodeId}`,
      requests: nm.requestCount,
      errors: nm.errorCount,
      uptime: Math.floor(nm.uptime / 60), // Convert to minutes
    }))
  }, [metrics])

  return (
    <div className="space-y-6">
      {/* Requests Per Second & Latency */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Performance Metrics
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={performanceData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-600" />
            <XAxis
              dataKey="time"
              className="text-gray-600 dark:text-gray-400"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              yAxisId="left"
              className="text-gray-600 dark:text-gray-400"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              className="text-gray-600 dark:text-gray-400"
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                borderRadius: '8px',
                border: 'none',
                color: 'white',
              }}
            />
            <Legend />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="rps"
              name="Requests/s"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.6}
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="latency"
              name="Latency (ms)"
              stroke="#f59e0b"
              fill="#f59e0b"
              fillOpacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Consensus Rate */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Consensus Rate</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={performanceData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-600" />
            <XAxis
              dataKey="time"
              className="text-gray-600 dark:text-gray-400"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              domain={[0, 100]}
              className="text-gray-600 dark:text-gray-400"
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                borderRadius: '8px',
                border: 'none',
                color: 'white',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="consensus"
              name="Consensus Rate (%)"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Node-Level Metrics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Node Statistics
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={nodeMetricsData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-600" />
            <XAxis
              dataKey="node"
              className="text-gray-600 dark:text-gray-400"
              tick={{ fontSize: 12 }}
            />
            <YAxis className="text-gray-600 dark:text-gray-400" tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                borderRadius: '8px',
                border: 'none',
                color: 'white',
              }}
            />
            <Legend />
            <Bar dataKey="requests" name="Total Requests" fill="#3b82f6" />
            <Bar dataKey="errors" name="Errors" fill="#ef4444" />
            <Bar dataKey="uptime" name="Uptime (min)" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
