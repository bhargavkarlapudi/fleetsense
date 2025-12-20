import { FC, useRef, useState } from 'react'
import { KTSVG } from '../../../../_metronic/helpers'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth'
import { updatedSubmittedReport } from '../core/_requests'
import { ReportStatus, Submenu, Voyage } from '../core/_models'
import { auto } from '@popperjs/core'

interface PreviewReportLocationState {
    formData: {
        [tabId: number]: {
            [label: string]: {
                id: string;
                value: any;
            };
        };
    };
    tabs: Submenu[];
    assignmentId: number;
    selectedVoyage: Voyage;
    stepCompletionStatus: boolean[];
    selectedReport: any;
    reportDate: string;
    readOnly: boolean;
    allValues: any;
    vesselId: number;
}

const PreviewReportModal: FC = () => {

    // const step = tabs[currentStep];
    // const roleId = sessionStorage.getItem("roleId");
    const { currentUser } = useAuth()
    const roleId = currentUser?.role?.id;
        const location = useLocation();
    const [remarks, setRemarks] = useState('');
        const { formData, tabs, assignmentId, selectedVoyage, stepCompletionStatus, selectedReport, reportDate, readOnly = false, allValues, vesselId } = location.state as PreviewReportLocationState;

    /** OPERATOR BEHAVIOR SPLIT **/
const companyGroupAdminId =
  (currentUser as any)?.companyGroupAdminId ??
  (currentUser as any)?.companyGroupAdmin?.id ??
  null

const isOperator = roleId === 6
const isSuperadminOperator = isOperator && companyGroupAdminId == null   // acts like Superadmin
const isCompanyOperator   = isOperator && companyGroupAdminId != null    // acts like Company Group Admin

// Normalized role behavior flags we’ll use for UI checks
const actsAsSuperadmin = roleId === 1 || isSuperadminOperator
const actsAsCga        = roleId === 5 || isCompanyOperator

// Final gate for remarks box
const canShowRemarks = readOnly && !actsAsSuperadmin && roleId !== 4
// (=> shows for Company Admin (2), CGA (5), and Operator-under-Company (6 w/ CGA), but hides for Superadmin and Operator-under-Superadmin)


    const navigate = useNavigate();
    const reportRef = useRef<HTMLDivElement>(null);
    const [activeAccordion, setActiveAccordion] = useState<number | null>(tabs[0]?.id || null);

    function safeParseArray<T>(value: any): T {
        try {
            const parsed = JSON.parse(value);
            return parsed as T;
        } catch {
            return [] as unknown as T;
        }
    }

    const handleAddRemark = async () => {
        try {

            const response = await updatedSubmittedReport(
                selectedReport.id,
                selectedReport.name ?? "Unnamed Report",
                ReportStatus.SUBMITTED,
                selectedReport.hasWarnings,
                selectedVoyage.id,
                Number(assignmentId),
                allValues,
                Number(vesselId),
                selectedReport.noOfWarnings,
                !!remarks.trim(), // hasRemarks
                remarks
            );

            console.log(response);

            // toast.success("Remark added successfully.");
            alert('Remark added successfully.');
            setRemarks('');
            setTimeout(() => {
                navigate('/operations/overview');
            }, 1500);
        } catch (err) {
            alert('Failed to add remark');
            // toast.error("Failed to submit the report. Please try again.");
        }
    };

    console.log("Report name: ", selectedReport?.name);

    // ✅ Helper to format coordinate into Degree° Minute′ Second″ Direction
    const formatCoordinate = (fields: [string, { value: any }][], baseLabel: string) => {
        const findValue = (suffix: string) => {
            const item = fields.find(([lbl]) =>
                lbl.toLowerCase().includes(`${baseLabel} ${suffix}`)
            );
            return item ? item[1]?.value?.toString().trim() || '' : '';
        };

        const deg = findValue('deg');
        const min = findValue('min');
        const sec = findValue('sec');
        const dir = findValue('direction');

        // ✅ If all are empty, return '--'
        if (!deg && !min && !sec && !dir) return '--°--′--″--';

        return `${deg || '--'}°${min || '--'}′${sec || '--'}″${dir || ''}`;
    };

    // ✅ Capitalize each word
    const capitalizeWords = (str: string) =>
        str.replace(/\b\w/g, (char) => char.toUpperCase());

    // ✅ Get clean label with prefix before latitude/longitude
    const getCleanLabel = (label: string) => {
        const lower = label.toLowerCase();

        if (lower.includes('latitude')) {
            const prefix = lower.split('latitude')[0].trim();
            return `${prefix ? capitalizeWords(prefix) + ' ' : ''}Latitude`;
        }

        if (lower.includes('longitude')) {
            const prefix = lower.split('longitude')[0].trim();
            return `${prefix ? capitalizeWords(prefix) + ' ' : ''}Longitude`;
        }

        return capitalizeWords(label);
    };

    const handleDownload = () => {
        const pdfContainer = document.getElementById('pdf-preview');
        if (!pdfContainer) return;

        pdfContainer.innerHTML = '';
        const content = document.createElement('div');

        // ✅ Helper to clean and normalize labels
        const getCleanLabel = (label: string) => {
            if (!label) return '';
            const normalized = label.toLowerCase().replace(/postion/g, 'position'); // fix typo

            if (normalized.includes('start position latitude')) return 'Start Position Latitude';
            if (normalized.includes('stop position latitude')) return 'Stop Position Latitude';
            if (normalized.includes('start position longitude')) return 'Start Position Longitude';
            if (normalized.includes('stop position longitude')) return 'Stop Position Longitude';

            return label.replace(
                / latitude deg|min|sec|direction|longitude deg|min|sec|direction/gi,
                ''
            ).trim();
        };

        // ✅ Format latitude/longitude into a single string (Deg°Min′Sec″Direction)
        const formatCoordinate = (fields: [string, string][]) => {
            const getValue = (type: string) =>
                fields.find(([label]) => label.toLowerCase().includes(type))?.[1] ?? '--';

            return `${getValue('deg')}°${getValue('min')}′${getValue('sec')}″${getValue('direction')}`;
        };

        // Start building PDF content
        let html = `
        <div style="font-family: Arial, sans-serif; font-size: 14px;">
            <h2>${readOnly ? selectedReport?.reportType : selectedReport?.name}</h2>
            <p><strong>Vessel Name:</strong> ${selectedVoyage?.vessel?.fleet_name ?? '--'}</p>
            <p><strong>IMO Number:</strong> ${selectedVoyage?.vessel?.imoNumber ?? '--'}</p>
            <p><strong>Vessel Type:</strong> ${selectedVoyage?.vessel?.vesselType ?? '--'}</p>
            <p><strong>Voyage:</strong> ${selectedVoyage?.voyageNumber ?? '--'} | ${selectedVoyage?.departurePort ?? ''} - ${selectedVoyage?.arrivalPort ?? ''}</p>
            <p><strong>Date:</strong> ${reportDate ?? '--'}</p>
            <hr />
    `;

        // ✅ Loop through tabs
        tabs.forEach((tab) => {
            const fieldValues = formData[tab.id] || {};
            const tabFields = tab.fields || [];

            if (tabFields.length === 0) {
                html += `<h3 style="margin-top: 20px;">${tab.name}</h3><p>No fields defined.</p>`;
                return;
            }

            html += `<h3 style="margin-top: 20px;">${tab.name}</h3>`;

            // Merge labels and values
const mergedFields = tabFields.map(field => {
  const value = fieldValues?.[field.id]?.value ?? '--';
  return [field.label, value] as [string, string];
});

// === NEW: Show Start/Stop Latitude & Longitude in two rows (like preview) ===
const norm = (s: string) => s.toLowerCase().replace(/postion/g, 'position'); // fix common typo
const isPart = (l: string) => /(deg|min|sec|direction)/i.test(l);

// pick DMS parts for kind (latitude|longitude) and which (start|stop|generic)
const pick = (
  kind: 'latitude' | 'longitude',
  which: 'start' | 'stop' | 'generic'
) =>
  mergedFields.filter(([label]) => {
    const l = norm(label);
    if (!(l.includes(kind) && isPart(l))) return false;
    if (which === 'start') return l.includes('start');
    if (which === 'stop') return l.includes('stop');
    return !l.includes('start') && !l.includes('stop'); // generic
  });

// DMS formatter from the picked pairs
const formatDMS = (pairs: [string, string][]) => {
  const getVal = (needle: 'deg' | 'min' | 'sec' | 'direction') =>
    pairs.find(([lbl]) => norm(lbl).includes(needle))?.[1] ?? '--';
  const deg = getVal('deg');
  const min = getVal('min');
  const sec = getVal('sec');
  const dir = getVal('direction');
  if (deg === '--' && min === '--' && sec === '--' && dir === '--') {
    return '--°--′--″--';
  }
  return `${deg}°${min}′${sec}″${dir}`;
};

// Split into Start / Stop / Generic for both axes
const latStart = pick('latitude', 'start');
const latStop = pick('latitude', 'stop');
const latGeneric = pick('latitude', 'generic');

const lonStart = pick('longitude', 'start');
const lonStop = pick('longitude', 'stop');
const lonGeneric = pick('longitude', 'generic');

const hasLat = latStart.length || latStop.length || latGeneric.length;
const hasLon = lonStart.length || lonStop.length || lonGeneric.length;

// === Row 1: Latitude - Start | Stop ===
if (hasLat) {
  html += `<div style="display:flex; gap:20px; margin-bottom:10px;">`;

  if (latStart.length || latGeneric.length) {
    const label = latStart.length ? 'Start Position Latitude' : 'Latitude';
    const value = formatDMS(latStart.length ? latStart : latGeneric);
    html += `
      <div style="flex:1;">
        <div style="color:#888;">${label}:</div>
        <strong>${value}</strong>
      </div>`;
  }

  if (latStop.length) {
    html += `
      <div style="flex:1;">
        <div style="color:#888;">Stop Position Latitude:</div>
        <strong>${formatDMS(latStop)}</strong>
      </div>`;
  }

  html += `</div>`;
}

// === Row 2: Longitude - Start | Stop ===
if (hasLon) {
  html += `<div style="display:flex; gap:20px; margin-bottom:10px;">`;

  if (lonStart.length || lonGeneric.length) {
    const label = lonStart.length ? 'Start Position Longitude' : 'Longitude';
    const value = formatDMS(lonStart.length ? lonStart : lonGeneric);
    html += `
      <div style="flex:1;">
        <div style="color:#888;">${label}:</div>
        <strong>${value}</strong>
      </div>`;
  }

  if (lonStop.length) {
    html += `
      <div style="flex:1;">
        <div style="color:#888;">Stop Position Longitude:</div>
        <strong>${formatDMS(lonStop)}</strong>
      </div>`;
  }

  html += `</div>`;
}

// === Remaining fields (exclude only the DMS parts) in rows of 4 ===
const filteredFields = mergedFields.filter(([label]) => {
  const l = norm(label);
  return !((l.includes('latitude') || l.includes('longitude')) && isPart(l));
});

const chunkSize = 4;
for (let i = 0; i < filteredFields.length; i += chunkSize) {
  const chunk = filteredFields.slice(i, i + chunkSize);
  html += `<div style="display:flex; gap:20px; margin-bottom:10px;">`;
  chunk.forEach(([label, value]) => {
    html += `
      <div style="flex:1;">
        <div style="color:#888;">${getCleanLabel(label)}:</div>
        <strong>${value}</strong>
      </div>`;
  });
  html += `</div>`;
}

        });

        html += `</div>`;

        // Append content to container
        content.innerHTML = html;
        pdfContainer.appendChild(content);

        // ✅ Generate PDF
        setTimeout(() => {
            import('html2pdf.js').then((html2pdf) => {
                html2pdf.default()
                    .from(pdfContainer)
                    .set({
                        margin: 0.5,
                        filename: `${readOnly ? selectedReport?.reportType : selectedReport?.name}_${reportDate}.pdf`,
                        html2canvas: { scale: 2 },
                        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
                    })
                    .save();
            });
        }, 300);
    };

    if (!formData || !tabs) return <div>No data to preview.</div>;
    return (

        <div
            className='app-main flex-column flex-row-fluid'
            id='kt_app_main'
        >
            <div className='d-flex flex-column flex-column-fluid pb-2 border-top' style={{ height: '90vh' }}>
                <div
                    id='kt_app_content'
                    className='app-content flex-column-fluid d-flex flex-column '
                    style={{ flex: 1 }}
                >
                    <div className='card flex-column bg-white' style={{ flex: 1, }} ref={reportRef}>
                        {/* Header */}

                        <div className='card-header py-4 gap-2 gap-md-12 px-5' >
                            <div>
                                <div className='d-flex align-items-center gap-1 mb-4'>
                                    <button
                                        className='btn p-0 m-0'
                                        onClick={() => {
                                            if (readOnly) {
                                                navigate('/operations/overview');
                                            } else {
                                                navigate(`/operations/create/${assignmentId}`, {
                                                    state: { selectedVoyage, formData, stepCompletionStatus }
                                                });
                                            }
                                        }}
                                    >
                                        <KTSVG path='/media/icons/duotune/arrows/ArrowLeft.svg' className='svg-icon-2' />
                                    </button>

                                    <h3 className='card-title fw-bold text-dark m-0 p-0'>{readOnly ? selectedReport?.reportType : selectedReport?.name}</h3>
                                </div>
                                <div className='d-flex justify-content-between'>
                                    <div className='d-flex gap-12'>
                                        <p>Vessel name: <strong>{selectedVoyage?.vessel?.fleet_name}</strong></p>
                                        <p>IMO number: <strong>{selectedVoyage?.vessel?.imoNumber}</strong></p>
                                        <p>Vessel type: <strong>{selectedVoyage?.vessel?.vesselType}</strong></p>
                                    </div>
                                </div>
                            </div>
                            <div onClick={handleDownload} style={{ cursor: 'pointer' }} >
                                <div className='d-flex gap-1'><KTSVG path='/media/map/DownloadSimple.svg' /> Download Report</div>
                            </div>
                        </div>
                        <div id="pdf-preview-wrapper" style={{ position: 'absolute', top: 0, left: 0, zIndex: -1, opacity: 0, pointerEvents: 'none' }}>
                            <div id="pdf-preview" />
                        </div>
                        {/* actual report */}
                        <div className='d-flex gap-3 px-5 '>
                            <div className=' pe-3 border-end py-3 overflow-y-auto' style={{ flex: 0.7, maxHeight: '100vh', overflowY: auto }}>
                                <div className="p-3 list-group-item" style={{ backgroundColor: '#F4F9FF', maxWidth: '100%' }}>
                                    <div className="title pb-1">{selectedVoyage?.voyageNumber || "VM009"}: {selectedVoyage?.departurePort || "Mumbai"} - {selectedVoyage?.arrivalPort || "Singapore"}</div>
                                    {/* { && selectedVoyage.endDate && (
                                        <div className="details pb-1">
                                            {new Date(selectedVoyage.startDate).toLocaleDateString('en-GB')} - {new Date(selectedVoyage.endDate).toLocaleDateString('en-GB')}
                                        </div>
                                    )} */}
                                    {(selectedVoyage.startDate || selectedVoyage.endDate) && (
                                        <div className="details pb-1">
                                            {selectedVoyage.startDate && (
                                                <span>{new Date(selectedVoyage.startDate).toLocaleDateString('en-GB')}</span>
                                            )}
                                            <span> - </span>
                                            {selectedVoyage.endDate && (
                                                <span>{new Date(selectedVoyage.endDate).toLocaleDateString('en-GB')}</span>
                                            )}
                                        </div>
                                    )}
                                    {/* <div className='d-flex justify-content-between py-4 pe-5 gap-1'>
                                        <span className="badge" style={{ backgroundColor: '#FDF6B2' }}>Current</span>
                                        <div className='d-flex gap-1 align-items-center'>
                                            <KTSVG path='/media/map/Incomplete.svg' className='svg-icon-3' /><span className='text-muted'>12</span>
                                        </div>
                                    </div> */}
                                </div>
                                {tabs.map((step) => (
                                    <div
                                        key={step.id}
                                        onClick={() => setActiveAccordion(step.id)} // ✅ Update active accordion
                                        className={`d-flex justify-content-between align-items-center mt-3 px-4 py-3 border rounded fw-bold step-item ${activeAccordion === step.id ? 'current' : 'bg-light'
                                            }`}
                                        style={{
                                            cursor: 'pointer',
                                            paddingRight: '2rem',
                                            fontSize: '16px',
                                            transition: 'all 0.3s ease'
                                        }}
                                    >
                                        <div>{step.name}</div>
                                    </div>
                                ))}
                            </div>
                            <div className='py-3' style={{ flex: 2.6 }}>
                                <div className="accordion" id="tabsAccordion">
                                    {tabs.map((tab, tabIndex) => {
                                        console.log(formData);
                                        const valuesForTab = formData[tab.id] || {};
                                        console.log(valuesForTab);
                                        const allFieldLabels = Object.keys(valuesForTab);

                                        // Optional: Fetch actual field metadata if available (labels, types, etc.)
                                        // For now, we'll just assume `formData[tab.id]` should show all known fields.

                                        // Create a list of all fields for the tab (could be static or fetched from props/config)
                                        const fieldEntries = Object.entries(valuesForTab);

                                        // Show all fields even if value is empty
                                        const allFieldsForTab = tabs[tabIndex].fields || []; // <- You'll need to pass this from backend or define it


                                        console.log("all fields for tab", allFieldsForTab)
                                        // Merge default field list with form values
                                        const mergedFields = allFieldsForTab.map((field) => {
                                            const rawValue = valuesForTab[field.id]?.value ?? '';
                                            let displayValue: string | JSX.Element = '--';

                                            // Detect nested JSON arrays for Consumption/ROB fields
                                            if (['Consumed', 'ROB', 'Machinery', 'Fuel Type'].includes(field.label)) {
                                                const arr = safeParseArray<any[]>(rawValue);

                                                if (arr.length > 0) {
                                                    displayValue = (
                                                        <div>
                                                            {arr.map((row: any, i: number) => (
                                                                <div key={i}>
                                                                    <strong>Row {i + 1}:</strong> {Array.isArray(row) ? row.join(', ') : row}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                }
                                            } else {
                                                displayValue = rawValue || '--';
                                            }
                                            const fieldData = valuesForTab[field.id] ?? {}; // use numeric field.id
                                            return [field.label, { ...fieldData, value: displayValue }];
                                        });

                                        console.log(mergedFields);

                                        // ✅ Define the proper type for each field
                                        type FieldTuple = [string, { value: any }];

                                        // ✅ Initialize chunkedFields with the correct type
                                        const chunkedFields: FieldTuple[][] = [];

                                        // Split mergedFields into chunks of size 4
                                        const chunkSize = 4;
                                        for (let i = 0; i < mergedFields.length; i += chunkSize) {
                                            chunkedFields.push(mergedFields.slice(i, i + chunkSize) as FieldTuple[]);
                                        }

                                        const flatFields = chunkedFields.flat() as [string, { value: any }][];

                                        // ✅ Only Deg, Min, Sec, Direction
                                        const latitudeFields = flatFields.filter(([label]) =>
                                            /latitude.*(deg|min|sec|direction)/i.test(label)
                                        );

                                        const longitudeFields = flatFields.filter(([label]) =>
                                            /longitude.*(deg|min|sec|direction)/i.test(label)
                                        );

                                        // ✅ Only raw Latitude/Longitude fields (ending with Latitude or Longitude)
                                        const chunkFields = flatFields.filter(([label]) =>
                                            /latitude$/i.test(label.trim()) || /longitude$/i.test(label.trim())
                                        );


                                        // ✅ Step 3: Determine base label for formatting
                                        const getBaseLabel = (fields: [string, { value: any }][], type: 'latitude' | 'longitude') => {
                                            if (fields.length === 0) return type;
                                            const firstLabel = fields[0][0].toLowerCase();
                                            if (firstLabel.includes('start position')) return `start position ${type}`;
                                            if (firstLabel.includes('stop position')) return `stop position ${type}`;
                                            return type;
                                        };

                                        const latitudeBase = getBaseLabel(latitudeFields, 'latitude');
                                        const longitudeBase = getBaseLabel(longitudeFields, 'longitude');

                                        // ✅ Step 4: Format once
                                        const latitudeDisplay = formatCoordinate(latitudeFields, latitudeBase);
                                        const longitudeDisplay = formatCoordinate(longitudeFields, longitudeBase);


                                        return (
                                            <div className="accordion-item" key={tab.id}>
                                                <h2 className="accordion-header" id={`heading-${tab.id}`}>
                                                    <button
                                                        className={`accordion-button ${activeAccordion === tab.id ? '' : 'collapsed'
                                                            }`} type="button"
                                                        data-bs-toggle="collapse"
                                                        data-bs-target={`#collapse-${tab.id}`}
                                                        aria-expanded={activeAccordion === tab.id}
                                                        aria-controls={`collapse-${tab.id}`}
                                                    >
                                                        <h5>{tab.name}</h5>
                                                        {!readOnly && <button
                                                            type='button'
                                                            className='btn'
                                                            onClick={() => navigate(`/operations/create/${assignmentId}`, {
                                                                state: {
                                                                    selectedTabId: tab.id,
                                                                    selectedVoyage,
                                                                    formData,
                                                                    stepCompletionStatus
                                                                }
                                                            })}
                                                        >
                                                            <KTSVG path='/media/map/edit.svg' /> <span className='text-muted'>Edit</span>
                                                        </button>}
                                                    </button>

                                                </h2>
                                                <div
                                                    id={`collapse-${tab.id}`}
                                                    className={`accordion-collapse collapse ${activeAccordion === tab.id ? 'show' : ''
                                                        }`}
                                                    aria-labelledby={`heading-${tab.id}`}
                                                    data-bs-parent="#tabsAccordion"
                                                >
                                                    <div className="accordion-body" style={{ maxWidth: '100%' }}>
                                                        {allFieldsForTab.length === 0 ? (
                                                            <div className="text-muted px-5 py-3">No fields available.</div>
                                                        ) : tab.name === 'Consumption & ROB' ? (
                                                            (() => {
                                                                function getVal<T>(label: string, index = 0): T {
                                                                    const matchingFields = allFieldsForTab.filter(f => f.label === label);
                                                                    const field = matchingFields[index];
                                                                    if (!field || field.id === undefined) return [] as unknown as T;
                                                                    return safeParseArray<T>(valuesForTab[field.id]?.value ?? '');
                                                                }

                                                                const fuelTypes = getVal('Fuel Type') as string[];
                                                                const robArray = getVal('ROB', 0) as number[];
                                                                const machinery = getVal('Machinery') as string[][];
                                                                const consumed = getVal('Consumed') as number[][];
                                                                const robDetailed = getVal('ROB', 1) as number[][];

                                                                console.log(fuelTypes);
                                                                console.log(machinery);

                                                                return (
                                                                    <div className="mb-4">
                                                                        {fuelTypes.length > 0 ? (
                                                                            fuelTypes.map((_, fuelIndex) => (
                                                                                <div key={fuelIndex} className="mb-4 border rounded p-3 m-5">
                                                                                    <div className="row px-5 py-5 text-start">
                                                                                        <div className="row">
                                                                                            <div className="col-md-4 mb-2">
                                                                                                <div className="text-muted mb-1 text-start">Fuel Type:</div>
                                                                                                <strong>{fuelTypes[fuelIndex] || <span className="">--</span>}</strong>
                                                                                            </div>
                                                                                            <div className="col-md-4 mb-2">
                                                                                                <div className="text-muted mb-1">ROB:</div>
                                                                                                <strong>{robArray[fuelIndex] || <span className="">--</span>}</strong>
                                                                                            </div>
                                                                                        </div>
                                                                                        {machinery[fuelIndex]?.map((machine, machineIndex) => (
                                                                                            <div key={machineIndex} className="row">
                                                                                                <div className="col-md-4 mb-2">
                                                                                                    <div className="text-muted mb-1">Machinery:</div>
                                                                                                    <strong>{machine || <span className=''>--</span>}</strong>
                                                                                                </div>
                                                                                                <div className="col-md-4 mb-2">
                                                                                                    <div className="text-muted mb-1">Consumed:</div>
                                                                                                    <strong>{consumed[fuelIndex]?.[machineIndex] || <span className=''>--</span>}</strong>
                                                                                                </div>
                                                                                                <div className="col-md-4 mb-2">
                                                                                                    <div className="text-muted mb-1">ROB:</div>
                                                                                                    <strong>{robDetailed[fuelIndex]?.[machineIndex] || <span className=''>--</span>}</strong>
                                                                                                </div>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            ))
                                                                        ) : (
                                                                            <div className="border rounded p-3 m-5 text-muted text-center">
                                                                                <div className="row px-5 py-5">
                                                                                    <div className="col-md-4 mb-2">
                                                                                        <div className="text-muted mb-1">Fuel Type:</div>
                                                                                        <strong>--</strong>
                                                                                    </div>
                                                                                    <div className="col-md-4 mb-2">
                                                                                        <div className="text-muted mb-1">ROB:</div>
                                                                                        <strong>--</strong>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="row">
                                                                                    <div className="col-md-4 mb-2">
                                                                                        <div className="text-muted mb-1">Machinery:</div>
                                                                                        <strong>--</strong>
                                                                                    </div>
                                                                                    <div className="col-md-4 mb-2">
                                                                                        <div className="text-muted mb-1">Consumed:</div>
                                                                                        <strong>--</strong>
                                                                                    </div>
                                                                                    <div className="col-md-4 mb-2">
                                                                                        <div className="text-muted mb-1">ROB:</div>
                                                                                        <strong>--</strong>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );

                                                            })()
                                                        ) : (

                                                            <div>
                                                                {(() => {
  type FieldTuple = [string, { value: any }];
  const all = (chunkedFields.flat() as FieldTuple[]);

  const norm = (s: string) => s.toLowerCase().replace(/postion/g, 'position'); // fix typo
  const isPart = (l: string) => /(deg|min|sec|direction)/i.test(l);

  const pick = (kind: 'latitude' | 'longitude', which: 'start' | 'stop' | 'generic') =>
    all.filter(([label]) => {
      const l = norm(label);
      if (!(l.includes(kind) && isPart(l))) return false;
      if (which === 'start') return l.includes('start');
      if (which === 'stop') return l.includes('stop');
      return !l.includes('start') && !l.includes('stop');
    });

  // Split into Start / Stop / Generic
  const latStart = pick('latitude', 'start');
  const latStop = pick('latitude', 'stop');
  const latGeneric = pick('latitude', 'generic');

  const lonStart = pick('longitude', 'start');
  const lonStop = pick('longitude', 'stop');
  const lonGeneric = pick('longitude', 'generic');

  const hasLat = latStart.length || latStop.length || latGeneric.length;
  const hasLon = lonStart.length || lonStop.length || lonGeneric.length;

  return (
    <>
      {/* Row 1: Latitude - Start | Stop */}
      {hasLat && (
        <div className="row mb-3 px-5 py-3">
          {(latStart.length || latGeneric.length) && (
            <div className="col-md-3">
              <div className="text-muted mb-1">
                {latStart.length ? 'Start Position Latitude' : 'Latitude'}:
              </div>
              <strong>
                {formatCoordinate(
                  latStart.length ? latStart : latGeneric,
                  latStart.length ? 'start position latitude' : 'latitude'
                )}
              </strong>
            </div>
          )}

          {latStop.length > 0 && (
            <div className="col-md-3">
              <div className="text-muted mb-1">Stop Position Latitude:</div>
              <strong>{formatCoordinate(latStop, 'stop position latitude')}</strong>
            </div>
          )}
        </div>
      )}

      {/* Row 2: Longitude - Start | Stop */}
      {hasLon && (
        <div className="row mb-3 px-5 py-3">
          {(lonStart.length || lonGeneric.length) && (
            <div className="col-md-3">
              <div className="text-muted mb-1">
                {lonStart.length ? 'Start Position Longitude' : 'Longitude'}:
              </div>
              <strong>
                {formatCoordinate(
                  lonStart.length ? lonStart : lonGeneric,
                  lonStart.length ? 'start position longitude' : 'longitude'
                )}
              </strong>
            </div>
          )}

          {lonStop.length > 0 && (
            <div className="col-md-3">
              <div className="text-muted mb-1">Stop Position Longitude:</div>
              <strong>{formatCoordinate(lonStop, 'stop position longitude')}</strong>
            </div>
          )}
        </div>
      )}
    </>
  );
})()}


                                                                {/* ✅ Render other fields in chunks */}
                                                                {chunkedFields.map((chunk, rowIndex) => {
                                                                    const typedChunk = chunk as [string, { value: any }][];

                                                                    return (
                                                                        <div className="row mb-3 px-5 py-3" key={rowIndex}>
                                                                            {typedChunk
                                                                                // ✅ Exclude only Deg/Min/Sec/Direction, NOT raw Latitude/Longitude
                                                                                .filter(
                                                                                    ([label]) =>
                                                                                        !/latitude.*(deg|min|sec|direction)/i.test(label) &&
                                                                                        !/longitude.*(deg|min|sec|direction)/i.test(label)
                                                                                )
                                                                                .map(([label, fieldData], idx) => (
                                                                                    <div className="col-md-3 mb-2" key={idx}>
                                                                                        <div className="text-muted mb-1">{getCleanLabel(label)}:</div>
                                                                                        <strong>{fieldData?.value || '--'}</strong>
                                                                                    </div>
                                                                                ))}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>

                                                        )
                                                        }
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {
  canShowRemarks && (
    <div className="px-5 py-4 border-top mt-4">
                                            <h5>Remarks</h5>

                                            {selectedReport?.remark && selectedReport.remark.trim() !== '' ? (
                                                <div className="bg-warning-subtle border border-warning rounded p-3">
                                                    <strong>Submitted Remark:</strong>
                                                    <div className="mt-2">{selectedReport.remark}</div>
                                                </div>
                                            ) : (
                                                <>
                                                    <textarea
                                                        className="form-control mb-3"
                                                        rows={3}
                                                        placeholder="Enter your remarks here..."
                                                        value={remarks}
                                                        onChange={(e) => setRemarks(e.target.value)}
                                                    />
                                                    <button
                                                        className="btn btn-primary"
                                                        onClick={handleAddRemark}
                                                    >
                                                        Add Remark
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )
                                }
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    )
}

export { PreviewReportModal }
