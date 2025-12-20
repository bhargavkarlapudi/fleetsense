import { FC, useEffect, useState } from 'react'
import { KTSVG } from '../../../../_metronic/helpers'
import { assignReport, getAssignedTemplatesByCompany, getAssignedTemplatesByCompanyAdmin, getAssignedTemplatesByVesselId, getAssignedTemplatesByVesselType, getCompanyList, getCustomAssignedTemplates, getFieldsForTab, getReportsForTemplate, getTabsForReport, getTemplateList, getVesselTypeList } from '../core/_requests'
import AddReportModal from './AddReportModal'
import { Reports, Fields, AssignedReports, CompanyAdmin } from '../core/_models'
import AddFieldModal from './AddFieldModal'
import AddTabModal from './AddTabModal'
import EditFieldModal from './EditFieldModal'
import DeleteFieldModal from './DeleteFieldModal'
import EditReportModal from './EditReportModal'
import EditTabModal from './EditTabModal'
import AssignReportModal from './AssignReportModal'
import { auto } from '@popperjs/core'
import { getCompanyAdminList } from '../../Management/core/_requests'
import ConsumptionAndROB from './ConsumptionAndROB'
import { useAuth } from '../../auth'

const LibraryPage: FC = () => {
    // const roleId = sessionStorage.getItem("roleId");
    // const roleEntityId = sessionStorage.getItem("roleEntityId");
    const { currentUser } = useAuth()
    const roleId = currentUser?.role?.id;
    const roleEntityId = currentUser?.roleEntityId;
    /** OPERATOR BEHAVIOR SPLIT **/
const companyGroupAdminId =
  (currentUser as any)?.companyGroupAdminId ??
  (currentUser as any)?.companyGroupAdmin?.id ??
  null

const isOperator = roleId === 6
const isSuperadminOperator = isOperator && companyGroupAdminId == null   // acts like Superadmin
const isCompanyOperator   = isOperator && companyGroupAdminId != null    // acts like Company Group Admin

// Normalized “effective” role flags
const actsAsSuperadmin = roleId === 1 || isSuperadminOperator
const actsAsCga        = roleId === 5 || isCompanyOperator

// (optional) effective CGA id when acting as CGA
const effectiveCgaId = actsAsCga
  ? (roleId === 5 ? Number(roleEntityId) : Number(companyGroupAdminId))
  : undefined
    const [mode, setMode] = useState("master");
    const [companies, setCompanies] = useState<{ id: number, name: string }[]>([]);
    const [vessels, setVessels] = useState<{ id: number, name: string, imoNumber: string }[]>([]);
    const [companyAdmins, setCompanyAdmins] = useState<CompanyAdmin[]>([]);
    const [selectedVessel, setSelectedVessel] = useState<{ id: number, name: string, imoNumber: string }>({ id: 0, name: "", imoNumber: "" });
    const [selectedCompany, setSelectedCompany] = useState<{ id: number, name: string }>({ id: 0, name: "" });
    const [selectedCompanyAdmin, setSelectedCompanyAdmin] = useState<{ id: number, name: string }>({ id: 0, name: "" });
    const [vesselTypes, setVesselTypes] = useState<string[]>([]);
    const [selectedVesselType, setSelectedVesselType] = useState<string>("");
    const [isAssignReportModalOpen, setIsAssignReportModalOpen] = useState(false);
    const [isAddReportModalOpen, setIsAddReportModalOpen] = useState(false);
    const [isAddTabModalOpen, setIsAddTabModalOpen] = useState(false);
    const [isEditReportModalOpen, setIsEditReportModalOpen] = useState(false);
    const [isEditTabModalOpen, setIsEditTabModalOpen] = useState(false);
    const [isAddFieldModalOpen, setIsAddFieldModalOpen] = useState(false);
    const [isEditFieldModalOpen, setIsEditFieldModalOpen] = useState(false);
    const [isDeleteFieldModalOpen, setIsDeleteFieldModalOpen] = useState(false);
    const [reports, setReports] = useState<Reports[]>([]);
    const [fields, setFields] = useState<Fields[]>([]);
    const [selectedField, setSelectedField] = useState<Fields>();
    const [menuId, setMenuId] = useState(0);
    const [submenuId, setSubmenuId] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10); // Default to 10
    const [isFieldAdded, setIsFieldAdded] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [isConsumptionAndROB, setIsConsumptionAndROB] = useState<boolean>(false);
    const [shouldUseCompanyGroupAdmin, setShouldUseCompanyGroupAdmin] = useState(false);
    // Pagination logic
    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    const currentFields = fields.slice(indexOfFirstRow, indexOfLastRow);

    const totalPages = Math.ceil(fields.length / rowsPerPage);

    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    useEffect(() => {
        fetchReportsList();
        if (actsAsSuperadmin) {
            fetchCompanyAdmins();
        }
        // if (roleId !== "1") {
        //     setMode("company");
        // }
        // fetchCompanies();

    }, []);

    useEffect(() => {
        console.log(reports);
    }, [reports]);

    useEffect(() => {
        console.log(companies);
    }, [companies]);


    useEffect(() => {
        console.log("company admin id", selectedCompanyAdmin);
    }, [selectedCompanyAdmin]);

    useEffect(() => {
        console.log(selectedCompany);
    }, [selectedCompany]);

    useEffect(() => {
  if (actsAsCga && effectiveCgaId) {
    setSelectedCompanyAdmin({ id: effectiveCgaId, name: '' });
    fetchCompaniesbyCompanyAdmin(effectiveCgaId);
  }

  if (roleId === 2) {
    const subcompanyId = Number(roleEntityId);
    setSelectedCompany({ id: subcompanyId, name: '' });
    fetchVesselTypeByCompany(subcompanyId);
  }
}, [actsAsCga, effectiveCgaId, roleId, roleEntityId]);


    useEffect(() => {
        if (reports.length > 0 && reports[0]?.submenus?.length > 0) {
            if (isFieldAdded && submenuId) {
                handleTabClick(submenuId); // Keep current tab if field was added
                setIsFieldAdded(false); // Reset the flag
            } else {
                const firstTabId = reports[0].submenus[0].id;
                handleTabClick(firstTabId); // Default to first tab
                setSubmenuId(firstTabId);
            }
        }
    }, [reports]);

    useEffect(() => {
        fetchReportsList();
    }, [selectedCompanyAdmin, selectedCompany, selectedVesselType, selectedVessel]);

    const handleFieldAdded = async () => {
        setIsFieldAdded(true);
        const currentTabId = submenuId;
        await fetchReportsList();
        setSubmenuId(currentTabId); // Reapply selected tab
    };

    const onReportAdded = async (tempId: number) => {
        fetchReportsList();
        try {

            if (actsAsSuperadmin) {
                // Loop over each company and assign the report
                for (const companyAdmin of companyAdmins) {
                    try {
                        //create a clone for the template
                        const response = await assignReport(companyAdmin.id, tempId);
                        console.log(`Template assigned to company Admin ID ${companyAdmin.id}:`, response);
                    } catch (err) {
                        console.error(`Failed to assign template to company Admin ID ${companyAdmin.id}:`, err);
                    }
                }
            } else if (actsAsCga) {
                try {
                    //create a clone for the template
                    const response = await assignReport(selectedCompanyAdmin.id, tempId);
                    console.log(`Template assigned to company Admin ID ${selectedCompanyAdmin.id}:`, response);
                } catch (err) {
                    console.error(`Failed to assign template to company Admin ID ${selectedCompanyAdmin.id}:`, err);
                }
            }
        } catch (err) {
            console.error('Failed to assign template:', err);
        }
    };

    const fetchCompanyAdmins = async () => {
        try {
            const companyAdminList = await getCompanyAdminList();
            console.log('Company Admin List:', companyAdminList);

            const filteredCompanies = companyAdminList.filter(company => company.active === true);

            setCompanyAdmins(filteredCompanies);
        } catch (error) {
            console.error('Failed to fetch company admin list:', error);
        }
    };

    const fetchCompaniesbyCompanyAdmin = async (companyAdminId: number) => {
        try {
            const companyList = await getCompanyList();
            console.log('Company List:', companyList);

            const filteredCompanies = companyList.filter(company => company.cga?.id === companyAdminId && company.active === true);
            console.log("Filtered companies:", filteredCompanies);

            setCompanies(filteredCompanies);
            return filteredCompanies;
        } catch (error) {
            console.error('Failed to fetch company list:', error);
            return [];
        }
    };

    const fetchVesselTypeByCompanyAdmin = async (companyAdminId: number) => {

        try {
            const vesselList = await getVesselTypeList();

            console.log(vesselList);
            const filteredVessels = vesselList.filter(
                (vessel) => vessel.companyGroupAdmin?.id === companyAdminId
            );
            console.log(filteredVessels);

            // Extract vesselType names (including duplicates, if needed)
            const vesselTypeNames = filteredVessels.map(v => v.vesselType);

            // Optional: remove duplicates if you only want distinct names
            const distinctVesselTypes = Array.from(new Set(vesselTypeNames));
            setVesselTypes(distinctVesselTypes);

        } catch (error) {
            console.error('Failed to fetch vesseltype by company list:', error);
        }
    };

    const fetchVesselTypeByCompany = async (companyId: number) => {

        try {
            const vesselList = await getVesselTypeList();

            console.log(vesselList);
            const filteredVessels = vesselList.filter(
                (vessel) => vessel.companyAdmin?.id === companyId
            );
            console.log(filteredVessels);

            // Extract vesselType names (including duplicates, if needed)
            const vesselTypeNames = filteredVessels.map(v => v.vesselType);

            // Optional: remove duplicates if you only want distinct names
            const distinctVesselTypes = Array.from(new Set(vesselTypeNames));
            setVesselTypes(distinctVesselTypes);


        } catch (error) {
            console.error('Failed to fetch vesseltype by company list:', error);
        }
    };

    const fetchVesselsByVesselType = async (vesselType: string, companyId: number) => {

        try {
            const vesselList = await getVesselTypeList();
            console.log(vesselList);
            // Filter vessels by vesselType
            const filteredVessels = vesselList.filter(
                (vessel) => {
                    if (shouldUseCompanyGroupAdmin) {
                        console.log(selectedCompanyAdmin.id);
                        return (
                            vessel.vesselType === vesselType &&
                            vessel.companyGroupAdmin?.id === selectedCompanyAdmin.id
                        );
                    } else {
                        return (
                            vessel.vesselType === vesselType &&
                            vessel.companyAdmin?.id === companyId
                        );
                    }
                }
            );

            console.log(filteredVessels);

            // Extract only required fields: imoNumber, fleet_name, and id
            const vesselDetails = filteredVessels.map((vessel) => ({
                id: vessel.id,
                name: vessel.fleet_name,
                imoNumber: vessel.imoNumber,
            }));

            setVessels(vesselDetails);

        } catch (error) {
            console.error('Failed to fetch vessel by vesseltype list:', error);
        }
    };

    const handleTabClick = async (tabId: number) => {
        try {

            // Flatten all submenus from all reports
            const allSubmenus = reports.flatMap(report => report.submenus);

            // Find the submenu (tab) that matches the given tabId
            const targetTab = allSubmenus.find(submenu => submenu.id === tabId);

            if (targetTab) {
                // Set its fields to state
                setFields(targetTab.fields);
                setCurrentPage(1);            // ✅ Reset pagination to first page
            } else {
                console.warn(`No tab found with ID ${tabId}`);
                setFields([]);
                setCurrentPage(1);            // ✅ Also reset page here to avoid stale pagination
            }

            // const allfields = await getFieldsForTab(auth.jwt, tabId);

            // setFields(allfields);

        } catch (err) {
            console.error('Failed to fetch fields list:', err);
            return [];
        }
    };

    const fetchReportsList = async () => {
        try {

            let templateIDs: number[] = [];
            let filteredList: any[] = [];
            let allReports: any[] = [];

            if (selectedCompanyAdmin?.id === 0) {
                const fetched = await fetchTemplateIds();
                console.log("Basetemplates:", fetched);
                templateIDs = fetched ?? []; // fallback to [] if undefined
            } else {
                const templateList = await fetchAssignedTemplateIds();
                console.log(templateList);
                filteredList = templateList; // Save for later customTemplate.menus use

                console.log(filteredList);
                // Extract non-null templateId and customTemplateId into a flat array
                templateIDs = templateList
                    .filter(item => item.customTemplate == null && item.template != null)
                    .map(item => item.template!.id);

                console.log("Filtered Template IDs:", templateIDs);
                // const assigned = await fetchAssignedTemplateIds();
                // let assigned = await fetchCustomAssignedTemplateIds();
                // console.log("Custom Assigned TemplateIds:", assigned);
                // // Fallback to fetchTemplateIds if the first call returned nothing
                // if (!assigned || assigned.length === 0) {
                //     console.warn('No custom assigned templates found, fetching default assigned templates...');
                //     assigned = await fetchAssignedTemplateIds();
                //     console.log("Assigned TemplateIds:", assigned);
                // }
                // templateIDs = assigned ?? []; // fallback to [] if undefined
                // console.log("Assigned Template Ids", templateIDs);
            }

            console.log(filteredList);

            // ✅ Add customTemplate.menus as additional "reports"
            const customMenus = filteredList
                .filter(item => item.customTemplate && Array.isArray(item.customTemplate.menus))
                .flatMap(item => item.customTemplate!.menus!);


            console.log(customMenus);

            if (templateIDs && templateIDs.length > 0) {
                console.log("Final templateIDs:", templateIDs);

                if (templateIDs && templateIDs.length > 0) {
                    const reportsPerTemplateResults = await Promise.allSettled(
                        templateIDs.map(templateId => getReportsForTemplate(templateId))
                    );

                    console.log(reportsPerTemplateResults);

                    const reportsPerTemplate = reportsPerTemplateResults
                        .filter(result => result.status === 'fulfilled')
                        .map(result => (result as PromiseFulfilledResult<Reports[]>).value);

                    console.log(reportsPerTemplate);

                    allReports = reportsPerTemplate.flat();

                    console.log(allReports);

                    // Fetch tabs for each report
                    // const reportsWithTabs = await Promise.all(
                    //     allReports.map(async (report) => {
                    //         const submenus = await getTabsForReport(auth.jwt, report.id);
                    //         return { ...report, submenus }; // attach tabs to report
                    //     })
                    // );
                    // console.log("reports list: ", reportsWithTabs)
                } else {
                    console.warn('No template IDs found.');
                }
            }
            allReports = [...allReports, ...customMenus];

            console.log("All reports including customTemplate menus:", allReports);
            setReports(allReports); // ✅ Set state directly
        } catch (err) {
            console.error('Failed to fetch reports list:', err);
            return [];
        }
    };

    const fetchTemplateIds = async () => {
        try {

            const templateList = await getTemplateList();
            console.log(templateList);

            // Extract all IDs
            const templateIds: number[] = templateList
                .map(template => template.id);

            return templateIds;
        } catch (err) {
            console.error('Failed to fetch template list:', err);
        }
    };

    const fetchAssignedTemplateIds = async (): Promise<AssignedReports[]> => {
        try {

            let filteredList: any[] = [];

            if (selectedCompanyAdmin?.id !== 0 && selectedCompany?.id === 0 && selectedVesselType === '' && selectedVessel?.id === 0) {
                filteredList = await getAssignedTemplatesByCompanyAdmin(selectedCompanyAdmin.id);
                console.log(filteredList);
            } else if (selectedCompanyAdmin?.id !== 0 && selectedCompany.id !== 0 && selectedVesselType === '' && selectedVessel?.id === 0) {
                filteredList = await getAssignedTemplatesByCompany(selectedCompanyAdmin.id, selectedCompany.id);
                console.log(filteredList);
            } else if (selectedCompanyAdmin?.id !== 0 && selectedVesselType !== '' && selectedVessel?.id === 0) {
                filteredList = await getAssignedTemplatesByVesselType(selectedCompanyAdmin?.id, selectedCompany.id, selectedVesselType);
                console.log(filteredList);
            } else if (selectedCompanyAdmin?.id !== 0 && selectedVesselType !== '' && selectedVessel?.id !== 0) {
                filteredList = await getAssignedTemplatesByVesselId(selectedCompanyAdmin.id, selectedCompany.id, selectedVesselType, selectedVessel.id);
                console.log(filteredList);
            }

            console.log(filteredList);

            return filteredList;

        } catch (err) {
            console.error('Failed to fetch template list:', err);
            return [];
        }
    };

    return (
        <div
            className='app-main flex-column flex-row-fluid'
            id='kt_app_main'
            style={{
                display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden',
            }}
        >
            <div className='d-flex flex-column flex-column-fluid' style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }} >
                <div
                    id='kt_app_content'
                    className='app-content flex-column-fluid d-flex flex-column '
                    style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
                >
                    <div className='card d-flex flex-column border-top'
                        style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
                    >
                        {/* Header */}

                        <div className='align-items-center justify-content-start py-4 gap-2 gap-md-12 px-5 bg-white'  >
                            <div>
                                <div className='d-flex align-items-center gap-1'>
                                    <h3 className='card-title fw-bold text-dark'>Library</h3>
                                </div>
                                {<div className='d-flex gap-12'>
                                    <div className='pb-2'>Mode
                                        <div className='d-flex align-items-center gap-2'>
                                            <input
                                                type="radio"
                                                name='mode'
                                                value='master'
                                                checked={mode === "master"}
                                                onChange={(e) => {
                                                    setMode(e.target.value);
                                                    setVessels([]);
                                                    setVesselTypes([]);
                                                    setCompanies([]);
                                                    if (actsAsSuperadmin) {
                                                        setSelectedCompanyAdmin({ id: 0, name: "" });
                                                    }
                                                    setSelectedCompany({ id: 0, name: "" });
                                                    setSelectedVesselType("");
                                                    setSelectedVessel({ id: 0, name: "", imoNumber: "" });
                                                }}
                                            />
                                            <label>Master</label>
                                            <input
                                                type="radio"
                                                name='mode'
                                                value='company'
                                                checked={mode === "company"}
                                                onChange={(e) => {
                                                    setMode(e.target.value);
                                                    if (actsAsSuperadmin) {
                                                        setSelectedCompanyAdmin({ id: 0, name: "" });
                                                    }
                                                    setSelectedCompany({ id: 0, name: "" });
                                                    setSelectedVesselType("");
                                                    setSelectedVessel({ id: 0, name: "", imoNumber: "" });
                                                }}
                                            />
                                            <label>Company</label>
                                        </div>
                                    </div>

                                </div>}
                                <div className='d-flex gap-12'>
                                    {
                                        mode === "company" &&
                                        <>
                                            {actsAsSuperadmin && <div>
                                                Company
                                                <div>
                                                    <select
                                                        value={selectedCompanyAdmin.id}
                                                        onChange={(e) => {
                                                            setSelectedCompany({ id: 0, name: "" })
                                                            setSelectedVessel({ id: 0, name: "", imoNumber: "" });
                                                            setSelectedVesselType("")
                                                            const selectedId = parseInt(e.target.value, 10);
                                                            const selected = companyAdmins.find(c => c.id === selectedId);
                                                            setSelectedCompanyAdmin(selected || { id: 0, name: "" });
                                                            // fetchCompaniesbyCompanyAdmin(selectedId);
                                                            fetchCompaniesbyCompanyAdmin(selectedId).then((companyList) => {
                                                                console.log(companyList)
                                                                if (companyList?.length === 0) {
                                                                    fetchVesselTypeByCompanyAdmin(selectedId); // fallback
                                                                    setShouldUseCompanyGroupAdmin(true);
                                                                } else {
                                                                    fetchVesselTypeByCompany(0);
                                                                    setShouldUseCompanyGroupAdmin(false);
                                                                }
                                                            });
                                                            fetchVesselsByVesselType("", 0);

                                                        }}
                                                        className='form-select'
                                                    >
                                                        <option value="">--Select Company--</option>
                                                        {companyAdmins.map((companyAdmin, index) => (
                                                            <option key={index} value={companyAdmin.id}>{companyAdmin.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>}
                                            {(actsAsSuperadmin || actsAsCga) && <div>
                                                Sub Company
                                                <div>
                                                    <select
                                                        value={selectedCompany.id}
                                                        onChange={(e) => {
                                                            setSelectedVessel({ id: 0, name: "", imoNumber: "" });
                                                            setSelectedVesselType("")
                                                            const selectedId = parseInt(e.target.value, 10);
                                                            const selected = companies.find(c => c.id === selectedId);
                                                            setSelectedCompany(selected || { id: 0, name: "" });
                                                            fetchVesselTypeByCompany(selectedId)
                                                            fetchVesselsByVesselType("", 0);

                                                        }}
                                                        className='form-select'
                                                    >
                                                        <option value="">--Select Sub Company--</option>
                                                        {companies.map((company, index) => (
                                                            <option key={index} value={company.id}>{company.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>}
                                            <div>
                                                Vessel Type
                                                <div>
                                                    <select
                                                        onChange={(e) => {
                                                            setSelectedVessel({ id: 0, name: "", imoNumber: "" });
                                                            setSelectedVesselType(e.target.value)
                                                            fetchVesselsByVesselType(e.target.value, selectedCompany?.id)
                                                        }}
                                                        className='form-select'
                                                    >
                                                        <option value="">Select Vessel Type</option>
                                                        {vesselTypes.map((type, index) => (
                                                            <option key={index} value={type}>{type}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                Vessel
                                                <div>
                                                    <select
                                                        onChange={(e) => {
                                                            const selectedId = parseInt(e.target.value, 10);
                                                            const selected = vessels.find(v => v.id === selectedId);
                                                            setSelectedVessel(selected || { id: 0, name: "", imoNumber: "" });
                                                        }}
                                                        className='form-select'
                                                    >
                                                        <option value="">Select Vessel</option>
                                                        {vessels.map((vessel) => (
                                                            <option key={vessel.id} value={vessel.id}>
                                                                {vessel.name} (IMO: {vessel.imoNumber})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <button
                                                className="btn btn_primary align-self-center"
                                                onClick={() => { setIsAssignReportModalOpen(true) }}
                                            >
                                                Assign Reports
                                            </button>

                                        </>}
                                </div>
                            </div>
                        </div>

                        <div className='d-flex' style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                            <div className='px-3 pe-3 border-end py-3 bg-white' style={{ flex: 1, minHeight: 0, overflowY: auto}}>
                                <div className='d-flex justify-content-between align-items-center mb-1'>
                                    <h5 className='mb-0'>Reports</h5>
                                    {
                                        mode === "master" && (
                                            <div className='d-flex gap-2'>
                                                {reports.length !== 0 &&

                                                    <button
                                                        className="action-btn d-flex align-items-center justify-content-center"
                                                        onClick={() => { setIsEditReportModalOpen(true) }}
                                                    >
                                                        <KTSVG path='/media/map/settings.svg' className='svg-icon-1' />
                                                    </button>
                                                }
                                                <button
                                                    className="action-btn d-flex align-items-center justify-content-center"
                                                    style={{ color: '#1C325B' }}
                                                    onClick={() => { setIsAddReportModalOpen(true) }}
                                                >
                                                    <KTSVG path='/media/map/zoom-in.svg' className='svg-icon-1' />
                                                </button>
                                            </div>

                                        )
                                    }
                                </div>
                                {reports.filter(report => report.isActive).map((report, index) => (
                                    <div className="accordion" id="reportAccordion">
                                        {/* <!-- Report Type 1 --> */}
                                        <div key={report.id} className="accordion-item">
                                            <h2 className="accordion-header" id="headingOne">
                                                <button className={`accordion-button ${index !== 0 ? 'collapsed' : ''}`}
                                                    type="button" data-bs-toggle="collapse" data-bs-target={`#report-${report.id}`}
                                                    aria-expanded={index === 0 ? 'true' : 'false'}
                                                    aria-controls={`report-${report.id}`}>
                                                    {report.name}
                                                </button>
                                            </h2>
                                            <div id={`report-${report.id}`}
                                                className={`accordion-collapse collapse ${index === 0 ? 'show' : ''}`}
                                                aria-labelledby={`heading-${report.id}`} data-bs-parent="#reportAccordion">
                                                <div className="accordion-body" style={{ maxWidth: '100%' }}>
                                                    <div className='d-flex justify-content-between align-items-center'>
                                                        <h5 className='mb-0'>Tabs</h5>
                                                        {
                                                            mode === "master" && (
                                                                <div className='d-flex gap-2'>
                                                                    {report.submenus.length !== 0 &&
                                                                        <button
                                                                            className="action-btn d-flex align-items-center justify-content-center"
                                                                            onClick={() => {
                                                                                setMenuId(report.id);
                                                                                setIsEditTabModalOpen(true)
                                                                            }}
                                                                        >
                                                                            <KTSVG path='/media/map/settings.svg' className='svg-icon-1' />
                                                                        </button>}
                                                                    <button
                                                                        className="action-btn d-flex align-items-center justify-content-center"
                                                                        onClick={() => {
                                                                            setMenuId(report.id);
                                                                            setIsAddTabModalOpen(true)

                                                                        }}
                                                                    >
                                                                        <KTSVG path='/media/map/zoom-in.svg' className='svg-icon-1 ' />
                                                                    </button>
                                                                </div>)
                                                        }
                                                    </div>
                                                    <div className="mt-4 overflow-y-auto">
                                                        {report.submenus.filter(tab => tab.isActive).length === 0 ? (
                                                            <div className='text-center mt-2 text-muted'>No tabs available</div>
                                                        ) : (
                                                            <div className="mt-3 p-4 border rounded-1" style={{ borderColor: '#D1D5DB' }}>
                                                                {report.submenus.length > 0 && (report.submenus.filter(tab => tab.isActive).map((tab) => {
                                                                    const isActive = tab.id === submenuId; // ← define this inside the map
                                                                    return (
                                                                        <div
                                                                            key={tab.id}
                                                                            onClick={() => {
                                                                                if (tab.name === "Consumption & ROB") {
                                                                                    setIsConsumptionAndROB(true);
                                                                                } else {
                                                                                    setIsConsumptionAndROB(false);
                                                                                    handleTabClick(tab.id);
                                                                                    setSubmenuId(tab.id);
                                                                                }
                                                                            }}
                                                                            className={`mt-3 p-4 border rounded-1 ${isActive ? 'active-tab' : ''} hover-shadow`}
                                                                            style={{
                                                                                backgroundColor: isActive ? '#e2e8f0' : '#F9FAFB',
                                                                                borderColor: isActive ? '#1C325B' : '#D1D5DB',
                                                                                cursor: 'pointer',
                                                                                fontWeight: isActive ? '500' : 'normal'
                                                                            }}
                                                                        >
                                                                            {tab.name}
                                                                        </div>
                                                                    );
                                                                }))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                            </div>
                            <div className='px-5 py-3 d-flex flex-column' style={{ flex: 3, minHeight: 0, overflow: 'hidden' }}>

                                {isConsumptionAndROB ? <div className="container mt-4 overflow-auto">
                                    <h3>Consumption and ROB</h3>
                                    <p className="text-muted">It’s a sample form for submitting data.</p>
                                    <ConsumptionAndROB /> </div> :
                                    <>
                                        <div className='d-flex justify-content-between align-items-center mb-1'>
                                            <h5 className="mb-0">Fields</h5>
                                            {
                                                mode === "master" && <button
                                                    className="action-btn d-flex align-items-center justify-content-center"
                                                    onClick={() => { setIsAddFieldModalOpen(true) }}
                                                >
                                                    <KTSVG path='/media/map/zoom-in.svg' className='svg-icon-1' />
                                                </button>
                                            }

                                        </div>
                                        <div className="report-table table-responsive" style={{ marginBottom: '6rem' }}>
                                            <table className="table table-bordered align-middle">
                                                <thead className="table-header">
                                                    <tr>
                                                        <th rowSpan={2}>Label</th>
                                                        <th rowSpan={2}>Type</th>
                                                        <th rowSpan={2}>Required</th>
                                                        <th rowSpan={2}>Unit</th>
                                                        <th rowSpan={2}>Validation Type</th>
                                                        <th colSpan={2}>Validation Range</th>
                                                        {mode === "master" && (<th rowSpan={2}>Actions</th>)}
                                                    </tr>
                                                    <tr>
                                                        <th>Min Value</th>
                                                        <th>Max Value</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="table-body">
                                                    {currentFields.filter(field => field.isActive).length === 0 ? (
                                                        <th colSpan={8}><div className='text-center mt-4 text-muted'>No fields available</div></th>
                                                    ) :
                                                        (currentFields.filter(field => field.isActive).map((field) => (
                                                            <tr key={field.id}>
                                                                <td>{field.label}</td>
                                                                <td>{field.fieldType}</td>
                                                                <td>{field.required ? "Yes" : "No"}</td>
                                                                <td>{field.unit}</td>
                                                                <td>
                                                                    {field.warningOnly === "SOFT"
                                                                        ? "Soft"
                                                                        : field.warningOnly === "STRICT"
                                                                            ? "Strict"
                                                                            : null}
                                                                </td>
                                                                <td>{field.minValue}</td>
                                                                <td>{field.maxValue}</td>
                                                                {/* <td>
                                                        <span
                                                            className={`badge ${row.status === "Draft" ? "draft" : "submitted"
                                                                }`}
                                                        >
                                                            {row.status}
                                                        </span>
                                                    </td> */}

                                                                {
                                                                    mode === "master" && (
                                                                        <td>
                                                                            <button
                                                                                onClick={() => {
                                                                                    setSelectedField(field);
                                                                                    setIsEditFieldModalOpen(true);
                                                                                }}
                                                                                className="btn btn-sm px-0"
                                                                            >
                                                                                <KTSVG path='/media/map/edit-active.svg' className='' />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => {
                                                                                    setSelectedField(field);
                                                                                    setIsDeleteFieldModalOpen(true);
                                                                                }}
                                                                                className="btn btn-sm px-0">
                                                                                <KTSVG path='/media/map/trash.svg' className='' />
                                                                            </button>
                                                                        </td>
                                                                    )
                                                                }

                                                            </tr>
                                                        )))}
                                                </tbody>
                                            </table>
                                            {/* Pagination */}
                                            <div className="pagination-wrapper d-flex justify-content-between align-items-center">
                                                <div>
                                                    Rows per page
                                                    <select
                                                        className="form-select d-inline-block w-auto ms-2"
                                                        style={{ borderRadius: "20px" }}
                                                        value={rowsPerPage}
                                                        onChange={(e) => {
                                                            setRowsPerPage(Number(e.target.value));
                                                            setCurrentPage(1); // reset to first page when changing rows per page
                                                        }}
                                                    >
                                                        <option value={10}>10</option>
                                                        <option value={20}>20</option>
                                                        <option value={50}>50</option>
                                                    </select>
                                                </div>

                                                <nav>
                                                    <ul className="pagination">
                                                        <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                                                            <button
                                                                className="page-link"
                                                                onClick={() => goToPage(currentPage - 1)}>
                                                                ‹
                                                            </button>
                                                        </li>
                                                        {Array.from({ length: totalPages }, (_, i) => (
                                                            <li key={i + 1} className={`page-item ${currentPage === i + 1 ? "active" : ""}`}>
                                                                <button className="page-link" onClick={() => goToPage(i + 1)}>{i + 1}</button>
                                                            </li>
                                                        ))}

                                                        <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                                                            <button className="page-link" onClick={() => goToPage(currentPage + 1)}>›</button>
                                                        </li>
                                                    </ul>
                                                </nav>
                                            </div>
                                        </div>
                                    </>
                                }
                            </div>
                        </div>
                    </div>
                    {isAddReportModalOpen && (
                        <AddReportModal
                            isOpen={isAddReportModalOpen}
                            onClose={() => { setIsAddReportModalOpen(false) }}
                            onReportAdded={onReportAdded}
                        />
                    )}
                    {isEditReportModalOpen && (
                        <EditReportModal
                            isOpen={isEditReportModalOpen}
                            onClose={() => { setIsEditReportModalOpen(false) }}
                            onReportAdded={fetchReportsList}
                        />
                    )}
                    {isAssignReportModalOpen && (
                        <AssignReportModal
                            isOpen={isAssignReportModalOpen}
                            onClose={() => { setIsAssignReportModalOpen(false) }}
                            companyAdminId={selectedCompanyAdmin?.id}
                            companyId={selectedCompany.id}
                            vesselType={selectedVesselType}
                            vesselId={selectedVessel.id}
                            onReportAssigned={fetchReportsList}
                        />
                    )}
                    {isAddTabModalOpen && (
                        <AddTabModal
                            isOpen={isAddTabModalOpen}
                            onClose={() => { setIsAddTabModalOpen(false) }}
                            menuId={menuId}
                            onTabAdded={fetchReportsList}
                        />
                    )}
                    {isEditTabModalOpen && (
                        <EditTabModal
                            isOpen={isEditTabModalOpen}
                            onClose={() => { setIsEditTabModalOpen(false) }}
                            menuId={menuId}
                            onTabAdded={fetchReportsList}
                        />
                    )}
                    {isAddFieldModalOpen && (
                        <AddFieldModal isOpen={isAddFieldModalOpen}
                            onClose={() => { setIsAddFieldModalOpen(false) }}
                            submenuId={submenuId}
                            onFieldAdded={handleFieldAdded}
                        />
                    )}
                    {isEditFieldModalOpen && (
                        <EditFieldModal
                            isOpen={isEditFieldModalOpen}
                            onClose={() => { setIsEditFieldModalOpen(false) }}
                            fieldData={selectedField}
                            onFieldEdited={handleFieldAdded}
                        />
                    )}
                    {isDeleteFieldModalOpen && (
                        <DeleteFieldModal
                            isOpen={isDeleteFieldModalOpen}
                            onClose={() => { setIsDeleteFieldModalOpen(false) }}
                            submenuId={submenuId}
                            fieldId={selectedField ? selectedField.id : 0}
                            labelName={selectedField ? selectedField.label : ""}
                            onFieldDeleted={handleFieldAdded}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}

export { LibraryPage }
