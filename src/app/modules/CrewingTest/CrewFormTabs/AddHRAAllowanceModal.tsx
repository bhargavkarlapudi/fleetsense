import { FC, useState, useEffect } from 'react';

interface HRAAllowanceEntry {
  id: number;
  crewName: string;
  entryDate: string;
  exitDate: string;
  allowance: number;
  daysInHRA: number;
  dailyBasicWage: number;
}

interface CrewMember {
  id: number;
  name: string;
  rank: string;
  dailyBasicWage: number;
}

interface AddHRAAllowanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (allowanceEntry: Omit<HRAAllowanceEntry, 'id'>) => void;
  crewMembers?: CrewMember[];
}

const AddHRAAllowanceModal: FC<AddHRAAllowanceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  crewMembers = []
}) => {
  const [formData, setFormData] = useState({
    crewName: '',
    entryDate: '',
    exitDate: '',
  });

  const [calculatedAllowance, setCalculatedAllowance] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        crewName: '',
        entryDate: '',
        exitDate: '',
      });
      setCalculatedAllowance(0);
    }
  }, [isOpen]);

  // Calculate allowance when crew member or dates change
  useEffect(() => {
    if (formData.crewName && formData.entryDate && formData.exitDate) {
      const entryDate = new Date(formData.entryDate);
      const exitDate = new Date(formData.exitDate);
      
      if (exitDate > entryDate) {
        const daysInHRA = Math.ceil((exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
        const selectedCrew = crewMembers.find(member => member.name === formData.crewName);
        const dailyBasicWage = selectedCrew?.dailyBasicWage || 40.00; // Default wage
        const allowance = dailyBasicWage * Math.max(5, daysInHRA);
        setCalculatedAllowance(allowance);
      } else {
        setCalculatedAllowance(0);
      }
    } else {
      setCalculatedAllowance(0);
    }
  }, [formData.crewName, formData.entryDate, formData.exitDate, crewMembers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.crewName || !formData.entryDate || !formData.exitDate || calculatedAllowance <= 0) {
      return;
    }

    // Validate date range
    const entryDate = new Date(formData.entryDate);
    const exitDate = new Date(formData.exitDate);
    const daysInHRA = Math.ceil((exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
    const dailyBasicWage = crewMembers.find(member => member.name === formData.crewName)?.dailyBasicWage || 40.00;
    const allowance = calculatedAllowance;
    
    if (exitDate <= entryDate) {
      alert('Exit date must be after entry date');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        crewName: formData.crewName,
        entryDate: formData.entryDate,
        exitDate: formData.exitDate,
        daysInHRA: daysInHRA,
        dailyBasicWage: dailyBasicWage,
        allowance: allowance,
      });
      
      onClose();
    } catch (error) {
      console.error('Error submitting HRA allowance entry:', error);
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
              Add New HRA Allowance
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
              <div className="row">
                <div className="col-md-6 mb-4">
                  <label className="form-label" style={{color: '#66686c',fontSize: '1.1rem',marginBottom: '0.1rem',paddingBottom: '0.3rem',}}>Crew Name</label>
                  {loading ? (
                    <div className="d-flex align-items-center">
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Loading crew members...
                    </div>
                  ) : crewMembers.length > 0 ? (
                    <select
                      name="crewName"
                      className="form-select"
                      value={formData.crewName}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select crew member</option>
                      {crewMembers.map((member) => (
                        <option key={member.id} value={member.name}>
                          {member.name} - {member.rank}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      name="crewName"
                      className="form-control"
                      placeholder="Enter crew member name"
                      value={formData.crewName}
                      onChange={handleInputChange}
                      required
                    />
                  )}
                </div>
                
                <div className="col-md-6 mb-4">
                  <label className="form-label" style={{color: '#66686c',fontSize: '1.1rem',marginBottom: '0.1rem',paddingBottom: '0.3rem',}}>Calculated Allowance</label>
                  <div className="input-group">
                    <span className="input-group-text">$</span>
                    <input
                      type="text"
                      className="form-control"
                      value={calculatedAllowance > 0 ? calculatedAllowance.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                      readOnly
                      style={{ backgroundColor: '#f8f9fa' }}
                    />
                  </div>
                  {formData.crewName && formData.entryDate && formData.exitDate && calculatedAllowance > 0 && (
                    <small className="text-muted mt-1">
                      Formula: ${crewMembers.find(m => m.name === formData.crewName)?.dailyBasicWage || 40}/day × {Math.max(5, Math.ceil((new Date(formData.exitDate).getTime() - new Date(formData.entryDate).getTime()) / (1000 * 60 * 60 * 24)))} days
                    </small>
                  )}
                </div>
              </div>
              
              <div className="row">
                <div className="col-md-6 mb-4">
                  <label className="form-label" style={{color: '#66686c',fontSize: '1.1rem',marginBottom: '0.1rem',paddingBottom: '0.3rem',}}>Entry Date</label>
                  <input
                    type="date"
                    name="entryDate"
                    className="form-control"
                    value={formData.entryDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="col-md-6 mb-4">
                  <label className="form-label" style={{color: '#66686c',fontSize: '1.1rem',marginBottom: '0.1rem',paddingBottom: '0.3rem',}}>Exit Date</label>
                  <input
                    type="date"
                    name="exitDate"
                    className="form-control"
                    value={formData.exitDate}
                    onChange={handleInputChange}
                    min={formData.entryDate}
                    required
                  />
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
              disabled={isSubmitting || !formData.crewName || !formData.entryDate || !formData.exitDate || calculatedAllowance <= 0}
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

export default AddHRAAllowanceModal;
