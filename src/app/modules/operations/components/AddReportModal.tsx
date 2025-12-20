import React, { useState } from 'react';
import { createMenuItem, createTemplate } from '../core/_requests';
import { getAuth } from '../../auth';
import { KTSVG } from '../../../../_metronic/helpers';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onReportAdded: (tempId: number) => void;
}

const AddReportModal: React.FC<Props> = ({ onClose, isOpen, onReportAdded }) => {
    const [reportName, setReportName] = useState("");
    const [error, setError] = useState("");

    const handleAddMenuItem = async () => {
        if (!reportName.trim()) {
            setError("Please enter a report name");
            return;
        }

        try {
            const response = await createTemplate(reportName);
            console.log("template creation response", response);

            const tempId = response.id;
            await createMenuItem(tempId, reportName, true);
            onReportAdded(tempId);
        } catch (err) {
            console.error('Failed to fetch add report:', err);
        }

        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="custom-modal-header d-flex justify-content-between align-items-center">
                    <h5 className="m-0">Add Report</h5>
                    <button className="close-btn" onClick={onClose}>
                        <KTSVG path='/media/map/x.svg' className='svg-icon-2x' />
                    </button>
                </div>

                <div className="custom-modal-body">
                    {error && <div className='text-danger'>{error}</div>}
                    <label className="modal_label">Report Name<span className="text-danger">*</span></label>
                    <input
                        type="text"
                        value={reportName}
                        onChange={(e) => setReportName(e.target.value)}
                        className="form-control"
                    />
                </div>

                <div className="d-flex justify-content-end gap-2">
                    <button className="btn btn_secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn_success" onClick={handleAddMenuItem}>Add</button>
                </div>
            </div>
        </div>
    );
};

export default AddReportModal;
