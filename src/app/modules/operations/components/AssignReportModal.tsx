import React, { useEffect, useState } from 'react';
import { assignCustomTemplate, cloneTemplate, deleteAssignment, getAllAssignments, getAssignedTemplatesByCompanyAdmin, getAssignedTemplatesForCompany, getAssignedTemplatesForVesselId, getAssignedTemplatesForVesselType, getReportsForTemplate, getTemplateList, updateCustomField, updateCustomMenuItem, updateCustomSubMenuItem, } from '../core/_requests';
import { getAuth } from '../../auth';
import { AssignedReports, Fields, Reports, WarningLevel } from '../core/_models';
import { KTSVG } from '../../../../_metronic/helpers';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    companyAdminId: number;
    companyId: number;
    vesselType: string;
    vesselId: number;
    onReportAssigned: () => void;
}

interface ReportWithAssignment extends Reports {
    _assignment: {
        templateId: number | null;
        customTemplateId?: number | null;
        assignmentId: number | null;
    };
}

interface ExtendedField extends Fields {
    templateId: number | null;
    customTemplateId?: number | null;
}


const AssignReportModal: React.FC<Props> = ({ onClose, isOpen, companyAdminId, companyId, vesselType, vesselId, onReportAssigned }) => {

    const [reportStates, setReportStates] = useState<{
        [reportId: number]: {
            isActive: boolean;
            templateId: number | null;
            customTemplateId?: number | null;
            name: string;
            assignmentId?: number | null;
        };
    }>({});

    const [tabStates, setTabStates] = useState<{
        [submenuId: number]: {
            isActive: boolean;
            reportId: number;
            templateId: number | null;
            customTemplateId?: number | null;
            name: string;
        };
    }>({});

    const [fieldStates, setFieldStates] = useState<{
        [fieldId: number]: {
            isActive: boolean;
            submenuId: number;
            templateId: number | null;
            customTemplateId?: number | null;
            label: string;
            fieldType: string;
            required: boolean;
            readOnly: boolean;
            warningOnly: WarningLevel | null;
            unit?: string;
            minValue?: number;
            maxValue?: number;
            optionsJson?: string[];
        };
    }>({});

    const [updatedReportIds, setUpdatedReportIds] = useState<Set<number>>(new Set());
    const [updatedTabIds, setUpdatedTabIds] = useState<Set<number>>(new Set());
    const [updatedFieldIds, setUpdatedFieldIds] = useState<Set<number>>(new Set());

    const [isAssigning, setIsAssigning] = useState(false);
    const [reports, setReports] = useState<ReportWithAssignment[]>([]);
    const [selectedReport, setSelectedReport] = useState<ReportWithAssignment>();
    const [fieldsByTab, setFieldsByTab] = useState<{ [tabId: number]: ExtendedField[] }>({});
    const [editingReportId, setEditingReportId] = useState<number | null>(null);
    const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
    const [editingFieldId, setEditingFieldId] = useState<number | null>(null);
    const [editingTabId, setEditingTabId] = useState<number | null>(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [labelName, setLabelName] = useState("");
    const [inputType, setInputType] = useState("text");
    const [warningOnly, setWarningOnly] = useState<WarningLevel | null>(null);
    const [minValue, setMinValue] = useState<number | undefined>();
    const [maxValue, setMaxValue] = useState<number | undefined>();
    const [unit, setUnit] = useState("");
    const [options, setOptions] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [optionInput, setOptionInput] = useState("");
    const [isRequired, setIsRequired] = useState(false);
    const [editableIndex, setEditableIndex] = useState<number | null>(null);

    useEffect(() => {
        console.log(companyAdminId)
        if (companyAdminId !== 0) {
            fetchReportsList();
        }
    }, []);

    useEffect(() => {
        console.log(selectedReport);
        if (!selectedReport?.submenus?.length) return;

        const fieldsMap: { [tabId: number]: ExtendedField[] } = {};

        for (const tab of selectedReport.submenus) {
            // Safely fallback to an empty array if tab.fields is undefined
            const fieldsWithTemplateInfo = (tab.fields ?? []).map((field) => ({
                ...field,
                templateId: selectedReport?._assignment?.templateId,
                customTemplateId: selectedReport?._assignment?.customTemplateId,
            }));

            fieldsMap[tab.id] = fieldsWithTemplateInfo;
        }

        console.log("Fields list", fieldsMap);
        setFieldsByTab(fieldsMap);
    }, [selectedReport]);

    const fetchReportsList = async () => {
        try {

            let reportsWithAssignment: ReportWithAssignment[] = [];

            console.log(companyAdminId, companyId, vesselType, vesselId);
            // Check if vesselType or vesselId is provided
            if (companyId !== 0 || vesselType !== '' || vesselId !== 0) {
                // 🧠 Fetch assigned templates first
                let filteredList: AssignedReports[] = [];
                // const allAssignments = await getAllAssignments(); // ✅ Await the async call

                if (companyAdminId !== 0 && companyId !== 0 && vesselType === '' && vesselId === 0) {
                    filteredList = await getAssignedTemplatesForCompany(companyAdminId, companyId);
                    // filteredList = allAssignments.filter(t =>
                    //     t.vesselType === "NULL" &&
                    //     t.companyAdmin === companyId &&
                    //     t.vessel === null &&
                    //     t.companyGroupAdmin === null
                    // );
                    if (!filteredList || filteredList.length === 0) {
                        // ⚡ Fall back to base templates
                        reportsWithAssignment = await fetchBaseTemplateReports();
                    }
                    console.log(filteredList);
                } else if (companyAdminId !== 0 && vesselType !== '' && vesselId === 0) {
                    console.log("Get assignments for vessel type")
                    filteredList = await getAssignedTemplatesForVesselType(companyAdminId, companyId, vesselType);
                    // filteredList = allAssignments.filter(t =>
                    //     t.vesselType === vesselType &&
                    //     t.companyAdmin === companyId &&
                    //     t.vessel === null &&
                    //     t.companyGroupAdmin === null
                    // );
                    console.log("After filtering:", filteredList);
                    if (!filteredList || filteredList.length === 0) {
                        // ⚡ Fall back to base templates
                        reportsWithAssignment = await fetchBaseTemplateReports();
                    }
                } else if (companyAdminId !== 0 && vesselType !== '' && vesselId !== 0) {
                    filteredList = await getAssignedTemplatesForVesselId(companyAdminId, companyId, vesselType, vesselId);
                    // filteredList = allAssignments.filter(t =>
                    //     t.vesselType === vesselType &&
                    //     t.companyAdmin === companyId &&
                    //     t.vessel === vesselId &&
                    //     t.companyGroupAdmin === null
                    // );
                    if (!filteredList || filteredList.length === 0) {
                        // ⚡ Fall back to base templates
                        reportsWithAssignment = await fetchBaseTemplateReports();
                    }
                }

                // Handle assigned templates (if any were returned)
                if (filteredList.length > 0) {
                    for (const item of filteredList) {
                        const templateId = item.template?.id ?? null;
                        const customTemplateId = item.customTemplate?.id ?? null;

                        if (customTemplateId && Array.isArray(item.customTemplate?.menus)) {
                            const customReports: ReportWithAssignment[] = item.customTemplate.menus.map((menu) => ({
                                id: menu.id,
                                name: menu.name,
                                isActive: menu.isActive,
                                order: 0,
                                templateId: item.customTemplate.masterTemplateId,
                                submenus: menu.submenus ?? [],
                                _assignment: {
                                    templateId: item.customTemplate.masterTemplateId,
                                    customTemplateId: item.customTemplate.id,
                                    assignmentId: item.id,
                                },
                            }));
                            reportsWithAssignment.push(...customReports);
                        }
                    }

                    const templateIDs = filteredList
                        .filter(item => item.customTemplate == null && item.template != null)
                        .map(item => item.template!.id);

                    if (templateIDs.length > 0) {
                        const reportsPerTemplate = await Promise.all(
                            templateIDs.map((id) => getReportsForTemplate(id))
                        );

                        for (const item of filteredList) {
                            const templateId = item.template?.id ?? null;
                            const customTemplateId = item.customTemplate?.id ?? null;

                            if (templateId && !customTemplateId) {
                                const matchingReports = reportsPerTemplate.flat().filter(r => r.templateId === templateId);
                                const reportsWithTabs = matchingReports.map((report) => ({
                                    ...report,
                                    submenus: report.submenus ?? [],
                                    _assignment: { templateId, customTemplateId, assignmentId: item.id }
                                }));
                                reportsWithAssignment.push(...reportsWithTabs);
                            }
                        }
                    }
                }
            } else {
                // 🧠 Handle assigned templates by company
                let templateList = await getAssignedTemplatesByCompanyAdmin(companyAdminId);
                console.log(templateList);
                // templateList = templateList.filter(item => item.vessel === null && item.vesselType === null);

                // console.log("filtered template list: ", templateList);
                const templateIDs = templateList
                    .filter(item => item.customTemplate == null && item.template != null)
                    .map(item => item.template!.id);
                console.log(templateIDs);

                for (const item of templateList) {
                    const templateId = item.template?.id ?? null;
                    const customTemplateId = item.customTemplate?.id ?? null;

                    console.log(item)
                    console.log(customTemplateId);
                    if (customTemplateId && Array.isArray(item.customTemplate?.menus)) {
                        const customReports: ReportWithAssignment[] = item.customTemplate.menus.map((menu) => ({
                            id: menu.id,
                            name: menu.name,
                            isActive: menu.isActive,
                            order: 0,
                            templateId: item.customTemplate.masterTemplateId,
                            submenus: menu.submenus ?? [],
                            _assignment: {
                                templateId: item.customTemplate.masterTemplateId,
                                customTemplateId: item.customTemplate.id,
                                assignmentId: item.id,
                            },
                        }));
                        reportsWithAssignment.push(...customReports);
                        console.log(customReports);
                    }
                }

                if (templateIDs.length > 0) {
                    const reportsPerTemplate = await Promise.all(
                        templateIDs.map((id) => getReportsForTemplate(id))
                    );
                    console.log(reportsPerTemplate);

                    for (const item of templateList) {
                        const templateId = item.template?.id ?? null;
                        const customTemplateId = item.customTemplate?.id ?? null;

                        if (templateId && !customTemplateId) {
                            const matchingReports = reportsPerTemplate.flat().filter(r => r.templateId === templateId);
                            const reportsWithTabs = matchingReports.map((report) => ({
                                ...report,
                                submenus: report.submenus ?? [],
                                _assignment: { templateId, customTemplateId, assignmentId: item.id }
                            }));
                            reportsWithAssignment.push(...reportsWithTabs);
                        }
                    }
                    console.log(reportsWithAssignment)
                }
            }

            // 🔧 Initialize states (same as before)
            const initialReportStates: any = {};
            const initialTabStates: any = {};
            const initialFieldStates: any = {};

            for (const report of reportsWithAssignment) {
                initialReportStates[report.id] = {
                    isActive: report.isActive,
                    templateId: report._assignment?.templateId ?? null,
                    customTemplateId: report._assignment?.customTemplateId ?? null,
                    name: report.name,
                    assignmentId: report._assignment?.assignmentId ?? null,
                };

                if (report.submenus?.length) {
                    for (const tab of report.submenus) {
                        initialTabStates[tab.id] = {
                            isActive: tab.isActive,
                            reportId: report.id,
                            templateId: report._assignment?.templateId ?? null,
                            customTemplateId: report._assignment?.customTemplateId ?? null,
                            name: tab.name
                        };
                    }

                    for (const submenu of report.submenus) {
                        for (const field of submenu.fields ?? []) {
                            initialFieldStates[field.id] = {
                                isActive: field.isActive,
                                submenuId: submenu.id,
                                templateId: report._assignment?.templateId ?? null,
                                customTemplateId: report._assignment?.customTemplateId ?? null,
                                label: field.label,
                                fieldType: field.fieldType,
                                required: field.required,
                                readOnly: field.readOnly,
                                warningOnly: field.warningOnly ?? null,
                                unit: field.unit ?? '',
                                minValue: field.minValue ?? null,
                                maxValue: field.maxValue ?? null,
                                optionsJson: field.optionsJson
                            };
                        }
                    }
                }
            }

            setReports(reportsWithAssignment);
            console.log("initialReportStates: ", initialReportStates);
            console.log("initialTabStates: ", initialTabStates);
            console.log("initialFieldStates: ", initialFieldStates);
            setReportStates(initialReportStates);
            setTabStates(initialTabStates);
            setFieldStates(initialFieldStates);

        } catch (err) {
            console.error('Failed to fetch reports list:', err);
            return [];
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

    const fetchBaseTemplateReports = async (): Promise<ReportWithAssignment[]> => {
        const templateIds = await fetchTemplateIds(); // fetch base template IDs
        let reportsWithAssignment: ReportWithAssignment[] = [];

        console.log('Base Template IDs:', templateIds);

        if (templateIds && templateIds.length > 0) {
            const reportsPerTemplate = await Promise.all(
                templateIds.map((id) => getReportsForTemplate(id))
            );

            for (const templateId of templateIds) {
                const matchingReports = reportsPerTemplate.flat().filter(r => r.templateId === templateId);
                const reportsWithTabs = matchingReports.map((report) => ({
                    ...report,
                    submenus: report.submenus ?? [],
                    _assignment: { templateId, customTemplateId: null, assignmentId: null }
                }));
                reportsWithAssignment.push(...reportsWithTabs);
            }
        } else {
            console.warn("No base templates found.");
        }

        return reportsWithAssignment;
    };

    const handleAssignClick = async () => {
        setIsAssigning(true);
        try {
            console.log("report states", reportStates);
            console.log("tab states", tabStates);
            console.log("field states", fieldStates);

            const templatesMap = new Map<number, { templateId: number | null; customTemplateId: number | null; assignmentId: number | null }>();

            // Collect all unique templates from reportStates
            Object.values(reportStates).forEach((r) => {
                if (r.templateId || r.customTemplateId) {
                    const key = r.customTemplateId ?? r.templateId!;
                    templatesMap.set(key, {
                        templateId: r.templateId,
                        customTemplateId: r.customTemplateId ?? null,
                        assignmentId: r.assignmentId ?? null,
                    });
                }
            });

            console.log("templates map: ", templatesMap);

            // Step 1: Clone and assign
            for (const { templateId, customTemplateId, assignmentId } of Array.from(templatesMap.values())) {
                if (templateId && !customTemplateId) {
                    // Clone logic (base template)
                    const result = await cloneTemplate(
                        templateId,
                        `Cloned Template for template ${templateId}`,
                        `A Clone for master template ${templateId}`,
                        companyAdminId,
                        companyId,
                        vesselType,
                        vesselId
                    );

                    console.log(result);

                    if (result?.id) {
                        const response = await assignCustomTemplate(
                            companyAdminId,
                            result.id,
                            companyId,
                            vesselType,
                            vesselId
                        );

                        console.log("assign custom response: ", response);

                        if (assignmentId) {
                            console.log("assignmentID", assignmentId);
                            const deleteResponse = await deleteAssignment(assignmentId);
                            console.log("Delete assignment response", deleteResponse);
                        }

                        console.log("custom menus: ", result.menus);
                        for (const menu of result.menus ?? []) {
                            console.log("Custom template menu: ", menu);
                            const reportState = Object.values(reportStates).find(
                                (r) => r.name === menu.name && r.templateId === templateId
                            );

                            const updateSubmenuResponse = await updateCustomMenuItem(
                                result.id,
                                menu.id,
                                menu.name,
                                reportState?.isActive ?? menu.isActive
                            );

                            console.log("update submenu response", updateSubmenuResponse);

                            for (const tab of menu.submenus ?? []) {
                                const tabState = Object.values(tabStates).find(
                                    (t) => t.name === tab.name && t.templateId === templateId
                                );

                                await updateCustomSubMenuItem(
                                    result.id,
                                    tab.id,
                                    tab.name,
                                    tabState?.isActive ?? tab.isActive
                                );

                                for (const field of tab.fields ?? []) {
                                    const fieldState = Object.values(fieldStates).find(
                                        (f) => f.label === field.label && f.templateId === templateId
                                    );

                                    await updateCustomField(
                                        result.id,
                                        field.id,
                                        field.label,
                                        field.fieldType,
                                        field.required,
                                        field.readOnly,
                                        fieldState?.warningOnly ?? field.warningOnly,
                                        fieldState?.isActive ?? field.isActive,
                                        field.unit,
                                        field.minValue,
                                        field.maxValue,
                                        field.optionsJson
                                    );
                                }
                            }
                        }
                        // Update cloned template menus
                        // for (const menu of result.menus ?? []) {
                        //     const report = Object.values(reportStates).find(
                        //         (r) => r.name === menu.name && r.templateId === templateId
                        //     );
                        //     const reportId = menu.id;

                        //     if (report && updatedReportIds.has(reportId)) {
                        //         await updateCustomMenuItem(
                        //             auth.jwt,
                        //             result.id,
                        //             reportId,
                        //             menu.name,
                        //             report.active
                        //         );
                        //     }

                        //     for (const tab of menu.submenus ?? []) {
                        //         const tabState = Object.values(tabStates).find(
                        //             (t) => t.name === tab.name && t.templateId === templateId
                        //         );
                        //         const tabId = tab.id;

                        //         if (tabState && updatedTabIds.has(tabId)) {
                        //             await updateCustomSubMenuItem(
                        //                 auth.jwt,
                        //                 result.id,
                        //                 tabId,
                        //                 tab.name,
                        //                 tabState.active
                        //             );
                        //         }

                        //         for (const field of tab.fields ?? []) {
                        //             const fieldState = Object.values(fieldStates).find(
                        //                 (f) => f.label === field.label && f.templateId === templateId
                        //             );
                        //             const fieldId = field.id;

                        //             if (fieldState && updatedFieldIds.has(fieldId)) {
                        //                 await updateCustomField(
                        //                     auth.jwt,
                        //                     result.id,
                        //                     fieldId,
                        //                     field.label,
                        //                     field.fieldType,
                        //                     field.required,
                        //                     fieldState.warningOnly ?? field.warningOnly,
                        //                     fieldState.active ?? field.active,
                        //                     field.unit,
                        //                     field.minValue,
                        //                     field.maxValue
                        //                 );
                        //             }
                        //         }
                        //     }
                        // }
                    }

                } else if (customTemplateId) {
                    // Already a custom template – just update states
                    for (const reportId of Array.from(updatedReportIds)) {
                        const report = reportStates[reportId];
                        if (report && report.customTemplateId === customTemplateId) {
                            await updateCustomMenuItem(customTemplateId, Number(reportId), report.name, report.isActive);
                        }
                    }

                    for (const tabId of Array.from(updatedTabIds)) {
                        const tab = tabStates[tabId];
                        if (tab && tab.customTemplateId === customTemplateId) {
                            await updateCustomSubMenuItem(customTemplateId, Number(tabId), tab.name, tab.isActive);
                        }
                    }

                    for (const fieldId of Array.from(updatedFieldIds)) {
                        const field = fieldStates[fieldId];
                        if (field && field.customTemplateId === customTemplateId) {
                            await updateCustomField(
                                customTemplateId,
                                Number(fieldId),
                                field.label,
                                field.fieldType,
                                field.required,
                                field.readOnly,
                                field.warningOnly ?? undefined,
                                field.isActive,
                                field.unit,
                                field.minValue,
                                field.maxValue,
                                field.optionsJson ?? [],
                            );
                        }
                    }
                }
            }

            // Step 5: Cleanup
            setReportStates({});
            setTabStates({});
            setFieldStates({});
            onReportAssigned();
            setSuccessMessage("Reports Assigned successfully!");

        } catch (error) {
            console.error('Assign Error:', error);
            alert('Failed to assign updates.');
        } finally {
            setIsAssigning(false); // End loading
        }
    };

    const handleAddOption = () => {
        if (optionInput.trim()) {
            setOptions(prev => [...prev, optionInput.trim()]);
            setOptionInput("");
        }
    };

    const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number(e.target.value);
        setMinValue(value);
        if (editingFieldId !== null) {
            setFieldStates(prev => ({
                ...prev,
                [editingFieldId]: {
                    ...prev[editingFieldId],
                    minValue: value
                }
            }));
            setUpdatedFieldIds(prev => new Set(prev).add(editingFieldId));
        }
        if (maxValue !== undefined && value > maxValue) {
            setError("Min value cannot be greater than max value.");
        } else {
            setError(null);
        }
    };

    const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number(e.target.value);
        setMaxValue(value);
        if (editingFieldId !== null) {
            setFieldStates(prev => ({
                ...prev,
                [editingFieldId]: {
                    ...prev[editingFieldId],
                    maxValue: value
                }
            }));
            setUpdatedFieldIds(prev => new Set(prev).add(editingFieldId));
        }
        if (minValue !== undefined && value < minValue) {
            setError("Max value cannot be less than min value.");
        } else {
            setError(null);
        }
    };

    const handleClose = () => {
        setReports([]);
        setReportStates({});
        setTabStates({});
        setFieldStates({});
        onClose();
    }

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="custom-modal-header d-flex justify-content-between align-items-center" >
                    <h5 className="m-0">Assign Report</h5>
                    <button className="close-btn" onClick={handleClose}>×</button>
                </div>

                <div className="custom-modal-body overflow-auto px-3 py-4" style={{ flex: 1, minHeight: 0 }}>
                    {editingReportId === null && successMessage === '' && (
                        <div>
                            {isAssigning && (
                                <div className="text-muted mt-2">
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Assigning... Please wait
                                </div>
                            )}
                            <ul>
                                {reports?.length === 0 ? (
                                    <div className='text-center mt-2 text-muted'>No Reports available</div>
                                ) : (
                                    (reports as ReportWithAssignment[]).map((report, index) => (
                                        <div className='d-flex align-items-center'>
                                            <input
                                                type="checkbox"
                                                className="form-check-input me-5"
                                                checked={reportStates[report.id]?.isActive ?? report.isActive}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;

                                                    // Update report state
                                                    setReportStates((prev) => ({
                                                        ...prev,
                                                        [report.id]: {
                                                            isActive: checked,
                                                            templateId: report.templateId,
                                                            customTemplateId: report._assignment?.customTemplateId ?? null,
                                                            name: report.name,
                                                            assignmentId:
                                                                prev[report.id]?.assignmentId ?? report._assignment?.assignmentId ?? null,
                                                        },
                                                    }));

                                                    setUpdatedReportIds((prev) => new Set(prev).add(report.id));

                                                    // Prepare new tabStates and fieldStates
                                                    const newTabStates = { ...tabStates };
                                                    const newFieldStates = { ...fieldStates };

                                                    report.submenus?.forEach((tab) => {
                                                        // ✅ Update tab
                                                        newTabStates[tab.id] = {
                                                            isActive: checked,
                                                            reportId: report.id,
                                                            templateId: report._assignment?.templateId ?? null,
                                                            customTemplateId: report._assignment?.customTemplateId ?? null,
                                                            name: tab.name,
                                                        };
                                                        setUpdatedTabIds((prev) => new Set(prev).add(tab.id));

                                                        // ✅ Update all fields of this tab
                                                        const fields = fieldsByTab[tab.id] || [];
                                                        fields.forEach((field) => {
                                                            newFieldStates[field.id] = {
                                                                isActive: checked,
                                                                submenuId: field.submenuId,
                                                                templateId: report._assignment?.templateId ?? null,
                                                                customTemplateId: report._assignment?.customTemplateId ?? null,
                                                                label: field.label,
                                                                fieldType: field.fieldType,
                                                                required: field.required,
                                                                readOnly: field.readOnly,
                                                                warningOnly: field.warningOnly ?? null,
                                                                unit: field.unit,
                                                                minValue: field.minValue,
                                                                maxValue: field.maxValue,
                                                                optionsJson: field.optionsJson,
                                                            };
                                                            setUpdatedFieldIds((prev) => new Set(prev).add(field.id));
                                                        });
                                                    });

                                                    // ✅ Final setStates after loop ends
                                                    setTabStates(newTabStates);
                                                    setFieldStates(newFieldStates);
                                                }}
                                            />
                                            <li key={report.id} className='list-group-item d-flex align-items-center justify-content-between'>
                                                <div
                                                    className='mt-3 p-4 border rounded-1 flex-grow-1 me-3 hover-shadow'
                                                    onClick={() => {
                                                        setEditingReportId(report.id);
                                                        console.log(report.templateId);
                                                        setEditingTemplateId(report.templateId);
                                                        setSelectedReport(report);
                                                    }}
                                                    style={{ backgroundColor: '#F9FAFB', borderColor: '#D1D5DB', cursor: 'pointer' }}
                                                >

                                                    {report.name}
                                                </div>
                                            </li>
                                        </div>
                                    ))
                                )}
                            </ul>
                            <div className="d-flex gap-2 mt-5 justify-content-end">
                                <button
                                    className="btn btn-sm btn-primary"
                                    onClick={() => handleAssignClick()}
                                    disabled={isAssigning}
                                >
                                    Assign
                                </button>
                                <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={handleClose}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Show tabs and fields list */}
                    {editingReportId !== null && editingTemplateId !== null && editingFieldId === null && successMessage === '' && (
                        <div className='px-3'>
                            <div className='py-3' style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                                <h5 className='mb-5'>{selectedReport?.name}</h5>

                                <div className='d-flex justify-content-between align-items-center mb-1'>
                                    <h6 className='mb-0'>Tabs</h6>
                                </div>
                                {selectedReport?.submenus?.length ? (
                                    selectedReport.submenus.map((tab, index) => (
                                        <div className="accordion" id="tabAccordion">
                                            <div key={tab.id} className="accordion-item">
                                                <h2 className="accordion-header" id="headingOne">
                                                    <button className={`accordion-button ${index !== 0 ? 'collapsed' : ''}`}
                                                        type="button" data-bs-toggle="collapse" data-bs-target={`#tab-${tab.id}`}
                                                        aria-expanded={index === 0 ? 'true' : 'false'}
                                                        aria-controls={`tab-${tab.id}`}>

                                                        <input
                                                            type="checkbox"
                                                            className="form-check-input me-5"
                                                            checked={tabStates[tab.id]?.isActive ?? tab.isActive}
                                                            onChange={(e) => {
                                                                const checked = e.target.checked;

                                                                setTabStates((prev) => ({
                                                                    ...prev,
                                                                    [tab.id]: {
                                                                        isActive: checked,
                                                                        reportId: selectedReport.id,
                                                                        templateId: selectedReport._assignment?.templateId ?? null,
                                                                        customTemplateId: selectedReport._assignment?.customTemplateId ?? null,
                                                                        name: tab.name
                                                                    }
                                                                }));
                                                                setUpdatedTabIds((prev) => new Set(prev).add(tab.id));

                                                                // Update all fields under this tab
                                                                const relatedFields = fieldsByTab[tab.id] || [];
                                                                setFieldStates((prev) => {
                                                                    const updated = { ...prev };
                                                                    relatedFields.forEach((field) => {
                                                                        updated[field.id] = {
                                                                            isActive: checked,
                                                                            submenuId: tab.id,
                                                                            templateId: selectedReport._assignment?.templateId ?? null,
                                                                            customTemplateId: selectedReport._assignment?.customTemplateId ?? null,
                                                                            label: field.label,
                                                                            fieldType: field.fieldType,
                                                                            required: field.required,
                                                                            readOnly: field.readOnly,
                                                                            warningOnly: field.warningOnly ?? null,
                                                                            unit: field.unit,
                                                                            minValue: field.minValue,
                                                                            maxValue: field.maxValue,
                                                                            optionsJson: field.optionsJson
                                                                        };
                                                                        setUpdatedFieldIds((prev) => new Set(prev).add(field.id));
                                                                    });
                                                                    return updated;
                                                                });
                                                            }}

                                                        />
                                                        {tab.name}
                                                    </button>
                                                </h2>
                                                <div id={`tab-${tab.id}`}
                                                    className={`accordion-collapse collapse ${index === 0 ? 'show' : ''}`}
                                                    aria-labelledby={`heading-${tab.id}`}
                                                    data-bs-parent="#tabAccordion">
                                                    <div className="accordion-body">
                                                        <h6 className='mb-0'>Fields</h6>
                                                        <div className="mt-4">
                                                            {fieldsByTab[tab.id] && fieldsByTab[tab.id].length > 0 ? (
                                                                <div className="mt-3 p-4 border rounded-1" style={{ borderColor: '#D1D5DB' }}>
                                                                    <ul className='ps-0 mb-0'>
                                                                        {fieldsByTab[tab.id].map((field) => {
                                                                            console.log(field);
                                                                            console.log(fieldStates[field.id]?.isActive);
                                                                            console.log(field.isActive);
                                                                            return (
                                                                                <li key={field.id} className='list-group-item d-flex align-items-center justify-content-between'>
                                                                                    <div
                                                                                        className='mt-3 p-4 border rounded-1 flex-grow-1 me-3'
                                                                                        style={{ backgroundColor: '#F9FAFB', borderColor: '#D1D5DB', cursor: 'pointer' }}
                                                                                    >
                                                                                        <input
                                                                                            type="checkbox"
                                                                                            className="form-check-input me-5"
                                                                                            checked={fieldStates[field.id]?.isActive ?? field.isActive}
                                                                                            onChange={(e) => {
                                                                                                const checked = e.target.checked;
                                                                                                setFieldStates((prev) => ({
                                                                                                    ...prev,
                                                                                                    [field.id]: {
                                                                                                        ...prev[field.id],
                                                                                                        isActive: checked,
                                                                                                        submenuId: tab.id,
                                                                                                        templateId: field.templateId,
                                                                                                        customTemplateId: field.customTemplateId,
                                                                                                        label: field.label,
                                                                                                        fieldType: field.fieldType,
                                                                                                        required: field.required,
                                                                                                        warningOnly: field.warningOnly ?? null,
                                                                                                        unit: field.unit,
                                                                                                        minValue: field.minValue,
                                                                                                        maxValue: field.maxValue,
                                                                                                        optionsJson: field.optionsJson,
                                                                                                    }
                                                                                                }));
                                                                                                setUpdatedFieldIds((prev) => new Set(prev).add(field.id));
                                                                                            }}
                                                                                        />
                                                                                        <strong>{field.label}</strong> – {field.fieldType}
                                                                                    </div>

                                                                                    {vesselId !== 0 && (
                                                                                        <button
                                                                                            className="btn btn-sm px-2"
                                                                                            onClick={() => {
                                                                                                setEditingFieldId(field.id);
                                                                                                setEditingTabId(field.submenuId);

                                                                                                setLabelName(field.label || "");
                                                                                                setInputType(field.fieldType || "text");
                                                                                                setIsRequired(field.required || false);
                                                                                                setMinValue(field.minValue ?? undefined);
                                                                                                setMaxValue(field.maxValue ?? undefined);
                                                                                                setWarningOnly(field.warningOnly ?? null);
                                                                                                setUnit(field.unit || "");
                                                                                                setOptions(field.optionsJson ?? []);
                                                                                            }}
                                                                                        >
                                                                                            <KTSVG path='/media/map/edit-active.svg' className='' />
                                                                                        </button>
                                                                                    )}
                                                                                </li>
                                                                            );
                                                                        })}
                                                                    </ul>
                                                                </div>
                                                            ) : (
                                                                <div className='text-center mt-2 text-muted'>No fields available</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>))
                                ) : (
                                    <div className="text-muted mt-3">No tabs available</div>
                                )}

                            </div>
                            <div className="d-flex gap-2 mt-5 justify-content-end">
                                <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => {
                                        setEditingReportId(null)
                                        setEditingTemplateId(null)
                                    }}
                                >
                                    Back
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Show edit form when editing */}
                    {editingFieldId !== null && editingTabId !== null && successMessage === '' && (
                        <div>
                            <label className='modal_label'>Label Name</label>
                            <input
                                type='text'
                                value={labelName}
                                onChange={(e) => setLabelName(e.target.value)}
                                className='form-control'
                                disabled
                            />
                            <label className='modal_label mt-5'>Choose Input Type:</label>
                            <select
                                className='form-select'
                                value={inputType}
                                onChange={(e) => {
                                    setInputType(e.target.value);
                                    setOptions([]); // reset options if type changes
                                }}
                                disabled
                            >
                                <option value="text">Text</option>
                                <option value="number">Number</option>
                                <option value="date">Date</option>
                                <option value="checkbox">Checkbox</option>
                                <option value="radio">Radio Buttons</option>
                                <option value="select">Dropdown (Select)</option>
                                <option value="textarea">Textarea</option>
                            </select>
                            {inputType === "number" && (
                                <div className="mt-4">
                                    <label>Validation Range</label>
                                    <div className="d-flex gap-3">
                                        <input
                                            type="number"
                                            value={minValue ?? ""}
                                            onChange={handleMinChange}
                                            className="form-control"
                                            placeholder="Min Value"
                                        />
                                        <input
                                            type="number"
                                            value={maxValue ?? ""}
                                            onChange={handleMaxChange}
                                            className="form-control"
                                            placeholder="Max Value"
                                        />
                                    </div>
                                    {error && (
                                        <div className="text-danger mt-2">
                                            <small>{error}</small>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Show options input only if needed */}
                            {(inputType === "select" || inputType === "radio" || inputType === "checkbox") && (
                                <div className="mt-4">
                                    <label>Add Options:</label>
                                    <div className="d-flex gap-2">
                                        <input
                                            type="text"
                                            value={optionInput}
                                            onChange={(e) => setOptionInput(e.target.value)}
                                            className="form-control"
                                            placeholder="Option value"
                                        />
                                        <button className="btn btn-outline-secondary" onClick={handleAddOption}>Add</button>
                                    </div>
                                    <ul className="mt-2 ps-0">
                                        {options.map((opt, idx) => (
                                            <li
                                                key={idx}
                                                className='list-group-item mb-2 d-flex align-items-center justify-content-between'
                                                style={{ color: '#1f2937', fontWeight: 500 }}
                                            >
                                                <input
                                                    type="text"
                                                    className="form-control me-2"
                                                    value={opt}
                                                    disabled={editableIndex !== idx}
                                                    onChange={(e) => {
                                                        const updatedOptions = [...options];
                                                        updatedOptions[idx] = e.target.value;
                                                        setOptions(updatedOptions);
                                                    }}
                                                />

                                                {/* <div className="d-flex gap-2">
                                                    <button
                                                        className="btn btn-sm px-0"
                                                        onClick={() =>
                                                            editableIndex === idx
                                                                ? setEditableIndex(null)
                                                                : setEditableIndex(idx)
                                                        }
                                                    >
                                                        {editableIndex === idx ? <KTSVG path='/media/map/save-1.svg' className='svg-icon-2' /> : <KTSVG path='/media/map/edit-active.svg' className='' />
                                                        }
                                                    </button>
                                                    <button
                                                        className="btn btn-sm px-0"
                                                        onClick={() => {
                                                            const updatedOptions = options.filter((_, i) => i !== idx);
                                                            setOptions(updatedOptions);
                                                            if (editableIndex === idx) setEditableIndex(null);
                                                        }}
                                                    >
                                                        <KTSVG path='/media/map/trash.svg' className='' />
                                                    </button>
                                                </div> */}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {inputType === "number" && (
                                <>
                                    <label className='modal_label mt-5'>Unit</label>
                                    <select
                                        className='form-select'
                                        value={unit}
                                        onChange={(e) => {
                                            setUnit(e.target.value);
                                            if (editingFieldId !== null) {
                                                setFieldStates(prev => ({
                                                    ...prev,
                                                    [editingFieldId]: {
                                                        ...prev[editingFieldId],
                                                        unit: e.target.value
                                                    }
                                                }));
                                                setUpdatedFieldIds(prev => new Set(prev).add(editingFieldId));
                                            }
                                        }}
                                    >
                                        <option value="">Select a unit</option>
                                        <option value="%">Percentage (%)</option>
                                        <option value="C">Celsius (°C)</option>
                                        <option value="mbar">mbar (Millibar)</option>
                                        <option value="bar">bar (Bar)</option>
                                        <option value="psi">psi (Pounds per square inch)</option>
                                        <option value="Pa">Pa (Pascal)</option>
                                        <option value="kPa">kPa (Kilopascal)</option>
                                        <option value="atm">atm (Atmosphere)</option>
                                        <option value="mmHg">mmHg (Millimeters of mercury)</option>
                                        <option value="inHg">inHg (Inches of mercury)</option>
                                        <option value="°C">°C (Celsius)</option>
                                        <option value="knots">knots</option>
                                        <option value="m/s">m/s (Meters per second)</option>
                                        <option value="ppt">ppt (Salinity)</option>
                                    </select>
                                </>
                            )}
                            {
                                inputType === "number" && (
                                    <>
                                        <label className='modal_label mt-5'>Validation Type</label>
                                        <div className='d-flex gap-4 mb-5'>
                                            <div className="form-check">
                                                <input
                                                    type='radio'
                                                    value={WarningLevel.STRICT}
                                                    name='type'
                                                    className="form-check-input"
                                                    checked={warningOnly === WarningLevel.STRICT}
                                                    onChange={() => {
                                                        setWarningOnly(WarningLevel.STRICT)
                                                        if (editingFieldId !== null) {
                                                            setFieldStates(prev => ({
                                                                ...prev,
                                                                [editingFieldId]: {
                                                                    ...prev[editingFieldId],
                                                                    warningOnly: WarningLevel.STRICT
                                                                }
                                                            }));
                                                            setUpdatedFieldIds(prev => new Set(prev).add(editingFieldId));
                                                        }
                                                    }}
                                                />
                                                <label className="form-check-label">Strict</label>
                                            </div>
                                            <div className="form-check">
                                                <input
                                                    type='radio'
                                                    value={WarningLevel.SOFT}
                                                    name='type'
                                                    className="form-check-input"
                                                    checked={warningOnly === WarningLevel.SOFT}
                                                    onChange={() => {
                                                        setWarningOnly(WarningLevel.SOFT)
                                                        if (editingFieldId !== null) {
                                                            setFieldStates(prev => ({
                                                                ...prev,
                                                                [editingFieldId]: {
                                                                    ...prev[editingFieldId],
                                                                    warningOnly: WarningLevel.SOFT
                                                                }
                                                            }));
                                                            setUpdatedFieldIds(prev => new Set(prev).add(editingFieldId));
                                                        }
                                                    }}
                                                />
                                                <label className="form-check-label">Soft</label>
                                            </div>
                                        </div>
                                    </>
                                )
                            }
                            <input
                                type="checkbox"
                                className="form-check-input mt-5"
                                id="requiredCheckbox"
                                checked={isRequired}
                                onChange={(e) => {
                                    setIsRequired(e.target.checked)
                                    if (editingFieldId !== null) {
                                        setFieldStates(prev => ({
                                            ...prev,
                                            [editingFieldId]: {
                                                ...prev[editingFieldId],
                                                required: e.target.checked
                                            }
                                        }));
                                        setUpdatedFieldIds(prev => new Set(prev).add(editingFieldId));
                                    }
                                }}
                            />
                            <label className="form-check-label ps-3 mt-5" htmlFor="requiredCheckbox">
                                Required
                            </label>
                            <div className="d-flex justify-content-end gap-2 mt-5">
                                {/* <button
                                    className="btn btn-sm btn-primary"
                                    onClick={() => handleUpdateClick(editingFieldId, editingTabId)}
                                >
                                    Update
                                </button> */}
                                <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => {
                                        setEditingFieldId(null)
                                        setEditingTabId(null)
                                    }}
                                >
                                    Back
                                </button>
                            </div>
                        </div>
                    )}

                    {successMessage && (
                        <div className="alert alert-success mt-3">{successMessage}</div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default AssignReportModal;
