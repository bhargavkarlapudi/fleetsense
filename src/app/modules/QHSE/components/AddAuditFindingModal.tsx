import React, {FC, useEffect, useState} from 'react'
import {KTSVG} from '../../../../_metronic/helpers'
import type {FindingStatus, AuditFindingSubmitShape} from '../core/_models'
import RichTextEditor from '../components/RichTextEditor'

type AuditOption = {
  id: number
  label: string
}

interface AddAuditFindingModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: (data: AuditFindingSubmitShape) => void | Promise<void>
  audits: AuditOption[]   // still the same data, just typed as AuditOption
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

const AddAuditFindingModal: FC<AddAuditFindingModalProps> = ({
  visible,
  onClose,
  onSubmit,
  audits,
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

  // auto-select when only one audit
  useEffect(() => {
    if (!form.auditId && audits.length === 1) {
      setForm(prev => ({...prev, auditId: String(audits[0].id)}))
    }
  }, [audits, form.auditId])

  // reset when visible toggles off→on
  useEffect(() => {
    if (visible) {
      setForm({
        auditId: audits.length === 1 ? String(audits[0].id) : '',
        findingName: '',
        description: '',
        critical: '',
        status: '' as '' | FindingStatus,
        findingType: '' as any,
        remarks: '',
        attachmentFiles: null,
      })
      setErrors({})
    }
  }, [visible, audits])

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
      attachmentFiles: arr.length > 0 ? arr : null,
    }))
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

  if (!visible) return null

  return (
    <div style={WRAP_STYLE} tabIndex={-1}>
      {/* Custom wide modal window – same style as Defect Add/Edit */}
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
          <h5 className='modal-title text-dark m-6'>Add Audit Finding</h5>
          <button type='button' className='btn-close m-6' onClick={onClose} />
        </div>

        {/* Body with inner scroll */}
        <div className='flex-grow-1 overflow-auto px-4 py-3 m-6'>
          <div className='row g-4'>
            {/* Audit */}
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

            {/* Finding Title / Label */}
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
                placeholder='e.g. Fire door latch broken'
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

            {/* Finding Details (Rich text) */}
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
              <label className={LABEL}>Remarks</label>
              <textarea
                name='remarks'
                className='form-control'
                rows={3}
                value={form.remarks || ''}
                onChange={handleChange}
              />
            </div>

            {/* Attachments */}
            <div className='col-12'>
              <label className={LABEL}>Attachments (optional)</label>
              <input
                type='file'
                multiple
                className='form-control'
                onChange={handleFileChange}
              />
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

        {/* Footer */}
        <div className='border-top d-flex justify-content-end gap-2 px-4 py-3 flex-shrink-0'>
          <button
            type='button'
            className='btn btn-light btn-sm'
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type='button'
            className='btn btn_primary btn-sm'
            onClick={handleSubmit}
          >
            Save Finding
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddAuditFindingModal
