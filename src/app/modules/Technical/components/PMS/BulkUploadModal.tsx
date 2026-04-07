import React, { FC, useState, useRef } from 'react'
import { KTSVG } from '../../../../../_metronic/helpers'
import { bulkUploadRunningHourReadings } from '../../core/pms/_requests'
import { toast } from 'react-toastify'

interface Props {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
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

interface BulkUploadError {
  rowNumber: number
  message: string
  counterName?: string
  readingDate?: string
  value?: string
}

interface BulkUploadResult {
  totalRows: number
  successCount: number
  errorCount: number
  errors: BulkUploadError[]
}

export const BulkUploadModal: FC<Props> = ({ visible, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<BulkUploadResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop()?.toLowerCase()
      if (ext !== 'csv') {
        toast.error('Please select a CSV file', { position: 'top-center' })
        return
      }
      setFile(selectedFile)
      setResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file', { position: 'top-center' })
      return
    }

    setUploading(true)
    try {
      const uploadResult = await bulkUploadRunningHourReadings(file)
      setResult(uploadResult)
      if (uploadResult.errorCount === 0) {
        toast.success(`Successfully uploaded ${uploadResult.successCount} readings`, { position: 'top-center' })
        setTimeout(() => {
          onSuccess()
          handleClose()
        }, 2000)
      } else {
        toast.warning(`Upload completed with ${uploadResult.errorCount} errors`, { position: 'top-center' })
      }
    } catch (error: any) {
      console.error('Error uploading file:', error)
      toast.error(error.message || 'Failed to upload file', { position: 'top-center' })
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClose()
  }

  const downloadTemplate = () => {
    const csvContent = 'Counter ID/Name,Reading Date (YYYY-MM-DD),Value\n1,2024-01-15,5000\n2,2024-01-15,3000'
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'running_hours_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (!visible) return null

  return (
    <div style={WRAP_STYLE} tabIndex={-1} onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div
        className='bg-white text-dark rounded shadow-lg d-flex flex-column'
        style={{
          width: '800px',
          maxWidth: '90vw',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className='d-flex align-items-center justify-content-between border-bottom px-4 py-3 flex-shrink-0'>
          <h5 className='modal-title text-dark m-0'>Bulk Upload Running Hour Readings</h5>
          <button type='button' className='btn-close' onClick={handleClose}></button>
        </div>
        <div className='flex-grow-1 overflow-auto px-4 py-3'>
          <div className='mb-4'>
            <label className={LABEL}>CSV File</label>
            <div className='d-flex gap-2 align-items-center'>
              <input
                ref={fileInputRef}
                type='file'
                accept='.csv'
                className='form-control'
                onChange={handleFileSelect}
                disabled={uploading}
              />
              <button
                type='button'
                className='btn btn-sm btn-light'
                onClick={downloadTemplate}
                disabled={uploading}
              >
                <KTSVG path='/media/icons/duotune/files/fil003.svg' className='svg-icon-3 me-1' />
                Download Template
              </button>
            </div>
            {file && (
              <div className='mt-2 text-muted fs-7'>
                Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </div>
            )}
          </div>

          <div className='alert alert-info'>
            <strong>CSV Format:</strong>
            <ul className='mb-0 mt-2'>
              <li>Header row: Counter ID/Name, Reading Date (YYYY-MM-DD), Value</li>
              <li>Each row: Counter ID or Name, Date, Running Hours Value</li>
              <li>Example: <code>1,2024-01-15,5000</code> or <code>Main Engine,2024-01-15,5000</code></li>
            </ul>
          </div>

          {result && (
            <div className='mt-4'>
              <h6 className='fw-bold mb-3'>Upload Results</h6>
              <div className='row mb-3'>
                <div className='col-md-4'>
                  <div className='card bg-light'>
                    <div className='card-body text-center'>
                      <div className='fs-3 fw-bold text-primary'>{result.totalRows}</div>
                      <div className='text-muted'>Total Rows</div>
                    </div>
                  </div>
                </div>
                <div className='col-md-4'>
                  <div className='card bg-light-success'>
                    <div className='card-body text-center'>
                      <div className='fs-3 fw-bold text-success'>{result.successCount}</div>
                      <div className='text-muted'>Success</div>
                    </div>
                  </div>
                </div>
                <div className='col-md-4'>
                  <div className='card bg-light-danger'>
                    <div className='card-body text-center'>
                      <div className='fs-3 fw-bold text-danger'>{result.errorCount}</div>
                      <div className='text-muted'>Errors</div>
                    </div>
                  </div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className='mt-3'>
                  <h6 className='fw-bold mb-2'>Error Details</h6>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <table className='table table-sm table-bordered'>
                      <thead>
                        <tr>
                          <th>Row</th>
                          <th>Counter</th>
                          <th>Date</th>
                          <th>Value</th>
                          <th>Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.errors.map((error, idx) => (
                          <tr key={idx}>
                            <td>{error.rowNumber}</td>
                            <td>{error.counterName || '-'}</td>
                            <td>{error.readingDate || '-'}</td>
                            <td>{error.value || '-'}</td>
                            <td className='text-danger'>{error.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className='border-top d-flex justify-content-end gap-2 px-4 py-3 flex-shrink-0'>
          <button type='button' className='btn btn-light btn-sm' onClick={handleClose} disabled={uploading}>
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && (
            <button
              type='button'
              className='btn btn-primary btn-sm'
              onClick={handleUpload}
              disabled={!file || uploading}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

