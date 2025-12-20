import React from 'react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    companyData: any; // Replace with a proper interface if available
}

const ViewCompanyModal: React.FC<Props> = ({ isOpen, onClose, companyData }) => {
    if (!isOpen || !companyData) return null;

    console.log(companyData);
    const displayField = (label: string, value: string | null | undefined) => (
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
                    <h5 className="m-0">View Sub Company</h5>
                    <button className="close-btn btn btn-sm btn-light" onClick={onClose}>×</button>
                </div>

                <div className="custom-modal-body p-4">
                    <div className="row">
                        {displayField('Sub Company Name', companyData.name)}
                        {/* {displayField('Username', companyData.uid.username)} */}
                        {displayField('Contact No.', companyData.contactNo)}
                        {displayField('Alternative Contact No.', companyData.altContactNo)}
                        {displayField('Email', companyData.email)}
                        {displayField('Address Line 1', companyData.addressLine1)}
                        {displayField('Address Line 2', companyData.addressLine2)}
                        {displayField('Landmark', companyData.landmark)}
                        {displayField('Country', companyData.country)}
                        {displayField('State', companyData.state)}
                        {displayField('City', companyData.city)}
                        {displayField('Company Details', companyData.companyDetails)}
                    </div>
                </div>

                <div className="d-flex justify-content-end border-top p-3">
                    <button className="btn btn-secondary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

export default ViewCompanyModal;
