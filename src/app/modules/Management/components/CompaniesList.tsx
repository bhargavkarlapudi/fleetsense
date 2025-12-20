import { FC, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { KTSVG } from '../../../../_metronic/helpers'
import { useAuth } from '../../auth'
import { getCompanyList } from '../core/_requests'
import { Company } from '../core/_models'
import AddCompanyModal from './AddCompanyModal'
import DeleteCompanyModal from './DeleteCompanyModal'
import EditCompanyModal from './EditCompanyModal'
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ViewCompanyModal from './ViewCompanyModal';
import * as XLSX from 'xlsx';

const CompaniesList: FC = () => {
    // const roleEntityId = sessionStorage.getItem("roleEntityId")
    // const roleId = sessionStorage.getItem("roleId")
    const { currentUser } = useAuth()
    const roleEntityId = currentUser?.roleEntityId;
    const roleId = currentUser?.role?.id;
    /** OPERATOR BEHAVIOR SPLIT **/
const companyGroupAdminId =
  (currentUser as any)?.companyGroupAdminId ??
  (currentUser as any)?.companyGroupAdmin?.id ??
  null

const isOperator = roleId === 6
const isSuperadminOperator = isOperator && companyGroupAdminId == null   // acts like Superadmin
const isCompanyOperator   = isOperator && companyGroupAdminId != null    // acts like Company Group Admin

// For CGA-like behavior, use this CGA id (works for role 5 or operator under company)
const effectiveCgaId: number | null =
  roleId === 5
    ? Number(roleEntityId)
    : isCompanyOperator
      ? Number(companyGroupAdminId)
      : null

// Who can add/edit/delete companies in UI
const canManageCompanies =
  roleId === 1 || roleId === 5 || isSuperadminOperator || isCompanyOperator
    const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState<boolean>(false);
    const [isEditCompanyModalOpen, setIsEditCompanyModalOpen] = useState<boolean>(false);
    const [isViewCompanyModalOpen, setIsViewCompanyModalOpen] = useState<boolean>(false);
    const [isDeleteCompanyModalOpen, setIsDeleteCompanyModalOpen] = useState<boolean>(false);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [selectedCompany, setSelectedCompany] = useState<Company>();
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [sortConfig, setSortConfig] = useState<{
        key: keyof Company | 'cgaName' | 'contact' | 'email' | 'state' | 'city' | 'country' | null,
        direction: 'asc' | 'desc'
    }>({
        key: null,
        direction: 'asc',
    });


    const handleSort = (key: keyof Company | 'cgaName') => {
        setSortConfig((prev) => {
            if (prev.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            } else {
                return { key, direction: 'asc' };
            }
        });
    };

    const [searchTerm, setSearchTerm] = useState('');
    const indexOfLastCompany = currentPage * rowsPerPage;
    const indexOfFirstCompany = indexOfLastCompany - rowsPerPage;
    const [filteredSubCompanies, setFilteredSubCompanies] = useState<Company[]>([]);
    const currentCompanies = filteredSubCompanies.slice(indexOfFirstCompany, indexOfLastCompany);
    const totalPages = Math.ceil(filteredSubCompanies.length / rowsPerPage);
    const [showCredentialsModal, setShowCredentialsModal] = useState(false);
    const [newCompanyCredentials, setNewCompanyCredentials] = useState<{ username: string; password: string } | null>(null);


    useEffect(() => {
        fetchCompanies();
    }, []);

    useEffect(() => {
        console.log(roleId)
        console.log(roleEntityId)
        console.log(searchTerm)
        console.log(companies);
    }, [companies]);

    useEffect(() => {
        console.log(filteredSubCompanies);
        if (currentPage > totalPages) {
            setCurrentPage(1);
        }
    }, [filteredSubCompanies, rowsPerPage]);

    useEffect(() => {
        if (companies.length > 0 && searchTerm) {
            const hasMatch = companies.some(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase()));
            if (!hasMatch) {
                setSearchTerm(''); // Clear search if it causes empty view
            }
        }
    }, [companies]);

    const handleExcelDownload = () => {
        const table = document.querySelector('.report-table table') as HTMLTableElement;
        if (!table) return;

        const workbook = XLSX.utils.table_to_book(table, { sheet: "Companies" });
        XLSX.writeFile(workbook, "companies.xlsx");
    };


    const fetchCompanies = async () => {
        try {
            const companyList = await getCompanyList();
            console.log('Company List:', companyList);

            setCompanies(companyList);
        } catch (error) {
            console.error('Failed to fetch company list:', error);
        }
    };

    useEffect(() => {
  let filtered = companies.filter(company => {
    if (!company.active) return false

    const matches = company.name?.toLowerCase().includes(searchTerm.toLowerCase())

    // Superadmin OR Operator-under-Superadmin => see all active
    if (roleId === 1 || isSuperadminOperator) {
      return matches
    }

    // Company Group Admin OR Operator-under-Company => only companies for their CGA
    if (roleId === 5 || isCompanyOperator) {
      return matches && Number(company.cga?.id) === Number(effectiveCgaId)
    }

    // Others: keep existing (was unrestricted except role 5)
    return matches
  })

  if (sortConfig.key) {
    filtered = [...filtered].sort((a, b) => {
      const getSortValue = (company: Company) => {
        switch (sortConfig.key) {
          case 'cgaName':  return company.cga?.name?.trim().toLowerCase() || ''
          case 'contact':  return company.contactNo?.trim().toLowerCase() || ''
          case 'email':    return company.email?.trim().toLowerCase() || ''
          case 'state':    return company.state?.trim().toLowerCase() || ''
          case 'city':     return company.city?.trim().toLowerCase() || ''
          case 'country':  return company.country?.trim().toLowerCase() || ''
          default:         return (company[sortConfig.key!] as string)?.trim().toLowerCase() || ''
        }
      }
      const aValue = getSortValue(a)
      const bValue = getSortValue(b)
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ?  1 : -1
      return 0
    })
  }

  setFilteredSubCompanies(filtered)
  setCurrentPage(1)
}, [
  searchTerm,
  companies,
  roleId,
  roleEntityId,
  sortConfig,
  isSuperadminOperator,
  isCompanyOperator,
  effectiveCgaId
])



    return (
        <div
            className='app-main flex-column flex-row-fluid'
            id='kt_app_main'
            style={{ height: '100vh' }}
        >
            <div className='d-flex flex-column flex-column-fluid ' >
                <div
                    id='kt_app_content'
                    className='app-content flex-column-fluid d-flex flex-column '
                    style={{ flex: 1 }}
                >
                    <div className='card flex-column-fluid d-flex flex-column' style={{ flex: 1, backgroundColor: 'white', border: 'none', boxShadow: 'none' }}>
                        {/* Header */}
                        <div className='d-flex gap-3 pe-5 border-top'>
                            <div className='py-3 ms-3 ' style={{ flex: 5 }}>
                                <h3 className='card-title fw-bold text-dark mb-5'>Sub-Companies</h3>
                                <div className='d-flex justify-content-between mb-5'>
                                    <div className='d-flex align-items-center gap-2'>
                                        <input
                                            type="text"
                                            className="form-control cp_search_input"
                                            placeholder="Sub-Company Name"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <div className='d-flex align-items-center gap-4'>
                                        <button className="btn p-0 m-0" onClick={handleExcelDownload}>
                                            <KTSVG path='/media/icons/duotune/general/download.svg' className='svg-icon-2x' />
                                        </button>
                                      {canManageCompanies && (
  <button className='btn btn_primary' onClick={() => { setIsAddCompanyModalOpen(true) }}>
    <KTSVG path='/media/map/zoom-in.svg' className='svg-icon-2' />Add Sub-Company
  </button>
)}
                                    </div>
                                </div>
                                {/* Summary Cards */}
                                <div className='py-3'>
                                    {/* Reports Table */}
                                    <div className="report-table table-responsive" style={{ maxHeight: '50rem', overflowY: 'auto' }}>
                                        <table className="table table-bordered align-middle">
                                            <thead className="table-header py-5">
                                                <tr>
                                                    <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                                                        SUB-COMPANY NAME
                                                        <KTSVG path="/media/map/report_table_filter.svg" className="svg-icon-small ms-2" />
                                                    </th>
                                                    <th onClick={() => handleSort('cgaName')} style={{ cursor: 'pointer' }}>
                                                        COMPANY NAME
                                                        <KTSVG path="/media/map/report_table_filter.svg" className="svg-icon-small ms-2" />
                                                    </th>
                                                    <th onClick={() => handleSort('contactNo')} style={{ cursor: 'pointer' }}>
                                                        CONTACT
                                                        <KTSVG path="/media/map/report_table_filter.svg" className="svg-icon-small ms-2" />
                                                    </th>
                                                    <th onClick={() => handleSort('email')} style={{ cursor: 'pointer' }}>
                                                        EMAIL
                                                        <KTSVG path="/media/map/report_table_filter.svg" className="svg-icon-small ms-2" />
                                                    </th>
                                                    <th onClick={() => handleSort('state')} style={{ cursor: 'pointer' }}>
                                                        STATE
                                                        <KTSVG path="/media/map/report_table_filter.svg" className="svg-icon-small ms-2" />
                                                    </th>
                                                    <th onClick={() => handleSort('city')} style={{ cursor: 'pointer' }}>
                                                        CITY
                                                        <KTSVG path="/media/map/report_table_filter.svg" className="svg-icon-small ms-2" />
                                                    </th>
                                                    <th onClick={() => handleSort('country')} style={{ cursor: 'pointer' }}>
                                                        COUNTRY
                                                        <KTSVG path="/media/map/report_table_filter.svg" className="svg-icon-small ms-2" />
                                                    </th>
                                                    <th>ACTIONS</th>
                                                </tr>
                                            </thead>
                                            <tbody className="table-body">
                                                {currentCompanies
                                                    // .filter(company => {
                                                    //     console.log(company)
                                                    //     if (!company.active) return false;
                                                    //     console.log(company.cga?.id)

                                                    //     if (roleId === "5") {
                                                    //         return company.cga?.id === Number(roleEntityId);
                                                    //     }
                                                    //     return true;
                                                    // })
                                                    .length === 0 ? (
                                                    <tr>
                                                        <td colSpan={8} className="text-center py-4 text-muted">
                                                            No sub-companies found
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    currentCompanies
                                                        // .filter(company => {
                                                        //     if (!company.active) return false;
                                                        //     if (roleId === "5") {
                                                        //         return company.cga?.id === Number(roleEntityId);
                                                        //     }

                                                        //     return true;
                                                        // })
                                                        .map((company, idx) => (
                                                            <tr key={idx}>
                                                                <td>{company.name}</td>
                                                                <td>{company.cga?.name}</td>
                                                                <td>{company.contactNo}</td>
                                                                <td>{company.email}</td>
                                                                <td>{company.state}</td>
                                                                <td>{company.city}</td>
                                                                <td>{company.country}</td>
                                                                <td>
                                                                    {canManageCompanies && (
  <>
    <button
      className="btn btn-sm px-0"
      onClick={() => {
        setIsEditCompanyModalOpen(true)
        setSelectedCompany(company)
      }}
    >
      <KTSVG path="/media/map/edit-active.svg" />
    </button>
    <button
      className="btn btn-sm px-0"
      onClick={() => {
        setIsDeleteCompanyModalOpen(true)
        setSelectedCompany(company)
      }}
    >
      <KTSVG path="/media/map/trash.svg" />
    </button>
  </>
)}
<button
  className="btn btn-sm px-0"
  onClick={() => {
    setIsViewCompanyModalOpen(true)
    setSelectedCompany(company)
  }}
>
  <KTSVG path="/media/map/ph_eye.svg" />
</button>
                                                                </td>
                                                            </tr>
                                                        ))
                                                )}
                                            </tbody>


                                        </table>
                                        {/* Pagination */}
                                        <div className="pagination-wrapper d-flex justify-content-between align-items-center py-3" style={{ borderTop: "1px solid #dee2e6" }}>
                                            <div className="d-flex align-items-center">
                                                <span className="text-muted me-2">Rows per page</span>
                                                <select
                                                    className="form-select"
                                                    style={{
                                                        borderRadius: "20px",
                                                        width: "70px",
                                                        border: "1px solid #dee2e6",
                                                        fontSize: "14px",
                                                        padding: "4px 8px",
                                                    }}
                                                    value={rowsPerPage}
                                                    onChange={(e) => {
                                                        setRowsPerPage(parseInt(e.target.value));
                                                        setCurrentPage(1);
                                                    }}
                                                >
                                                    <option value={10}>10</option>
                                                    <option value={20}>20</option>
                                                    <option value={50}>50</option>
                                                </select>
                                            </div>

                                            <div className="d-flex align-items-center">
                                                <span className="text-muted me-3" style={{ fontSize: "14px" }}>
                                                    Showing <strong>{(currentPage - 1) * rowsPerPage + 1}-{Math.min(currentPage * rowsPerPage, filteredSubCompanies.length)}</strong> of <strong>{filteredSubCompanies.length}</strong>
                                                </span>

                                                <nav>
                                                    <ul className="pagination pagination-sm mb-0" style={{ gap: "2px" }}>
                                                        <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                                                            <button
                                                                className="page-link text-muted"
                                                                style={{
                                                                    backgroundColor: "#f8f9fa",
                                                                    border: "1px solid #dee2e6",
                                                                    padding: "8px 12px",
                                                                    fontSize: "14px",
                                                                    borderRadius: "6px",
                                                                }}
                                                                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
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
                                                                    <li key={1} className="page-item">
                                                                        <button
                                                                            className="page-link text-muted"
                                                                            style={{
                                                                                backgroundColor: "#f8f9fa",
                                                                                border: "1px solid #dee2e6",
                                                                                padding: "8px 12px",
                                                                                fontSize: "14px",
                                                                                minWidth: "40px",
                                                                                borderRadius: "6px",
                                                                            }}
                                                                            onClick={() => setCurrentPage(1)}
                                                                        >
                                                                            1
                                                                        </button>
                                                                    </li>
                                                                );
                                                                if (startPage > 2) {
                                                                    pages.push(
                                                                        <li key="ellipsis1" className="page-item disabled">
                                                                            <span
                                                                                className="page-link border-0 text-muted"
                                                                                style={{
                                                                                    backgroundColor: "transparent",
                                                                                    padding: "4px 8px",
                                                                                }}
                                                                            >
                                                                                ...
                                                                            </span>
                                                                        </li>
                                                                    );
                                                                }
                                                            }

                                                            for (let i = startPage; i <= endPage; i++) {
                                                                pages.push(
                                                                    <li
                                                                        key={i}
                                                                        className={`page-item ${currentPage === i ? "active" : ""}`}
                                                                    >
                                                                        <button
                                                                            className="page-link text-muted"
                                                                            style={{
                                                                                backgroundColor:
                                                                                    currentPage === i ? "#F8FCFF" : "transparent",
                                                                                border: "1px solid #dee2e6",
                                                                                padding: "8px 12px",
                                                                                fontSize: "14px",
                                                                                minWidth: "40px",
                                                                                borderRadius: "6px",
                                                                                outline: "none",
                                                                                boxShadow: "none",
                                                                            }}
                                                                            onClick={() => setCurrentPage(i)}
                                                                        >
                                                                            {i}
                                                                        </button>
                                                                    </li>
                                                                );
                                                            }

                                                            if (endPage < totalPages) {
                                                                if (endPage < totalPages - 1) {
                                                                    pages.push(
                                                                        <li key="ellipsis2" className="page-item disabled">
                                                                            <span
                                                                                className="page-link border-0 text-muted"
                                                                                style={{
                                                                                    backgroundColor: "transparent",
                                                                                    padding: "4px 8px",
                                                                                }}
                                                                            >
                                                                                ...
                                                                            </span>
                                                                        </li>
                                                                    );
                                                                }
                                                                pages.push(
                                                                    <li key={totalPages} className="page-item">
                                                                        <button
                                                                            className="page-link text-muted"
                                                                            style={{
                                                                                backgroundColor: "#f8f9fa",
                                                                                border: "1px solid #dee2e6",
                                                                                padding: "8px 12px",
                                                                                fontSize: "14px",
                                                                                minWidth: "40px",
                                                                                borderRadius: "6px",
                                                                            }}
                                                                            onClick={() => setCurrentPage(totalPages)}
                                                                        >
                                                                            {totalPages}
                                                                        </button>
                                                                    </li>
                                                                );
                                                            }

                                                            return pages;
                                                        })()}

                                                        <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                                                            <button
                                                                className="page-link text-muted"
                                                                style={{
                                                                    backgroundColor: "#f8f9fa",
                                                                    border: "1px solid #dee2e6",
                                                                    padding: "8px 12px",
                                                                    fontSize: "14px",
                                                                    borderRadius: "6px",
                                                                }}
                                                                onClick={() =>
                                                                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                                                                }
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
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
                {isAddCompanyModalOpen && (
                    <AddCompanyModal
                        isOpen={isAddCompanyModalOpen}
                        onClose={() => { setIsAddCompanyModalOpen(false) }}
                        onCompanyAdded={({ username, password }) => {
                            // setLoginDetails(prev => ({
                            //     ...prev,
                            //     [companyId]: { username, password }
                            // }));
                            setNewCompanyCredentials({ username, password });  // 🔑 Set creds
                            setShowCredentialsModal(true);
                            fetchCompanies(); // refresh list
                        }}
                    />
                )}
                {isDeleteCompanyModalOpen && (
                    <DeleteCompanyModal
                        isOpen={isDeleteCompanyModalOpen}
                        onClose={() => { setIsDeleteCompanyModalOpen(false) }}
                        onCompanyDeleted={fetchCompanies}
                        companyData={selectedCompany}
                    />
                )}
                {isEditCompanyModalOpen && (
                    <EditCompanyModal
                        isOpen={isEditCompanyModalOpen}
                        onClose={() => { setIsEditCompanyModalOpen(false) }}
                        onCompanyUpdated={fetchCompanies}
                        companyData={selectedCompany}
                    />
                )}
                {isViewCompanyModalOpen && (
                    <ViewCompanyModal
                        isOpen={isViewCompanyModalOpen}
                        onClose={() => { setIsViewCompanyModalOpen(false) }}
                        companyData={selectedCompany}
                    />
                )}
                {showCredentialsModal && newCompanyCredentials && (
                    <div className="modal fade show d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)' }}>
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Sub-Company Created Successfully</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowCredentialsModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <p><strong>Username:</strong> {newCompanyCredentials.username}</p>
                                    <p><strong>Password:</strong> {newCompanyCredentials.password}</p>
                                    <p className="text-danger">Please copy these credentials now. They will not be shown again.</p>
                                    <button
                                        className="btn btn-light"
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${newCompanyCredentials.username} / ${newCompanyCredentials.password}`);
                                            toast.success("Copied to clipboard");
                                        }}
                                    >
                                        Copy to Clipboard
                                    </button>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowCredentialsModal(false)}>Close</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <ToastContainer
                    position="top-center"
                    autoClose={3000}
                    hideProgressBar={false}
                    newestOnTop={false}
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                    style={{ top: "5rem" }}
                />
            </div>
        </div>

    )
}

export { CompaniesList }
