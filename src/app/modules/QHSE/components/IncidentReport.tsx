import { FC, useState, useMemo } from 'react'
import { KTSVG } from '../../../../_metronic/helpers'

type IncidentRecord = {
  id: number
  ncrNumber: string
  vessel: string
  priority: string
  description: string
  assignedBy: string
  departmentVsl: string
  departmentOffice: string
  raisedOn: string
  etc: string
  completed: string
  verified: string
}


const mockIncidentData: IncidentRecord[] = [
  {
    id: 2,
    ncrNumber: 'INC-2025-02',
    vessel: 'Eagle S',
    priority: 'Normal',
    description: 'two (2) broken intermediate shaft coupling bolts at sea',
    assignedBy: 'Vessel',
    departmentVsl: 'Engine',
    departmentOffice: 'Technical',
    raisedOn: '15-Oct-2023',
    etc: '01-Mar-2025',
    completed: '',
    verified: '',
  },
  {
    id: 3,
    ncrNumber: 'INC-2025-03',
    vessel: 'Troy',
    priority: 'High',
    description: 'Minor oil spill during bunkering operation. Contained on deck.',
    assignedBy: 'Chief Officer',
    departmentVsl: 'Deck',
    departmentOffice: 'HSEQ',
    raisedOn: '11-Aug-2025',
    etc: '25-Aug-2025',
    completed: '24-Aug-2025',
    verified: '',
  },
  {
    id: 4,
    ncrNumber: 'INC-2025-04',
    vessel: 'Athena',
    priority: 'Normal',
    description: 'Galley equipment malfunction - Oven not reaching required temperature.',
    assignedBy: 'Vessel',
    departmentVsl: 'Engine',
    departmentOffice: 'Technical',
    raisedOn: '22-Sep-2025',
    etc: '05-Oct-2025',
    completed: '',
    verified: '',
  },
  {
    id: 5,
    ncrNumber: 'INC-2025-05',
    vessel: 'Eagle S',
    priority: 'Critical',
    description: 'Failure of main engine fuel pump. Vessel currently adrift.',
    assignedBy: 'Master',
    departmentVsl: 'Engine',
    departmentOffice: 'Technical',
    raisedOn: '06-Oct-2025',
    etc: '08-Oct-2025',
    completed: '',
    verified: '',
  },
]

interface AddIncidentModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: (data: Omit<IncidentRecord, 'id'>, saveAndAddNew: boolean) => void
}

