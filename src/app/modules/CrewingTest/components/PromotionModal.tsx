import React, { FC, useState, useEffect } from 'react';
import { KTSVG } from '../../../../_metronic/helpers';
import { Crew } from '../core/_models';

// Define a type for the promotion form data
export interface PromotionFormData {
  promotedToRank: string;
  effectiveDate: string;
  recommendingOfficer: string;
  officerDesignation: string;
  reasonForPromotion: string;
  performanceReview: string; // A, B, C, D, E
  signatureFile: File | null;
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: PromotionFormData) => void;
  crewMember: Crew | null;
  currentRank: string;
};

const PromotionModal: FC<Props> = ({ isOpen, onClose, onSubmit, crewMember, currentRank }) => {
  // State to hold all form data
  const [formData, setFormData] = useState<Omit<PromotionFormData, 'signatureFile'>>({
    promotedToRank: '',
    effectiveDate: new Date().toISOString().split('T')[0], // Default to today
    recommendingOfficer: '',
    officerDesignation: '',
    reasonForPromotion: '',
    performanceReview: '',
  });

  const [signatureFile, setSignatureFile] = useState<File | null>(null);

  // Reset form when the modal is opened
  useEffect(() => {
    if (isOpen) {
      setFormData({
        promotedToRank: '',
        effectiveDate: new Date().toISOString().split('T')[0],
        recommendingOfficer: '',
        officerDesignation: '',
        reasonForPromotion: '',
        performanceReview: '',
      });
      setSignatureFile(null);
    }
  }, [isOpen]);

  if (!isOpen || !crewMember) {
    return null;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSignatureFile(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    const finalFormData: PromotionFormData = {
      ...formData,
      signatureFile: signatureFile,
    };
    onSubmit(finalFormData);
  };
  
  const labelStyle: React.CSSProperties = {
    color: '#66686c',
    fontSize: '1.1rem',
    marginBottom: '0.1rem',
    paddingBottom: '0.3rem',
  };

  return (
    <div
      className="modal fade show d-flex align-items-center justify-content-center"
      tabIndex={-1}
      style={{
        backgroundColor: 'rgba(0,0,0,0.5)',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1050
      }}
    >
      <div className="modal-dialog modal-xl" style={{ width: '500px', maxWidth: '1000px' }}>
        <div className="modal-content" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
          <div className="modal-header">
            <h5 className="modal-title">Promotion Form for {crewMember.name}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
            <div className='row g-3 mb-4'>
              {/* Form fields */}
              <div className='col-md-6'>
                <label className='form-label' style={labelStyle}>CANDIDATE NAME</label>
                <input type='text' className='form-control-plaintext' readOnly value={crewMember.name} />
              </div>
              <div className='col-md-6'>
                <label className='form-label' style={labelStyle}>CURRENT RANK</label>
                <input type='text' className='form-control-plaintext' readOnly value={currentRank} />
              </div>
              <div className='col-md-6'>
                <label className='form-label' style={labelStyle}>PROMOTED TO RANK</label>
                <input type='text' className='form-control' name='promotedToRank' value={formData.promotedToRank} onChange={handleInputChange} />
              </div>
              <div className='col-md-6'>
                <label className='form-label' style={labelStyle}>EFFECTIVE DATE</label>
                <input type='date' className='form-control' name='effectiveDate' value={formData.effectiveDate} onChange={handleInputChange} />
              </div>
              <div className='col-md-12'>
                <label className='form-label' style={labelStyle}>REASON FOR PROMOTION</label>
                <textarea className='form-control' name='reasonForPromotion' rows={3} value={formData.reasonForPromotion} onChange={handleInputChange}></textarea>
              </div>
               <div className='col-md-6'>
                <label className='form-label' style={labelStyle}>PERFORMANCE REVIEW</label>
                <select className='form-select' name='performanceReview' value={formData.performanceReview} onChange={handleInputChange}>
                    <option value=''>Select Grade...</option>
                    <option value='A'>A - Excellent</option>
                    <option value='B'>B - Good</option>
                    <option value='C'>C - Satisfactory</option>
                </select>
              </div>
              <div className='col-md-6'>
                <label className='form-label' style={labelStyle}>RECOMMENDING OFFICER</label>
                <input type='text' className='form-control' name='recommendingOfficer' value={formData.recommendingOfficer} onChange={handleInputChange} />
              </div>
              <div className='col-md-6'>
                <label className='form-label' style={labelStyle}>OFFICER'S DESIGNATION</label>
                <input type='text' className='form-control' name='officerDesignation' value={formData.officerDesignation} onChange={handleInputChange} />
              </div>
              <div className='col-md-6'>
                <label className='form-label' style={labelStyle}>OFFICER'S SIGNATURE</label>
                <input type='file' className='form-control' onChange={handleFileChange} accept="image/*" />
                {signatureFile && <div className='text-muted small mt-1'>File selected: {signatureFile.name}</div>}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-light" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSubmit}>
              Submit Promotion
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromotionModal;
