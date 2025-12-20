import React from 'react';
import { KTSVG } from '../../../../_metronic/helpers';
import { deleteCompany} from '../core/_requests';
import { toast } from 'react-toastify';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    companyData: any;
    onCompanyDeleted: () => void;
}

const DeleteCompanyModal: React.FC<Props> = ({ onClose, isOpen, companyData, onCompanyDeleted }) => {

    const handleDeleteCompany = async () => {
        try {
            // if (companyData) {
            //     const response = await updateCompany(companyData.id,
            //         companyData.cgaid ?? 0,
            //         companyData.name || '',
            //         companyData.contactNo || '',
            //         companyData.altContactNo || '',
            //         companyData.email || '',
            //         companyData.addressLine1 || '',
            //         companyData.addressLine2 || '',
            //         companyData.landmark || '',
            //         companyData.country || '',
            //         companyData.state || '',
            //         companyData.city || '',
            //         companyData.companyDetails || '', false);

            //     console.log('Update response:', response);
            // }
            const response = await deleteCompany(companyData.id)

            console.log("company deletion response", response);
            toast.success("Sub Company deleted successfully");

            onCompanyDeleted();
            onClose();
        } catch (err) {
            console.error('Failed to delete sub company:', err);
            toast.error('Failed to delete sub company');
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
                    <p className="text-center">Are you sure you want to delete this sub company?
                        <strong>All the data under this sub company will be permanently deleted.</strong>
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

export default DeleteCompanyModal;
