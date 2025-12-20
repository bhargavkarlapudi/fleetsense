import React, {FC, useEffect, useState} from 'react'
import {KTSVG} from '../../../../_metronic/helpers'
import {ToastContainer, toast} from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import {useAuth} from '../../auth'
import {CertificateUploadModal} from './CertificateUploadModal'
import {CertificateViewer} from './CertificateViewer'
import {getVesselList} from '../../Management/core/_requests'
import {Vessel} from '../../Management/core/_models'
import { EditCertificateModal } from './EditCertificateModal'
import { CertificateRevisionsModal } from './CertificateRevisionsModal'
import {
  updateCertificate,
  replaceCertificateFile,
  certificateViewUrl,
  certificateDownloadUrl,
} from '../core/_requests'

// ===============================
// TYPES & INTERFACES
// ===============================
// local Certificate interface
interface Certificate {
  id: string
  certificateName: string
  dateOfIssue?: string
  dateOfExpiry?: string
  uploadedDate: string
  uploadedBy: string
  uploadedByName: string
  fileName: string
  fileUrl: string
  fileSize: string
  remarks?: string

  // NEW
  revisionCount?: number
  currentFileRevisionId?: number | null
  fileMime?: string
  filePath?: string
}


interface User {
  id: string
  name: string
  role: 'admin' | 'user'
}

type SortConfig = {
  key: 'certificateName' | 'dateOfIssue' | 'dateOfExpiry' | 'uploadedByName' | 'remarks' | 'revisionCount' | ''
  direction: 'asc' | 'desc'
}

type ExpiryStatus = 'valid' | 'expiring' | 'expired' | 'no-expiry'

const API_URL = process.env.REACT_APP_API_URL
const CERTIFICATE_API_URL = `${API_URL}/qhse/certificates`

const getExpiryStatus = (expiryDate?: string) => {
  if (!expiryDate) {
    return {status: 'no-expiry' as const, days: null as number | null, color: 'secondary'}
  }
  const today = new Date()
  const expiry = new Date(expiryDate)
  const diffTime = expiry.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return {status: 'expired' as const, days: Math.abs(diffDays), color: 'danger'}
  if (diffDays <= 30) return {status: 'expiring' as const, days: diffDays, color: 'warning'}
  return {status: 'valid' as const, days: diffDays, color: 'success'}
}

const formatDate = (dateString?: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const VesselCertificates: FC = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [selectedVesselId, setSelectedVesselId] = useState<string>('')
  const [isLoadingVessels, setIsLoadingVessels] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Sorting state
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: 'asc' });

  const {currentUser, auth} = useAuth()

  const [loading, setLoading] = useState(true)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')

  // const adminRoles = [1, 5, 2, 6]
  // const crewRanks = [1]

  // const roleId = (auth?.userDetails as any)?.roleId
  // const userId = (auth?.userDetails as any)?.id
  // const companyGroupAdminId = currentUser?.companyGroupAdminId
  // const companyAdminId = currentUser?.companyAdminId

  // const isAdd =
  //   adminRoles.includes(currentUser?.role?.id ?? -1) ||
  //   (currentUser?.role?.id === 4 && crewRanks.includes(currentUser?.rank?.id ?? -1))

const adminRoles = [1, 5, 2, 6]
const roleId = (auth?.userDetails as any)?.roleId
const userId = (auth?.userDetails as any)?.id
const companyGroupAdminId = currentUser?.companyGroupAdminId
const companyAdminId = currentUser?.companyAdminId
// For role 4: Check if rank includes "master" (case-insensitive)
const isMasterCrew = roleId === 4 && currentUser?.rank?.rank?.toLowerCase().includes('master');
const isAdd = adminRoles.includes(roleId) || isMasterCrew

// Operator split:
// - Operator with NO companyGroupAdminId → acts like Superadmin
// - Operator WITH companyGroupAdminId    → acts like Company Group Admin
const isOperator = roleId === 6
const operatorActsLikeSuperadmin = isOperator && !currentUser?.companyGroupAdminId
const operatorActsLikeGroupAdmin = isOperator && !!currentUser?.companyGroupAdminId


