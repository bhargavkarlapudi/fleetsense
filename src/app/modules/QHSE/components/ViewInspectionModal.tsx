import React, {FC} from 'react'
import type {InspectionDto} from '../core/_models'

type Props = {
  visible: boolean
  onClose: () => void
  record: InspectionDto | null
}

const LABEL_CLS = 'form-label fw-semibold fs-6 mb-2 text-dark'

const WRAP_STYLE: React.CSSProperties = {
  background: 'rgba(0,0,0,0.5)',
  position: 'fixed',
  inset: 0,
  zIndex: 1050,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const MODAL_DIALOG_STYLE: React.CSSProperties = {
  maxWidth: '95%',
  width: 'auto',
  margin: '0 auto',
}

const MODAL_CONTENT_STYLE: React.CSSProperties = {
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
}

export const ViewInspectionModal: FC<Props> = ({visible, onClose, record}) => {
  if (!visible || !record) return null

  const inspectionDateLabel =
    record.inspectionFromDate === record.inspectionToDate
      ? record.inspectionFromDate
      : `${record.inspectionFromDate} → ${record.inspectionToDate}`

  const finalizedLabel = record.isFinalized ? 'Yes' : 'No'
  const verifiedLabel = record.isVerified ? 'Yes' : 'No'

  return (
    <div
      className='modal fade show d-flex align-items-center justify-content-center'
      tabIndex={-1}
      style={WRAP_STYLE}
    >
      <div
        className='modal-dialog modal-xl modal-dialog-centered'
        role='dialog'
        style={MODAL_DIALOG_STYLE}
      >
        <div
          className='modal-content bg-white text-dark'
          style={MODAL_CONTENT_STYLE}
        >
          <div className='modal-header'>
            <h5 className='modal-title text-dark'>
              Inspection Details
            </h5>
            <button type='button' className='btn-close' onClick={onClose} />
          </div>

          <div className='modal-body' style={{maxHeight: '80vh', overflowY: 'auto'}}>
            <div className='row g-3'>
              <div className='col-md-6'>
                <label className={LABEL_CLS}>Vessel</label>
                <div className='form-control-plaintext fw-semibold'>
                  {record.vesselName || '-'}
                </div>
              </div>

              <div className='col-md-6'>
                <label className={LABEL_CLS}>Vessel Type</label>
                <div className='form-control-plaintext'>
                  {record.vesselType || '-'}
                </div>
              </div>

              <div className='col-md-6'>
                <label className={LABEL_CLS}>Inspection</label>
                <div className='form-control-plaintext'>
                  {record.inspectionKindName || '-'}
                </div>
              </div>

              <div className='col-md-6'>
                <label className={LABEL_CLS}>Inspection Type</label>
                <div className='form-control-plaintext'>
                  {record.inspectionType?.replace('_', ' ') || '-'}
                </div>
              </div>

              <div className='col-md-6'>
                <label className={LABEL_CLS}>Inspection Date</label>
                <div className='form-control-plaintext'>
                  {inspectionDateLabel || '-'}
                </div>
              </div>

              <div className='col-md-6'>
                <label className={LABEL_CLS}>Internal Inspector</label>
                <div className='form-control-plaintext'>
                  {record.internalInspectorName || '-'}
                </div>
              </div>

              <div className='col-md-6'>
                <label className={LABEL_CLS}>External Inspector</label>
                <div className='form-control-plaintext'>
                  {record.externalInspectorName || '-'}
                </div>
              </div>

              <div className='col-md-6'>
                <label className={LABEL_CLS}>From Port</label>
                <div className='form-control-plaintext'>
                  {record.fromPortName || '-'}
                </div>
              </div>

              <div className='col-md-6'>
                <label className={LABEL_CLS}>To Port</label>
                <div className='form-control-plaintext'>
                  {record.toPortName || '-'}
                </div>
              </div>

              <div className='col-md-6'>
                <label className={LABEL_CLS}>Hours Onboard</label>
                <div className='form-control-plaintext'>
                  {record.hoursOnboard != null ? `${record.hoursOnboard} h` : '-'}
                </div>
              </div>

              <div className='col-md-6'>
                <label className={LABEL_CLS}>Finalized</label>
                <div className='form-control-plaintext'>
                  {finalizedLabel}
                </div>
              </div>

              <div className='col-md-6'>
                <label className={LABEL_CLS}>Verified</label>
                <div className='form-control-plaintext'>
                  {verifiedLabel}
                </div>
              </div>

              <div className='col-12'>
                <label className={LABEL_CLS}>Remarks</label>
                <div className='border rounded p-3' style={{minHeight: 80}}>
                  {record.remarks ? (
                    <div
                      className='ql-snow ql-editor p-0'
                      dangerouslySetInnerHTML={{__html: record.remarks}}
                    />
                  ) : (
                    <span className='text-muted'>No remarks added.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className='modal-footer'>
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
    </div>
  )
}

export default ViewInspectionModal