const AddIncidentModal: FC<AddIncidentModalProps> = ({ visible, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    ncrNumber: '',
    vessel: '',
    priority: 'Normal',
    description: '',
    assignedBy: '',
    departmentVsl: '',
    departmentOffice: '',
    raisedOn: '',
    etc: '',
    completed: '',
    verified: ''
  })
  const [errors, setErrors] = useState<{[key: string]: string}>({})

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {}
    
    if (!formData.vessel.trim()) newErrors.vessel = 'Vessel is required'
    if (!formData.description.trim()) newErrors.description = 'Description is required'
    if (!formData.raisedOn.trim()) newErrors.raisedOn = 'Raised On date is required'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (saveAndAddNew: boolean = false) => {
    if (!validateForm()) return

    onSubmit(formData, saveAndAddNew)
    
    if (saveAndAddNew) {
      setFormData({
        ncrNumber: '',
        vessel: '',
        priority: 'Normal',
        description: '',
        assignedBy: '',
        departmentVsl: '',
        departmentOffice: '',
        raisedOn: '',
        etc: '',
        completed: '',
        verified: ''
      })
      setErrors({})
    } else {
      setFormData({
        ncrNumber: '',
        vessel: '',
        priority: 'Normal',
        description: '',
        assignedBy: '',
        departmentVsl: '',
        departmentOffice: '',
        raisedOn: '',
        etc: '',
        completed: '',
        verified: ''
      })
      setErrors({})
      onClose()
    }
  }

  const handleClose = () => {
    setFormData({
      ncrNumber: '',
      vessel: '',
      priority: 'Normal',
      description: '',
      assignedBy: '',
      departmentVsl: '',
      departmentOffice: '',
      raisedOn: '',
      etc: '',
      completed: '',
      verified: ''
    })
    setErrors({})
    onClose()
  }

  if (!visible) return null

  return (
    <div
      className="modal fade show d-flex align-items-center justify-content-center"
      tabIndex={-1}
      style={{
        backgroundColor: 'rgba(0,0,0,0.5)',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1050,
      }}
    >
      <div className='modal-dialog modal-xl modal-dialog-centered' role='document'>
        <div className='modal-content bg-white' style={{ color: '#181C32' }}>
          <div className='modal-header'>
            <h5 className='modal-title'>Add New Non Conformance Report</h5>
            <button type='button' className='btn-close' onClick={handleClose}></button>
          </div>

          <div className='modal-body'>
            <div className='row g-3'>
              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>NCR Number</label>
                <input
                  type='text'
                  className={`form-control ${errors.ncrNumber ? 'is-invalid' : ''}`}
                  name='ncrNumber'
                  value={formData.ncrNumber}
                  onChange={handleInputChange}
                  placeholder='Enter NCR number'
                  style={{ color: '#000' }}
                />
                {errors.ncrNumber && <div className='invalid-feedback'>{errors.ncrNumber}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Vessel</label>
                <select
                  className={`form-select ${errors.vessel ? 'is-invalid' : ''}`}
                  name='vessel'
                  value={formData.vessel}
                  onChange={handleInputChange}
                >
                  <option value=''>Select Vessel</option>
                  <option value='Troy'>Troy</option>
                  <option value='Atlas'>Atlas</option>
                  <option value='Neptune'>Neptune</option>
                </select>
                {errors.vessel && <div className='invalid-feedback'>{errors.vessel}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Priority</label>
                <select
                  className='form-select'
                  name='priority'
                  value={formData.priority}
                  onChange={handleInputChange}
                >
                  <option value='Normal'>Normal</option>
                  <option value='High'>High</option>
                  <option value='Critical'>Critical</option>
                  <option value='Low'>Low</option>
                </select>
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Assigned By</label>
                <input
                  type='text'
                  className={`form-control ${errors.assignedBy ? 'is-invalid' : ''}`}
                  name='assignedBy'
                  value={formData.assignedBy}
                  onChange={handleInputChange}
                  placeholder='Enter assigned by'
                  style={{ color: '#000' }}
                />
                {errors.assignedBy && <div className='invalid-feedback'>{errors.assignedBy}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Department (Vessel)</label>
                <select
                  className='form-select'
                  name='departmentVsl'
                  value={formData.departmentVsl}
                  onChange={handleInputChange}
                >
                  <option value=''>Select Department</option>
                  <option value='Deck'>Deck</option>
                  <option value='Engine'>Engine</option>
                  <option value='Catering'>Catering</option>
                </select>
              </div>

              <div className='col-md-6'>
                <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Department (Office)</label>
                <select
                  className='form-select'
                  name='departmentOffice'
                  value={formData.departmentOffice}
                  onChange={handleInputChange}
                >
                  <option value=''>Select Department</option>
                  <option value='HSEQ'>HSEQ</option>
                  <option value='Technical'>Technical</option>
                  <option value='Operations'>Operations</option>
                </select>
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Raised On</label>
                <input
                  type='date'
                  className={`form-control ${errors.raisedOn ? 'is-invalid' : ''}`}
                  name='raisedOn'
                  value={formData.raisedOn}
                  onChange={handleInputChange}
                  style={{ color: '#000' }}
                />
                {errors.raisedOn && <div className='invalid-feedback'>{errors.raisedOn}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>ETC (Expected Completion)</label>
                <input
                  type='date'
                  className='form-control'
                  name='etc'
                  value={formData.etc}
                  onChange={handleInputChange}
                  style={{ color: '#000' }}
                />
              </div>

               <div className='col-md-6'>
                <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Completed Date</label>
                <input
                  type='date'
                  className='form-control'
                  name='completed'
                  value={formData.completed}
                  onChange={handleInputChange}
                  style={{ color: '#000' }}
                />
              </div>

               <div className='col-md-6'>
                <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Verified Date</label>
                <input
                  type='date'
                  className='form-control'
                  name='verified'
                  value={formData.verified}
                  onChange={handleInputChange}
                  style={{ color: '#000' }}
                />
              </div>

              <div className='col-12'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Description</label>
                <textarea
                  className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                  name='description'
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={1}
                  placeholder='Enter NCR description'
                  style={{ color: '#000' }}
                />
                {errors.description && <div className='invalid-feedback'>{errors.description}</div>}
              </div>
            </div>
          </div>

          <div className='modal-footer'>
            <button type='button' className='btn btn-light btn-sm' onClick={handleClose}>
              Cancel
            </button>
            <button 
              type='button' 
              className='btn btn-secondary btn-sm me-2'
              onClick={() => handleSubmit(true)}
            >
              Save & Add New
            </button>
            <button 
              type='button' 
              className='btn btn_primary'
              onClick={() => handleSubmit(false)}
            >
              Save & Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const IncidentReport: FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [incidentData, setIncidentData] = useState<IncidentRecord[]>(mockIncidentData)
  const [sortConfig, setSortConfig] = useState<{
    key: keyof IncidentRecord | null;
    direction: 'asc' | 'desc';
  }>({ key: 'id', direction: 'desc' })
  const [showModal, setShowModal] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)

  // Filters state
const [filters, setFilters] = useState({
  fleet: '',
  vessel: '',
  incidentStatus: 'Pending',
  verifiedStatus: 'ALL',
  primaryCat: 'Incident',
  secondaryCat: '',
  potential: '',
  recurrence: '',
  departmentOffice: '',
  departmentVessel: '',
  qmsElementsRef: '',
  raisedByRank: '',
  incidentId: '',
  modifiedInLast: '',
  raisedOnFrom: '',
  raisedOnTo: '',
  completedFrom: '',
  completedTo: '',
  verifiedFrom: '',
  verifiedTo: '',

  
  showSentFromOffice: false,
  showInSafetyMeeting: false,
  showAwaitingOfficeAction: false,
})


const handleFilterChange = (name: string, value: string | boolean) => {
  setFilters(prev => ({
    ...prev,
    [name]: value,
  }))
}

const handleClearFilters = () => {
  setFilters({
    fleet: '',
    vessel: '',
    incidentStatus: 'Pending',
    verifiedStatus: 'ALL',
    primaryCat: 'Incident',
    secondaryCat: '',
    potential: '',
    recurrence: '',
    departmentOffice: '',
    departmentVessel: '',
    qmsElementsRef: '',
    raisedByRank: '',
    incidentId: '',
    modifiedInLast: '',
    raisedOnFrom: '',
    raisedOnTo: '',
    completedFrom: '',
    completedTo: '',
    verifiedFrom: '',
    verifiedTo: '',
    
   
    showSentFromOffice: false,
    showInSafetyMeeting: false,
    showAwaitingOfficeAction: false,
  })
    setSearchTerm('')
  }

  
  const filteredData = useMemo(() => {
    return incidentData.filter(record => {
      const matchesSearch =
        searchTerm === '' ||
        record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(record.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (filters.incidentId !== '' &&
          String(record.id).toLowerCase().includes(filters.incidentId.toLowerCase()))

      const matchesVessel = filters.vessel === '' || record.vessel === filters.vessel
      const matchesDeptOffice =
        filters.departmentOffice === '' || record.departmentOffice === filters.departmentOffice
      const matchesDeptVsl =
        filters.departmentVessel === '' || record.departmentVsl === filters.departmentVessel

      return matchesSearch && matchesVessel && matchesDeptOffice && matchesDeptVsl
    })
  }, [searchTerm, incidentData, filters])

  
  const sortedData = useMemo(() => {
    let sortedRecords = [...filteredData]
    if (sortConfig.key !== null) {
      sortedRecords.sort((a, b) => {
        const aVal = String(a[sortConfig.key!] || '').toLowerCase()
        const bVal = String(b[sortConfig.key!] || '').toLowerCase()
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return sortedRecords
  }, [filteredData, sortConfig])

  const handleSort = (key: keyof IncidentRecord) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const indexOfLastRecord = currentPage * rowsPerPage
  const indexOfFirstRecord = indexOfLastRecord - rowsPerPage
  const currentRecords = sortedData.slice(indexOfFirstRecord, indexOfLastRecord)
  const totalPages = Math.ceil(sortedData.length / rowsPerPage)

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(parseInt(e.target.value))
    setCurrentPage(1)
  }

  const handleAddIncident = (data: Omit<IncidentRecord, 'id'>, saveAndAddNew: boolean) => {
    const newRecord: IncidentRecord = {
      ...data,
      id: Math.max(...incidentData.map(m => m.id)) + 1
    }
    setIncidentData(prev => [...prev, newRecord])
  }

  const truncateText = (text: string, maxLength: number = 100) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  return (
    <div className='app-main flex-column flex-row-fluid' id='kt_app_main'>
      <div className='d-flex flex-column flex-column-fluid'>
        <div id='kt_app_content' className='app-content flex-column-fluid bg-white'>
          <div className='card'>

            <div className='card-header border-0 pt-6 d-flex justify-content-between bg-white'>
              <div>
                <h3 className='card-label text-dark fw-bold'>INCIDENT REPORT'S</h3>
              </div>
              <div className='card-toolbar'>
                <button
                  type='button'
                  className='btn btn_primary'
                  onClick={() => setIsModalVisible(true)}
                >
                  <KTSVG path='/media/icons/duotune/arrows/arr075.svg' className='svg-icon-2' />
                  Add New Incident Report
                </button>
              </div>
            </div>

           
            <div className='card-body py-4 bg-white border-top'>
              <div className='row gx-3 gy-3 mb-4'>
                
                <div className='col-md-2'>
                  <label className='form-label fw-semibold fs-7' style={{ color: '#A1A5B7' }}>
                    Fleet
                  </label>
                  <select
                    className='form-select'
                    style={{
                      border: '1px solid #E4E6EF',
                      borderRadius: '6px',
                      fontSize: '14px',
                      padding: '8px 12px',
                      color: '#5E6278',
                    }}
                    value={filters.fleet}
                    onChange={(e) => handleFilterChange('fleet', e.target.value)}
                  >
                    <option value=''>Select Fleet</option>
                  </select>
                </div>

                
                <div className='col-md-2'>
                  <label className='form-label fw-semibold fs-7' style={{ color: '#A1A5B7' }}>
                    Vessel
                  </label>
                  <select
                    className='form-select'
                    style={{
                      border: '1px solid #E4E6EF',
                      borderRadius: '6px',
                      fontSize: '14px',
                      padding: '8px 12px',
                      color: '#5E6278',
                    }}
                    value={filters.vessel}
                    onChange={(e) => handleFilterChange('vessel', e.target.value)}
                  >
                    <option value=''>9 items checked</option>
                    <option value='Eagle S'>Eagle S</option>
                    <option value='Troy'>Troy</option>
                    <option value='Athena'>Athena</option>
                  </select>
                </div>

                
                <div className='col-md-2'>
                  <label className='form-label fw-semibold fs-7' style={{ color: '#A1A5B7' }}>
                    Incident Status
                  </label>
                  <select
                    className='form-select'
                    style={{
                      border: '1px solid #E4E6EF',
                      borderRadius: '6px',
                      fontSize: '14px',
                      padding: '8px 12px',
                      color: '#5E6278',
                    }}
                    value={filters.incidentStatus}
                    onChange={(e) => handleFilterChange('incidentStatus', e.target.value)}
                  >
                    <option value='Pending'>Pending</option>
                    <option value='Completed'>Completed</option>
                  </select>
                </div>

               
<div className='col-md-3 d-flex align-items-end'>
  <button
    type='button'
    className='btn btn_primary me-3' 
    onClick={() => setShowModal(true)}
  >
    Additional Filters
  </button>

  <button
    type='button'
    className='btn'
    style={{
      fontSize: '14px',
      padding: '8px 16px',
      borderRadius: '6px',
      height: 'fit-content'
    }}
    onClick={handleClearFilters}
  >
    Clear All
  </button>
</div>
</div>

{/* Additional Filters Modal */}
{showModal && (
  <div 
    className="modal fade show d-flex align-items-center justify-content-center" 
    tabIndex={-1} 
    style={{ 
      backgroundColor: 'rgba(0,0,0,0.5)',
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '110%',
      zIndex: 1050
    }}
  >
    <div className="modal-dialog" style={{ width: '100%', height: '80%' }}>
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Additional Filters</h5>
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setShowModal(false)}
          ></button>
        </div>
        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <div className='row gx-4 gy-4'>
           
            <div className='col-lg-6 col-md-6'>
              <label className='form-label fw-semibold fs-7 mb-2' style={{ color: '#A1A5B7' }}>Verified Status</label>
              <select className='form-select' style={{ border: '1px solid #E4E6EF', borderRadius: '6px', fontSize: '14px', padding: '10px 14px', color: '#5E6278', minHeight: '42px' }} value={filters.verifiedStatus} onChange={(e) => handleFilterChange('verifiedStatus', e.target.value)}>
                <option value='ALL'>ALL</option>
                <option value='Verified'>Verified</option>
                <option value='Pending'>Pending</option>
              </select>
            </div>

           
            <div className='col-lg-6 col-md-6'>
              <label className='form-label fw-semibold fs-7 mb-2' style={{ color: '#A1A5B7' }}>Primary Cat</label>
              <select className='form-select' style={{ border: '1px solid #E4E6EF', borderRadius: '6px', fontSize: '14px', padding: '10px 14px', color: '#5E6278', minHeight: '42px' }} value={filters.primaryCat} onChange={(e) => handleFilterChange('primaryCat', e.target.value)}>
                <option value='Incident'>Incident</option>
              </select>
            </div>

            
            <div className='col-lg-6 col-md-6'>
              <label className='form-label fw-semibold fs-7 mb-2' style={{ color: '#A1A5B7' }}>Secondary Cat</label>
              <select className='form-select' style={{ border: '1px solid #E4E6EF', borderRadius: '6px', fontSize: '14px', padding: '10px 14px', color: '#5E6278', minHeight: '42px' }} value={filters.secondaryCat} onChange={(e) => handleFilterChange('secondaryCat', e.target.value)}>
                <option value=''>- ALL-</option>
              </select>
            </div>

            
            <div className='col-lg-6 col-md-6'>
              <label className='form-label fw-semibold fs-7 mb-2' style={{ color: '#A1A5B7' }}>Department Office</label>
              <select className='form-select' style={{ border: '1px solid #E4E6EF', borderRadius: '6px', fontSize: '14px', padding: '10px 14px', color: '#5E6278', minHeight: '42px' }} value={filters.departmentOffice} onChange={(e) => handleFilterChange('departmentOffice', e.target.value)}>
                <option value=''>- ALL -</option>
                <option value='Technical'>Technical</option>
                <option value='HSEQ'>HSEQ</option>
              </select>
            </div>

            
            <div className='col-lg-6 col-md-6'>
              <label className='form-label fw-semibold fs-7 mb-2' style={{ color: '#A1A5B7' }}>Department Vessel</label>
              <select className='form-select' style={{ border: '1px solid #E4E6EF', borderRadius: '6px', fontSize: '14px', padding: '10px 14px', color: '#5E6278', minHeight: '42px' }} value={filters.departmentVessel} onChange={(e) => handleFilterChange('departmentVessel', e.target.value)}>
                <option value=''>- ALL-</option>
                <option value='Deck'>Deck</option>
                <option value='Engine'>Engine</option>
              </select>
            </div>

            
            <div className='col-lg-6 col-md-6'>
              <label className='form-label fw-semibold fs-7 mb-2' style={{ color: '#A1A5B7' }}>Description</label>
              <input type='text' className='form-control' style={{ border: '1px solid #E4E6EF', borderRadius: '6px', fontSize: '14px', padding: '10px 14px', color: '#5E6278', minHeight: '42px' }} placeholder='Search...' value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>

            
            <div className='col-lg-6 col-md-6'>
              <label className='form-label fw-semibold fs-7 mb-2' style={{ color: '#A1A5B7' }}>Incident ID/NCR #</label>
              <input type='text' className='form-control' style={{ border: '1px solid #E4E6EF', borderRadius: '6px', fontSize: '14px', padding: '10px 14px', color: '#5E6278', minHeight: '42px' }} value={filters.incidentId} onChange={(e) => handleFilterChange('incidentId', e.target.value)} />
            </div>

            
            <div className='col-lg-6 col-md-6'>
              <label className='form-label fw-semibold fs-7 mb-2' style={{ color: '#A1A5B7' }}>Potential to become a serious accident</label>
              <select className='form-select' style={{ border: '1px solid #E4E6EF', borderRadius: '6px', fontSize: '14px', padding: '10px 14px', color: '#5E6278', minHeight: '42px' }} value={filters.potential} onChange={(e) => handleFilterChange('potential', e.target.value)}>
                <option value=''>- ALL-</option>
              </select>
            </div>

            
            <div className='col-lg-6 col-md-6'>
              <label className='form-label fw-semibold fs-7 mb-2' style={{ color: '#A1A5B7' }}>Modified In Last</label>
              <div className='input-group'>
                <input type='text' className='form-control' style={{ border: '1px solid #E4E6EF', borderRadius: '6px 0 0 6px', fontSize: '14px', padding: '10px 14px', color: '#5E6278', minHeight: '42px' }} value={filters.modifiedInLast} onChange={(e) => handleFilterChange('modifiedInLast', e.target.value)} />
                <span className="input-group-text" style={{ border: '1px solid #E4E6EF', borderRadius: '0 6px 6px 0', backgroundColor: '#f8f9fa' }}>Days</span>
              </div>
            </div>

            
            <div className='col-lg-6 col-md-6'>
              <label className='form-label fw-semibold fs-7 mb-2' style={{ color: '#A1A5B7' }}>Raised by Rank</label>
              <select className='form-select' style={{ border: '1px solid #E4E6EF', borderRadius: '6px', fontSize: '14px', padding: '10px 14px', color: '#5E6278', minHeight: '42px' }} value={filters.raisedByRank} onChange={(e) => handleFilterChange('raisedByRank', e.target.value)}>
                <option value=''>Select Rank</option>
              </select>
            </div>

            
            <div className='col-lg-6 col-md-6'>
              <label className='form-label fw-semibold fs-7 mb-2' style={{ color: '#A1A5B7' }}>Recurrence</label>
              <select className='form-select' style={{ border: '1px solid #E4E6EF', borderRadius: '6px', fontSize: '14px', padding: '10px 14px', color: '#5E6278', minHeight: '42px' }} value={filters.recurrence} onChange={(e) => handleFilterChange('recurrence', e.target.value)}>
                <option value=''>- ALL-</option>
              </select>
            </div>

           
            <div className='col-lg-6 col-md-6'>
              <label className='form-label fw-semibold fs-7 mb-2' style={{ color: '#A1A5B7' }}>QMS Elements Ref</label>
              <select className='form-select' style={{ border: '1px solid #E4E6EF', borderRadius: '6px', fontSize: '14px', padding: '10px 14px', color: '#5E6278', minHeight: '42px' }} value={filters.qmsElementsRef} onChange={(e) => handleFilterChange('qmsElementsRef', e.target.value)}>
                <option value=''>- SELECT -</option>
              </select>
            </div>

            
            <div className='col-12'>
                <div className='row gx-4'>
                    <div className='col-6'>
                        <label className='form-label fw-semibold fs-7 mb-2' style={{ color: '#A1A5B7' }}>Raised On From</label>
                        <input type="date" className='form-control' style={{ border: '1px solid #E4E6EF', borderRadius: '6px', fontSize: '14px', padding: '10px 14px', color: '#5E6278', minHeight: '42px' }} value={filters.raisedOnFrom} onChange={(e) => handleFilterChange('raisedOnFrom', e.target.value)} />
                    </div>
                    <div className='col-6'>
                        <label className='form-label fw-semibold fs-7 mb-2' style={{ color: '#A1A5B7' }}>Raised On To</label>
                        <input type="date" className='form-control' style={{ border: '1px solid #E4E6EF', borderRadius: '6px', fontSize: '14px', padding: '10px 14px', color: '#5E6278', minHeight: '42px' }} value={filters.raisedOnTo} onChange={(e) => handleFilterChange('raisedOnTo', e.target.value)} />
                    </div>
                </div>
            </div>

           
            <div className='col-12'>
                <div className='row gx-4'>
                    <div className='col-6'>
                        <label className='form-label fw-semibold fs-7 mb-2' style={{ color: '#A1A5B7' }}>Completed From</label>
                        <input type="date" className='form-control' style={{ border: '1px solid #E4E6EF', borderRadius: '6px', fontSize: '14px', padding: '10px 14px', color: '#5E6278', minHeight: '42px' }} value={filters.completedFrom} onChange={(e) => handleFilterChange('completedFrom', e.target.value)} />
                    </div>
                    <div className='col-6'>
                        <label className='form-label fw-semibold fs-7 mb-2' style={{ color: '#A1A5B7' }}>Completed To</label>
                        <input type="date" className='form-control' style={{ border: '1px solid #E4E6EF', borderRadius: '6px', fontSize: '14px', padding: '10px 14px', color: '#5E6278', minHeight: '42px' }} value={filters.completedTo} onChange={(e) => handleFilterChange('completedTo', e.target.value)} />
                    </div>
                </div>
            </div>

            
            <div className='col-12'>
                <div className='row gx-4'>
                    <div className='col-6'>
                        <label className='form-label fw-semibold fs-7 mb-2' style={{ color: '#A1A5B7' }}>Verified From</label>
                        <input type="date" className='form-control' style={{ border: '1px solid #E4E6EF', borderRadius: '6px', fontSize: '14px', padding: '10px 14px', color: '#5E6278', minHeight: '42px' }} value={filters.verifiedFrom} onChange={(e) => handleFilterChange('verifiedFrom', e.target.value)} />
                    </div>
                    <div className='col-6'>
                        <label className='form-label fw-semibold fs-7 mb-2' style={{ color: '#A1A5B7' }}>Verified To</label>
                        <input type="date" className='form-control' style={{ border: '1px solid #E4E6EF', borderRadius: '6px', fontSize: '14px', padding: '10px 14px', color: '#5E6278', minHeight: '42px' }} value={filters.verifiedTo} onChange={(e) => handleFilterChange('verifiedTo', e.target.value)} />
                    </div>
                </div>
            </div>
            
           
            <div className='col-12'>
              <div className='form-check mb-2'>
                <input className='form-check-input' type='checkbox' id='showSentFromOffice' checked={filters.showSentFromOffice} onChange={(e) => handleFilterChange('showSentFromOffice', e.target.checked)} />
                <label className='form-check-label text-muted fw-semibold fs-7' htmlFor='showSentFromOffice'>
                  Show Incident sent from office
                </label>
              </div>
              <div className='form-check mb-2'>
                <input className='form-check-input' type='checkbox' id='showInSafetyMeeting' checked={filters.showInSafetyMeeting} onChange={(e) => handleFilterChange('showInSafetyMeeting', e.target.checked)} />
                <label className='form-check-label text-muted fw-semibold fs-7' htmlFor='showInSafetyMeeting'>
                  Show in Monthly Safety Meeting?
                </label>
              </div>
              <div className='form-check'>
                <input className='form-check-input' type='checkbox' id='showAwaitingOfficeAction' checked={filters.showAwaitingOfficeAction} onChange={(e) => handleFilterChange('showAwaitingOfficeAction', e.target.checked)} />
                <label className='form-check-label text-muted fw-semibold fs-7' htmlFor='showAwaitingOfficeAction'>
                  Show Awaiting Office Action
                </label>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>
)}

              {/* Table */}
              <div className='report-table table-responsive'>
                <div style={{ overflowX: 'auto' }}>
                  <table className='table table-bordered align-middle'>
                    <thead className='table-header text-start'>
                      <tr>
                        <th rowSpan={2} onClick={() => handleSort('id')} className='cursor-pointer align-middle border-end'><div className='d-flex align-items-center'>ID<KTSVG path={`/media/map/sort-col-${sortConfig.key==='id'?sortConfig.direction==='asc'?'up-black':'down-black':'grey'}.svg`} className='svg-icon ms-2 custom-sort-icon'/></div></th>
                        <th rowSpan={2} onClick={() => handleSort('ncrNumber')} className='cursor-pointer align-middle border-end'><div className='d-flex align-items-center'>NCR #<KTSVG path={`/media/map/sort-col-${sortConfig.key==='ncrNumber'?sortConfig.direction==='asc'?'up-black':'down-black':'grey'}.svg`} className='svg-icon ms-2 custom-sort-icon'/></div></th>
                        <th rowSpan={2} onClick={() => handleSort('vessel')} className='cursor-pointer align-middle border-end'><div className='d-flex align-items-center'>Vessel<KTSVG path={`/media/map/sort-col-${sortConfig.key==='vessel'?sortConfig.direction==='asc'?'up-black':'down-black':'grey'}.svg`} className='svg-icon ms-2 custom-sort-icon'/></div></th>
                        <th rowSpan={2} onClick={() => handleSort('priority')} className='cursor-pointer align-middle border-end'><div className='d-flex align-items-center'>Priority<KTSVG path={`/media/map/sort-col-${sortConfig.key==='priority'?sortConfig.direction==='asc'?'up-black':'down-black':'grey'}.svg`} className='svg-icon ms-2 custom-sort-icon'/></div></th>
                        <th rowSpan={2} style={{minWidth: '300px'}} className='align-middle border-end'>Description</th>
                        <th rowSpan={2} className='align-middle border-end'>Assigned By</th>
                        <th colSpan={2} className='border-end text-center'>Department</th>
                        <th rowSpan={2} className='align-middle border-end'>Raised On</th>
                        <th rowSpan={2} className='align-middle border-end'>ETC</th>
                        <th rowSpan={2} className='align-middle border-end'>Completed</th>
                        <th rowSpan={2} className='align-middle border-end'>Verified</th>
                        <th rowSpan={2} className='align-middle'>Actions</th>
                      </tr>
                      <tr>
                        <th className='border-end'>Vsl</th>
                        <th className='border-end'>Office</th>
                      </tr>
                    </thead>
                    {/* Table Body */}
                    <tbody className='table-body text-start'>
                      {currentRecords.length === 0 ? (
                        <tr><td colSpan={13} className='text-center text-muted py-5'>No incident records found.</td></tr>
                      ) : (
                        currentRecords.map((record) => (
                          <tr key={record.id}>
                            <td className='text-dark fw-semibold fs-6 border-end'>{record.id}</td>
                            <td className='text-dark fw-semibold fs-6 border-end'>{record.ncrNumber || '-'}</td>
                            <td className='text-dark fw-semibold fs-6 border-end'>{record.vessel}</td>
                            <td className='text-dark fs-6 border-end'>{record.priority}</td>
                            <td className='text-gray-600 fs-7 border-end'><div title={record.description}>{truncateText(record.description, 80)}</div></td>
                            <td className='text-dark fs-6 border-end'>{record.assignedBy}</td>
                            <td className='text-dark fs-6 border-end'>{record.departmentVsl}</td>
                            <td className='text-dark fs-6 border-end'>{record.departmentOffice}</td>
                            <td className='text-dark fs-6 border-end'>{record.raisedOn}</td>
                            <td className='text-dark fs-6 text-center border-end'>{record.etc}</td>
                            <td className='text-dark fs-6 text-center border-end'>{record.completed || '-'}</td>
                            <td className='text-dark fs-6 text-center border-end'>{record.verified || '-'}</td>
                            <td className='text-center'><a href='#' className='btn btn_primary'>Actions</a></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div 
                  className='pagination-wrapper d-flex justify-content-between align-items-center py-3'
                  style={{
                    position: 'static',
                    bottom: 0,
                    backgroundColor: '#fff',
                    zIndex: 10,
                    borderTop: '1px solid #dee2e6',
                    marginTop: 'auto'
                  }}
                >
                  <div className='d-flex align-items-center'>
                    <span className='text-muted me-2'>Rows per page</span>
                    <select
                      className='form-select'
                      style={{
                        borderRadius: '20px',
                        width: '70px',
                        border: '1px solid #dee2e6',
                        fontSize: '14px',
                        padding: '4px 8px'
                      }}
                      value={rowsPerPage}
                      onChange={handleRowsPerPageChange}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                  <div className='d-flex align-items-center'>
                    <span className='text-muted me-3' style={{fontSize: '14px'}}>
                      Showing <strong>{currentRecords.length > 0 ? indexOfFirstRecord + 1 : 0}-{indexOfLastRecord < sortedData.length ? indexOfLastRecord : sortedData.length}</strong> of <strong>{sortedData.length}</strong>
                    </span>

                    <nav>
                      <ul className='pagination pagination-sm mb-0' style={{gap: '2px'}}>
                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                          <button
                            className='page-link text-muted'
                            style={{
                              backgroundColor: '#f8f9fa',
                              border: '1px solid #dee2e6',
                              padding: '8px 12px',
                              fontSize: '14px',
                              borderRadius: '6px'
                            }}
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                          >
                            ‹
                          </button>
                        </li>

                        {(() => {
                          const pages = []
                          const showPages = 5
                          let startPage = Math.max(1, currentPage - 2)
                          let endPage = Math.min(totalPages, startPage + showPages - 1)

                          if (endPage - startPage < showPages - 1) {
                            startPage = Math.max(1, endPage - showPages + 1)
                          }

                          if (startPage > 1) {
                            pages.push(
                              <li key={1} className='page-item'>
                                <button
                                  className='page-link text-muted'
                                  style={{
                                    backgroundColor: '#f8f9fa',
                                    border: '1px solid #dee2e6',
                                    padding: '8px 12px',
                                    fontSize: '14px',
                                    minWidth: '40px',
                                    borderRadius: '6px'
                                  }}
                                  onClick={() => handlePageChange(1)}
                                >
                                  1
                                </button>
                              </li>
                            )

                            if (startPage > 2) {
                              pages.push(
                                <li key='ellipsis1' className='page-item disabled'>
                                  <span className='page-link border-0 text-muted' style={{ backgroundColor: 'transparent', padding: '4px 8px' }}>...</span>
                                </li>
                              )
                            }
                          }

                          for (let i = startPage; i <= endPage; i++) {
                            pages.push(
                              <li key={i} className={`page-item ${currentPage === i ? 'active' : ''}`}>
                                <button
                                  className='page-link text-muted'
                                  style={{
                                    backgroundColor: currentPage === i ? '#F4F9FF' : 'transparent',
                                    border: '1px solid #dee2e6',
                                    padding: '8px 12px',
                                    fontSize: '14px',
                                    minWidth: '40px',
                                    borderRadius: '6px',
                                    outline: 'none',
                                    boxShadow: 'none'
                                  }}
                                  onClick={() => handlePageChange(i)}
                                >
                                  {i}
                                </button>
                              </li>
                            )
                          }

                          if (endPage < totalPages) {
                            if (endPage < totalPages - 1) {
                              pages.push(
                                <li key='ellipsis2' className='page-item disabled'>
                                  <span className='page-link border-0 text-muted' style={{ backgroundColor: 'transparent', padding: '4px 8px' }}>...</span>
                                </li>
                              )
                            }

                            pages.push(
                              <li key={totalPages} className='page-item'>
                                <button
                                  className='page-link text-muted'
                                  style={{
                                    backgroundColor: '#f8f9fa',
                                    border: '1px solid #dee2e6',
                                    padding: '8px 12px',
                                    fontSize: '14px',
                                    minWidth: '40px',
                                    borderRadius: '6px'
                                  }}
                                  onClick={() => handlePageChange(totalPages)}
                                >
                                  {totalPages}
                                </button>
                              </li>
                            )
                          }

                          return pages
                        })()}

                        <li className={`page-item ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}`}>
                          <button
                            className='page-link text-muted'
                            style={{
                              backgroundColor: '#f8f9fa',
                              border: '1px solid #dee2e6',
                              padding: '8px 12px',
                              fontSize: '14px',
                              borderRadius: '6px'
                            }}
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages || totalPages === 0}
                          >
                            ›
                          </button>
                        </li>
                      </ul>
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Incident Modal */}
      <AddIncidentModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSubmit={handleAddIncident}
      />
    </div>
  )
}

export default IncidentReport