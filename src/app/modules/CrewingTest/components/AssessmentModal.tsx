import React, { FC, useState, useEffect } from 'react';
import { KTSVG } from '../../../../_metronic/helpers';
import { Crew } from '../core/_models';

// Define a type for the assessment form data
export interface AssessmentFormData {
  rankApplied: string;
  date: string;
  interviewerName: string;
  dateOfSignature: string;
  interviewerDesignation: string;
  vesselName: string;
  grades: {
    personality: string;
    attitude: string;
    technicalKnowledge: string;
    englishKnowledge: string;
    overallAssessment: string;
  };
  comments: string;
  signatureFile: File | null;
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onApprove: (formData: AssessmentFormData) => void;
  onReject: () => void;
  crewMember: Crew | null;
  rankName: string;
};

const AssessmentModal: FC<Props> = ({ isOpen, onClose, onApprove, onReject, crewMember, rankName }) => {
  // State to hold all form data
  const [formData, setFormData] = useState<Omit<AssessmentFormData, 'signatureFile'>>({
    rankApplied: '',
    date: new Date().toISOString().split('T')[0], // Default to today
    interviewerName: '',
    dateOfSignature: new Date().toISOString().split('T')[0],
    interviewerDesignation: '',
    vesselName: '',
    grades: {
      personality: '',
      attitude: '',
      technicalKnowledge: '',
      englishKnowledge: '',
      overallAssessment: '',
    },
    comments: '',
  });

  const [signatureFile, setSignatureFile] = useState<File | null>(null);

  // Reset form when the modal is opened for a new crew member
  useEffect(() => {
    if (isOpen) {
      setFormData({
        rankApplied: '',
        date: new Date().toISOString().split('T')[0],
        interviewerName: '',
        dateOfSignature: new Date().toISOString().split('T')[0],
        interviewerDesignation: '',
        vesselName: crewMember?.vessel?.fleet_name || 'N/A',
        grades: {
          personality: '',
          attitude: '',
          technicalKnowledge: '',
          englishKnowledge: '',
          overallAssessment: '',
        },
        comments: '',
      });
      setSignatureFile(null); // Also reset the file input
    }
  }, [isOpen, crewMember]);

  if (!isOpen || !crewMember) {
    return null;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGradeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const { name, value } = e.target;
  setFormData((prev) => ({
    ...prev,
    grades: {
      ...prev.grades,
      [name]: value,
    },
  }));
};


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSignatureFile(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    // Package all data together and pass it to the onApprove handler
    const finalFormData: AssessmentFormData = {
      ...formData,
      signatureFile: signatureFile,
    };
    onApprove(finalFormData);
  };

  const assessmentFields = [
    { key: 'personality', label: 'PERSONALITY' },
    { key: 'attitude', label: 'ATTITUDE' },
    { key: 'technicalKnowledge', label: 'TECHNICAL KNOWLEDGE' },
    { key: 'englishKnowledge', label: 'ENGLISH KNOWLEDGE' },
    { key: 'overallAssessment', label: 'OVERALL ASSESSMENT' },
  ];

  const labelStyle: React.CSSProperties = {
    color: '#66686c',
    fontSize: '1.1rem',
    marginBottom: '0.1rem',
    paddingBottom: '0.3rem',
  };

  return (
    <div
      className="modal fade show"
      tabIndex={-1}
      style={{
        backgroundColor: 'rgba(0,0,0,0.5)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div 
        className="modal-dialog modal-xl" 
        style={{ 
          width: '90%',
          maxWidth: '1000px',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div className="modal-content" style={{ minWidth:'900px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
          <div className="modal-header">
            <h5 className="modal-title">
              {/* Assessment form  */} 
              Take Action
              for {crewMember.name}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          {/* Modal body with scrollable content */}
          
          {/* Just Uncomment the below for ASSESSMENT */}

          {/* <div className="modal-body" style={{ maxHeight: 'calc(90vh - 130px)', overflowY: 'auto', flex: 1 }}>
            <div className='row g-3 mb-4'>
              <div className='col-md-6'>
                <label className='form-label' style={labelStyle}>NAME OF THE CANDIDATE</label>
                <input type='text' className='form-control-plaintext' readOnly value={crewMember.name} />
              </div>
              <div className='col-md-6'>
                <label className='form-label' style={labelStyle}>PRESENT RANK</label>
                <input type='text' className='form-control-plaintext' readOnly value={rankName} />
              </div>
              <div className='col-md-6'>
                <label className='form-label' style={labelStyle}>RANK APPLIED</label>
                <input type='text' className='form-control' name='rankApplied' value={formData.rankApplied} onChange={handleInputChange} />
              </div>
              <div className='col-md-6'>
                <label className='form-label' style={labelStyle}>DATE</label>
                <input type='date' className='form-control' name='date' value={formData.date} onChange={handleInputChange} />
              </div>
              <div className='col-md-6'>
                <label className='form-label' style={labelStyle}>NAME OF INTERVIEWER</label>
                <input type='text' className='form-control' name='interviewerName' value={formData.interviewerName} onChange={handleInputChange} />
              </div>
              <div className='col-md-6'>
                <label className='form-label' style={labelStyle}>DESIGNATION</label>
                <input type='text' className='form-control' name='interviewerDesignation' value={formData.interviewerDesignation} onChange={handleInputChange} />
              </div>
              
            </div>

            <table className='table table-bordered mb-4'>
              <thead>
                <tr className='bg-light'>
                  <th style={{ width: '50px' }}>S.N</th>
                  <th>ASSESSMENT</th>
                  <th style={{ width: '250px' }}>GRADE</th>
                </tr>
              </thead>
              <tbody>
                {assessmentFields.map((field, index) => (
                  <tr key={field.key}>
                    <td>{index + 1}</td>
                    <td>{field.label}</td>
                    <td>
                    <div className="d-flex gap-4">
                        {['A', 'B', 'C', 'D', 'E'].map((grade) => {
                        const gradeLabels: Record<string, string> = {
                            A: 'A', 
                            B: 'B',
                            C: 'C',
                            D: 'D',
                            E: 'E',
                        };
                        return (
                            <div key={grade} className="form-check">
                            <input
                                className="form-check-input"
                                type="radio"
                                name={field.key}
                                id={`${field.key}-${grade}`}
                                value={grade}
                                checked={formData.grades[field.key as keyof typeof formData.grades] === grade}
                                onChange={handleGradeChange}
                            />
                            <label className="form-check-label" htmlFor={`${field.key}-${grade}`}>
                                {gradeLabels[grade]}
                            </label>
                            </div>
                        );
                        })}
                    </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
            <div className='text-muted small mb-4'>(Note: For Grades: A- Excellent, B- Good, C – Satisfactory, D – Average & E – Poor)</div>

            <div className='mb-4'>
              <label className='form-label' style={labelStyle}>COMMENTS FROM INTERVIEWER</label>
              <textarea
                className='form-control'
                name='comments'
                rows={4}
                placeholder='Following were asked to him...'
                value={formData.comments}
                onChange={handleInputChange}
              ></textarea>
            </div>
            <div className='col-md-6'>
                <label className='form-label' style={labelStyle}>NAME OF THE INTERVIEWER (SIGNATURE)</label>
                <input type='text' className='form-control' name='interviewername' value={formData.rankApplied} onChange={handleInputChange} />
              </div>
             <div className='col-md-6'>
                <label className='form-label' style={labelStyle}>DATE OF SIGNATURE</label>
                <input type='date' className='form-control' name='date' value={formData.dateOfSignature} onChange={handleInputChange} />
              </div>
          </div> */}

          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn border border-primary text-primary bg-white" onClick={onReject}>
            <KTSVG
                path="/media/icons/duotune/general/gen042.svg"
                className="svg-icon-2 me-1"
            />
              Reject
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSubmit}>
            <KTSVG
                path="/media/icons/duotune/general/gen043.svg"
                className="svg-icon-2 me-1"
            />
              Approve 
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentModal;