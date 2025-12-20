import React, { useRef, useState } from 'react';
import { KTSVG } from '../../../../_metronic/helpers';
import { toast } from 'react-toastify';
import { Modal } from 'bootstrap';
import { updateVoyage } from '../core/_requests';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    voyageData: any;
    onVoyageDeleted: () => void;
}

const DeleteVoyageModal: React.FC<Props> = ({ onClose, isOpen, voyageData, onVoyageDeleted }) => {
    const modalInstanceRef = useRef<Modal | null>(null); // Store the modal instance
    const [inputType, setInputType] = useState("text");
    const [minValue, setMinValue] = useState<number | undefined>();
    const [maxValue, setMaxValue] = useState<number | undefined>();
    const [unit, setUnit] = useState("");
    const [options, setOptions] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [optionInput, setOptionInput] = useState("");

    const handleDeleteVessel = async () => {
        // if (!labelName.trim()) {
        //     alert("Please enter a report name");
        //     return;
        // }

        try {

            const response = await updateVoyage(
                voyageData.id,
                voyageData.voyageNumber,
                voyageData.departurePort,
                voyageData.arrivalPort,
                voyageData.startDate,
                voyageData.endDate,
                `${voyageData.departurePort} - ${voyageData.arrivalPort}`, false);

            console.log("voyage deletion response", response);
            // await createMenuItem(auth.jwt, tempId, reportName, 1 );
            // console.log('Template List:', response);
            //   await addMenuItem('template123', 'New Menu Name', accessToken);
            //   alert('Menu item added!');

            toast.success("Voyage deleted successfully");

            onVoyageDeleted();
            onClose();
        } catch (err) {
            console.error('Failed to delete voyage:', err);
            toast.error('Failed to delete voyage');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ paddingInline: '1rem' }}>
                <div className="custom-modal-header border-0 d-flex justify-content-end align-items-center">
                    <button className="close-btn" onClick={onClose}>
                        <KTSVG path='/media/map/x.svg' className='svg-icon-2x' />
                    </button>
                </div>

                <div className="custom-modal-body pt-0">
                    <div className="d-flex justify-content-center mb-4">
                        <KTSVG path='/media/map/exclamation.svg' className='svg-icon-4x'></KTSVG>
                    </div>
                    <p className="text-center">Are you sure you want to mark this voyage as inactive?</p>
                    <div className="d-flex justify-content-center gap-2 mt-5">
                        <button className="btn btn_secondary" onClick={onClose}>No, Keep it</button>
                        <button className="btn btn_danger" onClick={handleDeleteVessel}>Yes, Mark Inactive!</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteVoyageModal;
