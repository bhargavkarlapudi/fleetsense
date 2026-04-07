// src/app/modules/Technical/pages/Machinery/EquipmentModal.tsx
import React, { FC, useEffect, useMemo, useState } from 'react'
import type { EquipmentDto } from '../../core/_models'
import type { Vessel } from '../../../Management/core/_models'
import { useAuth } from '../../../auth'
import { getVesselList, getCompanyList, getCompanyAdminList } from '../../../Management/core/_requests'
import { getVesselLocations, VesselLocationDto } from '../../core/_requests'

type CompanyGroup = { id: number; name: string }
type Subcompany = { id: number; name: string; companyId: number }

interface EquipmentModalProps {
  visible: boolean
  vesselId?: number
  editing?: EquipmentDto
  onClose: () => void
  onSubmit: (data: EquipmentDto) => void
  allEquipment?: EquipmentDto[]   
}

const LABEL = 'form-label fw-semibold fs-6 mb-2 text-dark'
const WRAP_STYLE: React.CSSProperties = {
  background: 'rgba(0,0,0,0.5)',
  position: 'fixed',
  inset: 0,
  zIndex: 1050,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const EQUIPMENT_NAME_OPTIONS: { group: string; items: string[] }[] = [
  { group: 'Main Engine', items: ['Main Engine 1', 'Main Engine 2', 'Main Engine 3'] },
  { group: 'Auxiliary Engine', items: ['Auxiliary Engine 1', 'Auxiliary Engine 2', 'Auxiliary Engine 3'] },
  { group: 'Boiler', items: ['Boiler 1', 'Boiler 2', 'Boiler 3'] },
  { group: 'Special Systems', items: ['IGG', 'IGS', 'EGCS'] },
  { group: 'Purifier - FO', items: ['Purifier-FO 1', 'Purifier-FO 2', 'Purifier-FO 3'] },
  { group: 'Purifier - LO', items: ['Purifier-LO 1', 'Purifier-LO 2', 'Purifier-LO 3'] },
  {
    group: 'Others',
    items: [
      'Other Machinery',
      'Deck',
      'MARPOL',
      'LSA',
      'FFA',
      'Cargo Gear',
      'Cargo Pumps',
      'MLC',
      'Other Equipment',
    ],
  },
]

const EQUIPMENT_CODE_OPTIONS: { value: string; label: string }[] = [
  { value: 'ENGDK', label: 'ENGDK - Engine Deck' },
  { value: 'CREQ', label: 'CREQ - Critical Equipment' },
  { value: 'MARPOL', label: 'MARPOL' },
  { value: 'LSA', label: 'LSA - Life Saving Appliances' },
  { value: 'FFA', label: 'FFA - Fire Fighting Appliances' },
  { value: 'CGGR', label: 'CGGR - Cargo Gear' },
  { value: 'CGOP', label: 'CGOP - Cargo Pumps' },
  { value: 'MLC', label: 'MLC' },
  { value: 'NAV', label: 'NAV - Navigation' },
  { value: 'OTHERS', label: 'OTHERS - Other Equipment' },
]

const SHORT_FORM_MAP: Record<string, string> = {
  'MAIN ENGINE 1': 'MENG1',
  'MAIN ENGINE 2': 'MENG2',
  'MAIN ENGINE 3': 'MENG3',
  'AUXILIARY ENGINE 1': 'AENG1',
  'AUXILIARY ENGINE 2': 'AENG2',
  'AUXILIARY ENGINE 3': 'AENG3',
  'BOILER 1': 'BLR1',
  'BOILER 2': 'BLR2',
  'BOILER 3': 'BLR3',
  'IGG': 'IGG',
  'IGS': 'IGS',
  'EGCS': 'EGCS',
  'PURIFIER-FO 1': 'PFO1',
  'PURIFIER-FO 2': 'PFO2',
  'PURIFIER-FO 3': 'PFO3',
  'PURIFIER-LO 1': 'PLO1',
  'PURIFIER-LO 2': 'PLO2',
  'PURIFIER-LO 3': 'PLO3',
  'DECK': 'DECK',
  'MARPOL': 'MPL',
  'LSA': 'LSA',
  'FFA': 'FFA',
  'CARGO GEAR': 'CG',
  'CARGO PUMPS': 'CP',
  'MLC': 'MLC',
  'OTHER MACHINERY': 'OM',
  'OTHER EQUIPMENT': 'OE',
}

const LABEL_HELP_SUBHEAD =
  'Sub Head / Details (for MARPOL, LSA, FFA, Other Machinery)'

export const EquipmentModal: FC<EquipmentModalProps> = ({
  visible,
  vesselId: initialVesselId,
  editing,
  onClose,
  onSubmit,
  allEquipment,
}) => {
  const { currentUser, auth } = useAuth()
  const roleId = Number((auth?.userDetails as any)?.roleId ?? (currentUser?.role?.id ?? 0)) || 0
  const isCrew = roleId === 4

  const [vessels, setVessels] = useState<Vessel[]>([])
  const [vesselsScoped, setVesselsScoped] = useState<Vessel[]>([])
  const [companies, setCompanies] = useState<CompanyGroup[]>([])
  const [subcompanies, setSubcompanies] = useState<Subcompany[]>([])
  const [companyId, setCompanyId] = useState<string>('')
  const [subcompanyId, setSubcompanyId] = useState<string>('')
  const [vesselLocations, setVesselLocations] = useState<VesselLocationDto[]>([])
  const [locationSearchText, setLocationSearchText] = useState<string>('')

  const [formData, setFormData] = useState<EquipmentDto>({
    vesselId: initialVesselId || editing?.vesselId || 0,
    name: editing?.name || '',
    code: editing?.code || '',
    shortForm: editing?.shortForm || '',
    criticality: editing?.criticality || false,
    subHead: editing?.subHead || '',
    maker: editing?.maker || '',
    model: editing?.model || '',
    serialNumber: editing?.serialNumber || '',
    installationDate: editing?.installationDate || '',
    location: editing?.location || '',
    isClassCritical: editing?.isClassCritical || false,
    isSurveyRelevant: editing?.isSurveyRelevant || false,
    vesselLocationId: editing?.vesselLocationId || undefined,
    equipmentFunctionDescription: editing?.equipmentFunctionDescription || '',
  })

  const [selectedEquipmentName, setSelectedEquipmentName] = useState<string>('')
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

const existingNamesSet = useMemo(() => {
  if (!formData.vesselId || !allEquipment) return new Set<string>()

  const normalized = allEquipment
    .filter(e =>
      e.vesselId === formData.vesselId &&
      (!editing || e.id !== editing.id) // allow the name of the record we're editing
    )
    .map(e => e.name.toUpperCase().trim())

  return new Set(normalized)
}, [allEquipment, formData.vesselId, editing?.id])


  useEffect(() => {
    if (!visible) return

    const loadLookups = async () => {
      try {
        const [groupsRaw, adminsRaw, vesselList] = await Promise.all([
          getCompanyAdminList?.().catch(() => []),
          getCompanyList?.().catch(() => []),
          getVesselList().catch(() => [] as Vessel[]),
        ])

        const groups: CompanyGroup[] = Array.isArray(groupsRaw)
          ? groupsRaw.map((g: any) => ({
              id: Number(g.id),
              name: g.name ?? g.companyGroupAdminName ?? `Group #${g.id}`,
            }))
          : []

        const admins: Subcompany[] = Array.isArray(adminsRaw)
          ? adminsRaw.map((a: any) => ({
              id: Number(a.id),
              name: a.name ?? a.companyAdminName ?? `Company #${a.id}`,
              companyId: Number(
                a.cgaid?.id ??
                a.cga?.id ??
                a.companyGroupAdminId ??
                a.companyGroupId
              ),
            }))
          : []

        setCompanies(groups.filter(g => Number.isFinite(g.id)))
        setSubcompanies(admins.filter(a => Number.isFinite(a.id) && Number.isFinite(a.companyId)))

        // scope vessels
        let vesselsForUser: Vessel[] = []
        if (isCrew) {
          const vId = currentUser?.vessel?.id
          vesselsForUser = vId ? vesselList.filter((v: any) => v.id === vId) : []
          if (vId) {
            setFormData(prev => ({ ...prev, vesselId: vId }))
          }
        } else {
          const operatorActsLikeSuperadmin = roleId === 6 && !currentUser?.companyGroupAdminId
          const operatorActsLikeGroupAdmin = roleId === 6 && !!currentUser?.companyGroupAdminId

          vesselsForUser = vesselList.filter((v: any) => {
            const isActive = v?.active ?? true
            if (roleId === 1 || operatorActsLikeSuperadmin) return isActive
            if (roleId === 5 || operatorActsLikeGroupAdmin) {
              const cgaId = currentUser?.companyGroupAdminId ?? currentUser?.companyGroupAdmin?.id
              return isActive && (v?.companyGroupAdmin?.id === cgaId || v?.companyGroupId === cgaId)
            }
            if (roleId === 2) {
              const caId = currentUser?.companyAdminId ?? currentUser?.companyAdmin?.id
              return isActive && (v?.companyAdmin?.id === caId || v?.companyId === caId)
            }
            return false
          })
        }

        setVessels(vesselList)
        setVesselsScoped(vesselsForUser)

        if (!isCrew && !formData.vesselId && vesselsForUser.length > 0) {
          setFormData(prev => ({ ...prev, vesselId: vesselsForUser[0].id }))
        }
      } catch (error) {
        console.error('Error loading lookups for equipment modal:', error)
      }
    }

    loadLookups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  // Load vessel locations when vesselId changes
  useEffect(() => {
    const loadVesselLocations = async () => {
      if (!formData.vesselId || formData.vesselId === 0) {
        setVesselLocations([])
        return
      }
      try {
        const locations = await getVesselLocations(formData.vesselId)
        setVesselLocations(locations)
      } catch (error) {
        console.error('Error loading vessel locations:', error)
        setVesselLocations([])
      }
    }
    loadVesselLocations()
  }, [formData.vesselId])

  useEffect(() => {
    if (editing) {
      const allNames = EQUIPMENT_NAME_OPTIONS.flatMap(g => g.items)
      const matched = allNames.find(item => item.toLowerCase() === editing.name.toLowerCase())
      if (matched) {
        setSelectedEquipmentName(matched)
      } else {
        setSelectedEquipmentName(editing.name)
      }
    } else {
      setSelectedEquipmentName('')
    }
    setErrors({})
  }, [editing])

  const vesselsForModal = useMemo(() => {
    let list = vesselsScoped
    if (companyId) {
      const cid = Number(companyId)
      list = list.filter((v: any) => Number(v.companyGroupAdmin?.id ?? v.companyGroupId) === cid)
    }
    if (subcompanyId) {
      const scid = Number(subcompanyId)
      list = list.filter((v: any) => Number(v.companyAdmin?.id ?? v.companyId) === scid)
    }
    return list
  }, [vesselsScoped, companyId, subcompanyId])

  const subcompaniesForCompany = useMemo(() => {
    if (!companyId) return []
    const cid = Number(companyId)
    return subcompanies.filter(sc => sc.companyId === cid)
  }, [subcompanies, companyId])

  const generateShortForm = (name: string): string => {
    if (!name) return ''
    const key = name.toUpperCase().trim()
    if (SHORT_FORM_MAP[key]) return SHORT_FORM_MAP[key]

    const words = key.split(/\s+/)
    let shortForm = ''
    for (const w of words) {
      if (/^\d+$/.test(w)) {
        shortForm += w
      } else if (w.length > 0) {
        shortForm += w[0]
      }
    }
    return shortForm
  }

  const deriveDefaultCodeFromName = (value: string): string => {
    const upper = value.toUpperCase()
    if (
      upper.startsWith('MAIN ENGINE') ||
      upper.startsWith('AUXILIARY ENGINE') ||
      upper.startsWith('BOILER') ||
      upper.startsWith('PURIFIER-FO') ||
      upper.startsWith('PURIFIER-LO') ||
      upper === 'DECK' ||
      upper === 'IGG' ||
      upper === 'IGS' ||
      upper === 'EGCS'
    ) {
      return 'ENGDK'
    }
    if (upper === 'MARPOL') return 'MARPOL'
    if (upper === 'LSA') return 'LSA'
    if (upper === 'FFA') return 'FFA'
    if (upper === 'CARGO GEAR') return 'CGGR'
    if (upper === 'CARGO PUMPS') return 'CGOP'
    if (upper === 'MLC') return 'MLC'
    return 'OTHERS'
  }

  const usesSubHead = (equipmentName: string): boolean => {
    const upper = equipmentName.toUpperCase()
    return upper === 'MARPOL' || upper === 'LSA' || upper === 'FFA' || upper === 'OTHER MACHINERY'
  }

  const handleEquipmentNameChange = (value: string) => {
    setSelectedEquipmentName(value)

    const shortForm = generateShortForm(value)
    const defaultCode = deriveDefaultCodeFromName(value)

    setFormData(prev => ({
      ...prev,
      name: value,
      shortForm,
      code: prev.code && prev.code.length > 0 ? prev.code : defaultCode,
      subHead: usesSubHead(value) ? prev.subHead || '' : '',
    }))
    if (errors.name) setErrors(prev => ({ ...prev, name: '' }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: { [key: string]: string } = {}

    if (!formData.vesselId || formData.vesselId === 0) {
      newErrors.vesselId = 'Vessel is required'
    }
    if (!selectedEquipmentName || !selectedEquipmentName.trim()) {
      newErrors.name = 'Equipment name is required'
    }

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    const finalName = selectedEquipmentName.trim()
    const finalShortForm = formData.shortForm || generateShortForm(finalName)

    const payload: EquipmentDto = {
      ...formData,
      name: finalName,
      shortForm: finalShortForm,
    }

    onSubmit(payload)
  }

  if (!visible) return null

  return (
    <div style={WRAP_STYLE} tabIndex={-1} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className='bg-white text-dark rounded shadow-lg d-flex flex-column'
        style={{ width: '720px', maxWidth: '95vw' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className='d-flex align-items-center justify-content-between border-bottom px-4 py-3 flex-shrink-0'>
          <h5 className='modal-title text-dark mx-6 mt-6'>{editing ? 'Edit Equipment' : 'Add Equipment'}</h5>
          <button type='button' className='btn-close mx-6 mt-0' onClick={onClose}></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className='flex-grow-1 overflow-auto px-4 py-3 m-6'>
            <div className='row g-3'>
              {/* Company helper */}
              {!isCrew && (
                <div className='col-md-6'>
                  <label className={LABEL}>Company</label>
                  <select
                    className='form-select text-dark'
                    value={companyId}
                    onChange={(e) => {
                      setCompanyId(e.target.value)
                      setSubcompanyId('')
                      setFormData(prev => ({ ...prev, vesselId: 0 }))
                    }}
                  >
                    <option value=''>All Companies</option>
                    {companies.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Subcompany helper */}
              {!isCrew && Boolean(companyId) && subcompaniesForCompany.length > 0 && (
                <div className='col-md-6'>
                  <label className={LABEL}>Subcompany</label>
                  <select
                    className='form-select text-dark'
                    value={subcompanyId}
                    onChange={(e) => {
                      setSubcompanyId(e.target.value)
                      setFormData(prev => ({ ...prev, vesselId: 0 }))
                    }}
                  >
                    <option value=''>All Subcompanies</option>
                    {subcompaniesForCompany.map((sc) => (
                      <option key={sc.id} value={String(sc.id)}>
                        {sc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Vessel */}
              <div className='col-md-12'>
                <label className={LABEL}>
                  Vessel <span className='text-danger'>*</span>
                </label>
                {isCrew ? (
                  <input
                    type='text'
                    className='form-control text-dark'
                    value={currentUser?.vessel?.fleet_name || 'Vessel'}
                    disabled
                  />
                ) : (
                  <select
                    className={`form-select text-dark ${errors.vesselId ? 'is-invalid' : ''}`}
                    value={formData.vesselId || ''}
                    onChange={(e) => {
                      const vId = Number(e.target.value)
                      setFormData(prev => ({ ...prev, vesselId: vId }))
                      if (errors.vesselId) setErrors(prev => ({ ...prev, vesselId: '' }))
                    }}
                  >
                    <option value=''>Select Vessel</option>
                    {vesselsForModal.map(v => (
                      <option key={v.id} value={v.id}>
                        {(v as any).fleet_name || `Vessel ${v.id}`}
                      </option>
                    ))}
                  </select>
                )}
                {errors.vesselId && <div className='invalid-feedback'>{errors.vesselId}</div>}
              </div>

              {/* Equipment Name */}
              <div className='col-md-12'>
  <label className={LABEL}>
    Equipment Name <span className='text-danger'>*</span>
  </label>
  <select
    className={`form-select text-dark ${errors.name ? 'is-invalid' : ''}`}
    value={selectedEquipmentName}
    onChange={(e) => handleEquipmentNameChange(e.target.value)}
  >
    <option value=''>Select Equipment Name</option>
    {EQUIPMENT_NAME_OPTIONS.map(group => (
      <optgroup key={group.group} label={group.group}>
        {group.items.map(item => {
          const upperItem = item.toUpperCase().trim()
          const isCurrentEditingName =
            editing && editing.name.toUpperCase().trim() === upperItem
          const isAlreadyUsed = existingNamesSet.has(upperItem)

          // Hide from dropdown if already used on THIS vessel (except the one we are editing)
          if (isAlreadyUsed && !isCurrentEditingName) {
            return null
          }

          return (
            <option key={item} value={item}>
              {item}
            </option>
          )
        })}
      </optgroup>
    ))}
  </select>
  {errors.name && <div className='invalid-feedback'>{errors.name}</div>}
</div>


              {/* Equipment Code */}
              <div className='col-md-6'>
                <label className={LABEL}>Equipment Code</label>
                <select
                  className='form-select text-dark'
                  value={formData.code || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                >
                  <option value=''>Select Code</option>
                  {EQUIPMENT_CODE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Short Form */}
              {/* <div className='col-md-6'>
                <label className={LABEL}>Short Form</label>
                <input
                  type='text'
                  className='form-control text-dark'
                  value={formData.shortForm || ''}
                  readOnly
                  style={{ backgroundColor: '#f8f9fa' }}
                  placeholder='Auto-generated from Equipment Name'
                />
                <div className='form-text text-muted'>Auto-generated from equipment name</div>
              </div> */}

              {/* Critical (Yes / No) */}
<div className='col-md-6 mt-3'>
  <label className={LABEL}>
    Critical Equipment
  </label>
  <div className='d-flex align-items-center gap-4 mt-1'>
    <div className='form-check form-check-inline'>
      <input
        className='form-check-input'
        type='radio'
        name='criticality'
        id='criticalYes'
        value='yes'
        checked={!!formData.criticality}
        onChange={() =>
          setFormData(prev => ({ ...prev, criticality: true }))
        }
      />
      <label className='form-check-label' htmlFor='criticalYes'>
        Yes
      </label>
    </div>

    <div className='form-check form-check-inline'>
      <input
        className='form-check-input'
        type='radio'
        name='criticality'
        id='criticalNo'
        value='no'
        checked={!formData.criticality}
        onChange={() =>
          setFormData(prev => ({ ...prev, criticality: false }))
        }
      />
      <label className='form-check-label' htmlFor='criticalNo'>
        No
      </label>
    </div>
  </div>
</div>


              {/* Sub Head */}
              {usesSubHead(selectedEquipmentName) && (
                <div className='col-md-12'>
                  <label className={LABEL}>{LABEL_HELP_SUBHEAD}</label>
                  <input
                    type='text'
                    className='form-control text-dark'
                    value={formData.subHead || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, subHead: e.target.value }))}
                    placeholder='Enter sub head or specific description'
                  />
                </div>
              )}

              {/* Maker */}
              <div className='col-md-6'>
                <label className={LABEL}>Maker</label>
                <input
                  type='text'
                  className='form-control text-dark'
                  value={formData.maker || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, maker: e.target.value }))}
                  placeholder='Equipment manufacturer'
                />
              </div>

              {/* Model */}
              <div className='col-md-6'>
                <label className={LABEL}>Model</label>
                <input
                  type='text'
                  className='form-control text-dark'
                  value={formData.model || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                  placeholder='Equipment model'
                />
              </div>

              {/* Serial Number */}
              <div className='col-md-6'>
                <label className={LABEL}>Serial Number</label>
                <input
                  type='text'
                  className='form-control text-dark'
                  value={formData.serialNumber || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
                  placeholder='Serial number'
                />
              </div>

              {/* Installation Date */}
              <div className='col-md-6'>
                <label className={LABEL}>Installation Date</label>
                <input
                  type='date'
                  className='form-control text-dark'
                  value={formData.installationDate || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, installationDate: e.target.value }))}
                />
              </div>

              {/* Location */}
              <div className='col-md-12'>
                <label className={LABEL}>Location</label>
                <input
                  type='text'
                  className='form-control text-dark'
                  value={formData.location || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder='Equipment location on vessel'
                />
              </div>

              {/* Vessel Location (Dropdown with search) */}
              <div className='col-md-12'>
                <label className={LABEL}>Vessel Location</label>
                {vesselLocations.length > 0 ? (
                  <>
                    <input
                      type='text'
                      className='form-control text-dark mb-2'
                      value={locationSearchText}
                      onChange={(e) => setLocationSearchText(e.target.value)}
                      placeholder='Search by code or description...'
                    />
                    <select
                      className='form-select text-dark'
                      value={formData.vesselLocationId || ''}
                      onChange={(e) => {
                        const locId = e.target.value ? Number(e.target.value) : undefined
                        setFormData(prev => ({ ...prev, vesselLocationId: locId }))
                      }}
                    >
                      <option value=''>Select Vessel Location</option>
                      {vesselLocations
                        .filter(loc => {
                          if (!locationSearchText) return true
                          const search = locationSearchText.toLowerCase()
                          return (
                            loc.code.toLowerCase().includes(search) ||
                            (loc.description?.toLowerCase().includes(search) ?? false)
                          )
                        })
                        .map(loc => (
                          <option key={loc.id} value={loc.id}>
                            {loc.code} - {loc.description || 'No description'}
                          </option>
                        ))}
                    </select>
                    {formData.vesselLocationId && (
                      <div className='form-text text-muted mt-1'>
                        <strong>Comments:</strong>{' '}
                        {vesselLocations.find(l => l.id === formData.vesselLocationId)?.comments || 'None'}
                      </div>
                    )}
                  </>
                ) : (
                  <div className='form-text text-warning'>
                    No vessel locations defined for this vessel. Please create locations in the Vessel Location master first.
                  </div>
                )}
              </div>

              {/* Equipment Function Description */}
              <div className='col-md-12'>
                <label className={LABEL}>Equipment Function Description</label>
                <input
                  type='text'
                  className='form-control text-dark'
                  value={formData.equipmentFunctionDescription || ''}
                  onChange={(e) => {
                    const value = e.target.value.slice(0, 50) // Max 50 chars
                    setFormData(prev => ({ ...prev, equipmentFunctionDescription: value }))
                  }}
                  placeholder='e.g., MAIN PROPULSION & ACCESSORIES'
                  maxLength={50}
                />
                <div className='form-text text-muted'>Max 50 characters</div>
              </div>

              {/* Class Critical */}
              <div className='col-md-6 mt-3'>
                <label className={LABEL}>Class/Safety Critical</label>
                <div className='d-flex align-items-center gap-4 mt-1'>
                  <div className='form-check form-check-inline'>
                    <input
                      className='form-check-input'
                      type='radio'
                      name='isClassCritical'
                      id='classCriticalYes'
                      value='yes'
                      checked={!!formData.isClassCritical}
                      onChange={() => setFormData(prev => ({ ...prev, isClassCritical: true }))}
                    />
                    <label className='form-check-label' htmlFor='classCriticalYes'>Yes</label>
                  </div>
                  <div className='form-check form-check-inline'>
                    <input
                      className='form-check-input'
                      type='radio'
                      name='isClassCritical'
                      id='classCriticalNo'
                      value='no'
                      checked={!formData.isClassCritical}
                      onChange={() => setFormData(prev => ({ ...prev, isClassCritical: false }))}
                    />
                    <label className='form-check-label' htmlFor='classCriticalNo'>No</label>
                  </div>
                </div>
              </div>

              {/* Survey Relevant */}
              <div className='col-md-6 mt-3'>
                <label className={LABEL}>Survey Relevant</label>
                <div className='d-flex align-items-center gap-4 mt-1'>
                  <div className='form-check form-check-inline'>
                    <input
                      className='form-check-input'
                      type='radio'
                      name='isSurveyRelevant'
                      id='surveyRelevantYes'
                      value='yes'
                      checked={!!formData.isSurveyRelevant}
                      onChange={() => setFormData(prev => ({ ...prev, isSurveyRelevant: true }))}
                    />
                    <label className='form-check-label' htmlFor='surveyRelevantYes'>Yes</label>
                  </div>
                  <div className='form-check form-check-inline'>
                    <input
                      className='form-check-input'
                      type='radio'
                      name='isSurveyRelevant'
                      id='surveyRelevantNo'
                      value='no'
                      checked={!formData.isSurveyRelevant}
                      onChange={() => setFormData(prev => ({ ...prev, isSurveyRelevant: false }))}
                    />
                    <label className='form-check-label' htmlFor='surveyRelevantNo'>No</label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className='border-top d-flex justify-content-end gap-2 px-4 py-3 flex-shrink-0 m-6'>
            <button type='button' className='btn btn-light btn-sm' onClick={onClose}>
              Cancel
            </button>
            <button type='submit' className='btn btn-primary btn-sm'>
              {editing ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
