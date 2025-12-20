import React from 'react';
import { KTSVG } from '../../../../_metronic/helpers';
import { updateCrewStatus } from '../core/_requests';
import { toast } from 'react-toastify';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    crewData: any;
    onCrewDeleted: () => void;
}

const DeleteCrewModal: React.FC<Props> = ({ onClose, isOpen, crewData, onCrewDeleted }) => {
    const handleDeleteCrew = async () => {
        try {
            // Call API to update status to inactive
            if (crewData) {
                await updateCrewStatus(crewData.id, false);
                onCrewDeleted();  // Refresh the crew list
                onClose();  // Close the modal
                toast.success("Crew marked as inactive.");
            }
        } catch (err) {
            console.error('Failed to deactivate crew:', err);
            toast.error('Failed to deactivate crew');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className=" d-flex justify-content-end align-items-center">
                    <button className="close-btn" onClick={onClose}>
                        <KTSVG path='/media/map/x.svg' className='svg-icon-2x' />
                    </button>
                </div>
                <div className="custom-modal-body">
                    <div className="d-flex justify-content-center mb-4">
                        <KTSVG path='/media/map/exclamation.svg' className='svg-icon-4x' />
                    </div>
                    <p className="text-center">Are you sure you want to mark this crew as inactive?</p>
                    <div className="d-flex justify-content-center gap-2 mt-5">
                        <button className="btn btn_secondary" onClick={onClose}>No, Keep it</button>
                        <button className="btn btn_danger" onClick={handleDeleteCrew}>Yes, Mark Inactive!</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteCrewModal;
