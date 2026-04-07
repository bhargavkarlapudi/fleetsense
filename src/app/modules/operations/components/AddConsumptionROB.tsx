import React, {forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState} from 'react'
import {Fields, Voyage} from '../core/_models'
import {useAuth} from '../../auth'
import {
  getConsumptionFuelTypes,
  getConsumptionMachineryTypes,
  getConsumptionByVoyage,
} from '../core/_requests'

export interface ConsumptionRequestDTO {
  reportId?: number // ✅ NEW
  userId?: string | number
  companyId?: string | number
  voyageId?: number
  rows?: {
    fieldType?: string
    initialRob?: number
    lastRob?: number
    machineries?: {machinery?: string; consumed?: number; rob?: number}[]
  }[]
}


export interface AddConsumptionROBRef {
  getPayload: () => {field: number; valueText: string}[]
  getDto: () => ConsumptionRequestDTO | null
}

interface Props {
  sectionTitle: string
  voyage: Voyage | null
  fields: Fields[]
  onChange: (label: string, id: number, value: string) => void
  values?: {[fieldId: number]: {value: string; label: string}}

  // ✅ NEW: parent can keep latest DTO even if tab unmounts
  onDtoChange?: (dto: ConsumptionRequestDTO | null) => void
  // Trigger fetch when tab is opened (changes on each open)
  refreshFlag?: number
}

interface MachineryRow {
  fieldId: number
  value: string
  consumedId: number
  consumed: string
  robId: number
  rob: string
}

interface OuterRow {
  fuelTypeId: number
  fuelType: string
  initialRobId: number
  initialRob: string
  robId: number // Last ROB
  rob: string
  machineries: MachineryRow[]
}

