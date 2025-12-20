import React from 'react';
import { Rank, CompanyAdmin, Company } from '../../core/_models';

interface PersonalDataProps {
  presentRankId: number | '';
  setPresentRankId: (value: number | '') => void;
  rankAppliedForId: number | '';
  setRankAppliedForId: (value: number | '') => void;
  familyName: string;
  setFamilyName: (value: string) => void;
  telNo: string;
  setTelNo: (value: string) => void;
  name: string;
  setName: (value: string) => void;
  contactNumber: string;
  setContactNumber: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  alternateMobNo: string;
  setAlternateMobNo: (value: string) => void;
  dateOfBirth: Date | null;
  setDateOfBirth: (value: Date | null) => void;
  skypeId: string;
  setSkypeId: (value: string) => void;
  nationality: string;
  setNationality: (value: string) => void;
  placeOfBirth: string;
  setPlaceOfBirth: (value: string) => void;
  dateOfAvailability: Date | null;
  setDateOfAvailability: (value: Date | null) => void;
  maritalStatus: string;
  setMaritalStatus: (value: string) => void;
  department: string;
  setDepartment: (value: string) => void;
  willingToAcceptLowerRank: boolean;
  setWillingToAcceptLowerRank: (value: boolean) => void;
  boilerSuitSize: string;
  setBoilerSuitSize: (value: string) => void;
  heightCms: number;
  setHeight: (value: number) => void;
  weightKgs: number;
  setWeight: (value: number) => void;
  bmiIndex: number;
  setBmiIndex: (value: number) => void;
  bloodGroup: string;
  setBloodGroup: (value: string) => void;
  shoeSize: string;
  setShoeSize: (value: string) => void;
  address: string;
  setAddress: (value: string) => void;
  notes: string; // Add notes
  setNotes: (value: string) => void;
  roleId: number | undefined;
  selectedCompany: { id: number; name: string };
  setSelectedCompany: (value: { id: number; name: string }) => void;
  selectedCompanyAdmin: { id: number; name: string };
  setSelectedCompanyAdmin: (value: { id: number; name: string }) => void;
  companies: Company[];
  companyAdmins: CompanyAdmin[];
  companiesbyAdmin: Company[];
  fetchCompaniesByAdmin: (adminId: number) => void;
  roleEntityId: number | undefined;
  fieldErrors: Record<string, string>;
  ranks: Rank[];
  bloodGroupOptions: string[];
  /** Lock core assignment fields after personal data is saved */
  lockCoreFields?: boolean;
    /** NEW: how Operator should behave (provided by parent EditCrewModal) */
  operatorActsLikeSuperadmin?: boolean;
  operatorActsLikeGroupAdmin?: boolean;
}

