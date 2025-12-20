import React, {useEffect, useState} from 'react'

type DateTextInputProps = {
  value: string | null | undefined
  onChange: (isoDate: string) => void // expects 'YYYY-MM-DD' or ''
  className?: string
  placeholder?: string
}

/**
 * UX:
 * - User types only digits, we auto-insert slashes:
 *   "1" -> "1"
 *   "11" -> "11/"
 *   "1101" -> "11/01"
 *   "11012025" -> "11/01/2025"
 * - Paste also works: "11012025" => "11/01/2025"
 * - On blur we validate and emit ISO "YYYY-MM-DD" via onChange.
 * - Parent still stores ISO, so no backend changes.
 */
export const DateTextInput: React.FC<DateTextInputProps> = ({
  value,
  onChange,
  className,
  placeholder = 'dd/mm/yyyy',
}) => {
  const [display, setDisplay] = useState('')

  // --- helpers ---

  const formatFromDigits = (digits: string): string => {
    const clean = digits.replace(/\D/g, '').slice(0, 8) // ddMMyyyy max
    const len = clean.length

    if (len <= 2) {
      return clean
    }
    if (len <= 4) {
      // ddMM -> dd/MM
      return `${clean.slice(0, 2)}/${clean.slice(2)}`
    }
    // ddMMyyyy -> dd/MM/yyyy (partial year ok visually)
    return `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4)}`
  }

  const toIso = (day: number, month: number, year: number): string | null => {
    if (!day || !month || !year) return null
  
    // still validate with Date, but don't use toISOString()
    const date = new Date(year, month - 1, day)
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null
    }
  
    const dd = String(day).padStart(2, '0')
    const mm = String(month).padStart(2, '0')
    return `${year}-${mm}-${dd}` // pure ISO date, no timezone games
  }
  

  const parseToIso = (raw: string): string | null => {
    const trimmed = raw.trim()
    if (!trimmed) return '' // means "clear"

    // Accept full ISO manually if ever typed/pasted
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed
    }

    const digits = trimmed.replace(/\D/g, '')

    // Expect full ddMMyyyy (8 digits) to be valid
    if (digits.length !== 8) {
      return null
    }

    const d = parseInt(digits.slice(0, 2), 10)
    const m = parseInt(digits.slice(2, 4), 10)
    const y = parseInt(digits.slice(4, 8), 10)
    return toIso(d, m, y)
  }

  const isoToDisplay = (iso: string): string => {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || ''
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  }

  // --- sync from parent value (ISO) -> display (dd/mm/yyyy) ---

  useEffect(() => {
    if (!value) {
      setDisplay('')
      return
    }
    setDisplay(isoToDisplay(value))
  }, [value])

  // --- events ---

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const raw = e.target.value
    const digits = raw.replace(/\D/g, '')
    const formatted = formatFromDigits(digits)
    setDisplay(formatted)
  }

  const handleBlur = () => {
    const iso = parseToIso(display)

    // Invalid date → revert to last valid value from parent
    if (iso === null) {
      if (!value) {
        setDisplay('')
      } else {
        setDisplay(isoToDisplay(value))
      }
      return
    }

    // iso === '' → cleared
    if (iso === '') {
      onChange('')
      setDisplay('')
      return
    }

    // Valid ISO
    onChange(iso)
    setDisplay(isoToDisplay(iso))
  }

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') {
      ;(e.target as HTMLInputElement).blur()
    }
  }

  return (
    <input
      type='text'
      className={className}
      value={display}
      placeholder={placeholder}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      inputMode='numeric'
      autoComplete='off'
    />
  )
}
