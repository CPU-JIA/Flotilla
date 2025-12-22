/**
 * Stream Size Counter Tests
 *
 * 🔒 SECURITY: Test stream size limit enforcement
 */

import { Readable, Writable } from 'stream'
import { StreamSizeCounter, createStreamSizeCounter } from './stream-counter.util'

describe('StreamSizeCounter', () => {
  describe('Basic Functionality', () => {
    it('should allow streams within size limit', (done) => {
      const maxSize = 1024 // 1KB
      const counter = new StreamSizeCounter({
        maxSize,
        operationName: 'test',
      })

      const input = Readable.from([Buffer.from('Hello, World!')]) // 13 bytes
      const output: Buffer[] = []

      const writable = new Writable({
        write(chunk, encoding, callback) {
          output.push(chunk)
          callback()
        },
      })

      writable.on('finish', () => {
        expect(counter.getBytesReceived()).toBe(13)
        expect(Buffer.concat(output).toString()).toBe('Hello, World!')
        done()
      })

      input.pipe(counter).pipe(writable)
    })

    it('should reject streams exceeding size limit', (done) => {
      const maxSize = 10 // 10 bytes
      const counter = new StreamSizeCounter({
        maxSize,
        operationName: 'test',
      })

      const largeData = Buffer.alloc(20, 'x') // 20 bytes
      const input = Readable.from([largeData])

      counter.on('error', (error) => {
        expect(error.message).toContain('Stream size limit exceeded')
        expect(error.name).toBe('PayloadTooLargeError')
        expect(counter.getBytesReceived()).toBeGreaterThan(maxSize)
        done()
      })

      const writable = new Writable({
        write(chunk, encoding, callback) {
          callback()
        },
      })

      input.pipe(counter).pipe(writable)
    })

    it('should count cumulative size across multiple chunks', (done) => {
      const maxSize = 100
      const counter = new StreamSizeCounter({
        maxSize,
        operationName: 'test',
      })

      // Send data in 3 chunks: 30 + 30 + 30 = 90 bytes (within limit)
      const chunks = [
        Buffer.alloc(30, 'a'),
        Buffer.alloc(30, 'b'),
        Buffer.alloc(30, 'c'),
      ]

      const input = Readable.from(chunks)
      const output: Buffer[] = []

      const writable = new Writable({
        write(chunk, encoding, callback) {
          output.push(chunk)
          callback()
        },
      })

      writable.on('finish', () => {
        expect(counter.getBytesReceived()).toBe(90)
        expect(output.length).toBe(3)
        done()
      })

      input.pipe(counter).pipe(writable)
    })

    it('should detect limit exceeded in chunked stream', (done) => {
      const maxSize = 50
      const counter = new StreamSizeCounter({
        maxSize,
        operationName: 'test',
      })

      // Send data in chunks that exceed limit cumulatively
      const chunks = [
        Buffer.alloc(30, 'a'), // 30 bytes - OK
        Buffer.alloc(30, 'b'), // 60 bytes total - EXCEED
      ]

      const input = Readable.from(chunks)

      counter.on('error', (error) => {
        expect(error.message).toContain('Stream size limit exceeded')
        expect(counter.getBytesReceived()).toBe(60)
        done()
      })

      const writable = new Writable({
        write(chunk, encoding, callback) {
          callback()
        },
      })

      input.pipe(counter).pipe(writable)
    })
  })

  describe('onLimitExceeded Callback', () => {
    it('should call onLimitExceeded callback', (done) => {
      let callbackInvoked = false
      let bytesReceived = 0

      const counter = new StreamSizeCounter({
        maxSize: 10,
        operationName: 'test',
        onLimitExceeded: (bytes) => {
          callbackInvoked = true
          bytesReceived = bytes
        },
      })

      const largeData = Buffer.alloc(20, 'x')
      const input = Readable.from([largeData])

      counter.on('error', () => {
        expect(callbackInvoked).toBe(true)
        expect(bytesReceived).toBeGreaterThan(10)
        done()
      })

      const writable = new Writable({
        write(chunk, encoding, callback) {
          callback()
        },
      })

      input.pipe(counter).pipe(writable)
    })
  })

  describe('createStreamSizeCounter Factory', () => {
    it('should create counter with error handler', (done) => {
      let errorHandlerCalled = false

      const counter = createStreamSizeCounter(
        {
          maxSize: 10,
          operationName: 'test',
        },
        (error) => {
          errorHandlerCalled = true
          expect(error.message).toContain('Stream size limit exceeded')
          done()
        },
      )

      const largeData = Buffer.alloc(20, 'x')
      const input = Readable.from([largeData])

      const writable = new Writable({
        write(chunk, encoding, callback) {
          callback()
        },
      })

      input.pipe(counter).pipe(writable)
    })
  })

  describe('Size Formatting', () => {
    it('should track bytes correctly for various sizes', (done) => {
      const counter = new StreamSizeCounter({
        maxSize: 10 * 1024 * 1024, // 10MB
        operationName: 'test',
      })

      const data = Buffer.alloc(1024 * 1024, 'x') // 1MB
      const input = Readable.from([data])

      const writable = new Writable({
        write(chunk, encoding, callback) {
          callback()
        },
      })

      writable.on('finish', () => {
        expect(counter.getBytesReceived()).toBe(1024 * 1024)
        done()
      })

      input.pipe(counter).pipe(writable)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty stream', (done) => {
      const counter = new StreamSizeCounter({
        maxSize: 1024,
        operationName: 'test',
      })

      const input = Readable.from([])

      const writable = new Writable({
        write(chunk, encoding, callback) {
          callback()
        },
      })

      writable.on('finish', () => {
        expect(counter.getBytesReceived()).toBe(0)
        done()
      })

      input.pipe(counter).pipe(writable)
    })

    it('should handle exact size limit', (done) => {
      const maxSize = 100
      const counter = new StreamSizeCounter({
        maxSize,
        operationName: 'test',
      })

      const data = Buffer.alloc(100, 'x') // Exactly at limit
      const input = Readable.from([data])

      const writable = new Writable({
        write(chunk, encoding, callback) {
          callback()
        },
      })

      writable.on('finish', () => {
        expect(counter.getBytesReceived()).toBe(100)
        done()
      })

      input.pipe(counter).pipe(writable)
    })

    it('should reject when exceeding by 1 byte', (done) => {
      const maxSize = 100
      const counter = new StreamSizeCounter({
        maxSize,
        operationName: 'test',
      })

      const data = Buffer.alloc(101, 'x') // 1 byte over limit
      const input = Readable.from([data])

      counter.on('error', (error) => {
        expect(error.message).toContain('Stream size limit exceeded')
        done()
      })

      const writable = new Writable({
        write(chunk, encoding, callback) {
          callback()
        },
      })

      input.pipe(counter).pipe(writable)
    })
  })
})
