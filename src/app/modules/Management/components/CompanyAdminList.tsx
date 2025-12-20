import { FC, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { KTSVG } from '../../../../_metronic/helpers'
import { getCompanyAdminList } from '../core/_requests'
import { CompanyAdmin } from '../core/_models'
import AddCompanyAdminModal from './AddCompanyAdminModal'
import DeleteCompanyAdminModal from './DeleteCompanyAdminModal'
import EditCompanyAdminModal from './EditCompanyAdminModal'
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { assignReport, getAssignedTemplatesByCompanyAdmin, getTemplateList } from '../../operations/core/_requests'
import ViewCompanyAdminModal from './ViewCompanyAdminModal'
import * as XLSX from 'xlsx';

const CompanyAdminList: FC = () => {
    const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState<boolean>(false);
    const [isEditCompanyModalOpen, setIsEditCompanyModalOpen] = useState<boolean>(false);
    const [isViewCompanyModalOpen, setIsViewCompanyModalOpen] = useState<boolean>(false);
    const [isDeleteCompanyModalOpen, setIsDeleteCompanyModalOpen] = useState<boolean>(false);
    const [companyAdmins, setCompanyAdmins] = useState<CompanyAdmin[]>([]);
    const [selectedCompany, setSelectedCompany] = useState<CompanyAdmin>();
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const indexOfLastCompanyAdmin = currentPage * rowsPerPage;
    const indexOfFirstCompanyAdmin = indexOfLastCompanyAdmin - rowsPerPage;
    const [filteredCompanies, setFilteredCompanies] = useState<CompanyAdmin[]>([]);
    const totalPages = Math.ceil(filteredCompanies.length / rowsPerPage);
    const [loginDetails, setLoginDetails] = useState<Record<number, { username: string; password: string }>>({});
    const [showCredentialsModal, setShowCredentialsModal] = useState(false);
    const [newCompanyCredentials, setNewCompanyCredentials] = useState<{ username: string; password: string } | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: keyof CompanyAdmin | 'contact' | null, direction: 'asc' | 'desc' }>({
        key: null,
        direction: 'asc',
    });
    const handleSort = (key: keyof CompanyAdmin) => {
        setSortConfig(prev => {
            if (prev.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            } else {
                return { key, direction: 'asc' };
            }
        });
    };



    useEffect(() => {
        fetchCompanyAdmins();
    }, []);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(1);
        }
    }, [filteredCompanies, rowsPerPage]);

    useEffect(() => {
        const stored = localStorage.getItem('companyLoginDetails');
        if (stored) setLoginDetails(JSON.parse(stored));
    }, []);

    const handleExcelDownload = () => {
        const table = document.querySelector('.report-table table') as HTMLTableElement;
        if (!table) return;

        const workbook = XLSX.utils.table_to_book(table, { sheet: "Companies" });
        XLSX.writeFile(workbook, "companies.xlsx");
    };

    const fetchCompanyAdmins = async () => {
        try {
            const companyList = await getCompanyAdminList();
            console.log('Company List:', companyList);

            // Get distinct companies by ID
            // const distinctCompanies = Array.from(
            //     new Map(companyList.map(company => [company.id, { id: company.id, name: company.name }])).values()
            // );

            setCompanyAdmins(companyList);
        } catch (error) {
            console.error('Failed to fetch company list:', error);
        }
    };

    const handleCompanyAdded = async () => {
        fetchCompanyAdmins();

        try {
            // Step 1: Fetch all company admins
            const companyList = await getCompanyAdminList();
            setCompanyAdmins(companyList);

            // Step 2: Get the latest added company admin (assuming it's last in the list)
            const newCompanyAdmin = companyList[companyList.length - 1];
            const companyAdminId = newCompanyAdmin?.id;

            if (!companyAdminId) {
                console.error("New company admin not found.");
                return;
            }

            // Step 3: Fetch assigned templates for the new company admin
            const assignedTemplates = await getAssignedTemplatesByCompanyAdmin(companyAdminId);


            // Step 4: If no templates are assigned, fetch base templates and assign all
            if (!assignedTemplates || assignedTemplates.length === 0) {
                const baseTemplateIds = await fetchTemplateIds();

                if (!baseTemplateIds || baseTemplateIds.length === 0) {
                    return;  // ✅ Don't assign anything if no base templates
                }

                for (const templateId of baseTemplateIds) {
                    await assignReport(companyAdminId, templateId); // ✅ Correct
                }

                console.log("Reports assigned to new company admin.");
            }

        } catch (error) {
            console.error('Error in handleCompanyAdded:', error);
            console.log("Failed to assign base templates.");
        }
    };

    const fetchTemplateIds = async () => {
        try {
            const templateList = await getTemplateList();

            // Extract all IDs
            const templateIds: number[] = templateList
                .map(template => template.id);

            return templateIds;
        } catch (err) {
            console.error('Failed to fetch template list:', err);
        }
    };

    useEffect(() => {
        let filtered = companyAdmins.filter(company =>
            company.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (sortConfig.key) {
            filtered = [...filtered].sort((a, b) => {
                const getSortValue = (company: CompanyAdmin) => {
                    switch (sortConfig.key) {
                        case 'name': return company.name?.trim().toLowerCase() || '';
                        case 'email': return company.email?.trim().toLowerCase() || '';
                        case 'contact': return company.contactNo?.trim().toLowerCase() || '';
                        case 'city': return company.city?.trim().toLowerCase() || '';
                        case 'state': return company.state?.trim().toLowerCase() || '';
                        case 'country': return company.country?.trim().toLowerCase() || '';
                        default:
                            return (company[sortConfig.key!] as string)?.trim().toLowerCase() || '';
                    }
                };

                const aValue = getSortValue(a);
                const bValue = getSortValue(b);

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        setFilteredCompanies(filtered);
        setCurrentPage(1);
    }, [searchTerm, companyAdmins, sortConfig]);

    return (
        <div
            className='app-main flex-column flex-row-fluid'
            id='kt_app_main'
            style={{ height: '100vh' }}
        >
            <div className='d-flex flex-column flex-column-fluid' >
                <div
                    id='kt_app_content'
                    className='app-content flex-column-fluid d-flex flex-column'
                    style={{ flex: 1 }}
                >
                    <div className='card flex-column-fluid d-flex flex-column bg-white border-top' style={{ flex: 1, }}>
                        {/* Header */}
                        <div className='d-flex gap-3 pe-5'>
                            <div className='py-3 ms-3' style={{ flex: 5 }}>
                                <h3 className='card-title fw-bold text-dark mb-5'>Companies</h3>
                                <div className='d-flex justify-content-between mb-5'>
                                    <div className='d-flex align-items-center gap-2'>
                                        <input
                                            type="text"
                                            className="form-control cp_search_input"
                                            placeholder="Company Name"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <div className='d-flex align-items-center gap-4'>
                                        <button className="btn p-0 m-0" onClick={handleExcelDownload}>
                                            <KTSVG path='/media/icons/duotune/general/download.svg' className='svg-icon-2x' />
                                        </button>                                        <button className='btn btn_primary' onClick={() => { setIsAddCompanyModalOpen(true) }}
                                        >
                                            <KTSVG path='/media/map/zoom-in.svg' className='svg-icon-2' />Add Company
                                        </button>
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
                                                {filteredCompanies
                                                    .length === 0 ? (
                                                    <tr>
                                                        <td colSpan={7} className="text-center py-4 text-muted">
                                                            No companies found
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredCompanies
                                                        .slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
                                                        .map((company, idx) => {
                                                            const login = loginDetails[company.id] ?? {};

                                                            return (
                                                                <tr key={idx}>
                                                                    <td>{company.name}</td>
                                                                    <td>{company.contactNo}</td>
                                                                    <td>{company.email}</td>
                                                                    <td>{company.state}</td>
                                                                    <td>{company.city}</td>
                                                                    <td>{company.country}</td>
                                                                    <td>
                                                                        <button className="btn btn-sm px-0"
                                                                            onClick={() => {
                                                                                setIsEditCompanyModalOpen(true);
                                                                                setSelectedCompany(company);
                                                                            }}>
                                                                            <KTSVG path='/media/map/edit-active.svg' className='' />
                                                                        </button>
                                                                        <button
                                                                            className="btn btn-sm px-0"
                                                                            onClick={() => {
                                                                                setIsDeleteCompanyModalOpen(true);
                                                                                setSelectedCompany(company);
                                                                            }}
                                                                        >
                                                                            <KTSVG path='/media/map/trash.svg' className='' />
                                                                        </button>
                                                                        <button
                                                                            className="btn btn-sm px-0"
                                                                            onClick={() => {
                                                                                setIsViewCompanyModalOpen(true);
                                                                                setSelectedCompany(company);
                                                                            }}
                                                                        >
                                                                            <KTSVG path='/media/map/ph_eye.svg' className='' />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
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
                                                        padding: "4px 8px"
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
                                                    Showing <strong>{(currentPage - 1) * rowsPerPage + 1}-{Math.min(currentPage * rowsPerPage, filteredCompanies.length)}</strong> of <strong>{filteredCompanies.length}</strong>
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
                                                                    borderRadius: "6px"
                                                                }}
                                                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                                disabled={currentPage === 1}
                                                            >
                                                                ‹
                                                            </button>
                                                        </li>

                                                        {(() => {
                                                            const totalPages = Math.ceil(filteredCompanies.length / rowsPerPage);
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
                                                                                borderRadius: "6px"
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
                                                                            <span className="page-link border-0 text-muted" style={{ backgroundColor: "transparent", padding: "4px 8px" }}>
                                                                                ...
                                                                            </span>
                                                                        </li>
                                                                    );
                                                                }
                                                            }

                                                            for (let i = startPage; i <= endPage; i++) {
                                                                pages.push(
                                                                    <li key={i} className={`page-item ${currentPage === i ? "active" : ""}`}>
                                                                        <button
                                                                            className="page-link text-muted"
                                                                            style={{
                                                                                backgroundColor: currentPage === i ? "#F4F9FF" : "transparent",
                                                                                border: "1px solid #dee2e6",
                                                                                padding: "8px 12px",
                                                                                fontSize: "14px",
                                                                                minWidth: "40px",
                                                                                borderRadius: "6px",
                                                                                outline: "none",
                                                                                boxShadow: "none"
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
                                                                            <span className="page-link border-0 text-muted" style={{ backgroundColor: "transparent", padding: "4px 8px" }}>
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
                                                                                borderRadius: "6px"
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
                                                                    borderRadius: "6px"
                                                                }}
                                                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
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
                    <AddCompanyAdminModal
                        isOpen={isAddCompanyModalOpen}
                        onClose={() => { setIsAddCompanyModalOpen(false) }}
                        onCompanyAdded={({ companyId, username, password }) => {
                            setLoginDetails(prev => ({
                                ...prev,
                                [companyId]: { username, password }
                            }));
                            setNewCompanyCredentials({ username, password });  // 🔑 Set creds
                            setShowCredentialsModal(true);
                            handleCompanyAdded(); // refresh list
                        }}
                    />
                )}
                {isDeleteCompanyModalOpen && (
                    <DeleteCompanyAdminModal
                        isOpen={isDeleteCompanyModalOpen}
                        onClose={() => { setIsDeleteCompanyModalOpen(false) }}
                        onCompanyDeleted={fetchCompanyAdmins}
                        companyAdminData={selectedCompany}
                    />
                )}
                {isEditCompanyModalOpen && (
                    <EditCompanyAdminModal
                        isOpen={isEditCompanyModalOpen}
                        onClose={() => { setIsEditCompanyModalOpen(false) }}
                        onCompanyEdited={fetchCompanyAdmins}
                        companyAdminData={selectedCompany}
                    />
                )}
                {isViewCompanyModalOpen && (
                    <ViewCompanyAdminModal
                        isOpen={isViewCompanyModalOpen}
                        onClose={() => { setIsViewCompanyModalOpen(false) }}
                        companyAdminData={selectedCompany}
                    />
                )}
                {showCredentialsModal && newCompanyCredentials && (
                    <div className="modal fade show d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.5)' }}>
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Company Created Successfully</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowCredentialsModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <p><strong>Username:</strong> {newCompanyCredentials.username}</p>
                                    <p><strong>Password:</strong> {newCompanyCredentials.password}</p>
                                    <p><strong>Company Login Link:</strong> https://uat.elecmeksolutions.com/auth/{newCompanyCredentials.username}</p>
                                    <p className="text-muted">Please note down these credentials now. For your security, they won't be shown again.</p>
                                    <button
                                        className="btn btn-light"
                                        onClick={() => {
                                            navigator.clipboard.writeText(`Username: ${newCompanyCredentials.username}\nPassword: ${newCompanyCredentials.password}\nLink: https://uat.elecmeksolutions.com/auth/${newCompanyCredentials.username}`);
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

export { CompanyAdminList }
