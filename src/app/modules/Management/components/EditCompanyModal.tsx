import React, { useEffect, useState } from 'react';
import { getAuth, useAuth } from '../../auth';
import { getCompanyAdminList, getVesselList, updateCompany, updateVessel } from '../core/_requests';
import { toast } from 'react-toastify';
import { CompanyAdmin, Vessel } from '../core/_models';
import { KTSVG } from '../../../../_metronic/helpers';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onCompanyUpdated: () => void;
    companyData: any;
}

const EditCompanyModal: React.FC<Props> = ({ onClose, isOpen, onCompanyUpdated, companyData }) => {
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
    const [selectedCompanyAdmin, setSelectedCompanyAdmin] = useState<{ id: number; name: string }>({ id: 0, name: '' });
    const [error, setError] = useState<string | null>(null);
    const [companyAdmins, setCompanyAdmins] = useState<CompanyAdmin[]>([]);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [vessels, setVessels] = useState<Vessel[]>([]);

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

// Normalized effective roles
const actsAsSuperadmin = roleId === 1 || isSuperadminOperator
const actsAsCga        = roleId === 5 || isCompanyOperator

// Effective CGA id when acting as CGA
const effectiveCgaId = actsAsCga
  ? (roleId === 5 ? Number(roleEntityId) : Number(companyGroupAdminId))
  : undefined
    useEffect(() => {
        if (isOpen && companyData) {
            console.log(companyData.cgaid);
            setSelectedCompanyAdmin({ id: companyData.cgaid ?? 0, name: companyData.companyGroupAdmin?.name });
            setCompanyName(companyData.name || '');
            setContact(companyData.contactNo || '');
            setAltContact(companyData.altContactNo || '');
            setEmail(companyData.email || '');
            setAddr1(companyData.addressLine1 || '');
            setAddr2(companyData.addressLine2 || '');
            setLandmark(companyData.landmark || '');
            setCountry(companyData.country || '');
            setState(companyData.state || '');
            setCity(companyData.city || '');
            setCompanyDetails(companyData.companyDetails || '');
            setError(null);
        }
    }, [isOpen, companyData]);

    useEffect(() => {
  if (actsAsSuperadmin) {
    fetchCompanyAdmins();
  }
  fetchVessels();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [actsAsSuperadmin]);

    const fetchVessels = async () => {
        try {
            const vesselList = await getVesselList();
            console.log('Vessel List:', vesselList);
            setVessels(vesselList);
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

    const fetchCompanyAdmins = async () => {
        try {
            const companyList = await getCompanyAdminList();
            console.log('Company List:', companyList);

            setCompanyAdmins(companyList);
        } catch (error) {
            console.error('Failed to fetch company list:', error);
        }
    };

    const handleUpdateCompany = async () => {
        if (!validateFields()) return;

        try {
            // Determine the new CGA id based on effective role
const newAdminId = actsAsCga
  ? Number(effectiveCgaId)
  : selectedCompanyAdmin?.id;

// If acting as Superadmin (true superadmin or operator-superadmin),
// allow changing the CGA and migrate vessels whose sub-company equals this company
if (actsAsSuperadmin) {
  const isCompanyAdminChanged = newAdminId !== companyData.cgaid;

  const vesselsOfThisCompany = vessels.filter(
    (v) => v.companyAdmin?.id === companyData.id
  );

  if (isCompanyAdminChanged) {
    for (const vessel of vesselsOfThisCompany) {
      await updateVessel(
        vessel.id,
        vessel.fleet_name,
        vessel.vesselType,
        vessel.imoNumber,
        vessel.mmsi ?? "",
        vessel.call_sign ?? "",
        vessel.flag ?? "",
        vessel.classes ?? "",
        vessel.area ?? "",
        vessel.dwt ?? "",
        vessel.companyAdmin?.id || 0, // keep vessel's sub-company as-is
        newAdminId,                   // new CGA
        true
      );
    }
  }
}
            const response = await updateCompany(companyData.id,
                newAdminId,
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
            // console.log('Update success:', response);
            toast.success("Sub company updated successfully");

            onCompanyUpdated();
            onClose();
        } catch (err) {
            console.error('Failed to update sub company:', err);
            setError('Failed to update sub company.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '60rem' }}>
                <div className="custom-modal-header d-flex justify-content-between align-items-center">
                    <h5 className="m-0">Edit Sub Company</h5>
                    <button className="close-btn" onClick={onClose}>
                        <KTSVG path='/media/map/x.svg' className='svg-icon-2x' />
                    </button>
                </div>

                <div className="custom-modal-body">
                    {error && <div className="alert alert-danger">{error}</div>}

                    <div className="row">
                        {actsAsSuperadmin && (
  <div className="col-md-6 mb-3">
    <label className="modal_label">Select Company <span className="text-danger">*</span></label>
    <select
      className="form-control"
      value={selectedCompanyAdmin?.id}
      onChange={(e) => {
        const id = +e.target.value;
        const obj = companyAdmins.find(c => c.id === id);
        setSelectedCompanyAdmin(obj || { id: 0, name: '' });
      }}
    >
      <option value="">-- Select Company --</option>
      {companyAdmins.filter(ca => ca.active === true).map(ca => (
        <option key={ca.id} value={ca.id}>{ca.name}</option>
      ))}
    </select>
    {fieldErrors.companyAdmin && <small className="text-danger">{fieldErrors.companyAdmin}</small>}
  </div>
)}
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
                    <button className="btn btn_success" onClick={handleUpdateCompany}>Save</button>
                </div>
            </div>
        </div>
    );
};

export default EditCompanyModal;