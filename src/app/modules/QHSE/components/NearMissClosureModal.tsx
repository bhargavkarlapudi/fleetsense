// src/app/modules/QHSE/components/NearMissClosureModal.tsx
import React, {FC, useEffect, useState} from 'react'
import {KTSVG} from '../../../../_metronic/helpers'
import {toast} from 'react-toastify'
import type {NearMissRecord} from '../core/_models'

type Props = {
  visible: boolean
  record: NearMissRecord | null
  onCancel: () => void
  onSaveReview: (
    rec: NearMissRecord,
    files: File[] | null,
    dpaConclusions: string,
    objectiveEvidence: string
  ) => Promise<void> | void
  onCloseWithResult: (
    rec: NearMissRecord,
    files: File[] | null,
    dpaConclusions: string,
    objectiveEvidence: string,
    result: 'SATISFACTORY' | 'TO_BE_REVIEWED_NEXT_INSPECTION'
  ) => Promise<void> | void
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

export const NearMissClosureModal: FC<Props> = ({
  visible,
  record,
  onCancel,
  onSaveReview,
  onCloseWithResult,
}) => {
  const [dpaConclusions, setDpaConclusions] = useState('')
  const [objectiveEvidence, setObjectiveEvidence] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!visible || !record) return

    // Reset fields when opening
    setFiles([])
    setBusy(false)

    // We don't have persisted review fields yet, so start with blanks.
    setObjectiveEvidence('')
    setDpaConclusions('')
  }, [visible, record])

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesArr = e.target.files ? Array.from(e.target.files) : []
    setFiles(filesArr)
  }

  const ensureMandatoryForClose = (): boolean => {
    if (!dpaConclusions.trim() || !objectiveEvidence.trim()) {
      toast.error('DPA conclusions and Objective evidence are required for closing the report', {
        position: 'top-center',
      })
      return false
    }
    return true
  }

  const handleSaveReviewClick = async () => {
    if (!record) return
    try {
      setBusy(true)
      await onSaveReview(
        record,
        files.length ? files : null,
        dpaConclusions,
        objectiveEvidence
      )
      onCancel()
    } finally {
      setBusy(false)
    }
  }

  const handleCloseClick = async (
    result: 'SATISFACTORY' | 'TO_BE_REVIEWED_NEXT_INSPECTION'
  ) => {
    if (!record) return
    if (!ensureMandatoryForClose()) return

    try {
      setBusy(true)
      await onCloseWithResult(
        record,
        files.length ? files : null,
        dpaConclusions,
        objectiveEvidence,
        result
      )
      onCancel()
    } finally {
      setBusy(false)
    }
  }

  if (!visible || !record) return null

  const statusLabel = (() => {
    if (record.status === 'SUBMIT') return 'Submitted / For Review'
    if (record.status === 'CLOSE') return record.closureResultLabel || 'Closed'
    return record.statusLabel || record.status || '-'
  })()

  return (
    <div style={WRAP_STYLE}>
      <div
        className='bg-white rounded shadow-lg'
        style={{
          width: '720px',
          maxWidth: '95vw',
        }}
      >
        {/* Header */}
        <div className='d-flex justify-content-between align-items-center border-bottom px-4 py-3'>
          <div className='d-flex flex-column'>
            <h5 className='fw-bold mb-1 m-6'>
              Review / Close Near Miss – {record.reportNumber || '-'}
            </h5>
            <div className='text-muted fs-7 ms-6'>
              Vessel: {record.vesselName || '-'}
              {record.dateOfOccurrence && (
                <>
                  <span className='mx-2'>•</span>
                  Occurrence Date: {record.dateOfOccurrence}
                  {record.timeOfOccurrence && (
                    <span className='text-muted ms-1'>{record.timeOfOccurrence}</span>
                  )}
                </>
              )}
            </div>
          </div>

          <div className='d-flex align-items-center gap-3 m-6'>
            <span className='badge badge-light-warning'>{statusLabel}</span>
            <button
              type='button'
              className='btn-close'
              aria-label='Close'
              onClick={onCancel}
            />
          </div>
        </div>

        {/* Body */}
        <div className='px-4 py-3 m-6'>
          {/* Objective Evidence */}
          <div className='mb-4'>
            <label className='form-label fw-semibold fs-6 mb-2 text-dark'>
              Objective Evidence <span className='text-danger'>*</span>
            </label>
            <textarea
              className='form-control'
              rows={3}
              value={objectiveEvidence}
              onChange={e => setObjectiveEvidence(e.target.value)}
              placeholder='Summarise evidence / references used for closure'
            />
          </div>

          {/* DPA Conclusions */}
          <div className='mb-4'>
            <label className='form-label fw-semibold fs-6 mb-2 text-dark'>
              DPA Conclusions &amp; Recommendations <span className='text-danger'>*</span>
            </label>
            <textarea
              className='form-control'
              rows={3}
              value={dpaConclusions}
              onChange={e => setDpaConclusions(e.target.value)}
              placeholder='Final DPA assessment, conclusions and any recommendations'
            />
            <div className='form-text'>
              Mandatory for closing the report, but can be left blank when using only{' '}
              <strong>Save Review Only</strong>.
            </div>
          </div>

          {/* Additional Supporting Docs */}
          <div className='mb-2'>
            <label className='form-label fw-semibold fs-6 mb-2 text-dark'>
              Additional Supporting Documents
            </label>
            <input
              type='file'
              multiple
              className='form-control'
              onChange={handleFilesChange}
            />
            <div className='form-text'>
              Existing supporting documents (if any) will remain. Uploaded files will be added as
              additional evidence.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className='d-flex justify-content-between align-items-center border-top px-4 py-3 m-6'>
          <button
            type='button'
            className='btn btn-sm btn-light'
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>

          <div className='d-flex gap-2'>
            <button
              type='button'
              className='btn btn-light-primary btn-sm'
              onClick={handleSaveReviewClick}
              disabled={busy}
            >
              <KTSVG
                path='/media/icons/duotune/general/gen056.svg'
                className='svg-icon-3 me-1'
              />
              Save Review Only
            </button>

            <button
              type='button'
              className='btn btn-success btn-sm'
              onClick={() => handleCloseClick('SATISFACTORY')}
              disabled={busy}
            >
              <KTSVG
                path='/media/icons/duotune/general/gen048.svg'
                className='svg-icon-3 me-1'
              />
              Close – Satisfactory
            </button>

            <button
              type='button'
              className='btn btn-warning btn-sm'
              onClick={() => handleCloseClick('TO_BE_REVIEWED_NEXT_INSPECTION')}
              disabled={busy}
            >
              <KTSVG
                path='/media/icons/duotune/general/gen044.svg'
                className='svg-icon-3 me-1'
              />
              Close – To Be Reviewed
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
