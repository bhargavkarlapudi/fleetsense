import React, { useEffect, useState } from 'react';
import { getAuth, useAuth } from '../../auth';
import { createVessel, getCompanyAdminList, getCompanyList, updateVessel } from '../core/_requests';
import { Company, CompanyAdmin } from '../core/_models';
import { toast } from 'react-toastify';
import { KTSVG } from '../../../../_metronic/helpers';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onVesselUpdated: () => void;
  vesselData: any; // Ideally, replace 'any' with a proper Vessel interface
}

const EditVesselModal: React.FC<Props> = ({ onClose, isOpen, onVesselUpdated, vesselData }) => {
  const [selectedCompany, setSelectedCompany] = useState<{ id: number; name: string }>({ id: 0, name: '' });
  const [selectedCompanyAdmin, setSelectedCompanyAdmin] = useState<{ id: number; name: string }>({ id: 0, name: '' });

  const [vesselName, setVesselName] = useState('');
  const [imoNumber, setImoNumber] = useState('');
  const [mmsi, setMmsi] = useState('');
  const [callSign, setCallSign] = useState('');
  const [flag, setFlag] = useState('');
  const [vesselClass, setVesselClass] = useState('');
  const [vesselArea, setVesselArea] = useState('');
  const [dwt, setDwt] = useState('');
  const [vesselType, setVesselType] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyAdmins, setCompanyAdmins] = useState<CompanyAdmin[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [companiesbyAdmin, setCompaniesByAdmin] = useState<Company[]>([]);
  const [originalCompanyId, setOriginalCompanyId] = useState<number>(0);
  const [originalCompanyAdminId, setOriginalCompanyAdminId] = useState<number>(0);

  // const roleId = sessionStorage.getItem("roleId");
  // const roleEntityId = sessionStorage.getItem("roleEntityId");

  const { currentUser } = useAuth()
  const roleEntityId = currentUser?.roleEntityId;
  const roleId = currentUser?.role?.id;
  /** OPERATOR BEHAVIOR SPLIT **/
const companyGroupAdminId =
  (currentUser as any)?.companyGroupAdminId ??
  (currentUser as any)?.companyGroupAdmin?.id ??
  null

const isOperator = roleId === 6
const isSuperadminOperator = isOperator && companyGroupAdminId == null   // Operator under Superadmin
const isCompanyOperator   = isOperator && companyGroupAdminId != null    // Operator under a Company Group

// Normalized effective roles
const actsAsSuperadmin = roleId === 1 || isSuperadminOperator
const actsAsCga        = roleId === 5 || isCompanyOperator

// Effective CGA id when acting as CGA
const effectiveCgaId = actsAsCga
  ? (roleId === 5 ? Number(roleEntityId) : Number(companyGroupAdminId))
  : undefined
  useEffect(() => {
    if (isOpen && vesselData) {
      console.log(vesselData);
      setVesselName(vesselData.fleet_name || '');
      setImoNumber(vesselData.imoNumber || '');
      setMmsi(vesselData.mmsi || '');
      setCallSign(vesselData.call_sign || '');
      setFlag(vesselData.flag || '');
      setVesselClass(vesselData.classes || '');
      setVesselArea(vesselData.area || '');
      setDwt(vesselData.dwt || '');
      setVesselType(vesselData.vesselType || '');

      const companyId = vesselData.companyAdminId;
      const adminId = vesselData.companyGroupAdminId;

      setOriginalCompanyId(companyId);
      setOriginalCompanyAdminId(adminId);

      setSelectedCompanyAdmin({ id: vesselData.companyGroupAdmin.id, name: vesselData.companyGroupAdmin.name });
      setSelectedCompany({ id: vesselData.companyAdmin?.id, name: vesselData.companyAdmin?.name });

      // if (vesselData.companyAdmin) {
      //   setSelectedCompany({ id: vesselData.companyAdmin.id, name: vesselData.companyAdmin.name });
      // } else {
      //   setSelectedCompany({ id: 0, name: '' });
      // }

      // if (vesselData.companyGroupAdmin) {
      //   setSelectedCompanyAdmin({ id: vesselData.companyGroupAdmin.id, name: vesselData.companyGroupAdmin.name });
      // } else {
      //   setSelectedCompanyAdmin({ id: 0, name: '' });
      // }
      fetchCompaniesByAdmin(adminId);
    }
  }, [isOpen, vesselData]);

  useEffect(() => {
  // If acting as CGA (CGA or Operator-CGA), lock CGA and fetch its sub-companies list
  if (actsAsCga && effectiveCgaId) {
    setSelectedCompanyAdmin(prev => prev.id ? prev : { id: effectiveCgaId, name: '' });
  }

  fetchCompanies();               // will adapt based on actsAsCga/effectiveCgaId

  // Only Superadmin (or Operator-Superadmin) needs CGA list
  if (actsAsSuperadmin) {
    fetchCompanyAdmins();
  }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [actsAsCga, actsAsSuperadmin, effectiveCgaId]);

  useEffect(() => {
    if (selectedCompanyAdmin.id) {
      fetchCompaniesByAdmin(selectedCompanyAdmin.id);
    } else {
      setCompaniesByAdmin([]);
    }
  }, [selectedCompanyAdmin.id]);

  const fetchCompanies = async () => {
  try {
    const companyList = await getCompanyList();
    console.log('Company List:', companyList);

    // When acting as CGA (CGA or Operator-CGA), show only sub-companies under the effective CGA.
    // Otherwise (Superadmin), this list is not used in the UI; keep it empty to avoid confusion.
    const activeCompanies = actsAsCga && effectiveCgaId
      ? companyList.filter(c => c.active === true && c.cga?.id === Number(effectiveCgaId))
      : [];

    setCompanies(activeCompanies);
  } catch (error) {
    console.error('Failed to fetch company list:', error);
  }
};

  const fetchCompaniesByAdmin = async (adminId: number) => {
    try {
      const companyList = await getCompanyList();
      const filteredCompanies = companyList.filter(c => c.cga?.id === adminId);
      console.log("Company by admins: ", filteredCompanies);
      setCompaniesByAdmin(filteredCompanies);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    }
  };


  const fetchCompanyAdmins = async () => {
    try {
      const list = await getCompanyAdminList();
      setCompanyAdmins(list);
    } catch (err) {
      console.error('Failed to fetch company admins:', err);
    }
  };

  const validateVesselForm = () => {
    const errors: Record<string, string> = {};

    if (!imoNumber || !/^\d{7}$/.test(imoNumber)) {
      errors.imoNumber = "IMO Number must be a 7-digit number.";
    }

    if (!callSign || !/^[a-zA-Z0-9]{5,10}$/.test(callSign)) {
      errors.callSign = "Call Sign must be between 5 and 10 alphanumeric characters.";
    }

    if (!vesselName.trim()) {
      errors.vesselName = "Vessel Name is required.";
    }

    if (!imoNumber || !/^\d{7}$/.test(imoNumber)) {
      errors.imoNumber = "IMO Number must be a 7-digit number.";
    }

    if (!mmsi || !/^\d{9}$/.test(mmsi)) {
      errors.vesselMMSI = "MMSI must be a 9-digit number.";
    }

    if (!flag.trim()) {
      errors.vesselFlag = "Vessel Flag is required.";
    }

    if (!vesselClass.trim()) {
      errors.vesselClass = "Vessel Class is required.";
    }

    if (!vesselArea.trim()) {
      errors.vesselArea = "Vessel Area is required.";
    }

    if (!dwt || +dwt <= 0) {
      errors.dwt = "DWT must be a positive number.";
    }

    if (!vesselType) {
      errors.vesselType = "Vessel Type is required.";
    }
    if (actsAsSuperadmin) {
  if (selectedCompanyAdmin.id === 0) {
    errors.company = "Company is required.";
  }
}
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdateVessel = async () => {
    if (!validateVesselForm()) return;

    try {
      const isCompanyChanged =
        selectedCompany.id !== originalCompanyId ||
        selectedCompanyAdmin.id !== originalCompanyAdminId;

      // if (isCompanyChanged) {
      //   // 1. Deactivate existing vessel
      //   await updateVessel(auth.jwt, vesselData.id,
      //     vesselName,
      //     vesselType,
      //     imoNumber,
      //     mmsi,
      //     callSign,
      //     flag,
      //     vesselClass,
      //     vesselArea,
      //     dwt,
      //     originalCompanyId,
      //     originalCompanyAdminId,
      //     false // <- false = deactivate
      //   );

      //   await createVessel(
      //     auth.jwt,
      //     vesselName,
      //     vesselType,
      //     imoNumber,
      //     mmsi,
      //     callSign,
      //     flag,
      //     vesselClass,
      //     vesselArea,
      //     dwt,
      //     selectedCompany.id,
      //     selectedCompanyAdmin.id,
      //   )

      // }

      const finalCompanyAdminId = actsAsCga
  ? Number(effectiveCgaId)                  // lock to acting CGA
  : selectedCompanyAdmin.id;                // Superadmin picks in UI

const finalCompanyId = selectedCompany.id;  // sub-company can be changed by CGA or Superadmin

await updateVessel(
  vesselData.id,
  vesselName,
  vesselType,
  imoNumber,
  mmsi,
  callSign,
  flag,
  vesselClass,
  vesselArea,
  dwt,
  finalCompanyId,
  finalCompanyAdminId,
  vesselData.active,
);

      toast.success("Vessel updated successfully");

      onVesselUpdated();
      onClose();
    } catch (err) {
      console.error('Failed to update vessel:', err);
      setError("Failed to update vessel.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '60rem' }}>
        <div className="custom-modal-header d-flex justify-content-between align-items-center">
          <h5 className="m-0">Edit Vessel</h5>
          <button className="close-btn" onClick={onClose}>
            <KTSVG path='/media/map/x.svg' className='svg-icon-2x' />
          </button>
        </div>

        <div className="custom-modal-body">
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="row">
            {actsAsCga && (
  <div className="col-md-6 mb-3">
    <label className="modal_label">Select Sub Company</label>
    <select
      className="form-control"
      value={selectedCompany?.id}
      onChange={(e) => {
        const id = +e.target.value;
        const obj = companies.find(c => c.id === id);
        setSelectedCompany(obj || { id: 0, name: '' });
      }}
    >
      <option value="">-- Select Sub Company --</option>
      {companies.filter(c => c.active === true).map(c => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  </div>
)}
            {actsAsSuperadmin && (
  <>
    <div className="col-md-6 mb-3">
      <label className="modal_label">
        Select Company <span className="text-danger">*</span>
      </label>
      <select
        className="form-control"
        value={selectedCompanyAdmin?.id}
        onChange={(e) => {
          const id = +e.target.value;
          const obj = companyAdmins.find(c => c.id === id);
          setSelectedCompanyAdmin(obj || { id: 0, name: '' });
          setSelectedCompany({ id: 0, name: '' }); // Reset Sub Company on Company change
        }}
      >
        <option value="">-- Select Company --</option>
        {companyAdmins.filter(ca => ca.active === true).map(ca => (
          <option key={ca.id} value={ca.id}>{ca.name}</option>
        ))}
      </select>
      {fieldErrors.company && <small className="text-danger">{fieldErrors.company}</small>}
    </div>

    <div className="col-md-6 mb-3">
      <label className="modal_label">Select Sub Company</label>
      <select
        className="form-control"
        value={selectedCompany?.id}
        onChange={(e) => {
          const id = +e.target.value;
          const obj = companiesbyAdmin.find(c => c.id === id);
          setSelectedCompany(obj || { id: 0, name: '' });
        }}
      >
        <option value="">-- Select Sub Company --</option>
        {companiesbyAdmin.filter(c => c.active === true).map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </div>
  </>
)}

            <div className="col-md-6 mb-3">
              <label className="modal_label">Vessel Name <span className="text-danger">*</span></label>
              <input type="text" className="form-control" value={vesselName} onChange={e => setVesselName(e.target.value)} />
              {fieldErrors.vesselName && <small className="text-danger">{fieldErrors.vesselName}</small>}
            </div>
            <div className="col-md-6 mb-3">
              <label className="modal_label">IMO Number <span className="text-danger">*</span></label>
              <input type="number" className="form-control no-spinner" value={imoNumber} onChange={e => {
                setImoNumber(e.target.value);
              }} />
              {fieldErrors.imoNumber && <small className="text-danger">{fieldErrors.imoNumber}</small>}
            </div>
            <div className="col-md-6 mb-3">
              <label className="modal_label">Vessel MMSI <span className="text-danger">*</span></label>
              <input type="number" className="form-control no-spinner" value={mmsi} onChange={e => {
                setMmsi(e.target.value)
              }} />
              {fieldErrors.vesselMMSI && <small className="text-danger">{fieldErrors.vesselMMSI}</small>}
            </div>
            <div className="col-md-6 mb-3">
              <label className="modal_label">Vessel CALL SIGN <span className="text-danger">*</span></label>
              <input type="text" className="form-control" value={callSign} onChange={e => {
                setCallSign(e.target.value)
              }} />
              {fieldErrors.callSign && <small className="text-danger">{fieldErrors.callSign}</small>}
            </div>
            <div className="col-md-6 mb-3">
              <label className="modal_label">Vessel FLAG <span className="text-danger">*</span></label>
              <input type="text" className="form-control" value={flag} onChange={e => setFlag(e.target.value)} />
              {fieldErrors.vesselFlag && <small className="text-danger">{fieldErrors.vesselFlag}</small>}
            </div>
            <div className="col-md-12 mb-3">
              <label className="modal_label">Vessel CLASS <span className="text-danger">*</span></label>
              <textarea className="form-control" rows={3} value={vesselClass} onChange={e => setVesselClass(e.target.value)} />
              {fieldErrors.vesselClass && <small className="text-danger">{fieldErrors.vesselClass}</small>}
            </div>
            <div className="col-md-6 mb-3">
              <label className="modal_label">Vessel Area (A1, A2, A3, A4) <span className="text-danger">*</span></label>
              <input type="text" className="form-control" value={vesselArea} onChange={e => setVesselArea(e.target.value)} />
              {fieldErrors.vesselArea && <small className="text-danger">{fieldErrors.vesselArea}</small>}
            </div>
            <div className="col-md-6 mb-3">
              <label className="modal_label">DWT <span className="text-danger">*</span></label>
              <input type="number" className="form-control no-spinner" value={dwt} onChange={e => setDwt(e.target.value)} />
              {fieldErrors.dwt && <small className="text-danger">{fieldErrors.dwt}</small>}
            </div>
            <div className="col-md-12 mb-3">
              <label className="modal_label">Vessel Type <span className="text-danger">*</span></label>
              <select className="form-control" value={vesselType} onChange={(e) => {
                setVesselType(e.target.value)
              }}>
                <option value="">-- Select Vessel Type --</option>
                <option value="OIL_TANKER">Oil Tanker</option>
                <option value="CHEMICAL_TANKER">Chemical Tanker</option>
                <option value="PRODUCT_TANKER">Product Tanker</option>
                <option value="LNG_CARRIER">LNG Carrier (Liquefied Natural Gas)</option>
                <option value="LPG_CARRIER">LPG Carrier (Liquefied Petroleum Gas)</option>
                <option value="CRUDE_OIL_TANKER">Crude Oil Tanker</option>
                <option value="BUNKER_TANKER">Bunker Tanker</option>
                <option value="CONTAINER_SHIP">Container Ship</option>
                <option value="BULK_CARRIER">Bulk Carrier</option>
                <option value="GENERAL_CARGO_SHIP">General Cargo Ship</option>
                <option value="RORO_CARGO_SHIP">Ro-Ro Cargo Ship (Roll-on/Roll-off)</option>
                <option value="HEAVY_LIFT_VESSEL">Heavy Lift Vessel</option>
                <option value="REEFER_SHIP">Reefer Ship (Refrigerated Cargo)</option>
                <option value="MULTI_PURPOSE_VESSEL">Multi-purpose Vessel</option>
                <option value="CRUISE_SHIP">Cruise Ship</option>
                <option value="FERRY">Ferry</option>
                <option value="ROPAX_VESSEL">Ro-Pax Vessel (Ro-Ro + Passenger)</option>
                <option value="HIGH_SPEED_CRAFT">High-Speed Craft</option>
                <option value="OFFSHORE_SUPPLY_VESSEL">Offshore Supply Vessel (OSV)</option>
                <option value="AHTS">Anchor Handling Tug Supply (AHTS)</option>
                <option value="PSV">Platform Supply Vessel (PSV)</option>
                <option value="SEISMIC_SURVEY_VESSEL">Seismic Survey Vessel</option>
                <option value="CABLE_LAYER">Cable Layer</option>
                <option value="RESEARCH_VESSEL">Research Vessel</option>
                <option value="DSV">Diving Support Vessel (DSV)</option>
                <option value="FIREFIGHTING_VESSEL">Firefighting Vessel</option>
                <option value="PIPE_LAYING_VESSEL">Pipe Laying Vessel</option>
                <option value="HARBOR_TUG">Harbor Tug</option>
                <option value="OCEAN_TUG">Ocean Tug</option>
                <option value="WORK_BOAT">Work Boat</option>
                <option value="PILOT_BOAT">Pilot Boat</option>
                <option value="BARGE">Barge (Non-self-propelled)</option>
                <option value="CRANE_BARGE">Crane Barge</option>
              </select>
              {fieldErrors.vesselType && <small className="text-danger">{fieldErrors.vesselType}</small>}
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-end gap-2">
          <button className="btn btn_secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn_success" onClick={handleUpdateVessel}>Save</button>
        </div>
      </div>
    </div>
  );
};

export default EditVesselModal;
