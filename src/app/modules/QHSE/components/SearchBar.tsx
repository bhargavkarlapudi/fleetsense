import React, { FC } from 'react';
import { KTSVG } from '../../../../_metronic/helpers';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const SearchBar: FC<SearchBarProps> = ({ searchQuery, onSearchChange }) => {
  return (
    <div className='position-relative flex-grow-1' style={{ maxWidth: '400px' }}>
      <KTSVG
        path='/media/icons/duotune/general/gen021.svg'
        className='svg-icon-2 svg-icon-lg-1 svg-icon-gray-500 position-absolute top-50 ms-5 translate-middle-y'
      />
      <input
        type='text'
        className='form-control form-control-solid ps-13'
        placeholder='Search documents...'
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      {searchQuery && (
        <button
          className='btn btn-flush btn-active-color-primary position-absolute top-50 end-0 translate-middle-y me-4'
          onClick={() => onSearchChange('')}
          type="button"
        >
          <KTSVG path='/media/icons/duotune/arrows/arr061.svg' className='svg-icon-2' />
        </button>
      )}
    </div>
  );
};

export  {SearchBar};