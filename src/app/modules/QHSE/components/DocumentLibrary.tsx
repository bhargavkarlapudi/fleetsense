import React, {FC, useEffect, useState} from 'react'
import {KTSVG} from '../../../../_metronic/helpers'
import {DocumentItem,BreadcrumbItem} from '../core/_models'
import {ToastContainer} from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import * as XLSX from 'xlsx'
import {useAuth} from '../../auth'
import {SearchBar} from './SearchBar'
import {BreadcrumbNav} from './BreadcrumbNav'
import {FolderTreeItem} from './FolderTreeItem'
import {DocumentTable} from './DocumentTable'
import {DocumentViewer} from './DocumentViewer'
import { fetchDocumentsRequest } from '../core/_requests'
import axios from 'axios'

const API_URL = process.env.REACT_APP_API_URL
const COMPANY_ADMIN_API_URL = `${API_URL}/company-group-admins`

const DocumentLibrary: FC = () => {
  const {auth, currentUser} = useAuth()
  const token = auth?.auth.jwt
  const roleId = (auth?.userDetails as any)?.roleId
  //  @ts-ignore
  const compnayId = currentUser?.companyGroupAdminId

  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [companies, setCompanies] = useState([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')

  const [searchQuery, setSearchQuery] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set())
  const [selectedFolder, setSelectedFolder] = useState<DocumentItem | null>(null)

  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    {id: 'root', title: 'Document Library'},
  ])
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null)
  const [loading, setLoading] = useState(true)

  // Determine which company ID to use for fetching documents
  const getCompanyIdForFetch = () => {
    if (roleId === 1) {
      // Superadmin: use selected company
      return selectedCompanyId
    } else {
      // Regular user: use their own company
      return compnayId ?? null
    }
  }

  // Fetch companies for superadmin
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        if (roleId !== 1) return;
        
        const data = await axios(`${COMPANY_ADMIN_API_URL}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }).then(res => res.data);

        setCompanies(data)
      } catch (error) {
        console.error('❌ Error fetching companies:', error)
      }
    }

    if (token && roleId === 1) {
      fetchCompanies()
    }
  }, [token, roleId])

  // Fetch documents when company is selected (or user's company for non-superadmin)
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true)
        
        const companyIdToFetch = getCompanyIdForFetch()
        
        // Don't fetch if no company is selected for superadmin
        if (roleId === 1 && !selectedCompanyId) {
          setDocuments([])
          setLoading(false)
          return
        }

        // Fetch documents for the selected/current company
        //  @ts-ignore
        const data = await fetchDocumentsRequest(companyIdToFetch, token ?? "")
        const doc: DocumentItem[] = data
        setDocuments(doc)
      } catch (error) {
        console.error('❌ Error fetching documents:', error)
        setDocuments([])
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      // For superadmin: only fetch when company is selected
      // For regular users: fetch immediately with their company
      if (roleId === 1) {
        if (selectedCompanyId) {
          fetchDocuments()
        } else {
          setLoading(false)
          setDocuments([])
        }
      } else {
        fetchDocuments()
      }
    }
  }, [token, selectedCompanyId, roleId, compnayId])

  // Initialize component
  useEffect(() => {
    const timer = setTimeout(() => {
      setExpandedFolders(new Set([101, 102])) // Expand some folders by default
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  // Helper function to build folder path
  const buildFolderPath = (folderId: number, documents: DocumentItem[]): DocumentItem[] => {
    const path: DocumentItem[] = []

    const findFolderPath = (
      items: DocumentItem[],
      targetId: number,
      currentPath: DocumentItem[]
    ): boolean => {
      for (const item of items) {
        const newPath = [...currentPath, item]

        if (item.id === targetId) {
          path.push(...newPath)
          return true
        }

        if (item.children && item.children.length > 0) {
          if (findFolderPath(item.children, targetId, newPath)) {
            return true
          }
        }
      }
      return false
    }

    findFolderPath(documents, folderId, [])
    return path
  }

  // Company dropdown component - moved to right side
  const CompanyDropdown = () => {
    if (roleId !== 1) return null; // Only show for superadmin

    return (
      <div className="d-flex align-items-center">
        <label className="form-label me-2 mb-0 fw-semibold text-gray-700">Company:</label>
        <select
          className="form-select form-select-sm"
          style={{ minWidth: '200px' }}
          value={selectedCompanyId}
          onChange={(e) => {
            setSelectedCompanyId(e.target.value)
            // Reset folder selection when company changes
            setSelectedFolder(null)
            setBreadcrumbs([{id: 'root', title: 'Document Library'}])
          }}
        >
          <option value="">Select Company</option>
          {companies.map((company: any) => (
            <option key={company.id} value={company.id}>
              {company.name || company.companyName || `Company ${company.id}`}
            </option>
          ))}
        </select>
      </div>
    )
  }

  // Handlers
  const handleToggleFolder = (folderId: number, level: number) => {
    const newExpanded = new Set(expandedFolders)
    
    if (newExpanded.has(folderId)) {
      // If clicking on already expanded folder, just collapse it
      newExpanded.delete(folderId)
    } else {
      // Only apply accordion behavior to top-level folders (level 0)
      if (level === 0) {
        newExpanded.clear()
        newExpanded.add(folderId)
      } else {
        // For nested folders: just add normally (no accordion behavior)
        newExpanded.add(folderId)
      }
    }
    
    setExpandedFolders(newExpanded)
  }

  // FIXED: Don't trigger API call, just update selection and breadcrumbs
  const handleSelectFolder = (folder: DocumentItem) => {
    console.log('Selected folder:', folder)

    setSelectedFolder(folder)

    // Build breadcrumbs from actual folder hierarchy
    const folderPath = buildFolderPath(folder.id, documents)
    const newBreadcrumbs: BreadcrumbItem[] = [{id: 'root', title: 'Document Library'}]

    // Add each folder in the path as a breadcrumb
    folderPath.forEach((folderItem) => {
      newBreadcrumbs.push({
        id: folderItem.id.toString(),
        title: folderItem.title,
      })
    })

    setBreadcrumbs(newBreadcrumbs)
  }

  const handleBreadcrumbNavigate = (breadcrumb: BreadcrumbItem) => {
    if (breadcrumb.id === 'root') {
      setSelectedFolder(null)
      setBreadcrumbs([{id: 'root', title: 'Document Library'}])
    } else {
      // Find the folder by ID and navigate to it
      const findFolderById = (items: DocumentItem[], id: string): DocumentItem | null => {
        for (const item of items) {
          if (item.id.toString() === id) {
            return item
          }
          if (item.children) {
            const found = findFolderById(item.children, id)
            if (found) return found
          }
        }
        return null
      }

      const targetFolder = findFolderById(documents, breadcrumb.id)
      if (targetFolder) {
        handleSelectFolder(targetFolder)
      }
    }
  }

  const handleDocumentClick = (document: DocumentItem) => {
    setSelectedDocument(document)
  }

  const handleDownload = (document: DocumentItem) => {
    console.log('Downloading document:', document.title)
  }

  // FIXED: Proper document filtering logic with search
  const getDocumentsToDisplay = (): DocumentItem[] => {
    // Get the base documents to search from
    let documentsToSearch: DocumentItem[] = []

    if (!selectedFolder) {
      // If no folder is selected, search in all documents
      const extractAllDocuments = (items: DocumentItem[]) => {
        items.forEach((item) => {
          if (item.type === 'document') {
            documentsToSearch.push(item)
          } else if (item.children) {
            extractAllDocuments(item.children)
          }
        })
      }
      extractAllDocuments(documents)
    } else {
      // If a folder is selected, search only in that folder's documents
      documentsToSearch = selectedFolder.children?.filter((item) => item.type === 'document') || []
    }

    // Apply search filter if there's a search query
    if (!searchQuery.trim()) {
      return documentsToSearch
    }

    // Filter documents based on search query
    return documentsToSearch.filter((doc) =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase())
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
          <div className='container-fluid h-100'>
            {/* Header Section */}
            <div className='d-flex flex-wrap flex-stack mb-3'>
              <h3 className='fw-bold my-2'>
                QHSE Document Library
                <span className='fs-6 text-gray-400 fw-semibold d-block mt-2'>
                  Quality, Health, Safety & Environmental Documents
                </span>
              </h3>
            </div>

            {/* Top Navigation Bar */}
            <div className='card mb-6 py-2' style={{backgroundColor:'#fff', boxShadow:'none', outline:'none', border:'none'}}>
              <div className='d-flex flex-wrap align-items-center justify-content-between py-1 px-5'>
                <BreadcrumbNav breadcrumbs={breadcrumbs} onNavigate={handleBreadcrumbNavigate} />
                <div className="d-flex align-items-center">
                  <CompanyDropdown />
                  {/* Only show search bar if company is selected (for superadmin) or user is not superadmin */}
                  {(roleId !== 1 || selectedCompanyId) && (
                    <div className="ms-3">
                      <SearchBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Show message if superadmin hasn't selected company */}
            {roleId === 1 && !selectedCompanyId ? (
              <div className='card'>
                <div className='card-body text-center py-10'>
                  <KTSVG path='/media/icons/duotune/files/fil012.svg' className='svg-icon-4x text-muted mb-4' />
                  <h4 className='text-muted mb-3'>Select a Company</h4>
                  <p className='text-muted'>
                    Choose a company from the dropdown above to view their document library.
                  </p>
                </div>
              </div>
            ) : (
              /* Main Content Area - Only show when company is selected */
              <div className='row g-6' style={{height: 'calc(100vh - 300px)'}}>
                {/* Left Panel - Folder Structure */}
                <div className='col-lg-3'>
                  <div className='card h-100' style={{backgroundColor:'#fff', boxShadow:'none', outline:'none', border:'none'}}>
                    <div className='card-header border-0 pt-6'>
                      <h3 className='card-title align-items-start flex-column'>
                        <span className='card-label fw-bold fs-3 mb-1'>Folders</span>
                        <span className='text-muted mt-1 fw-semibold fs-7'>
                          Navigate Folders & Documents
                        </span>
                      </h3>
                    </div>
                    <div className='card-body py-3' style={{overflow: 'auto'}}>
                      <div className='mb-4'>
                        {/* Show loading or folder tree */}
                        {loading ? (
                          <div className='text-center py-5'>
                            <div className='spinner-border text-primary' role='status'>
                              <span className='visually-hidden'>Loading...</span>
                            </div>
                            <p className='text-muted mt-3'>Loading folders...</p>
                          </div>
                        ) : documents.length > 0 ? (
                          documents.map((item) => (
                            <FolderTreeItem
                              key={item.id}
                              item={item}
                              level={0}
                              expandedFolders={expandedFolders}
                              selectedFolderId={selectedFolder?.id}
                              onToggleFolder={handleToggleFolder}
                              onSelectFolder={handleSelectFolder}
                            />
                          ))
                        ) : (
                          <div className='text-center text-muted py-5'>
                            <KTSVG path='/media/icons/duotune/files/fil012.svg' className='svg-icon-3x mb-3' />
                            <p>No folders available</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Panel - Document List */}
                <div className='col-lg-9'>
                  <div className='card h-100' style={{backgroundColor:'#fff', boxShadow:'none', outline:'none', border:'none'}}>
                    <div className='card-header border-0 pt-6'>
                      <h3 className='card-title align-items-start flex-column'>
                        <span className='card-label fw-bold fs-3 mb-1'>
                          Documents
                          {selectedFolder && (
                            <span className='text-primary'> - {selectedFolder.title}</span>
                          )}
                        </span>
                        <span className='text-muted mt-1 fw-semibold fs-7'>
                          {getDocumentsToDisplay().length} document
                          {getDocumentsToDisplay().length !== 1 ? 's' : ''} found
                        </span>
                      </h3>
                      {selectedFolder && (
                        <div className='card-toolbar'>
                          <button
                            className='btn btn-sm btn-light'
                            onClick={() => {
                              setSelectedFolder(null)
                              setBreadcrumbs([{id: 'root', title: 'Document Library'}])
                            }}
                          >
                            <KTSVG
                              path='/media/icons/duotune/arrows/arr063.svg'
                              className='svg-icon-5 me-2'
                            />
                            Show All Documents
                          </button>
                        </div>
                      )}
                    </div>
                    <div
                      className='card-body py-3'
                      style={{
                        height: '400px', // set any fixed height you want
                        overflowY: 'auto', // scroll only on Y-axis
                        overflowX: 'hidden', // hide horizontal scroll
                      }}
                    >
                      {/* Show loading or document table */}
                      {loading ? (
                        <div className='d-flex justify-content-center align-items-center h-100'>
                          <div className='text-center'>
                            <div className='spinner-border text-primary' role='status'>
                              <span className='visually-hidden'>Loading...</span>
                            </div>
                            <p className='text-muted mt-3'>Loading documents...</p>
                          </div>
                        </div>
                      ) : (
                        <DocumentTable
                          allDocuments={documents}
                          documents={getDocumentsToDisplay()}
                          onDocumentClick={handleDocumentClick}
                          onDownload={handleDownload}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {selectedDocument && (
        <DocumentViewer
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
          onDownload={handleDownload}
          allDocuments={[]}
        />
      )}

      <ToastContainer />
    </div>
  )
}

export {DocumentLibrary}