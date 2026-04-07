import React, {FC, useCallback, useEffect, useRef, useState} from 'react'
import {KTSVG} from '../../../../_metronic/helpers'
import {DocumentItem,BreadcrumbItem} from '../core/_models'
import {ToastContainer, toast} from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import {useAuth} from '../../auth'
import {SearchBar} from './SearchBar'
import {BreadcrumbNav} from './BreadcrumbNav'
import {FolderTreeItem} from './FolderTreeItem'
import {DocumentTable} from './DocumentTable'
import {DocumentViewer} from './DocumentViewer'
import ConfirmDialog from '../../../components/ConfirmDialog'
import { createQhseFolderRequest, deleteQhseDocumentRequest, fetchDocumentsRequest, updateQhseDocumentRequest, uploadQhseDocumentsRequest, uploadQhseZipRequest } from '../core/_requests'

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
  const [uploading, setUploading] = useState(false)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderCategory, setNewFolderCategory] = useState('')
  const [uploadMode, setUploadMode] = useState<'files' | 'zip'>('files')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const selectedFolderIdRef = useRef<number | null>(null)
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    title: string
    message: string
    tone?: 'danger' | 'primary'
    onConfirm: () => Promise<void> | void
  }>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => undefined,
  })
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [renameState, setRenameState] = useState<{
    id: number | null
    title: string
    type: 'folder' | 'document' | null
  }>({
    id: null,
    title: '',
    type: null,
  })
  const [renaming, setRenaming] = useState(false)

  const findFolderById = useCallback((items: DocumentItem[], id?: number | string): DocumentItem | null => {
    if (id == null) return null
    const targetId = Number(id)
    for (const item of items) {
      if (item.type === 'folder' && item.id === targetId) {
        return item
      }
      if (item.children?.length) {
        const found = findFolderById(item.children, targetId)
        if (found) return found
      }
    }
    return null
  }, [])

  // Determine which company ID to use for fetching documents
  const getCompanyIdForFetch = useCallback(() => {
    if (roleId === 1) {
      // Superadmin: use selected company
      return selectedCompanyId ? Number(selectedCompanyId) : null
    }
    // Regular user: use their own company
    return compnayId ?? null
  }, [compnayId, roleId, selectedCompanyId])

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

      // Auto-select the first company only if none is selected yet
      if (!selectedCompanyId && data && data.length > 0) {
        setSelectedCompanyId(data[0].id.toString())
      }
    } catch (error) {
      console.error('❌ Error fetching companies:', error)
    }
  }

  if (token && roleId === 1) {
    fetchCompanies()
  }
}, [token, roleId, selectedCompanyId])

  // Fetch documents when company is selected (or user's company for non-superadmin)
  const refreshDocuments = useCallback(async () => {
    try {
      setLoading(true)
      const companyIdToFetch = getCompanyIdForFetch()
      if (!companyIdToFetch) {
        setDocuments([])
        setLoading(false)
        return
      }

      const data = await fetchDocumentsRequest(companyIdToFetch, token ?? '')
      const doc: DocumentItem[] = data
      setDocuments(doc)
      if (selectedFolderIdRef.current != null) {
        const refreshed = findFolderById(doc, selectedFolderIdRef.current)
        if (refreshed) {
          setSelectedFolder(refreshed)
          const folderPath = buildFolderPath(refreshed.id, doc)
          const newBreadcrumbs: BreadcrumbItem[] = [{id: 'root', title: 'Document Library'}]
          folderPath.forEach((folderItem) => {
            newBreadcrumbs.push({
              id: folderItem.id.toString(),
              title: folderItem.title,
            })
          })
          setBreadcrumbs(newBreadcrumbs)
        } else {
          setSelectedFolder(null)
          selectedFolderIdRef.current = null
          setBreadcrumbs([{id: 'root', title: 'Document Library'}])
        }
      }
    } catch (error) {
      console.error('❌ Error fetching documents:', error)
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }, [findFolderById, getCompanyIdForFetch, token])

  useEffect(() => {
    if (!token) return
    refreshDocuments()
  }, [refreshDocuments, token])

  useEffect(() => {
    if (roleId !== 1) return
    if (!selectedCompanyId) return
    setSelectedFolder(null)
    selectedFolderIdRef.current = null
    setBreadcrumbs([{id: 'root', title: 'Document Library'}])
  }, [roleId, selectedCompanyId])

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
          selectedFolderIdRef.current = null
          setBreadcrumbs([{id: 'root', title: 'Document Library'}])
        }}
      >
        {/* Remove the "Select Company" option since we auto-select the first one */}
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

  
  const handleSelectFolder = (folder: DocumentItem) => {
    console.log('Selected folder:', folder)

    setSelectedFolder(folder)
    selectedFolderIdRef.current = folder.id

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
      selectedFolderIdRef.current = null
      setBreadcrumbs([{id: 'root', title: 'Document Library'}])
    } else {
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

  const handleUploadClick = () => {
    const companyIdToUpload = getCompanyIdForFetch()
    if (!companyIdToUpload) {
      toast.error('Select a company before uploading documents.')
      return
    }
    if (!token) {
      toast.error('Authentication token missing.')
      return
    }
    fileInputRef.current?.click()
  }

  const handleUploadChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!files.length) return

    if (!token) {
      toast.error('Authentication token missing.')
      return
    }

    const companyIdToUpload = getCompanyIdForFetch()
    if (!companyIdToUpload) {
      toast.error('Select a company before uploading documents.')
      return
    }

    const uploaderName = currentUser?.username || (auth?.userDetails as any)?.username || ''
    if (!uploaderName) {
      toast.error('Unable to determine uploader details.')
      return
    }

    const parentId = selectedFolder?.type === 'folder' ? selectedFolder.id : null

    try {
      setUploading(true)
      if (uploadMode === 'zip') {
        if (files.length !== 1) {
          toast.error('Please select a single ZIP file.')
          return
        }
        const file = files[0]
        if (!file.name.toLowerCase().endsWith('.zip')) {
          toast.error('Only .zip files are allowed for ZIP upload.')
          return
        }
        await uploadQhseZipRequest(
          {
            companyGroupId: companyIdToUpload,
            category: selectedFolder?.title || undefined,
            scopeType: 'COMPANY',
            file,
          },
          token ?? '',
          parentId
        )
      } else {
        if (files.length > 10) {
          toast.error('You can upload a maximum of 10 files at a time.')
          return
        }
        await uploadQhseDocumentsRequest(
          {
            companyGroupId: companyIdToUpload,
            category: selectedFolder?.title || undefined,
            createdBy: uploaderName,
            scopeType: 'COMPANY',
            files,
          },
          token ?? '',
          parentId
        )
      }
      toast.success('Documents uploaded successfully.')
      await refreshDocuments()
    } catch (error) {
      console.error('❌ Error uploading documents:', error)
      toast.error('Unable to upload documents.')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteDocument = async (document: DocumentItem) => {
    if (!token) {
      toast.error('Authentication token missing.')
      return
    }
    setConfirmState({
      open: true,
      title: 'Delete document',
      message: `Delete "${document.title}"? This cannot be undone.`,
      tone: 'danger',
      onConfirm: async () => {
        await deleteQhseDocumentRequest(document.id, token ?? '')
        toast.success('Document deleted.')
        if (selectedDocument?.id === document.id) {
          setSelectedDocument(null)
        }
        await refreshDocuments()
      },
    })
  }

  const handleDeleteFolder = async (folder: DocumentItem) => {
    if (!token) {
      toast.error('Authentication token missing.')
      return
    }
    setConfirmState({
      open: true,
      title: 'Delete folder',
      message: `Delete folder "${folder.title}" and all files inside? This cannot be undone.`,
      tone: 'danger',
      onConfirm: async () => {
        await deleteQhseDocumentRequest(folder.id, token ?? '')
        toast.success('Folder deleted.')
        if (selectedFolder?.id === folder.id) {
          setSelectedFolder(null)
          selectedFolderIdRef.current = null
          setBreadcrumbs([{id: 'root', title: 'Document Library'}])
        }
        await refreshDocuments()
      },
    })
  }

  const startRename = (item: DocumentItem) => {
    setRenameState({ id: item.id, title: item.title, type: item.type })
  }

  const cancelRename = () => {
    setRenameState({ id: null, title: '', type: null })
  }

  const commitRename = async (item: DocumentItem) => {
    if (!token) {
      toast.error('Authentication token missing.')
      return
    }
    if (renameState.id !== item.id) return
    const trimmed = renameState.title.trim()
    if (!trimmed) {
      toast.error('Name cannot be empty.')
      return
    }
    if (trimmed === item.title) {
      cancelRename()
      return
    }
    try {
      setRenaming(true)
      await updateQhseDocumentRequest(item.id, { title: trimmed }, token ?? '')
      toast.success(`${item.type === 'folder' ? 'Folder' : 'Document'} renamed.`)
      cancelRename()
      await refreshDocuments()
      if (selectedDocument?.id === item.id) {
        setSelectedDocument({ ...selectedDocument, title: trimmed })
      }
      if (selectedFolder?.id === item.id) {
        setSelectedFolder({ ...selectedFolder, title: trimmed })
      }
    } catch (error) {
      console.error('❌ Error renaming:', error)
      toast.error('Unable to rename.')
    } finally {
      setRenaming(false)
    }
  }

  const openCreateFolder = () => {
    const companyIdToUpload = getCompanyIdForFetch()
    if (!companyIdToUpload) {
      toast.error('Select a company before creating a folder.')
      return
    }
    if (!token) {
      toast.error('Authentication token missing.')
      return
    }
    setNewFolderName('')
    setNewFolderCategory('')
    setShowCreateFolder(true)
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    if (!token) {
      toast.error('Authentication token missing.')
      return
    }
    const companyIdToCreate = getCompanyIdForFetch()
    if (!companyIdToCreate) {
      toast.error('Select a company before creating a folder.')
      return
    }

    const parentId = selectedFolder?.type === 'folder' ? selectedFolder.id : null
    const uploaderName = currentUser?.username || (auth?.userDetails as any)?.username || ''
    if (!uploaderName) {
      toast.error('Unable to determine creator details.')
      return
    }

    try {
      setCreatingFolder(true)
      await createQhseFolderRequest(
        {
          companyGroupId: companyIdToCreate,
          title: newFolderName.trim(),
          category: newFolderCategory.trim() || undefined,
          createdBy: uploaderName,
          scopeType: 'COMPANY',
        },
        token ?? '',
        parentId
      )
      toast.success('Folder created successfully.')
      setShowCreateFolder(false)
      await refreshDocuments()
    } catch (error) {
      console.error('❌ Error creating folder:', error)
      toast.error('Unable to create folder.')
    } finally {
      setCreatingFolder(false)
    }
  }

  
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
                              onDeleteFolder={handleDeleteFolder}
                              onStartRename={startRename}
                              onRenameChange={(value) =>
                                setRenameState((prev) => ({ ...prev, title: value }))
                              }
                              onCancelRename={cancelRename}
                              onCommitRename={commitRename}
                              renamingId={renameState.id}
                              renamingValue={renameState.title}
                              renamingBusy={renaming}
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
                      <div className='card-toolbar d-flex flex-wrap align-items-center justify-content-end gap-2'>
                          <button
                            type='button'
                            className='btn btn-sm btn-light'
                            onClick={openCreateFolder}
                            disabled={creatingFolder || !token || (roleId === 1 && !selectedCompanyId)}
                            title={selectedFolder ? `Create folder under ${selectedFolder.title}` : 'Create folder'}
                          >
                            Create Folder
                          </button>
                          <button
                            type='button'
                            className='btn btn-sm btn-primary'
                            onClick={handleUploadClick}
                            disabled={uploading || !token || (roleId === 1 && !selectedCompanyId)}
                            title={
                              selectedFolder
                                ? `Upload documents to ${selectedFolder.title}`
                                : 'Upload documents'
                            }
                          >
                            {uploading ? 'Uploading...' : 'Upload Documents'}
                          </button>
                          <select
                            className='form-select form-select-sm'
                            style={{ width: 120 }}
                            value={uploadMode}
                            onChange={(e) => setUploadMode(e.target.value as 'files' | 'zip')}
                            disabled={uploading}
                          >
                            <option value='files'>Files (1-10)</option>
                            <option value='zip'>ZIP upload</option>
                          </select>
                          {selectedFolder && (
                            <button
                              type='button'
                              className='btn btn-sm btn-light'
                              onClick={() => {
                                setSelectedFolder(null)
                                selectedFolderIdRef.current = null
                                setBreadcrumbs([{id: 'root', title: 'Document Library'}])
                              }}
                            >
                              <KTSVG
                                path='/media/icons/duotune/arrows/arr063.svg'
                                className='svg-icon-5 me-2'
                              />
                              Show All Documents
                            </button>
                          )}
                      </div>
                    </div>
                    
                    <div className='card-body py-3' style={{flex: 1, overflow: 'hidden'}}>
                      
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
                          onDelete={handleDeleteDocument}
                          onStartRename={startRename}
                          onRenameChange={(value) =>
                            setRenameState((prev) => ({ ...prev, title: value }))
                          }
                          onCancelRename={cancelRename}
                          onCommitRename={commitRename}
                          renamingId={renameState.id}
                          renamingValue={renameState.title}
                          renamingBusy={renaming}
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
          allDocuments={documents}
          onClose={() => setSelectedDocument(null)}
          onDownload={handleDownload}
          simpleView
        />
      )}

      <input
        ref={fileInputRef}
        type='file'
        multiple={uploadMode === 'files'}
        accept={uploadMode === 'zip' ? '.zip' : undefined}
        className='d-none'
        onChange={handleUploadChange}
      />

      {showCreateFolder && (
        <div
          className='modal fade show d-flex align-items-center justify-content-center'
          tabIndex={-1}
          style={{
            backgroundColor: 'rgba(0,0,0,0.5)',
            position: 'fixed',
            inset: 0,
            zIndex: 1050,
          }}
        >
          <div className='modal-dialog modal-dialog-centered' role='document' style={{ maxWidth: 520, width: '100%' }}>
            <div className='modal-content'>
              <div className='modal-header'>
                <div>
                  <h5 className='modal-title mb-0'>Create Folder</h5>
                  {selectedFolder ? (
                    <div className='text-muted small'>Parent: {selectedFolder.title}</div>
                  ) : null}
                </div>
                <button
                  type='button'
                  className='btn-close'
                  onClick={() => setShowCreateFolder(false)}
                  aria-label='Close'
                />
              </div>
              <div className='modal-body'>
                <div className='mb-3'>
                  <label className='form-label text-gray-800'>Folder Name</label>
                  <input
                    className='form-control'
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder='e.g. Apex Manual'
                  />
                </div>
                <div>
                  <label className='form-label text-gray-800'>Category (optional)</label>
                  <input
                    className='form-control'
                    value={newFolderCategory}
                    onChange={(e) => setNewFolderCategory(e.target.value)}
                    placeholder='Imported'
                  />
                </div>
              </div>
              <div className='modal-footer'>
                <button type='button' className='btn btn-light' onClick={() => setShowCreateFolder(false)}>
                  Cancel
                </button>
                <button
                  type='button'
                  className='btn btn-primary'
                  onClick={handleCreateFolder}
                  disabled={creatingFolder || !newFolderName.trim()}
                >
                  {creatingFolder ? 'Creating...' : 'Create Folder'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        tone={confirmState.tone}
        confirmLabel='Delete'
        busy={confirmBusy}
        onCancel={() => setConfirmState((prev) => ({ ...prev, open: false }))}
        onConfirm={async () => {
          try {
            setConfirmBusy(true)
            await confirmState.onConfirm()
          } catch (error) {
            console.error('❌ Confirm action failed:', error)
            toast.error('Unable to complete action.')
          } finally {
            setConfirmBusy(false)
            setConfirmState((prev) => ({ ...prev, open: false }))
          }
        }}
      />


      <ToastContainer />
    </div>
  )
}

export {DocumentLibrary}