const PersonalData: React.FC<PersonalDataProps> = ({
  presentRankId, setPresentRankId,
  rankAppliedForId, setRankAppliedForId,
  familyName, setFamilyName,
  telNo, setTelNo,
  name, setName,
  contactNumber, setContactNumber,
  email, setEmail,
  alternateMobNo, setAlternateMobNo,
  dateOfBirth, setDateOfBirth,
  skypeId, setSkypeId,
  nationality, setNationality,
  placeOfBirth, setPlaceOfBirth,
  dateOfAvailability, setDateOfAvailability,
  maritalStatus, setMaritalStatus,
  department, setDepartment,
  willingToAcceptLowerRank, setWillingToAcceptLowerRank,
  boilerSuitSize, setBoilerSuitSize,
  heightCms, setHeight,
  weightKgs, setWeight,
  bmiIndex, setBmiIndex,
  bloodGroup, setBloodGroup,
  shoeSize, setShoeSize,
  address, setAddress,
  notes, setNotes, // Add notes
  roleId,
  selectedCompany, setSelectedCompany,
  selectedCompanyAdmin, setSelectedCompanyAdmin,
  companies,
  companyAdmins,
  companiesbyAdmin,
  fetchCompaniesByAdmin,
  roleEntityId,
  fieldErrors,
  ranks,
  bloodGroupOptions,
  lockCoreFields = false,
  // NEW:
  operatorActsLikeSuperadmin = false,
  operatorActsLikeGroupAdmin = false,
}) => {
    // === Derived “effective role” flags used by UI rendering ===
  const actsLikeSuperadmin = roleId === 1 || operatorActsLikeSuperadmin
  const actsLikeGroupAdmin = roleId === 5 || operatorActsLikeGroupAdmin

  // Require sub-company only when acting like a (fixed) group admin and there are sub-companies available
const requireSubCompany =
    actsLikeGroupAdmin && Array.isArray(companies) && companies.length > 0;

  return (
    <>
      <div className="col-md-6 mb-3">
        <label className='modal_label'>Present Rank <span className='text-danger'>*</span></label>
        <select className="form-control" value={presentRankId} onChange={(e) => setPresentRankId(e.target.value === '' ? '' : Number(e.target.value))}
          // disabled={lockCoreFields} //NEW
          >
          <option value=''>--Select Present Rank--</option>
          {ranks.map((r) => (
            <option key={r.id} value={r.id}>{r.rank}</option>
          ))}
        </select>
        {fieldErrors.presentRankId && <small className='text-danger'>{fieldErrors.presentRankId}</small>}
      </div>
      <div className="col-md-6 mb-3">
        <label className='modal_label'>Rank Applied for <span className='text-danger'>*</span></label>
        <select className="form-control" value={rankAppliedForId} onChange={(e) => setRankAppliedForId(e.target.value === '' ? '' : Number(e.target.value))}
          // disabled={lockCoreFields}   // NEW
>
          <option value=''>--Select Applied Rank--</option>
          {ranks.map((r) => (
            <option key={r.id} value={r.id}>{r.rank}</option>
          ))}
        </select>
        {fieldErrors.rankAppliedForId && <small className='text-danger'>{fieldErrors.rankAppliedForId}</small>}
      </div>
      <div className="col-md-6 mb-3">
        <label className='modal_label'>Family Name</label>
        <input type="text" className="form-control" value={familyName} onChange={(e) => setFamilyName(e.target.value)} />
        {fieldErrors.familyName && <small className='text-danger'>{fieldErrors.familyName}</small>}
      </div>
      <div className="col-md-6 mb-3">
        <label className='modal_label'>Tel No</label>
        <input type="tel" className="form-control" value={telNo} onChange={(e) => setTelNo(e.target.value)} />
        {fieldErrors.telNo && <small className='text-danger'>{fieldErrors.telNo}</small>}
      </div>
      <div className="col-md-6 mb-3">
        <label className='modal_label'>Name <span className='text-danger'>*</span></label>
        <input type="text" className="form-control" value={name} onChange={(e) => setName(e.target.value)} />
        {fieldErrors.name && <small className='text-danger'>{fieldErrors.name}</small>}
      </div>
      <div className="col-md-6 mb-3">
        <label className='modal_label'>Mobile No <span className='text-danger'>*</span></label>
        <input type="tel" className="form-control" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} />
        {fieldErrors.contactNumber && <small className='text-danger'>{fieldErrors.contactNumber}</small>}
      </div>
      <div className="col-md-6 mb-3">
        <label className='modal_label'>Email Id <span className='text-danger'>*</span></label>
        <input type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} />
        {fieldErrors.email && <small className='text-danger'>{fieldErrors.email}</small>}
      </div>
      <div className="col-md-6 mb-3">
        <label className='modal_label'>Alternate Mobile No <span className='text-danger'>*</span></label>
        <input type="tel" className="form-control" value={alternateMobNo} onChange={(e) => setAlternateMobNo(e.target.value)} />
        {fieldErrors.alternateMobNo && <small className='text-danger'>{fieldErrors.alternateMobNo}</small>}
      </div>
      <div className="col-md-6 mb-3">
        <label className='modal_label'>Date of Birth <span className='text-danger'>*</span></label>
        <input type="date" className="form-control" value={dateOfBirth ? dateOfBirth.toISOString().split('T')[0] : ''} onChange={(e) => setDateOfBirth(e.target.value ? new Date(e.target.value) : null)} />
        {fieldErrors.dateOfBirth && <small className='text-danger'>{fieldErrors.dateOfBirth}</small>}
      </div>
      <div className="col-md-6 mb-3">
        <label className='modal_label'>Skype Id</label>
        <input type="text" className="form-control" value={skypeId} onChange={(e) => setSkypeId(e.target.value)} />
        {fieldErrors.skypeId && <small className='text-danger'>{fieldErrors.skypeId}</small>}
      </div>
      <div className="col-md-6 mb-3">
        <label className='modal_label'>Nationality <span className='text-danger'>*</span></label>
        <select className="form-control" value={nationality} onChange={(e) => setNationality(e.target.value)}>
          <option value=''>--Select Nationality--</option>
          <option value='American'>American</option>
          <option value='Australian'>Australian</option>
          <option value='Brazilian'>Brazilian</option>
          <option value='British'>British</option>
          <option value='Canadian'>Canadian</option>
          <option value='Chinese'>Chinese</option>
          <option value='French'>French</option>
          <option value='German'>German</option>
          <option value='Indian'>Indian</option>
          <option value='Japanese'>Japanese</option>
          <option value='Georgian'>Georgian</option>
          <option value='Turkish'>Turkish</option>
          <option value='Other'>Other</option>
        </select>
        {fieldErrors.nationality && <small className='text-danger'>{fieldErrors.nationality}</small>}
      </div>
      <div className="col-md-6 mb-3">
        <label className='modal_label'>Place of Birth <span className='text-danger'>*</span></label>
        <input type="text" className="form-control" value={placeOfBirth} onChange={(e) => setPlaceOfBirth(e.target.value)} />
        {fieldErrors.placeOfBirth && <small className='text-danger'>{fieldErrors.placeOfBirth}</small>}
      </div>
      <div className="col-md-6 mb-3">
        <label className='modal_label'>Date of Availability <span className='text-danger'>*</span></label>
        <input type="date" className="form-control" value={dateOfAvailability ? dateOfAvailability.toISOString().split('T')[0] : ''} onChange={(e) => setDateOfAvailability(e.target.value ? new Date(e.target.value) : null)} />
        {fieldErrors.dateOfAvailability && <small className='text-danger'>{fieldErrors.dateOfAvailability}</small>}
      </div>
      <div className="col-md-6 mb-3">
        <label className='modal_label'>Marital Status </label>
        <select className="form-control" value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)}>
          <option value=''>--Select Marital Status--</option>
          <option value='Single'>Single</option>
          <option value='Married'>Married</option>
          <option value='Divorced'>Divorced</option>
        </select>
        {fieldErrors.maritalStatus && <small className='text-danger'>{fieldErrors.maritalStatus}</small>}
      </div>
      <div className="col-md-6 mb-3">
        <label className='modal_label'>Department <span className='text-danger'>*</span></label>
        <select className="form-control" value={department} onChange={(e) => setDepartment(e.target.value)}>
          <option value=''>--Select Department--</option>
          <option value='Deck'>Deck</option>
          <option value='Engine'>Engine</option>
          <option value='Galley'>Galley</option>
          <option value='Others'>Others</option>
        </select>
        {fieldErrors.department && <small className='text-danger'>{fieldErrors.department}</small>}
      </div>
      <div className="col-md-6 mb-3">
        <label className='modal_label'>Willing to Accept Lower Rank <span className='text-danger'>*</span></label>
        <select className="form-control" value={willingToAcceptLowerRank ? 'Yes' : 'No'} onChange={(e) => setWillingToAcceptLowerRank(e.target.value === 'Yes')}
          disabled={lockCoreFields}   // NEW
