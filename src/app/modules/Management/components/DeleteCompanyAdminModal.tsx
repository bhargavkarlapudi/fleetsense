import React from 'react';
import { KTSVG } from '../../../../_metronic/helpers';
import { deleteCompanyAdmin } from '../core/_requests';
import { toast } from 'react-toastify';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    companyAdminData: any;
    onCompanyDeleted: () => void;
}

const DeleteCompanyAdminModal: React.FC<Props> = ({ onClose, isOpen, companyAdminData, onCompanyDeleted }) => {

    const handleDeleteCompany = async () => {

        try {
            // if (companyAdminData) {
            //     const response = await updateCompanyAdmin(companyAdminData.id,
            //         companyAdminData.name || '',
            //         companyAdminData.contactNo || '',
            //         companyAdminData.altContactNo || '',
            //         companyAdminData.email || '',
            //         companyAdminData.addressLine1 || '',
            //         companyAdminData.addressLine2 || '',
            //         companyAdminData.landmark || '',
            //         companyAdminData.country || '',
            //         companyAdminData.state || '',
            //         companyAdminData.city || '',
            //         companyAdminData.companyGroupAdminDetails || '',
            //     false);
            //     console.log('Update response:', response);
            // }

            const response = await deleteCompanyAdmin(companyAdminData.id)

            console.log("company deletion response", response);
            toast.success("Company deleted successfully");

            onCompanyDeleted();
            onClose();
        } catch (err) {
            console.error('Failed to delete company:', err);
            toast.error('Failed to delete company');
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
                    <p className="text-center">
                        Are you sure you want to delete this company?<br />
                        <strong>All the data under this company will be permanently deleted.</strong>
                    </p>
                    <div className="d-flex justify-content-center gap-2 mt-5">
                        <button className="btn btn_secondary" onClick={onClose}>No, Keep it</button>
                        <button className="btn btn_danger" onClick={handleDeleteCompany}>Yes, Delete!</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteCompanyAdminModal;
