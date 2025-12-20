import React, {useState, useEffect} from 'react'
import type {DefectRecord} from '../core/_models'
import {KTSVG} from '../../../../_metronic/helpers'
import {FileViewerModal} from '../components/FileViewerModal'
import {
  defectClosureViewUrl,
  defectClosureDownloadUrl,
  deleteDefectClosureEvidence,
} from '../core/_requests'
import {toast} from 'react-toastify'

type Props = {
  visible: boolean
  defect: DefectRecord | null
  isCrew?: boolean
  onCancel: () => void
  onSaveOnly?: (file: File | null, remark: string) => void | Promise<void>
  onCloseWithResult: (
    file: File | null,
    remark: string,
    result: 'SATISFACTORY' | 'TO_BE_REVIEWED_NEXT_INSPECTION'
  ) => void | Promise<void>
}

const WRAP_STYLE: React.CSSProperties = {
  background: 'rgba(0,0,0,0.5)',
  position: 'fixed',
  inset: 0,
  zIndex: 2100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const DefectClosureModal: React.FC<Props> = ({
  visible,
  defect,
  isCrew = false,
  onCancel,
  onSaveOnly,
  onCloseWithResult,
}) => {
  const [file, setFile] = useState<File | null>(null)
  const [remark, setRemark] = useState('')
  const [hasExisting, setHasExisting] = useState(false)
  const [deletingExisting, setDeletingExisting] = useState(false)

  const [viewer, setViewer] = useState<{
    visible: boolean
    title: string
    file: File | null
    viewUrl?: string
    downloadUrl?: string
  }>({
    visible: false,
    title: '',
    file: null,
    viewUrl: undefined,
    downloadUrl: undefined,
  })

  useEffect(() => {
    if (!visible || !defect) {
      setFile(null)
      setRemark('')
      setHasExisting(false)
      setDeletingExisting(false)
      setViewer({
        visible: false,
        title: '',
        file: null,
        viewUrl: undefined,
        downloadUrl: undefined,
      })
      return
    }

    // When modal opens for a specific defect:
    setFile(null)
    setRemark(defect.closureRemark || '')
    setHasExisting(!!defect.closureEvidencePath)
    setDeletingExisting(false)
  }, [visible, defect])

  if (!visible || !defect) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0] ? e.target.files[0] : null
    setFile(f)
    // reset file input to allow same file selection again
    e.target.value = ''
  }

    const handleSaveOnly = async () => {
    // NO validation here – partial save allowed
    if (onSaveOnly) {
      await onSaveOnly(file, remark)
    }
  }

  const validateBeforeClosing = (): boolean => {
    // Require *some* evidence: either existing file or a newly selected one
    if (!hasExisting && !file) {
      toast.error('Closure evidence is required before closing the defect.', {
        position: 'top-center',
      })
      return false
    }

    // Require remark
    if (!remark.trim()) {
      toast.error('Closure remark is required before closing the defect.', {
        position: 'top-center',
      })
      return false
    }

    return true
  }

  const handleCloseSatisfactory = async () => {
    if (!validateBeforeClosing()) return
    await onCloseWithResult(file, remark, 'SATISFACTORY')
  }

  const handleCloseTbr = async () => {
    if (!validateBeforeClosing()) return
    await onCloseWithResult(file, remark, 'TO_BE_REVIEWED_NEXT_INSPECTION')
  }

  const handleViewExisting = () => {
    if (!defect?.id) return
    setViewer({
      visible: true,
      title: defect.defectNumber
        ? `Closure Evidence – ${defect.defectNumber}`
        : 'Closure Evidence',
      file: null,
      viewUrl: defectClosureViewUrl(defect.id),
      downloadUrl: defectClosureDownloadUrl(defect.id),
    })
  }

  const handleDeleteExisting = async () => {
    if (!defect?.id) return
    try {
      setDeletingExisting(true)
            await deleteDefectClosureEvidence(defect.id)
      setHasExisting(false)
      setFile(null)
      toast.success('Existing closure evidence removed', {position: 'top-center'})
    } catch (e: any) {
      console.error('Delete closure evidence failed', e)
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        'Failed to delete closure evidence'
      toast.error(msg, {position: 'top-center'})
    } finally {
      setDeletingExisting(false)
    }
  }

  const handlePreviewSelectedFile = () => {
    if (!file) return
    setViewer({
      visible: true,
      title: file.name,
      file,
      viewUrl: undefined,
      downloadUrl: undefined,
    })
  }

  const handleRemoveSelectedFile = () => {
    setFile(null)
  }

  const title = isCrew ? 'Close Defect' : 'Review Defect'

  const formatSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return ''
    if (bytes < 1024) return `${bytes} B`
    const kb = bytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    const mb = kb / 1024
    return `${mb.toFixed(1)} MB`
  }

  return (
    <>
      <div style={WRAP_STYLE}>
        <div
          className='bg-white rounded shadow-lg'
          style={{
            width: '700px',
            maxWidth: '95vw',
          }}
        >
          {/* Header */}
          <div className='d-flex justify-content-between align-items-center border-bottom px-4 py-3'>
            <h5 className='mt-6 mx-6'>{title}</h5>
            <button type='button' className='btn-close m-6' onClick={onCancel} />
          </div>

          {/* Body */}
          <div className='px-4 py-3 mx-6'>
            {/* Closure evidence block */}
            <div className='mb-3'>
                            <label
                className='form-label fw-semibold'
                style={{color: '#3F4254', fontSize: '0.9rem'}}
              >
                Upload Closure Evidence
                <span className='text-danger ms-1'>*</span>
                <span className='text-muted ms-1 fs-8'>(required before closing)</span>
              </label>

              {/* File input (always present) */}
                            {/* File input – only when there is NO existing server-side evidence */}
              {!hasExisting && (
                <input
                  type='file'
                  className='form-control'
                  onChange={handleFileChange}
                />
              )}

              {/* Existing server file */}
              {hasExisting && (
                <div className='d-flex align-items-center justify-content-between bg-light rounded mt-3 px-3 py-2'>
                  <div className='d-flex align-items-center'>
                    <KTSVG
                      path='/media/icons/duotune/files/fil003.svg'
                      className='svg-icon-3 me-2 text-primary'
                    />
                    <div className='d-flex flex-column'>
                      <span className='fw-semibold fs-8'>
                        Existing closure evidence attached
                      </span>
                      <span className='text-muted fs-8'>
                        You can view, remove or replace it.
                      </span>
                    </div>
                  </div>

                  <div className='d-flex gap-2'>
                    <button
                      type='button'
                      className='btn btn-icon btn-sm'
                      title='View existing file'
                      onClick={handleViewExisting}
                    >
                      <KTSVG
                        path='/media/map/ph_eye.svg'
                        className='svg-icon-3 text-primary'
                      />
                    </button>
                    <button
                      type='button'
                      className='btn btn-icon btn-sm'
                      title='Delete existing file'
                      onClick={handleDeleteExisting}
                      disabled={deletingExisting}
                    >
                      <KTSVG
                        path='/media/icons/duotune/general/gen027.svg'
                        className='svg-icon-3 text-danger'
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* Newly selected file (local, not yet uploaded) */}
              {file && (
                <div className='d-flex align-items-center justify-content-between bg-light rounded mt-3 px-3 py-2'>
                  <div className='d-flex flex-column'>
                    <span
                      className='fw-semibold fs-8 text-truncate'
                      style={{maxWidth: '280px'}}
                      title={file.name}
                    >
                      {file.name}
                    </span>
                    <span className='text-muted fs-8'>
                      {formatSize(file.size)}
                    </span>
                  </div>
                  <div className='d-flex gap-2'>
                    <button
                      type='button'
                      className='btn btn-icon btn-sm'
                      title='Preview selected file'
                      onClick={handlePreviewSelectedFile}
                    >
                      <KTSVG
                        path='/media/map/ph_eye.svg'
                        className='svg-icon-3 text-primary'
                      />
                    </button>
                    <button
                      type='button'
                      className='btn btn-icon btn-sm'
                      title='Remove selected file'
                      onClick={handleRemoveSelectedFile}
                    >
                      <KTSVG
                        path='/media/icons/duotune/general/gen027.svg'
                        className='svg-icon-3 text-danger'
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* Helper text when nothing selected */}
              {!hasExisting && !file && (
                <div className='form-text'>
                  Please upload closure evidence (PDF, image, etc.) before closing.
                </div>
              )}

              {hasExisting && file && (
                <div className='form-text'>
                  Existing closure evidence will effectively be replaced with the
                  selected file when you save / close.
                </div>
              )}
            </div>

            {/* Closure remark */}
            <div className='mb-3'>
                            <label
                className='form-label fw-semibold'
                style={{color: '#3F4254', fontSize: '0.9rem'}}
              >
                Closure Remark <span className='text-danger ms-1'>*</span>
              </label>
              <textarea
                className='form-control'
                rows={3}
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder='Write closure / review remarks here'
              />
            </div>
          </div>

          {/* Footer */}
          <div className='d-flex justify-content-between align-items-center border-top px-4 py-3 mx-6'>
            <button type='button' className='btn btn-sm btn-light me-2' onClick={onCancel}>
              Cancel
            </button>

            {isCrew ? (
              // Crew: single "Close" button → treated as Satisfactory
              <button
                type='button'
                className='btn btn-primary text-nowrap btn-sm'
                onClick={handleCloseSatisfactory}
              >
                Close Defect
              </button>
            ) : (
              // Non-crew: Save + two Close options
              <div className='d-flex gap-2'>
                {onSaveOnly && (
                  <button
                    type='button'
                    className='btn btn-light-primary btn-sm'
                    onClick={handleSaveOnly}
                  >
                    Save
                  </button>
                )}
                <button
                  type='button'
                  className='btn btn-success text-nowrap btn-sm'
                  onClick={handleCloseSatisfactory}
                >
                  Close – Satisfactory
                </button>
                <button
                  type='button'
                  className='btn btn-outline-success text-nowrap btn-outline btn-sm'
                  onClick={handleCloseTbr}
                >
                  Close – To Be Reviewed
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* File viewer for existing or selected file */}
      <FileViewerModal
        visible={viewer.visible}
        onClose={() =>
          setViewer(prev => ({
            ...prev,
            visible: false,
            file: null,
            viewUrl: undefined,
            downloadUrl: undefined,
          }))
        }
        title={viewer.title}
        fileName={viewer.file?.name}
        file={viewer.file}
        viewUrl={viewer.viewUrl}
        downloadUrl={viewer.downloadUrl}
      />
    </>
  )
}

export default DefectClosureModal