>
          <option value='Yes'>Yes</option>
          <option value='No'>No</option>
        </select>
        {fieldErrors.willingToAcceptLowerRank && <small className='text-danger'>{fieldErrors.willingToAcceptLowerRank}</small>}
      </div>
      <div className="col-md-6 mb-3">
        <label className='modal_label'>Boiler Suit Size</label>
        <input type="text" className="form-control" value={boilerSuitSize} onChange={(e) => setBoilerSuitSize(e.target.value)} />
        {fieldErrors.boilerSuitSize && <small className='text-danger'>{fieldErrors.boilerSuitSize}</small>}
      </div>
      <div className="col-md-6 mb-3">
        <label className='modal_label'>Height (cm) </label>
        <input type="number" className="form-control" value={heightCms} onChange={(e) => setHeight(Number(e.target.value))} />
        {fieldErrors.heightCms && <small className='text-danger'>{fieldErrors.heightCms}</small>}
      </div>
      <div className="col-md-6 mb-3">
        <label className='modal_label'>Weight (kg)</label>
        <input type="number" className="form-control" value={weightKgs} onChange={(e) => setWeight(Number(e.target.value))} />
        {fieldErrors.weightKgs && <small className='text-danger'>{fieldErrors.weightKgs}</small>}
      </div>
      <div className="col-md-6 mb-3">
        <label className='modal_label'>BMI Index</label>
        <input type="number" className="form-control" value={bmiIndex} onChange={(e) => setBmiIndex(Number(e.target.value))} />
        {fieldErrors.bmiIndex && <small className='text-danger'>{fieldErrors.bmiIndex}</small>}
      </div>
      <div className="col-md-6 mb-3">
        <label className='modal_label'>Blood Group</label>
        <select className="form-control" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
          <option value=''>--Select Blood Group--</option>
          {bloodGroupOptions.map((bg) => (
            <option key={bg} value={bg}>{bg}</option>
          ))}
        </select>
        {fieldErrors.bloodGroup && <small className='text-danger'>{fieldErrors.bloodGroup}</small>}
      </div>
      <div className="col-md-6 mb-3">
        <label className='modal_label'>Shoe Size</label>
        <input type="text" className="form-control" value={shoeSize} onChange={(e) => setShoeSize(e.target.value)} />
        {fieldErrors.shoeSize && <small className='text-danger'>{fieldErrors.shoeSize}</small>}
      </div>
      <div className="col-12 mb-3">
        <label className='modal_label'>Address <span className='text-danger'>*</span></label>
        <textarea className="form-control" rows={3} value={address} onChange={(e) => setAddress(e.target.value)}></textarea>
        {fieldErrors.address && <small className='text-danger'>{fieldErrors.address}</small>}
      </div>
      
      {actsLikeGroupAdmin && (
  <div className='col-md-6 mb-3'>
    <label className='modal_label'>
      Select Sub Company {requireSubCompany && <span className='text-danger'>*</span>}
    </label>
    <select
      className='form-control'
      value={selectedCompany?.id}
      onChange={(e) => {
        const id = +e.target.value;
        const obj = companies.find((c) => c.id === id);
        setSelectedCompany(obj || { id: 0, name: '' });
      }}
      disabled={lockCoreFields || companies.length === 0}
    >
      <option value=''>
        {companies.length === 0 ? '-- No Sub Companies --' : '-- Select Sub Company --'}
      </option>
      {companies.map((c) => (
        <option key={c.id} value={c.id}>{(c as any).username ?? c.name}</option>
      ))}
    </select>
    {companies.length === 0 && (
      <small className='text-muted'>This company has no sub companies.</small>
    )}
    {requireSubCompany && fieldErrors.selectedCompany && (
      <small className='text-danger'>{fieldErrors.selectedCompany}</small>
    )}
  </div>
)}

      {actsLikeSuperadmin && (
  <>
    <div className='col-md-6 mb-3'>
      <label className='modal_label'>
        Select Company
        <span className='text-danger'>*</span>
      </label>
      <select
        className='form-control'
        value={selectedCompanyAdmin?.id}
        onChange={(e) => {
          const id = +e.target.value
          const obj = companyAdmins.find((c) => c.id === id)
          setSelectedCompanyAdmin(obj || { id: 0, name: '' })
          setSelectedCompany({ id: 0, name: '' })
          fetchCompaniesByAdmin(id)
        }}
        disabled={lockCoreFields}
      >
        <option value=''>-- Select Company --</option>
        {companyAdmins.map((ca) => (
          <option key={ca.id} value={ca.id}>{ca.name}</option>
        ))}
      </select>
      {fieldErrors.companyAdmin && (
        <small className='text-danger'>{fieldErrors.companyAdmin}</small>
      )}
    </div>

    <div className='col-md-6 mb-3'>
      <label className='modal_label'>Select Sub Company</label>
      <select
        className='form-control'
        value={selectedCompany?.id}
        onChange={(e) => {
          const id = +e.target.value
          const obj = companiesbyAdmin.find((c) => c.id === id)
          setSelectedCompany(obj || { id: 0, name: '' })
        }}
        disabled={lockCoreFields}
      >
        <option value=''>-- Select Sub Company --</option>
        {companiesbyAdmin.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      {fieldErrors.selectedCompany && (
        <small className='text-danger'>{fieldErrors.selectedCompany}</small>
      )}
    </div>
  </>
)}

    </>
  );
};

export default PersonalData;