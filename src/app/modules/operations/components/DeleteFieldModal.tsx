import React, { useEffect, useRef, useState } from 'react';
import { Modal } from 'bootstrap'; // ✅ Import Modal constructor
import { getAuth } from '../../auth';
import { createTemplate, deleteField } from '../core/_requests';
import { Fields } from '../core/_models';
import { FaExclamationTriangle } from 'react-icons/fa';
import { KTSVG } from '../../../../_metronic/helpers';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    submenuId: number;
    fieldId: number;
    labelName: string;
    onFieldDeleted: () => void;
}

const DeleteFieldModal: React.FC<Props> = ({ onClose, isOpen, submenuId, fieldId, labelName, onFieldDeleted }) => {

    const handleDeleteFieldItem = async () => {
        try {
            const response = await deleteField(submenuId, fieldId);
            console.log("field deletion response", response);
            onFieldDeleted();
            onClose();
        } catch (err) {
            alert("error deleting field")
            console.error('Failed to delete field:', err);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{paddingInline: '1rem'}}>
                <div className="custom-modal-header border-0 d-flex justify-content-end align-items-center">
                    <button className="close-btn" onClick={onClose}>
                        <KTSVG path='/media/map/x.svg' className='svg-icon-2x' />
                    </button>
                </div>

                <div className="custom-modal-body pt-0">
                    <div className="d-flex justify-content-center mb-4">
                        <KTSVG path='/media/map/exclamation.svg' className='svg-icon-4x'></KTSVG>
                    </div>
                    <p className="text-center">Are you sure you want to delete the <strong>"{labelName || 'Field'}"</strong> field?</p>
                    <div className="d-flex justify-content-center gap-2 mt-5">
                        <button className="btn btn_secondary" onClick={onClose}>No, Keep it</button>
                        <button className="btn btn_danger" onClick={handleDeleteFieldItem}>Yes, Delete!</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteFieldModal;
