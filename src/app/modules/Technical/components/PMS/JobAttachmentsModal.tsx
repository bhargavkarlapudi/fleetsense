import React, { FC, useEffect, useState } from 'react'
import { KTSVG } from '../../../../../_metronic/helpers'
import { useAuth } from '../../../auth'
import {
  listJobAttachments,
  uploadJobAttachments,
  deleteJobAttachment,
  jobAttachmentViewUrl,
  jobAttachmentDownloadUrl,
} from '../../core/pms/_requests'
import { PmsJobAttachmentDto, PmsJobAttachmentFileType } from '../../core/pms/_models'
import { toast } from 'react-toastify'
import { FileViewerModal } from '../../../QHSE/components/FileViewerModal'

interface Props {
  visible: boolean
  jobId: number
  onClose: () => void
  onSuccess?: () => void
}

const LABEL = 'form-label fw-semibold fs-6 mb-2 text-dark'
const WRAP_STYLE: React.CSSProperties = {
  background: 'rgba(0,0,0,0.5)',
  position: 'fixed',
  inset: 0,
  zIndex: 2100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const FILE_TYPES: { value: PmsJobAttachmentFileType; label: string }[] = [
  { value: 'PHOTO', label: 'Photo' },
  { value: 'REPORT', label: 'Report' },
  { value: 'SIGNED_JOB_CARD', label: 'Signed Job Card' },
  { value: 'PROCEDURE', label: 'Procedure' },
]

export const JobAttachmentsModal: FC<Props> = ({ visible, jobId, onClose, onSuccess }) => {
  const { auth } = useAuth()
  const token = auth?.auth?.jwt

  const [attachments, setAttachments] = useState<PmsJobAttachmentDto[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [selectedFileType, setSelectedFileType] = useState<PmsJobAttachmentFileType>('PHOTO')
  const [viewingFile, setViewingFile] = useState<PmsJobAttachmentDto | null>(null)

  useEffect(() => {
    if (visible && jobId) {
      loadAttachments()
    }
  }, [visible, jobId])

  const loadAttachments = async () => {
    setLoading(true)
    try {
      const data = await listJobAttachments(jobId)
      setAttachments(data)
    } catch (error: any) {
      console.error('Error loading attachments:', error)
      toast.error(error.message || 'Failed to load attachments', { position: 'top-center' })
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedFiles(files)
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select files to upload', { position: 'top-center' })
      return
    }

    setUploading(true)
    try {
      await uploadJobAttachments(jobId, selectedFiles, selectedFileType)
      toast.success(`Successfully uploaded ${selectedFiles.length} file(s)`, { position: 'top-center' })
      setSelectedFiles([])
      loadAttachments()
      onSuccess?.()
    } catch (error: any) {
      console.error('Error uploading attachments:', error)
      toast.error(error.message || 'Failed to upload attachments', { position: 'top-center' })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (attachmentId: number) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) {
      return
    }

    try {
      await deleteJobAttachment(jobId, attachmentId)
      toast.success('Attachment deleted successfully', { position: 'top-center' })
      loadAttachments()
      onSuccess?.()
    } catch (error: any) {
      console.error('Error deleting attachment:', error)
      toast.error(error.message || 'Failed to delete attachment', { position: 'top-center' })
    }
  }

  const handleDownload = async (attachment: PmsJobAttachmentDto) => {
    try {
      const url = jobAttachmentDownloadUrl(attachment)
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!res.ok) {
        throw new Error(`Download failed: ${res.status}`)
      }
      const blob = await res.blob()
      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = attachment.fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(downloadUrl)
    } catch (error: any) {
      console.error('Error downloading attachment:', error)
      toast.error('Failed to download attachment', { position: 'top-center' })
    }
  }

  const formatFileSize = (bytes?: number | null): string => {
    if (!bytes) return '-'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const getFileTypeLabel = (fileType: PmsJobAttachmentFileType): string => {
    return FILE_TYPES.find((ft) => ft.value === fileType)?.label || fileType
  }

  if (!visible) return null

  return (
    <>
      <div style={WRAP_STYLE} tabIndex={-1} onClick={(e) => e.target === e.currentTarget && onClose()}>
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
            <h5 className='modal-title text-dark m-0'>Job Attachments</h5>
            <button type='button' className='btn-close' onClick={onClose}></button>
          </div>

          <div className='flex-grow-1 overflow-auto px-4 py-3'>
            {/* Upload Section */}
            <div className='card bg-light mb-4'>
              <div className='card-body'>
                <h6 className='fw-bold mb-3'>Upload New Attachments</h6>
                <div className='mb-3'>
                  <label className={LABEL}>File Type</label>
                  <select
                    className='form-select'
                    value={selectedFileType}
                    onChange={(e) => setSelectedFileType(e.target.value as PmsJobAttachmentFileType)}
                  >
                    {FILE_TYPES.map((ft) => (
                      <option key={ft.value} value={ft.value}>
                        {ft.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className='mb-3'>
                  <label className={LABEL}>Select Files</label>
                  <input
                    type='file'
                    className='form-control'
                    multiple
                    onChange={handleFileSelect}
                    disabled={uploading}
                  />
                  {selectedFiles.length > 0 && (
                    <div className='mt-2 text-muted fs-7'>
                      {selectedFiles.length} file(s) selected
                    </div>
                  )}
                </div>
                <button
                  type='button'
                  className='btn btn-primary btn-sm'
                  onClick={handleUpload}
                  disabled={selectedFiles.length === 0 || uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>

            {/* Attachments List */}
            <div>
              <h6 className='fw-bold mb-3'>Attachments ({attachments.length})</h6>
              {loading ? (
                <div className='text-center py-5'>
                  <div className='spinner-border' role='status'>
                    <span className='visually-hidden'>Loading...</span>
                  </div>
                </div>
              ) : attachments.length === 0 ? (
                <div className='text-muted text-center py-4'>No attachments found</div>
              ) : (
                <div className='table-responsive'>
                  <table className='table table-bordered align-middle'>
                    <thead>
                      <tr>
                        <th>File Name</th>
                        <th>Type</th>
                        <th>Size</th>
                        <th>Uploaded</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attachments.map((attachment) => (
                        <tr key={attachment.id}>
                          <td>{attachment.fileName}</td>
                          <td>
                            <span className='badge badge-light-primary'>{getFileTypeLabel(attachment.fileType)}</span>
                          </td>
                          <td>{formatFileSize(attachment.fileSize)}</td>
                          <td>
                            {attachment.uploadedAt
                              ? new Date(attachment.uploadedAt).toLocaleDateString()
                              : '-'}
                          </td>
                          <td>
                            <div className='d-flex gap-1'>
                              <button
                                className='btn btn-sm btn-light'
                                onClick={() => setViewingFile(attachment)}
                                title='View'
                              >
                                <KTSVG path='/media/icons/duotune/general/gen005.svg' className='svg-icon-2' />
                              </button>
                              <button
                                className='btn btn-sm btn-light'
                                onClick={() => handleDownload(attachment)}
                                title='Download'
                              >
                                <KTSVG path='/media/icons/duotune/arrows/arr076.svg' className='svg-icon-2' />
                              </button>
                              <button
                                className='btn btn-sm btn-light-danger'
                                onClick={() => handleDelete(attachment.id!)}
                                title='Delete'
                              >
                                <KTSVG path='/media/icons/duotune/general/gen027.svg' className='svg-icon-2' />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className='border-top d-flex justify-content-end gap-2 px-4 py-3 flex-shrink-0'>
            <button type='button' className='btn btn-light btn-sm' onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>

      {/* File Viewer Modal */}
      {viewingFile && (
        <FileViewerModal
          visible={true}
          viewUrl={jobAttachmentViewUrl(viewingFile)}
          fileName={viewingFile.fileName}
          onClose={() => setViewingFile(null)}
        />
      )}
    </>
  )
}

