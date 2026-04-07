import React, { useEffect, useRef, useState } from 'react'
import { getVesselList } from '../../Management/core/_requests'
import { toast } from 'react-toastify'
import { Vessel } from '../../operations/core/_models'
import { getRanks, createCrew, getCompanyAdminList, getCompanyList } from '../core/_requests'
import { Rank, CompanyAdmin, Company } from '../core/_models'

import { useAuth } from '../../auth'
import { KTSVG } from '../../../../_metronic/helpers'

interface Props {
  isOpen: boolean
  onClose: () => void
  onCrewAdded: (password: string, link: string) => void
}

interface Certification {
  documentName: string
  file: File | null
}

const AddCrewModal: React.FC<Props> = ({ onClose, isOpen, onCrewAdded }) => {
  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null)
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null)
  const [nationality, setNationality] = useState('')
  const [department, setDepartment] = useState('')
  const [ranks, setRanks] = useState<Rank[]>([])
  const [selectedRankId, setSelectedRankId] = useState<number | ''>('')
  const [companies, setCompanies] = useState<Company[]>([])
  const [companiesbyAdmin, setCompaniesByAdmin] = useState<Company[]>([])
  const [contact, setContact] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isFormValid, setIsFormValid] = useState(false) // New state for form validity
  const [certifications, setCertifications] = useState<Certification[]>([
    { documentName: '', file: null },
  ])
  const [documents, setDocuments] = useState<Certification[]>([{ documentName: '', file: null }])

  const { currentUser } = useAuth()
  const roleEntityId = currentUser?.roleEntityId
  const roleId = currentUser?.role?.id

  const [companyAdmins, setCompanyAdmins] = useState<CompanyAdmin[]>([])
  const [selectedCompany, setSelectedCompany] = useState<{ id: number; name: string }>({
    id: 0,
    name: '',
  })
  const [selectedCompanyAdmin, setSelectedCompanyAdmin] = useState<{ id: number; name: string }>({
    id: 0,
    name: '',
  })

  useEffect(() => {
    fetchRanks()
    fetchCompanyAdmins()
    fetchCompanies()
  }, [])

  const fetchRanks = async () => {
    try {
      const ranksList = await getRanks()
      setRanks(ranksList)
    } catch (err) {
      console.error('Failed to fetch ranks:', err)
    }
  }

  const fetchCompanyAdmins = async () => {
    try {
      const companyAdminsList = await getCompanyAdminList()
      setCompanyAdmins(companyAdminsList)
    } catch (err) {
      console.error('Failed to fetch company admins:', err)
    }
  }

  const fetchCompanies = async () => {
    try {
      const companyList = await getCompanyList()
      console.log('Company List:', companyList)

      const activeCompanies = companyList.filter(
        (company) => company.active === true && company.cga.id === Number(roleEntityId)
      )
      setCompanies(activeCompanies)
    } catch (error) {
      console.error('Failed to fetch company list:', error)
    }
  }

  useEffect(() => {
    fetchVessels()
    getRanks().then(setRanks).catch(console.error)
  }, [])

  // File Type and Size Validation
  const validateFile = (file: File | null) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    const maxSize = 9 * 1024 * 1024; // 9 MB

    if (!file) return { isValid: false, message: 'No file selected.' };
    if (!validTypes.includes(file.type)) {
      return { isValid: false, message: 'Invalid file type. Only JPEG, PNG, JPG, and PDF are allowed.' };
    }
    if (file.size > maxSize) {
      return { isValid: false, message: 'File is too large. Maximum size is 9MB.' };
    }
    return { isValid: true, message: '' };
  };

  const handleCertificationChange = (index: number, key: 'documentName' | 'file', value: any) => {
    const updated = [...certifications];
    updated[index][key] = value;
    setCertifications(updated);

    // if (key === 'file') {
    //   const validation = validateFile(value);
    //   if (!validation.isValid) {
    //     setFieldErrors((prevErrors) => ({
    //       ...prevErrors,
    //       [`certification_${index}`]: validation.message,
    //     }));
    //   } else {
    //     setFieldErrors((prevErrors) => {
    //       const newErrors = { ...prevErrors };
    //       delete newErrors[`certification_${index}`];
    //       return newErrors;
    //     });
    //   }
    // }
  };

  const handleAddCertification = () => {
    setCertifications([...certifications, { documentName: '', file: null }])
  }

  const handleDocumentChange = (index: number, key: 'documentName' | 'file', value: any) => {
    const updated = [...documents];
    updated[index][key] = value;
    setDocuments(updated);

    // if (key === 'file') {
    //   const validation = validateFile(value);
    //   if (!validation.isValid) {
    //     setFieldErrors((prevErrors) => ({
    //       ...prevErrors,
    //       [`document_${index}`]: validation.message,
    //     }));
    //   } else {
    //     setFieldErrors((prevErrors) => {
    //       const newErrors = { ...prevErrors };
    //       delete newErrors[`document_${index}`];
    //       return newErrors;
    //     });
    //   }
    // }
  };

  const handleAddDocument = () => {
    setDocuments([...documents, { documentName: '', file: null }])
  }

  const handleRemoveDocument = (index: number) => {
    const updated = documents.filter((_, i) => i !== index)
    setDocuments(updated)
  }

  const handleRemoveCertification = (index: number) => {
    const updated = certifications.filter((_, i) => i !== index)
    setCertifications(updated)
  }

  const fetchCompaniesByAdmin = async (adminId: number) => {
    try {
      const companyList = await getCompanyList()
      console.log(companyList)
      const filteredCompanies = companyList.filter(
        (c) => c.cga?.id === adminId && c.active === true
      )
      setCompaniesByAdmin(filteredCompanies)
    } catch (error) {
      console.error('Failed to fetch companies:', error)
    }
  }

  const fetchVessels = async () => {
    try {
      const vesselList = await getVesselList()

      const vesselsForCompany = vesselList.filter((vessel) => {
        const isActive = vessel.active

        if (roleId === 1) {
          // Super Admin: return all active vessels
          return isActive
        } else if (roleId === 5) {
          // Group Admin: return active vessels assigned to their group
          return isActive && vessel.companyGroupAdmin?.id === roleEntityId
        } else if (roleId === 2) {
          // Company Admin: return active vessels assigned to their company
          return isActive && vessel.companyAdmin?.id === roleEntityId
        }

        return false // default: no access
      })

      setVessels(vesselsForCompany)
    } catch (error) {
      console.error('Failed to fetch vessel list:', error)
    }
  }

  const validateFields = () => {
    const errors: Record<string, string> = {}

    if (!name.trim()) errors.name = 'Name is required'
    if (!contact.trim()) {
      errors.contact = 'Contact number is required'
    } else if (!/^\+?[0-9\s\-()]{7,20}$/.test(contact)) {
      errors.contact = 'Invalid contact number'
    }
    // Email validation - if provided, check the format
    if (email.trim() && !/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) {
      errors.email = 'Invalid email format'
    }
    if (!nationality.trim()) errors.nationality = 'Nationality is required'
    if (!department.trim()) errors.department = 'Department is required'
    if (selectedRankId === '') errors.rank = 'Rank is required'

    // Date of Birth Validation (must be 18+ years old)
    if (!dateOfBirth) {
      errors.dateOfBirth = 'Date of Birth is required'
    } else if (calculateAge(dateOfBirth) < 18) {
      errors.dateOfBirth = 'You must be at least 18 years old'
    }

    // Company Validation
    if (roleId === 1 && !selectedCompanyAdmin.id) {
      errors.company = 'Company selection is required'
    }

    certifications.forEach((cert, index) => {
      if (!cert.documentName.trim() && cert.file) {
        errors[`certification_${index}`] = 'Document name is required when a file is selected.';
      }
      if (cert.documentName.trim() && !cert.file) {
        errors[`certification_${index}`] = 'A file is required when document name is provided.';
      }
      if (cert.file) {
        const fileValidation = validateFile(cert.file)
        if (!fileValidation.isValid) {
          errors[`certification_${index}`] = fileValidation.message
        }
      }
    });

    documents.forEach((doc, index) => {
      if (!doc.documentName.trim() && doc.file) {
        errors[`document_${index}`] = 'Document name is required when a file is selected.';
      }
      if (doc.documentName.trim() && !doc.file) {
        errors[`document_${index}`] = 'A file is required when document name is provided.';
      }
      if (doc.file) {
        const fileValidation = validateFile(doc.file)
        if (!fileValidation.isValid) {
          errors[`document_${index}`] = fileValidation.message
        }
      }
    });

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Real-time validation
  useEffect(() => {
    setIsFormValid(validateFields())
  }, [
    name,
    contact,
    email,
    nationality,
    department,
    selectedRankId,
    dateOfBirth,
    selectedCompanyAdmin,
    selectedCompany,
    certifications,
    documents,
  ])

  const calculateAge = (dob: Date | null): number => {
    if (!dob) return 0 // Handle null value for dateOfBirth
    const diff = Date.now() - dob.getTime()
    const ageDate = new Date(diff)
    return Math.abs(ageDate.getUTCFullYear() - 1970)
  }

  const generateUsername = (crewName: string) => {
    return crewName.trim().toLowerCase().replace(/\s+/g, '_') + Math.floor(100 + Math.random() * 900);
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$!'
    return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  }

  const handleSubmit = async () => {
    // if (!name || !dateOfBirth || !nationality || !selectedRankId || !department || !contact || !selectedCompanyAdmin) {
    //     setError('Please fill in all fields.');
    //     return;
    // }

    if (!isFormValid) return
    setLoading(true);

    const validCertifications = certifications.filter((cert) => cert.file)
    const validDocuments = documents.filter((doc) => doc.file)

    // Ensure dateOfBirth is never null by providing a fallback (e.g., current date)
    const validDateOfBirth = dateOfBirth ? dateOfBirth : new Date() // Fallback to current date if null

    try {
      const loginLink = `https://elecmeksolutions.com/auth/${selectedVessel?.vesselType}/${selectedVessel?.imoNumber}/ship-login`
      const password = generatePassword()
      const userName = generateUsername(name);

      // if (!startDate || !endDate || !selectedVessel) {
      //     setError("Start and end dates and vessel are required.");
      //     return;
      // }

      // Get companyAdminId conditionally
      const companyAdminId = roleId === 5 ? +(roleEntityId || 0) : selectedCompanyAdmin.id

      const companyId = roleId === 2 ? +(roleEntityId || 0) : selectedCompany.id

      await createCrew(
        name,
        validDateOfBirth,
        nationality,
        department,
        contact,
        email,
        userName,
        password,
        Number(selectedRankId),
        companyAdminId,
        companyId,
        validCertifications,
        validDocuments,
        notes
      )

      toast.success('Crew added successfully')
      onCrewAdded(password, loginLink)
      onClose()
    } catch (err) {
      console.error('Failed to add crew:', err)
      setError('Failed to add crew.')
      toast.error('Failed to add crew.')
    }
    finally {
      setLoading(false) // Stop loading
      setError('')
    }
  }

  if (!isOpen) return null

  return (
    <div className='modal-overlay'>
      <div
        className='modal-content'
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '70rem' }}
      >
        <div className='custom-modal-header d-flex justify-content-between align-items-center'>
          <h5 className='m-0'>Add Crew</h5>
          <button className='close-btn' onClick={onClose}>
            <KTSVG path='/media/map/x.svg' className='svg-icon-2x' />
          </button>
        </div>

        <div className='custom-modal-body'>
          {error && <div className='alert alert-danger'>{error}</div>}

          <div className='row'>
            <div className='col-md-4 mb-3'>
              <label className='modal_label'>
                Full Name <span className='text-danger'>*</span>
              </label>
              <input
                type='text'
                className='form-control'
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {fieldErrors.name && <small className='text-danger'>{fieldErrors.name}</small>}
            </div>

            <div className='col-md-4 mb-3'>
              <label className='modal_label'>
                Date of Birth <span className='text-danger'>*</span>
              </label>
              <input
                type='date'
                className='form-control'
                value={dateOfBirth ? dateOfBirth.toISOString().split('T')[0] : ''}
                onChange={(e) => setDateOfBirth(e.target.value ? new Date(e.target.value) : null)}
              />
              {fieldErrors.dateOfBirth && (
                <small className='text-danger'>{fieldErrors.dateOfBirth}</small>
              )}
            </div>

            <div className='col-md-4 mb-3'>
              <label className='modal_label' htmlFor='nationality'>
                Nationality <span className='text-danger'>*</span>
              </label>
              <select
                id='nationality'
                value={nationality}
                className='form-control'
                onChange={(e) => setNationality(e.target.value)}
              >
                <option value=''>--Select Nationality--</option>
                <option value='American'>American</option>
                <option value='Australian'>Australian</option>
                <option value='Brazilian'>Brazilian</option>
                <option value='British'>British</option>
                <option value='Canadian'>Canadian</option>
                <option value='Chinese'>Chinese</option>
                <option value='French'>French</option>
                <option value='German'>German</option>
                <option value='Indian'>Indian</option>
                <option value='Japanese'>Japanese</option>
                <option value='Other'>Other</option>
              </select>
              {fieldErrors.nationality && (
                <small className='text-danger'>{fieldErrors.nationality}</small>
              )}
            </div>
            {/* Rank */}
            <div className='col-md-4 mb-3'>
              <label className='modal_label' htmlFor='rank'>
                Rank <span className='text-danger'>*</span>
              </label>
              <select
                id='rank'
                value={selectedRankId}
                className='form-control'
                onChange={(e) =>
                  setSelectedRankId(e.target.value === '' ? '' : Number(e.target.value))
                }
              >
                <option value=''>--Select Rank--</option>
                {ranks.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.rank}
                  </option>
                ))}
              </select>
              {fieldErrors.rank && <small className='text-danger'>{fieldErrors.rank}</small>}
            </div>
            {/* Department */}
            <div className='col-md-4 mb-3'>
              <label className='modal_label' htmlFor='rank'>
                Department <span className='text-danger'>*</span>
              </label>
              <select
                id='rank'
                value={department}
                className='form-control'
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value=''>--Select Department--</option>
                <option value='Deck'>Deck</option>
                <option value='Engine'>Engine</option>
                <option value='Galley'>Galley</option>
                <option value='Others'>Others</option>
              </select>
              {fieldErrors.department && (
                <small className='text-danger'>{fieldErrors.department}</small>
              )}
            </div>

            {/* <div className="col-md-4 mb-3">
                            <label htmlFor="vessel" className="modal_label">Select Vessel <span className="text-danger">*</span></label>
                            <select
                                id="vessel"
                                className="form-control"
                                // use the selected vessel’s id, or empty if none
                                value={selectedVessel ? selectedVessel.id.toString() : ''}
                                onChange={(e) => {
                                    const id = Number(e.target.value)
                                    // look up the full Vessel object by its id
                                    const found = vessels.find(v => v.id === id) || null
                                    setSelectedVessel(found)
                                }}
                            >
                                <option value="">-- Select Vessel --</option>
                                {vessels.map((vessel) => (
                                    <option key={vessel.id} value={vessel.id}>
                                        {vessel.fleet_name}
                                    </option>
                                ))}
                            </select>
                        </div> */}

            {roleId === 5 && (
              <div className='col-md-6 mb-3'>
                <label className='modal_label'>Select Sub Company</label>
                <select
                  className='form-control'
                  value={selectedCompany?.id}
                  onChange={(e) => {
                    const id = +e.target.value
                    const obj = companies.find((c) => c.id === id)
                    setSelectedCompany(obj || { id: 0, name: '' })
                  }}
                >
                  <option value=''>-- Select Company --</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.username}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {roleId === 1 && (
              <>
                <div className='col-md-6 mb-3'>
                  <label className='modal_label'>
                    Select Company <span className='text-danger'>*</span>
                  </label>
                  <select
                    className='form-control'
                    value={selectedCompanyAdmin?.id}
                    onChange={(e) => {
                      const id = +e.target.value
                      const obj = companyAdmins.find((c) => c.id === id)
                      setSelectedCompanyAdmin(obj || { id: 0, name: '' })
                      setSelectedCompany({ id: 0, name: '' }) // Clear sub-company selection
                      fetchCompaniesByAdmin(id)
                    }}
                  >
                    <option value=''>-- Select Company --</option>
                    {companyAdmins.map((ca) => (
                      <option key={ca.id} value={ca.id}>
                        {ca.name}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.company && (
                    <small className='text-danger'>{fieldErrors.company}</small>
                  )}
                </div>
                <div className='col-md-6 mb-3'>
                  <label className='modal_label'>Select Sub Company</label>
                  <select
                    className='form-control'
                    value={selectedCompany?.id}
                    onChange={(e) => {
                      const id = +e.target.value
                      const obj = companiesbyAdmin.find((c) => c.id === id)
                      setSelectedCompany(obj || { id: 0, name: '' })
                    }}
                  >
                    <option value=''>-- Select Sub Company --</option>
                    {companiesbyAdmin.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className='col-md-4 mb-3'>
              <label className='modal_label'>
                Contact No. <span className='text-danger'>*</span>
              </label>
              <input
                type='text'
                className='form-control'
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
              {fieldErrors.contact && <small className='text-danger'>{fieldErrors.contact}</small>}
            </div>
            <div className='col-md-8 mb-3'>
              <label className='modal_label'>Email </label>
              <input
                type='email'
                className='form-control'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {fieldErrors.email && <small className='text-danger'>{fieldErrors.email}</small>}
            </div>
            {/* Certifications */}
            <div className='col-12 mb-3'>
              <label className='modal_label'>Certifications</label>
              {certifications.map((cert, index) => (
                <div key={index} className='d-flex gap-2 align-items-center mb-2'>
                  <input
                    type='text'
                    className='form-control'
                    placeholder='Document Name'
                    value={cert.documentName}
                    onChange={(e) =>
                      handleCertificationChange(index, 'documentName', e.target.value)
                    }
                    style={{ maxWidth: '400px' }}
                  />
                  <input
                    type='file'
                    className='form-control'
                    onChange={(e) =>
                      handleCertificationChange(index, 'file', e.target.files?.[0] || null)
                    }
                    style={{ maxWidth: '350px' }}
                  />
                  {fieldErrors[`certification_${index}`] && <small className="text-danger">{fieldErrors[`certification_${index}`]}</small>}
                  {/* Trash icon to remove certification */}
                  <button
                    className='btn btn-sm btn-icon btn-secondary'
                    onClick={() => handleRemoveCertification(index)}
                  >
                    <KTSVG path='/media/map/trash.svg' className='svg-icon-2' />
                  </button>
                </div>
              ))}
              <button
                type='button'
                className='btn btn-sm btn-primary mt-1'
                onClick={handleAddCertification}
              >
                Add Certification
              </button>
            </div>
            <div className='col-12 mb-3'>
              <label className='modal_label'>Documents</label>
              {documents.map((doc, index) => (
                <div key={index} className='d-flex gap-2 align-items-center mb-2'>
                  <input
                    type='text'
                    className='form-control'
                    placeholder='Document Name'
                    value={doc.documentName}
                    onChange={(e) => handleDocumentChange(index, 'documentName', e.target.value)}
                    style={{ maxWidth: '400px' }}
                  />
                  <input
                    type='file'
                    className='form-control'
                    onChange={(e) =>
                      handleDocumentChange(index, 'file', e.target.files?.[0] || null)
                    }
                    style={{ maxWidth: '350px' }}
                  />
                  {fieldErrors[`document_${index}`] && <small className="text-danger">{fieldErrors[`document_${index}`]}</small>}
                  {/* Trash icon to remove document */}
                  <button
                    className='btn btn-sm btn-icon btn-secondary'
                    onClick={() => handleRemoveDocument(index)}
                  >
                    <KTSVG path='/media/map/trash.svg' className='svg-icon-2' />
                  </button>
                </div>
              ))}
              <button
                type='button'
                className='btn btn-sm btn-primary mt-1'
                onClick={handleAddDocument}
              >
                Add Document
              </button>
            </div>
            {/* <div className="col-6 mb-3">
                            <label className="modal_label">Start Date</label>
                            <input type="date" className="form-control"
                                value={startDate ? startDate.toISOString().split('T')[0] : ''}
                                onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)} />
                        </div>
                        <div className="col-6 mb-3">
                            <label className="modal_label">End Date</label>
                            <input type="date" className="form-control"
                                value={endDate ? endDate.toISOString().split('T')[0] : ''}
                                onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : null)} />
                        </div> */}

            <div className='col-12 mb-3'>
              <label htmlFor='notes' className='modal_label'>
                Notes
              </label>
              <textarea
                id='notes'
                className='form-control'
                rows={4}
                placeholder='Enter any additional notes...'
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className='d-flex justify-content-end gap-2'>
          <button className='btn btn_secondary' onClick={onClose}>
            Cancel
          </button>
          <button className='btn btn_success' onClick={handleSubmit} disabled={loading || !isFormValid}>
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddCrewModal
