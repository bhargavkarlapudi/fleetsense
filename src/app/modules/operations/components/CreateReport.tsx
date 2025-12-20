import { FC, useEffect, useRef, useState } from 'react'
import { FaChevronRight, } from 'react-icons/fa'
import { KTSVG } from '../../../../_metronic/helpers'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import ReportStep, { ReportStepRef } from './ReportStep'
import { useAuth } from '../../auth'
import { getAssignmentById, submitReport, updatedSubmittedReport } from '../core/_requests'
import { CreatedReports, Fields, Reports, ReportStatus, Submenu, Voyage, WarningLevel } from '../core/_models'
import CloseReportModal from './CloseReportModal'
import { validateField } from '../core/validationUtils'
import { toast } from 'react-toastify'
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ConfirmOverwriteModal from './ConfirmOverwriteModal'
import AddConsumptionROB, { AddConsumptionROBRef } from './AddConsumptionROB'

const CreateReport: FC = () => {
    const { assignmentId } = useParams<{ assignmentId: string }>()
    const [selectedReport, setSelectedReport] = useState<Partial<Reports> | null>(null);
    const [tabs, setTabs] = useState<Submenu[]>([]);
    const [fields, setFields] = useState<Fields[]>([]);
    const [isCloseReportModalOpen, setIsCloseReportModalOpen] = useState<boolean>(false);
    const [isConfirmOverWriteModalOpen, setIsConfirmOverWriteModalOpen] = useState<boolean>(false);
    const stepRefs = useRef<ReportStepRef[]>([]);
    const [stepCompletionStatus, setStepCompletionStatus] = useState<boolean[]>([]);
    const [hasWarnings, setHasWarnings] = useState<boolean>(false);
    const [totalWarnings, setTotalWarnings] = useState<number>(0);
    const [warningsByStep, setWarningsByStep] = useState<Record<number, number>>({});
    const [hasWarningsByStep, setHasWarningsByStep] = useState<Record<number, boolean>>({});
    const [modalActionType, setModalActionType] = useState<'draft' | 'submit'>('draft');
    const [warningFields, setWarningFields] = useState<
        { stepId: number; fieldId: number; message: string }[]
    >([]);
    const navigate = useNavigate()
    const [reportDate, setReportDate] = useState<string>(() => {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const year = today.getFullYear();
        return `${day}/${month}/${year}`;
    });
    const [currentStep, setCurrentStep] = useState(0);
    const [isLoadingFields, setIsLoadingFields] = useState(false);
    const location = useLocation();
    // const { selectedTabId, selectedVoyage, draftReport, isEditMode = false, formData: passedFormData,
    // } = location.state as LocationState & {
    //     draftReport?: CreatedReports;
    //     isEditMode?: boolean;
    // } || {};
    const consumptionROBRef = useRef<AddConsumptionROBRef>(null);

    // const roleId = sessionStorage.getItem("roleId");
    const { currentUser } = useAuth()
    const roleId = currentUser?.role?.id;
    const rankId = currentUser?.rank?.id;

    interface LocationState {
        selectedTabId?: number,       // your target tab id
        selectedVoyage?: Voyage;
        formData?: {
            [tabId: number]: {
                [id: number]: {
                    label: string;
                    value: any;
                };
            };
        };

        draftReport?: CreatedReports;
        isEditMode?: boolean;
    }

    // Safely extract and typecast state
    const state = (location.state || {}) as LocationState;

    const {
        selectedTabId,
        selectedVoyage,
        draftReport,
        formData: passedFormData,
        isEditMode: initialIsEditMode,
    } = state;

    const [voyage, setVoyage] = useState<Voyage | null>(selectedVoyage ?? null);
    const [isEditMode, setIsEditMode] = useState<boolean>(initialIsEditMode ?? false);
    const [draftReportData, setDraftReportData] = useState<CreatedReports | null>(draftReport ?? null);

    useEffect(() => {
        if (passedFormData) {
            setFormData(passedFormData);
        }
    }, []);

    useEffect(() => {
        if (selectedTabId && tabs.length > 0) {
            const index = tabs.findIndex(tab => tab.id === selectedTabId);
            if (index !== -1) {
                setCurrentStep(index);
                fetchFieldsforStep(selectedTabId);
            }
        }
    }, [tabs]);
    useEffect(() => {
        console.log(selectedVoyage);
    }, [selectedVoyage]);

    useEffect(() => {
        if (tabs.length > 0 && currentStep >= 0) {
            const tab = tabs[currentStep];
            fetchFieldsforStep(tab.id);
        }
    }, [currentStep, tabs]);


    // useEffect(() => {
    //     if (draftReport && draftReport.values) {
    //         console.log(draftReport);
    //         const menus = draftReport.assignment.template?.menus || draftReport.assignment.customTemplate?.menus || [];
    //         const formDataFromReport = mapCreatedValuesToFormData(draftReport.values, menus);
    //         console.log(formDataFromReport);
    //         setFormData(formDataFromReport);
    //     }
    // }, [draftReport]);

    useEffect(() => {
        if (draftReportData) {
            // prepopulate selectedVoyage, reportDate, etc.
            setReportDate(new Date(draftReportData.submittedDateTime).toLocaleDateString());
            // setSelectedVoyage(draftReport.voyage) if you store voyage in it
        }
    }, [draftReportData]);

    const [formData, setFormData] = useState<{ [tabId: number]: { [fieldName: string]: any } }>({});
    useEffect(() => {
        console.log('Loaded formData from draft:', formData);

    }, [formData]);

    // const isStepCompleted = (tabId: number) => {
    //     const tabFields = fields; // You might need to pass correct fields per tab
    //     const tabValues = formData[tabId];

    //     if (!tabValues) return false;

    //     // Check if all fields have values (simple truthy check)
    //     return Object.values(tabValues).every(field => field.value !== undefined && field.value !== '');
    // };

    const runValidationForAllSteps = (
        customFormData?: typeof formData
    ): {
        isValid: boolean;
        totalWarnings: number;
        stepWarnings: Record<number, number>
        warningFields: { stepId: number; fieldId: number; message: string }[];
    } => {
        let isValid = true;
        let totalWarnings = 0;
        const stepWarnings: Record<number, number> = {};
        const warningFieldList: { stepId: number; fieldId: number; message: string }[] = [];

        const dataToValidate = customFormData || formData;

        for (const tab of tabs) {
            console.log(tab.name)
            if (tab.name === 'Consumption & ROB') {
                console.log("consumption")
                stepWarnings[tab.id] = 0; // explicitly mark zero warnings
                continue;
            }

            console.log("✅ Validating tab:", tab.name);

            const submenu = selectedReport?.submenus?.find((sm) => sm.id === tab.id);
            const tabFields = submenu?.fields?.filter((f) => f.isActive) || [];
            const tabValues = dataToValidate[tab.id] || {};

            console.log("consumption 1")

            for (const field of tabFields) {
                const value = tabValues[field.id]?.value;
                const error = validateField(field, value);

                if (error) {
                    const isSoft = field.warningOnly === WarningLevel.SOFT;
                    const isNumber = field.fieldType.toLowerCase() === "number";

                    if (isSoft && isNumber) {
                        stepWarnings[tab.id] = (stepWarnings[tab.id] || 0) + 1;
                        warningFieldList.push({
                            stepId: tab.id,
                            fieldId: field.id,
                            message: error,
                        });
                        totalWarnings++;
                    } else {
                        isValid = false;
                    }
                }
            }
        }

        return {
            isValid,
            totalWarnings,
            stepWarnings,
            warningFields: warningFieldList,
        };
    };

    const mapCreatedValuesToFormData = (
        values: CreatedReports["values"],
        menus: CreatedReports["assignment"]["template"]["menus"] | CreatedReports["assignment"]["customTemplate"]["menus"]
    ) => {
        console.log('Menus:', menus);

        const result: {
            [submenuId: number]: {
                [id: number]: {
                    fieldLabel: string;
                    value: any;
                };
            };
        } = {};

        console.log('Draft values:', values);
        console.log('Menus structure:', menus);

        for (const entry of values) {
            const fieldId = entry.field;
            const fieldValue = entry.valueText;

            for (const menu of menus) {
                for (const submenu of menu.submenus) {
                    const matchingField = submenu.fields?.find(field => field.id === fieldId);

                    if (matchingField) {
                        const submenuId = submenu.id;
                        const fieldLabel = matchingField.label;
                        const isCheckbox = matchingField.fieldType === 'checkbox';

                        if (!result[submenuId]) result[submenuId] = {};

                        if (!result[submenuId][fieldId]) {
                            result[submenuId][fieldId] = {
                                fieldLabel,
                                value: isCheckbox ? [fieldValue] : fieldValue,
                            };
                        } else if (isCheckbox) {
                            // ✅ Accumulate for checkboxes
                            result[submenuId][fieldId].value.push(fieldValue);
                        }
                    }
                }
            }
        }

        console.log(result)

        return result;
    };

    const handleSaveDraft = async () => {
        if (roleId === 1) {
            setIsConfirmOverWriteModalOpen(true);
            setModalActionType('draft');
        }
        const {
            isValid,
            totalWarnings,
            stepWarnings,
            warningFields: fieldWarnings,
        } = runValidationForAllSteps();

        // Set states to be used elsewhere
        setWarningsByStep(stepWarnings);
        setHasWarningsByStep(
            Object.fromEntries(tabs.map((tab) => [tab.id, stepWarnings[tab.id] > 0]))
        );
        setWarningFields(fieldWarnings);
        const hasAnyWarnings = totalWarnings > 0;

        // if (!isValid) {
        //     toast.error("Fix errors before submitting.")
        //     console.log("Fix errors before submitting.");
        //     return;
        // }

        // if (totalWarnings > 0 && !window.confirm(`${totalWarnings} warnings found. Submit anyway?`)) {
        //     return;
        // }
        try {
            const allValues: { field: number, valueText: string }[] = [];

            console.log(formData);
            Object.values(formData).forEach((tabData) => {
                Object.entries(tabData).forEach(([fieldId, entry]) => {
                    if (Array.isArray(entry.value)) {
                        entry.value.forEach((val: string) => {
                            allValues.push({
                                field: Number(fieldId),
                                valueText: String(val),
                            });
                        });
                    } else {
                        allValues.push({
                            field: Number(fieldId),
                            valueText: String(entry.value ?? ''),
                        });
                    }
                });
            });

            // const vesselId = sessionStorage.getItem('vesselId');
            const vesselId = currentUser?.vessel?.id;
            console.log("isEditMode:", isEditMode);

            if (isEditMode) {
                const response = await updatedSubmittedReport(
                    draftReportData!.id,
                    selectedReport?.name ?? "Unnamed Report",
                    ReportStatus.DRAFT,
                    hasAnyWarnings, // Pass hasWarnings flag
                    voyage!.id,
                    Number(assignmentId),
                    allValues,
                    Number(vesselId),
                    totalWarnings
                );
                console.log('📤 updated successfully:', response);
                toast.success("Draft updated successfully.")
            }
            else {
                const response = await submitReport(
                    selectedReport?.name ?? "Unnamed Report",
                    ReportStatus.DRAFT,
                    hasAnyWarnings, // Pass hasWarnings flag
                    voyage?.id ?? 3,
                    Number(assignmentId),
                    allValues,
                    Number(vesselId),
                    totalWarnings,
                );
                console.log('📤 Submitted successfully:', response);
                toast.success("Draft saved successfully.")
            }

            setTimeout(() => {
                navigate('/operations/overview')
            }, 1500)

        } catch (err) {
            console.error('Failed to fetch submit report:', err);
            toast.error("Failed to submit the report. Please try again.")
        }
    }

    const handleSubmit = async () => {
        if (roleId === 1) {
            setIsConfirmOverWriteModalOpen(true);
            setModalActionType('submit');
        }
        const {
            isValid,
            totalWarnings,
            stepWarnings,
            warningFields: fieldWarnings,
        } = runValidationForAllSteps();

        // Set states to be used elsewhere
        setWarningsByStep(stepWarnings);
        setHasWarningsByStep(
            Object.fromEntries(tabs.map((tab) => [tab.id, stepWarnings[tab.id] > 0]))
        );
        setWarningFields(fieldWarnings);
        const hasAnyWarnings = totalWarnings > 0;

        if (!isValid) {
            console.log("Fix errors before submitting.");
            toast.error("Fix errors before submitting.");
            return;
        }

        if (totalWarnings > 0 && !window.confirm(`${totalWarnings} warnings found. Submit anyway?`)) {
            return;
        }
        try {

            let allValues: { field: number, valueText: string }[] = [];

            Object.values(formData).forEach((tabData) => {
                Object.entries(tabData).forEach(([fieldId, entry]) => {
                    // allValues.push({
                    //     field: Number(fieldId),
                    //     valueText: entry.value,
                    // });
                    if (Array.isArray(entry.value)) {
                        entry.value.forEach((val: string) => {
                            allValues.push({
                                field: Number(fieldId),
                                valueText: String(val),
                            });
                        });
                    } else {
                        allValues.push({
                            field: Number(fieldId),
                            valueText: String(entry.value ?? ''),
                        });
                    }
                });
            });

            // 2️⃣ consumption & ROB
            // if (consumptionROBRef.current) {
            //     allValues = allValues.concat(consumptionROBRef.current.getPayload());
            // }

            // const vesselId = sessionStorage.getItem('vesselId');
            const vesselId = currentUser?.vessel?.id;

            if (isEditMode) {
                const response = await updatedSubmittedReport(
                    draftReportData!.id,
                    selectedReport?.name ?? "Unnamed Report",
                    rankId === 1 ? ReportStatus.SUBMITTED : ReportStatus.DRAFT,
                    hasAnyWarnings, // Pass hasWarnings flag
                    voyage!.id,
                    Number(assignmentId),
                    allValues,
                    Number(vesselId),
                    totalWarnings,
                    false,
                    ""
                );
                console.log('📤 Submitted successfully:', response);
                if (rankId === 1) {
                    toast.success("Report updated successfully.");
                } else {
                    toast.success("Draft updated successfully.");
                }
            }
            else {
                const response = await submitReport(
                    selectedReport?.name ?? "Unnamed Report",
                    rankId === 1 ? ReportStatus.SUBMITTED : ReportStatus.DRAFT,
                    hasAnyWarnings, // Pass hasWarnings flag
                    voyage?.id ?? 3,
                    Number(assignmentId),
                    allValues,
                    Number(vesselId),
                    totalWarnings,
                );
                console.log('📤 Submitted successfully:', response);
                if (rankId === 1) {
                    toast.success("Report submitted successfully.");
                } else {
                    toast.success("Draft saved successfully.");
                }
            }

            setTimeout(() => {
                navigate('/operations/overview')
            }, 1500)

        } catch (err) {
            console.error('Failed to submit report:', err);
            toast.error("Failed to submit the report. Please try again.")
        }
    };

    useEffect(() => {
        if (!assignmentId) return;

        console.log(assignmentId);
        const fetchAssignmentDetails = async () => {
            try {
                const assignment = await getAssignmentById(Number(assignmentId));
                console.log(assignment);
                if (!assignment) {
                    console.warn(`Assignment with ID ${assignmentId} not found.`);
                    return;
                }

                const reportData = assignment.template ?? assignment.customTemplate;
                if (!reportData || !reportData.menus) {
                    console.warn('No valid template found in assignment.');
                    setTabs([]);
                    return;
                }

                const name =
                    assignment.customTemplate?.menus?.[0]?.name ||
                    assignment.template?.name ||
                    'Unnamed Report';

                const flattenedSubmenus = reportData.menus.flatMap(menu => menu.submenus);

                setSelectedReport({
                    id: assignment.id,
                    name,
                    templateId: reportData.id,
                    order: 0,
                    isActive: true,
                    submenus: flattenedSubmenus,
                });

                const activeSubmenus = reportData.menus
                    .filter(menu => menu.isActive)
                    .flatMap(menu => menu.submenus.filter(submenu => submenu.isActive));

                console.log(activeSubmenus);
                setTabs(activeSubmenus);

                // ✅ Map draftReport values here (now we have menus + submenus + fields)
                if (draftReportData && draftReportData.values) {
                    const formDataFromReport = mapCreatedValuesToFormData(
                        draftReportData.values,
                        reportData.menus
                    );
                    setFormData(formDataFromReport);
                }

            } catch (err) {
                console.error('Failed to fetch assignment details:', err);
            }
        };

        fetchAssignmentDetails();
    }, [assignmentId]);

    const handleFieldChange = (tabId: number, label: string, id: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [tabId]: {
                ...prev[tabId],
                [id]: {
                    label,
                    value,
                },
            }
        }));
    };

    const fetchFieldsforStep = async (tabId: number) => {
        try {
            setIsLoadingFields(true);

            const allSubmenus = selectedReport?.submenus ?? [];

            // Find the submenu (tab) that matches the given tabId
            const targetTab = allSubmenus?.find(submenu => submenu.id === tabId);

            if (targetTab) {
                const activeFields = targetTab.fields?.filter(field => field.isActive);
                setFields(activeFields);
            } else {
                console.warn(`No tab found with ID ${tabId}`);
                setFields([]);
            }

        } catch (err) {
            console.error('Failed to fetch fields list:', err);
            return [];
        } finally {
            setIsLoadingFields(false);
        }
    };



    // const nextStep = () => {
    //     const isValid = stepRefs.current[currentStep]?.validateStep();
    //     if (!isValid) return;

    //     setCurrentStep(prev => {
    //         const nextIndex = Math.min(prev + 1, tabs.length - 1);
    //         const nextTab = tabs[nextIndex];
    //         if (nextTab) {
    //             fetchFieldsforStep(nextTab.id); // fetch fields for the next tab
    //         }
    //         return nextIndex;
    //     });
    // };

    const nextStep = () => {
        console.log(currentStep);

        // Check if the current tab is "Consumption & ROB"
        const currentTabName = tabs[currentStep]?.name;
        const skipValidation = currentTabName === "Consumption & ROB";

        // Only validate if not skipping
        const isValid = skipValidation || stepRefs.current[currentStep]?.validateStep();
        if (!isValid) return;

        setStepCompletionStatus((prev) => {
            const updated = [...prev];
            updated[currentStep] = true; // ✅ mark current step as completed
            return updated;
        });

        setCurrentStep(prev => Math.min(prev + 1, tabs.length - 1));
    };

    const isStepCompleted = (index: number) => stepCompletionStatus[index] === true;

    const goToStep = (step: number) => setCurrentStep(step);


    const step = tabs[currentStep];
    if (!tabs.length || !tabs[currentStep]) {
        return <div className='p-5 fw-500 text-center'>No tabs available for this report</div>;
    }
    return (
        <div
            className='app-main flex-column flex-row-fluid'
            id='kt_app_main'
        >
            <div className='d-flex flex-column flex-column-fluid border-top' style={{ height: '90vh' }}>
                <div
                    id='kt_app_content'
                    className='app-content flex-column-fluid d-flex flex-column bg-white'
                    style={{ flex: 1 }}
                >
                    <div className='card d-flex flex-column bg-white' style={{ flex: 1 }}>
                        {/* Header */}

                        <div className='card-header align-items-center justify-content-between py-4 gap-2 gap-md-12 px-5 bg-white'>
                            <div>
                                <div className='d-flex align-items-center gap-1 mb-4'>
                                    <Link to="" onClick={() => setIsCloseReportModalOpen(true)}>
                                        <KTSVG path='/media/icons/duotune/arrows/ArrowLeft.svg' className='svg-icon-2' />
                                    </Link>
                                    <h3 className='card-title fw-bold text-dark m-0 p-0' style={{ fontSize: '1.5rem' }}>Create Report</h3>
                                </div>
                                <div className='d-flex gap-12'>
                                    <p>Vessel name: <strong>{voyage?.vessel?.fleet_name}</strong></p>
                                    <p>IMO number: <strong>{voyage?.vessel?.imoNumber}</strong></p>
                                    <p>Vessel type: <strong>{voyage?.vessel?.vesselType}</strong></p>
                                </div>
                            </div>

                            <div className="mb-4">
                                <div className="mb-2">
                                    <strong style={{ fontSize: '1.5rem' }}>{selectedReport?.name}</strong> {reportDate}
                                </div>
                                <div className="d-flex justify-content-end">
                                    <button
                                        onClick={handleSaveDraft}
                                        className='btn p-0 pt-1 d-flex align-items-center gap-1'
                                    >
                                        <svg width="16" height="17" viewBox="0 0 16 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M4.64625 5.35414C4.59976 5.30771 4.56288 5.25256 4.53772 5.19186C4.51256 5.13116 4.49961 5.0661 4.49961 5.00039C4.49961 4.93469 4.51256 4.86962 4.53772 4.80892C4.56288 4.74822 4.59976 4.69308 4.64625 4.64664L7.64625 1.64664C7.69269 1.60016 7.74783 1.56328 7.80853 1.53811C7.86923 1.51295 7.93429 1.5 8 1.5C8.06571 1.5 8.13077 1.51295 8.19147 1.53811C8.25217 1.56328 8.30731 1.60016 8.35375 1.64664L11.3538 4.64664C11.4476 4.74046 11.5003 4.86771 11.5003 5.00039C11.5003 5.13308 11.4476 5.26032 11.3538 5.35414C11.2599 5.44796 11.1327 5.50067 11 5.50067C10.8673 5.50067 10.7401 5.44796 10.6462 5.35414L8.5 3.20727V8.50039C8.5 8.633 8.44732 8.76018 8.35355 8.85395C8.25979 8.94772 8.13261 9.00039 8 9.00039C7.86739 9.00039 7.74021 8.94772 7.64645 8.85395C7.55268 8.76018 7.5 8.633 7.5 8.50039V3.20727L5.35375 5.35414C5.30731 5.40063 5.25217 5.43751 5.19147 5.46267C5.13077 5.48784 5.06571 5.50079 5 5.50079C4.93429 5.50079 4.86923 5.48784 4.80853 5.46267C4.74783 5.43751 4.69269 5.40063 4.64625 5.35414ZM15 9.00039V13.0004C15 13.2656 14.8946 13.52 14.7071 13.7075C14.5196 13.895 14.2652 14.0004 14 14.0004H2C1.73478 14.0004 1.48043 13.895 1.29289 13.7075C1.10536 13.52 1 13.2656 1 13.0004V9.00039C1 8.73518 1.10536 8.48082 1.29289 8.29329C1.48043 8.10575 1.73478 8.00039 2 8.00039H6.25C6.3163 8.00039 6.37989 8.02673 6.42678 8.07362C6.47366 8.1205 6.5 8.18409 6.5 8.25039V8.46664C6.5 9.30727 7.1875 10.016 8.02875 10.0004C8.42157 9.99286 8.79576 9.83151 9.07087 9.55102C9.34599 9.27052 9.50007 8.89329 9.5 8.50039V8.25039C9.5 8.18409 9.52634 8.1205 9.57322 8.07362C9.62011 8.02673 9.6837 8.00039 9.75 8.00039H14C14.2652 8.00039 14.5196 8.10575 14.7071 8.29329C14.8946 8.48082 15 8.73518 15 9.00039ZM12.5 11.0004C12.5 10.8521 12.456 10.7071 12.3736 10.5837C12.2912 10.4604 12.1741 10.3642 12.037 10.3075C11.9 10.2507 11.7492 10.2359 11.6037 10.2648C11.4582 10.2937 11.3246 10.3652 11.2197 10.4701C11.1148 10.575 11.0434 10.7086 11.0144 10.8541C10.9855 10.9996 11.0003 11.1504 11.0571 11.2874C11.1139 11.4244 11.21 11.5416 11.3333 11.624C11.4567 11.7064 11.6017 11.7504 11.75 11.7504C11.9489 11.7504 12.1397 11.6714 12.2803 11.5307C12.421 11.3901 12.5 11.1993 12.5 11.0004Z" fill="black" />
                                        </svg>
                                        Save as draft
                                    </button>
                                </div>
                            </div>
                        </div>
                        {draftReportData?.remark && (
                            <div className='d-flex justify-content-between align-items-center py-4 px-5 border-bottom'>
                                <div className='text-muted'>
                                    {draftReportData.remark}
                                </div>
                            </div>
                        )}
                        <div className='d-flex px-5'>
                            <div className=' pe-3 border-end py-3'
                                style={{ flex: 0.82, overflowY: 'auto', maxHeight: 'calc(100vh - 240px)' }}/*Adjust max-height as needed*/>
                                <div className="p-3 list-group-item" style={{ backgroundColor: '#F4F9FF' }}>
                                    <div className="title pb-1">{voyage?.voyageNumber || "VM009"}: {voyage?.departurePort || "Mumbai"} - {selectedVoyage?.arrivalPort || "Singapore"}</div>
                                    {voyage?.startDate && voyage?.endDate && (
                                        <div className="details pb-1">
                                            {new Date(voyage?.startDate).toLocaleDateString('en-GB')} - {new Date(voyage?.endDate).toLocaleDateString('en-GB')}
                                        </div>
                                    )}
                                    <div className='d-flex justify-content-between py-4 pe-2 gap-1'>
                                        <span className="badge" style={{ backgroundColor: '#FDF6B2', fontSize: '13px', padding: '4px 8px', borderRadius: '4px', fontWeight: 500 }}>Current</span>
                                        {hasWarnings && <div className='d-flex gap-1 align-items-center'>
                                            <KTSVG path='/media/map/Incomplete.svg' className='svg-icon-3' /><span className='text-muted'>{totalWarnings}</span>
                                        </div>}
                                    </div>
                                </div>
                                {tabs.map((step, index) => (
                                    <div
                                        key={step.id}
                                        className={`d-flex justify-content-between mt-5 py-5 px-5 border rounded-1 fw-bold
                                        ${index === currentStep ? 'current' : isStepCompleted(index) ? 'completed-step' : 'form-step'}`}
                                        onClick={() => {
                                            goToStep(index);
                                            fetchFieldsforStep(step.id);
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <div className="fs-5">{index + 1}. {step.name} </div> {/* Or fs-4, or inline style */}
                                        {index === currentStep ? (
                                            <KTSVG path='/media/map/arrow-right.svg' className='svg-icon svg-icon-2' />
                                        ) : isStepCompleted(index) ? (
                                            <KTSVG path='/media/map/check.svg' className='svg-icon svg-icon-2 text-success' />
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                            <div className='py-3 px-5' style={{ flex: 3 }}>
                                {/* <ReportStep
                                    ref={(ref) => (stepRefs.current[currentStep] = ref!)}
                                    sectionTitle={step.name}
                                    formSections={fields}
                                    values={formData[step.id] || {}}
                                    onChange={(label, id, value) => handleFieldChange(step.id, label, id, value)}
                                /> */}
                                {
                                    isLoadingFields ? (
                                        <div>Loading fields...</div>
                                    ) : step.name === 'Consumption & ROB' ? (
                                        <AddConsumptionROB
                                            ref={consumptionROBRef}
                                            sectionTitle={step.name}
                                            voyage={voyage}
                                            fields={fields}
                                            onChange={(label, id, value) => {
                                                handleFieldChange(step.id, label, id.toString(), value);

                                                // Re-run your validation logic here if needed
                                                const updatedForm = {
                                                    ...formData,
                                                    [step.id]: {
                                                        ...formData[step.id],
                                                        [id]: { value, label },
                                                    },
                                                };

                                                const {
                                                    totalWarnings,
                                                    stepWarnings,
                                                    warningFields: fieldWarnings,
                                                } = runValidationForAllSteps(updatedForm);

                                                setWarningsByStep(stepWarnings);
                                                setHasWarningsByStep(
                                                    Object.fromEntries(tabs.map((tab) => [tab.id, stepWarnings[tab.id] > 0]))
                                                );
                                                setWarningFields(fieldWarnings);
                                                setTotalWarnings(totalWarnings);
                                                setHasWarnings(totalWarnings > 0);

                                                // const isValid = consumptionROBRef.current?.validateStep?.();
                                                const isValid = true;
                                                setStepCompletionStatus((prev) => {
                                                    const updated = [...prev];
                                                    updated[currentStep] = !!isValid;
                                                    return updated;
                                                });
                                            }}
                                            values={formData[step.id] || {}}
                                        />
                                    ) : (
                                        <ReportStep
                                            ref={(ref) => (stepRefs.current[currentStep] = ref!)}
                                            sectionTitle={step.name}
                                            formSections={fields}
                                            values={formData[step.id] || {}}
                                            voyage={voyage}
                                            selectedReport={selectedReport}
                                            onChange={(label, id, value) => {
                                                handleFieldChange(step.id, label, id, value)
                                                // 2. Re-validate and update warnings
                                                const updatedForm = {
                                                    ...formData,
                                                    [step.id]: {
                                                        ...formData[step.id],
                                                        [id]: { value, label },
                                                    },
                                                };

                                                const {
                                                    totalWarnings,
                                                    stepWarnings,
                                                    warningFields: fieldWarnings,
                                                } = runValidationForAllSteps(updatedForm);

                                                setWarningsByStep(stepWarnings);
                                                setHasWarningsByStep(
                                                    Object.fromEntries(tabs.map((tab) => [tab.id, stepWarnings[tab.id] > 0]))
                                                );
                                                setWarningFields(fieldWarnings);
                                                setTotalWarnings(totalWarnings);
                                                setHasWarnings(totalWarnings > 0);
                                                // Optional: revalidate after input change
                                                const isValid = stepRefs.current[currentStep]?.validateStep?.();
                                                setStepCompletionStatus((prev) => {
                                                    const updated = [...prev];
                                                    updated[currentStep] = !!isValid;
                                                    return updated;
                                                });
                                            }}
                                        />
                                    )
                                }

                                {currentStep < tabs.length - 1 && (
                                    <button className='btn btn_primary mt-4' onClick={nextStep}>
                                        Next: {tabs[currentStep + 1].name} <FaChevronRight className='ms-2' />
                                    </button>
                                )}
                                {
                                    currentStep === tabs.length - 1 && (
                                        <div className='d-flex align-items-center mt-5'>
                                            <button className='btn btn_primary ' onClick={handleSubmit}>
                                                {rankId === 1 ? "Submit" : "Save as draft"}
                                            </button>
                                            {reportDate && (
                                                <Link
                                                    to="/operations/report-preview"
                                                    state={{
                                                        formData,
                                                        tabs,
                                                        assignmentId,
                                                        selectedVoyage,
                                                        stepCompletionStatus,
                                                        selectedReport,
                                                        reportDate,
                                                    }}
                                                    className='btn p-0 ps-3'
                                                >
                                                    Preview report
                                                </Link>
                                            )}
                                        </div>

                                    )
                                }
                            </div>
                        </div>
                        {isCloseReportModalOpen && (
                            <CloseReportModal
                                isOpen={isCloseReportModalOpen}
                                onClose={() => { setIsCloseReportModalOpen(false) }}
                                formData={formData}
                                assignmentId={Number(assignmentId)}
                                selectedReport={selectedReport}
                                selectedVoyage={voyage ? voyage : null}
                                onSaveDraft={handleSaveDraft}
                            />
                        )}
                        {isConfirmOverWriteModalOpen && (
                            <ConfirmOverwriteModal
                                isOpen={isConfirmOverWriteModalOpen}
                                onClose={() => { setIsConfirmOverWriteModalOpen(false) }}
                                formData={formData}
                                assignmentId={Number(assignmentId)}
                                selectedReport={selectedReport}
                                selectedVoyage={voyage ? voyage : null}
                                onSaveDraft={handleSaveDraft}
                                onSubmitReport={handleSubmit}
                                actionType={modalActionType}
                            />
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

            </div>
        </div>
    )
}

export { CreateReport }
