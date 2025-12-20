import { FC, useState, useEffect } from 'react';
import { KTSVG } from '../../../../_metronic/helpers';

interface AllotmentEntry {
  id: number;
  name: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  payeeName: string;
  percentage: string;
}

interface CrewMember {
  id: number;
  name: string;
}

const bankOptions = [
  'State Bank of India',
  'HDFC Bank',
  'ICICI Bank',
  'Punjab National Bank',
  'Bank of Baroda',
  'Canara Bank',
  'Union Bank of India',
  'Bank of India',
  'Indian Bank',
  'Central Bank of India',
  'HSBC',
  'Citibank',
  'Standard Chartered',
  'Deutsche Bank',
  'Barclays',
  'JPMorgan Chase',
  'Bank of America',
  'Wells Fargo',
  'Other'
];

interface AddAllotmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (allotmentEntry: Omit<AllotmentEntry, 'id'>) => void;
  crewMembers?: CrewMember[];
}

const AddAllotmentModal: FC<AddAllotmentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  crewMembers = []
}) => {
  const [formData, setFormData] = useState({
    name: '',
    bankName: '',
    customBankName: '',
    accountNumber: '',
    ifsc: '',
    payeeName: '',
    percentage: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        bankName: '',
        customBankName: '',
        accountNumber: '',
        ifsc: '',
        payeeName: '',
        percentage: '',
      });
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
    
    const validBankName = formData.bankName === 'Other' ? formData.customBankName : formData.bankName;
    if (!formData.name || !validBankName || !formData.accountNumber || 
        !formData.ifsc || !formData.payeeName || !formData.percentage) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        name: formData.name,
        bankName: validBankName,
        accountNumber: formData.accountNumber,
        ifsc: formData.ifsc,
        payeeName: formData.payeeName,
        percentage: formData.percentage,
      });
      
      onClose();
    } catch (error) {
      console.error('Error submitting allotment entry:', error);
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
              Add New Allotment
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
                  <label className="form-label" style={{color: '#66686c',fontSize: '1.1rem',marginBottom: '0.1rem',paddingBottom: '0.3rem',}}>Name</label>
                  {crewMembers.length > 0 ? (
                    <select
                      name="name"
                      className="form-select"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select crew member</option>
                      {crewMembers.map((member) => (
                        <option key={member.id} value={member.name}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      name="name"
                      className="form-control"
                      placeholder="Enter crew member name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  )}
                </div>
                
                <div className="col-md-6 mb-4">
                  <label className="form-label" style={{color: '#66686c',fontSize: '1.1rem',marginBottom: '0.1rem',paddingBottom: '0.3rem',}}>Bank Name</label>
                  <select
                    name="bankName"
                    className="form-select"
                    value={formData.bankName}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select bank</option>
                    {bankOptions.map((bank, index) => (
                      <option key={index} value={bank}>
                        {bank}
                      </option>
                    ))}
                  </select>
                  
                  {formData.bankName === 'Other' && (
                    <input
                      type="text"
                      name="customBankName"
                      className="form-control mt-2"
                      placeholder="Enter bank name"
                      value={formData.customBankName}
                      onChange={handleInputChange}
                      required
                    />
                  )}
                </div>
              </div>
              
              <div className="row">
                <div className="col-md-6 mb-4">
                  <label className="form-label" style={{color: '#66686c',fontSize: '1.1rem',marginBottom: '0.1rem',paddingBottom: '0.3rem',}}>Account Number</label>
                  <input
                    type="text"
                    name="accountNumber"
                    className="form-control"
                    placeholder="Enter account number"
                    value={formData.accountNumber}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="col-md-6 mb-4">
                  <label className="form-label" style={{color: '#66686c',fontSize: '1.1rem',marginBottom: '0.1rem',paddingBottom: '0.3rem',}}>IFSC</label>
                  <input
                    type="text"
                    name="ifsc"
                    className="form-control"
                    placeholder="Enter IFSC code"
                    value={formData.ifsc}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              
              <div className="row">
                <div className="col-md-6 mb-4">
                  <label className="form-label" style={{color: '#66686c',fontSize: '1.1rem',marginBottom: '0.1rem',paddingBottom: '0.3rem',}}>Payee Name</label>
                  <input
                    type="text"
                    name="payeeName"
                    className="form-control"
                    placeholder="Enter payee name"
                    value={formData.payeeName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="col-md-6 mb-4">
                  <label className="form-label" style={{color: '#66686c',fontSize: '1.1rem',marginBottom: '0.1rem',paddingBottom: '0.3rem',}}>Percentage</label>
                  <input
                    type="text"
                    name="percentage"
                    className="form-control"
                    placeholder="Enter percentage (e.g., 60%)"
                    value={formData.percentage}
                    onChange={handleInputChange}
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
              disabled={isSubmitting || !formData.name || !(formData.bankName !== 'Other' ? formData.bankName : formData.customBankName) || !formData.accountNumber || 
                       !formData.ifsc || !formData.payeeName || !formData.percentage}
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

export default AddAllotmentModal;
