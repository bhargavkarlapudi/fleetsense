// VesselMap.tsx
import React, { useEffect, useState } from 'react';
import { KTSVG } from '../../../../_metronic/helpers';
import { useAuth } from '../../../modules/auth';
import { getCompanyList } from '../../../modules/operations/core/_requests';
import { getCompanyAdminList, getVesselList } from '../../../modules/Management/core/_requests';
import { Company, CompanyAdmin, Vessel } from '../core/_models';
import { getVesselDetails } from '../core/_requests';
type StatusConfig = {
    className: string
    style?: React.CSSProperties
    image?: string
    label: string
}

interface VesselsViewProps {
    setFilteredVessels: React.Dispatch<React.SetStateAction<Vessel[]>>;
}

const VesselsView: React.FC<VesselsViewProps> = ({ setFilteredVessels }) => {
    // const roleId = sessionStorage.getItem('roleId'); // Fetch roleId from sessionStorage
    // const roleEntityId = sessionStorage.getItem('roleEntityId'); // Fetch roleEntityId from sessionStorage
    const { currentUser } = useAuth()
    const roleId = currentUser?.role?.id;
    const roleEntityId = currentUser?.roleEntityId;
        /** OPERATOR BEHAVIOR SPLIT **/
const companyGroupAdminId =
  (currentUser as any)?.companyGroupAdminId ??
  (currentUser as any)?.companyGroupAdmin?.id ??
  null;

const isOperator = roleId === 6;
const isSuperadminOperator = isOperator && companyGroupAdminId == null;   // acts like Superadmin
const isCompanyOperator   = isOperator && companyGroupAdminId != null;    // acts like Company Group Admin

// Single source of truth for "which CGA are we acting as" when behaving like CGA
const effectiveCgaId: number | null =
  roleId === 5
    ? Number(roleEntityId)
    : isCompanyOperator
      ? Number(companyGroupAdminId)
      : null;

    const [companies, setCompanies] = useState<Company[]>([]);
    const [selectedCompany, setSelectedCompany] = useState<Company>();
    const [companyAdmins, setCompanyAdmins] = useState<CompanyAdmin[]>([]);
    const [vessels, setVessels] = useState<Vessel[]>([]);
    const [vesselsByCompany, setVesselsByCompany] = useState<{ [companyId: number]: Vessel[] }>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedVessel, setSelectedVessel] = useState<Vessel>();
    const [filteredVesselCount, setFilteredVesselCount] = useState<number>(0);
    const [vesselExtras, setVesselExtras] = useState<Record<number, { nextPort: string; eta: string, status: string }>>({});

    const statuses = ['At Sea', 'Anchor', 'In Port'];
    const ports = ['PORT SUDAN', 'HOUSTON', 'SINGAPORE', 'ROTTERDAM', 'VILA DO CONDE'];
    const etas = [
        '2025-01-05, 08:00 UTC',
        '2025-02-21, 16:00 UTC',
        '2025-03-10, 11:00 UTC',
        '2025-04-01, 13:30 UTC',
    ];

    useEffect(() => {
        fetchCompanyAdmins();
        fetchCompanies();
        fetchVessels();
    }, []);

    useEffect(() => {

        const allVessels = Object.values(vessels).flat();
        if (allVessels.length > 0) {
            fetchExtraVesselData(allVessels);
        }
    }, [vessels]);

    useEffect(() => {
    if ((roleId === 1 || isSuperadminOperator) && companies.length > 0) {
            companies.filter(company => company?.active === true).forEach((company) => {
                if (!vesselsByCompany[company?.id]) {
                    fetchVesselsByCompany(company?.id);
                }
            });
        }
    }, [roleId, companies, isSuperadminOperator]);

    useEffect(() => {
    // Company Group Admin OR Operator under a Company Group
    if (roleId === 5 || isCompanyOperator) {
        const adminCompanies = companies.filter(
          c => c.active && c.cga?.id === Number(effectiveCgaId)
        );
        adminCompanies.forEach(company => {
            fetchVesselsByCompany(company?.id);
        });
    }

    // Company Admin stays as-is (uses roleEntityId as you had)
    if (roleId === 2) {
        const adminCompanies = companies.filter(
          c => c.active && c.cga?.id === Number(roleEntityId)
        );
        adminCompanies.forEach(company => {
            fetchVesselsByCompany(company?.id);
        });
    }
}, [roleId, roleEntityId, companies, isCompanyOperator, effectiveCgaId]);

    useEffect(() => {
        let finalVessels: Vessel[] = [];

            if (roleId === 1 || roleId === 5 || isSuperadminOperator || isCompanyOperator) {
            const companyVessels = Object.values(vesselsByCompany).flat();

            const orphanVessels = Object.values(vessels)
                .flat()
                .filter(vessel => !vessel.companyAdmin?.id); // same for both roles 1 and 5

            finalVessels = [...companyVessels, ...orphanVessels];
        } else if (roleId === 2) {
            finalVessels = vessels || [];
        } else {
            finalVessels = vessels as Vessel[];
        }

        // Set both vessels and count
        setFilteredVessels(finalVessels);
        setFilteredVesselCount(finalVessels.length);
    }, [roleId, roleEntityId, vesselsByCompany, vessels]);

    const fetchExtraVesselData = async (vessels: Vessel[]) => {
        const updatedExtras: Record<number, { nextPort: string; eta: string, status: string }> = {};

        await Promise.all(
            vessels.map(async (v) => {
                try {
                    const extraData = await getVesselDetails(v.id);
                    console.log("extra data:", extraData);
                    updatedExtras[v.id] = {
                        nextPort: extraData?.nextPort || "Unknown",
                        eta: extraData?.eta || "Unknown",
                        status: extraData?.status || "Unknown"
                    };
                } catch (e) {
                    updatedExtras[v.id] = { nextPort: "N/A", eta: "N/A", status: "N/A" };
                }
            })
        );

        setVesselExtras((prev) => ({ ...prev, ...updatedExtras }));
    };

    const getRandomPacificCoords = (): [number, number] => {
        const lat = +(Math.random() * 120 - 60).toFixed(4); // -60 to +60 latitude
        const lon = +(Math.random() * 170 + 120).toFixed(4); // 120 to 290 longitude (wraps around globe)

        // Convert longitudes > 180 to negative values (for western hemisphere representation)
        const normalizedLon = lon > 180 ? lon - 360 : lon;

        return [normalizedLon, lat];
    };

    const getRandomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    const fetchVessels = async () => {
        try {
            const vesselList = await getVesselList();

            const vesselsWithRandomData = vesselList.map((vessel) => ({
                ...vessel,
                status: getRandomItem(statuses),
                port: getRandomItem(ports),
                eta: getRandomItem(etas),
                coords: getRandomPacificCoords(),  // <- now generates lat/lon dynamically
            }));


            setVessels(vesselsWithRandomData);
        } catch (error) {
            console.error('Failed to fetch company list:', error);
        }
    };

    const fetchVesselsByCompany = async (companyId: number) => {

        try {
            const vesselList = await getVesselList();
            const vesselsForCompany = vesselList
                .filter(vessel => vessel.companyAdmin?.id === companyId)
                .map((vessel) => ({
                    ...vessel,
                    status: getRandomItem(statuses),
                    port: getRandomItem(ports),
                    eta: getRandomItem(etas),
                    coords: getRandomPacificCoords(),
                }));

            setVesselsByCompany(prev => ({
                ...prev,
                [companyId]: vesselsForCompany
            }));

        } catch (error) {
            console.error('Failed to fetch vessels:', error);
        }
    };

    const fetchCompanyAdmins = async () => {
        try {
            const companyList = await getCompanyAdminList();

            setCompanyAdmins(companyList);
        } catch (error) {
            console.error('Failed to fetch company list:', error);
        }
    };

    const fetchCompanies = async () => {
        try {
            const companyList = await getCompanyList();

            setCompanies(companyList);
        } catch (error) {
            console.error('Failed to fetch company list:', error);
        }
    };

    const statusClass = (status: string) => {
        if (status === 'At Sea') return 'badge bg-success';
        if (status === 'Anchor') return 'badge bg-warning text-dark';
        if (status === 'In Port') return 'badge bg-primary';
        return 'badge bg-secondary';
    };

    const getStatusConfig = (status: string): StatusConfig => {
        switch (status) {
            case 'At Sea':
                return {
                    className: 'badge ',
                    style: { backgroundColor: '#D5F5F6' },
                    image: '/media/icons/duotune/status/ship.svg',
                    label: 'At Sea',
                }
            case 'Anchor':
                return {
                    className: 'badge',
                    style: { backgroundColor: '#FDF6B2' },
                    image: '/media/icons/duotune/status/anchor.svg',
                    label: 'Anchor',
                }
            case 'In Port':
                return {
                    className: 'badge ',
                    style: { backgroundColor: '#A5A6F6' },
                    image: '/media/icons/duotune/status/port.svg',
                    label: 'In Port',
                }
            default:
                return {
                    className: 'badge bg-secondary text-white',
                    image: '/media/icons/unknown.svg',
                    label: status,
                }
        }
    }

    return (
        <div style={{ maxWidth: '20rem' }} className={`border-end pt-5 overflow-auto bg-white`}>
            <div className="d-flex justify-content-between align-items-center pe-3 gap-3" style={{ paddingLeft: '2.4rem' }}>
                <h5 className='m-0'>Vessel List</h5>
                <p className='m-0' style={{ color: '#6B7280', fontWeight: '400' }}>
                    {/* {roleId === '1'
                        ? companyAdmins.reduce((count, admin) => count + companies.reduce((c, co) => c + vessels.length, 0), 0)
                        : '12'}  */}
                    {filteredVesselCount} {filteredVesselCount === 1 ? "Vessel" : "Vessels"}
                </p>
            </div>
            <div className="d-flex align-items-center gap-2 mb-3 pe-3" style={{ paddingLeft: '2.4rem' }}>
                {/* <select
                    className="form-select"
                    value={searchTerm}
                    onChange={handleSearchChange}
                >
                    {<option value="">Select Vessel</option>}
                    {vessels.map((vessel, index) => (
                        <option key={index} value={vessel.fleet_name}>
                            {vessel.fleet_name}
                        </option>
                    ))}
                </select>
                {/* <input type="text" className="form-control cp_search_input" placeholder=" Search" />
                <KTSVG path="/media/icons/duotune/general/filter.svg" className="svg-icon-2x" /> */}
            </div>

            <div style={{ paddingLeft: '1.5rem' }}>
                {(roleId === 1 || isSuperadminOperator) ? (
                    <div className="accordion" id="adminAccordion">
                        {companyAdmins.filter(ca => ca.active).map((admin) => {
                            const adminCompanies = companies.filter(c => c.active && c.cga?.id === admin.id);

                            // Orphan vessels directly under the companyAdmin (not tied to a company)
                            const orphanVessels = Object.values(vessels)
                                .flat()
                                .filter(
                                    vessel =>
                                        (!vessel.companyAdmin?.id || !companies.some(c => c.id === vessel.companyAdmin?.id)) &&
                                        vessel.companyGroupAdmin?.id === admin.id
                                );

                            return (
                                <div key={admin.id} className="accordion-item">
                                    <h2 className="accordion-header" id={`heading-admin-${admin.id}`}>
                                        <button
                                            className="accordion-button collapsed"
                                            type="button"
                                            data-bs-toggle="collapse"
                                            data-bs-target={`#collapse-admin-${admin.id}`}
                                            aria-expanded="false"
                                            aria-controls={`collapse-admin-${admin.id}`}
                                            style={{ minWidth: 0 }} // Allows child span to shrink inside flex
                                        >
                                            <span
                                                className="text-truncate"
                                                title={admin.name}
                                                style={{
                                                    display: 'inline-block',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    maxWidth: '100%' // or use a fixed width like '180px'
                                                }}
                                            >
                                                {admin.name}
                                            </span>
                                        </button>
                                    </h2>
                                    <div
                                        id={`collapse-admin-${admin.id}`}
                                        className="accordion-collapse collapse"
                                        aria-labelledby={`heading-admin-${admin.id}`}
                                        data-bs-parent="#adminAccordion"
                                    >
                                        <div className="accordion-body">

                                            {/* Orphan Vessels */}
                                            {orphanVessels.length > 0 && (
                                                <>
                                                    <ul className="list-group mb-3">
                                                        {orphanVessels.map((vessel, idx) => {
                                                            const statusValue = vesselExtras[vessel.id]?.status; // fetch from vesselExtras
                                                            const status = getStatusConfig(statusValue); // get config based on that
                                                            return (
                                                                <li key={idx} className="list-group-item px-0" style={{ backgroundColor: '#F4F9FF', maxWidth: '16rem' }}>
                                                                    <div className="d-flex justify-content-between align-items-center">
                                                                        <span
                                                                            className="fw-bold text-truncate"
                                                                            title={vessel.fleet_name}
                                                                            style={{
                                                                                display: 'inline-block',
                                                                                overflow: 'hidden',
                                                                                textOverflow: 'ellipsis',
                                                                                whiteSpace: 'nowrap',
                                                                                maxWidth: '60%', // Adjust based on layout
                                                                                minWidth: 0,
                                                                            }}
                                                                        >
                                                                            {vessel.fleet_name}
                                                                        </span>

                                                                        {status.label !== "--:--" &&
                                                                            <div
                                                                                className={`d-flex align-items-center gap-1 ${status?.className}`}
                                                                                style={{
                                                                                    ...status?.style,
                                                                                    minWidth: 0,
                                                                                    maxWidth: '40%', // Optional to prevent overflow
                                                                                }}
                                                                            >
                                                                                {status?.image && (
                                                                                    <img
                                                                                        src={status.image}
                                                                                        alt={status.label}
                                                                                        className="me-1"
                                                                                        style={{ height: '14px', flexShrink: 0 }}
                                                                                    />
                                                                                )}
                                                                                <span
                                                                                    className="text-truncate"
                                                                                    title={status?.label}
                                                                                    style={{
                                                                                        display: 'inline-block',
                                                                                        overflow: 'hidden',
                                                                                        textOverflow: 'ellipsis',
                                                                                        whiteSpace: 'nowrap',
                                                                                        maxWidth: '100%',
                                                                                        flexShrink: 1,
                                                                                    }}
                                                                                >
                                                                                    {status?.label || "--"}
                                                                                </span>
                                                                            </div>}
                                                                    </div>
                                                                    <div className="vessel_details">Next port: {vesselExtras[vessel.id]?.nextPort && vesselExtras[vessel.id].nextPort !== "--:--" ? vesselExtras[vessel.id]?.nextPort : "--"}</div>
                                                                    <div className="vessel_details">ETA: {vesselExtras[vessel.id]?.eta && vesselExtras[vessel.id].eta !== "--:--"
                                                                        ? new Date(vesselExtras[vessel.id].eta).toLocaleString('en-GB', {
                                                                            day: '2-digit',
                                                                            month: 'short',
                                                                            year: 'numeric',
                                                                            hour: '2-digit',
                                                                            minute: '2-digit',
                                                                            hour12: true,
                                                                        })
                                                                        : '--'}
                                                                    </div>
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                </>
                                            )}

                                            {/* Companies under CompanyAdmin */}
                                            <div className="accordion" id={`companyAccordion-${admin.id}`}>
                                                {adminCompanies.map((company) => (
                                                    <div key={company.id} className="accordion-item">
                                                        <h2 className="accordion-header" id={`heading-company-${company.id}`}>
                                                            <button
                                                                onClick={() => setSelectedCompany(company)}
                                                                className="accordion-button collapsed"
                                                                type="button"
                                                                data-bs-toggle="collapse"
                                                                data-bs-target={`#collapse-company-${company.id}`}
                                                                aria-expanded="false"
                                                                aria-controls={`collapse-company-${company.id}`}
                                                            >
                                                                {company.name}
                                                            </button>
                                                        </h2>
                                                        <div
                                                            id={`collapse-company-${company.id}`}
                                                            className="accordion-collapse collapse"
                                                            aria-labelledby={`heading-company-${company.id}`}
                                                            data-bs-parent={`#companyAccordion-${admin.id}`}
                                                        >
                                                            <div className="accordion-body">
                                                                <ul className="list-group">
                                                                    {(vesselsByCompany[company.id] || []).map((vessel, idx) => {
                                                                        const statusValue = vesselExtras[vessel.id]?.status; // fetch from vesselExtras
                                                                        const status = getStatusConfig(statusValue); // get config based on that
                                                                        return (
                                                                            <li key={idx} className="list-group-item px-0" style={{ backgroundColor: '#F4F9FF', maxWidth: '100%' }}>
                                                                                <div className="d-flex justify-content-between">
                                                                                    <div className="fw-bold">{vessel.fleet_name}</div>
                                                                                    {status.label !== "--:--" &&
                                                                                        <div
                                                                                            className={`d-flex align-items-center gap-1 ${status?.className}`}
                                                                                            style={{
                                                                                                ...status?.style,
                                                                                                minWidth: 0,
                                                                                                maxWidth: '40%', // Optional to prevent overflow
                                                                                            }}
                                                                                        >
                                                                                            {status?.image && (
                                                                                                <img
                                                                                                    src={status.image}
                                                                                                    alt={status.label}
                                                                                                    className="me-1"
                                                                                                    style={{ height: '14px', flexShrink: 0 }}
                                                                                                />
                                                                                            )}
                                                                                            <span
                                                                                                className="text-truncate"
                                                                                                title={status?.label}
                                                                                                style={{
                                                                                                    display: 'inline-block',
                                                                                                    overflow: 'hidden',
                                                                                                    textOverflow: 'ellipsis',
                                                                                                    whiteSpace: 'nowrap',
                                                                                                    maxWidth: '100%',
                                                                                                    flexShrink: 1,
                                                                                                }}
                                                                                            >
                                                                                                {status?.label || "--"}
                                                                                            </span>
                                                                                        </div>}
                                                                                </div>
                                                                                <div className="vessel_details">Next port: {vesselExtras[vessel.id]?.nextPort && vesselExtras[vessel.id].nextPort !== "--:--" ? vesselExtras[vessel.id]?.nextPort : "--"}</div>
                                                                                <div className="vessel_details">ETA: {vesselExtras[vessel.id]?.eta && vesselExtras[vessel.id].eta !== "--:--"
                                                                                    ? new Date(vesselExtras[vessel.id].eta).toLocaleString('en-GB', {
                                                                                        day: '2-digit',
                                                                                        month: 'short',
                                                                                        year: 'numeric',
                                                                                        hour: '2-digit',
                                                                                        minute: '2-digit',
                                                                                        hour12: true,
                                                                                    })
                                                                                    : '--'}
                                                                                </div>
                                                                            </li>
                                                                        );
                                                                    })}
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (roleId === 5 || isCompanyOperator) ? (
                    <div>
                        {(() => {
                            const orphanVessels = Object.values(vessels)
                                .flat()
                                .filter(
                                    vessel =>
                                        (!vessel.companyAdmin?.id || !companies.some(c => c.id === vessel.companyAdmin?.id)) &&
                                        vessel.companyGroupAdmin?.id === Number(effectiveCgaId)
                                );

                            const subCompanies = companies.filter(c => c.active && c.cga.id === Number(effectiveCgaId));

                            return (
                                <>
                                    {orphanVessels.length > 0 && (
                                        <div className="mb-4">
                                            <ul className="list-group">
                                                {orphanVessels.map((vessel, idx) => {

                                                    const statusValue = vesselExtras[vessel.id]?.status; // fetch from vesselExtras
                                                    const status = getStatusConfig(statusValue); // get config based on that
                                                    return (
                                                        <li key={idx} className="list-group-item" style={{ maxWidth: '100%' }}>
                                                            <div className="d-flex justify-content-between">
                                                                <div className="fw-bold">{vessel.fleet_name}</div>
                                                                {status.label !== "--:--" &&
                                                                    <div
                                                                        className={`d-flex align-items-center gap-1 ${status?.className}`}
                                                                        style={{
                                                                            ...status?.style,
                                                                            minWidth: 0,
                                                                            maxWidth: '40%', // Optional to prevent overflow
                                                                        }}
                                                                    >
                                                                        {status?.image && (
                                                                            <img
                                                                                src={status.image}
                                                                                alt={status.label}
                                                                                className="me-1"
                                                                                style={{ height: '14px', flexShrink: 0 }}
                                                                            />
                                                                        )}
                                                                        <span
                                                                            className="text-truncate"
                                                                            title={status?.label}
                                                                            style={{
                                                                                display: 'inline-block',
                                                                                overflow: 'hidden',
                                                                                textOverflow: 'ellipsis',
                                                                                whiteSpace: 'nowrap',
                                                                                maxWidth: '100%',
                                                                                flexShrink: 1,
                                                                            }}
                                                                        >
                                                                            {status?.label || "--"}
                                                                        </span>
                                                                    </div>}
                                                            </div>
                                                            <div className="vessel_details">Next port: {vesselExtras[vessel.id]?.nextPort && vesselExtras[vessel.id].nextPort !== "--:--" ? vesselExtras[vessel.id]?.nextPort : "--"}</div>
                                                            <div className="vessel_details">ETA: {vesselExtras[vessel.id]?.eta && vesselExtras[vessel.id].eta !== "--:--"
                                                                ? new Date(vesselExtras[vessel.id].eta).toLocaleString('en-GB', {
                                                                    day: '2-digit',
                                                                    month: 'short',
                                                                    year: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                    hour12: true,
                                                                })
                                                                : '--'}
                                                            </div>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="accordion" id="companyAccordionRole5">
                                        {subCompanies.map((company) => (
                                            <div key={company.id} className="accordion-item">
                                                <h2 className="accordion-header" id={`heading-companyRole5-${company.id}`}>
                                                    <button
                                                        className="accordion-button collapsed"
                                                        type="button"
                                                        data-bs-toggle="collapse"
                                                        data-bs-target={`#collapse-companyRole5-${company.id}`}
                                                        aria-expanded="false"
                                                        aria-controls={`collapse-companyRole5-${company.id}`}
                                                    >
                                                        {company.name}
                                                    </button>
                                                </h2>
                                                <div
                                                    id={`collapse-companyRole5-${company.id}`}
                                                    className="accordion-collapse collapse"
                                                    aria-labelledby={`heading-companyRole5-${company.id}`}
                                                    data-bs-parent="#companyAccordionRole5"
                                                >
                                                    <div className="accordion-body">
                                                        <ul className="list-group">
                                                            {(vesselsByCompany[company.id] || []).map((vessel, idx) => {

                                                                const statusValue = vesselExtras[vessel.id]?.status; // fetch from vesselExtras
                                                                const status = getStatusConfig(statusValue); // get config based on that
                                                                return (
                                                                    <li key={idx} className="list-group-item" style={{ maxWidth: '100%' }}>
                                                                        <div className="d-flex justify-content-between">
                                                                            <div className="fw-bold">{vessel.fleet_name}</div>
                                                                            {status.label !== "--:--" &&
                                                                                <div
                                                                                    className={`d-flex align-items-center gap-1 ${status?.className}`}
                                                                                    style={{
                                                                                        ...status?.style,
                                                                                        minWidth: 0,
                                                                                        maxWidth: '40%', // Optional to prevent overflow
                                                                                    }}
                                                                                >
                                                                                    {status?.image && (
                                                                                        <img
                                                                                            src={status.image}
                                                                                            alt={status.label}
                                                                                            className="me-1"
                                                                                            style={{ height: '14px', flexShrink: 0 }}
                                                                                        />
                                                                                    )}
                                                                                    <span
                                                                                        className="text-truncate"
                                                                                        title={status?.label}
                                                                                        style={{
                                                                                            display: 'inline-block',
                                                                                            overflow: 'hidden',
                                                                                            textOverflow: 'ellipsis',
                                                                                            whiteSpace: 'nowrap',
                                                                                            maxWidth: '100%',
                                                                                            flexShrink: 1,
                                                                                        }}
                                                                                    >
                                                                                        {status?.label || "--"}
                                                                                    </span>
                                                                                </div>}
                                                                        </div>
                                                                        <div className="vessel_details">Next port: {vesselExtras[vessel.id]?.nextPort && vesselExtras[vessel.id].nextPort !== "--:--" ? vesselExtras[vessel.id]?.nextPort : "--"}</div>
                                                                        <div className="vessel_details">ETA: {vesselExtras[vessel.id]?.eta && vesselExtras[vessel.id].eta !== "--:--"
                                                                            ? new Date(vesselExtras[vessel.id].eta).toLocaleString('en-GB', {
                                                                                day: '2-digit',
                                                                                month: 'short',
                                                                                year: 'numeric',
                                                                                hour: '2-digit',
                                                                                minute: '2-digit',
                                                                                hour12: true,
                                                                            })
                                                                            : '--'}
                                                                        </div>
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                ) : roleId === 2 ? (
                    <>
                        <ul className="list-group">
                            {/* Example flat vessel list */}

                            {(vessels).map((vessel, idx) => {

                                const statusValue = vesselExtras[vessel.id]?.status; // fetch from vesselExtras
                                const status = getStatusConfig(statusValue); // get config based on that
                                return (
                                    <li key={idx} className="list-group-item px-0" style={{ backgroundColor: '#F4F9FF', maxWidth: '100%' }}>
                                        <div className="d-flex justify-content-between">
                                            <div className="fw-bold">{vessel.fleet_name}</div>
                                            {status.label !== "--:--" &&
                                                <div
                                                    className={`d-flex align-items-center gap-1 ${status?.className}`}
                                                    style={{
                                                        ...status?.style,
                                                        minWidth: 0,
                                                        maxWidth: '40%', // Optional to prevent overflow
                                                    }}
                                                >
                                                    {status?.image && (
                                                        <img
                                                            src={status.image}
                                                            alt={status.label}
                                                            className="me-1"
                                                            style={{ height: '14px', flexShrink: 0 }}
                                                        />
                                                    )}
                                                    <span
                                                        className="text-truncate"
                                                        title={status?.label}
                                                        style={{
                                                            display: 'inline-block',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            maxWidth: '100%',
                                                            flexShrink: 1,
                                                        }}
                                                    >
                                                        {status?.label || "--"}
                                                    </span>
                                                </div>}
                                        </div>
                                        <div className="vessel_details">Next port: {vesselExtras[vessel.id]?.nextPort && vesselExtras[vessel.id].nextPort !== "--:--" ? vesselExtras[vessel.id]?.nextPort : "--"}</div>
                                        <div className="vessel_details">ETA: {vesselExtras[vessel.id]?.eta && vesselExtras[vessel.id].eta !== "--:--"
                                            ? new Date(vesselExtras[vessel.id].eta).toLocaleString('en-GB', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: true,
                                            })
                                            : '--'}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </>
                ) : (<></>)}
            </div>

        </div>
    );
};

export default VesselsView;
