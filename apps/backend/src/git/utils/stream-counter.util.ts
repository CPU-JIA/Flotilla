/**
 * Stream Size Counter
 *
 * 🔒 SECURITY FIX: Prevents DoS by monitoring actual streaming data size (CWE-400)
 * Fixes bypass of Content-Length check when using Transfer-Encoding: chunked
 *
 * ECP-C1: Defensive Programming - Validate all inputs (including streaming)
 * ECP-C2: Systematic Error Handling - Gracefully handle size limit violations
 */

import { Transform, TransformCallback } from 'stream';
import { Logger } from '@nestjs/common';

export interface StreamCounterOptions {
  maxSize: number; // Maximum allowed size in bytes
  operationName: string; // For logging/error messages
  onLimitExceeded?: (bytesReceived: number) => void; // Callback when limit exceeded
}

/**
 * StreamSizeCounter
 *
 * A Transform stream that counts bytes passing through and enforces size limits.
 * Works with both Content-Length and chunked Transfer-Encoding.
 *
 * Usage:
 * ```typescript
 * const counter = new StreamSizeCounter({ maxSize: 10 * 1024 * 1024, operationName: 'git-push' })
 * requestStream.pipe(counter).pipe(gitProcess.stdin)
 *
 * counter.on('error', (error) => {
 *   // Handle size limit exceeded
 * })
 * ```
 */
export class StreamSizeCounter extends Transform {
  private bytesReceived = 0;
  private readonly logger = new Logger(StreamSizeCounter.name);

  constructor(private readonly options: StreamCounterOptions) {
    super();
  }

  _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: TransformCallback,
  ): void {
    this.bytesReceived += chunk.length;

    // Check if size limit exceeded
    if (this.bytesReceived > this.options.maxSize) {
      const error = new Error(
        `${this.options.operationName}: Stream size limit exceeded. ` +
          `Received ${this.formatBytes(this.bytesReceived)}, ` +
          `maximum allowed is ${this.formatBytes(this.options.maxSize)}`,
      );
      error.name = 'PayloadTooLargeError';

      this.logger.warn(
        `🔒 ${this.options.operationName}: Size limit exceeded - ` +
          `${this.formatBytes(this.bytesReceived)} > ${this.formatBytes(this.options.maxSize)}`,
      );

      // Call callback if provided
      if (this.options.onLimitExceeded) {
        this.options.onLimitExceeded(this.bytesReceived);
      }

      // Emit error and stop processing
      callback(error);
      return;
    }

    // Pass chunk through
    callback(null, chunk);
  }

  /**
   * Get current bytes received
   */
  getBytesReceived(): number {
    return this.bytesReceived;
  }

  /**
   * Format bytes for human-readable output
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024)
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }
}

/**
 * Create a stream size counter with standard error handling
 *
 * @param options Counter options
 * @param onError Error handler (called when limit exceeded)
 * @returns Configured StreamSizeCounter
 */
export function createStreamSizeCounter(
  options: StreamCounterOptions,
  onError?: (error: Error) => void,
): StreamSizeCounter {
  const counter = new StreamSizeCounter(options);

  // Attach error handler if provided
  if (onError) {
    counter.on('error', onError);
  }

  return counter;
}
