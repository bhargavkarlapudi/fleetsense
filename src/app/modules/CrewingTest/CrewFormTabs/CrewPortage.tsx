import { FC, useState, useMemo } from 'react';
import { KTSVG } from '../../../../_metronic/helpers';

interface PortageEntry {
  id: number;
  sNo: number;
  name: string;
  rank: string;
  basicWages: number;
  leaveWages: number;
  fixedOvertime: number;
  otherAllowance: number;
  totalMonthlySalary: number;
  periodFrom: string;
  periodTo: string;
  daysOnboard: number;
  salaryForPeriod: number;
  deductionCashAdvance: number;
  deductionInternetCard: number;
  deductionOthers: number;
  totalDeductions: number;
  scavengeSpaceCleaning: number;
  travelAllowance: number;
  reimbursement: number;
  dueFromPreviousMonth: number;
  totalNetPayableAllotment: number;
  amountToReceiveOnBank: number;
  balanceRemaining: number;
  signature: boolean;
  passportNumber: string;
  ctcNumber: string;
  nationality: string;
}

const CrewPortage: FC = () => {
  const [selectedMonth, setSelectedMonth] = useState('2025-05');
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [sortConfig, setSortConfig] = useState<{
    key: keyof PortageEntry | null;
    direction: 'asc' | 'desc';
  }>({
    key: 'sNo',
    direction: 'asc',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [portageEntries, setPortageEntries] = useState<PortageEntry[]>([
    {
      id: 1,
      sNo: 1,
      name: 'John Smith',
      rank: 'Captain',
      basicWages: 8000,
      leaveWages: 1200,
      fixedOvertime: 1500,
      otherAllowance: 500,
      totalMonthlySalary: 11200,
      periodFrom: '2025-08-01',
      periodTo: '2025-08-31',
      daysOnboard: 31,
      salaryForPeriod: 11200,
      deductionCashAdvance: 500,
      deductionInternetCard: 200,
      deductionOthers: 100,
      totalDeductions: 800,
      scavengeSpaceCleaning: 200,
      travelAllowance: 300,
      reimbursement: 150,
      dueFromPreviousMonth: 0,
      totalNetPayableAllotment: 11050,
      amountToReceiveOnBank: 9000,
      balanceRemaining: 2050,
      signature: false,
      passportNumber: 'A1234567',
      ctcNumber: 'CTC001',
      nationality: 'American',
    },
    {
      id: 2,
      sNo: 2,
      name: 'Maria Garcia',
      rank: 'Chief Engineer',
      basicWages: 7000,
      leaveWages: 1000,
      fixedOvertime: 1200,
      otherAllowance: 400,
      totalMonthlySalary: 9600,
      periodFrom: '2025-08-01',
      periodTo: '2025-08-31',
      daysOnboard: 31,
      salaryForPeriod: 9600,
      deductionCashAdvance: 400,
      deductionInternetCard: 150,
      deductionOthers: 50,
      totalDeductions: 600,
      scavengeSpaceCleaning: 150,
      travelAllowance: 0,
      reimbursement: 100,
      dueFromPreviousMonth: 200,
      totalNetPayableAllotment: 9450,
      amountToReceiveOnBank: 8000,
      balanceRemaining: 1450,
      signature: true,
      passportNumber: 'B9876543',
      ctcNumber: 'CTC002',
      nationality: 'Spanish',
    },
  ]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [vesselName] = useState('TRANQUIL SEA');
  const [remarks, setRemarks] = useState('');
  const [masterSigned, setMasterSigned] = useState(false);

  const getPeriodFromMonth = (monthYear: string) => {
    const [year, month] = monthYear.split('-');
    const firstDay = `01-${month.padStart(2, '0')}-${year}`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const lastDayFormatted = `${lastDay.toString().padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
    return `${firstDay} to ${lastDayFormatted}`;
  };

  const handleAddModalOpen = () => {
    setIsAddModalOpen(true);
  };

  const handleAddModalClose = () => {
    setIsAddModalOpen(false);
  };

  const handleAddPortageSubmit = (entry: Omit<PortageEntry, 'id' | 'sNo'>) => {
    const newEntry: PortageEntry = {
      id: Date.now(),
      sNo: portageEntries.length + 1,
      ...entry,
    };
    setPortageEntries((prevEntries) => [...prevEntries, newEntry]);
    handleAddModalClose();
  };

  const handleSort = (key: keyof PortageEntry) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleDelete = (id: number) => {
    setPortageEntries(portageEntries.filter((entry) => entry.id !== id));
  };

  const handleInputChange = (id: number, field: keyof PortageEntry, value: any) => {
    setPortageEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry))
    );
  };

  const handleSignature = (id: number) => {
    setPortageEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, signature: !entry.signature } : entry))
    );
  };

  const handleSignaturePadOpen = () => {
    console.log('Opening signature pad...');
  };

  const handleUploadClick = () => {
    console.log('Handling file upload...');
  };

  const sortedEntries = useMemo(() => {
    let sortableItems = [...portageEntries];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const key = sortConfig.key!;
        const aVal = a[key];
        const bVal = b[key];
        if (aVal === undefined || bVal === undefined) {
          return 0;
        }
        if (aVal < bVal) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [portageEntries, sortConfig]);

  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentEntries = sortedEntries.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(sortedEntries.length / rowsPerPage);

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(parseInt(e.target.value));
    setCurrentPage(1);
  };

  const totalMonthlySalary = sortedEntries.reduce(
    (sum, entry) => sum + entry.totalMonthlySalary,
    0
  );
  const totalSalaryForPeriod = sortedEntries.reduce(
    (sum, entry) => sum + entry.salaryForPeriod,
    0
  );

  const currencies = ['USD', 'INR', 'EUR', 'GBP'];
  const months = [
    { value: '2025-05', label: 'May 2025' },
    { value: '2025-08', label: 'August 2025' },
    { value: '2025-07', label: 'July 2025' },
    { value: '2025-06', label: 'June 2025' },
  ];

  return (
    <div className='d-flex flex-column flex-column-fluid'>
      <div className='card flex-column-fluid d-flex flex-column bg-white' style={{ flex: 1 }}>
        <div className='px-5 py-3' style={{ backgroundColor: '#ffffff' }}>
          <div className='d-flex flex-column'>
            <h1 className='text-black fs-3 mb-2'>Portage Bill</h1>
            <div className='d-flex justify-content-between align-items-center mb-4'>
              <div className='d-flex align-items-center' style={{ gap: '1rem' }}>
                <div className='d-flex flex-column'>
                  <label className='form-label'>Month-Year</label>
                  <select
                    className='form-select'
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  >
                    {months.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className='d-flex flex-column'>
                  <label className='form-label'>Currency</label>
                  <select
                    className='form-select'
                    value={selectedCurrency}
                    onChange={(e) => setSelectedCurrency(e.target.value)}
                  >
                    {currencies.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                </div>
                <div className='d-flex flex-column'>
                  <label className='form-label visibility-hidden'>Buttons</label>
                  <div className='d-flex' style={{ gap: '0.5rem' }}>
                    <button className='btn btn_primary'>Show</button>
                    <button className='btn btn_primary'>Edit</button>
                    <button className='btn btn_primary'>Submit</button>
                  </div>
                </div>
              </div>
              <div className='d-flex align-items-center gap-4'>
                <div className="position-relative d-inline-block export-dropdown">
                  <button className="btn p-0 m-0">
                    <KTSVG path='/media/icons/duotune/general/download.svg' className='svg-icon-2x' />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className='border-top pt-5 px-5'>
          <h2 className='text-center mb-8' style={{ textDecoration: 'underline' }}>
            MONTHLY PORTAGE BILL
          </h2>
          <div className='d-flex justify-content-between align-items-center mb-5'> 
            <div className='d-flex align-items-center' style={{ gap: '1rem' }}>
              <div className='input-group' style={{ width: 'auto' }}>
                <span className='input-group-text fw-bold' style={{ backgroundColor: '#f4f3f1ff' }}>
                  PORTAGE BILL
                </span>
                <span className='form-control bg-white' style={{ minWidth: '150px' }}>
                  &nbsp;
                </span>
              </div>
              <div className='input-group' style={{ width: 'auto' }}>
                <span className='input-group-text fw-bold' style={{ backgroundColor: '#FFE4C4' }}>
                  Vessel
                </span>
                <span className='form-control bg-white' style={{ minWidth: '150px' }}>
                  {vesselName}
                </span>
              </div>
              <div className='input-group' style={{ width: 'auto' }}>
                <span className='input-group-text fw-bold' style={{ backgroundColor: '#FFE4C4' }}>
                  Month
                </span>
                <span className='form-control bg-white' style={{ minWidth: '100px' }}>
                  {(() => {
                    const monthLabel = months.find((m) => m.value === selectedMonth)?.label;
                    if (!monthLabel) return '';
                    const [month, year] = monthLabel.split(' ');
                    return `${month} ${year.slice(-2)}`;
                  })()}
                </span>
              </div>
              <div className='input-group' style={{ width: 'auto' }}>
                <span className='input-group-text fw-bold' style={{ backgroundColor: '#FFE4C4' }}>
                  Currency
                </span>
                <span className='form-control bg-white' style={{ minWidth: '80px' }}>
                  {selectedCurrency}
                </span>
              </div>
            </div>
            <div className='border p-2' style={{ backgroundColor: '#FFE4C4', minWidth: '200px', textAlign: 'center' }}>
              <span className='fw-bold' style={{ fontSize: '12px' }}>ENTER DATA IN CREW LIST PAGE</span>
            </div>
          </div>
          <div className='report-table table-responsive'>
            <table className='table table-bordered align-middle' style={{ fontSize: '12px' }}>
              <thead className='table-header text-start' style={{ backgroundColor: '#FFE4C4' }}>
                <tr>
                  <th onClick={() => handleSort('sNo')} className='cursor-pointer' style={{ minWidth: '50px' }} rowSpan={2}>
                    S.No
                  </th>
                  <th onClick={() => handleSort('name')} className='cursor-pointer' style={{ minWidth: '120px' }} rowSpan={2}>
                    Name
                  </th>
                  <th style={{ minWidth: '100px' }} rowSpan={2}>Rank</th>
                  <th style={{ minWidth: '100px' }} rowSpan={2}>Basic Wages</th>
                  <th style={{ minWidth: '100px' }} rowSpan={2}>Leave Wages</th>
                  <th style={{ minWidth: '100px' }} rowSpan={2}>Fixed Overtime</th>
                  <th style={{ minWidth: '100px' }} rowSpan={2}>Other Allowance</th>
                  <th style={{ minWidth: '120px' }} rowSpan={2}>Total Monthly Salary</th>
                  <th style={{ minWidth: '150px', textAlign: 'center' }} colSpan={2}>PERIOD</th>
                  <th style={{ minWidth: '360px', textAlign: 'center' }} colSpan={3}>Deductions</th>
                  <th style={{ minWidth: '100px' }} rowSpan={2}>Days Onboard</th>
                  <th style={{ minWidth: '120px' }} rowSpan={2}>Salary for Period</th>
                  <th style={{ minWidth: '120px' }} rowSpan={2}>Total Deductions</th>
                  <th style={{ minWidth: '140px' }} rowSpan={2}>Scavenge Space & Cleaning</th>
                  <th style={{ minWidth: '120px' }} rowSpan={2}>Travel Allowance</th>
                  <th style={{ minWidth: '120px' }} rowSpan={2}>Reimbursement</th>
                  <th style={{ minWidth: '120px' }} rowSpan={2}>Due from Previous Month</th>
                  <th style={{ minWidth: '140px' }} rowSpan={2}>Total Net Payable Allotment</th>
                  <th style={{ minWidth: '140px' }} rowSpan={2}>Amount to Receive on Bank</th>
                  <th style={{ minWidth: '120px' }} rowSpan={2}>Balance Remaining</th>
                  <th style={{ minWidth: '100px' }} rowSpan={2}>Signature</th>
                  <th style={{ minWidth: '120px' }} rowSpan={2}>Passport Number</th>
                  <th style={{ minWidth: '100px' }} rowSpan={2}>CTC Number</th>
                  <th style={{ minWidth: '100px' }} rowSpan={2}>Nationality</th>
                  <th style={{ minWidth: '100px' }} rowSpan={2}>Actions</th>
                </tr>
                <tr>
                  <th style={{ minWidth: '75px' }}>FROM</th>
                  <th style={{ minWidth: '75px' }}>TO</th>
                  <th style={{ minWidth: '120px' }}>Cash Advance</th>
                  <th style={{ minWidth: '120px' }}>Internet Card</th>
                  <th style={{ minWidth: '120px' }}>Others</th>
                </tr>
              </thead>
              <tbody className='table-body text-start'>
                {loading ? (
                  <tr>
                    <td colSpan={27} className='text-center text-muted py-3'>
                      <div className='d-flex justify-content-center align-items-center'>
                        <span className='spinner-border spinner-border-sm me-2' role='status' aria-hidden='true'></span>
                        Loading portage entries...
                      </div>
                    </td>
                  </tr>
                ) : currentEntries.length === 0 ? (
                  <tr>
                    <td colSpan={27} className='text-center text-muted py-3'>
                      No portage entries found.
                    </td>
                  </tr>
                ) : (
                  currentEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.sNo}</td>
                      <td>{entry.name}</td>
                      <td>{entry.rank}</td>
                      <td>
                        {selectedCurrency} {entry.basicWages.toLocaleString()}
                      </td>
                      <td>
                        {selectedCurrency} {entry.leaveWages.toLocaleString()}
                      </td>
                      <td>
                        {selectedCurrency} {entry.fixedOvertime.toLocaleString()}
                      </td>
                      <td>
                        {selectedCurrency} {entry.otherAllowance.toLocaleString()}
                      </td>
                      <td>
                        <strong>
                          {selectedCurrency} {entry.totalMonthlySalary.toLocaleString()}
                        </strong>
                      </td>
                      <td>{entry.periodFrom}</td>
                      <td>{entry.periodTo}</td>
                      <td>
                        {selectedCurrency} {entry.deductionCashAdvance.toLocaleString()}
                      </td>
                      <td>
                        {selectedCurrency} {entry.deductionInternetCard.toLocaleString()}
                      </td>
                      <td>
                        {selectedCurrency} {entry.deductionOthers.toLocaleString()}
                      </td>
                      <td>{entry.daysOnboard}</td>
                      <td>
                        <strong>
                          {selectedCurrency} {entry.salaryForPeriod.toLocaleString()}
                        </strong>
                      </td>
                      <td>
                        <strong>
                          {selectedCurrency} {entry.totalDeductions.toLocaleString()}
                        </strong>
                      </td>
                      <td>
                        <input
                          type='number'
                          className='form-control form-control-sm'
                          value={entry.scavengeSpaceCleaning}
                          onChange={(e) =>
                            handleInputChange(entry.id, 'scavengeSpaceCleaning', parseFloat(e.target.value) || 0)
                          }
                        />
                      </td>
                      <td>
                        <input
                          type='number'
                          className='form-control form-control-sm'
                          value={entry.travelAllowance}
                          onChange={(e) =>
                            handleInputChange(entry.id, 'travelAllowance', parseFloat(e.target.value) || 0)
                          }
                        />
                      </td>
                      <td>
                        {selectedCurrency} {entry.reimbursement.toLocaleString()}
                      </td>
                      <td>
                        {selectedCurrency} {entry.dueFromPreviousMonth.toLocaleString()}
                      </td>
                      <td>
                        <strong>
                          {selectedCurrency} {entry.totalNetPayableAllotment.toLocaleString()}
                        </strong>
                      </td>
                      <td>
                        <input
                          type='number'
                          className='form-control form-control-sm'
                          value={entry.amountToReceiveOnBank}
                          onChange={(e) =>
                            handleInputChange(entry.id, 'amountToReceiveOnBank', parseFloat(e.target.value) || 0)
                          }
                        />
                      </td>
                      <td>
                        <strong>
                          {selectedCurrency} {entry.balanceRemaining.toLocaleString()}
                        </strong>
                      </td>
                      <td>
                        <button
                          className={`btn btn-sm ${entry.signature ? 'btn-success' : 'btn-outline-secondary'}`}
                          onClick={() => handleSignature(entry.id)}
                        >
                          {entry.signature ? '✓ Signed' : 'Sign'}
                        </button>
                      </td>
                      <td>{entry.passportNumber}</td>
                      <td>{entry.ctcNumber}</td>
                      <td>{entry.nationality}</td>
                      <td>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className='btn btn-sm btn-outline-danger px-2'
                          title='Delete Entry'
                        >
                          <KTSVG path='/media/map/trash.svg' />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className='pagination-wrapper d-flex justify-content-between align-items-center py-3'>
          <div className='d-flex align-items-center'>
            <span className='text-muted me-2'>Rows per page</span>
            <select
              className='form-select'
              style={{
                borderRadius: '20px',
                width: '70px',
                border: '1px solid #dee2e6',
                fontSize: '14px',
                padding: '4px 8px',
              }}
              value={rowsPerPage}
              onChange={handleRowsPerPageChange}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div className='d-flex align-items-center'>
            <span className='text-muted me-3' style={{ fontSize: '14px' }}>
              Showing{' '}
              <strong>
                {currentPage * rowsPerPage - rowsPerPage + 1}-{Math.min(currentPage * rowsPerPage, sortedEntries.length)}
              </strong>{' '}
              of <strong>{sortedEntries.length}</strong>
            </span>
            <nav>
              <ul className='pagination pagination-sm mb-0' style={{ gap: '2px' }}>
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button
                    className='page-link text-muted'
                    style={{
                      backgroundColor: '#f8f9fa',
                      border: '1px solid #dee2e6',
                      padding: '8px 12px',
                      fontSize: '14px',
                      borderRadius: '6px',
                    }}
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    ‹
                  </button>
                </li>
                {(() => {
                  const pages = [];
                  const showPages = 5;
                  let startPage = Math.max(1, currentPage - 2);
                  let endPage = Math.min(totalPages, startPage + showPages - 1);
                  if (endPage - startPage < showPages - 1) {
                    startPage = Math.max(1, endPage - showPages + 1);
                  }
                  if (startPage > 1) {
                    pages.push(
                      <li key={1} className='page-item'>
                        <button
                          className='page-link text-muted'
                          style={{
                            backgroundColor: '#f8f9fa',
                            border: '1px solid #dee2e6',
                            padding: '8px 12px',
                            fontSize: '14px',
                            minWidth: '40px',
                            borderRadius: '6px',
                          }}
                          onClick={() => handlePageChange(1)}
                        >
                          1
                        </button>
                      </li>
                    );
                    if (startPage > 2) {
                      pages.push(
                        <li key='ellipsis1' className='page-item disabled'>
                          <span
                            className='page-link border-0 text-muted'
                            style={{ backgroundColor: 'transparent', padding: '4px 8px' }}
                          >
                            ...
                          </span>
                        </li>
                      );
                    }
                  }
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <li key={i} className={`page-item ${currentPage === i ? 'active' : ''}`}>
                        <button
                          className='page-link text-muted'
                          style={{
                            backgroundColor: currentPage === i ? '#F4F9FF' : 'transparent',
                            border: '1px solid #dee2e6',
                            padding: '8px 12px',
                            fontSize: '14px',
                            minWidth: '40px',
                            borderRadius: '6px',
                            outline: 'none',
                            boxShadow: 'none',
                          }}
                          onClick={() => handlePageChange(i)}
                        >
                          {i}
                        </button>
                      </li>
                    );
                  }
                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) {
                      pages.push(
                        <li key='ellipsis2' className='page-item disabled'>
                          <span
                            className='page-link border-0 text-muted'
                            style={{ backgroundColor: 'transparent', padding: '4px 8px' }}
                          >
                            ...
                          </span>
                        </li>
                      );
                    }
                    pages.push(
                      <li key={totalPages} className='page-item'>
                        <button
                          className='page-link text-muted'
                          style={{
                            backgroundColor: '#f8f9fa',
                            border: '1px solid #dee2e6',
                            padding: '8px 12px',
                            fontSize: '14px',
                            minWidth: '40px',
                            borderRadius: '6px',
                          }}
                          onClick={() => handlePageChange(totalPages)}
                        >
                          {totalPages}
                        </button>
                      </li>
                    );
                  }
                  return pages;
                })()}
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button
                    className='page-link text-muted'
                    style={{
                      backgroundColor: '#f8f9fa',
                      border: '1px solid #dee2e6',
                      padding: '8px 12px',
                      fontSize: '14px',
                      borderRadius: '6px',
                    }}
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    ›
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
      <div className='px-5 mt-4'>
        <div className='d-flex align-items-center mb-4 justify-content-center' style={{ gap: '1rem' }}>
          <div className='input-group' style={{ width: 'auto' }}>
            <span className='input-group-text fw-bold' style={{ backgroundColor: '#FFE4C4' }}>
              TOTALS
            </span>
            <span className='form-control bg-white' style={{ minWidth: '100px' }}>
              {totalMonthlySalary.toLocaleString()}
            </span>
          </div>
          <div className='input-group' style={{ width: 'auto' }}>
            <span className='input-group-text fw-bold' style={{ backgroundColor: '#FFE4C4' }}>
              USD
            </span>
            <span className='form-control bg-white' style={{ minWidth: '100px' }}>
              {totalSalaryForPeriod.toLocaleString()}
            </span>
          </div>
        </div>
        <div className='d-flex align-items-start' style={{ gap: '2rem' }}>
          <div className='border' style={{ minHeight: '100px', flex: '1', maxWidth: '70%', display: 'flex' }}>
            <div className='p-3' style={{ backgroundColor: '#FFE4C4', minWidth: '100px', display: 'flex', alignItems: 'flex-start' }}>
              <span className='fw-bold'>REMARKS</span>
            </div>
            <div className='flex-grow-1'>
              <textarea
                className='form-control'
                style={{ border: 'none', resize: 'none', height: '100%' }}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>
          </div>
          <div className='d-flex flex-column border' style={{ minWidth: '150px' }}>
            <div className='p-2 text-center' style={{ backgroundColor: '#FFE4C4', borderBottom: '1px solid #dee2e6' }}>
              <span className='fw-bold'>Master</span>
            </div>
            <div className='p-3 text-center d-flex flex-column align-items-center justify-content-center' style={{ height: '80px', gap: '0.5rem' }}>
              <button
                className='btn btn-sm btn-outline-primary w-100'
                onClick={handleSignaturePadOpen}
              >
                Signature Pad
              </button>
              <button
                className='btn btn-sm btn-outline-primary w-100'
                onClick={handleUploadClick}
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrewPortage;