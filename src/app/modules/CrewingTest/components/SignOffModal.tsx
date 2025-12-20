import React, { useState } from 'react';
import { KTSVG } from '../../../../_metronic/helpers';
import { toast } from 'react-toastify';
import { signOffCrew } from '../core/_requests';

/** format “YYYY-MM-DD” (or ISO) → “DD-MMM-YYYY” e.g. “12-Jul-2025” */
// allow string|null|undefined
const formatDate = (iso?: string | null) => {
  // 1) no value
  if (!iso) {
    return '—'
  }
  const d = new Date(iso)
  // 2) invalid date
  if (isNaN(d.getTime())) {
    return '—'
  }
  const dd = String(d.getDate()).padStart(2, '0')
  const mmm = d.toLocaleString('en-US', { month: 'short' })
  const yyyy = d.getFullYear()
  return `${dd}-${mmm}-${yyyy}`
}


interface Props {
  isOpen: boolean;
  onClose: () => void;
  recordId: number;
  signOnDate: string;             
  onSignedOff: (updated: {
    id: number;
    signOffDate: string;
    signOffReason: string;
    portSignOff: string;
    status: string;
  }) => void;
}

const SignOffModal: React.FC<Props> = ({
  isOpen, onClose, recordId,signOnDate, onSignedOff
}) => {
  const [portSignOff, setPortSignOff]       = useState('');
  const [signOffDate, setSignOffDate]       = useState('');
  const [signOffReason, setSignOffReason]   = useState('');
  const [error, setError]                   = useState('');

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!portSignOff || !signOffDate || !signOffReason) {
      setError('Please fill in all fields.');
      return;
    }
    // new validation:
  const so = new Date(signOnDate)
  const sf = new Date(signOffDate)
  if (sf < so) {
    setError(`Sign-off date can’t be before sign-on date (${formatDate(signOnDate)}).`)
    return
  }

    setError('');
    try {
      const payload = { recordId, signOffDate, signOffReason, portSignOff };
      const resp = await signOffCrew(payload);
      toast.success('Crew signed off successfully');
      onSignedOff({
        id: resp.id,
        signOffDate: resp.signOffDate!,
        signOffReason: resp.signOffReason!,
        portSignOff: resp.portSignOff!,
        status: resp.status
      });
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to sign off');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={e=>e.stopPropagation()} style={{ maxWidth:'40rem' }}>
        <div className="custom-modal-header d-flex justify-content-between align-items-center">
          <h5>Sign Off Crew</h5>
          <button className="close-btn" onClick={onClose}>
            <KTSVG path="/media/map/x.svg" className="svg-icon-2x" />
          </button>
        </div>
        <div className="custom-modal-body">
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="row gy-3">
            <div className="col-md-6">
              <label className="modal_label">Port Sign-Off *</label>
              <input
                type="text"
                className="form-control"
                value={portSignOff}
                onChange={e => setPortSignOff(e.target.value)}
              />
            </div>
            <div className="col-md-6">
              <label className="modal_label">Sign-Off Date *</label>
              <input
                type="date"
                className="form-control"
                value={signOffDate}
                onChange={e => setSignOffDate(e.target.value)}
              />
            </div>
            <div className="col-12">
              <label className="modal_label">Reason *</label>
              <textarea
                className="form-control"
                rows={3}
                value={signOffReason}
                onChange={e => setSignOffReason(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="d-flex justify-content-end gap-2 p-3">
          <button className="btn btn_secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn_success" onClick={handleSubmit}>Confirm</button>
        </div>
      </div>
    </div>
  );
};

export default SignOffModal;