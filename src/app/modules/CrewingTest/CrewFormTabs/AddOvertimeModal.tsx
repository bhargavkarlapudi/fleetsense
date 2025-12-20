import { FC, useState, useEffect } from 'react';
import { KTSVG } from '../../../../_metronic/helpers';

interface OvertimeEntry {
  id: number;
  date: string;
  extraHours: number;
  remarks: string;
}

interface CrewMember {
  id: number;
  name: string;
  rank: string;
}

interface AddOvertimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (overtimeEntry: Omit<OvertimeEntry, 'id'>, memberId?: number) => void;
  memberName?: string;
  memberRank?: string;
  crewMembers?: CrewMember[];
}

const AddOvertimeModal: FC<AddOvertimeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  memberName,
  memberRank,
  crewMembers = []
}) => {
  const [formData, setFormData] = useState({
    selectedMemberId: 0,
    date: '',
    extraHours: '',
    remarks: '',
  });
  
  const [selectedMember, setSelectedMember] = useState<CrewMember | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        selectedMemberId: 0,
        date: '',
        extraHours: '',
        remarks: '',
      });
      setSelectedMember(null);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'selectedMemberId') {
      const memberId = parseInt(value);
      const member = crewMembers.find(m => m.id === memberId) || null;
      setSelectedMember(member);
      setFormData(prev => ({
        ...prev,
        [name]: memberId
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If crew members are provided, require selection
    if (crewMembers.length > 0 && !formData.selectedMemberId) {
      return;
    }
    
    if (!formData.date || !formData.extraHours || !formData.remarks) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        date: formData.date,
        extraHours: parseFloat(formData.extraHours),
        remarks: formData.remarks,
      }, formData.selectedMemberId || undefined);
      
      onClose();
    } catch (error) {
      console.error('Error submitting overtime entry:', error);
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
      <div className="modal-dialog modal-xl" style={{ maxWidth: '1000px' }}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              {crewMembers.length > 0 ? (
                selectedMember ? `Add Overtime for ${selectedMember.name} (${selectedMember.rank})` : 'Add Overtime'
              ) : (
                `Add Overtime for ${memberName} (${memberRank})`
              )}
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
                      value={formData.selectedMemberId}
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
                  <label className="form-label" style={{color: '#66686c',fontSize: '1.1rem',marginBottom: '0.1rem',paddingBottom: '0.3rem',}}>Date</label>
                  <input
                    type="date"
                    name="date"
                    className="form-control"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="col-md-6 mb-4">
                  <label className="form-label" style={{color: '#66686c',fontSize: '1.1rem',marginBottom: '0.1rem',paddingBottom: '0.3rem',}}>Extra Hours Worked</label>
                  <input
                    type="number"
                    name="extraHours"
                    className="form-control"
                    placeholder="Enter hours (e.g., 2.5)"
                    step="0.5"
                    min="0"
                    max="24"
                    value={formData.extraHours}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="form-label" style={{color: '#66686c',fontSize: '1.1rem',marginBottom: '0.1rem',paddingBottom: '0.3rem',}}>Remarks</label>
                <textarea
                  name="remarks"
                  className="form-control"
                  rows={4}
                  placeholder="Enter remarks about the overtime work..."
                  value={formData.remarks}
                  onChange={handleInputChange}
                  required
                ></textarea>
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
              disabled={isSubmitting || !formData.date || !formData.extraHours || !formData.remarks || (crewMembers.length > 0 && !formData.selectedMemberId)}
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

export default AddOvertimeModal;