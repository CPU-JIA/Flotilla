/**
 * ColorPicker Component
 *
 * Color selector with preset palette and custom hex input
 *
 * ECP-A1: Single Responsibility - Only handles color selection
 * ECP-B2: KISS - Simple preset grid + hex input
 * ECP-C1: Defensive Programming - Validates hex format
 */

'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/contexts/language-context'

interface ColorPickerProps {
  value: string // Hex color like "#FF0000"
  onChange: (color: string) => void
  disabled?: boolean
}

// ECP-D3: Named constants instead of magic values
const PRESET_COLORS = [
  { hex: '#D73A4A', name: 'Red (Bug)' },
  { hex: '#0075CA', name: 'Blue (Enhancement)' },
  { hex: '#FBCA04', name: 'Yellow (Question)' },
  { hex: '#7057FF', name: 'Purple (Feature)' },
  { hex: '#008672', name: 'Green (Confirmed)' },
  { hex: '#E99695', name: 'Light Red (Duplicate)' },
  { hex: '#F9D0C4', name: 'Orange (Help Wanted)' },
  { hex: '#D4C5F9', name: 'Light Purple (Good First Issue)' },
]

export function ColorPicker({ value, onChange, disabled = false }: ColorPickerProps) {
  const { t } = useLanguage()
  const [customHex, setCustomHex] = useState(value)

  // ECP-C1: Validate hex format
  const isValidHex = (hex: string): boolean => {
    return /^#[0-9A-Fa-f]{6}$/.test(hex)
  }

  const handleCustomHexChange = (input: string) => {
    // Auto-prepend # if missing
    let hex = input.trim()
    if (hex && !hex.startsWith('#')) {
      hex = '#' + hex
    }

    setCustomHex(hex)

    // Only update parent if valid
    if (isValidHex(hex)) {
      onChange(hex.toUpperCase())
    }
  }

  const handlePresetClick = (hex: string) => {
    setCustomHex(hex)
    onChange(hex)
  }

  return (
    <div className="space-y-3">
      <Label>{t.issues.labels.color}</Label>

      {/* Preset Colors Grid */}
      <div className="grid grid-cols-4 gap-2">
        {PRESET_COLORS.map((preset) => (
          <button
            key={preset.hex}
            type="button"
            onClick={() => handlePresetClick(preset.hex)}
            disabled={disabled}
            className={`
              h-10 rounded-md border-2 transition-all
              ${value === preset.hex ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-gray-300 hover:border-gray-400'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            style={{ backgroundColor: preset.hex }}
            title={preset.name}
            aria-label={preset.name}
          />
        ))}
      </div>

      {/* Custom Hex Input */}
      <div className="flex items-center gap-2">
        <div
          className="w-10 h-10 rounded-md border-2 border-gray-300 flex-shrink-0"
          style={{ backgroundColor: isValidHex(customHex) ? customHex : '#CCCCCC' }}
          aria-label="Color preview"
        />
        <div className="flex-1">
          <Input
            type="text"
            value={customHex}
            onChange={(e) => handleCustomHexChange(e.target.value)}
            placeholder="#FF0000"
            maxLength={7}
            disabled={disabled}
            className={`font-mono ${!isValidHex(customHex) && customHex ? 'border-red-500' : ''}`}
          />
          <p className="text-xs text-muted-foreground mt-1">{t.issues.labels.colorHelper}</p>
        </div>
      </div>
    </div>
  )
}
