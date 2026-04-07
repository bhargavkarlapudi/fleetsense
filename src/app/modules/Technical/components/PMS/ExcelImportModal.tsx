import React, { FC, useState, useRef } from 'react'
import { KTSVG } from '../../../../../_metronic/helpers'
import { toast } from 'react-toastify'
import axios from 'axios'

interface Props {
  visible: boolean
  onClose: () => void
  templateId: number
  onSuccess: () => void
}

const EXCEL_FIELD_MAPPINGS = [
  { value: 'groupTitle', label: 'Group Title' },
  { value: 'itemTitle', label: 'Item Title' },
  { value: 'taskDescription', label: 'Task Description' },
  { value: 'workType', label: 'Work Type' },
  { value: 'scheduleType', label: 'Schedule Type' },
  { value: 'intervalValue', label: 'Interval Value' },
  { value: 'intervalUnit', label: 'Interval Unit' },
  { value: 'oemCode', label: 'OEM Code' },
  { value: 'hierarchyLevel', label: 'Hierarchy Level' },
  { value: 'referenceId', label: 'Reference ID' },
]

export const ExcelImportModal: FC<Props> = ({ visible, onClose, templateId, onSuccess }) => {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<any>(null)
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!visible) return null

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      toast.error('Please select an Excel file (.xlsx or .xls)', { position: 'top-center' })
      return
    }

    setFile(selectedFile)

    // Preview the file
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await axios.post(`/api/pms/templates/excel/preview`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setPreviewData(response.data)
      setStep('mapping')

      // Auto-map columns based on header names
      const autoMapping: Record<string, string> = {}
      const headers = response.data.headers || []
      headers.forEach((header: string) => {
        const headerLower = header.toLowerCase()
        for (const mapping of EXCEL_FIELD_MAPPINGS) {
          if (headerLower.includes(mapping.label.toLowerCase().replace(' ', '')) ||
              headerLower.includes(mapping.value.toLowerCase())) {
            autoMapping[header] = mapping.value
            break
          }
        }
      })
      setColumnMapping(autoMapping)
    } catch (error: any) {
      console.error('Error previewing file:', error)
      toast.error(error.response?.data?.message || 'Failed to preview file', { position: 'top-center' })
      setFile(null)
    }
  }

  const handleMappingChange = (excelColumn: string, field: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [excelColumn]: field,
    }))
  }

  const handleImport = async () => {
    if (!file) return

    setStep('importing')
    setImporting(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      
      // Add column mapping as JSON string
      formData.append('columnMapping', JSON.stringify(columnMapping))

      const response = await axios.post(`/api/pms/templates/${templateId}/excel/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const result = response.data
      if (result.errorCount > 0) {
        toast.warning(`Import completed with ${result.errorCount} errors. ${result.successCount} rows imported successfully.`, {
          position: 'top-center',
        })
      } else {
        toast.success(`Successfully imported ${result.successCount} template tasks`, { position: 'top-center' })
      }

      onSuccess()
      handleClose()
    } catch (error: any) {
      console.error('Error importing file:', error)
      toast.error(error.response?.data?.message || 'Failed to import file', { position: 'top-center' })
      setStep('mapping')
    } finally {
      setImporting(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setPreviewData(null)
    setColumnMapping({})
    setStep('upload')
    onClose()
  }

  return (
    <div
      className='modal fade show d-flex align-items-center justify-content-center'
      style={{ background: 'rgba(0,0,0,0.5)', position: 'fixed', inset: 0, zIndex: 1050 }}
      onClick={(e) => e.target === e.currentTarget && !importing && handleClose()}
    >
      <div className='modal-dialog modal-xl modal-dialog-centered'>
        <div className='modal-content'>
          <div className='modal-header'>
            <h5 className='modal-title'>Import Template Tasks from Excel</h5>
            <button
              type='button'
              className='btn-close'
              onClick={handleClose}
              disabled={importing}
            />
          </div>
          <div className='modal-body'>
            {step === 'upload' && (
              <div className='text-center py-5'>
                <KTSVG path='/media/icons/duotune/files/fil012.svg' className='svg-icon-5x text-primary mb-4' />
                <h5>Upload Excel File</h5>
                <p className='text-muted'>Select an Excel file (.xlsx or .xls) containing template tasks</p>
                <input
                  ref={fileInputRef}
                  type='file'
                  accept='.xlsx,.xls'
                  onChange={handleFileSelect}
                  className='d-none'
                />
                <button
                  className='btn btn-primary'
                  onClick={() => fileInputRef.current?.click()}
                >
                  <KTSVG path='/media/icons/duotune/files/fil012.svg' className='svg-icon-2' />
                  Select File
                </button>
              </div>
            )}

            {step === 'mapping' && previewData && (
              <div>
                <h6 className='mb-3'>Step 2: Map Columns</h6>
                <p className='text-muted mb-4'>
                  Map Excel columns to template task fields. Preview shows first {previewData.previewRows?.length || 0} rows.
                </p>

                <div className='table-responsive mb-4'>
                  <table className='table table-bordered'>
                    <thead>
                      <tr>
                        <th>Excel Column</th>
                        <th>Map To Field</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.headers?.map((header: string) => (
                        <tr key={header}>
                          <td>{header}</td>
                          <td>
                            <select
                              className='form-select form-select-sm'
                              value={columnMapping[header] || ''}
                              onChange={(e) => handleMappingChange(header, e.target.value)}
                            >
                              <option value=''>-- Skip --</option>
                              {EXCEL_FIELD_MAPPINGS.map(mapping => (
                                <option key={mapping.value} value={mapping.value}>
                                  {mapping.label}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h6 className='mb-3'>Preview Data</h6>
                <div className='table-responsive' style={{ maxHeight: '300px', overflow: 'auto' }}>
                  <table className='table table-sm table-bordered'>
                    <thead className='table-light sticky-top'>
                      <tr>
                        {previewData.headers?.map((header: string) => (
                          <th key={header} style={{ minWidth: '150px' }}>
                            {header}
                            {columnMapping[header] && (
                              <small className='d-block text-primary'>{columnMapping[header]}</small>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.previewRows?.map((row: any, idx: number) => (
                        <tr key={idx}>
                          {previewData.headers?.map((header: string) => (
                            <td key={header}>{row[header] || ''}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {step === 'importing' && (
              <div className='text-center py-5'>
                <div className='spinner-border text-primary mb-3' role='status'>
                  <span className='visually-hidden'>Importing...</span>
                </div>
                <p>Importing template tasks...</p>
              </div>
            )}
          </div>
          <div className='modal-footer'>
            <button
              type='button'
              className='btn btn-light'
              onClick={handleClose}
              disabled={importing}
            >
              Cancel
            </button>
            {step === 'mapping' && (
              <button
                type='button'
                className='btn btn-primary'
                onClick={handleImport}
                disabled={importing || Object.keys(columnMapping).length === 0}
              >
                <KTSVG path='/media/icons/duotune/arrows/arr075.svg' className='svg-icon-2' />
                Import {previewData?.totalRows || 0} Rows
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
