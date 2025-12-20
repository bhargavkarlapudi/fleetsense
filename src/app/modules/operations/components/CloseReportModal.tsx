import React, { useState } from 'react';
import { createMenuItem, createTemplate, submitReport } from '../core/_requests';
import { getAuth } from '../../auth';
import { useNavigate } from 'react-router-dom';
import { KTSVG } from '../../../../_metronic/helpers';
import { Reports, ReportStatus, Voyage } from '../core/_models';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    formData: {
        [tabId: number]: {
            [fieldName: string]: any;
        };
    };
    assignmentId: Number;
    selectedReport: Partial<Reports> | null;
    selectedVoyage: Voyage | null;
    onSaveDraft: () => void;
}

const CloseReportModal: React.FC<Props> = ({ onClose, isOpen, formData, assignmentId, selectedReport, selectedVoyage, onSaveDraft, }) => {
    const [reportName, setReportName] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="custom-modal-header d-flex justify-content-end align-items-center border-0 pt-0">
                    <button className="close-btn" onClick={onClose}>
                        <KTSVG path='/media/map/x.svg' className='svg-icon-2x' />
                    </button>
                </div>

                <div className="custom-modal-body">
                    <div className="d-flex justify-content-center mb-4">
                        <KTSVG path='/media/map/exclamation.svg' className='svg-icon-4x'></KTSVG>
                    </div>
                    <div className='text-center'>Are you sure you want to exit?</div>
                </div>

                <div className="d-flex justify-content-evenly gap-2">
                    <button className="btn btn_secondary" onClick={onClose}>No, cancel</button>
                    <button className="btn btn_secondary" onClick={onSaveDraft}>Save as draft</button>
                    <button className="btn btn_danger" onClick={() => {
                        navigate('/operations');
                        onClose();
                    }}>Yes, I'm sure</button>
                </div>
            </div>
        </div>
    );
};

export default CloseReportModal;
