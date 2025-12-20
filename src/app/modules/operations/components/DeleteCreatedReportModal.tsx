import React, { useEffect, useRef, useState } from 'react';
import { Modal } from 'bootstrap'; // ✅ Import Modal constructor
import { getAuth } from '../../auth';
import { createTemplate, deleteDraftReport, deleteField } from '../core/_requests';
import { Fields } from '../core/_models';
import { FaExclamationTriangle } from 'react-icons/fa';
import { KTSVG } from '../../../../_metronic/helpers';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    reportId: number
    onReportDeleted: () => void;
}

const DeleteCreatedReportModal: React.FC<Props> = ({ onClose, isOpen, reportId, onReportDeleted }) => {
    const modalInstanceRef = useRef<Modal | null>(null); // Store the modal instance
    const [inputType, setInputType] = useState("text");
    const [minValue, setMinValue] = useState<number | undefined>();
    const [maxValue, setMaxValue] = useState<number | undefined>();
    const [unit, setUnit] = useState("");
    const [options, setOptions] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [optionInput, setOptionInput] = useState("");

    const handleDeleteCreatedReport = async () => {

        try {

            const response = await deleteDraftReport(reportId);
            console.log("report deletion response", response);
            onReportDeleted();
            onClose();
        } catch (err) {
            alert("error deleting created report")
            console.error('Failed to delete created report:', err);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{paddingInline: '1rem'}} >
                <div className="custom-modal-header border-0 d-flex justify-content-end align-items-center">
                    <button className="close-btn" onClick={onClose}>
                        <KTSVG path='/media/map/x.svg' className='svg-icon-2x' />
                    </button>
                </div>

                <div className="custom-modal-body pt-0">
                    <div className="d-flex justify-content-center mb-4">
                        <KTSVG path='/media/map/exclamation.svg' className='svg-icon-4x'></KTSVG>
                    </div>
                    <p className="text-center">Are you sure you want to delete this report?</p>
                    <div className="d-flex justify-content-center gap-2 mt-5">
                        <button className="btn btn_secondary" onClick={onClose}>No, Keep it</button>
                        <button className="btn btn_danger" onClick={handleDeleteCreatedReport}>Yes, Delete!</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteCreatedReportModal;
