import { FC, useState, useEffect } from 'react';

interface PortageEntry {
  id: number;
  totalPayable: number;
  allotment: number;
  amountToReceive: number;
  balanceRemaining: number;
  deductions: DeductionsBreakdown;
}

interface DeductionsBreakdown {
  cashAdvance: number;
  internetCard: number;
  others: number;
}

interface AddPortageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (portageEntry: Omit<PortageEntry, 'id'>) => void;
}

const AddPortageModal: FC<AddPortageModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState({
    totalPayable: '',
    allotment: '',
    amountToReceive: '',
    balanceRemaining: '',
    deductions: {
      cashAdvance: '',
      internetCard: '',
      others: '',
    }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        totalPayable: '',
        allotment: '',
        amountToReceive: '',
        balanceRemaining: '',
        deductions: {
          cashAdvance: '',
          internetCard: '',
          others: '',
        }
      });
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('deductions.')) {
      const deductionField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        deductions: {
          ...prev.deductions,
          [deductionField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Auto-calculate fields based on inputs
  useEffect(() => {
    const totalPayable = parseFloat(formData.totalPayable) || 0;
    const allotment = parseFloat(formData.allotment) || 0;
    const cashAdvance = parseFloat(formData.deductions.cashAdvance) || 0;
    const internetCard = parseFloat(formData.deductions.internetCard) || 0;
    const others = parseFloat(formData.deductions.others) || 0;
    
    const totalDeductions = cashAdvance + internetCard + others;
    const amountToReceive = totalPayable - allotment - totalDeductions;
    const balanceRemaining = totalPayable - allotment - amountToReceive - totalDeductions;

    setFormData(prev => ({
      ...prev,
      amountToReceive: amountToReceive.toString(),
      balanceRemaining: balanceRemaining.toString()
    }));
  }, [formData.totalPayable, formData.allotment, formData.deductions.cashAdvance, formData.deductions.internetCard, formData.deductions.others]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.totalPayable || !formData.allotment) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        totalPayable: parseFloat(formData.totalPayable),
        allotment: parseFloat(formData.allotment),
        amountToReceive: parseFloat(formData.amountToReceive) || 0,
        balanceRemaining: parseFloat(formData.balanceRemaining) || 0,
        deductions: {
          cashAdvance: parseFloat(formData.deductions.cashAdvance) || 0,
          internetCard: parseFloat(formData.deductions.internetCard) || 0,
          others: parseFloat(formData.deductions.others) || 0,
        }
      });
      
      onClose();
    } catch (error) {
      console.error('Error submitting portage entry:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const totalDeductions = (parseFloat(formData.deductions.cashAdvance) || 0) + 
                         (parseFloat(formData.deductions.internetCard) || 0) + 
                         (parseFloat(formData.deductions.others) || 0);

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
      <div className="modal-dialog modal-xl" style={{ maxWidth: '900px' }}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              Add New Portage Entry
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
                  <label className="form-label" style={{color: '#66686c',fontSize: '1.1rem',marginBottom: '0.1rem',paddingBottom: '0.3rem',}}>Total Payable</label>
                  <input
                    type="number"
                    name="totalPayable"
                    className="form-control"
                    placeholder="Enter total payable amount"
                    step="0.01"
                    min="0"
                    value={formData.totalPayable}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="col-md-6 mb-4">
                  <label className="form-label" style={{color: '#66686c',fontSize: '1.1rem',marginBottom: '0.1rem',paddingBottom: '0.3rem',}}>Allotment</label>
                  <input
                    type="number"
                    name="allotment"
                    className="form-control"
                    placeholder="Enter allotment amount"
                    step="0.01"
                    min="0"
                    value={formData.allotment}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              {/* Deductions Section */}
              <div className="card mb-4" style={{ border: '1px solid #e1e5e9' }}>
                <div className="card-header bg-light" style={{width:'250px',height:'50px'}}>
                  <h6 className="mb-0 fw-bold" style={{paddingTop:'25px'}}>Deductions Breakdown</h6>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="form-label" style={{color: '#66686c',fontSize: '1rem',marginBottom: '0.1rem',paddingBottom: '0.3rem',}}>Cash Advance</label>
                      <input
                        type="number"
                        name="deductions.cashAdvance"
                        className="form-control"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        value={formData.deductions.cashAdvance}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    <div className="col-md-4 mb-3">
                      <label className="form-label" style={{color: '#66686c',fontSize: '1rem',marginBottom: '0.1rem',paddingBottom: '0.3rem',}}>Internet Card</label>
                      <input
                        type="number"
                        name="deductions.internetCard"
                        className="form-control"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        value={formData.deductions.internetCard}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    <div className="col-md-4 mb-3">
                      <label className="form-label" style={{color: '#66686c',fontSize: '1rem',marginBottom: '0.1rem',paddingBottom: '0.3rem',}}>Others</label>
                      <input
                        type="number"
                        name="deductions.others"
                        className="form-control"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        value={formData.deductions.others}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  
                  <div className="row mt-2">
                    <div className="col-12">
                      <div className="alert alert-info d-flex justify-content-between align-items-center">
                        <span><strong>Total Deductions:</strong></span>
                        <span className="fw-bold">${totalDeductions.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Calculated Fields */}
              <div className="row">
                <div className="col-md-6 mb-4">
                  <label className="form-label" style={{color: '#66686c',fontSize: '1.1rem',marginBottom: '0.1rem',paddingBottom: '0.3rem',}}>Amount to Receive</label>
                  <input
                    type="number"
                    name="amountToReceive"
                    className="form-control bg-light"
                    placeholder="Auto-calculated"
                    step="0.01"
                    value={formData.amountToReceive}
                    readOnly
                  />
                  <small className="text-muted">Auto-calculated: Total Payable - Allotment - Total Deductions</small>
                </div>
                
                <div className="col-md-6 mb-4">
                  <label className="form-label" style={{color: '#66686c',fontSize: '1.1rem',marginBottom: '0.1rem',paddingBottom: '0.3rem',}}>Balance Remaining</label>
                  <input
                    type="number"
                    name="balanceRemaining"
                    className="form-control bg-light"
                    placeholder="Auto-calculated"
                    step="0.01"
                    value={formData.balanceRemaining}
                    readOnly
                  />
                  <small className="text-muted">Auto-calculated based on all entries</small>
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
              disabled={isSubmitting || !formData.totalPayable || !formData.allotment}
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

export default AddPortageModal;