const [isEditOpen, setIsEditOpen] = useState(false)
const [editingCert, setEditingCert] = useState<Certificate | null>(null)

const [revModal, setRevModal] = useState<{id:number, name:string, visible:boolean}>({id:0, name:'', visible:false})


const [reloadTick, setReloadTick] = useState(0)
const forceReload = () => setReloadTick(t => t + 1)

  // Initialize component
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  // Fetch vessels based on role
  useEffect(() => {
    const fetchVessels = async () => {
      setIsLoadingVessels(true)
      try {
        const vesselList = await getVesselList()
      let vesselsForUser: Vessel[] = []

       if (roleId === 4) {
        // For crew: Fetch full list but filter to their assigned vessel ID
        if (currentUser?.vessel?.id) {
          const crewVessel = vesselList.find(v => v.id === currentUser?.vessel?.id)
          if (crewVessel) {
            vesselsForUser = [crewVessel]
            setSelectedVesselId(crewVessel.id.toString())
          } else {
            toast.error('Assigned vessel not found')
          }
        } else {
          toast.error('No vessel assigned to this crew member')
        }
      } else {
        // For other roles: Filter as before
        vesselsForUser = vesselList.filter((vessel) => {
  const isActive = vessel.active

  // Superadmin OR Operator acting like Superadmin → all active vessels
  if (roleId === 1 || operatorActsLikeSuperadmin) {
    return isActive
  }

  // Company Group Admin OR Operator acting like Company Group Admin → vessels in their group
  if (roleId === 5 || operatorActsLikeGroupAdmin) {
    return isActive && vessel.companyGroupAdmin?.id === companyGroupAdminId
  }

  // Company Admin → vessels in their subcompany
  if (roleId === 2) {
    return isActive && vessel.companyAdmin?.id === companyAdminId
  }

  return false // default: no access (crew handled above)
})

        // Auto-select first
        if (vesselsForUser.length > 0) {
          setSelectedVesselId(vesselsForUser[0].id.toString())
        }
      }

      setVessels(vesselsForUser)
      } catch (error) {
        console.error('Failed to fetch vessel list:', error)
        toast.error('Failed to load vessels')
      } finally {
        setIsLoadingVessels(false)
      }
    }

    // Only fetch vessels for specific roles
    if ([1, 2, 4, 5, 6].includes(roleId)) {
      fetchVessels()
    }
  }, [roleId, companyAdminId, companyGroupAdminId, currentUser])
