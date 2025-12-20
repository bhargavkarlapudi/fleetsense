import React, { useEffect, useRef, useState } from 'react';
import { Modal } from 'bootstrap'; // ✅ Import Modal constructor
import { getAuth, useAuth } from '../../auth';
import { maxWidth } from '@mui/system';
import { createCompany, getCompanyAdminList } from '../core/_requests';
import { toast } from 'react-toastify';
import { CompanyAdmin } from '../core/_models';
import { KTSVG } from '../../../../_metronic/helpers';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onCompanyAdded: (loginInfo: { username: string; password: string }) => void;
}

const AddCompanyModal: React.FC<Props> = ({ onClose, isOpen, onCompanyAdded }) => {
    const [companyName, setCompanyName] = useState("");
    const [contact, setContact] = useState("");
    const [altContact, setAltContact] = useState("");
    const [email, setEmail] = useState("");
    const [addr1, setAddr1] = useState("");
    const [addr2, setAddr2] = useState("");
    const [landmark, setLandmark] = useState("");
    const [country, setCountry] = useState("");
    const [state, setState] = useState("");
    const [city, setCity] = useState("");
    const [companyDetails, setCompanyDetails] = useState("");
    const [loading, setLoading] = useState(false)
    const [selectedCompanyAdmin, setSelectedCompanyAdmin] = useState<{ id: number; name: string }>({ id: 0, name: '' });
    const [companyAdmins, setCompanyAdmins] = useState<CompanyAdmin[]>([]);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);
    // const roleId = sessionStorage.getItem("roleId");
    const { currentUser } = useAuth()
    const roleId = currentUser?.role?.id;
    const roleEntityId = currentUser?.roleEntityId;
    /** OPERATOR BEHAVIOR SPLIT **/
const companyGroupAdminId =
  (currentUser as any)?.companyGroupAdminId ??
  (currentUser as any)?.companyGroupAdmin?.id ??
  null

const isOperator = roleId === 6
const isSuperadminOperator = isOperator && companyGroupAdminId == null   // acts like Superadmin
const isCompanyOperator   = isOperator && companyGroupAdminId != null    // acts like Company Group Admin

// Normalized “effective” role flags
const actsAsSuperadmin = roleId === 1 || isSuperadminOperator
const actsAsCga        = roleId === 5 || isCompanyOperator

// Effective CGA id when acting as CGA
const effectiveCgaId = actsAsCga
  ? (roleId === 5 ? Number(roleEntityId) : Number(companyGroupAdminId))
  : undefined
    useEffect(() => {
        if (isOpen) {
            clearData();
        }
    }, [isOpen]);
    useEffect(() => {
  if (actsAsSuperadmin) {
    fetchCompanyAdmins();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

    const fetchCompanyAdmins = async () => {
        try {
            const companyList = await getCompanyAdminList();
            const activeCompanies = companyList.filter(company => company.active === true);
            console.log('Company List:', activeCompanies);

            // Get distinct companies by ID
            // const distinctCompanies = Array.from(
            //     new Map(companyList.map(company => [company.id, { id: company.id, name: company.name }])).values()
            // );

            setCompanyAdmins(activeCompanies);
        } catch (error) {
            console.error('Failed to fetch company list:', error);
        }
    };

    const validateFields = () => {
        const errors: Record<string, string> = {};

        if (!companyName.trim()) errors.companyName = "Sub Company Name is required.";

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

        if (actsAsSuperadmin) {
            if (selectedCompanyAdmin.id === 0) errors.companyAdmin = "Company is required.";
        }
        if (!addr1.trim()) errors.addr1 = "Address Line 1 is required.";
        if (!country.trim()) errors.country = "Country is required.";
        if (!state.trim()) errors.state = "State is required.";

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const generateUsername = (companyName: string) => {
        return companyName.trim().toLowerCase().replace(/\s+/g, '_') + Math.floor(100 + Math.random() * 900);
    };

    const generatePassword = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$!';
        return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    };

    const clearData = () => {
        setCompanyName("");
        setContact("");
        setAltContact("");
        setEmail("");
        setAddr1("");
        setAddr2("");
        setLandmark("");
        setCountry("");
        setState("");
        setCity("");
        setCompanyDetails("");
        setError(null);
    };

    const handleAddCompany = async () => {
        console.log("clicked")
        if (!validateFields()) return;
        setLoading(true);
        console.log("clicked 2");
        try {
            console.log("Add sub company")
            const companyAdminId = actsAsCga
  ? Number(effectiveCgaId)
  : selectedCompanyAdmin.id;
            console.log(companyAdminId);
            const userName = generateUsername(companyName);
            const password = generatePassword();
            const response = await createCompany(
                companyName,
                userName,
                password,
                contact,
                altContact,
                email,
                addr1,         // addressLine1
                addr2,         // addressLine2
                landmark,
                country,
                state,
                city,
                companyDetails,
                companyAdminId// cgaid
            );
            toast.success("Sub Company added successfully");
            console.log(response);
            console.log("username: ", userName);
            console.log("password: ", password);
            onCompanyAdded({ username: userName, password });
            clearData();
            onClose();
        } catch (err) {
            console.error('Failed to add sub company:', err);
            toast.error("Failed to add sub company.");
        } finally {
            setLoading(false) // Stop loading
            setError('');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '60rem' }}>
                <div className="custom-modal-header d-flex justify-content-between align-items-center">
                    <h5 className="m-0">Add Sub Company</h5>
                    <button className="close-btn" onClick={onClose}>
                        <KTSVG path='/media/map/x.svg' className='svg-icon-2x' />
                    </button>
                </div>

                <div className="custom-modal-body">
                    {error && <div className="alert alert-danger">{error}</div>}

                    <div className="row">
                       {actsAsSuperadmin && <div className="col-md-6 mb-3">
  <label className="modal_label">Select Company <span className="text-danger">*</span></label>
  <select className="form-control" value={selectedCompanyAdmin?.id} onChange={(e) => {
    const id = +e.target.value;
    const obj = companyAdmins.find(c => c.id === id);
    setSelectedCompanyAdmin(obj || { id: 0, name: '' });
  }}>
    <option value="">-- Select Company --</option>
    {companyAdmins.map(ca => <option key={ca.id} value={ca.id}>{ca.name}</option>)}
  </select>
  {fieldErrors.companyAdmin && <small className="text-danger">{fieldErrors.companyAdmin}</small>}
</div>}
                        <div className="col-md-6 mb-3">
                            <label className="modal_label">Sub Company Name <span className="text-danger">*</span></label>
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
                            <label className="modal_label">Sub company Details</label>
                            <input type="text" className="form-control" value={companyDetails} onChange={(e) => setCompanyDetails(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="d-flex justify-content-end gap-2">
                    <button className="btn btn_secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn_success" onClick={handleAddCompany} disabled={loading}>  {loading ? 'Adding...' : 'Add'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddCompanyModal;
