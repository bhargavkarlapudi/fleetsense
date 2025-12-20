import React, {FC, useEffect, useState} from 'react'
import {KTSVG} from '../../../../_metronic/helpers'
import {toast} from 'react-toastify'
import type {
  QHSEAuditFindingDto,
  FindingStatus,
  AuditFindingSubmitShape,
} from '../core/_models'
import RichTextEditor from '../components/RichTextEditor'
import {
  listAuditFindingAttachments,
  AuditFindingAttachmentFileViewUrl,
  AuditFindingAttachmentFileDownloadUrl,
  deleteAuditFindingAttachment,
} from '../core/_requests'

type AuditOption = {
  id: number
  label: string
}

interface EditAuditFindingModalProps {
  visible: boolean
  onClose: () => void
  record: QHSEAuditFindingDto | null
  audits: AuditOption[]   // same data, just used as “Audit” list in UI
  onSubmit: (data: AuditFindingSubmitShape) => void | Promise<void>
}

const WRAP_STYLE: React.CSSProperties = {
  background: 'rgba(0,0,0,0.5)',
  position: 'fixed',
  inset: 0,
  zIndex: 1050,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const LABEL = 'form-label fw-semibold fs-6 mb-2 text-dark'

type ExistingAttachmentLocal = {
  fileName: string
  viewUrl: string
  downloadUrl: string
}

const EditAuditFindingModal: FC<EditAuditFindingModalProps> = ({
  visible,
  onClose,
  record,
  audits,
  onSubmit,
}) => {
  const [form, setForm] = useState<AuditFindingSubmitShape>({
    auditId: '',
    findingName: '',
    description: '',
    critical: '',
    status: '' as '' | FindingStatus,
    findingType: '' as any,
    remarks: '',
    attachmentFiles: null,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const [existingAttachments, setExistingAttachments] = useState<ExistingAttachmentLocal[]>([])
  const [existingLoading, setExistingLoading] = useState<boolean>(false)

  // hydrate from record when opened
  useEffect(() => {
    if (visible && record) {
      const rawCritical =
        (record as any).critical ??
        (record as any).isPositive ??
        null

      setForm({
        auditId: record.auditId ? String(record.auditId) : '',
        findingName: record.findingName || '',
        description: record.description || '',
        // 🔁 no separate finding date – it is derived from audit
        critical: rawCritical === true ? 'YES' : rawCritical === false ? 'NO' : '',
        status: (record.status as FindingStatus) || ('' as '' | FindingStatus),
        findingType: (record.findingType as any) || '',
        remarks: record.remarks || '',
        attachmentFiles: null,
      })
      setErrors({})
    }
  }, [visible, record])

  // load existing attachments for this finding
  useEffect(() => {
    if (!visible || !record?.id) {
      setExistingAttachments([])
      return
    }

    const findingId = Number(record.id)
    setExistingLoading(true)

    ;(async () => {
      try {
        const list = await listAuditFindingAttachments(findingId)
        const mapped: ExistingAttachmentLocal[] = list.map((it: any) => ({
          fileName: it.fileName,
          viewUrl: AuditFindingAttachmentFileViewUrl(findingId, it.fileName),
          downloadUrl: AuditFindingAttachmentFileDownloadUrl(findingId, it.fileName),
        }))
        setExistingAttachments(mapped)
      } catch (e) {
        console.error('Failed to load finding attachments for edit modal', e)
        toast.error('Failed to load existing attachments', {position: 'top-center'})
        setExistingAttachments([])
      } finally {
        setExistingLoading(false)
      }
    })()
  }, [visible, record?.id])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const {name, value} = e.target
    setForm(prev => ({...prev, [name]: value}))
    if (errors[name]) setErrors(prev => ({...prev, [name]: ''}))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const {files} = e.target
    const arr: File[] = files && files.length > 0 ? Array.from(files) : []
    setForm(prev => ({
      ...prev,
      attachmentFiles: arr.length > 0 ? [...(prev.attachmentFiles || []), ...arr] : prev.attachmentFiles,
    }))

    // allow re-selecting the same file later
    e.target.value = ''
  }

  const handleRemoveSelectedFile = (index: number) => {
    setForm(prev => {
      const current = prev.attachmentFiles || []
      const next = current.filter((_, i) => i !== index)
      return {
        ...prev,
        attachmentFiles: next.length > 0 ? next : null,
      }
    })
  }

  const handleDeleteExistingFile = async (fileName: string) => {
    if (!record?.id) return
    const ok = window.confirm(`Remove attachment "${fileName}" from this finding?`)
    if (!ok) return

    try {
      await deleteAuditFindingAttachment(Number(record.id), fileName)
      setExistingAttachments(prev => prev.filter(a => a.fileName !== fileName))
      toast.success('Attachment removed', {position: 'top-center'})
    } catch (e: any) {
      console.error('Delete attachment failed', e)
      toast.error(
        e?.response?.data?.message || 'Failed to remove attachment',
        {position: 'top-center'}
      )
    }
  }

  const validate = () => {
    const er: Record<string, string> = {}

    if (!form.auditId.trim()) er.auditId = 'Audit is required'
    if (!form.findingName.trim()) er.findingName = 'Finding title is required'

    const descText = (form.description || '').replace(/<[^>]+>/g, '').trim()
    if (!descText) er.description = 'Finding details are required'

    if (!form.status) er.status = 'Status is required'
    if (!form.findingType) er.findingType = 'Finding type is required'
    if (!form.critical) er.critical = 'Criticality is required'

    setErrors(er)
    return Object.keys(er).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    await onSubmit(form)
  }

  const handleClose = () => {
    setErrors({})
    onClose()
  }

  if (!visible || !record) return null

  return (
    <div style={WRAP_STYLE} tabIndex={-1}>
      {/* Custom wide modal window – same shell as Defect Edit modal */}
      <div
        className='bg-white text-dark rounded shadow-lg d-flex flex-column'
        style={{
          width: '75vw',
          height: '75vh',
          maxWidth: '1400px',
          maxHeight: '900px',
        }}
      >
        {/* Header */}
        <div className='d-flex align-items-center justify-content-between border-bottom px-4 py-3 flex-shrink-0'>
          <h5 className='modal-title text-dark m-6'>Edit Audit Finding</h5>
          <button type='button' className='btn-close m-6' onClick={handleClose} />
        </div>

        {/* Body with inner scroll */}
        <div className='flex-grow-1 overflow-auto px-4 py-3 m-6'>
          <div className='row g-4'>
            {/* Audit (was audit) */}
            <div className='col-md-6'>
              <label className={LABEL}>
                Audit <span className='text-danger ms-1'>*</span>
              </label>
              <select
                name='auditId'
                className={`form-select ${errors.auditId ? 'is-invalid' : ''}`}
                value={form.auditId}
                onChange={handleChange}
              >
                <option value=''>Select audit</option>
                {audits.map(i => (
                  <option key={i.id} value={String(i.id)}>
                    {i.label}
                  </option>
                ))}
              </select>
              {errors.auditId && (
                <div className='invalid-feedback'>{errors.auditId}</div>
              )}
            </div>

            {/* Finding Label */}
            <div className='col-md-6'>
              <label className={LABEL}>
                Finding Title / Label <span className='text-danger ms-1'>*</span>
              </label>
              <input
                name='findingName'
                type='text'
                className={`form-control ${errors.findingName ? 'is-invalid' : ''}`}
                value={form.findingName}
                onChange={handleChange}
              />
              {errors.findingName && (
                <div className='invalid-feedback'>{errors.findingName}</div>
              )}
            </div>

            {/* Critical */}
            <div className='col-md-4'>
              <label className={LABEL}>
                Critical <span className='text-danger ms-1'>*</span>
              </label>
              <select
                name='critical'
                className={`form-select ${errors.critical ? 'is-invalid' : ''}`}
                value={form.critical}
                onChange={handleChange}
              >
                <option value=''>Select</option>
                <option value='YES'>Yes</option>
                <option value='NO'>No</option>
              </select>
              {errors.critical && (
                <div className='invalid-feedback'>{errors.critical}</div>
              )}
            </div>

            {/* Status */}
            <div className='col-md-4'>
              <label className={LABEL}>
                Status <span className='text-danger ms-1'>*</span>
              </label>
              <select
                name='status'
                className={`form-select ${errors.status ? 'is-invalid' : ''}`}
                value={form.status}
                onChange={handleChange}
              >
                <option value=''>Select</option>
                <option value='SATISFACTORY'>Satisfactory</option>
                <option value='NON_CRITICAL'>Non-critical</option>
                <option value='CRITICAL'>Critical</option>
                <option value='OBSERVATION'>Observation</option>
                <option value='OPPORTUNITY_FOR_IMPROVEMENT'>
                  Opportunity for improvement
                </option>
              </select>
              {errors.status && (
                <div className='invalid-feedback'>{errors.status}</div>
              )}
            </div>

            {/* Finding Type */}
            <div className='col-md-4'>
              <label className={LABEL}>
                Finding Type <span className='text-danger ms-1'>*</span>
              </label>
              <select
                name='findingType'
                className={`form-select ${errors.findingType ? 'is-invalid' : ''}`}
                value={form.findingType}
                onChange={handleChange}
              >
                <option value=''>Select</option>
                <option value='NON_CONFORMITY_REPORT'>Non conformity report</option>
                <option value='OBSERVATION_NOTE'>Observation note</option>
                <option value='FAILURE_NOTE'>Failure note</option>
                <option value='DEVIATION_NOTE'>Deviation note</option>
              </select>
              {errors.findingType && (
                <div className='invalid-feedback'>{errors.findingType}</div>
              )}
            </div>

            {/* Finding Details */}
            <div className='col-12'>
              <label className={LABEL}>
                Finding Details <span className='text-danger ms-1'>*</span>
              </label>
              <RichTextEditor
                value={form.description}
                onChange={html =>
                  setForm(prev => ({...prev, description: html}))
                }
                placeholder='Describe the observation / finding in detail'
                invalid={!!errors.description}
                height={220}
              />
              {errors.description && (
                <div className='text-danger mt-1 small'>{errors.description}</div>
              )}
            </div>

            {/* Remarks */}
            <div className='col-12 mt-4'>
              <label className={LABEL}>Remarks (optional)</label>
              <textarea
                name='remarks'
                className='form-control'
                rows={3}
                value={form.remarks || ''}
                onChange={handleChange}
              />
            </div>

            {/* Attachments – existing + add new */}
            <div className='col-12 mt-3'>
              <label className={LABEL}>Attachments</label>

              {/* Existing attachments */}
              {record?.id && (
                <div className='mb-3'>
                  {existingLoading ? (
                    <div className='text-muted small'>Loading attachments...</div>
                  ) : existingAttachments.length === 0 ? (
                    <div className='text-muted small fst-italic'>
                      No attachments uploaded yet for this finding.
                    </div>
                  ) : (
                    <ul className='mb-0' style={{listStyle: 'none', paddingLeft: 0}}>
                      {existingAttachments.map(att => (
                        <li
                          key={att.fileName}
                          className='d-flex align-items-center justify-content-between mb-1'
                        >
                          <span
                            className='text-muted small text-truncate'
                            style={{maxWidth: '260px'}}
                            title={att.fileName}
                          >
                            {att.fileName}
                          </span>
                          <div className='d-flex align-items-center gap-1'>
                            <button
                              type='button'
                              className='btn btn-icon btn-sm'
                              title='View'
                              onClick={() => window.open(att.viewUrl, '_blank')}
                            >
                              <KTSVG
                                path='/media/map/ph_eye.svg'
                                className='svg-icon-3 text-primary'
                              />
                            </button>
                            <button
                              type='button'
                              className='btn btn-icon btn-sm'
                              title='Delete'
                              onClick={() => handleDeleteExistingFile(att.fileName)}
                            >
                              <KTSVG
                                path='/media/icons/duotune/general/gen027.svg'
                                className='svg-icon-3 text-danger'
                              />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Add new attachments */}
              <div className='mt-2'>
                <label className='form-label fw-semibold fs-7 mb-1 text-dark'>
                  Add New Attachments
                </label>
                <input
                  type='file'
                  multiple
                  className='form-control'
                  onChange={handleFileChange}
                />
                <div className='form-text'>
                  Selecting again will <strong>add</strong> more files to the list below.
                  Use delete icons above to remove existing files.
                </div>

                {!!form.attachmentFiles?.length && (
                  <ul className='mt-2 mb-0 list-unstyled'>
                    {form.attachmentFiles.map((f, idx) => (
                      <li
                        key={idx}
                        className='d-flex align-items-center justify-content-between'
                      >
                        <span className='text-muted small text-truncate me-2'>
                          {f.name}
                        </span>
                        <div className='btn-group'>
                          <button
                            type='button'
                            className='btn btn-sm btn-light-primary'
                            onClick={() => {
                              const url = URL.createObjectURL(f)
                              window.open(url, '_blank')
                              setTimeout(() => URL.revokeObjectURL(url), 60_000)
                            }}
                          >
                            View
                          </button>
                          <button
                            type='button'
                            className='btn btn-sm btn-light-danger'
                            onClick={() => handleRemoveSelectedFile(idx)}
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className='border-top d-flex justify-content-end gap-2 px-4 py-3 flex-shrink-0'>
          <button
            type='button'
            className='btn btn-light btn-sm'
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            type='button'
            className='btn btn_primary btn-sm'
            onClick={handleSubmit}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

export default EditAuditFindingModal
