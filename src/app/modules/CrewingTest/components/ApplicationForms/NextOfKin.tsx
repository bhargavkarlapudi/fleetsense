import React from 'react';
import { NextOfKinRequest } from '../../core/_models';

interface NextOfKinProps {
  nextOfKin: NextOfKinRequest;
  onChange: (field: keyof NextOfKinRequest, value: any) => void;
  onSubmit: () => void;
  errors: Record<string, string>;
}

const NextOfKin: React.FC<NextOfKinProps> = ({ nextOfKin, onChange, onSubmit, errors }) => {
  return (
    <div className='card'>
      <div className='card-header'>
        <h3 className='card-title'>Next of Kin Details</h3>
      </div>
      <div className='card-body'>
        <div className='row mb-6'>
          <label className='col-lg-4 col-form-label fw-bold fs-6'>Civil Status <span className='text-danger'>*</span></label>
          <div className='col-lg-8'>
            <select
              className={`form-select ${errors.civilStatus ? 'is-invalid' : ''}`}
              value={nextOfKin.civilStatus || ''}
              onChange={(e) => onChange('civilStatus', e.target.value || null)}
            >
              <option value=''>Select Civil Status</option>
              <option value='SINGLE'>Single</option>
              <option value='MARRIED'>Married</option>
              <option value='SEPARATED'>Separated</option>
              <option value='DIVORCED'>Divorced</option>
              <option value='WIDOWED'>Widowed</option>
            </select>
            {errors.civilStatus && <div className='invalid-feedback'>{errors.civilStatus}</div>}
          </div>
        </div>

        <div className='row mb-6'>
          <label className='col-lg-4 col-form-label fw-bold fs-6'>Full Name of Next of Kin <span className='text-danger'>*</span></label>
          <div className='col-lg-8'>
            <input
              type='text'
              className={`form-control ${errors.fullName ? 'is-invalid' : ''}`}
              value={nextOfKin.fullName || ''}
              onChange={(e) => onChange('fullName', e.target.value)}
              placeholder='Enter Full Name'
            />
            {errors.fullName && <div className='invalid-feedback'>{errors.fullName}</div>}
          </div>
        </div>

        <div className='row mb-6'>
          <label className='col-lg-4 col-form-label fw-bold fs-6'>Relationship <span className='text-danger'>*</span></label>
          <div className='col-lg-8'>
            <input
              type='text'
              className={`form-control ${errors.relationship ? 'is-invalid' : ''}`}
              value={nextOfKin.relationship || ''}
              onChange={(e) => onChange('relationship', e.target.value)}
              placeholder='Enter Relationship'
            />
            {errors.relationship && <div className='invalid-feedback'>{errors.relationship}</div>}
          </div>
        </div>

        <div className='row mb-6'>
          <label className='col-lg-4 col-form-label fw-bold fs-6'>Address of Next of Kin</label>
          <div className='col-lg-8'>
            <textarea
              className={`form-control ${errors.address ? 'is-invalid' : ''}`}
              value={nextOfKin.address || ''}
              onChange={(e) => onChange('address', e.target.value)}
              placeholder='Enter Address'
            />
            {errors.address && <div className='invalid-feedback'>{errors.address}</div>}
          </div>
        </div>

        <div className='row mb-6'>
          <label className='col-lg-4 col-form-label fw-bold fs-6'>Pin Code</label>
          <div className='col-lg-8'>
            <input
              type='text'
              className={`form-control ${errors.pinCode ? 'is-invalid' : ''}`}
              value={nextOfKin.pinCode || ''}
              onChange={(e) => onChange('pinCode', e.target.value)}
              placeholder='Enter Pin Code'
            />
            {errors.pinCode && <div className='invalid-feedback'>{errors.pinCode}</div>}
          </div>
        </div>

        <div className='row mb-6'>
          <label className='col-lg-4 col-form-label fw-bold fs-6'>Phone STD Code</label>
          <div className='col-lg-8'>
            <input
              type='text'
              className={`form-control ${errors.phoneStdCode ? 'is-invalid' : ''}`}
              value={nextOfKin.phoneStdCode || ''}
              onChange={(e) => onChange('phoneStdCode', e.target.value)}
              placeholder='Enter STD Code'
            />
            {errors.phoneStdCode && <div className='invalid-feedback'>{errors.phoneStdCode}</div>}
          </div>
        </div>

        <div className='row mb-6'>
          <label className='col-lg-4 col-form-label fw-bold fs-6'>Phone Number</label>
          <div className='col-lg-8'>
            <input
              type='text'
              className={`form-control ${errors.phoneNumber ? 'is-invalid' : ''}`}
              value={nextOfKin.phoneNumber || ''}
              onChange={(e) => onChange('phoneNumber', e.target.value)}
              placeholder='Enter Phone Number'
            />
            {errors.phoneNumber && <div className='invalid-feedback'>{errors.phoneNumber}</div>}
          </div>
        </div>
      </div>
      {/* <div className='card-footer d-flex justify-content-end'>
        <button type='button' className='btn btn-primary' onClick={onSubmit}>
          Save Next of Kin
        </button>
      </div> */}
    </div>
  );
};

export default NextOfKin;
