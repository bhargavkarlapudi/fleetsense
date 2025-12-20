import React from 'react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    companyAdminData: any; // Replace with specific type if available
}

const ViewCompanyAdminModal: React.FC<Props> = ({ isOpen, onClose, companyAdminData }) => {
    if (!isOpen || !companyAdminData) return null;

    const displayRow = (label: string, value: string | null | undefined) => (
        <div className="col-md-6 mb-3">
            <label className="modal_label fw-semibold">{label}</label>
            <div className="form-control-plaintext border rounded p-2 bg-light">{value || '-'}</div>
        </div>
    );

    return (
        <div className="modal-overlay">
            <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '60rem', background: '#fff', borderRadius: '10px' }}
            >
                <div className="custom-modal-header d-flex justify-content-between align-items-center border-bottom p-3">
                    <h5 className="m-0">View Company Details</h5>
                    <button className="close-btn btn btn-sm btn-light" onClick={onClose}>×</button>
                </div>

                <div className="custom-modal-body p-4">
                    <div className="row">
                        {displayRow('Company Name', companyAdminData.name)}
                        {/* {displayRow('User Name', companyAdminData.uid?.username)} */}
                        {displayRow('Contact No.', companyAdminData.contactNo)}
                        {displayRow('Alternative Contact No.', companyAdminData.altContactNo)}
                        {displayRow('Email', companyAdminData.email)}
                        {displayRow('Address Line 1', companyAdminData.addressLine1)}
                        {displayRow('Address Line 2', companyAdminData.addressLine2)}
                        {displayRow('Landmark', companyAdminData.landmark)}
                        {displayRow('Country', companyAdminData.country)}
                        {displayRow('State', companyAdminData.state)}
                        {displayRow('City', companyAdminData.city)}
                        {displayRow('Company Details', companyAdminData.companyGroupAdminDetails)}
                    </div>
                </div>

                <div className="d-flex justify-content-end border-top p-3">
                    <button className="btn btn-secondary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

export default ViewCompanyAdminModal;
