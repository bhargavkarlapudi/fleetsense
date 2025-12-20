import React, {FC, useState} from 'react'
import type {QHSEDefectDto} from '../core/_models'
import {FileViewerModal} from '../components/FileViewerModal'
import {
  defectAttachmentViewUrl,
  defectAttachmentDownloadUrl,
  defectClosureViewUrl,
  defectClosureDownloadUrl,
} from '../core/_requests'

interface Props {
  visible: boolean
  onClose: () => void
  record: QHSEDefectDto | null
  onOpenAttachments?: (record: QHSEDefectDto) => void
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

export const ViewDefectModal: FC<Props> = ({visible, onClose, record, onOpenAttachments}) => {
  const [fileView, setFileView] = useState<{
    visible: boolean
    title: string
    viewUrl?: string
    downloadUrl?: string
  }>({
    visible: false,
    title: '',
    viewUrl: undefined,
    downloadUrl: undefined,
  })

    if (!visible || !record) return null

    const lines: {label: string; value: string}[] = [
    {label: 'Vessel', value: record.vesselName || '-'},
    {label: 'Defect Number', value: record.defectNumber || '-'},
    {label: 'Category', value: niceEnum(record.category)},
    {
      label: 'TPI Sub Category',
      value: record.tpiSubCategory ? niceEnum(record.tpiSubCategory) : '-',
    },
    {label: 'DAC Code', value: record.dacCode != null ? String(record.dacCode) : '-'},
    {label: 'DAC Action Name', value: record.dacActionName || '-'},
    {
      label: 'SMS Option',
      value: record.smsCode ? niceEnum(record.smsCode) : '-',
    },
    {label: 'Date of Observing', value: record.dateObserved || '-'},
    {label: 'Date Defect Raised On', value: record.dateDefect || '-'},
    {
      label: 'Applicable Requisition Number',
      value: record.applicableRequisitionNumber || '-',
    },
    {
      label: 'Department',
      value: record.department ? niceEnum(record.department) : '-',
    },
  ]


  return (
    <div style={WRAP_STYLE} tabIndex={-1}>
      {/* Custom wide modal window – consistent with Add/Edit Defect modals */}
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
          <h5 className='modal-title text-dark m-6'>View Defect</h5>
          <button type='button' className='btn-close m-6' onClick={onClose} />
        </div>

        {/* Body with inner scroll */}
        <div className='flex-grow-1 overflow-auto px-4 py-3 m-6'>
          {record.displayTitle && (
            <div className='alert alert-light-primary background-primary bg-opacity-10 border-primary border-start-5 mb-5 p-4'>
              <strong>{record.displayTitle}</strong>
            </div>
          )}

          <div className='row g-3'>
            {lines.map((l, idx) => (
              <div className='col-md-6' key={idx}>
                <div className='fw-semibold text-muted fs-7 mb-1'>{l.label}</div>
                <div className='fw-bold'>{l.value}</div>
              </div>
            ))}


<div className='row mb-3'>
  <label className='col-sm-4 fw-semibold text-muted'>
    Linked To
  </label>
  <div className='col-sm-8'>
    {record.inspectionId ? (
      <>
        Inspection –{' '}
        <span className='fw-semibold'>
          {record.inspectionDisplayName ||
            record.displayTitle ||
            `#${record.inspectionId}`}
        </span>
      </>
    ) : record.auditId ? (
      <>
        Audit –{' '}
        <span className='fw-semibold'>
          {record.auditDisplayName ||
            record.displayTitle ||
            `#${record.auditId}`}
        </span>
      </>
    ) : (
      <span className='text-muted'>-</span>
    )}
  </div>
</div>

                        {/* Description */}
            <div className='col-12'>
              <div className='fw-semibold text-muted fs-7 mb-1'>Description</div>
              <div
                className='border rounded p-2 bg-light-subtle'
                style={{minHeight: '60px'}}
              >
                {record.description || '-'}
              </div>
            </div>

            {/* Corrective Action */}
            <div className='col-12'>
              <div className='fw-semibold text-muted fs-7 mb-1'>Corrective Action</div>
              <div
                className='border rounded p-2 bg-light-subtle'
                style={{minHeight: '60px'}}
              >
                {record.correctiveAction || '-'}
              </div>
            </div>

            {/* Preventive Action */}
            <div className='col-12'>
              <div className='fw-semibold text-muted fs-7 mb-1'>Preventive Action</div>
              <div
                className='border rounded p-2 bg-light-subtle'
                style={{minHeight: '60px'}}
              >
                {record.preventiveAction || '-'}
              </div>
            </div>

            {/* Remarks */}
            <div className='col-12'>
              <div className='fw-semibold text-muted fs-7 mb-1'>Remarks</div>
              <div
                className='border rounded p-2 bg-light-subtle'
                style={{minHeight: '60px'}}
              >
                {record.remarks || '-'}
              </div>
            </div>

            {/* Closure Remark */}
            <div className='col-12'>
              <div className='fw-semibold text-muted fs-7 mb-1'>Closure Remark</div>
              <div
                className='border rounded p-2 bg-light-subtle'
                style={{minHeight: '60px'}}
              >
                {record.closureRemark || '-'}
              </div>
            </div>
{/* 
            <div className='col-md-6'>
              <div className='fw-semibold text-muted fs-7 mb-1'>Attachment</div>
              {record.attachmentPath && record.id ? (
                <div className='d-flex align-items-center flex-wrap gap-2'>
                  <button
                    type='button'
                    className='btn btn-light-primary btn-outline btn-sm d-inline-flex align-items-center'
                    onClick={() =>
                      setFileView({
                        visible: true,
                        title: 'Defect Attachment',
                        viewUrl: defectAttachmentViewUrl(record.id!),
                        downloadUrl: defectAttachmentDownloadUrl(record.id!),
                      })
                    }
                  >
                    View
                  </button>
                </div>
              ) : (
                <div>-</div>
              )}
            </div> */}

            {/* Attachments (multi-file) */}
<div className='col-12'>
  <div className='fw-semibold text-muted fs-7 mb-1'>Attachments</div>
  {record.id ? (
    <button
      type='button'
      className='btn btn-light-primary btn-sm'
      onClick={() => onOpenAttachments && onOpenAttachments(record)}
    >
      Open Attachment List
    </button>
  ) : (
    <span className='text-muted'>-</span>
  )}
</div>


            <div className='col-md-6'>
              <div className='fw-semibold text-muted fs-7 mb-1'>Closure Evidence</div>
              {record.closureEvidencePath && record.id ? (
                <div className='d-flex align-items-center flex-wrap gap-2'>
                  <button
                    type='button'
                    className='btn btn-light-primary btn-outline btn-sm d-inline-flex align-items-center'
                    onClick={() =>
                      setFileView({
                        visible: true,
                        title: 'Defect Closure Evidence',
                        viewUrl: defectClosureViewUrl(record.id!),
                        downloadUrl: defectClosureDownloadUrl(record.id!),
                      })
                    }
                  >
                    View
                  </button>
                </div>
              ) : (
                <div>-</div>
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

      {/* File viewer for attachment/closure evidence */}
      <FileViewerModal
        visible={fileView.visible}
        onClose={() =>
          setFileView(prev => ({...prev, visible: false}))
        }
        title={fileView.title}
        fileName={fileView.title}
        viewUrl={fileView.viewUrl}
        downloadUrl={fileView.downloadUrl}
      />
    </div>
  )
}
