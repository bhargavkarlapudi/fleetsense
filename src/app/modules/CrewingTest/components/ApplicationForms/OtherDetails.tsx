import React, { useEffect, useState } from 'react';
import { AdditionalDetailsRequest, AdditionalDetailsResponse, Reference } from '../../core/_models';

interface OtherDetailsProps {
  additionalDetails: AdditionalDetailsRequest;
  setAdditionalDetails: React.Dispatch<React.SetStateAction<AdditionalDetailsRequest>>;
  references: Reference[];
  setReferences: React.Dispatch<React.SetStateAction<Reference[]>>;
  existingAdditionalDetails: AdditionalDetailsResponse | null;
  errors: Record<string, string>;
  onSubmit: () => void;
}

const OtherDetails: React.FC<OtherDetailsProps> = ({
  additionalDetails,
  setAdditionalDetails,
  references,
  setReferences,
  existingAdditionalDetails,
  errors,
  onSubmit,
}) => {
  const handleChange = (field: keyof AdditionalDetailsRequest, value: any) => {
    setAdditionalDetails((prev) => ({ ...prev, [field]: value }));
  };

  const handleReferenceChange = (index: number, field: keyof Reference, value: string) => {
    setReferences((prev) =>
      prev.map((ref, i) => (i === index ? { ...ref, [field]: value } : ref))
    );
  };

  const addRow = () => {
    setReferences([...references, { srNo: references.length + 1, companyName: '', pic: '', designation: '', phoneNo: '' }]);
  };

  const removeRow = (index: number) => {
    if (references.length > 1) {
      setReferences(references.filter((_, i) => i !== index).map((ref, i) => ({ ...ref, srNo: i + 1 })));
    }
  };

  const questions = [
    {
      label: 'Have you been involved in any Incidents of Grounding / Fire / Explosion / Collision / Abandon Ship / Rescue / Major Oil pollution / Drug Smuggling / Towed or Towing another vessel, If Yes, Please Specify',
      field: 'incidentInvolvement' as keyof AdditionalDetailsRequest,
      detailsField: 'incidentDetails' as 'incidentDetails',
    },
    {
      label: 'Have you been involved in a court of Enquiry for a Maritime accident? If Yes, please specify',
      field: 'courtOfEnquiryInvolvement' as keyof AdditionalDetailsRequest,
      detailsField: 'courtOfEnquiryDetails' as 'courtOfEnquiryDetails',
    },
    {
      label: 'Have you ever been involved in a criminal case? If yes, give details:',
      field: 'criminalCaseInvolved' as keyof AdditionalDetailsRequest,
      detailsField: 'criminalCaseDetails' as 'criminalCaseDetails',
    },
    {
      label: 'Have you present or previous certificate ever been suspended/revoked? If yes, give details:',
      field: 'certificateSuspendedRevoked' as keyof AdditionalDetailsRequest,
      detailsField: 'certificateSuspendedRevokedDetails' as 'certificateSuspendedRevokedDetails',
    },
    {
      label: 'Do you suffer or have suffered from: Diabetes/High Blood pressure/Hepatitis/Epilepsy/Nervous Disorders/Disturbed Vision or Hearing/Vertigo, If Yes, give details:',
      field: 'hasMedicalConditions' as keyof AdditionalDetailsRequest,
      detailsField: 'medicalConditionsDetails' as 'medicalConditionsDetails',
    },
    {
      label: 'Are you a habitual user of Drugs / Narcotics / Excessive Alcohol, If Yes, give details:',
      field: 'habitualUseDrugsAlcohol' as keyof AdditionalDetailsRequest,
      detailsField: 'habitualUseDetails' as 'habitualUseDetails',
    },
    {
      label: 'Have you previously worked with multinational workforce? If Yes, What nationalities:',
      field: 'workedWithMultinational' as keyof AdditionalDetailsRequest,
      detailsField: 'multinationalNationalities' as 'multinationalNationalities',
    },
  ];

  const referralOptions = [
    { label: 'Word of mouth', value: 'WORD_OF_MOUTH' },
    { label: 'Print media (state which)', value: 'PRINT_MEDIA' },
    { label: 'Contacted by Staff', value: 'CONTACTED_BY_STAFF' },
    { label: 'Web Sites', value: 'WEB_SITES' },
  ];

  const [hasReferenceData, setHasReferenceData] = useState<boolean>(false);

  const [referralDetailsMap, setReferralDetailsMap] = useState<Record<string, string>>({
    WORD_OF_MOUTH: '',
    PRINT_MEDIA: '',
    CONTACTED_BY_STAFF: '',
    WEB_SITES: '',
  });

  // ADD a new handler for updating referral details:
  const handleReferralDetailsChange = (source: string, value: string) => {
    setReferralDetailsMap((prev) => ({ ...prev, [source]: value }));
    setAdditionalDetails((prev) => ({
      ...prev,
      referralDetails: source === prev.referralSource ? value || null : prev.referralDetails,
    }));
  };

  // ADD useEffect to initialize referralDetailsMap from existing data:
  useEffect(() => {
    if (
      existingAdditionalDetails?.referralSource &&
      typeof existingAdditionalDetails.referralSource === 'string' &&
      existingAdditionalDetails.referralDetails
    ) {
      setReferralDetailsMap((prev) => ({
        ...prev,
        [existingAdditionalDetails.referralSource as string]: existingAdditionalDetails.referralDetails ?? '',
      }));
    }
  }, [existingAdditionalDetails]);

  const handleToggleReferences = (checked: boolean) => {
    setHasReferenceData(checked);
    setAdditionalDetails((prev) => ({
      ...prev,
      hasReferenceData: checked,
      references: checked ? JSON.stringify(references) : '[]',
    }));
    if (!checked) {
      setReferences([{ srNo: 1, companyName: '', pic: '', designation: '', phoneNo: '' }]);
    }
  };

  const validateReferences = () => {
    const errors: Record<string, string> = {};
    if (hasReferenceData) {
      references.forEach((ref, index) => {
        if (!ref.companyName?.trim()) {
          errors[`reference_companyName_${index}`] = 'Company name is required';
        }
        if (!ref.pic?.trim()) {
          errors[`reference_pic_${index}`] = 'Person in charge is required';
        }
        if (!ref.designation?.trim()) {
          errors[`reference_designation_${index}`] = 'Designation is required';
        }
        if (!ref.phoneNo?.trim()) {
          errors[`reference_phoneNo_${index}`] = 'Phone number is required';
        } else if (!/^\+?[0-9\s\-()]{7,20}$/.test(ref.phoneNo)) {
          errors[`reference_phoneNo_${index}`] = 'Invalid phone number format';
        }
      });
    }
    return errors;
  };

  const declarations = [
    {
      label: 'I understand that a strict medical examination including Drug and Alcohol test as per company requirements is a condition of my employment and I express my willingness to be examined.',
      field: 'declarationMedicalExam' as 'declarationMedicalExam',
    },
    {
      label: 'I undertake to provide the company’s medical officer full details of my previous medical history. I agree that the decision of the company medical officer is final.',
      field: 'declarationMedicalDecision' as 'declarationMedicalDecision',
    },
    {
      label: 'I declare that there are no criminal/police investigations in progress against me.',
      field: 'declarationNoCriminal' as 'declarationNoCriminal',
    },
    {
      label: 'I confirm that all my travel documents are valid and in order. I understand that if my travel Documents become invalid or restricted at any time during the course of my employment and cannot be revalidated by me under normal process, the contract of employment will terminate and all costs repatriation will be borne by me.',
      field: 'declarationDocumentsValid' as 'declarationDocumentsValid',
    },
    {
      label: 'I am/ am not presently employed elsewhere.',
      field: 'declarationNotEmployed' as 'declarationNotEmployed',
    },
  ];

  const fields = [
    { label: 'Name of Applicant', placeholder: 'Full name', type: 'text', field: 'applicantName' as 'applicantName' },
    { label: 'Date', type: 'date', field: 'applicantDate' as 'applicantDate' },
  ];

  // ---------- VISIBILITY FIX (SCOPED) ----------
  const visibilityFixCSS = `
  .other-details-wrap .table td, 
  .other-details-wrap .table th,
  .other-details-wrap label,
  .other-details-wrap .form-check-label,
  .other-details-wrap p,
  .other-details-wrap h5,
  .other-details-wrap h6 {
    color: #111 !important;
    white-space: normal !important;
  }

  .other-details-wrap .table td, 
  .other-details-wrap .table th {
    overflow: visible !important;
    vertical-align: middle;
  }

  .other-details-wrap input[type="text"],
  .other-details-wrap input[type="number"],
  .other-details-wrap input[type="date"],
  .other-details-wrap .form-control,
  .other-details-wrap .form-select,
  .other-details-wrap textarea {
    color: #111 !important;
    background-color: #fff !important;
    -webkit-text-fill-color: #111 !important; /* for autofill on WebKit */
  }

  .other-details-wrap .form-control::placeholder,
  .other-details-wrap input::placeholder,
  .other-details-wrap textarea::placeholder {
    color: #6c757d !important;
    opacity: 1;
  }

  .other-details-wrap .form-control:disabled,
  .other-details-wrap .form-select:disabled,
  .other-details-wrap textarea:disabled {
    color: #495057 !important;
    background-color: #e9ecef !important;
    opacity: 1 !important;
  }

  .other-details-wrap input:-webkit-autofill,
  .other-details-wrap textarea:-webkit-autofill,
  .other-details-wrap select:-webkit-autofill {
    -webkit-text-fill-color: #111 !important;
    box-shadow: 0 0 0px 1000px #fff inset !important;
    transition: background-color 9999s ease-in-out 0s;
  }
  `;

  return (
    <div className="container mt-4 other-details-wrap">
      {/* Scoped style to ensure text stays visible regardless of theme */}
      <style>{visibilityFixCSS}</style>

      <h5 className="fw-bold mb-3">Additional Information</h5>

      {/* Pump Experience */}
      <div className="mb-4">
        <h6 className="fw-bold mb-3">PUMP EXPERIENCE</h6>
        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">FRAMO (in months)</label>
            <input
              type="number"
              className={`form-control ${errors.pumpExperienceFramoMonths ? 'is-invalid' : ''}`}
              value={additionalDetails.pumpExperienceFramoMonths ?? ''}
              onChange={(e) => handleChange('pumpExperienceFramoMonths', parseInt(e.target.value) || null)}
              placeholder="Enter months"
            />
            {errors.pumpExperienceFramoMonths && (
              <div className="invalid-feedback">{errors.pumpExperienceFramoMonths}</div>
            )}
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">COP (in months)</label>
            <input
              type="number"
              className={`form-control ${errors.pumpExperienceCopMonths ? 'is-invalid' : ''}`}
              value={additionalDetails.pumpExperienceCopMonths ?? ''}
              onChange={(e) => handleChange('pumpExperienceCopMonths', parseInt(e.target.value) || null)}
              placeholder="Enter months"
            />
            {errors.pumpExperienceCopMonths && (
              <div className="invalid-feedback">{errors.pumpExperienceCopMonths}</div>
            )}
          </div>
        </div>
      </div>

      {/* Vessel Experience */}
      <div className="mb-4">
        <h6 className="fw-bold mb-3">VESSEL EXPERIENCE</h6>
        <table className="table table-bordered">
          <thead>
            <tr>
              <th className="table-light">Have you been on board vessels during</th>
              <th className="table-light">Response</th>
              <th className="table-light">Details (if Yes)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Drydocking</td>
              <td>
                <div className="form-check form-check-inline">
                  <input
                    className="form-check-input"
                    type="radio"
                    id="drydocking-yes"
                    name="drydocking"
                    checked={additionalDetails.drydockingExperience === true}
                    onChange={() => handleChange('drydockingExperience', true)}
                  />
                  <label className="form-check-label" htmlFor="drydocking-yes">Yes</label>
                </div>
                <div className="form-check form-check-inline">
                  <input
                    className="form-check-input"
                    type="radio"
                    id="drydocking-no"
                    name="drydocking"
                    checked={additionalDetails.drydockingExperience === false}
                    onChange={() => {
                      handleChange('drydockingExperience', false);
                      handleChange('drydockingRank', null);
                    }}
                  />
                  <label className="form-check-label" htmlFor="drydocking-no">No</label>
                </div>
              </td>
              <td>
                <input
                  type="text"
                  className={`form-control ${errors.drydockingRank ? 'is-invalid' : ''}`}
                  value={additionalDetails.drydockingRank ?? ''}
                  onChange={(e) => handleChange('drydockingRank', e.target.value || null)}
                  placeholder="Please specify the rank"
                  disabled={!additionalDetails.drydockingExperience}
                />
                {errors.drydockingRank && (
                  <div className="invalid-feedback">{errors.drydockingRank}</div>
                )}
              </td>
            </tr>
            <tr>
              <td>New Construction</td>
              <td>
                <div className="form-check form-check-inline">
                  <input
                    className="form-check-input"
                    type="radio"
                    id="newConstruction-yes"
                    name="newConstruction"
                    checked={additionalDetails.newConstructionExperience === true}
                    onChange={() => handleChange('newConstructionExperience', true)}
                  />
                  <label className="form-check-label" htmlFor="newConstruction-yes">Yes</label>
                </div>
                <div className="form-check form-check-inline">
                  <input
                    className="form-check-input"
                    type="radio"
                    id="newConstruction-no"
                    name="newConstruction"
                    checked={additionalDetails.newConstructionExperience === false}
                    onChange={() => {
                      handleChange('newConstructionExperience', false);
                      handleChange('newConstructionRank', null);
                    }}
                  />
                  <label className="form-check-label" htmlFor="newConstruction-no">No</label>
                </div>
              </td>
              <td>
                <input
                  type="text"
                  className={`form-control ${errors.newConstructionRank ? 'is-invalid' : ''}`}
                  value={additionalDetails.newConstructionRank ?? ''}
                  onChange={(e) => handleChange('newConstructionRank', e.target.value || null)}
                  placeholder="Please specify the rank"
                  disabled={!additionalDetails.newConstructionExperience}
                />
                {errors.newConstructionRank && (
                  <div className="invalid-feedback">{errors.newConstructionRank}</div>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Other Questions */}
      <div className="mb-4">
        <h6 className="fw-bold mb-3">OTHER QUESTIONS</h6>
        {questions.map((question, idx) => (
          <div className="mb-4" key={idx}>
            <label className="form-label">{question.label}</label>
            <div className="d-flex align-items-center mb-2">
              <div className="form-check form-check-inline">
                <input
                  className="form-check-input"
                  type="radio"
                  id={`question_${idx}_yes`}
                  name={`question_${idx}`}
                  checked={additionalDetails[question.field] === true}
                  onChange={() => handleChange(question.field, true)}
                />
                <label className="form-check-label" htmlFor={`question_${idx}_yes`}>Yes</label>
              </div>
              <div className="form-check form-check-inline">
                <input
                  className="form-check-input"
                  type="radio"
                  id={`question_${idx}_no`}
                  name={`question_${idx}`}
                  checked={additionalDetails[question.field] === false}
                  onChange={() => {
                    handleChange(question.field, false);
                    handleChange(question.detailsField, null);
                  }}
                />
                <label className="form-check-label" htmlFor={`question_${idx}_no`}>No</label>
              </div>
            </div>
            <textarea
              className={`form-control ${errors[question.detailsField] ? 'is-invalid' : ''}`}
              value={additionalDetails[question.detailsField] ?? ''}
              onChange={(e) => handleChange(question.detailsField, e.target.value || null)}
              rows={3}
              placeholder="Please provide details"
              disabled={!additionalDetails[question.field]}
            />
            {errors[question.detailsField] && (
              <div className="invalid-feedback">{errors[question.detailsField]}</div>
            )}
          </div>
        ))}
      </div>

      {/* Company Awareness */}
      <div className="mb-4">
        <h6 className="fw-bold mb-3">COMPANY AWARENESS</h6>
        <div className="card">
          <div className="card-body">
            <p className="fw-bold mb-3">Where did you get to know Peninsular Maritime India Pvt Ltd?</p>
            <div className="row">
              {referralOptions.map((option, i) => (
                <div key={i} className="col-md-6 mb-3">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      id={`awareness_${i}`}
                      name="referralSource"
                      checked={additionalDetails.referralSource === option.value}
                      onChange={() => {
                        handleChange('referralSource', option.value);
                        handleChange('referralDetails', referralDetailsMap[option.value] || null);
                      }}
                    />
                    <label className="form-check-label" htmlFor={`awareness_${i}`}>
                      {`${String.fromCharCode(97 + i)}. ${option.label}`}
                    </label>
                  </div>
                  {additionalDetails.referralSource === option.value && (
                    <input
                      type="text"
                      className={`form-control mt-2 ${errors.referralDetails ? 'is-invalid' : ''}`}
                      value={referralDetailsMap[option.value] ?? ''}
                      onChange={(e) => handleReferralDetailsChange(option.value, e.target.value)}
                      placeholder="Details"
                    />
                  )}
                  {errors.referralDetails && additionalDetails.referralSource === option.value && (
                    <div className="invalid-feedback">{errors.referralDetails}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* References */}
      <div className="mb-4">
        <h6 className="fw-bold mb-3">Reference</h6>
        <div className="form-check mb-3">
          <input
            className="form-check-input"
            type="checkbox"
            id="hasReferenceData"
            checked={hasReferenceData}
            onChange={(e) => handleToggleReferences(e.target.checked)}
          />
          <label className="form-check-label" htmlFor="hasReferenceData">
            Provide References
          </label>
        </div>
        {hasReferenceData && (
          <table className="table table-bordered">
            <thead>
              <tr>
                <th className="table-light">Sr. No</th>
                <th className="table-light">Name of the company</th>
                <th className="table-light">PIC</th>
                <th className="table-light">Designation</th>
                <th className="table-light">Phone No</th>
                <th className="table-light">Actions</th>
              </tr>
            </thead>
            <tbody>
              {references.map((ref, idx) => (
                <tr key={idx}>
                  <td>{ref.srNo}</td>
                  <td>
                    <input
                      type="text"
                      className={`form-control ${errors[`reference_companyName_${idx}`] ? 'is-invalid' : ''}`}
                      value={ref.companyName}
                      onChange={(e) => handleReferenceChange(idx, 'companyName', e.target.value)}
                      placeholder="Company name"
                    />
                    {errors[`reference_companyName_${idx}`] && (
                      <div className="invalid-feedback">{errors[`reference_companyName_${idx}`]}</div>
                    )}
                  </td>
                  <td>
                    <input
                      type="text"
                      className={`form-control ${errors[`reference_pic_${idx}`] ? 'is-invalid' : ''}`}
                      value={ref.pic}
                      onChange={(e) => handleReferenceChange(idx, 'pic', e.target.value)}
                      placeholder="Person in charge"
                    />
                    {errors[`reference_pic_${idx}`] && (
                      <div className="invalid-feedback">{errors[`reference_pic_${idx}`]}</div>
                    )}
                  </td>
                  <td>
                    <input
                      type="text"
                      className={`form-control ${errors[`reference_designation_${idx}`] ? 'is-invalid' : ''}`}
                      value={ref.designation}
                      onChange={(e) => handleReferenceChange(idx, 'designation', e.target.value)}
                      placeholder="Designation"
                    />
                    {errors[`reference_designation_${idx}`] && (
                      <div className="invalid-feedback">{errors[`reference_designation_${idx}`]}</div>
                    )}
                  </td>
                  <td>
                    <input
                      type="text"
                      className={`form-control ${errors[`reference_phoneNo_${idx}`] ? 'is-invalid' : ''}`}
                      value={ref.phoneNo}
                      onChange={(e) => handleReferenceChange(idx, 'phoneNo', e.target.value)}
                      placeholder="Phone number"
                    />
                    {errors[`reference_phoneNo_${idx}`] && (
                      <div className="invalid-feedback">{errors[`reference_phoneNo_${idx}`]}</div>
                    )}
                  </td>
                  <td className="text-center">
                    <button
                      type="button"
                      onClick={addRow}
                      className="btn btn-sm btn-success me-2"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      className="btn btn-sm btn-danger"
                      disabled={references.length === 1}
                    >
                      −
                    </button>
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={6} className="text-center fw-bold table-light py-3">
                  For Office Use
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Declaration */}
      <div className="mb-4">
        <h6 className="fw-bold mb-3">DECLARATION BY THE APPLICANT</h6>
        <div className="card">
          <div className="card-body">
            {declarations.map((decl, idx) => (
              <div key={idx} className="form-check mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id={`declaration_${idx}`}
                  checked={additionalDetails[decl.field] ?? false}
                  onChange={(e) => handleChange(decl.field, e.target.checked)}
                />
                <label className="form-check-label" htmlFor={`declaration_${idx}`}>
                  {decl.label}
                </label>
                {errors[decl.field] && (
                  <div className="text-danger">{errors[decl.field]}</div>
                )}
              </div>
            ))}
            <div className="form-check mb-3 d-flex align-items-center">
              <input
                className="form-check-input me-2"
                type="checkbox"
                id="declaration_noAgents"
                checked={additionalDetails.declarationNoAgents ?? false}
                onChange={(e) => handleChange('declarationNoAgents', e.target.checked)}
              />
              <label className="form-check-label me-2" htmlFor="declaration_noAgents">
                I am aware that Admiral Marine Services Pvt Ltd., does not have any agents in India for employing Seafarers.
                If my application is successful, I will be available to report at your office on or after:
              </label>
              <input
                type="date"
                className={`form-control ${errors.availabilityDate ? 'is-invalid' : ''}`}
                value={additionalDetails.availabilityDate ?? ''}
                onChange={(e) => handleChange('availabilityDate', e.target.value || null)}
                style={{ width: 'auto' }}
              />
              {errors.availabilityDate && (
                <div className="invalid-feedback">{errors.availabilityDate}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Applicant Details */}
      <div className="mb-4">
        <h6 className="fw-bold mb-3">APPLICANT DETAILS</h6>
        <div className="row">
          {fields.map((field, idx) => (
            <div key={idx} className="col-md-4 mb-3">
              <label className="form-label fw-bold">{field.label}</label>
              <input
                type={field.type}
                className={`form-control ${errors[field.field] ? 'is-invalid' : ''}`}
                value={(additionalDetails[field.field] as string) ?? ''}
                onChange={(e) => handleChange(field.field, e.target.value || null)}
                placeholder={field.placeholder || ''}
              />
              {errors[field.field] && (
                <div className="invalid-feedback">{errors[field.field]}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OtherDetails;
