'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ============================================
// Type Definitions
// ============================================

export type NodeState = 'LEADER' | 'FOLLOWER' | 'CANDIDATE' | 'OFFLINE';

export interface RaftNodeStatus {
  nodeId: string;
  state: NodeState;
  currentTerm: number;
  votedFor: string | null;
  commitIndex: number;
  lastApplied: number;
  isLeader: boolean;
  lastHeartbeat: string;
  voteCount?: number;
}

export interface ClusterStatus {
  nodes: RaftNodeStatus[];
  clusterSize: number;
  leaderId: string | null;
  term: number;
}

export interface ClusterMetrics {
  timestamp: string;
  requestsPerSecond: number;
  averageLatency: number;
  consensusRate: number;
  nodeMetrics: {
    nodeId: string;
    uptime: number;
    requestCount: number;
    errorCount: number;
  }[];
}

// ============================================
// API Client Functions
// ============================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

async function fetchClusterStatus(): Promise<ClusterStatus> {
  const response = await fetch(`${API_BASE_URL}/raft-cluster/status`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch cluster status: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data; // Unwrap backend response
}

async function fetchClusterMetrics(): Promise<ClusterMetrics> {
  const response = await fetch(`${API_BASE_URL}/raft-cluster/metrics`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch cluster metrics: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data; // Unwrap backend response
}

async function startCluster(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/raft-cluster/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to start cluster: ${response.statusText}`);
  }
}

async function stopCluster(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/raft-cluster/stop`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to stop cluster: ${response.statusText}`);
  }
}

async function restartCluster(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/raft-cluster/restart`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to restart cluster: ${response.statusText}`);
  }
}

// ============================================
// React Query Hooks
// ============================================

const REFETCH_INTERVAL = 2000; // 2秒轮询间隔

/**
 * Hook for fetching cluster status with HTTP polling
 */
export function useClusterStatus() {
  return useQuery({
    queryKey: ['raft-cluster', 'status'],
    queryFn: fetchClusterStatus,
    refetchInterval: REFETCH_INTERVAL,
    staleTime: 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook for fetching cluster metrics with HTTP polling
 */
export function useClusterMetrics() {
  return useQuery({
    queryKey: ['raft-cluster', 'metrics'],
    queryFn: fetchClusterMetrics,
    refetchInterval: REFETCH_INTERVAL,
    staleTime: 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook for cluster control operations
 */
export function useClusterControl() {
  const queryClient = useQueryClient();

  const startMutation = useMutation({
    mutationFn: startCluster,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raft-cluster'] });
    },
  });

  const stopMutation = useMutation({
    mutationFn: stopCluster,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raft-cluster'] });
    },
  });

  const restartMutation = useMutation({
    mutationFn: restartCluster,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raft-cluster'] });
    },
  });

  return {
    startCluster: startMutation.mutate,
    stopCluster: stopMutation.mutate,
    restartCluster: restartMutation.mutate,
    isStarting: startMutation.isPending,
    isStopping: stopMutation.isPending,
    isRestarting: restartMutation.isPending,
  };
}
