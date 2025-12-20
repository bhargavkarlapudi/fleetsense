import React, { useState, useEffect } from 'react';
import { KTSVG } from '../../../../_metronic/helpers';
import { updateAssignment  } from '../core/_requests';
import { toast } from 'react-toastify';
import { SignOnOffRecord } from '../core/_requests';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    recordData: any;
    onUpdate: (updatedRecord: SignOnOffRecord) => void;
}

const EditAssignmentModal: React.FC<Props> = ({ isOpen, onClose, recordData, onUpdate }) => {
    const [signOnDate, setSignOnDate] = useState(recordData.signOnDate);
    const [portSignOn, setPortSignOn] = useState(recordData.portSignOn);
    const [signOffDate, setSignOffDate] = useState(recordData.signOffDate); // New state for Sign-Off Date

    const handleUpdate = async () => {
        if (!signOnDate || !portSignOn || (recordData.status === "PLANNED_SIGN_OFF" && !signOffDate)) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
      // call the new assignment-update endpoint
      const updated = await updateAssignment(recordData.id, { 
        signOnDate: recordData.status === "PLANNED_SIGN_OFF" ? undefined : signOnDate, // Use sign-off date for planned signed off
        signOffDate: recordData.status === "PLANNED_SIGN_OFF" ? signOffDate : undefined,
        portSignOn });
      onUpdate(updated);         // directly pass the updated record
      onClose();
      toast.success('Assignment updated successfully');
    } catch (err) {
      console.error('Error updating assignment:', err);
      toast.error('Failed to update assignment');
    }
  };

  // Use Sign-Off Date field if status is "PLANNED_SIGN_OFF"
  const isPlannedSignedOff = recordData.status === "PLANNED_SIGN_OFF";


    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="custom-modal-header d-flex justify-content-between align-items-center">
                    <h5>Edit Crew Assignment</h5>
                    <button className="close-btn" onClick={onClose}>
                        <KTSVG path='/media/map/x.svg' className='svg-icon-2x' />
                    </button>
                </div>
                <div className="custom-modal-body">
                    <div className="row">
                        <div className="col-md-6 mb-3">
                            {!isPlannedSignedOff && (
              <div className="col-md-6 mb-3">
                <label className="modal_label">Sign On Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={signOnDate}
                  onChange={(e) => setSignOnDate(e.target.value)}
                />
              </div>
            )}
            {isPlannedSignedOff && (
              <div className="col-md-6 mb-3">
                <label className="modal_label">Sign Off Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={signOffDate}
                  onChange={(e) => setSignOffDate(e.target.value)}
                />
              </div>
            )}
                        </div>
                        {/* <div className="col-md-6 mb-3">
                            <label className="modal_label">Port of Sign On</label>
                            <input
                                type="text"
                                className="form-control"
                                value={portSignOn}
                                onChange={(e) => setPortSignOn(e.target.value)}
                            />
                        </div> */}
                    </div>
                </div>
                <div className="d-flex justify-content-end gap-2">
                    <button className="btn btn_secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn_success" onClick={handleUpdate}>Save Changes</button>
                </div>
            </div>
        </div>
    );
};

export default EditAssignmentModal;