const AddConsumptionROB = forwardRef<AddConsumptionROBRef, Props>(
  ({sectionTitle, voyage, fields, onChange, values, onDtoChange, refreshFlag}, ref) => {
    const authCtx: any = useAuth()
    const token =
      authCtx?.auth?.auth?.jwt ||
      authCtx?.auth?.jwt ||
      sessionStorage.getItem('jwt') ||
      sessionStorage.getItem('token') ||
      ''

    const currentUser = authCtx?.currentUser

    const userId = String(currentUser?.id ?? '0')
    const companyId = String(
      currentUser?.company?.id ??
        currentUser?.companyId ??
        currentUser?.companyAdminId ??
        currentUser?.companyAdmin?.id ??
        currentUser?.companyGroupAdminId ??
        currentUser?.companyGroupAdmin?.id ??
        '0'
    )

    const [fuelOptionsApi, setFuelOptionsApi] = useState<string[]>([])
    const [machineryOptionsApi, setMachineryOptionsApi] = useState<string[]>([])
    const [previousRobMap, setPreviousRobMap] = useState<Record<string, {initial: string; last: string}>>({})
    const [optionsLoading, setOptionsLoading] = useState(true)
    const hasHydratedRef = useRef(false)

    // -------- helpers --------
    const norm = (s: any) => String(s ?? '').trim().toLowerCase()

    const smartParse = (raw: any) => {
      if (raw === undefined || raw === null || raw === '') return raw
      if (typeof raw !== 'string') return raw
      try {
        return JSON.parse(raw)
      } catch {
        return raw
      }
    }

    const toStringArray = (raw: any): string[] => {
      const v = smartParse(raw)
      if (v === undefined || v === null || v === '') return []
      if (Array.isArray(v)) return v.map(x => String(x))
      return [String(v)]
    }

    const toString2D = (raw: any): string[][] => {
      const v = smartParse(raw)
      if (!Array.isArray(v)) return []
      return v.map((row: any) => (Array.isArray(row) ? row.map(String) : [String(row)]))
    }

    const cleanNumberText = (v: any) => {
      const s = String(v ?? '').trim()
      if (s === '--') return ''
      return s
    }

    const fuelKey = (fuel: string) => norm(fuel)

    const firstNonEmptyNumberText = (...candidates: any[]) => {
      for (const c of candidates) {
        const val = cleanNumberText(c)
        if (val !== '') return val
      }
      return ''
    }

    // -------- field map (robust, prevents Initial ROB being treated as ROB) --------
    const fieldMap = useMemo(() => {
      const makeEmpty = (label: string): Fields => ({
        id: -1,
        label,
        fieldType: 'unknown',
        readOnly: false,
        isActive: false,
        required: false,
        submenuId: -1,
        optionsJson: [],
      })

      const findFirst = (pred: (f: Fields) => boolean, fallback: string) =>
        fields.find(pred) ?? makeEmpty(fallback)

      const findNth = (pred: (f: Fields) => boolean, n: number, fallback: string) => {
        const matches = fields.filter(pred)
        return matches[n - 1] ?? makeEmpty(fallback)
      }

      const isInitialRob = (f: Fields) => norm(f.label).includes('initial rob')

      // ✅ "ROB" fields but NOT "Initial ROB"
      const isRobField = (f: Fields) => {
        const l = norm(f.label)
        return l.includes('rob') && !l.includes('initial rob')
      }

      return {
        fuelTypeField: findFirst(f => norm(f.label).includes('fuel type'), 'Fuel Type'),
        initialRobField: findFirst(isInitialRob, 'Initial ROB'),

        outerRobField: findNth(isRobField, 1, 'ROB [outer]'),
        innerRobField: findNth(isRobField, 2, 'ROB [inner]'),

        machineryField: findFirst(f => norm(f.label).includes('machinery'), 'Machinery'),
        consumedField: findFirst(f => norm(f.label).includes('consumed'), 'Consumed'),
      }
    }, [fields])

    const {
      fuelTypeField,
      initialRobField,
      outerRobField,
      innerRobField,
      machineryField,
      consumedField,
    } = fieldMap

    const fuelOptions: string[] =
      fuelOptionsApi.length > 0 ? fuelOptionsApi : ((fuelTypeField.optionsJson as string[]) || [])

    const machineryOptions: string[] =
      machineryOptionsApi.length > 0 ? machineryOptionsApi : ((machineryField.optionsJson as string[]) || [])

    const makeEmptyRow = (): OuterRow => ({
      fuelTypeId: fuelTypeField.id,
      fuelType: '',
      initialRobId: initialRobField.id,
      initialRob: '',
      robId: outerRobField.id,
      rob: '0',
      machineries: [
        {
          fieldId: machineryField.id,
          value: '',
          consumedId: consumedField.id,
          consumed: '',
          robId: innerRobField.id,
          rob: '',
        },
      ],
    })

    const [rows, setRows] = useState<OuterRow[]>([makeEmptyRow()])

    // ✅ Build DTO from current rows (independent of dynamic fields)
    const buildDtoFromRows = (copy: OuterRow[]): ConsumptionRequestDTO | null => {
      if (!voyage?.id) return null

      const parsedUserId = Number(userId)
      const parsedCompanyId = Number(companyId)

      const mappedRows = copy
        .filter(r => !!String(r.fuelType ?? '').trim())
        .map(r => {
          const key = fuelKey(String(r.fuelType ?? ''))
          const prev = previousRobMap[key]
          const providedInitial = parseNumberSafe(r.initialRob)
          const prevInitial = parseNumberSafe(prev?.initial)
          const prevLast = parseNumberSafe(prev?.last)
          const firstMachRob = parseNumberSafe(r.machineries?.[0]?.rob)
          const firstMachConsumed = parseNumberSafe(r.machineries?.[0]?.consumed)
          const derivedFromMach = firstMachRob !== null && firstMachConsumed !== null ? firstMachRob + firstMachConsumed : null

          const machConsumedTotal = (r.machineries || []).reduce((sum, m) => {
            const c = parseNumberSafe(m.consumed)
            return sum + (c ?? 0)
          }, 0)

          const lastTextRaw = cleanNumberText(r.rob)
          const lastText = lastTextRaw || cleanNumberText(prev?.last) || ''

          const initialNum =
            providedInitial ??
            prevInitial ??
            derivedFromMach ??
            prevLast ??
            0

          const computedFromConsumption =
            initialNum !== null && initialNum !== undefined
              ? initialNum - machConsumedTotal
              : null

          const derivedLast =
            (machConsumedTotal > 0 && computedFromConsumption !== null ? computedFromConsumption : null) ??
            parseNumberSafe(lastText) ??
            (computedFromConsumption !== null ? computedFromConsumption : null) ??
            firstMachRob ??
            prevLast ??
            0

          return {
            fieldType: String(r.fuelType ?? '').trim(),
            initialRob: Number(initialNum),
            lastRob: Number(derivedLast),
            machineries: (r.machineries || [])
              .filter(m => !!String(m.value ?? '').trim())
              .map(m => ({
                machinery: String(m.value ?? '').trim(),
                consumed: Number(cleanNumberText(m.consumed) || 0),
                rob: Number(cleanNumberText(m.rob) || 0),
              })),
          }
        })

      return {
        userId: Number.isFinite(parsedUserId) ? parsedUserId : undefined,
        companyId: Number.isFinite(parsedCompanyId) ? parsedCompanyId : undefined,
        voyageId: Number(voyage.id),
        rows: mappedRows,
      }
    }

    // ✅ Always push latest DTO to parent (so save/submit works even if tab unmounts)
    useEffect(() => {
      onDtoChange?.(buildDtoFromRows(rows))
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rows, voyage?.id, userId, companyId, previousRobMap])

    // keep ids in sync when template fields arrive
    useEffect(() => {
      setRows(prev =>
        prev.map(r => ({
          ...r,
          fuelTypeId: fuelTypeField.id,
          initialRobId: initialRobField.id,
          robId: outerRobField.id,
          machineries: r.machineries.map(m => ({
            ...m,
            fieldId: machineryField.id,
            consumedId: consumedField.id,
            robId: innerRobField.id,
          })),
        }))
      )
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      fuelTypeField.id,
      initialRobField.id,
      outerRobField.id,
      machineryField.id,
      consumedField.id,
      innerRobField.id,
    ])

    const emitAllToParent = (copy: OuterRow[]) => {
      const allFuelTypes = copy.map(r => r.fuelType)
      const allInitialRobs = copy.map(r => cleanNumberText(r.initialRob))
      const allOuterRobs = copy.map(r => cleanNumberText(r.rob))
      const allMachinery = copy.map(r => r.machineries.map(m => m.value))
      const allConsumed = copy.map(r => r.machineries.map(m => cleanNumberText(m.consumed)))
      const allInnerRobs = copy.map(r => r.machineries.map(m => cleanNumberText(m.rob)))

      // NOTE: These are for old dynamic report storage; safe to keep (only runs if IDs exist)
      if (fuelTypeField.id > 0) onChange(fuelTypeField.label, fuelTypeField.id, JSON.stringify(allFuelTypes))
      if (initialRobField.id > 0) onChange(initialRobField.label, initialRobField.id, JSON.stringify(allInitialRobs))
      if (outerRobField.id > 0) onChange(outerRobField.label, outerRobField.id, JSON.stringify(allOuterRobs))
      if (machineryField.id > 0) onChange(machineryField.label, machineryField.id, JSON.stringify(allMachinery))
      if (consumedField.id > 0) onChange(consumedField.label, consumedField.id, JSON.stringify(allConsumed))
      if (innerRobField.id > 0) onChange(innerRobField.label, innerRobField.id, JSON.stringify(allInnerRobs))

      // ✅ NEW: also push DTO to parent
      onDtoChange?.(buildDtoFromRows(copy))
    }

    // ✅ fetch dropdown options
    useEffect(() => {
      setOptionsLoading(true)
      const run = async () => {
        try {
          const [fuels, machs] = await Promise.all([
            getConsumptionFuelTypes(token),
            getConsumptionMachineryTypes(token),
          ])
          setFuelOptionsApi(Array.isArray(fuels) ? fuels : [])
          setMachineryOptionsApi(Array.isArray(machs) ? machs : [])
        } catch (e) {
          console.warn('Consumption options API failed', e)
        } finally {
          setOptionsLoading(false)
        }
      }
      run()
    }, [token])

    const hasMeaningfulValues = (vals?: {[fieldId: number]: {value: any; label: string}}) => {
      if (!vals) return false
      return Object.values(vals).some(v => {
        const val = v?.value
        if (val === undefined || val === null) return false
        if (typeof val === 'string') return val.trim() !== ''
        if (Array.isArray(val)) return val.some(x => String(x ?? '').trim() !== '')
        return String(val ?? '').trim() !== ''
      })
    }

    // ✅ hydrate from props.values (only if values exist and non-empty)
    useEffect(() => {
      if (hasHydratedRef.current) return
      if (!values || !hasMeaningfulValues(values)) return

      if (
        fuelTypeField.id <= 0 ||
        outerRobField.id <= 0 ||
        machineryField.id <= 0 ||
        consumedField.id <= 0 ||
        innerRobField.id <= 0
      )
        return

      const fuelTypes = toStringArray(values[fuelTypeField.id]?.value)
      const initialRobs = initialRobField.id > 0 ? toStringArray(values[initialRobField.id]?.value) : []
      const outerRobs = toStringArray(values[outerRobField.id]?.value)
      const machs = toString2D(values[machineryField.id]?.value)
      const cons = toString2D(values[consumedField.id]?.value)
      const inner = toString2D(values[innerRobField.id]?.value)

      const count = Math.max(fuelTypes.length, initialRobs.length, outerRobs.length, machs.length, 1)

      const built: OuterRow[] = Array.from({length: count}).map((_, i) => {
        const fuel = String(fuelTypes[i] ?? '')
        const init = String(initialRobs[i] ?? '')
        const last = String(outerRobs[i] ?? '0')

        const mArr = machs[i] ?? []
        const cArr = cons[i] ?? []
        const rArr = inner[i] ?? []

        const machineries: MachineryRow[] = (mArr.length ? mArr : ['']).map((m, j) => ({
          fieldId: machineryField.id,
          value: String(m ?? ''),
          consumedId: consumedField.id,
          consumed: String(cArr[j] ?? ''),
          robId: innerRobField.id,
          rob: String(rArr[j] ?? ''),
        }))

        return {
          fuelTypeId: fuelTypeField.id,
          fuelType: fuel,
          initialRobId: initialRobField.id,
          initialRob: cleanNumberText(init),
          robId: outerRobField.id,
          rob: cleanNumberText(last) || '0',
          machineries: machineries.length ? machineries : [makeEmptyRow().machineries[0]],
        }
      })

      setRows(built)
      emitAllToParent(built)
      hasHydratedRef.current = true
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      values,
      fuelTypeField.id,
      initialRobField.id,
      outerRobField.id,
      machineryField.id,
      consumedField.id,
      innerRobField.id,
    ])

    // ✅ load saved consumption by voyage (previous records)
    useEffect(() => {
      const load = async () => {
        if (!voyage?.id) return

        try {
          const data = await getConsumptionByVoyage(token, voyage.id)

          const map: Record<string, {initial: string; last: string}> = {}
          const discoveredFuelTypes: Set<string> = new Set()
          if (data?.rows?.length) {
            data.rows.forEach((r: any) => {
              const ftRaw = String(r?.fieldType ?? '')
              const key = fuelKey(ftRaw)
              if (!key) return
              if (ftRaw) discoveredFuelTypes.add(ftRaw)

              const machList = Array.isArray(r?.machineries) ? r.machineries : []
              const lastFromMachinery = machList.length ? machList[0]?.rob : undefined

              const last = firstNonEmptyNumberText(
                lastFromMachinery ?? '',
                r?.lastRob,
                r?.rob,
                r?.last_rob,
                '0'
              )
              const initial = firstNonEmptyNumberText(
                r?.initialRob,
                r?.initial_rob,
                lastFromMachinery,
                last
              )

              map[key] = {
                initial: initial || last,
                last: last || '0',
              }
            })
            setPreviousRobMap(map)

            if (discoveredFuelTypes.size) {
              setFuelOptionsApi(prev => {
                const merged = new Set(prev)
                discoveredFuelTypes.forEach(f => merged.add(f))
                return Array.from(merged)
              })
            }
          }

          // Always show latest backend rows
          if (data?.rows?.length) {
            const initialRows: OuterRow[] = data.rows.map((r: any) => {
              const ft = String(r.fieldType ?? '')
              const machList = Array.isArray(r?.machineries) ? r.machineries : []
              const lastFromMachinery = machList.length ? machList[0]?.rob : undefined
              const init = cleanNumberText(r?.initialRob ?? r?.initial_rob ?? '')
              const last = cleanNumberText(
                lastFromMachinery ??
                  r?.lastRob ??
                  r?.rob ??
                  r?.last_rob ??
                  '0'
              ) || '0'

              const machListForUi = machList.length ? machList : [{}]

              return {
                fuelTypeId: fuelTypeField.id,
                fuelType: ft,
                initialRobId: initialRobField.id,
                initialRob: cleanNumberText(String(init ?? '')),
                robId: outerRobField.id,
                rob: cleanNumberText(String(last ?? '0')) || '0',
                machineries: machListForUi.map((m: any) => ({
                  fieldId: machineryField.id,
                  value: String(m.machinery ?? ''),
                  consumedId: consumedField.id,
                  // Do not auto-fill consumed; user should enter it each report
                  consumed: '',
                  robId: innerRobField.id,
                  rob: String(m.rob ?? ''),
                })),
              }
            })

            const finalRows = initialRows.length ? initialRows : [makeEmptyRow()]
            setRows(finalRows)
            emitAllToParent(finalRows)
            hasHydratedRef.current = true
          }
        } catch (e) {
          // no record yet
        }
      }

      load()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [voyage?.id, fuelTypeField.id, machineryField.id, refreshFlag])

    useImperativeHandle(
      ref,
      () => ({
        getPayload: () => {
          const allFuelTypes = rows.map(r => r.fuelType)
          const allInitialRobs = rows.map(r => cleanNumberText(r.initialRob))
          const allOuterRobs = rows.map(r => cleanNumberText(r.rob))
          const allMachinery = rows.map(r => r.machineries.map(m => m.value))
          const allConsumed = rows.map(r => r.machineries.map(m => cleanNumberText(m.consumed)))
          const allInnerRobs = rows.map(r => r.machineries.map(m => cleanNumberText(m.rob)))

          const payload: {field: number; valueText: string}[] = []
          if (fuelTypeField.id > 0) payload.push({field: fuelTypeField.id, valueText: JSON.stringify(allFuelTypes)})
          if (initialRobField.id > 0) payload.push({field: initialRobField.id, valueText: JSON.stringify(allInitialRobs)})
          if (outerRobField.id > 0) payload.push({field: outerRobField.id, valueText: JSON.stringify(allOuterRobs)})
          if (machineryField.id > 0) payload.push({field: machineryField.id, valueText: JSON.stringify(allMachinery)})
          if (consumedField.id > 0) payload.push({field: consumedField.id, valueText: JSON.stringify(allConsumed)})
          if (innerRobField.id > 0) payload.push({field: innerRobField.id, valueText: JSON.stringify(allInnerRobs)})
          return payload
        },

        getDto: () => buildDtoFromRows(rows),
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [rows, voyage?.id, userId, companyId, previousRobMap]
    )

    const removeOuterRow = (outerIndex: number) => {
      setRows(rs => {
        if (rs.length <= 1) return rs
        const next = rs.filter((_, idx) => idx !== outerIndex)
        emitAllToParent(next)
        return next
      })
    }

    const addOuterRow = () => {
      setRows(rs => {
        const next = [...rs, makeEmptyRow()]
        emitAllToParent(next)
        return next
      })
    }

    const addInnerRow = (outerIndex: number) => {
      setRows(rs => {
        const copy = [...rs]
        copy[outerIndex] = {
          ...copy[outerIndex],
          machineries: [
            ...copy[outerIndex].machineries,
            {
              fieldId: machineryField.id,
              value: '',
              consumedId: consumedField.id,
              consumed: '',
              robId: innerRobField.id,
              rob: '',
            },
          ],
        }
        emitAllToParent(copy)
        return copy
      })
    }

    const removeInnerRow = (outerIndex: number, innerIndex: number) => {
      setRows(rs => {
        const copy = [...rs]
        if (copy[outerIndex].machineries.length > 1) {
          copy[outerIndex] = {
            ...copy[outerIndex],
            machineries: copy[outerIndex].machineries.filter((_, i) => i !== innerIndex),
          }
        }
        emitAllToParent(copy)
        return copy
      })
    }

    const resolveOuterRobBase = (robText: string, initialText: string) => {
      const robClean = cleanNumberText(robText)
      const initClean = cleanNumberText(initialText)

      // If rob is empty, fall back to initial
      if (robClean === '') {
        const initNum = parseFloat(initClean)
        return Number.isFinite(initNum) ? initNum : 0
      }

      const robNum = parseFloat(robClean)
      if (robClean === '0' && initClean !== '') {
        const initNum = parseFloat(initClean)
        if (Number.isFinite(initNum)) return initNum
      }

      if (Number.isFinite(robNum)) return robNum

      const initNum = parseFloat(initClean)
      return Number.isFinite(initNum) ? initNum : 0
    }

    const parseNumberSafe = (text: any): number | null => {
      const clean = cleanNumberText(text)
      if (clean === '') return null
      const num = parseFloat(clean)
      return Number.isFinite(num) ? num : null
    }

    const deriveBaseRob = (row: OuterRow, prevLastText?: string) => {
      const baseFromInitial = parseNumberSafe(row.initialRob)
      if (baseFromInitial !== null) return baseFromInitial

      const baseFromPrevLast = parseNumberSafe(prevLastText)
      if (baseFromPrevLast !== null) return baseFromPrevLast

      const baseFromOuter = parseNumberSafe(row.rob)
      if (baseFromOuter !== null) return baseFromOuter

      return 0
    }

    const computeTotalConsumed = (machineries: MachineryRow[]) =>
      machineries.reduce((sum, m) => sum + (parseNumberSafe(m.consumed) ?? 0), 0)

    const applyConsumptionMath = (row: OuterRow, prevLastText?: string): OuterRow => {
      const baseRob = deriveBaseRob(row, prevLastText)

      const updatedMachineries = row.machineries.map(mach => {
        const consumedNum = parseNumberSafe(mach.consumed) ?? 0
        const robNum = baseRob - consumedNum
        return {...mach, rob: Number.isFinite(robNum) ? String(robNum) : ''}
      })

      const totalConsumed = computeTotalConsumed(updatedMachineries)
      const lastRobNum = baseRob - totalConsumed

      return {
        ...row,
        machineries: updatedMachineries,
        rob: Number.isFinite(lastRobNum) ? String(lastRobNum) : '0',
      }
    }

    const updateOuter = (
      outerIndex: number,
      key: 'fuelType' | 'rob' | 'initialRob',
      value: string
    ) => {
      setRows(rs => {
        const copy = [...rs]
        let row = {...copy[outerIndex], [key]: cleanNumberText(value)} as OuterRow

        if (key === 'fuelType') {
          const prev = previousRobMap[fuelKey(value)]
          const lastRob = cleanNumberText(prev?.last ?? '')
          const initialFromPrev = lastRob || cleanNumberText(prev?.initial ?? '')

          // Always seed initial ROB from the latest known ROB for that fuel type
          if (initialFromPrev) {
            row.initialRob = initialFromPrev
          }

          row = applyConsumptionMath(row, lastRob)
        } else if (key === 'initialRob') {
          row = applyConsumptionMath(row)
        }

        copy[outerIndex] = row
        emitAllToParent(copy)
        return copy
      })
    }

    const updateInner = (
      outerIndex: number,
      innerIndex: number,
      key: 'value' | 'consumed' | 'rob',
      value: string
    ) => {
      setRows(rs => {
        const copy = [...rs]
        const row = copy[outerIndex]
        const mach = row.machineries[innerIndex]

        const updatedMach: MachineryRow = {
          ...mach,
          [key]: key === 'value' ? value : cleanNumberText(value),
        } as MachineryRow

        const newMachineries = row.machineries.map((m, i) => (i === innerIndex ? updatedMach : m))

        copy[outerIndex] = applyConsumptionMath({...row, machineries: newMachineries})

        emitAllToParent(copy)
        return copy
      })
    }

    const shimmerKeyframes = `
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
    `

    const shimmerBaseStyle: React.CSSProperties = {
      background: 'linear-gradient(90deg, #f5f7fb 0%, #eef1f6 50%, #f5f7fb 100%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.3s ease-in-out infinite',
      borderRadius: '8px',
    }

    const renderLoaderRow = () => (
      <div className="border rounded p-5 mb-4">
        <div className="d-flex align-items-center gap-2 mb-3">
          <div style={{...shimmerBaseStyle, height: '38px', width: '40px'}} />
          <div style={{...shimmerBaseStyle, height: '38px', width: '160px'}} />
          <div style={{...shimmerBaseStyle, height: '38px', width: '140px'}} />
          <div style={{...shimmerBaseStyle, height: '38px', width: '120px'}} />
          <div style={{...shimmerBaseStyle, height: '38px', width: '60px'}} />
        </div>
        <div className="d-flex align-items-center gap-2 ms-4">
          <div style={{...shimmerBaseStyle, height: '32px', width: '32px', borderRadius: '6px'}} />
          <div style={{...shimmerBaseStyle, height: '36px', width: '180px'}} />
          <div style={{...shimmerBaseStyle, height: '36px', width: '120px'}} />
          <div style={{...shimmerBaseStyle, height: '36px', width: '100px'}} />
          <div style={{...shimmerBaseStyle, height: '32px', width: '32px', borderRadius: '6px'}} />
        </div>
      </div>
    )

    return (
      <>
        <style>{shimmerKeyframes}</style>
        <div className="px-3">
          <h4 className="fw-bold text-dark py-3">{sectionTitle}</h4>

          {optionsLoading ? (
            <>
              {renderLoaderRow()}
              {renderLoaderRow()}
            </>
          ) : (
            rows.map((row, oi) => (
              <div key={oi} className="border rounded p-5 mb-4">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <button
                    type="button"
                    className="btn btn-action btn-action-primary"
                    onClick={addOuterRow}
                  >
                    +
                  </button>

                  <select
                    className="form-select"
                    value={row.fuelType}
                    onChange={e => updateOuter(oi, 'fuelType', e.target.value)}
                  >
                    <option value="">Select Fuel Type</option>
                    {fuelOptions.map(opt => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    className="form-control"
                    placeholder="Initial ROB"
                    value={row.initialRob}
                    onChange={e => updateOuter(oi, 'initialRob', e.target.value)}
                  />

                  <input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    className="form-control"
                    placeholder="Last ROB"
                    value={row.rob}
                    readOnly
                  />

                  <button
                    type="button"
                    className="btn btn-action btn-action-danger"
                    onClick={() => removeOuterRow(oi)}
                    disabled={rows.length === 1}
                  >
                    -
                  </button>
                </div>

                {row.machineries.map((mach, ii) => (
                  <div key={ii} className="d-flex align-items-center gap-2 ms-4 mb-2">
                    <button
                      type="button"
                      className="btn btn-action-sm btn-action-secondary-primary"
                      onClick={() => addInnerRow(oi)}
                    >
                      +
                    </button>

                    <select
                      className="form-select"
                      value={mach.value}
                      onChange={e => updateInner(oi, ii, 'value', e.target.value)}
                    >
                      <option value="">Select Machinery</option>
                      {machineryOptions.map(opt => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>

                    <input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    className="form-control"
                    placeholder="Consumed"
                    value={mach.consumed}
                    onChange={e => updateInner(oi, ii, 'consumed', e.target.value)}
                  />

                    <input
                      type="number"
                      step="any"
                      inputMode="decimal"
                      className="form-control"
                      placeholder="ROB"
                      value={mach.rob}
                      readOnly
                    />

                    <button
                      type="button"
                      className="btn btn-action-sm btn-action-secondary-danger"
                      onClick={() => removeInnerRow(oi, ii)}
                      disabled={row.machineries.length === 1}
                    >
                      -
                    </button>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </>
    )
  }
)

export default AddConsumptionROB
