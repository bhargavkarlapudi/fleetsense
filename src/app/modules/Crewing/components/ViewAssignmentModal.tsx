import React, { useState, useEffect } from 'react';
import { KTSVG } from '../../../../_metronic/helpers';
import { SignOnOffRecord } from '../core/_requests';
import { Rank } from '../core/_models';

// just after your imports:
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
  recordData?: SignOnOffRecord;
  onClose: () => void;
  rankMap: Record<number, string>;
}

const ViewAssignmentModal: React.FC<Props> = ({ isOpen, recordData, onClose, rankMap }) => {
  if (!isOpen || !recordData) return null;


    const formatData = (data: string | null | undefined) => (data ? data : 'Not Available');


  // Helper function to render badges for status
  const renderStatusBadge = (status: string) => {
    if (status === 'SIGNED_ON') {
      return <span className="badge badge-light-success">SIGNED ON</span>;
    } else if (status === 'SIGNED_OFF') {
      return <span className="badge badge-light-secondary">SIGNED OFF</span>;
    } else if (status === 'PLANNED') {
      return <span className="badge badge-light-warning">PLANNED SIGNED ON</span>;
    } else if (status === 'PLANNED_SIGN_OFF') {
      return <span className="badge badge-light-danger">PLANNED SIGNED OFF</span>;
    } else {
      return <span className="badge bg-light-warning text-dark">Unknown</span>;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '70rem' }}
      >
        <div className="custom-modal-header d-flex justify-content-between align-items-center">
          <h5 className="m-0">View Crew Assignment</h5>
          <button className="close-btn" onClick={onClose}>
            <KTSVG path="/media/map/x.svg" className="svg-icon-2x" />
          </button>
        </div>

        <div className="custom-modal-body">
          <div className="row gy-4">
            {/* Crew Name */}
            <div className="col-md-4 mb-3">
              <strong>Crew Name:</strong>
              <p>{formatData(recordData.crewName) || 'Not Available'}</p>
            </div>

            {/* Rank */}
            <div className="col-md-4 mb-3">
              <strong>Rank:</strong>
              <p>{formatData(rankMap[recordData.rank]) || 'Not Available'}</p>
            </div>

            {/* Vessel */}
            <div className="col-md-4 mb-3">
              <strong>Vessel:</strong>
              <p>{formatData(recordData.vesselName) || 'Not Available'}</p>
            </div>

            {/* Sign On Date */}
            <div className="col-md-4 mb-3">
              <strong>Sign On Date:</strong>
              <p>{"Not Available" === formatData(recordData.signOnDate) ? 
                // <span className='badge badge-light-warning'>
                    "—"
                    // </span>
                    :formatData(formatDate(recordData.signOnDate)) }</p>
            </div>

            {/* Sign Off Date */}
            <div className="col-md-4 mb-3">
              <strong>Sign Off Date:</strong>
              <p>{"Not Available" === formatData(recordData.signOffDate) ? 
                // <span className='badge badge-light-warning'>
                    "—"
                    // </span>
                    : formatData(recordData.signOffDate)}</p>
            </div>

            {/* Port Sign On */}
            <div className="col-md-4 mb-3">
              <strong>Port Sign On:</strong>
              <p>{formatData(recordData.portSignOn) || "—"}</p>
            </div>

            {/* Port Sign Off */}
            <div className="col-md-4 mb-3">
              <strong>Port Sign Off:</strong>
              <p>{formatDate(recordData.signOffDate)}</p>
            </div>

            {/* Travel Arrangements */}
            {/* <div className="col-md-4 mb-3">
              <strong>Travel Arrangements:</strong>
              <p>{formatData(recordData.travelArrangements) || 'Not Available'}</p>
            </div> */}

            {/* Status */}
            <div className="col-md-4 mb-3">
              <strong>Status:</strong>
              <p>{renderStatusBadge(formatData(recordData.status))}</p>
            </div>

            {/* Sign Off Reason (Last) */}
            <div className="col-md-4 mb-3">
              <strong>Sign Off Reason:</strong>
              <p>{"Not Available" === formatData(recordData.signOffReason) ? 
                // <span className='badge badge-light-warning'>
                    "—"
                    // </span>
                    : formatData(recordData.signOffReason)}</p>
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-end">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewAssignmentModal;
