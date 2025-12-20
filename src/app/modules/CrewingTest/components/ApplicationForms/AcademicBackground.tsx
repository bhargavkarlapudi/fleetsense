import React from 'react';
import { AcademicQualificationRequest, AcademicQualificationResponse } from '../../core/_models'; 
import { KTSVG } from '../../../../../_metronic/helpers';

interface AcademicBackgroundProps {
  academicBackgrounds: AcademicQualificationRequest[];
  handleAcademicBackgroundChange: (index: number, field: keyof AcademicQualificationRequest, value: string) => void;
  handleAddAcademicBackground: () => void;
  handleRemoveAcademicBackground: (index: number) => void;
  existingAcademicDetails: AcademicQualificationResponse[];
  fieldErrors: Record<string, string>;
}

const AcademicBackground: React.FC<AcademicBackgroundProps> = ({
  academicBackgrounds,
  handleAcademicBackgroundChange,
  handleAddAcademicBackground,
  handleRemoveAcademicBackground,
  existingAcademicDetails,
  fieldErrors,
}) => {
  return (
    <>
      <div className="container mt-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-bold mb-0">Academic Background</h5>
        
        </div>
        <div className="table-responsive">
          <table className="table table-bordered">
            <thead className="table-light">
              <tr>
                <th>Qualification</th>
                <th>Name of Institution</th>
                <th>Board/University</th>
                <th>Date of Passing</th>
                <th>Grade/Percentage</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {academicBackgrounds.map((academic, index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="text"
                      className={`form-control ${fieldErrors[`academic_qualification_${index}`] ? 'is-invalid' : ''}`}
                      placeholder="Your Qualification"
                      value={academic.qualification || ''}
                      onChange={(e) => handleAcademicBackgroundChange(index, 'qualification', e.target.value)}
                    />
                    {fieldErrors[`academic_qualification_${index}`] && (
                      <div className="invalid-feedback">{fieldErrors[`academic_qualification_${index}`]}</div>
                    )}
                  </td>
                  <td>
                    <input
                      type="text"
                      className={`form-control ${fieldErrors[`academic_institution_${index}`] ? 'is-invalid' : ''}`}
                      placeholder="Name of Institution"
                      value={academic.institutionName || ''}
                      onChange={(e) => handleAcademicBackgroundChange(index, 'institutionName', e.target.value)}
                    />
                    {fieldErrors[`academic_institution_${index}`] && (
                      <div className="invalid-feedback">{fieldErrors[`academic_institution_${index}`]}</div>
                    )}
                  </td>
                  <td>
                    <input
                      type="text"
                      className={`form-control ${fieldErrors[`academic_boardOrUniversity_${index}`] ? 'is-invalid' : ''}`}
                      placeholder="Board/University"
                      value={academic.boardOrUniversity || ''}
                      onChange={(e) => handleAcademicBackgroundChange(index, 'boardOrUniversity', e.target.value)}
                    />
                    {fieldErrors[`academic_boardOrUniversity_${index}`] && (
                      <div className="invalid-feedback">{fieldErrors[`academic_boardOrUniversity_${index}`]}</div>
                    )}
                  </td>
                  <td>
                    <input
                      type="date"
                      className={`form-control ${fieldErrors[`academic_dateOfPassing_${index}`] ? 'is-invalid' : ''}`}
                      value={academic.dateOfPassing || ''}
                      onChange={(e) => handleAcademicBackgroundChange(index, 'dateOfPassing', e.target.value)}
                    />
                    {fieldErrors[`academic_dateOfPassing_${index}`] && (
                      <div className="invalid-feedback">{fieldErrors[`academic_dateOfPassing_${index}`]}</div>
                    )}
                  </td>
                  <td>
                    <input
                      type="text"
                      className={`form-control ${fieldErrors[`academic_gradeOrPercentage_${index}`] ? 'is-invalid' : ''}`}
                      placeholder="e.g. 75%"
                      value={academic.gradeOrPercentage || ''}
                      onChange={(e) => handleAcademicBackgroundChange(index, 'gradeOrPercentage', e.target.value)}
                    />
                    {fieldErrors[`academic_gradeOrPercentage_${index}`] && (
                      <div className="invalid-feedback">{fieldErrors[`academic_gradeOrPercentage_${index}`]}</div>
                    )}
                  </td>
                 <td>
  <div className="d-flex gap-2">
    {academicBackgrounds.length > 1 && (
      <button
        className="btn btn-sm btn-icon btn-danger"
        onClick={() => handleRemoveAcademicBackground(index)}
        title="Remove Row"
      >
        <KTSVG path="/media/icons/duotune/arrows/arr010.svg" className="svg-icon-2x" />
      </button>
    )}
    {index === academicBackgrounds.length - 1 && (
      <button
        className="btn btn-sm btn-icon btn-primary"
        onClick={handleAddAcademicBackground}
        title="Add Row"
      >
        <KTSVG path="/media/icons/duotune/arrows/arr009.svg" className="svg-icon-2x" />
      </button>
    )}
  </div>
</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default AcademicBackground;