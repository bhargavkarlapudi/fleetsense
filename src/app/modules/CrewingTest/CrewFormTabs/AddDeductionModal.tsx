import { FC, useState, useEffect } from 'react';
import { KTSVG } from '../../../../_metronic/helpers';

interface DeductionEntry {
  id: number;
  name: string;
  type: string;
  amount: number;
  remarks: string;
}

interface CrewMember {
  id: number;
  name: string;
  rank: string;
}

interface AddDeductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (deductionEntry: Omit<DeductionEntry, 'id'>, memberId?: number) => void;
  memberName?: string;
  memberRank?: string;
  crewMembers?: CrewMember[];
}

const AddDeductionModal: FC<AddDeductionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  memberName,
  memberRank,
  crewMembers = []
}) => {
  const [formData, setFormData] = useState({
    selectedMemberId:0,
    name: '',
    type: '',
    amount: '',
    remarks: '',
  });

  const [selectedMember, setSelectedMember] = useState<CrewMember | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deduction type options
  const deductionTypes = [
    { value: '', label: 'Select Type' },
    { value: 'Cash Advance', label: 'Cash Advance' },
    { value: 'Internet Card', label: 'Internet Card' },
    { value: 'Others', label: 'Others' },
  ];

  useEffect(() => {
    if (isOpen) {
      setFormData({
        selectedMemberId: 0,
        name: '',
        type: '',
        amount: '',
        remarks: '',
      });
      setSelectedMember(null);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.type || !formData.amount || !formData.remarks) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        name: formData.name,
        type: formData.type,
        amount: parseFloat(formData.amount),
        remarks: formData.remarks,
      });
      
      onClose();
    } catch (error) {
      console.error('Error submitting deduction entry:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

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
      <div className="modal-dialog modal-xl" style={{ maxWidth: '800px' }}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              Add New Deduction
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>

          <div className="modal-body">
            <form onSubmit={handleSubmit}>
              {crewMembers.length > 0 && (
                <div className="row mb-4">
                  <div className="col-md-12">
                    <label className="form-label" style={{color: '#66686c',fontSize: '1.1rem',marginBottom: '0.1rem',paddingBottom: '0.3rem',}}>Select Crew Member</label>
                    <select
                      name="selectedMemberId"
                      className="form-select"
                      value={formData.selectedMemberId || ""}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select crew member</option>
                      {crewMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name} - {member.rank}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              <div className="row">
                
                <div className="col-md-6 mb-4">
                  <label className="form-label" style={{color: '#66686c',fontSize: '1.1rem',marginBottom: '0.1rem',paddingBottom: '0.3rem',}}>Type</label>
                  <select
                    name="type"
                    className="form-select"
                    value={formData.type}
                    onChange={handleInputChange}
                    required
                  >
                    {deductionTypes.map((option) => (
                      <option key={option.value} value={option.value} disabled={option.value === ''}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              
                <div className="col-md-6 mb-4">
                  <label className="form-label" style={{color: '#66686c',fontSize: '1.1rem',marginBottom: '0.1rem',paddingBottom: '0.3rem',}}>Amount</label>
                  <input
                    type="number"
                    name="amount"
                    className="form-control"
                    placeholder="Enter amount"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                </div>
              
              <div className="row">
                <div className="col-md-12 mb-4">
                  <label className="form-label" style={{color: '#66686c',fontSize: '1.1rem',marginBottom: '0.1rem',paddingBottom: '0.3rem',}}>Remarks</label>
                  <textarea
                    name="remarks"
                    className="form-control"
                    rows={3}
                    placeholder="Enter remarks about the deduction..."
                    value={formData.remarks}
                    onChange={handleInputChange}
                    required
                  ></textarea>
                </div>
              </div>
            </form>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.name || !formData.type || !formData.amount || !formData.remarks}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Submitting...
                </>
              ) : (
                'Submit'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddDeductionModal;
