import { FC, useState, useEffect, useMemo } from 'react'
import { KTSVG } from '../../../../_metronic/helpers'
import { toast } from 'react-toastify'
import { useAuth } from '../../auth'
import { 
  getVesselList,
  getEquipmentList,
  getEquipmentByVessel,
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
} from '../core/_requests'
import type {
  Vessel,
  EquipmentDto,
  EquipmentComponentDto,
  SubcomponentDto,
} from '../core/_models'

type ExpandedState = {
  vessels: Set<number>
  equipment: Set<number>
  components: Set<number>
}

const MachineryDetails: FC = () => {
  const { currentUser } = useAuth()
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [equipment, setEquipment] = useState<EquipmentDto[]>([])
  const [components, setComponents] = useState<EquipmentComponentDto[]>([])
  const [subcomponents, setSubcomponents] = useState<SubcomponentDto[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedVesselId, setSelectedVesselId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [expanded, setExpanded] = useState<ExpandedState>({
    vessels: new Set(),
    equipment: new Set(),
    components: new Set(),
  })

  // Modals
  const [equipmentModal, setEquipmentModal] = useState<{ open: boolean; editing?: EquipmentDto }>({ open: false })
  const [componentModal, setComponentModal] = useState<{ open: boolean; editing?: EquipmentComponentDto; equipmentId?: number }>({ open: false })
  const [subcomponentModal, setSubcomponentModal] = useState<{ open: boolean; editing?: SubcomponentDto; componentId?: number }>({ open: false })

  useEffect(() => {
    loadVessels()
  }, [])

  useEffect(() => {
    if (selectedVesselId) {
      loadEquipment(selectedVesselId)
    } else {
      setEquipment([])
      setComponents([])
      setSubcomponents([])
    }
  }, [selectedVesselId])

  const loadVessels = async () => {
    try {
      const data = await getVesselList()
      setVessels(data)
      if (data.length > 0 && !selectedVesselId) {
        setSelectedVesselId(data[0].id)
      }
    } catch (error) {
      console.error('Error loading vessels:', error)
      toast.error('Failed to load vessels')
    }
  }

  const loadEquipment = async (vesselId: number) => {
    setLoading(true)
    try {
      const data = await getEquipmentByVessel(vesselId)
      setEquipment(data)
      // Load components for all equipment
      const allComponents: EquipmentComponentDto[] = []
      for (const eq of data) {
        if (eq.id) {
          const comps = await getEquipmentComponentsByEquipment(eq.id)
          allComponents.push(...comps)
        }
      }
      setComponents(allComponents)
      // Load subcomponents for all components
      const allSubcomponents: SubcomponentDto[] = []
      for (const comp of allComponents) {
        if (comp.id) {
          const subs = await getSubcomponentsByComponent(comp.id)
          allSubcomponents.push(...subs)
        }
      }
      setSubcomponents(allSubcomponents)
    } catch (error) {
      console.error('Error loading equipment:', error)
      toast.error('Failed to load equipment')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleVessel = (vesselId: number) => {
    setExpanded(prev => {
      const newSet = new Set(prev.vessels)
      if (newSet.has(vesselId)) {
        newSet.delete(vesselId)
      } else {
        newSet.add(vesselId)
      }
      return { ...prev, vessels: newSet }
    })
    setSelectedVesselId(vesselId)
  }

  const handleToggleEquipment = (equipmentId: number) => {
    setExpanded(prev => {
      const newSet = new Set(prev.equipment)
      if (newSet.has(equipmentId)) {
        newSet.delete(equipmentId)
      } else {
        newSet.add(equipmentId)
        // Auto-load components when expanding
        loadComponentsForEquipment(equipmentId)
      }
      return { ...prev, equipment: newSet }
    })
  }

  const handleToggleComponent = (componentId: number) => {
    setExpanded(prev => {
      const newSet = new Set(prev.components)
      if (newSet.has(componentId)) {
        newSet.delete(componentId)
      } else {
        newSet.add(componentId)
        // Auto-load subcomponents when expanding
        loadSubcomponentsForComponent(componentId)
      }
      return { ...prev, components: newSet }
    })
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
    } catch (error) {
      console.error('Error loading subcomponents:', error)
    }
  }

  const handleCreateEquipment = async (data: EquipmentDto) => {
    try {
      await createEquipment(data)
      toast.success('Equipment created successfully')
      setEquipmentModal({ open: false })
      if (selectedVesselId) {
        loadEquipment(selectedVesselId)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create equipment')
    }
  }

  const handleUpdateEquipment = async (id: number, data: EquipmentDto) => {
    try {
      await updateEquipment(id, data)
      toast.success('Equipment updated successfully')
      setEquipmentModal({ open: false })
      if (selectedVesselId) {
        loadEquipment(selectedVesselId)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update equipment')
    }
  }

  const handleDeleteEquipment = async (id: number) => {
    if (!window.confirm('Delete this equipment? This will also delete all components and subcomponents.')) {
      return
    }
    try {
      await deleteEquipment(id)
      toast.success('Equipment deleted successfully')
      if (selectedVesselId) {
        loadEquipment(selectedVesselId)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete equipment')
    }
  }

  const handleCreateComponent = async (data: EquipmentComponentDto) => {
    try {
      await createEquipmentComponent(data)
      toast.success('Component created successfully')
      setComponentModal({ open: false })
      if (data.equipmentId) {
        loadComponentsForEquipment(data.equipmentId)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create component')
    }
  }

  const handleUpdateComponent = async (id: number, data: EquipmentComponentDto) => {
    try {
      await updateEquipmentComponent(id, data)
      toast.success('Component updated successfully')
      setComponentModal({ open: false })
      if (data.equipmentId) {
        loadComponentsForEquipment(data.equipmentId)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update component')
    }
  }

  const handleDeleteComponent = async (id: number) => {
    if (!window.confirm('Delete this component? This will also delete all subcomponents.')) {
      return
    }
    try {
      await deleteEquipmentComponent(id)
      toast.success('Component deleted successfully')
      setComponents(prev => prev.filter(c => c.id !== id))
      setSubcomponents(prev => prev.filter(s => s.equipmentComponent?.id !== id))
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete component')
    }
  }

  const handleCreateSubcomponent = async (data: SubcomponentDto) => {
    try {
      await createSubcomponent(data)
      toast.success('Subcomponent created successfully')
      setSubcomponentModal({ open: false })
      if (data.equipmentComponent?.id) {
        loadSubcomponentsForComponent(data.equipmentComponent.id)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create subcomponent')
    }
  }

  const handleUpdateSubcomponent = async (id: number, data: SubcomponentDto) => {
    try {
      await updateSubcomponent(id, data)
      toast.success('Subcomponent updated successfully')
      setSubcomponentModal({ open: false })
      if (data.equipmentComponent?.id) {
        loadSubcomponentsForComponent(data.equipmentComponent.id)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update subcomponent')
    }
  }

  const handleDeleteSubcomponent = async (id: number) => {
    if (!window.confirm('Delete this subcomponent?')) {
      return
    }
    try {
      await deleteSubcomponent(id)
      toast.success('Subcomponent deleted successfully')
      setSubcomponents(prev => prev.filter(s => s.id !== id))
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete subcomponent')
    }
  }

  const filteredVessels = useMemo(() => {
    if (!searchTerm) return vessels
    const term = searchTerm.toLowerCase()
    return vessels.filter(v => 
      v.fleet_name.toLowerCase().includes(term) ||
      equipment.some(e => e.vesselId === v.id && (
        e.name.toLowerCase().includes(term) ||
        (e.code && e.code.toLowerCase().includes(term))
      ))
    )
  }, [vessels, equipment, searchTerm])

  const equipmentForVessel = useMemo(() => {
    if (!selectedVesselId) return []
    return equipment.filter(e => e.vesselId === selectedVesselId)
  }, [equipment, selectedVesselId])

  const componentsForEquipment = (equipmentId: number) => {
    return components.filter(c => c.equipmentId === equipmentId)
  }

  const subcomponentsForComponent = (componentId: number) => {
    return subcomponents.filter(s => s.equipmentComponent?.id === componentId)
  }

  return (
    <div className='app-main flex-column flex-row-fluid' id='kt_app_main'>
      <div className='d-flex flex-column flex-column-fluid'>
        <div id='kt_app_content' className='app-content flex-column-fluid bg-white'>
          <div className='card'>
            <div className='card-header border-0 pt-6 d-flex justify-content-between bg-white'>
              <div>
                <h3 className='card-label text-dark fw-bold'>Machinery</h3>
              </div>
              <div className='card-toolbar d-flex gap-2'>
                <div className='position-relative' style={{ width: '300px' }}>
                  <div className='position-absolute ms-3' style={{ top: '50%', transform: 'translateY(-50%)', zIndex: 1 }}>
                    <KTSVG path='/media/icons/duotune/general/gen021.svg' className='svg-icon-2' />
                    </div>
                    <input
                        type='text'
                        className='form-control form-control-sm ps-10'
                    placeholder='Search vessels, equipment...'
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    </div>
                {selectedVesselId && (
                    <button
                      type='button'
                    className='btn btn-primary'
                    onClick={() => setEquipmentModal({ open: true })}
                    >
                    <KTSVG path='/media/icons/duotune/arrows/arr075.svg' className='svg-icon-2' />
                    Add Equipment
                    </button>
                )}
                </div>
              </div>

            <div className='card-body py-4 bg-white border-top'>
              {loading ? (
                <div className='text-center py-5'>
                  <div className='spinner-border' role='status'>
                    <span className='visually-hidden'>Loading...</span>
                          </div>
                        </div>
              ) : (
                <div className='machinery-tree'>
                  {filteredVessels.map(vessel => {
                    const isExpanded = expanded.vessels.has(vessel.id)
                    const vesselEquipment = equipmentForVessel.filter(e => e.vesselId === vessel.id)
                    const isSelected = selectedVesselId === vessel.id

                    return (
                      <div key={vessel.id} className='mb-3'>
                        <div
                          className={`d-flex align-items-center p-3 rounded ${isSelected ? 'bg-light-primary' : 'bg-light'}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleToggleVessel(vessel.id)}
                        >
                            <KTSVG
                            path={`/media/icons/duotune/arrows/arr${isExpanded ? '072' : '071'}.svg`}
                            className='svg-icon-3 me-3'
                          />
                          <KTSVG path='/media/icons/duotune/general/gen025.svg' className='svg-icon-4 me-3' />
                          <div className='flex-grow-1'>
                            <div className='fw-bold fs-6'>{vessel.fleet_name}</div>
                            <div className='text-muted fs-7'>{vesselEquipment.length} equipment</div>
                            </div>
                        </div>

                        {isExpanded && isSelected && (
                          <div className='ms-8 mt-2'>
                            {vesselEquipment.length === 0 ? (
                              <div className='text-muted p-3'>No equipment found. Click "Add Equipment" to create one.</div>
                            ) : (
                              vesselEquipment.map(eq => {
                                const isEqExpanded = expanded.equipment.has(eq.id!)
                                const eqComponents = componentsForEquipment(eq.id!)

                                return (
                                  <div key={eq.id} className='mb-2'>
                                    <div
                                      className='d-flex align-items-center p-2 rounded bg-light-secondary'
                                      style={{ cursor: 'pointer' }}
                                      onClick={() => handleToggleEquipment(eq.id!)}
                                    >
                            <KTSVG
                                        path={`/media/icons/duotune/arrows/arr${isEqExpanded ? '072' : '071'}.svg`}
                                        className='svg-icon-2 me-2'
                                      />
                                      <KTSVG path='/media/icons/duotune/general/gen026.svg' className='svg-icon-3 me-2' />
                                      <div className='flex-grow-1'>
                                        <div className='fw-semibold fs-7'>{eq.name} {eq.code && `(${eq.code})`}</div>
                                      </div>
                                      <div className='d-flex gap-1'>
                                        <button
                                          className='btn btn-sm btn-light'
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setComponentModal({ open: true, equipmentId: eq.id! })
                                          }}
                                        >
                                          <KTSVG path='/media/icons/duotune/arrows/arr075.svg' className='svg-icon-2' />
                                        </button>
                                        <button
                                          className='btn btn-sm btn-light'
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setEquipmentModal({ open: true, editing: eq })
                                          }}
                                        >
                                          <KTSVG path='/media/icons/duotune/general/gen055.svg' className='svg-icon-2' />
                                        </button>
                                        <button
                                          className='btn btn-sm btn-light-danger'
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleDeleteEquipment(eq.id!)
                                          }}
                                        >
                                          <KTSVG path='/media/icons/duotune/general/gen027.svg' className='svg-icon-2' />
                                        </button>
                            </div>
                        </div>

                                    {isEqExpanded && (
                                      <div className='ms-6 mt-1'>
                                        {eqComponents.length === 0 ? (
                                          <div className='text-muted p-2 fs-8'>No components. Click + to add.</div>
                                        ) : (
                                          eqComponents.map(comp => {
                                            const isCompExpanded = expanded.components.has(comp.id!)
                                            const compSubs = subcomponentsForComponent(comp.id!)

                                            return (
                                              <div key={comp.id} className='mb-1'>
                                                <div
                                                  className='d-flex align-items-center p-2 rounded bg-light-info'
                                                  style={{ cursor: 'pointer' }}
                                                  onClick={() => handleToggleComponent(comp.id!)}
                                >
                                  <KTSVG
                                                    path={`/media/icons/duotune/arrows/arr${isCompExpanded ? '072' : '071'}.svg`}
                                                    className='svg-icon-1 me-2'
                                                  />
                                                  <KTSVG path='/media/icons/duotune/general/gen027.svg' className='svg-icon-2 me-2' />
                                                  <div className='flex-grow-1'>
                                                    <div className='fw-semibold fs-8'>{comp.name} {comp.code && `(${comp.code})`}</div>
                                                  </div>
                                                  <div className='d-flex gap-1'>
                                                    <button
                                                      className='btn btn-xs btn-light'
                                                      onClick={(e) => {
                                                        e.stopPropagation()
                                                        setSubcomponentModal({ open: true, componentId: comp.id! })
                                                      }}
                                                    >
                                                      <KTSVG path='/media/icons/duotune/arrows/arr075.svg' className='svg-icon-1' />
                                                    </button>
                                                    <button
                                                      className='btn btn-xs btn-light'
                                                      onClick={(e) => {
                                                        e.stopPropagation()
                                                        setComponentModal({ open: true, editing: comp, equipmentId: comp.equipmentId })
                                                      }}
                                                    >
                                                      <KTSVG path='/media/icons/duotune/general/gen055.svg' className='svg-icon-1' />
                                                    </button>
                                                    <button
                                                      className='btn btn-xs btn-light-danger'
                                                      onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleDeleteComponent(comp.id!)
                                                      }}
                                                    >
                                                      <KTSVG path='/media/icons/duotune/general/gen027.svg' className='svg-icon-1' />
                                                    </button>
                                                  </div>
                              </div>

                                                {isCompExpanded && (
                                                  <div className='ms-6 mt-1'>
                                                    {compSubs.length === 0 ? (
                                                      <div className='text-muted p-1 fs-8'>No subcomponents. Click + to add.</div>
                                                    ) : (
                                                      compSubs.map(sub => (
                                                        <div key={sub.id} className='d-flex align-items-center p-1 rounded bg-light-warning mb-1'>
                                                          <KTSVG path='/media/icons/duotune/general/gen028.svg' className='svg-icon-1 me-2' />
                                                          <div className='flex-grow-1'>
                                                            <div className='fw-normal fs-8'>{sub.name}</div>
                                                          </div>
                                                          <div className='d-flex gap-1'>
                                                            <button
                                                              className='btn btn-xs btn-light'
                                                              onClick={() => setSubcomponentModal({ open: true, editing: sub, componentId: sub.equipmentComponent?.id })}
                                                            >
                                                              <KTSVG path='/media/icons/duotune/general/gen055.svg' className='svg-icon-1' />
                                                            </button>
                                                            <button
                                                              className='btn btn-xs btn-light-danger'
                                                              onClick={() => handleDeleteSubcomponent(sub.id!)}
                                                            >
                                                              <KTSVG path='/media/icons/duotune/general/gen027.svg' className='svg-icon-1' />
                                                            </button>
                                                          </div>
                                                        </div>
                                                      ))
                                                    )}
                                                    <button
                                                      className='btn btn-xs btn-light-primary mt-1'
                                                      onClick={() => setSubcomponentModal({ open: true, componentId: comp.id! })}
                                                    >
                                                      <KTSVG path='/media/icons/duotune/arrows/arr075.svg' className='svg-icon-1' />
                                                      Add Subcomponent
                                                    </button>
                                                  </div>
                                                )}
                      </div>
                                            )
                                          })
                                        )}
                              <button
                                          className='btn btn-xs btn-light-primary mt-1'
                                          onClick={() => setComponentModal({ open: true, equipmentId: eq.id! })}
                                        >
                                          <KTSVG path='/media/icons/duotune/arrows/arr075.svg' className='svg-icon-1' />
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
          vesselId={selectedVesselId!}
          editing={equipmentModal.editing}
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
    </div>
  )
}

// Equipment Modal Component
interface EquipmentModalProps {
  visible: boolean
  vesselId: number
  editing?: EquipmentDto
  onClose: () => void
  onSubmit: (data: EquipmentDto) => void
}

const EquipmentModal: FC<EquipmentModalProps> = ({ visible, vesselId, editing, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<EquipmentDto>({
    vesselId,
    name: editing?.name || '',
    code: editing?.code || '',
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    if (editing) {
      setFormData({
        vesselId: editing.vesselId,
        name: editing.name,
        code: editing.code || '',
      })
    }
  }, [editing])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setErrors({ name: 'Name is required' })
      return
    }
    onSubmit(formData)
  }

  if (!visible) return null

  return (
    <div className='modal fade show d-block' style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
      <div className='modal-dialog modal-dialog-centered'>
        <div className='modal-content'>
          <div className='modal-header'>
            <h5 className='modal-title'>{editing ? 'Edit Equipment' : 'Add Equipment'}</h5>
            <button type='button' className='btn-close' onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className='modal-body'>
              <div className='mb-3'>
                <label className='form-label required text-dark fw-bold'>Name</label>
                <input
                  type='text'
                  className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                {errors.name && <div className='invalid-feedback'>{errors.name}</div>}
              </div>
              <div className='mb-3'>
                <label className='form-label text-dark fw-bold'>Code</label>
                <input
                  type='text'
                  className='form-control'
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>
            </div>
            <div className='modal-footer'>
              <button type='button' className='btn btn-light' onClick={onClose}>Cancel</button>
              <button type='submit' className='btn btn-primary'>Save</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Component Modal Component
interface ComponentModalProps {
  visible: boolean
  equipmentId: number
  editing?: EquipmentComponentDto
  onClose: () => void
  onSubmit: (data: EquipmentComponentDto) => void
}

const ComponentModal: FC<ComponentModalProps> = ({ visible, equipmentId, editing, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<EquipmentComponentDto>({
    equipmentId: editing?.equipmentId || equipmentId,
    name: editing?.name || '',
    code: editing?.code || '',
    description: editing?.description || '',
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    if (editing) {
      setFormData({
        equipmentId: editing.equipmentId,
        name: editing.name,
        code: editing.code || '',
        description: editing.description || '',
      })
    }
  }, [editing, equipmentId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setErrors({ name: 'Name is required' })
      return
    }
    onSubmit(formData)
  }

  if (!visible) return null

  return (
    <div className='modal fade show d-block' style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
      <div className='modal-dialog modal-dialog-centered'>
        <div className='modal-content'>
          <div className='modal-header'>
            <h5 className='modal-title'>{editing ? 'Edit Component' : 'Add Component'}</h5>
            <button type='button' className='btn-close' onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className='modal-body'>
              <div className='mb-3'>
                <label className='form-label required text-dark fw-bold'>Name</label>
                <input
                  type='text'
                  className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                {errors.name && <div className='invalid-feedback'>{errors.name}</div>}
              </div>
              <div className='mb-3'>
                <label className='form-label text-dark fw-bold'>Code</label>
                <input
                  type='text'
                  className='form-control'
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
                      </div>
              <div className='mb-3'>
                <label className='form-label text-dark fw-bold'>Description</label>
                <textarea
                  className='form-control'
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
                    </div>
              </div>
            <div className='modal-footer'>
              <button type='button' className='btn btn-light' onClick={onClose}>Cancel</button>
              <button type='submit' className='btn btn-primary'>Save</button>
            </div>
          </form>
          </div>
        </div>
      </div>
  )
}

// Subcomponent Modal Component
interface SubcomponentModalProps {
  visible: boolean
  componentId: number
  editing?: SubcomponentDto
  onClose: () => void
  onSubmit: (data: SubcomponentDto) => void
}

const SubcomponentModal: FC<SubcomponentModalProps> = ({ visible, componentId, editing, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<SubcomponentDto>({
    equipmentComponent: editing?.equipmentComponent || { id: componentId } as EquipmentComponentDto,
    name: editing?.name || '',
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    if (editing) {
      setFormData({
        equipmentComponent: editing.equipmentComponent || { id: componentId } as EquipmentComponentDto,
        name: editing.name,
      })
    }
  }, [editing, componentId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setErrors({ name: 'Name is required' })
      return
    }
    onSubmit(formData)
  }

  if (!visible) return null

  return (
    <div className='modal fade show d-block' style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
      <div className='modal-dialog modal-dialog-centered'>
        <div className='modal-content'>
          <div className='modal-header'>
            <h5 className='modal-title'>{editing ? 'Edit Subcomponent' : 'Add Subcomponent'}</h5>
            <button type='button' className='btn-close' onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className='modal-body'>
              <div className='mb-3'>
                <label className='form-label required'>Name</label>
                <input
                  type='text'
                  className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                {errors.name && <div className='invalid-feedback'>{errors.name}</div>}
              </div>
            </div>
            <div className='modal-footer'>
              <button type='button' className='btn btn-light' onClick={onClose}>Cancel</button>
              <button type='submit' className='btn btn-primary'>Save</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default MachineryDetails