// [ADD] above useEffect
const fetchCertificates = React.useCallback(async () => {
  try {
    if (!auth?.auth?.jwt) return
    let vesselIds: string[] = []

    if (roleId === 4) {
      if (currentUser?.vessel?.id) {
        vesselIds = [currentUser.vessel.id.toString()]
      } else {
        setCertificates([])
        toast.error('No vessel assigned')
        return
      }
    } else {
      if (!selectedVesselId) { setCertificates([]); return }
      vesselIds = [selectedVesselId]
    }

    const response = await fetch(`${CERTIFICATE_API_URL}/vessel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth?.auth?.jwt}`,
      },
      body: JSON.stringify(vesselIds),
    })
    if (!response.ok) throw new Error('Failed to fetch certificates')
    const data = await response.json()
    setCertificates(data)
    setCurrentPage(1)
  } catch (e) {
    console.error(e)
    toast.error('Failed to load certificates')
  } finally {
    setLoading(false)
  }
}, [auth, roleId, currentUser, selectedVesselId])

  // Fetch certificates when vessel is selected or component mounts
  useEffect(() => {
    

    // Only fetch certificates if we have auth
    // if (auth?.auth?.jwt) {
    //   fetchCertificates()
    // }
    fetchCertificates();
  }, [fetchCertificates, reloadTick, isUploadModalOpen])

  // Handle sorting
 const handleSort = (key: SortConfig['key']) => {
  let direction: 'asc' | 'desc' = 'asc'
  if (sortConfig.key === key && sortConfig.direction === 'asc') {
    direction = 'desc'
  }
  setSortConfig({ key, direction })
}


  // Filter and sort certificates
  const filteredAndSortedCertificates = React.useMemo(() => {
    let filtered = certificates.filter((cert) =>
      cert.certificateName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue: any = '';
        let bValue: any = '';

        switch (sortConfig.key) {
          case 'certificateName':
            aValue = a.certificateName.toLowerCase();
            bValue = b.certificateName.toLowerCase();
            break;
          case 'dateOfIssue':
            aValue = a.dateOfIssue ? new Date(a.dateOfIssue).getTime() : 0
            bValue = b.dateOfIssue ? new Date(b.dateOfIssue).getTime() : 0
            break;
          case 'dateOfExpiry':
            aValue = a.dateOfExpiry ? new Date(a.dateOfExpiry).getTime() : 0;
            bValue = b.dateOfExpiry ? new Date(b.dateOfExpiry).getTime() : 0;
            break;
          case 'uploadedByName':
            aValue = a.uploadedByName.toLowerCase();
            bValue = b.uploadedByName.toLowerCase();
            break;
          case 'remarks':
            aValue = (a.remarks || '').toLowerCase();
            bValue = (b.remarks || '').toLowerCase();
            break;
          case 'revisionCount':
            aValue = Number(a.revisionCount ?? 0)
            bValue = Number(b.revisionCount ?? 0)
            break
          default:
            return 0;
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [certificates, searchQuery, sortConfig]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedCertificates.length / rowsPerPage)
  const paginatedCertificates = filteredAndSortedCertificates.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  )

  // Pagination handlers
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(Number(e.target.value))
    setCurrentPage(1) // Reset to first page
  }

  // Count expiry statuses
  const expiryStats = certificates.reduce(
  (acc, cert) => {
    const s = getExpiryStatus(cert.dateOfExpiry).status
    if (s !== 'no-expiry') {
      acc[s as 'valid' | 'expiring' | 'expired']++
    }
    return acc
  },
  {valid: 0, expiring: 0, expired: 0}
)

type UploadCertificateInput = {
  certificateName: string
  dateOfIssue: string
  dateOfExpiry?: string
  fileName: string
  fileSize: string
}

const handleUploadCertificate = (newCertData: UploadCertificateInput) => {
  const newCertificate: Certificate = {
    id: `cert-${Date.now()}`,
    uploadedDate: new Date().toISOString().split('T')[0],
    // @ts-ignore
    uploadedBy: auth?.userDetails?.id,
    uploadedByName: (auth?.userDetails as any)?.username ?? '',
    fileUrl: '#',

    // data from child
    certificateName: newCertData.certificateName,
    dateOfIssue: newCertData.dateOfIssue,
    dateOfExpiry: newCertData.dateOfExpiry,
    fileName: newCertData.fileName,
    fileSize: newCertData.fileSize,

    // ✅ required by local interface
    remarks: '',
  }

  setCertificates((prev) => [newCertificate, ...prev])
}

const openEdit = (c: Certificate) => { setEditingCert(c); setIsEditOpen(true) }
const closeEdit = () => { setIsEditOpen(false); setEditingCert(null) }

const handleEditSubmit = async (p: {
  id: number, certificateName: string, dateOfIssue?: string, dateOfExpiry?: string, remarks?: string, __file?: File | null
}) => {
  try {
    await updateCertificate(p.id, {
      id: p.id as any,
      certificateName: p.certificateName,
      dateOfIssue: p.dateOfIssue,
      dateOfExpiry: p.dateOfExpiry,
      remarks: p.remarks,
    })
    if (p.__file) {
      await replaceCertificateFile(p.id, p.__file)
    }
    toast.success('Certificate updated')
    forceReload() 
  } catch (e: any) {
    toast.error(e?.message || 'Update failed')
  } finally {
    closeEdit()
    // refresh list (you already call fetch on modal close via effect; else explicitly refetch here)
  }
}


  const handleDeleteCertificate = async (certificateId: string) => {
    if (!isAdd) {
    toast.error('You do not have permission to delete certificates');
    return;
  }
    if (window.confirm('Are you sure you want to delete this certificate?')) {
      try {
        const response = await fetch(`${CERTIFICATE_API_URL}/${certificateId}`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${auth?.auth?.jwt}`,
          },
          method: 'DELETE',
        })

        if (!response.ok) {
          throw new Error('Failed to delete certificate')
        }

        // Update UI after successful delete
        setCertificates((prev) => prev.filter((cert) => cert.id !== certificateId))
        toast.success('Certificate deleted successfully')
      } catch (error) {
        console.error('❌ Error deleting certificate:', error)
        toast.error('Failed to delete certificate. Please try again.')
      }
    }
  }

  const handleDownload = async (certificate: Certificate) => {
    try {
      setDownloading(certificate.id)
      const response = await fetch(`${CERTIFICATE_API_URL}/download/${certificate.id}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${auth?.auth?.jwt}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = `${certificate.certificateName || 'certificate'}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download error:', err)
      toast.error(
        `Failed to download document: ${err instanceof Error ? err.message : 'Unknown error'}`
      )
    } finally {
      setDownloading(null)
    }
  }

  if (loading) {
    return (
      <div
        className='app-main flex-column flex-row-fluid'
        id='kt_app_main'
        style={{height: '100vh'}}
      >
        <div className='d-flex flex-column flex-column-fluid justify-content-center align-items-center'>
          <div className='spinner-border text-primary' role='status'>
            <span className='visually-hidden'>Loading...</span>
          </div>
          <span className='text-muted mt-4'>Loading Vessel Certificates...</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className='app-main flex-column flex-row-fluid p-5'
      id='kt_app_main'
      style={{height: '100vh', overflowX: 'hidden'}}
    >
      <div className='d-flex flex-column flex-column-fluid'>
        <div id='kt_app_content' className='app-content flex-column-fluid' style={{flex: 1}}>
          <div className='container-fluid'>
            {/* Header Section */}
            <div className='d-flex flex-wrap flex-stack mb-3'>
              <div className='d-flex flex-column'>
                <h1 className='fw-bold my-2'>Vessel Certificates</h1>
                <span className='fs-6 text-gray-400 fw-semibold'>
                  Manage vessel certification documents and expiry tracking
                </span>
              </div>
            </div>

            {/* Stats Cards */}
            <div className='row g-5 g-xl-8 mb-6 px-5'>
              <div className='col-xl-3 p-0 me-3'>
                <div
                  className='card'
                  style={{
                    backgroundColor: '#fff',
                    boxShadow: 'none',
                    outline: 'none',
                    border: 'none',
                  }}
                >
                  <div className='card-body p-3'>
                    <div className='d-flex align-items-center'>
                      <div className='symbol symbol-45px me-4'>
                        <div className='symbol-label bg-light-warning'>
                          <KTSVG
                            path='/media/icons/duotune/general/gen007.svg'
                            className='svg-icon-3 text-warning'
                          />
                        </div>
                      </div>
                      <div>
                        <span className='text-gray-800 fw-bold fs-2x'>{expiryStats.expiring}</span>
                        <div className='text-muted fw-semibold fs-7'>Expiring Soon</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className='col-xl-3 p-0'>
                <div
                  className='card'
                  style={{
                    backgroundColor: '#fff',
                    boxShadow: 'none',
                    outline: 'none',
                    border: 'none',
                  }}
                >
                  <div className='card-body p-3'>
                    <div className='d-flex align-items-center'>
                      <div className='symbol symbol-45px me-4'>
                        <div className='symbol-label bg-light-danger'>
                          <KTSVG
                            path='/media/icons/duotune/general/gen024.svg'
                            className='svg-icon-3 text-danger'
                          />
                        </div>
                      </div>
                      <div>
                        <span className='text-gray-800 fw-bold fs-2x'>{expiryStats.expired}</span>
                        <div className='text-muted fw-semibold fs-7'>Expired</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Certificates Table */}
            <div
              className='card py-4'
              style={{backgroundColor: '#fff', boxShadow: 'none', outline: 'none'}}
            >
              <div className='card-header border-0 d-flex flex-column gap-3'>
                {/* Title */}
                <span className='card-label fw-bold fs-3 mb-1'>Certificates</span>

                <span className='text-muted mt-1 fw-semibold fs-7'>
                  {selectedVesselId
                    ? `Certificates for ${
                        vessels.find((v) => v.id.toString() === selectedVesselId)?.fleet_name ||
                        'Selected Vessel'
                      }`
                    : [1, 2, 5, 6].includes(roleId)
                    ? 'Select a vessel to view certificates'
                    : 'All Certificates'}
                </span>
                {/* Search + Button Row */}
                <div
                  className='d-flex align-items-center position-relative flex-grow-1 me-3 gap-3'
                  style={{flexWrap: 'wrap'}}
                >
                  {/* Vessel dropdown for admin roles */}
                  {[1, 2, 5, 6].includes(roleId) && vessels.length > 0 && (
                    <div className='mt-3'>
                      <select
                        className='form-select form-select-solid'
                        value={selectedVesselId}
                        onChange={(e) => setSelectedVesselId(e.target.value)}
                      >
                        <option value=''>Select Vessel</option>
                        {vessels.map((vessel) => (
                          <option key={vessel.id} value={vessel.id}>
                            {vessel.fleet_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className='d-flex align-items-center position-relative flex-grow-1 me-3 mt-3'>
                    <KTSVG
                      path='/media/icons/duotune/general/gen021.svg'
                      className='svg-icon-1 position-absolute ms-6'
                    />
                    <input
                      type='text'
                      className='form-control form-control-solid ps-15'
                      placeholder='Search certificates...'
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  {/* Add Certificate Button */}
                  {isAdd && (roleId === 7 || selectedVesselId) && (
                    <button className='btn btn-primary mt-3' onClick={() => setIsUploadModalOpen(true)}>
                      <KTSVG
                        path='/media/icons/duotune/arrows/arr075.svg'
                        className='svg-icon-2 me-2'
                      />
                      Add Certificate
                    </button>
                  )}
                </div>
                {/* Search box */}
              </div>

              <div className='card-body pt-0'>
                <div className='table-responsive'>
                  <table className='table table-row-dashed table-row-gray-300 align-middle gs-0 gy-4'>
                    <thead>
                      <tr className='fw-bold text-muted'>
                        <th className='text-center' style={{ width: '70px' }}>SR/NO</th>
                        <th 
                          onClick={() => handleSort('certificateName')} 
                          className='min-w-250px cursor-pointer'
                        >
                          Certificate Name
                          <KTSVG
                            path={`/media/map/sort-col-${sortConfig.key === 'certificateName' 
                              ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' 
                              : 'grey'}.svg`}
                            className="svg-icon ms-2 custom-sort-icon"
                          />
                        </th>
                        <th 
                          onClick={() => handleSort('dateOfIssue')} 
                          className='min-w-120px cursor-pointer'
                        >
                          Date of Issue
                          <KTSVG
                            path={`/media/map/sort-col-${sortConfig.key === 'dateOfIssue' 
                              ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' 
                              : 'grey'}.svg`}
                            className="svg-icon ms-2 custom-sort-icon"
                          />
                        </th>
                        <th 
                          onClick={() => handleSort('dateOfExpiry')} 
                          className='min-w-150px cursor-pointer'
                        >
                          Date of Expiry
                          <KTSVG
                            path={`/media/map/sort-col-${sortConfig.key === 'dateOfExpiry' 
                              ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' 
                              : 'grey'}.svg`}
                            className="svg-icon ms-2 custom-sort-icon"
                          />
                        </th>
                        <th 
  onClick={() => handleSort('revisionCount')} 
  className='min-w-110px cursor-pointer text-nowrap'
>
  Revision No
  <KTSVG
    path={`/media/map/sort-col-${sortConfig.key === 'revisionCount' 
      ? (sortConfig.direction === 'asc' ? 'up-black' : 'down-black') 
      : 'grey'}.svg`}
    className="svg-icon ms-2 custom-sort-icon"
/>
</th>
                        <th 
                          onClick={() => handleSort('uploadedByName')} 
                          className='min-w-120px cursor-pointer'
                        >
                          Uploaded By
                          <KTSVG
                            path={`/media/map/sort-col-${sortConfig.key === 'uploadedByName' 
                              ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' 
                              : 'grey'}.svg`}
                            className="svg-icon ms-2 custom-sort-icon"
                          />
                        </th>
                        <th className='min-w-100px'>File</th>
                        <th 
                          onClick={() => handleSort('remarks')} 
                          className='min-w-100px text-end cursor-pointer'
                        >
                          Remarks
                          <KTSVG
                            path={`/media/map/sort-col-${sortConfig.key === 'remarks' 
                              ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' 
                              : 'grey'}.svg`}
                            className="svg-icon ms-2 custom-sort-icon"
                          />
                        </th>
                        <th className='min-w-100px text-end'>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedCertificates.length === 0 ? (
                        <tr>
                          <td colSpan={8} className='text-center py-10'>
                            <div className='d-flex flex-column align-items-center'>
                              <KTSVG
                                path='/media/icons/duotune/files/fil024.svg'
                                className='svg-icon-4x svg-icon-muted mb-4'
                              />
                              <span className='text-muted fs-6'>
                                {searchQuery
                                  ? 'No certificates found matching your search.'
                                  : !selectedVesselId && roleId !== 7
                                  ? 'Please select a vessel to view certificates.'
                                  : 'No certificates uploaded yet.'}
                              </span>
                              {/* {isAdd && !searchQuery && (roleId === 7 || selectedVesselId) && (
                                <button
                                  className='btn btn-primary mt-4'
                                  onClick={() => setIsUploadModalOpen(true)}
                                >
                                  Add First Certificate
                                </button>
                              )} */}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedCertificates.map((certificate, index) => {
                          const expiryInfo = getExpiryStatus(certificate.dateOfExpiry)
                          const serialNumber = (currentPage - 1) * rowsPerPage + index + 1

                          return (
                            <tr key={certificate.id}>
                              <td className='text-center'>
                                <span className='text-muted fw-semibold fs-7'>
                                  {serialNumber}
                                </span>
                              </td>
                              <td>
                                <div className='d-flex align-items-center ms-5'>
                                  <KTSVG
                                    path='/media/icons/duotune/files/fil003.svg'
                                    className='svg-icon-2 text-primary me-4'
                                  />
                                  <div className='d-flex flex-column'>
                                    <span
                                      className='text-gray-800 fw-bold text-hover-primary fs-6 cursor-pointer'
                                      onClick={() => setSelectedCertificate(certificate)}
                                    >
                                      {certificate.certificateName} ({certificate.fileSize})
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className='text-muted fw-semibold fs-7'>
                                  {formatDate(certificate.dateOfIssue)}
                                </span>
                              </td>
                              <td>
                                {expiryInfo.status === 'no-expiry' ? (
                                  <span className='text-muted fw-semibold fs-7'>No Expiry</span>
                                ) : (
                                  <div className='d-flex flex-column'>
                                    <div className='d-flex align-items-center'>
                                      <span className={`fw-bold fs-6 text-${expiryInfo.color} me-2`}>
                                        {formatDate(certificate.dateOfExpiry)}
                                      </span>
                                      {expiryInfo.status !== 'valid' && (
                                        <span className={`badge badge-light-${expiryInfo.color} badge-sm`} style={{fontSize: '10px', padding: '2px 6px'}}>
                                          {expiryInfo.status === 'expired'
                                            ? 'EXPIRED'
                                            : `${expiryInfo.days} days left`}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td className='text-muted fw-semibold fs-7 text-nowrap'>
  {certificate.revisionCount ?? 0}
</td>

                              <td>
                                <span className='text-muted fw-semibold fs-7'>
                                  {certificate.uploadedByName}
                                </span>
                              </td>
                              <td>
                                <button
                                  className='btn btn-sm btn-light-primary'
                                  onClick={() => handleDownload(certificate)}
                                  title='Download PDF'
                                  disabled={downloading === certificate.id}
                                >
                                  {downloading === certificate.id ? (
                                    <>
                                      <span className='spinner-border spinner-border-sm me-2'></span>
                                      Downloading...
                                    </>
                                  ) : (
                                    <>
                                      <KTSVG
                                        path='/media/icons/duotune/arrows/arr091.svg'
                                        className='svg-icon-5 me-1'
                                      />
                                      PDF
                                    </>
                                  )}
                                </button>
                              </td>
                              <td className='text-end'>
                                <span className='text-muted fw-semibold fs-7'>
                                  {certificate.remarks || '---'}
                                </span>
                              </td>

                              <td className='text-end'>
                                <div className='d-flex justify-content-end me-5'>
                                  <button
                                    className='btn btn-link p-0 me-3'
                                    onClick={() => setSelectedCertificate(certificate)}
                                    title='View Certificate'
                                  >
                                    <KTSVG
                                      path='/media/map/ph_eye.svg'
                                      className='svg-icon-3 text-primary'
                                    />
                                  </button>
                                 
<button className='btn btn-icon btn-sm me-1' title='Edit'
        onClick={() => openEdit(certificate as any)}>
  <KTSVG path='/media/map/edit-active.svg' />
</button>

<button className='btn btn-icon btn-sm me-1' title='History'
        onClick={() => setRevModal({ id: Number(certificate.id), name: certificate.certificateName, visible: true })}>
  <KTSVG path='/media/icons/duotune/abstract/abs026.svg' className='svg-icon-3 text-info' />
</button>
                                  {isAdd && (
                                    <button
                                      className='btn btn-link p-0'
                                      onClick={() => handleDeleteCertificate(certificate.id)}
                                      title='Delete Certificate'
                                    >
                                      <KTSVG
                                        path='/media/icons/duotune/general/gen027.svg'
                                        className='svg-icon-3 text-danger'
                                      />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {filteredAndSortedCertificates.length > 0 && (
                  <div className="pagination-wrapper d-flex justify-content-between align-items-center py-3">
                    <div className="d-flex align-items-center">
                      <span className="text-muted me-2">Rows per page</span>
                      <select
                        className="form-select"
                        style={{
                          borderRadius: "20px",
                          width: "70px",
                          border: "1px solid #dee2e6",
                          fontSize: "14px",
                          padding: "4px 8px"
                        }}
                        value={rowsPerPage}
                        onChange={handleRowsPerPageChange}
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>

                    <div className="d-flex align-items-center">
                      <span className="text-muted me-3" style={{ fontSize: "14px" }}>
                        Showing <strong>{((currentPage - 1) * rowsPerPage) + 1}-{Math.min(currentPage * rowsPerPage, filteredAndSortedCertificates.length)}</strong> of <strong>{filteredAndSortedCertificates.length}</strong>
                      </span>

                      <nav>
                        <ul className="pagination pagination-sm mb-0" style={{ gap: "2px" }}>
                          <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                            <button
                              className="page-link text-muted"
                              style={{
                                backgroundColor: "#f8f9fa",
                                border: "1px solid #dee2e6",
                                padding: "8px 12px",
                                fontSize: "14px",
                                borderRadius: "6px"
                              }}
                              onClick={() => handlePageChange(currentPage - 1)}
                              disabled={currentPage === 1}
                            >
                              ‹
                            </button>
                          </li>

                          {(() => {
                            const pages = [];
                            const showPages = 5;
                            let startPage = Math.max(1, currentPage - 2);
                            let endPage = Math.min(totalPages, startPage + showPages - 1);

                            if (endPage - startPage < showPages - 1) {
                              startPage = Math.max(1, endPage - showPages + 1);
                            }

                            if (startPage > 1) {
                              pages.push(
                                <li key={1} className="page-item">
                                  <button
                                    className="page-link text-muted"
                                    style={{
                                      backgroundColor: "#f8f9fa",
                                      border: "1px solid #dee2e6",
                                      padding: "8px 12px",
                                      fontSize: "14px",
                                      minWidth: "40px",
                                      borderRadius: "6px"
                                    }}
                                    onClick={() => handlePageChange(1)}
                                  >
                                    1
                                  </button>
                                </li>
                              );

                              if (startPage > 2) {
                                pages.push(
                                  <li key="ellipsis1" className="page-item disabled">
                                    <span className="page-link border-0 text-muted" style={{ backgroundColor: "transparent", padding: "4px 8px" }}>
                                      ...
                                    </span>
                                  </li>
                                );
                              }
                            }

                            for (let i = startPage; i <= endPage; i++) {
                              pages.push(
                                <li key={i} className={`page-item ${currentPage === i ? "active" : ""}`}>
                                  <button
                                    className="page-link text-muted"
                                    style={{
                                      backgroundColor: currentPage === i ? "#F4F9FF" : "transparent",
                                      border: "1px solid #dee2e6",
                                      padding: "8px 12px",
                                      fontSize: "14px",
                                      minWidth: "40px",
                                      borderRadius: "6px",
                                      outline: "none",
                                      boxShadow: "none"
                                    }}
                                    onClick={() => handlePageChange(i)}
                                  >
                                    {i}
                                  </button>
                                </li>
                              );
                            }

                            if (endPage < totalPages) {
                              if (endPage < totalPages - 1) {
                                pages.push(
                                  <li key="ellipsis2" className="page-item disabled">
                                    <span className="page-link border-0 text-muted" style={{ backgroundColor: "transparent", padding: "4px 8px" }}>
                                      ...
                                    </span>
                                  </li>
                                );
                              }

                              pages.push(
                                <li key={totalPages} className="page-item">
                                  <button
                                    className="page-link text-muted"
                                    style={{
                                      backgroundColor: "#f8f9fa",
                                      border: "1px solid #dee2e6",
                                      padding: "8px 12px",
                                      fontSize: "14px",
                                      minWidth: "40px",
                                      borderRadius: "6px"
                                    }}
                                    onClick={() => handlePageChange(totalPages)}
                                  >
                                    {totalPages}
                                  </button>
                                </li>
                              );
                            }

                            return pages;
                          })()}

                          <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                            <button
                              className="page-link text-muted"
                              style={{
                                backgroundColor: "#f8f9fa",
                                border: "1px solid #dee2e6",
                                padding: "8px 12px",
                                fontSize: "14px",
                                borderRadius: "6px"
                              }}
                              onClick={() => handlePageChange(currentPage + 1)}
                              disabled={currentPage === totalPages}
                            >
                              ›
                            </button>
                          </li>
                        </ul>
                      </nav>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <CertificateUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        // @ts-ignore
        onSubmit={handleUploadCertificate}
        selectedVesselId={selectedVesselId} // Pass selected vessel to modal
      />

      {/* Certificate Viewer Modal */}
      {selectedCertificate && (
        <CertificateViewer
          certificate={selectedCertificate}
          onClose={() => setSelectedCertificate(null)}
        />
      )}

      {isEditOpen && editingCert && (
  <EditCertificateModal
    visible={isEditOpen}
    onClose={closeEdit}
    record={{
      id: Number(editingCert.id),
      certificateName: editingCert.certificateName,
      dateOfIssue: editingCert.dateOfIssue,
      dateOfExpiry: editingCert.dateOfExpiry,
      remarks: editingCert.remarks,
      file: { name: editingCert.certificateName },
    }}
    onSubmit={handleEditSubmit}
    onViewFile={(id) => {
      setSelectedCertificate(editingCert)  // reuse your viewer
    }}
    vesselName={vessels.find(v => String(v.id) === String(selectedVesselId))?.name}
  />
)}

<CertificateRevisionsModal
  certificateId={revModal.id}
  name={revModal.name}
  visible={revModal.visible}
  onClose={() => setRevModal(s => ({...s, visible:false}))}
/>


      <ToastContainer />
    </div>
  )
}

export {VesselCertificates}