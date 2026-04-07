// src/app/modules/Technical/pages/Machinery/MachineryDetails.tsx
import { FC, useState, useEffect, useMemo } from 'react'
import { KTSVG } from '../../../../../_metronic/helpers'
import { toast } from 'react-toastify'
import { useAuth } from '../../../auth'
import { getVesselList, getCompanyList, getCompanyAdminList } from '../../../Management/core/_requests'
import {
  getEquipmentList,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  getEquipmentComponentsByEquipment,
  createEquipmentComponent,
  updateEquipmentComponent,
  deleteEquipmentComponent,
  getSubcomponentsByComponent,
  createSubcomponent,
  updateSubcomponent,
  deleteSubcomponent,
  getPartsBySubcomponent,
  getPartsByVessel,
  createPartForSubcomponent,
  deletePart,
  getVesselMachineryCounts,
} from '../../core/_requests'
import type {
  Vessel,
  EquipmentDto,
  EquipmentComponentDto,
  SubcomponentDto,
  PartDto,
  VesselMachineryCountsDto,
} from '../../core/_models'
import { EquipmentModal } from './EquipmentModal'
import { ComponentModal } from './ComponentModal'
import { SubcomponentModal } from './SubcomponentModal'
import PartModal from './PartModal'

type CompanyGroup = { id: number; name: string }
type Subcompany = { id: number; name: string; companyId: number }

type ExpandedState = {
  vessels: Set<number>
  equipment: Set<number>
  components: Set<number>
  subcomponents: Set<number>
}

