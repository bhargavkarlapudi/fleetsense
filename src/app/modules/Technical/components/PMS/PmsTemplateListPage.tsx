import React, { FC, useState, useEffect, useMemo } from 'react'
import { KTSVG } from '../../../../../_metronic/helpers'
import {
  getPmsTemplates,
  getPmsTemplate,
  createPmsTemplate,
  updatePmsTemplate,
  deletePmsTemplate,
} from '../../core/pms/_requests'
import { PmsTemplateDto } from '../../core/pms/_models'
import { toast } from 'react-toastify'
import { AddTemplateModal } from './AddTemplateModal'
import { ViewTemplateModal } from './ViewTemplateModal'
import { EditTemplateModal } from './EditTemplateModal'
import { AddTemplateTaskModal } from './AddTemplateTaskModal'
import { ExcelImportModal } from './ExcelImportModal'

const PmsTemplateListPage: FC = () => {
  const [templates, setTemplates] = useState<PmsTemplateDto[]>([])
  const [loading, setLoading] = useState(false)

  // Modals
  const [addOpen, setAddOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [viewing, setViewing] = useState<PmsTemplateDto | null>(null)
  const [editing, setEditing] = useState<PmsTemplateDto | null>(null)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [taskModalTemplateId, setTaskModalTemplateId] = useState<number | null>(null)
  const [taskModalTemplateName, setTaskModalTemplateName] = useState<string>('')
  const [excelImportOpen, setExcelImportOpen] = useState(false)
  const [excelImportTemplateId, setExcelImportTemplateId] = useState<number | null>(null)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [searchTerm, setSearchTerm] = useState('')

  // Sorting
  const [sortColumn, setSortColumn] = useState<keyof PmsTemplateDto | ''>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const data = await getPmsTemplates()
      setTemplates(data)
    } catch (error) {
      console.error('Error loading templates:', error)
      toast.error('Failed to load templates', { position: 'top-center' })
    } finally {
      setLoading(false)
    }
  }

  const filteredData = useMemo(() => {
    let data = [...templates]

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      data = data.filter(t =>
        t.name.toLowerCase().includes(term) ||
        (t.description && t.description.toLowerCase().includes(term)) ||
        (t.machineryType && t.machineryType.toLowerCase().includes(term)) ||
        (t.maker && t.maker.toLowerCase().includes(term)) ||
        (t.model && t.model.toLowerCase().includes(term))
      )
    }

    // Sort
    if (sortColumn) {
      data.sort((a, b) => {
        const aVal = a[sortColumn]
        const bVal = b[sortColumn]
        if (aVal == null && bVal == null) return 0
        if (aVal == null) return 1
        if (bVal == null) return -1

        if (sortColumn === 'createdAt' || sortColumn === 'updatedAt') {
          const aTime = aVal ? new Date(String(aVal)).getTime() : 0
          const bTime = bVal ? new Date(String(bVal)).getTime() : 0
          return sortOrder === 'asc' ? aTime - bTime : bTime - aTime
        }

        const aStr = String(aVal).toLowerCase()
        const bStr = String(bVal).toLowerCase()
        if (aStr < bStr) return sortOrder === 'asc' ? -1 : 1
        if (aStr > bStr) return sortOrder === 'asc' ? 1 : -1
        return 0
      })
    }

    return data
  }, [templates, searchTerm, sortColumn, sortOrder])

  const handleSort = (column: keyof PmsTemplateDto) => {
    setSortColumn(prevCol => {
      if (prevCol === column) {
        setSortOrder(prevDir => (prevDir === 'asc' ? 'desc' : 'asc'))
        return prevCol
      }
      setSortOrder('asc')
      return column
    })
  }

  const indexOfLastRecord = currentPage * rowsPerPage
  const indexOfFirstRecord = indexOfLastRecord - rowsPerPage
  const currentRecords = filteredData.slice(indexOfFirstRecord, indexOfLastRecord)
  const totalPages = Math.ceil(filteredData.length / rowsPerPage)

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) setCurrentPage(page)
  }

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10))
    setCurrentPage(1)
  }

  const handleView = async (id: number) => {
    try {
      const template = await getPmsTemplate(id)
      setViewing(template)
      setViewOpen(true)
    } catch (error) {
      console.error('Error loading template:', error)
      toast.error('Failed to load template', { position: 'top-center' })
    }
  }

  const handleEdit = async (id: number) => {
    try {
      const template = await getPmsTemplate(id)
      setEditing(template)
      setEditOpen(true)
    } catch (error) {
      console.error('Error loading template:', error)
      toast.error('Failed to load template', { position: 'top-center' })
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this template? This will not affect existing plans created from it.')) {
      return
    }
    try {
      await deletePmsTemplate(id)
      toast.success('Template deleted successfully', { position: 'top-center' })
      loadTemplates()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete template', { position: 'top-center' })
    }
  }

  return (
    <div className='app-main flex-column flex-row-fluid' id='kt_app_main'>
      <div className='d-flex flex-column flex-column-fluid'>
        <div id='kt_app_content' className='app-content flex-column-fluid bg-white'>
          <div className='card'>
            <div className='card-header border-0 pt-6 d-flex justify-content-between bg-white'>
              <div>
                <h3 className='card-label text-dark fw-bold'>PMS Templates</h3>
                <span className='text-muted fs-7'>
                  Manage maintenance templates for creating vessel-specific plans
                </span>
              </div>
              <div className='card-toolbar d-flex gap-2'>
                <button
                  type='button'
                  className='btn btn-primary'
                  onClick={() => setAddOpen(true)}
                >
                  <KTSVG path='/media/icons/duotune/arrows/arr075.svg' className='svg-icon-2' />
                  Add New Template
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className='card-body py-4 bg-white border-top'>
              <div className='row gx-3 gy-3 mb-4'>
                {/* Search */}
                <div className='col-md-6'>
                  <label className='form-label fw-semibold fs-7' style={{ color: '#A1A5B7' }}>
                    Search
                  </label>
                  <div className='position-relative'>
                    <div className='position-absolute ms-3' style={{ top: '50%', transform: 'translateY(-50%)', zIndex: 1 }}>
                      <KTSVG path='/media/icons/duotune/general/gen021.svg' className='svg-icon-2' />
                    </div>
                    <input
                      type='text'
                      className='form-control form-control-sm ps-10'
                      placeholder='Template name, machinery type, maker, model...'
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div className='col-md-2 d-flex align-items-end'>
                  <button
                    type='button'
                    className='btn btn-light'
                    onClick={() => setSearchTerm('')}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className='report-table table-responsive' style={{ position: 'relative' }}>
                {loading && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(255,255,255,0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 5,
                    }}
                  >
                    <div className='spinner-border' role='status'>
                      <span className='visually-hidden'>Loading...</span>
                    </div>
                  </div>
                )}
                <div style={{ overflowX: 'auto' }}>
                  <table className='table table-bordered align-middle'>
                    <thead className='table-header text-start'>
                      <tr>
                        <th style={{ minWidth: '70px' }} className='text-center text-nowrap'>
                          Sr/No
                        </th>
                        <th style={{ minWidth: '200px' }}>
                          <div className='d-flex align-items-center text-nowrap'>
                            <span className='me-1'>Template Name</span>
                            <button
                              type='button'
                              className='btn btn-link p-0 m-0 pb-1'
                              onClick={() => handleSort('name')}
                              disabled={templates.length === 0}
                            >
                              <KTSVG
                                path={`/media/map/sort-col-${
                                  sortColumn === 'name'
                                    ? sortOrder === 'asc'
                                      ? 'up-black'
                                      : 'down-black'
                                    : 'grey'
                                }.svg`}
                                className='svg-icon-3'
                              />
                            </button>
                          </div>
                        </th>
                        <th style={{ minWidth: '150px' }}>Machinery Type</th>
                        <th style={{ minWidth: '150px' }}>Maker</th>
                        <th style={{ minWidth: '150px' }}>Model</th>
                        <th style={{ minWidth: '200px' }}>Description</th>
                        <th style={{ minWidth: '100px' }} className='text-center'>
                          Status
                        </th>
                        <th style={{ minWidth: '150px', textAlign: 'center' }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className='table-body text-start'>
                      {loading ? (
                        <tr>
                          <td colSpan={8} className='text-center py-5'>
                            <div className='spinner-border' role='status'>
                              <span className='visually-hidden'>Loading...</span>
                            </div>
                          </td>
                        </tr>
                      ) : currentRecords.length === 0 ? (
                        <tr>
                          <td colSpan={8} className='text-center py-5 text-muted'>
                            No templates found
                          </td>
                        </tr>
                      ) : (
                        currentRecords.map((template, idx) => (
                          <tr key={template.id}>
                            <td className='text-center'>
                              {indexOfFirstRecord + idx + 1}
                            </td>
                            <td className='fw-semibold'>{template.name}</td>
                            <td>{template.machineryType || '-'}</td>
                            <td>{template.maker || '-'}</td>
                            <td>{template.model || '-'}</td>
                            <td>
                              <span
                                title={template.description || '-'}
                                style={{
                                  maxWidth: '200px',
                                  display: 'inline-block',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {template.description || '-'}
                              </span>
                            </td>
                            <td className='text-center'>
                              <span className={`badge ${template.active ? 'badge-light-success' : 'badge-light-secondary'}`}>
                                {template.active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div className='d-flex justify-content-center gap-1'>
                                <button
                                  className='btn btn-icon btn-sm'
                                  title='View'
                                  onClick={() => handleView(template.id!)}
                                >
                                  <KTSVG path='/media/map/ph_eye.svg' className='svg-icon-3 text-primary' />
                                </button>
                                <button
                                  className='btn btn-icon btn-sm'
                                  title='Edit'
                                  onClick={() => handleEdit(template.id!)}
                                >
                                  <KTSVG path='/media/map/edit-active.svg' className='svg-icon-3' />
                                </button>
                                <button
                                  className='btn btn-icon btn-sm'
                                  title='Import Tasks from Excel'
                                  onClick={() => {
                                    setExcelImportTemplateId(template.id!)
                                    setExcelImportOpen(true)
                                  }}
                                >
                                  <KTSVG path='/media/icons/duotune/files/fil012.svg' className='svg-icon-3 text-success' />
                                </button>
                                <button
                                  className='btn btn-icon btn-sm'
                                  title='Delete'
                                  onClick={() => handleDelete(template.id!)}
                                >
                                  <KTSVG path='/media/icons/duotune/general/gen027.svg' className='svg-icon-3 text-danger' />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {!loading && filteredData.length > 0 && (
                  <div
                    className='pagination-wrapper d-flex justify-content-between align-items-center py-3 border-top'
                    style={{
                      position: 'static',
                      bottom: 0,
                      backgroundColor: '#fff',
                      zIndex: 10,
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
                          padding: '4px 8px',
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
                      <span className='text-muted me-3' style={{ fontSize: '14px' }}>
                        Showing{' '}
                        <strong>
                          {indexOfFirstRecord + 1}-{Math.min(indexOfLastRecord, filteredData.length)}
                        </strong>{' '}
                        of <strong>{filteredData.length}</strong>
                      </span>

                      <nav>
                        <ul className='pagination pagination-sm mb-0' style={{ gap: '2px' }}>
                          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                            <button
                              className='page-link text-muted'
                              style={{
                                backgroundColor: '#f8f9fa',
                                border: '1px solid #dee2e6',
                                padding: '8px 12px',
                                fontSize: '14px',
                                borderRadius: '6px',
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

                            for (let i = startPage; i <= endPage; i++) {
                              pages.push(
                                <li
                                  key={i}
                                  className={`page-item ${currentPage === i ? 'active' : ''}`}
                                >
                                  <button
                                    className='page-link text-muted'
                                    style={{
                                      backgroundColor: currentPage === i ? '#F4F9FF' : 'transparent',
                                      border: '1px solid #dee2e6',
                                      padding: '8px 12px',
                                      fontSize: '14px',
                                      minWidth: '40px',
                                      borderRadius: '6px',
                                    }}
                                    onClick={() => handlePageChange(i)}
                                  >
                                    {i}
                                  </button>
                                </li>
                              )
                            }

                            return pages
                          })()}

                          <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                            <button
                              className='page-link text-muted'
                              style={{
                                backgroundColor: '#f8f9fa',
                                border: '1px solid #dee2e6',
                                padding: '8px 12px',
                                fontSize: '14px',
                                borderRadius: '6px',
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

      {/* Add Template Modal */}
      {addOpen && (
        <AddTemplateModal
          visible={addOpen}
          onClose={() => setAddOpen(false)}
          onSubmit={async (data) => {
            try {
              const created = await createPmsTemplate(data)
              toast.success('Template created successfully', { position: 'top-center' })
              setAddOpen(false)
              loadTemplates()
              return created // Return created template so AddTemplateModal can use it
            } catch (error: any) {
              toast.error(error.message || 'Failed to create template', { position: 'top-center' })
              throw error
            }
          }}
          onSuccess={(templateId, templateName) => {
            setTaskModalTemplateId(templateId)
            setTaskModalTemplateName(templateName)
            setTaskModalOpen(true)
          }}
        />
      )}

      {taskModalOpen && taskModalTemplateId && (
        <AddTemplateTaskModal
          visible={taskModalOpen}
          templateId={taskModalTemplateId}
          templateName={taskModalTemplateName}
          onClose={() => {
            setTaskModalOpen(false)
            setTaskModalTemplateId(null)
            setTaskModalTemplateName('')
          }}
          onSuccess={() => {
            loadTemplates() // Reload to show updated task count
          }}
        />
      )}

      {/* View Template Modal */}
      {viewOpen && viewing && (
        <ViewTemplateModal
          visible={viewOpen}
          onClose={() => {
            setViewOpen(false)
            setViewing(null)
          }}
          template={viewing}
          onTemplateUpdated={loadTemplates}
        />
      )}

      {/* Edit Template Modal */}
      {editOpen && editing && (
        <EditTemplateModal
          visible={editOpen}
          onClose={() => {
            setEditOpen(false)
            setEditing(null)
          }}
          template={editing}
          onSubmit={async (data) => {
            try {
              await updatePmsTemplate(editing.id!, data)
              toast.success('Template updated successfully', { position: 'top-center' })
              setEditOpen(false)
              setEditing(null)
              loadTemplates()
            } catch (error: any) {
              toast.error(error.message || 'Failed to update template', { position: 'top-center' })
            }
          }}
        />
      )}

      {/* Excel Import Modal */}
      {excelImportTemplateId && (
        <ExcelImportModal
          visible={excelImportOpen}
          onClose={() => {
            setExcelImportOpen(false)
            setExcelImportTemplateId(null)
          }}
          templateId={excelImportTemplateId}
          onSuccess={() => {
            loadTemplates()
            if (viewing && viewing.id === excelImportTemplateId) {
              // Reload viewing template to show new tasks
              handleView(excelImportTemplateId)
            }
          }}
        />
      )}
    </div>
  )
}

export default PmsTemplateListPage

