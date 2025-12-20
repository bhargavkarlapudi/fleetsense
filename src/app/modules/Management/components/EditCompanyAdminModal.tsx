import React, { useEffect, useState } from 'react';
import { getAuth } from '../../auth';
import { updateCompanyAdmin } from '../core/_requests'; // ✅ You should implement this function
import { toast } from 'react-toastify';
import { KTSVG } from '../../../../_metronic/helpers';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onCompanyEdited: () => void;
    companyAdminData: any; // Replace `any` with proper type if available
}

const EditCompanyAdminModal: React.FC<Props> = ({ isOpen, onClose, onCompanyEdited, companyAdminData }) => {
    const [companyName, setCompanyName] = useState('');
    const [contact, setContact] = useState('');
    const [altContact, setAltContact] = useState('');
    const [email, setEmail] = useState('');
    const [addr1, setAddr1] = useState('');
    const [addr2, setAddr2] = useState('');
    const [landmark, setLandmark] = useState('');
    const [country, setCountry] = useState('');
    const [state, setState] = useState('');
    const [city, setCity] = useState('');
    const [companyDetails, setCompanyDetails] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && companyAdminData) {
            console.log(companyAdminData)
            setCompanyName(companyAdminData.name || '');
            setContact(companyAdminData.contactNo || '');
            setAltContact(companyAdminData.altContactNo || '');
            setEmail(companyAdminData.email || '');
            setAddr1(companyAdminData.addressLine1 || '');
            setAddr2(companyAdminData.addressLine2 || '');
            setLandmark(companyAdminData.landmark || '');
            setCountry(companyAdminData.country || '');
            setState(companyAdminData.state || '');
            setCity(companyAdminData.city || '');
            setCompanyDetails(companyAdminData.companyGroupAdminDetails || '');
            setError(null);
        }
    }, [isOpen, companyAdminData]);

    const validateFields = () => {
        const errors: Record<string, string> = {};

        if (!companyName.trim()) errors.companyName = "Company Name is required.";
       if (!contact.trim()) {
            errors.contact = "Contact Number is required.";
        } else if (!/^\+?[0-9\s\-()]{7,20}$/.test(contact)) {
            errors.contact = "Enter a valid international phone number.";
        }

        if (altContact && !/^\+?[0-9\s\-()]{7,20}$/.test(altContact)) {
            errors.altContact = "Enter a valid international phone number.";
        }

        if (!email.trim()) {
            errors.email = "Email is required.";
        } else if (
            !/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)
        ) {
            errors.email = "Invalid email format.";
        }

        if (!addr1.trim()) errors.addr1 = "Address Line 1 is required.";
        if (!country.trim()) errors.country = "Country is required.";
        if (!state.trim()) errors.state = "State is required.";

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleEditCompanyAdmin = async () => {
        if (!validateFields()) return;

        try {
            const response = await updateCompanyAdmin(companyAdminData.id,
                companyName,
                contact,
                altContact,
                email,
                addr1,
                addr2,
                landmark,
                country,
                state,
                city,
                companyDetails, true);

            console.log('Update response:', response);
            toast.success("Company updated successfully");

            onCompanyEdited();
            onClose();
        } catch (err) {
            console.error('Failed to update company:', err);
            setError("Failed to update company.");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '60rem' }}>
                <div className="custom-modal-header d-flex justify-content-between align-items-center">
                    <h5 className="m-0">Edit Company</h5>
                    <button className="close-btn" onClick={onClose}>
                        <KTSVG path='/media/map/x.svg' className='svg-icon-2x' />
                    </button>
                </div>

                <div className="custom-modal-body">
                    {error && <div className="alert alert-danger">{error}</div>}

                    <div className="row">
                        <div className="col-md-6 mb-3">
                            <label className="modal_label">Company Name <span className="text-danger">*</span></label>
                            <input type="text" className="form-control" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                            {fieldErrors.companyName && <small className="text-danger">{fieldErrors.companyName}</small>}
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="modal_label">Contact No. <span className="text-danger">*</span></label>
                            <input type="text" className="form-control" value={contact} onChange={(e) => setContact(e.target.value)} />
                            {fieldErrors.contact && <small className="text-danger">{fieldErrors.contact}</small>}
                        </div>

                        <div className="col-md-6 mb-3">
                            <label className="modal_label">Alternative Contact No.</label>
                            <input type="text" className="form-control" value={altContact} onChange={(e) => setAltContact(e.target.value)} />
                            {fieldErrors.altContact && <small className="text-danger">{fieldErrors.altContact}</small>}
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="modal_label">Email <span className="text-danger">*</span></label>
                            <input type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} />
                            {fieldErrors.email && <small className="text-danger">{fieldErrors.email}</small>}
                        </div>

                        <div className="col-md-6 mb-3">
                            <label className="modal_label">Address Line 1 <span className="text-danger">*</span></label>
                            <input type="text" className="form-control" value={addr1} onChange={(e) => setAddr1(e.target.value)} />
                            {fieldErrors.addr1 && <small className="text-danger">{fieldErrors.addr1}</small>}
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="modal_label">Address Line 2</label>
                            <input type="text" className="form-control" value={addr2} onChange={(e) => setAddr2(e.target.value)} />
                        </div>

                        <div className="col-md-6 mb-3">
                            <label className="modal_label">Landmark</label>
                            <input type="text" className="form-control" value={landmark} onChange={(e) => setLandmark(e.target.value)} />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="modal_label">Country <span className="text-danger">*</span></label>
                            <input type="text" className="form-control" value={country} onChange={(e) => setCountry(e.target.value)} />
                            {fieldErrors.country && <small className="text-danger">{fieldErrors.country}</small>}
                        </div>

                        <div className="col-md-6 mb-3">
                            <label className="modal_label">State <span className="text-danger">*</span></label>
                            <input type="text" className="form-control" value={state} onChange={(e) => setState(e.target.value)} />
                            {fieldErrors.state && <small className="text-danger">{fieldErrors.state}</small>}
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="modal_label">City</label>
                            <input type="text" className="form-control" value={city} onChange={(e) => setCity(e.target.value)} />
                        </div>

                        <div className="col-6">
                            <label className="modal_label">Company Details</label>
                            <input type="text" className="form-control" value={companyDetails} onChange={(e) => setCompanyDetails(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="d-flex justify-content-end gap-2">
                    <button className="btn btn_secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn_success" onClick={handleEditCompanyAdmin}>Save</button>
                </div>
            </div>
        </div>
    );
};

export default EditCompanyAdminModal;