const MachineryDetails: FC = () => {
  const { currentUser, auth } = useAuth()
  const roleId = Number((auth?.userDetails as any)?.roleId ?? (currentUser?.role?.id ?? 0)) || 0
  const isCrew = roleId === 4

  const [vessels, setVessels] = useState<Vessel[]>([])
  const [vesselsScoped, setVesselsScoped] = useState<Vessel[]>([])
  const [companies, setCompanies] = useState<CompanyGroup[]>([])
  const [subcompanies, setSubcompanies] = useState<Subcompany[]>([])
  const [equipment, setEquipment] = useState<EquipmentDto[]>([])
  const [components, setComponents] = useState<EquipmentComponentDto[]>([])
  const [subcomponents, setSubcomponents] = useState<SubcomponentDto[]>([])
  const [parts, setParts] = useState<PartDto[]>([])
  const [loading, setLoading] = useState(false)
  const [vesselCounts, setVesselCounts] = useState<Map<number, VesselMachineryCountsDto>>(new Map())

  const [filters, setFilters] = useState<{
    companyId: string
    subcompanyId: string
    vesselId: string
  }>({
    companyId: '',
    subcompanyId: '',
    vesselId: '',
  })

  const [searchTerm, setSearchTerm] = useState('')
  const [expanded, setExpanded] = useState<ExpandedState>({
    vessels: new Set(),
    equipment: new Set(),
    components: new Set(),
    subcomponents: new Set(),
  })

  // Modals
  const [equipmentModal, setEquipmentModal] = useState<{ open: boolean; editing?: EquipmentDto }>({ open: false })
  const [componentModal, setComponentModal] = useState<{ open: boolean; editing?: EquipmentComponentDto; equipmentId?: number }>({ open: false })
  const [subcomponentModal, setSubcomponentModal] = useState<{ open: boolean; editing?: SubcomponentDto; componentId?: number }>({ open: false })
  const [partModal, setPartModal] = useState<{ open: boolean; editing?: PartDto; subcomponentId?: number }>({ open: false })

  // ─────────────────────────────────────────────
  // Initial lookups
  // ─────────────────────────────────────────────
  useEffect(() => {
    loadLookups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (vesselsScoped.length > 0) {
      loadEquipment()
      loadVesselCounts()
    } else {
      setEquipment([])
      setComponents([])
      setSubcomponents([])
      setParts([])
      setVesselCounts(new Map())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vesselsScoped])

  // Reload equipment when vessel filter changes
  useEffect(() => {
    if (filters.vesselId) {
      loadEquipment()
    } else {
      // Clear data when no vessel is selected
      setEquipment([])
      setComponents([])
      setSubcomponents([])
      setParts([])
    }
    // Load vessel counts when filter changes (especially for "All Vessels")
    loadVesselCounts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.vesselId, filters.companyId, filters.subcompanyId])

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

      // Scope vessels for current user
      let vesselsForUser: Vessel[] = []
      if (isCrew) {
        const vId = currentUser?.vessel?.id
        vesselsForUser = vId ? vesselList.filter((v: any) => v.id === vId) : []
        if (vId) {
          setFilters(prev => ({ ...prev, vesselId: String(vId) }))
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

      // Auto-select first vessel for office roles
      if (vesselsForUser.length > 0 && !filters.vesselId && !isCrew) {
        const firstVessel = vesselsForUser[0]
        const v: any = firstVessel
        const companyGroupId = v.companyGroupAdmin?.id ?? v.companyGroupId ?? v.cgaid?.id ?? null
        const companyAdminId = v.companyAdmin?.id ?? v.companyId ?? null
        setFilters({
          companyId: companyGroupId ? String(companyGroupId) : '',
          subcompanyId: companyAdminId ? String(companyAdminId) : '',
          vesselId: String(firstVessel.id),
        })
      }
    } catch (error) {
      console.error('Error loading lookups:', error)
      toast.error('Failed to load lookups')
    }
  }

  // ─────────────────────────────────────────────
  // Data loaders (keep logic as-is)
  // ─────────────────────────────────────────────
  const loadEquipment = async () => {
    setLoading(true)
    try {
      // Filter equipment by selected vessel if vesselId is set
      const vesselId = filters.vesselId ? Number(filters.vesselId) : undefined
      const data = await getEquipmentList(vesselId)
      setEquipment(data)

      const allComponents: EquipmentComponentDto[] = []
      for (const eq of data) {
        if (eq.id) {
          const comps = await getEquipmentComponentsByEquipment(eq.id)
          allComponents.push(...comps)
        }
      }
      setComponents(allComponents)

      const allSubcomponents: SubcomponentDto[] = []
      for (const comp of allComponents) {
        if (comp.id) {
          const subs = await getSubcomponentsByComponent(comp.id)
          allSubcomponents.push(...subs)
          for (const sub of subs) {
            if (sub.id) {
              const partList = await getPartsBySubcomponent(sub.id)
              setParts(prev => {
                const remaining = prev.filter(p => p.subcomponent?.id !== sub.id && p.subcomponentId !== sub.id)
                return [...remaining, ...partList]
              })
            }
          }
        }
      }
      setSubcomponents(allSubcomponents)

      // Load Parts for all vessels in scope (or selected vessel)
      if (filters.vesselId) {
        try {
          const vesselParts = await getPartsByVessel(Number(filters.vesselId))
          setParts(vesselParts)
        } catch (error) {
          console.error('Error loading parts:', error)
          setParts([])
        }
      } else if (vesselsScoped.length > 0) {
        // Load parts for all scoped vessels
        const allParts: PartDto[] = []
        for (const vessel of vesselsScoped) {
          try {
            const vesselParts = await getPartsByVessel(vessel.id)
            allParts.push(...vesselParts)
          } catch (error) {
            console.error(`Error loading parts for vessel ${vessel.id}:`, error)
          }
        }
        setParts(allParts)
      }
    } catch (error) {
      console.error('Error loading equipment:', error)
      toast.error('Failed to load equipment')
    } finally {
      setLoading(false)
    }
  }

  const loadComponentsForEquipment = async (equipmentId: number) => {
    try {
      const comps = await getEquipmentComponentsByEquipment(equipmentId)
      setComponents(prev => {
        const existing = prev.filter(c => c.equipmentId !== equipmentId)
        return [...existing, ...comps]
      })
    } catch (error) {
      console.error('Error loading components:', error)
    }
  }

  const loadSubcomponentsForComponent = async (componentId: number) => {
    try {
      const subs = await getSubcomponentsByComponent(componentId)
      setSubcomponents(prev => {
        const existing = prev.filter(s => s.equipmentComponent?.id !== componentId)
        return [...existing, ...subs]
      })
      for (const sub of subs) {
        if (sub.id) {
          const partList = await getPartsBySubcomponent(sub.id)
          setParts(prev => {
            const remaining = prev.filter(p => p.subcomponent?.id !== sub.id && p.subcomponentId !== sub.id)
            return [...remaining, ...partList]
          })
        }
      }
    } catch (error) {
      console.error('Error loading subcomponents:', error)
    }
  }

  const loadPartsForSubcomponent = async (subcomponentId: number) => {
    const partList = await getPartsBySubcomponent(subcomponentId)
    setParts(prev => {
      const remaining = prev.filter(p => p.subcomponent?.id !== subcomponentId && p.subcomponentId !== subcomponentId)
      return [...remaining, ...partList]
    })
  }

  const loadVesselCounts = async () => {
    try {
      const vesselId = filters.vesselId ? Number(filters.vesselId) : undefined
      const counts = await getVesselMachineryCounts(vesselId)
      const countsMap = new Map<number, VesselMachineryCountsDto>()
      counts.forEach(count => {
        countsMap.set(count.vesselId, count)
      })
      setVesselCounts(countsMap)
    } catch (error) {
      console.error('Error loading vessel counts:', error)
      // Don't show error toast as this is a background operation
    }
  }

  // ─────────────────────────────────────────────
  // Expand / collapse handlers
  // ─────────────────────────────────────────────
  const handleToggleVessel = (vesselId: number) => {
    setExpanded(prev => {
      const vesselsSet = new Set(prev.vessels)
      vesselsSet.has(vesselId) ? vesselsSet.delete(vesselId) : vesselsSet.add(vesselId)
      return { ...prev, vessels: vesselsSet }
    })
    setFilters(prev => ({ ...prev, vesselId: String(vesselId) }))
  }

  const handleToggleEquipment = (equipmentId: number) => {
    setExpanded(prev => {
      const eqSet = new Set(prev.equipment)
      if (eqSet.has(equipmentId)) {
        eqSet.delete(equipmentId)
      } else {
        eqSet.add(equipmentId)
        // ensure fresh components
        loadComponentsForEquipment(equipmentId)
      }
      return { ...prev, equipment: eqSet }
    })
  }

  const handleToggleComponent = (componentId: number) => {
    setExpanded(prev => {
      const compSet = new Set(prev.components)
      if (compSet.has(componentId)) {
        compSet.delete(componentId)
      } else {
        compSet.add(componentId)
        // ensure fresh subcomponents
        loadSubcomponentsForComponent(componentId)
      }
      return { ...prev, components: compSet }
    })
  }

  const handleToggleSubcomponent = (subcomponentId: number) => {
    setExpanded(prev => {
      const subSet = new Set(prev.subcomponents)
      if (subSet.has(subcomponentId)) {
        subSet.delete(subcomponentId)
      } else {
        subSet.add(subcomponentId)
        // ensure fresh parts
        loadPartsForSubcomponent(subcomponentId)
      }
      return { ...prev, subcomponents: subSet }
    })
  }

  // ─────────────────────────────────────────────
  // CRUD handlers (same logic, cleaned a bit)
  // ─────────────────────────────────────────────
  const handleCreateEquipment = async (data: EquipmentDto) => {
    try {
      await createEquipment(data)
      toast.success('Equipment created successfully')
      setEquipmentModal({ open: false })
      await loadEquipment()
    } catch (error: any) {
      console.error(error)
      toast.error(error?.message || 'Failed to create equipment')
    }
  }

  const handleUpdateEquipment = async (id: number, data: EquipmentDto) => {
    try {
      await updateEquipment(id, data)
      toast.success('Equipment updated successfully')
      setEquipmentModal({ open: false })
      await loadEquipment()
    } catch (error: any) {
      console.error(error)
      toast.error(error?.message || 'Failed to update equipment')
    }
  }

  const handleDeleteEquipment = async (id: number) => {
    if (!window.confirm('Delete this equipment? This will also delete all components and subcomponents.')) return
    try {
      await deleteEquipment(id)
      toast.success('Equipment deleted successfully')
      await loadEquipment()
    } catch (error: any) {
      console.error(error)
      toast.error(error?.message || 'Failed to delete equipment')
    }
  }

  const handleCreateComponent = async (data: EquipmentComponentDto) => {
    try {
      await createEquipmentComponent(data)
      toast.success('Component created successfully')
      setComponentModal({ open: false })
      if (data.equipmentId) {
        await loadComponentsForEquipment(data.equipmentId)
      }
    } catch (error: any) {
      console.error(error)
      toast.error(error?.message || 'Failed to create component')
    }
  }

  const handleUpdateComponent = async (id: number, data: EquipmentComponentDto) => {
    try {
      await updateEquipmentComponent(id, data)
      toast.success('Component updated successfully')
      setComponentModal({ open: false })
      if (data.equipmentId) {
        await loadComponentsForEquipment(data.equipmentId)
      }
    } catch (error: any) {
      console.error(error)
      toast.error(error?.message || 'Failed to update component')
    }
  }

  const handleDeleteComponent = async (id: number) => {
    if (!window.confirm('Delete this component? This will also delete all subcomponents.')) return
    try {
      await deleteEquipmentComponent(id)
      toast.success('Component deleted successfully')
      setComponents(prev => prev.filter(c => c.id !== id))
      setSubcomponents(prev => prev.filter(s => s.equipmentComponent?.id !== id))
    } catch (error: any) {
      console.error(error)
      toast.error(error?.message || 'Failed to delete component')
    }
  }

  const handleCreateSubcomponent = async (data: SubcomponentDto) => {
    try {
      await createSubcomponent(data)
      toast.success('Subcomponent created successfully')
      setSubcomponentModal({ open: false })
      if (data.equipmentComponent?.id) {
        await loadSubcomponentsForComponent(data.equipmentComponent.id)
      }
    } catch (error: any) {
      console.error(error)
      toast.error(error?.message || 'Failed to create subcomponent')
    }
  }

  const handleUpdateSubcomponent = async (id: number, data: SubcomponentDto) => {
    try {
      await updateSubcomponent(id, data)
      toast.success('Subcomponent updated successfully')
      setSubcomponentModal({ open: false })
      if (data.equipmentComponent?.id) {
        await loadSubcomponentsForComponent(data.equipmentComponent.id)
      }
    } catch (error: any) {
      console.error(error)
      toast.error(error?.message || 'Failed to update subcomponent')
    }
  }

  const handleDeleteSubcomponent = async (id: number) => {
    if (!window.confirm('Delete this subcomponent?')) return
    try {
      await deleteSubcomponent(id)
      toast.success('Subcomponent deleted successfully')
      setSubcomponents(prev => prev.filter(s => s.id !== id))
      setParts(prev => prev.filter(p => p.subcomponent?.id !== id && p.subcomponentId !== id))
    } catch (error: any) {
      console.error(error)
      toast.error(error?.message || 'Failed to delete subcomponent')
    }
  }

  const handleCreatePart = async (data: PartDto) => {
    if (!data.subcomponentId) return
    try {
      await createPartForSubcomponent({
        subcomponentId: data.subcomponentId,
        name: data.name,
        code: data.code,
      })
      await loadPartsForSubcomponent(data.subcomponentId)
      setPartModal({ open: false })
      toast.success('Part added successfully')
    } catch (error: any) {
      console.error('Error creating part', error)
      toast.error(error?.message || 'Failed to add part')
    }
  }

  const handleDeletePart = async (id: number, subcomponentId?: number) => {
    if (!window.confirm('Delete this part?')) return
    try {
      await deletePart(id)
      if (subcomponentId) {
        await loadPartsForSubcomponent(subcomponentId)
      } else {
        setParts(prev => prev.filter(p => p.id !== id))
      }
      toast.success('Part deleted successfully')
    } catch (error: any) {
      console.error('Error deleting part', error)
      toast.error(error?.message || 'Failed to delete part')
    }
  }

  // ─────────────────────────────────────────────
  // Derived collections
  // ─────────────────────────────────────────────
  const vesselsForFilters = useMemo(() => {
    let list = vesselsScoped
    if (filters.companyId) {
      const cid = Number(filters.companyId)
      list = list.filter((v: any) =>
        Number(v.companyGroupAdmin?.id ?? v.companyGroupId) === cid
      )
    }
    if (filters.subcompanyId) {
      const scid = Number(filters.subcompanyId)
      list = list.filter((v: any) =>
        Number(v.companyAdmin?.id ?? v.companyId) === scid
      )
    }
    return list
  }, [vesselsScoped, filters.companyId, filters.subcompanyId])

  const subcompaniesForChosenCompany = useMemo(() => {
    if (!filters.companyId) return []
    const cid = Number(filters.companyId)
    return subcompanies.filter(sc => sc.companyId === cid)
  }, [filters.companyId, subcompanies])

  const filteredVessels = useMemo(() => {
    let list = vesselsForFilters

    if (filters.vesselId) {
      const vId = Number(filters.vesselId)
      list = list.filter(v => v.id === vId)
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      list = list.filter(v =>
        (v.fleet_name || '').toLowerCase().includes(term) ||
        equipment.some(e => e.vesselId === v.id && (
          e.name.toLowerCase().includes(term) ||
          (e.code && e.code.toLowerCase().includes(term))
        ))
      )
    }
    return list
  }, [vesselsForFilters, equipment, searchTerm, filters.vesselId])

  const componentsForEquipment = (equipmentId: number) =>
    components.filter(c => c.equipmentId === equipmentId)

  const subcomponentsForComponent = (componentId: number) =>
    subcomponents.filter(s => s.equipmentComponent?.id === componentId)

  const partsForSubcomponent = (subcomponentId: number) =>
    parts.filter(p => p.subcomponent?.id === subcomponentId || p.subcomponentId === subcomponentId)

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div className='app-main flex-column flex-row-fluid' id='kt_app_main'>
      <div className='d-flex flex-column flex-column-fluid'>
        <div id='kt_app_content' className='app-content flex-column-fluid bg-light'>
          <div className='card shadow-lg border-0'>
            <div className='card-header border-0 pt-6 pb-4 d-flex flex-wrap justify-content-between align-items-start bg-white gap-3'>
              <div>
                <h3 className='card-title mb-2 text-dark fw-bold fs-2'>
                  <span className='text-primary me-2'>⚙️</span>
                  Machinery Management
                </h3>
                <span className='text-muted fs-6 fw-normal'>
                  Hierarchical view of vessel equipment, components & subcomponents
                </span>
              </div>
              <div className='d-flex align-items-center gap-2'>
                {filters.vesselId && (
                  <button
                    type='button'
                    className='btn btn-sm btn-primary fw-semibold shadow-sm'
                    onClick={() => setEquipmentModal({ open: true })}
                    style={{ transition: 'all 0.3s ease' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = ''
                    }}
                  >
                    <KTSVG path='/media/icons/duotune/arrows/arr075.svg' className='svg-icon-2 me-2' />
                    Add Equipment
                  </button>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className='card-body py-5 bg-light border-top'>
              <div className='row gx-3 gy-3 mb-4 align-items-end'>
                {/* Company */}
                {roleId !== 4 && (
                  <div className='col-md-3 col-lg-2'>
                    <label className='form-label fw-semibold fs-7 text-gray-700 mb-2'>
                      <KTSVG path='/media/icons/duotune/general/gen025.svg' className='svg-icon-3 me-1' />
                      Company
                    </label>
                    <select
                      className='form-select form-select-sm border-gray-300 shadow-sm'
                      name='companyId'
                      value={filters.companyId}
                      onChange={(e) => {
                        setFilters(prev => ({
                          ...prev,
                          companyId: e.target.value,
                          subcompanyId: '',
                          vesselId: '',
                        }))
                        setExpanded({ vessels: new Set(), equipment: new Set(), components: new Set(), subcomponents: new Set() })
                      }}
                      style={{ transition: 'all 0.2s ease' }}
                    >
                      <option value=''>All Companies</option>
                      {companies.map(c => (
                        <option key={c.id} value={String(c.id)}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Subcompany */}
                {roleId !== 4 &&
                  Boolean(filters.companyId) &&
                  subcompaniesForChosenCompany.length > 0 && (
                    <div className='col-md-3 col-lg-2'>
                      <label className='form-label fw-semibold fs-7 text-gray-700 mb-2'>
                        <KTSVG path='/media/icons/duotune/general/gen025.svg' className='svg-icon-3 me-1' />
                        Subcompany
                      </label>
                      <select
                        className='form-select form-select-sm border-gray-300 shadow-sm'
                        name='subcompanyId'
                        value={filters.subcompanyId}
                        onChange={(e) => {
                          setFilters(prev => ({
                            ...prev,
                            subcompanyId: e.target.value,
                            vesselId: '',
                          }))
                          setExpanded({ vessels: new Set(), equipment: new Set(), components: new Set(), subcomponents: new Set() })
                        }}
                        style={{ transition: 'all 0.2s ease' }}
                      >
                        <option value=''>All Subcompanies</option>
                        {subcompaniesForChosenCompany.map(sc => (
                          <option key={sc.id} value={String(sc.id)}>{sc.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                {/* Vessel */}
                {!isCrew && (
                  <div className='col-md-3 col-lg-2'>
                    <label className='form-label fw-semibold fs-7 text-gray-700 mb-2'>
                      <KTSVG path='/media/icons/duotune/general/gen025.svg' className='svg-icon-3 me-1' />
                      Vessel
                    </label>
                    <select
                      className='form-select form-select-sm border-gray-300 shadow-sm'
                      name='vesselId'
                      value={filters.vesselId}
                      onChange={(e) => {
                        setFilters(prev => ({ ...prev, vesselId: e.target.value }))
                        setExpanded(prev => ({
                          vessels: new Set(),
                          equipment: new Set(),
                          components: new Set(),
                          subcomponents: new Set(),
                        }))
                      }}
                      style={{ transition: 'all 0.2s ease' }}
                    >
                      <option value=''>All Vessels</option>
                      {vesselsForFilters.map(v => (
                        <option key={v.id} value={String(v.id)}>
                          {(v as any).fleet_name || `Vessel ${v.id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Search */}
                <div className='col-md-4 col-lg-4'>
                  <label className='form-label fw-semibold fs-7 text-gray-700 mb-2'>
                    <KTSVG path='/media/icons/duotune/general/gen021.svg' className='svg-icon-3 me-1' />
                    Search
                  </label>
                  <div className='position-relative'>
                    <div
                      className='position-absolute ms-3'
                      style={{ top: '50%', transform: 'translateY(-50%)', zIndex: 1 }}
                    >
                      <KTSVG path='/media/icons/duotune/general/gen021.svg' className='svg-icon-3 text-gray-500' />
                    </div>
                    <input
                      type='text'
                      className='form-control form-control-sm ps-10 border-gray-300 shadow-sm'
                      placeholder='Type to filter vessels, equipment...'
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ transition: 'all 0.2s ease' }}
                    />
                  </div>
                </div>

                <div className='col-md-2 d-flex justify-content-md-end'>
                  <button
                    type='button'
                    className='btn btn-sm btn-light-danger w-100 w-md-auto fw-semibold shadow-sm'
                    onClick={() => {
                      setFilters({ companyId: '', subcompanyId: '', vesselId: '' })
                      setSearchTerm('')
                      setExpanded({ vessels: new Set(), equipment: new Set(), components: new Set(), subcomponents: new Set() })
                    }}
                    style={{ transition: 'all 0.3s ease' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    <KTSVG path='/media/icons/duotune/general/gen027.svg' className='svg-icon-2 me-1' />
                    Clear All
                  </button>
                </div>
              </div>

              {/* Tree section */}
{loading ? (
  <div className='text-center py-8'>
    <div className='spinner-border text-primary' role='status' style={{ width: '3rem', height: '3rem' }}>
      <span className='visually-hidden'>Loading...</span>
    </div>
    <div className='mt-3 text-muted fs-6'>Loading machinery data...</div>
  </div>
) : filteredVessels.length === 0 ? (
  <div className='text-center py-10'>
    <KTSVG path='/media/icons/duotune/general/gen025.svg' className='svg-icon-5x text-gray-400 mb-4' />
    <div className='text-muted fs-5 fw-semibold mb-2'>
      {filters.vesselId
        ? 'No equipment found'
        : 'Select filters to view machinery'}
    </div>
    <div className='text-muted fs-7'>
      {filters.vesselId
        ? 'No equipment found for selected filters. Try adjusting your search criteria.'
        : 'Please select a vessel or adjust your filters to view the machinery tree.'}
    </div>
  </div>
) : (
  <div
    className='machinery-tree border-0 rounded-3 p-4 bg-white shadow-sm'
    style={{ maxHeight: '70vh', overflowY: 'auto', transition: 'all 0.3s ease' }}
  >
    {filteredVessels.map(vessel => {
      const isExpandedVessel = expanded.vessels.has(vessel.id)
      const vesselEquipment = equipment.filter(e => e.vesselId === vessel.id)
      const isSelectedVessel = filters.vesselId === String(vessel.id)
      const vesselCount = vesselCounts.get(vessel.id)
      const equipmentCount = vesselCount?.equipmentCount ?? vesselEquipment.length

      return (
        <div key={vessel.id} className='mb-4'>
          {/* Vessel Row */}
          <div
            className={`d-flex align-items-center p-4 rounded-3 border shadow-sm ${
              isSelectedVessel 
                ? 'bg-primary text-white border-primary' 
                : 'bg-white border-gray-300'
            }`}
            style={{ 
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onClick={() => handleToggleVessel(vessel.id)}
            onMouseEnter={(e) => {
              if (!isSelectedVessel) {
                e.currentTarget.style.transform = 'translateX(4px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                e.currentTarget.style.borderColor = '#0d6efd'
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelectedVessel) {
                e.currentTarget.style.transform = 'translateX(0)'
                e.currentTarget.style.boxShadow = ''
                e.currentTarget.style.borderColor = ''
              }
            }}
          >
            <KTSVG
              path={`/media/icons/duotune/arrows/arr${isExpandedVessel ? '072' : '071'}.svg`}
              className={`svg-icon-4 me-3 ${isSelectedVessel ? 'text-white' : 'text-primary'}`}
            />
            <div className={`rounded-circle p-2 ${isSelectedVessel ? 'bg-white bg-opacity-20' : 'bg-primary bg-opacity-10'}`}>
              <KTSVG 
                path='/media/icons/duotune/general/gen025.svg' 
                className={`svg-icon-4 ${isSelectedVessel ? 'text-white' : 'text-primary'}`} 
              />
            </div>
            <div className='flex-grow-1 ms-2'>
              <div className={`fw-bold fs-5 ${isSelectedVessel ? 'text-white' : 'text-dark'}`}>
                {vessel.fleet_name || `Vessel #${vessel.id}`}
              </div>
              <div className={`fs-7 mt-1 ${isSelectedVessel ? 'text-white text-opacity-75' : 'text-muted'}`}>
                <span className={`badge me-2 ${isSelectedVessel ? 'bg-white bg-opacity-20' : 'bg-primary bg-opacity-10 text-primary'}`}>
                  {equipmentCount}
                </span>
                equipment record{equipmentCount !== 1 ? 's' : ''}
                {vesselCount && (
                  <span className={`ms-2 ${isSelectedVessel ? 'text-white text-opacity-75' : 'text-muted'}`}>
                    • {vesselCount.componentCount} components • {vesselCount.subcomponentCount} subcomponents • {vesselCount.partCount} parts
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Equipment & below */}
          {isExpandedVessel && (
            <div className='ms-6 mt-3 position-relative'>
              {/* Connecting line */}
              <div 
                className='position-absolute'
                style={{
                  left: '-12px',
                  top: 0,
                  bottom: 0,
                  width: '2px',
                  background: 'linear-gradient(to bottom, #0d6efd, #e0e0e0)',
                  borderRadius: '2px'
                }}
              />
              {vesselEquipment.length === 0 ? (
                <div className='text-muted p-4 fs-7 bg-light rounded-3 border border-dashed'>
                  <KTSVG path='/media/icons/duotune/technology/teh005.svg' className='svg-icon-3x text-gray-400 mb-2' />
                  <div>No equipment found. Use <span className='fw-semibold text-primary'>Add Equipment</span> to create one.</div>
                </div>
              ) : (
                vesselEquipment.map((eq, eqIndex) => {
                  const eqId = eq.id!
                  const isEqExpanded = expanded.equipment.has(eqId)
                  const eqComponents = componentsForEquipment(eqId)

                  // Equipment serial number (per vessel)
                  const equipmentSN = eqIndex + 1

                  return (
                    <div key={eqId} className='mb-3 position-relative'>
                      {/* Equipment Row */}
<div
  className='d-flex align-items-center p-3 rounded-3 bg-light-info border border-info border-opacity-50 shadow-sm'
  style={{ 
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    background: 'linear-gradient(135deg, #e7f3ff 0%, #f0f8ff 100%)'
  }}
  onClick={() => handleToggleEquipment(eqId)}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = 'translateX(4px)'
    e.currentTarget.style.boxShadow = '0 4px 12px rgba(13, 110, 253, 0.15)'
    e.currentTarget.style.borderColor = '#0d6efd'
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = 'translateX(0)'
    e.currentTarget.style.boxShadow = ''
    e.currentTarget.style.borderColor = ''
  }}
>
  {/* S/N badge for Equipment */}
  <span
    className='badge badge-primary text-white me-3 fw-bold'
    style={{ 
      minWidth: 40, 
      textAlign: 'center',
      fontSize: '0.85rem',
      padding: '6px 10px'
    }}
  >
    {equipmentSN}
  </span>

  <div className='rounded-circle p-2 bg-info bg-opacity-10 me-2'>
    <KTSVG
      path='/media/icons/duotune/technology/teh005.svg'
      className='svg-icon-3 text-info'
    />
  </div>

  <div className='flex-grow-1'>
    <div className='d-flex flex-wrap align-items-center gap-2 mb-1'>
      <span className='fw-bold fs-6 text-dark d-flex align-items-center flex-wrap gap-2'>
        {eq.shortForm && (
          <span className='badge bg-primary text-white px-2 py-1'>
            {eq.shortForm}
          </span>
        )}
        <span>{eq.name}</span>
        {eq.code && (
          <span className='text-muted fs-7 fw-normal'>({eq.code})</span>
        )}
      </span>
      {eq.criticality && (
        <span className='badge bg-danger text-white px-2 py-1'>
          ⚠️ Critical
        </span>
      )}
    </div>
    {eq.subHead && (
      <div className='text-muted fs-7 mt-1'>
        {eq.subHead}
      </div>
    )}
  </div>

  <div className='d-flex gap-2'>
    <button
      className='btn btn-sm btn-info text-white fw-semibold shadow-sm'
      onClick={(e) => {
        e.stopPropagation()
        setComponentModal({ open: true, equipmentId: eqId })
      }}
      title='Add Component'
      style={{ transition: 'all 0.2s ease' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
      }}
    >
      <KTSVG path='/media/icons/duotune/arrows/arr075.svg' className='svg-icon-2 me-1' />
      Add Component
    </button>
    <button
      className='btn btn-sm btn-light-primary shadow-sm'
      onClick={(e) => {
        e.stopPropagation()
        setEquipmentModal({ open: true, editing: eq })
      }}
      title='Edit Equipment'
      style={{ transition: 'all 0.2s ease' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
      }}
    >
      <KTSVG path='/media/icons/duotune/general/gen055.svg' className='svg-icon-2' />
    </button>
    <button
      className='btn btn-sm btn-light-danger shadow-sm'
      onClick={(e) => {
        e.stopPropagation()
        handleDeleteEquipment(eqId)
      }}
      title='Delete Equipment'
      style={{ transition: 'all 0.2s ease' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
      }}
    >
      <KTSVG path='/media/icons/duotune/general/gen027.svg' className='svg-icon-2' />
    </button>
  </div>
</div>


                      {/* Components */}
                      {isEqExpanded && (
                        <div className='ms-5 mt-2 position-relative'>
                          {/* Connecting line */}
                          <div 
                            className='position-absolute'
                            style={{
                              left: '-12px',
                              top: 0,
                              bottom: 0,
                              width: '2px',
                              background: 'linear-gradient(to bottom, #0dcaf0, #e0e0e0)',
                              borderRadius: '2px'
                            }}
                          />
                          {eqComponents.length === 0 ? (
                            <div className='text-muted p-3 fs-7 bg-light rounded-2 border border-dashed'>
                              No components. Click <span className='fw-semibold text-info'>Add Component</span> to create one.
                            </div>
                          ) : (
                            eqComponents.map((comp, compIndex) => {
                              const compId = comp.id!
                              const isCompExpanded = expanded.components.has(compId)
                              const compSubs = subcomponentsForComponent(compId)

                              // Component serial number (per equipment)
                              const componentSN = compIndex + 1

                              return (
                                <div key={compId} className='mb-2'>
                                  {/* Component Row */}
                                  <div
                                    className='d-flex align-items-center p-3 rounded-3 bg-light-warning border border-warning border-opacity-50 shadow-sm'
                                    style={{ 
                                      cursor: 'pointer',
                                      transition: 'all 0.3s ease',
                                      background: 'linear-gradient(135deg, #fff3cd 0%, #fff8e1 100%)'
                                    }}
                                    onClick={() => handleToggleComponent(compId)}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.transform = 'translateX(4px)'
                                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 193, 7, 0.15)'
                                      e.currentTarget.style.borderColor = '#ffc107'
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.transform = 'translateX(0)'
                                      e.currentTarget.style.boxShadow = ''
                                      e.currentTarget.style.borderColor = ''
                                    }}
                                  >
                                    {/* S/N badge for Component */}
                                    <span
                                      className='badge bg-warning text-dark me-3 fw-bold'
                                      style={{ 
                                        minWidth: 50, 
                                        textAlign: 'center',
                                        fontSize: '0.8rem',
                                        padding: '5px 8px'
                                      }}
                                    >
                                      {equipmentSN}.{componentSN}
                                    </span>

                                    <KTSVG
                                      path={`/media/icons/duotune/arrows/arr${isCompExpanded ? '072' : '071'}.svg`}
                                      className='svg-icon-2 me-2 text-warning'
                                    />
                                    <div className='rounded-circle p-1 bg-warning bg-opacity-10 me-2'>
                                      <KTSVG path='/media/icons/duotune/technology/teh006.svg' className='svg-icon-2 text-warning' />
                                    </div>
                                    <div className='flex-grow-1'>
                                      <div className='fw-bold fs-7 text-dark mb-1 d-flex align-items-center gap-2 flex-wrap'>
                                        <span>
                                          {comp.name}{' '}
                                          {comp.code && (
                                            <span className='text-muted fs-8 fw-normal'>({comp.code})</span>
                                          )}
                                        </span>
                                        {comp.hasOpenJob && (
                                          <span className="badge badge-light-warning">
                                            <KTSVG path='/media/icons/duotune/general/gen044.svg' className='svg-icon-3 me-1' />
                                            Under Maintenance
                                          </span>
                                        )}
                                      </div>
                                      {comp.description && (
                                        <div
                                          className='text-muted fs-8 text-truncate'
                                          style={{ maxWidth: '300px' }}
                                          title={comp.description}
                                        >
                                          {comp.description}
                                        </div>
                                      )}
                                    </div>
                                    <div className='d-flex gap-2'>
                                      <button
                                        className='btn btn-sm btn-warning text-dark fw-semibold shadow-sm'
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setSubcomponentModal({ open: true, componentId: compId })
                                        }}
                                        title='Add Subcomponent'
                                        style={{ transition: 'all 0.2s ease' }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.transform = 'scale(1.05)'
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.transform = 'scale(1)'
                                        }}
                                      >
                                        <KTSVG path='/media/icons/duotune/arrows/arr075.svg' className='svg-icon-2 me-1' />
                                        Add Subcomponent
                                      </button>
                                      <button
                                        className='btn btn-sm btn-light-primary shadow-sm'
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setComponentModal({ open: true, editing: comp, equipmentId: comp.equipmentId })
                                        }}
                                        title='Edit Component'
                                        style={{ transition: 'all 0.2s ease' }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.transform = 'scale(1.05)'
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.transform = 'scale(1)'
                                        }}
                                      >
                                        <KTSVG path='/media/icons/duotune/general/gen055.svg' className='svg-icon-2' />
                                      </button>
                                      <button
                                        className='btn btn-sm btn-light-danger shadow-sm'
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleDeleteComponent(compId)
                                        }}
                                        title='Delete Component'
                                        style={{ transition: 'all 0.2s ease' }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.transform = 'scale(1.05)'
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.transform = 'scale(1)'
                                        }}
                                      >
                                        <KTSVG path='/media/icons/duotune/general/gen027.svg' className='svg-icon-2' />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Subcomponents */}
                                  {isCompExpanded && (
                                    <div className='ms-5 mt-2 position-relative'>
                                      {/* Connecting line */}
                                      <div 
                                        className='position-absolute'
                                        style={{
                                          left: '-12px',
                                          top: 0,
                                          bottom: 0,
                                          width: '2px',
                                          background: 'linear-gradient(to bottom, #ffc107, #e0e0e0)',
                                          borderRadius: '2px'
                                        }}
                                      />
                                      {compSubs.length === 0 ? (
                                        <div className='text-muted p-2 fs-7 bg-light rounded-2 border border-dashed'>
                                          No subcomponents. Click <span className='fw-semibold text-warning'>Add Subcomponent</span> to create one.
                                        </div>
                                      ) : (
                                        compSubs.map((sub, subIndex) => {
                                          // Subcomponent serial number (per component)
                                          const subSN = subIndex + 1
                                          const subParts = partsForSubcomponent(sub.id!)
                                          const isSubExpanded = expanded.subcomponents.has(sub.id!)
                                          return (
                                            <div key={sub.id} className='mb-2'>
                                              {/* Subcomponent Row - Clickable to expand/collapse */}
                                              <div
                                                className='d-flex align-items-center p-3 rounded-3 bg-light-success border border-success border-opacity-50 shadow-sm'
                                                style={{ 
                                                  cursor: 'pointer',
                                                  transition: 'all 0.3s ease',
                                                  background: 'linear-gradient(135deg, #d1e7dd 0%, #d4edda 100%)'
                                                }}
                                                onClick={() => handleToggleSubcomponent(sub.id!)}
                                                onMouseEnter={(e) => {
                                                  e.currentTarget.style.transform = 'translateX(4px)'
                                                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(25, 135, 84, 0.15)'
                                                  e.currentTarget.style.borderColor = '#198754'
                                                }}
                                                onMouseLeave={(e) => {
                                                  e.currentTarget.style.transform = 'translateX(0)'
                                                  e.currentTarget.style.boxShadow = ''
                                                  e.currentTarget.style.borderColor = ''
                                                }}
                                              >
                                                {/* S/N badge for Subcomponent */}
                                                <span
                                                  className='badge bg-success text-white me-3 fw-bold'
                                                  style={{ 
                                                    minWidth: 60, 
                                                    textAlign: 'center',
                                                    fontSize: '0.75rem',
                                                    padding: '5px 8px'
                                                  }}
                                                >
                                                  {equipmentSN}.{componentSN}.{subSN}
                                                </span>

                                                {/* Expand/Collapse arrow for Subcomponent */}
                                                <KTSVG
                                                  path={`/media/icons/duotune/arrows/arr${isSubExpanded ? '072' : '071'}.svg`}
                                                  className='svg-icon-2 me-2 text-success'
                                                />

                                                <div className='rounded-circle p-1 bg-success bg-opacity-10 me-2'>
                                                  <KTSVG
                                                    path='/media/icons/duotune/technology/teh001.svg'
                                                    className='svg-icon-2 text-success'
                                                  />
                                                </div>
                                                <div className='flex-grow-1'>
                                                  <div className='fw-bold fs-7 text-dark mb-1 d-flex align-items-center gap-2 flex-wrap'>
                                                    <span>{sub.name}</span>
                                                    {sub.hasOpenJob && (
                                                      <span className="badge badge-light-warning">
                                                        <KTSVG path='/media/icons/duotune/general/gen044.svg' className='svg-icon-3 me-1' />
                                                        Under Maintenance
                                                      </span>
                                                    )}
                                                  </div>
                                                  {sub.subComponentCode && (
                                                    <div className='text-muted fs-8'>({sub.subComponentCode})</div>
                                                  )}
                                                </div>
                                                <div className='d-flex gap-2'>
                                                  <button
                                                    className='btn btn-sm btn-light-primary shadow-sm'
                                                    onClick={(e) => {
                                                      e.stopPropagation()
                                                      setSubcomponentModal({
                                                        open: true,
                                                        editing: sub,
                                                        componentId: sub.equipmentComponent?.id,
                                                      })
                                                    }}
                                                    title='Edit Subcomponent'
                                                    style={{ transition: 'all 0.2s ease' }}
                                                    onMouseEnter={(e) => {
                                                      e.currentTarget.style.transform = 'scale(1.05)'
                                                    }}
                                                    onMouseLeave={(e) => {
                                                      e.currentTarget.style.transform = 'scale(1)'
                                                    }}
                                                  >
                                                    <KTSVG path='/media/icons/duotune/general/gen055.svg' className='svg-icon-2' />
                                                  </button>
                                                  <button
                                                    className='btn btn-sm btn-light-danger shadow-sm'
                                                    onClick={(e) => {
                                                      e.stopPropagation()
                                                      handleDeleteSubcomponent(sub.id!)
                                                    }}
                                                    title='Delete Subcomponent'
                                                    style={{ transition: 'all 0.2s ease' }}
                                                    onMouseEnter={(e) => {
                                                      e.currentTarget.style.transform = 'scale(1.05)'
                                                    }}
                                                    onMouseLeave={(e) => {
                                                      e.currentTarget.style.transform = 'scale(1)'
                                                    }}
                                                  >
                                                    <KTSVG path='/media/icons/duotune/general/gen027.svg' className='svg-icon-2' />
                                                  </button>
                                                </div>
                                              </div>

                                              {/* Parts under Subcomponent - Only show when expanded */}
                                              {isSubExpanded && (
                                                <div className='ms-5 mt-2 position-relative'>
                                                  {/* Connecting line */}
                                                  <div 
                                                    className='position-absolute'
                                                    style={{
                                                      left: '-12px',
                                                      top: 0,
                                                      bottom: 0,
                                                      width: '2px',
                                                      background: 'linear-gradient(to bottom, #6f42c1, #e0e0e0)',
                                                      borderRadius: '2px'
                                                    }}
                                                  />
                                                  {subParts.length > 0 ? (
                                                    subParts.map((part, partIndex) => {
                                                      const partSN = partIndex + 1
                                                      return (
                                                        <div
                                                          key={part.id}
                                                          className='d-flex align-items-center p-2 rounded-2 bg-white border border-purple border-opacity-25 mb-2 shadow-sm'
                                                          style={{
                                                            transition: 'all 0.2s ease',
                                                            borderColor: 'rgba(111, 66, 193, 0.25)'
                                                          }}
                                                          onMouseEnter={(e) => {
                                                            e.currentTarget.style.transform = 'translateX(4px)'
                                                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(111, 66, 193, 0.15)'
                                                            e.currentTarget.style.borderColor = '#6f42c1'
                                                          }}
                                                          onMouseLeave={(e) => {
                                                            e.currentTarget.style.transform = 'translateX(0)'
                                                            e.currentTarget.style.boxShadow = ''
                                                            e.currentTarget.style.borderColor = 'rgba(111, 66, 193, 0.25)'
                                                          }}
                                                        >
                                                          {/* S/N badge for Part */}
                                                          <span
                                                            className='badge me-3 fw-bold text-white'
                                                            style={{ 
                                                              minWidth: 70, 
                                                              textAlign: 'center',
                                                              fontSize: '0.7rem',
                                                              padding: '4px 6px',
                                                              backgroundColor: '#6f42c1'
                                                            }}
                                                          >
                                                            {equipmentSN}.{componentSN}.{subSN}.{partSN}
                                                          </span>

                                                          <div 
                                                            className='rounded-circle p-1 me-2 d-flex align-items-center justify-content-center'
                                                            style={{ 
                                                              backgroundColor: 'rgba(111, 66, 193, 0.1)',
                                                              color: '#6f42c1'
                                                            }}
                                                          >
                                                            <KTSVG
                                                              path='/media/icons/duotune/general/gen032.svg'
                                                              className='svg-icon-2'
                                                            />
                                                          </div>
                                                          <div className='flex-grow-1'>
                                                            <div className='fw-semibold fs-7 text-dark mb-1'>{part.name}</div>
                                                            {part.itemCode && (
                                                              <div className='text-muted fs-8 mb-1'>
                                                                <span className='badge bg-light text-dark'>{part.itemCode}</span>
                                                              </div>
                                                            )}
                                                            {part.itemShortDescription && (
                                                              <div className='text-muted fs-8'>{part.itemShortDescription}</div>
                                                            )}
                                                          </div>
                                                          <div className='d-flex gap-1'>
                                                            <button
                                                              className='btn btn-sm btn-light-danger shadow-sm'
                                                              onClick={() => handleDeletePart(part.id!, sub.id!)}
                                                              title='Delete Part'
                                                              style={{ transition: 'all 0.2s ease' }}
                                                              onMouseEnter={(e) => {
                                                                e.currentTarget.style.transform = 'scale(1.1)'
                                                              }}
                                                              onMouseLeave={(e) => {
                                                                e.currentTarget.style.transform = 'scale(1)'
                                                              }}
                                                            >
                                                              <KTSVG path='/media/icons/duotune/general/gen027.svg' className='svg-icon-2' />
                                                            </button>
                                                          </div>
                                                        </div>
                                                      )
                                                    })
                                                  ) : (
                                                    <div className='text-muted fs-7 mb-3 p-2 bg-light rounded-2 border border-dashed'>
                                                      No parts yet. Click <span className='fw-semibold' style={{ color: '#6f42c1' }}>Add Part</span> to create one.
                                                    </div>
                                                  )}
                                                  <button
                                                    className='btn btn-sm text-white fw-semibold shadow-sm mt-2'
                                                    onClick={() => setPartModal({ open: true, subcomponentId: sub.id! })}
                                                    style={{ 
                                                      transition: 'all 0.3s ease',
                                                      backgroundColor: '#6f42c1',
                                                      borderColor: '#6f42c1'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                      e.currentTarget.style.transform = 'translateY(-2px)'
                                                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(111, 66, 193, 0.4)'
                                                      e.currentTarget.style.backgroundColor = '#5a32a3'
                                                    }}
                                                    onMouseLeave={(e) => {
                                                      e.currentTarget.style.transform = 'translateY(0)'
                                                      e.currentTarget.style.boxShadow = ''
                                                      e.currentTarget.style.backgroundColor = '#6f42c1'
                                                    }}
                                                  >
                                                    <KTSVG path='/media/icons/duotune/arrows/arr075.svg' className='svg-icon-2 me-2' />
                                                    Add Part
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          )
                                        })
                                      )}
                                      <button
                                        className='btn btn-sm btn-warning text-dark fw-semibold shadow-sm mt-2'
                                        onClick={() => setSubcomponentModal({ open: true, componentId: compId })}
                                        style={{ transition: 'all 0.3s ease' }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.transform = 'translateY(-2px)'
                                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(255, 193, 7, 0.3)'
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.transform = 'translateY(0)'
                                          e.currentTarget.style.boxShadow = ''
                                        }}
                                      >
                                        <KTSVG path='/media/icons/duotune/arrows/arr075.svg' className='svg-icon-2 me-2' />
                                        Add Subcomponent
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )
                            })
                          )}
                          <button
                            className='btn btn-sm btn-info text-white fw-semibold shadow-sm mt-3'
                            onClick={() => setComponentModal({ open: true, equipmentId: eqId })}
                            style={{ transition: 'all 0.3s ease' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)'
                              e.currentTarget.style.boxShadow = '0 4px 8px rgba(13, 202, 240, 0.3)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)'
                              e.currentTarget.style.boxShadow = ''
                            }}
                          >
                            <KTSVG path='/media/icons/duotune/arrows/arr075.svg' className='svg-icon-2 me-2' />
                            Add Component
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      )
    })}
  </div>
)}

            </div>
          </div>
        </div>
      </div>

      {/* Equipment Modal */}
      {equipmentModal.open && (
  <EquipmentModal
    visible={true}
    vesselId={filters.vesselId ? Number(filters.vesselId) : undefined}
    editing={equipmentModal.editing}
    allEquipment={equipment}   
    onClose={() => setEquipmentModal({ open: false })}
    onSubmit={equipmentModal.editing
      ? (data) => handleUpdateEquipment(equipmentModal.editing!.id!, data)
      : handleCreateEquipment}
  />
)}
      {/* Component Modal */}
      {componentModal.open && (
        <ComponentModal
          visible={true}
          equipmentId={componentModal.equipmentId!}
          editing={componentModal.editing}
          onClose={() => setComponentModal({ open: false })}
          onSubmit={componentModal.editing
            ? (data) => handleUpdateComponent(componentModal.editing!.id!, data)
            : handleCreateComponent}
        />
      )}

      {/* Subcomponent Modal */}
      {subcomponentModal.open && (
        <SubcomponentModal
          visible={true}
          componentId={subcomponentModal.componentId!}
          editing={subcomponentModal.editing}
          onClose={() => setSubcomponentModal({ open: false })}
          onSubmit={subcomponentModal.editing
            ? (data) => handleUpdateSubcomponent(subcomponentModal.editing!.id!, data)
            : handleCreateSubcomponent}
        />
      )}

      {/* Part Modal */}
      {partModal.open && (
        <PartModal
          visible={true}
          subcomponentId={partModal.subcomponentId!}
          editing={partModal.editing}
          onClose={() => setPartModal({ open: false })}
          onSubmit={handleCreatePart}
        />
      )}
    </div>
  )
}

export default MachineryDetails
