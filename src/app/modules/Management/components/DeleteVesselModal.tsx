import React from 'react';
import { KTSVG } from '../../../../_metronic/helpers';
import { deleteVessel } from '../core/_requests';
import { toast } from 'react-toastify';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    vesselData: any;
    onVesselDeleted: () => void;
}

const DeleteVesselModal: React.FC<Props> = ({ onClose, isOpen, vesselData, onVesselDeleted }) => {

    const handleDeleteVessel = async () => {

        try {
            // await updateVessel(vesselData.id,
            //     vesselData.fleet_name,
            //     vesselData.vesselType,
            //     vesselData.imoNumber,
            //     vesselData.mmsi,
            //     vesselData.call_sign,
            //     vesselData.flag ,
            //     vesselData.classes,
            //     vesselData.area,
            //     vesselData.dwt,
            //     vesselData.companyGroupAdmin?.id,
            //     vesselData.companyAdmin?.id,
            //     false
            // );

            const response = await deleteVessel(vesselData.id)

            console.log("vessel deletion response", response);
            toast.success("Vessel deleted successfully");

            onVesselDeleted();
            onClose();
        } catch (err) {
            console.error('Failed to delete vessel:', err);
            toast.error('Failed to delete vessel');
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
                    <p className="text-center">Are you sure you want to delete this vessel?
                        <strong>All the data under this vessel will be permanently deleted.</strong>
                    </p>
                    <div className="d-flex justify-content-center gap-2 mt-5">
                        <button className="btn btn_secondary" onClick={onClose}>No, Keep it</button>
                        <button className="btn btn_danger" onClick={handleDeleteVessel}>Yes, Delete!</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteVesselModal;
