import React, {FC} from 'react'
import {KTSVG} from '../../../../_metronic/helpers'
import type {QHSEAuditFindingDto} from '../core/_models'

interface ViewAuditFindingModalProps {
  visible: boolean
  onClose: () => void
  record: QHSEAuditFindingDto | null
  onOpenAttachments?: (rec: QHSEAuditFindingDto) => void
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

const niceEnum = (s?: string | null) =>
  s ? s.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '-'

const ViewAuditFindingModal: FC<ViewAuditFindingModalProps> = ({
  visible,
  onClose,
  record,
  onOpenAttachments,
}) => {
  if (!visible || !record) return null

  // 🔁 treat "finding date" as audit date now (from / to)
  const auditDateLabel = (() => {
    const from = (record as any).auditFromDate as string | undefined
    const to = (record as any).auditToDate as string | undefined

    if (from && to && from !== to) {
      return `${from.substring(0, 10)} to ${to.substring(0, 10)}`
    }
    const single = from || to
    return single ? single.substring(0, 10) : '-'
  })()

  const criticalValue = (() => {
    const raw =
      (record as any).critical ??
      (record as any).isPositive ??
      null

    if (raw === true) return 'Yes'
    if (raw === false) return 'No'
    return '-'
  })()

  const linkedAuditText = (() => {
    const vessel = record.vesselName || '-'
    const kindOrType =
      record.auditKindName ||
      (record.auditType ? niceEnum(String(record.auditType)) : '-')

    return `${vessel} — ${kindOrType} — ${auditDateLabel}`
  })()

  return (
    <div style={WRAP_STYLE} tabIndex={-1}>
      {/* Custom wide modal window – consistent with Defect View modal */}
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
          <h5 className='modal-title text-dark m-6'>Audit Finding Details</h5>
          <button type='button' className='btn-close m-6' onClick={onClose} />
        </div>

        {/* Body with inner scroll */}
        <div className='flex-grow-1 overflow-auto px-4 py-3 m-6'>
          <div className='mb-4'>
            <div className='fw-bold fs-5 mb-1'>
              {(record as any).findingLabel || record.findingName || `Finding #${record.id}`}
            </div>
            <div className='text-muted'>
              Linked to audit:{' '}
              <span className='fw-semibold'>
                {linkedAuditText}
              </span>
            </div>
          </div>

          <div className='row g-3'>
            <div className='col-md-6'>
              <div className='text-muted fw-semibold'>Vessel</div>
              <div className='fw-bold'>
                {record.vesselName || '-'}
              </div>
            </div>

            <div className='col-md-3'>
              <div className='text-muted fw-semibold'>Audit Date</div>
              <div>{auditDateLabel}</div>
            </div>

            <div className='col-md-3'>
              <div className='text-muted fw-semibold'>Critical</div>
              <div>{criticalValue}</div>
            </div>

            <div className='col-md-6'>
              <div className='text-muted fw-semibold'>Internal Auditor</div>
              <div>{record.internalAuditorName || '-'}</div>
            </div>

            <div className='col-md-6'>
              <div className='text-muted fw-semibold'>External Auditor</div>
              <div>{record.externalAuditorName || '-'}</div>
            </div>

            <div className='col-md-4'>
              <div className='text-muted fw-semibold'>Status</div>
              <div>{niceEnum(record.status || null)}</div>
            </div>

            <div className='col-md-4'>
              <div className='text-muted fw-semibold'>Finding Type</div>
              <div>{niceEnum(record.findingType || null)}</div>
            </div>

            {/* Finding Details */}
            <div className='col-12'>
              <div className='text-muted fw-semibold mb-1'>Finding Details</div>
              <div
                style={{
                  border: '1px dashed #e4e6ef',
                  borderRadius: 6,
                  padding: '10px 12px',
                  maxHeight: 320,
                  overflowY: 'auto',
                }}
              >
                {record.description ? (
                  <div
                    dangerouslySetInnerHTML={{__html: record.description}}
                  />
                ) : (
                  <div style={{whiteSpace: 'pre-wrap'}}>
                    {record.findingName || '-'}
                  </div>
                )}
              </div>
            </div>

            {/* Bigger Remarks area */}
            <div className='col-12 mt-3'>
              <div className='text-muted fw-semibold mb-1'>Remarks</div>
              <div
                style={{
                  border: '1px dashed #e4e6ef',
                  borderRadius: 6,
                  padding: '10px 12px',
                  minHeight: 60,
                  maxHeight: 220,
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {record.remarks && record.remarks.trim().length > 0 ? (
                  record.remarks
                ) : (
                  <span className='text-muted'>No remarks added</span>
                )}
              </div>
            </div>

            <div className='col-12 mt-3'>
              <div className='text-muted fw-semibold mb-1'>Attachments</div>
              {record.attachmentPath ? (
                <button
                  type='button'
                  className='btn btn-light-primary btn-sm'
                  onClick={() => onOpenAttachments && onOpenAttachments(record)}
                >
                  <KTSVG
                    path='/media/icons/duotune/files/fil003.svg'
                    className='svg-icon-3 me-1'
                  />
                  View Files
                </button>
              ) : (
                <span className='text-muted'>No attachments uploaded</span>
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
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export {ViewAuditFindingModal}
