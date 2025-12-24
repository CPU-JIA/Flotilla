/**
 * useToast Hook - Unit Tests
 *
 * ECP-D1: Design for Testability - Comprehensive test coverage for toast hook
 * Tests all toast variants, loading states, and edge cases
 *
 * @jest-environment jsdom
 */

import { renderHook } from '@testing-library/react'
import { useToast } from '../use-toast'
import { toast as sonnerToast } from 'sonner'

// Mock sonner library
jest.mock('sonner', () => ({
  toast: jest.fn(() => 'toast-id'),
}))

describe('useToast', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('toast() method', () => {
    it('should call sonner toast with default variant', () => {
      const { result } = renderHook(() => useToast())

      result.current.toast({
        title: 'Test notification',
        description: 'Test description',
      })

      expect(sonnerToast).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ duration: 4000 })
      )
    })

    it('should call sonner toast with custom duration', () => {
      const { result } = renderHook(() => useToast())

      result.current.toast({
        title: 'Test notification',
        duration: 6000,
      })

      expect(sonnerToast).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ duration: 6000 })
      )
    })

    it('should handle title-only toast', () => {
      const { result } = renderHook(() => useToast())

      result.current.toast({
        title: 'Simple notification',
      })

      expect(sonnerToast).toHaveBeenCalledWith(
        'Simple notification',
        expect.any(Object)
      )
    })
  })

  describe('success() method', () => {
    it('should call sonner success toast', () => {
      const sonnerSuccessMock = jest.fn()
      ;(sonnerToast as any).success = sonnerSuccessMock

      const { result } = renderHook(() => useToast())

      result.current.success('Success message', 'Operation completed')

      expect(sonnerSuccessMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ duration: 4000 })
      )
    })

    it('should handle success toast with custom duration', () => {
      const sonnerSuccessMock = jest.fn()
      ;(sonnerToast as any).success = sonnerSuccessMock

      const { result } = renderHook(() => useToast())

      result.current.success('Success', 'Done', 5000)

      expect(sonnerSuccessMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ duration: 5000 })
      )
    })
  })

  describe('error() method', () => {
    it('should call sonner error toast', () => {
      const sonnerErrorMock = jest.fn()
      ;(sonnerToast as any).error = sonnerErrorMock

      const { result } = renderHook(() => useToast())

      result.current.error('Error occurred', 'Something went wrong')

      expect(sonnerErrorMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ duration: 4000 })
      )
    })

    it('should handle error toast without description', () => {
      const sonnerErrorMock = jest.fn()
      ;(sonnerToast as any).error = sonnerErrorMock

      const { result } = renderHook(() => useToast())

      result.current.error('Error occurred')

      expect(sonnerErrorMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(Object)
      )
    })
  })

  describe('info() method', () => {
    it('should call sonner info toast', () => {
      const sonnerInfoMock = jest.fn()
      ;(sonnerToast as any).info = sonnerInfoMock

      const { result } = renderHook(() => useToast())

      result.current.info('Information', 'Please note')

      expect(sonnerInfoMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ duration: 4000 })
      )
    })
  })

  describe('warning() method', () => {
    it('should call sonner warning toast', () => {
      const sonnerWarningMock = jest.fn()
      ;(sonnerToast as any).warning = sonnerWarningMock

      const { result } = renderHook(() => useToast())

      result.current.warning('Warning', 'Be careful')

      expect(sonnerWarningMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ duration: 4000 })
      )
    })
  })

  describe('loading() method', () => {
    it('should call sonner loading toast', () => {
      const sonnerLoadingMock = jest.fn()
      ;(sonnerToast as any).loading = sonnerLoadingMock

      const { result } = renderHook(() => useToast())

      result.current.loading('Loading', 'Please wait')

      expect(sonnerLoadingMock).toHaveBeenCalled()
    })

    it('should handle loading toast without description', () => {
      const sonnerLoadingMock = jest.fn()
      ;(sonnerToast as any).loading = sonnerLoadingMock

      const { result } = renderHook(() => useToast())

      result.current.loading('Processing...')

      expect(sonnerLoadingMock).toHaveBeenCalledWith('Processing...')
    })
  })

  describe('promise() method', () => {
    it('should expose sonner promise method', () => {
      const sonnerPromiseMock = jest.fn()
      ;(sonnerToast as any).promise = sonnerPromiseMock

      const { result } = renderHook(() => useToast())

      expect(result.current.promise).toBe(sonnerPromiseMock)
    })
  })

  describe('dismiss() method', () => {
    it('should expose sonner dismiss method', () => {
      const sonnerDismissMock = jest.fn()
      ;(sonnerToast as any).dismiss = sonnerDismissMock

      const { result } = renderHook(() => useToast())

      expect(result.current.dismiss).toBe(sonnerDismissMock)
    })
  })

  describe('variant handling', () => {
    it('should handle destructive variant as error', () => {
      const sonnerErrorMock = jest.fn()
      ;(sonnerToast as any).error = sonnerErrorMock

      const { result } = renderHook(() => useToast())

      result.current.toast({
        title: 'Destructive action',
        variant: 'destructive',
      })

      expect(sonnerErrorMock).toHaveBeenCalled()
    })

    it('should handle success variant', () => {
      const sonnerSuccessMock = jest.fn()
      ;(sonnerToast as any).success = sonnerSuccessMock

      const { result } = renderHook(() => useToast())

      result.current.toast({
        title: 'Success',
        variant: 'success',
      })

      expect(sonnerSuccessMock).toHaveBeenCalled()
    })

    it('should handle info variant', () => {
      const sonnerInfoMock = jest.fn()
      ;(sonnerToast as any).info = sonnerInfoMock

      const { result } = renderHook(() => useToast())

      result.current.toast({
        title: 'Info',
        variant: 'info',
      })

      expect(sonnerInfoMock).toHaveBeenCalled()
    })

    it('should handle warning variant', () => {
      const sonnerWarningMock = jest.fn()
      ;(sonnerToast as any).warning = sonnerWarningMock

      const { result } = renderHook(() => useToast())

      result.current.toast({
        title: 'Warning',
        variant: 'warning',
      })

      expect(sonnerWarningMock).toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('should handle empty title gracefully', () => {
      const { result } = renderHook(() => useToast())

      result.current.toast({
        title: '',
      })

      expect(sonnerToast).toHaveBeenCalled()
    })

    it('should handle very long titles and descriptions', () => {
      const { result } = renderHook(() => useToast())
      const longText = 'a'.repeat(1000)

      result.current.toast({
        title: longText,
        description: longText,
      })

      expect(sonnerToast).toHaveBeenCalled()
    })

    it('should handle special characters in messages', () => {
      const { result } = renderHook(() => useToast())

      result.current.toast({
        title: '<script>alert("xss")</script>',
        description: '{"json": "object"}',
      })

      expect(sonnerToast).toHaveBeenCalled()
    })
  })
})
