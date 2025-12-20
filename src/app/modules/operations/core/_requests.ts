import axios from 'axios';
import { AssignedReports, Company, CompanyAdmin, CreatedReports, CustomAssignedReports, Fields, Reports, Submenu, Template, Vessel, Voyage, WarningLevel, VesselOperations , CargoOperation, CargoOperationRequest, CargoBreakupType } from './_models';

const API_URL = process.env.REACT_APP_API_URL

const COMPANY_API_URL = `${API_URL}/users/company`;
const VESSEL_API_URL = `${API_URL}/vessels`;
const TEMPLATES_API_URL = `${API_URL}/templates`;
const MENUS_API_URL = `${API_URL}/menus`;
const SUBMENUS_API_URL = `${API_URL}/submenus`;
const ASSIGN_API_URL = `${API_URL}/assignments`;
const CUSTOM_API_URL = `${API_URL}/custom-templates`;
const CREW_API_URL = `${API_URL}/crew`;
const VOYAGES_API_URL = `${API_URL}/voyages`;
const COMPANY_ADMIN_API_URL = `${API_URL}/company-group-admins`;

export const getCreatedReportById = async (): Promise<CreatedReports[]> => {
  try {
    const response = await axios.get(API_URL + "/reports");

    return response.data;

  } catch (error: any) {
    console.error('Error fetching created reports:', error);
    throw new Error(error.response?.data?.message || 'Error fetching created reports');
  }
};

export const getAssignedTemplatesForUser = async (): Promise<AssignedReports[]> => {
  try {
    const response = await axios.get(ASSIGN_API_URL + "/my-templates");

    return response.data;

  } catch (error: any) {
    console.error('Error fetching assigned reports:', error);
    throw new Error(error.response?.data?.message || 'Error fetching assigned reports');
  }
};

export const getAllAssignments = async (): Promise<AssignedReports[]> => {
  try {
    const response = await axios.get(ASSIGN_API_URL);

    return response.data;

  } catch (error: any) {
    console.error('Error fetching assigned reports:', error);
    throw new Error(error.response?.data?.message || 'Error fetching assigned reports');
  }
};

export const getAssignmentById = async (assignId: number): Promise<AssignedReports> => {
  try {
    const response = await axios.get(ASSIGN_API_URL + "/" + assignId);

    return response.data;

  } catch (error: any) {
    console.error('Error fetching assigned reports:', error);
    throw new Error(error.response?.data?.message || 'Error fetching assigned reports');
  }
};

export const getAssignedTemplatesByCompanyAdmin = async (companyAdminId: number): Promise<AssignedReports[]> => {
  try {
    const response = await axios.get(ASSIGN_API_URL + "/group/" + companyAdminId);

    return response.data;

  } catch (error: any) {
    console.error('Error fetching assigned reports for company Admin:', error);
    throw new Error(error.response?.data?.message || 'Error fetching assigned reports for Company Admin');
  }
};
export const getAssignedTemplatesByCompany = async (companyAdminId: number, companyId: number): Promise<AssignedReports[]> => {
  try {
    const response = await axios.get(ASSIGN_API_URL + "/group/" + companyAdminId + "/company/" + companyId);

    console.log("Company assignments", response.data);

    return response.data;

  } catch (error: any) {
    console.error('Error fetching assigned reports for company:', error);
    throw new Error(error.response?.data?.message || 'Error fetching assigned reports for company');
  }
};

export const getAssignedTemplatesByVesselType = async (
  companyAdminId: number,
  companyId: number,
  vesselType: string
): Promise<AssignedReports[]> => {
  try {
    let url = `${ASSIGN_API_URL}/group/${companyAdminId}/vesselType/${vesselType}`;

    if (companyId !== 0) {
      url += `?caId=${companyId}`;
    }

    const response = await axios.get(url);

    return response.data;
  } catch (error: any) {
    console.error('Error fetching assigned reports for vessel type:', error);
    throw new Error(error.response?.data?.message || 'Error fetching assigned reports for vessel type');
  }
};
// export const getAssignedTemplatesByVesselType = async (companyAdminId: number, companyId: number, vesselType: string): Promise<AssignedReports[]> => {
//   try {
//     const response = await axios.get(ASSIGN_API_URL + "/group/" + companyAdminId + "/company/" + companyId + "/vesselType/" + vesselType);

//     return response.data;

//   } catch (error: any) {
//     console.error('Error fetching assigned reports for vessel type:', error);
//     throw new Error(error.response?.data?.message || 'Error fetching assigned reports for vessel type');
//   }
// };

export const getAssignedTemplatesByVesselId = async (
  companyAdminId: number,
  companyId: number,
  vesselType: string,
  vesselId: number
): Promise<AssignedReports[]> => {
  try {
    let url = `${ASSIGN_API_URL}/group/${companyAdminId}/vesselType/${vesselType}/vesselId/${vesselId}`;

    if (companyId !== 0) {
      url += `?caId=${companyId}`;
    }

    const response = await axios.get(url);

    return response.data;
  } catch (error: any) {
    console.error('Error fetching assigned reports for vessel Id:', error);
    throw new Error(error.response?.data?.message || 'Error fetching assigned reports for vessel Id');
  }
};

// export const getAssignedTemplatesByVesselId = async (companyAdminId: number, companyId: number, vesselType: string, vesselId: number): Promise<AssignedReports[]> => {
//   try {
//     const response = await axios.get(ASSIGN_API_URL + "/group/" + companyAdminId + "/" + companyId + "/" + vesselType + "/vesselId/" + vesselId);

//     return response.data;

//   } catch (error: any) {
//     console.error('Error fetching assigned reports for vessel Id:', error);
//     throw new Error(error.response?.data?.message || 'Error fetching assigned reports for vessel Id');
//   }
// };

// Without subcompany
export const getAssignedTemplatesByVessel = async (companyAdminId: number, companyId: number, vesselType: string, vesselId: number): Promise<AssignedReports[]> => {
  try {
    const response = await axios.post(ASSIGN_API_URL + "/group/vesselId/" + vesselId,
      {
        companyGroupAdmin: companyAdminId
      }
    );

    return response.data;

  } catch (error: any) {
    console.error('Error fetching assigned reports for vessel Id:', error);
    throw new Error(error.response?.data?.message || 'Error fetching assigned reports for vessel Id');
  }
};

export const getAssignedTemplatesForCompany = async (companyAdminId: number, companyId: number): Promise<AssignedReports[]> => {
  try {
    const response = await axios.get(ASSIGN_API_URL + "/company/null/" + companyAdminId + "/" + companyId);

    return response.data;

  } catch (error: any) {
    console.error('Error fetching assigned reports for company:', error);
    throw new Error(error.response?.data?.message || 'Error fetching assigned reports for company');
  }
};

export const getAssignedTemplatesForVesselType = async (
  companyAdminId: number,
  companyId: number,
  vesselType: string
): Promise<AssignedReports[]> => {
  try {
    let url = `${ASSIGN_API_URL}/group/${companyAdminId}/vesselType/null/${vesselType}`;

    if (companyId !== 0) {
      url += `?caId=${companyId}`;
    }

    const response = await axios.get(url);

    return response.data;
  } catch (error: any) {
    console.error('Error fetching assigned reports for vessel type:', error);
    throw new Error(error.response?.data?.message || 'Error fetching assigned reports for vessel type');
  }
};

// export const getAssignedTemplatesForVesselType = async (companyAdminId: number, companyId: number, vesselType: string): Promise<AssignedReports[]> => {
//   try {
//     const response = await axios.get(ASSIGN_API_URL + "/group/" + companyAdminId + "/company/" + companyId + "/vesselType/null/" + vesselType);

//     return response.data;

//   } catch (error: any) {
//     console.error('Error fetching assigned reports for vessel type:', error);
//     throw new Error(error.response?.data?.message || 'Error fetching assigned reports for vessel type');
//   }
// };

export const getAssignedTemplatesForVesselId = async (
  companyAdminId: number,
  companyId: number,
  vesselType: string,
  vesselId: number
): Promise<AssignedReports[]> => {
  try {
    let url = `${ASSIGN_API_URL}/group/${companyAdminId}/vesselType/${vesselType}/vesselId/null/${vesselId}`;

    if (companyId !== 0) {
      url += `?caId=${companyId}`;
    }

    const response = await axios.get(url);

    return response.data;

  } catch (error: any) {
    console.error('Error fetching assigned reports for vessel Id:', error);
    throw new Error(error.response?.data?.message || 'Error fetching assigned reports for vessel Id');
  }
};

// export const getAssignedTemplatesForVesselId = async (companyAdminId: number, companyId: number, vesselType: string, vesselId: number): Promise<AssignedReports[]> => {
//   try {
//     const response = await axios.get(ASSIGN_API_URL + "/group/" + companyAdminId + "/" + companyId + "/" + vesselType + "/vesselId/null/" + vesselId);

//     return response.data;

//   } catch (error: any) {
//     console.error('Error fetching assigned reports for vessel Id:', error);
//     throw new Error(error.response?.data?.message || 'Error fetching assigned reports for vessel Id');
//   }
// };

export const getCustomAssignedTemplates = async (accessToken: string): Promise<CustomAssignedReports[]> => {
  try {
    const response = await axios.get(TEMPLATES_API_URL + "/custom", {
      headers: {
        Authorization: `Bearer ${accessToken}`, // Attach the access token
      },
    });

    return response.data;

  } catch (error: any) {
    console.error('Error fetching assigned reports:', error);
    throw new Error(error.response?.data?.message || 'Error fetching assigned reports');
  }
};

export const cloneTemplate = async (
  masterTemplateId: number,
  newName: string,
  description: string,
  companyAdminId: number,
  companyId: number,
  vesselType?: string,
  vesselId?: number
): Promise<CustomAssignedReports> => {
  try {
    console.log(companyAdminId);
    console.log(vesselType);
    // Construct body dynamically
    const requestBody: any = {
      masterTemplateId,
      name: newName,
      description,
      companyGroupAdminId: companyAdminId,  //Company
    };

    if (companyId && companyId !== 0) {
      requestBody.companyAdminId = companyId;
    }

    // Only include vesselType if it's truthy (not null/undefined/empty string)
    if (vesselType) {
      requestBody.vesselType = vesselType;
    }

    // Only include vesselId if it's NOT 0, null, or undefined
    if (vesselId && vesselId !== 0) {
      requestBody.vesselId = vesselId;
    }

    const response = await axios.post(`${TEMPLATES_API_URL}/clone`, requestBody);

    return response.data;
  } catch (error: any) {
    console.error('Full error object:', error);
    throw new Error(error?.response?.data?.message || error.message || 'Error cloning template');
  }
};

export const getVesselTypeList = async (): Promise<Vessel[]> => {
  try {
    const response = await axios.get(VESSEL_API_URL);

    return response.data;

  } catch (error: any) {
    console.error('Error fetching vesel type list:', error);
    throw new Error(error.response?.data?.message || 'Error fetching vessel type list');
  }
};

export const getCompanyList = async (): Promise<Company[]> => {
  try {
    const response = await axios.get(COMPANY_API_URL);

    return response.data; // Return company data

  } catch (error: any) {
    console.error('Error fetching company list:', error);
    throw new Error(error.response?.data?.message || 'Error fetching company list');
  }
};

export const getTemplateList = async (): Promise<Template[]> => {
  try {
    const response = await axios.get(TEMPLATES_API_URL);

    let data = response.data;

    return data;
  } catch (error: any) {
    console.error('Error fetching template list:', error);
    throw new Error(error.response?.data?.message || 'Error fetching template list');
  }
};

export const deleteTemplate = async (tempId: number): Promise<Fields[]> => {
  try {
    const response = await axios.delete(TEMPLATES_API_URL + "/delete/" + tempId);

    return response.data;
  } catch (error: any) {
    console.error('Error deleting template:', error);
    throw new Error(error.response?.data?.message || 'Error deleting template');
  }
};

export const getReportsForTemplate = async (tempId: number): Promise<Reports[]> => {
  try {
    const response = await axios.get(TEMPLATES_API_URL + "/" + tempId + "/menus");

    let data = response.data;

    console.log("menu response data: ", data);
    return data;
  } catch (error: any) {
    console.error('Error fetching reports list:', error);
    throw new Error(error.response?.data?.message || 'Error fetching reports list');
  }
};

export const getTabsForReport = async (menuId: number): Promise<Submenu[]> => {
  try {
    const response = await axios.get(MENUS_API_URL + "/" + menuId + "/submenus");

    let data = response.data;

    return data;
  } catch (error: any) {
    console.error('Error fetching tabs list:', error);
    throw new Error(error.response?.data?.message || 'Error fetching tabs list');
  }
};

export const getFieldsForTab = async (tabId: number): Promise<Fields[]> => {
  try {
    const response = await axios.get(SUBMENUS_API_URL + "/" + tabId + "/fields");

    let data = response.data;

    const fields: Fields[] = data.map((field: any) => ({
      ...field,
      submenu: { id: tabId }
    }));

    return fields;
  } catch (error: any) {
    console.error('Error fetching fields list:', error);
    throw new Error(error.response?.data?.message || 'Error fetching fields list');
  }
};

export const createTemplate = async (templateName: string) => {
  try {
    const response = await axios.post(TEMPLATES_API_URL + '/create',
      {
        name: templateName,
        isActive: true,
      }
    );

    return response.data
  } catch (error: any) {
    console.error('Error creating template:', error);
    throw new Error(error.response?.data?.message || 'Error creating template');
  }
};

export const createMenuItem = async (
  tempId: number,
  reportName: string,
  active: boolean,
  order?: number): Promise<Reports[]> => {
  try {
    const response = await axios.post(TEMPLATES_API_URL + "/" + tempId + '/menus/create',
      {
        name: reportName,
        isActive: active,
      },
    );

    return response.data;
  } catch (error: any) {
    console.error('Error creating menu item:', error);
    throw new Error(error.response?.data?.message || 'Error creating menu item');
  }
};

export const updateMenuItem = async (
  tempId: number,
  reportId: number,
  reportName: string,
  active: boolean,
  order?: number): Promise<Reports[]> => {
  try {
    const response = await axios.put(TEMPLATES_API_URL + "/" + tempId + '/menus/update/' + reportId,
      {
        name: reportName,
        isActive: active,
      },
    );

    return response.data;
  } catch (error: any) {
    console.error('Error updating menu item:', error);
    throw new Error(error.response?.data?.message || 'Error updating menu item');
  }
};

export const deleteMenuItem = async (tempId: number, reportId: number,): Promise<Reports[]> => {
  try {
    const response = await axios.delete(TEMPLATES_API_URL + "/" + tempId + '/menus/delete/' + reportId);

    return response.data;
  } catch (error: any) {
    console.error('Error deleting menu item:', error);
    throw new Error(error.response?.data?.message || 'Error deleting menu item');
  }
};

export const createCustomMenuItem = async (
  accessToken: string,
  customTempId: number,
  reportName: string,
  active: boolean,
  order?: number): Promise<Reports[]> => {
  try {
    const response = await axios.post(CUSTOM_API_URL + "/" + customTempId + '/menu/create',
      {
        name: reportName,
        active: active,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`, // Attach the access token

        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Error creating menu item:', error);
    throw new Error(error.response?.data?.message || 'Error creating menu item');
  }
};

export const createCustomSubmenuItem = async (
  accessToken: string,
  menuId: number,
  reportName: string,
  active: boolean,
  order?: number): Promise<Submenu[]> => {
  try {
    const response = await axios.post(API_URL + "/menus" + menuId + '/submenus/customTemplates/create',
      {
        name: reportName,
        active: active,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`, // Attach the access token

        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Error creating submenu item:', error);
    throw new Error(error.response?.data?.message || 'Error creating submenu item');
  }
};

export const createCustomFieldItem = async (
  accessToken: string,
  submenuId: number,
  label: string,
  fieldType: string,
  required: boolean,
  active?: boolean,
  warningOnly?: WarningLevel | undefined,
  unit?: string,
  minValue?: number,
  maxValue?: number,
  options?: string[] | null
): Promise<Submenu[]> => {
  try {
    const response = await axios.post(API_URL + "/submenus" + submenuId + '/fields/customTemplate/create',
      {
        label,
        fieldType,
        required,
        active: active,
        unit,
        minValue,
        maxValue,
        warningOnly,
        optionsJson: options,
        submenu: {
          id: submenuId
        }
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`, // Attach the access token

        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Error creating submenu item:', error);
    throw new Error(error.response?.data?.message || 'Error creating submenu item');
  }
};

export const createSubmenuItem = async (menuId: number,
  reportName: string,
  active: boolean,
  order?: number): Promise<Submenu> => {
  try {
    const response = await axios.post(MENUS_API_URL + "/" + menuId + '/submenus/create',
      {
        name: reportName,
        isActive: active,
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Error creating submenu item:', error);
    throw new Error(error.response?.data?.message || 'Error creating submenu item');
  }
};

export const updateSubMenuItem = async (
  menuId: number,
  submenuId: number,
  tabName: string,
  active: boolean,
  order?: number): Promise<Reports[]> => {
  try {
    const response = await axios.put(MENUS_API_URL + "/" + menuId + '/submenus/update/' + submenuId,
      {
        name: tabName,
        isActive: active,
      },
    );

    return response.data;
  } catch (error: any) {
    console.error('Error updating menu item:', error);
    throw new Error(error.response?.data?.message || 'Error updating menu item');
  }
};

export const deleteSubMenuItem = async (menuId: number, submenuId: number,): Promise<Reports[]> => {
  try {
    const response = await axios.delete(MENUS_API_URL + "/" + menuId + '/submenus/delete/' + submenuId);

    return response.data;
  } catch (error: any) {
    console.error('Error deleting menu item:', error);
    throw new Error(error.response?.data?.message || 'Error deleting menu item');
  }
};

export const createField = async (
  submenuId: number,
  label: string,
  fieldType: string,
  readOnly: boolean,
  required: boolean,
  active?: boolean,
  warningOnly?: WarningLevel | undefined,
  unit?: string,
  minValue?: number,
  maxValue?: number,
  options?: string[] | null
): Promise<Fields[]> => {
  try {
    const response = await axios.post(SUBMENUS_API_URL + "/" + submenuId + '/fields/create',
      {
        label,
        fieldType,
        required,
        readOnly,
        isActive: active,
        unit,
        minValue,
        maxValue,
        warningOnly,
        optionsJson: options,
        submenu: {
          id: submenuId
        }
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Error creating submenu item:', error);
    throw new Error(error.response?.data?.message || 'Error creating Field item');
  }
};

export const updateField = async (
  submenuId: number,
  fieldId: number,
  label: string,
  fieldType: string,
  required?: boolean,
  readOnly?: boolean,
  warningOnly?: WarningLevel | undefined,
  active?: boolean,
  unit?: string,
  minValue?: number,
  maxValue?: number,
  options?: string[]
): Promise<Fields[]> => {
  try {
    const payload: any = {
      label,
      fieldType,
      readOnly,
      required,
      isActive: active,
      unit,
      minValue,
      maxValue,
      warningOnly,
      submenu: {
        id: submenuId
      }
    };

    if (options && options.length > 0) {
      payload.optionsJson = options;
    }

    const response = await axios.put(
      `${SUBMENUS_API_URL}/${submenuId}/fields/update/${fieldId}`,
      payload
    );

    return response.data;

  } catch (error: any) {
    console.error('Error updating field item:', error);
    throw new Error(error.response?.data?.message || 'Error updating field item');
  }
};

export const deleteField = async (submenuId: number, fieldId: number): Promise<Fields[]> => {
  try {
    const response = await axios.delete(SUBMENUS_API_URL + "/" + submenuId + '/fields/delete/' + fieldId);

    return response.data;
  } catch (error: any) {
    console.error('Error deleting field item:', error);
    throw new Error(error.response?.data?.message || 'Error deleting field item');
  }
};
export const deleteAssignment = async (assgnId: number): Promise<AssignedReports[]> => {
  try {
    const response = await axios.delete(ASSIGN_API_URL + "/remove/" + assgnId,
    );

    return response.data;
  } catch (error: any) {
    console.error('Error deleting assignment:', error);
    throw new Error(error.response?.data?.message || 'Error deleting assignment');
  }
};

export const assignReport = async (companyAdminId: number, templateId: number, companyId?: number, vesselType?: string, vesselId?: number): Promise<AssignedReports[]> => {
  try {
    const requestBody: any = {
      template: {
        id: templateId
      },
    };

    if (companyId && companyId !== 0) {
      requestBody.companyAdmin = companyId; //sub-company
    }

    if (vesselType) {
      requestBody.vesselType = vesselType;
    }

    if (vesselId && vesselId !== 0) {
      requestBody.vesselId = vesselId;
    }

    const response = await axios.post(ASSIGN_API_URL + "/assign/group/" + companyAdminId, requestBody);

    return response.data;
  } catch (error: any) {
    console.error('Error assigning template:', error);
    throw new Error(error.response?.data?.message || 'Error assigning template');
  }
};

export const assignCustomTemplate = async (companyAdminId: number, customTemplateId: number, companyId?: number, vesselType?: string, vesselId?: number): Promise<AssignedReports[]> => {
  try {
    // Construct body dynamically
    const requestBody: any = {
      customTemplate: {
        id: customTemplateId
      },
    };

    if (companyId && companyId !== 0) {
      requestBody.companyAdmin = companyId; //sub-company
    }

    // Only include vesselType if it's truthy (not null/undefined/empty string)
    if (vesselType) {
      requestBody.vesselType = vesselType;
    }

    // Only include vesselId if it's NOT 0, null, or undefined
    if (vesselId && vesselId !== 0) {
      requestBody.vesselId = vesselId;
    }

    const response = await axios.post(ASSIGN_API_URL + "/assign/custom/group/" + companyAdminId, requestBody);

    return response.data;
  } catch (error: any) {
    console.error('Error assigning custom template:', error);
    throw new Error(error.response?.data?.message || 'Error assigning custom template');
  }
};

export const updateCustomMenuItem = async (
  customTempId: number,
  reportId: number,
  reportName: string,
  active: boolean,
  order?: number): Promise<Reports[]> => {
  try {
    const response = await axios.put(CUSTOM_API_URL + "/" + customTempId + '/menus/' + reportId,
      {
        name: reportName,
        isActive: active,
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Error updating custom menu item:', error);
    throw new Error(error.response?.data?.message || 'Error updating custom menu item');
  }
};

export const updateCustomSubMenuItem = async (
  customTempId: number,
  submenuId: number,
  tabName: string,
  active: boolean,
  order?: number): Promise<Reports[]> => {
  try {
    const response = await axios.put(CUSTOM_API_URL + "/" + customTempId + '/submenus/' + submenuId,
      {
        name: tabName,
        isActive: active,
      },
    );

    return response.data;
  } catch (error: any) {
    console.error('Error updating custom submenu item:', error);
    throw new Error(error.response?.data?.message || 'Error updating custom submenu item');
  }
};

export const updateCustomField = async (
  customTempId: number,
  fieldId: number,
  label: string,
  fieldType: string,
  readOnly: boolean,
  required?: boolean,
  warningOnly?: WarningLevel | undefined,
  active?: boolean,
  unit?: string,
  minValue?: number,
  maxValue?: number,
  options?: string[]
): Promise<Fields[]> => {
  try {
    const payload: any = {
      label,
      fieldType,
      required,
      readOnly,
      optionsJson: options,
      isActive: active,
      unit,
      minValue,
      maxValue,
      warningOnly
    };

    if (options && options.length > 0) {
      payload.optionsJson = options;
    }

    const response = await axios.put(
      `${CUSTOM_API_URL}/${customTempId}/fields/${fieldId}`,
      payload
    );

    return response.data;

  } catch (error: any) {
    console.error('Error updating custom field item:', error);
    throw new Error(error.response?.data?.message || 'Error updating custom field item');
  }
};

export const submitReport = async (reportType: string,
  status: string,
  hasWarnings: boolean,
  voyageId: number,
  assignmentId: number,
  values: { field: number, valueText: string }[],
  vesselId?: number,
  noOfWarnings?: number,
): Promise<CreatedReports[]> => {
  try {
    console.log(values);
    const response = await axios.post(
      CREW_API_URL + "/" + assignmentId + "/reports/submitReport",
      {
        reportType,
        status,
        submittedDateTime: new Date().toISOString(), // current timestamp
        createdDateTime: new Date().toISOString(), // current timestamp
        hasWarnings,
        voyage: voyageId,
        vesselId: vesselId,
        // vesselType: "BULK_CARRIER",
        values,
        noOfWarnings
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Error submitting report:', error);
    throw new Error(error.response?.data?.message || 'Error submitting report');
  }
};

export const updatedSubmittedReport = async (
  reportId: number,
  reportType: string,
  status: string,
  hasWarnings: boolean,
  voyageId: number,
  assignmentId: number,
  values: { field: number, valueText: string }[],
  vesselId?: number,
  noOfWarnings?: number,
  hasRemarks?: boolean,
  remarks?: string,
): Promise<CreatedReports[]> => {
  try {
    console.log(hasRemarks);
    const response = await axios.put(
      API_URL + "/reports/update/" + reportId,
      {
        reportType,
        status,
        submittedDateTime: new Date().toISOString(), // current timestamp
        hasWarnings,
        voyage: voyageId,
        vesselId: vesselId,
        values,
        noOfWarnings,
        hasReview: hasRemarks,
        remark: remarks
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Error submitting report:', error);
    throw new Error(error.response?.data?.message || 'Error submitting report');
  }
};

export const deleteDraftReport = async (reportId: number): Promise<CreatedReports[]> => {
  try {
    const response = await axios.delete(API_URL + "/reports/delete/" + reportId
    );

    return response.data;
  } catch (error: any) {
    console.error('Error deleting draft report:', error);
    throw new Error(error.response?.data?.message || 'Error deleting draft report');
  }
};

export const getVoyageList = async (): Promise<Voyage[]> => {
  try {
    const response = await axios.get(VOYAGES_API_URL);

    return response.data;

  } catch (error: any) {
    console.error('Error fetching voyage list:', error);
    throw new Error(error.response?.data?.message || 'Error fetching voyage list');
  }
};

export const getVoyageNumber = async (vesselId: number) => {
  try {
    const response = await axios.get(`${VOYAGES_API_URL}/next-number/${vesselId}`);

    return response.data;

  } catch (error: any) {
    console.error('Error fetching voyage list:', error);
    throw new Error(error.response?.data?.message || 'Error fetching voyage list');
  }
};

export const createVoyage = async (
  voyageNumber: string,
  departurePort: string,
  arrivalPort: string,
  startDate: string,
  endDate: string,
  voyageRoute: string,
  vesselId: number,
  companyGroupAdminId: number,
  legId?: string,
  status?: string,
  securityLevel?: string,
  iceVoyage?: boolean,
  eca?: boolean,
  cosp?: string,
  eosp?: string,
  arrivalFew?: string,
  eta?: string,
  estimatedDistance?: string,
  displacement?: string,
  draftFore?: string,
  draftMid?: string,
  draftAft?: string,
  totalCargoOnboard?: string,
  loadingCondition?: string,
  chartererName?: string,
  chartererNo?: string,
  cpSpeed?: string,
  cpConsumptionTotal?: string
) => {
  try {
    const requestBody: any = {
      voyageNumber,
      departurePort,
      arrivalPort,
      startDate,
      endDate,
      voyageRoute,
      vessel: {
        id: vesselId,
      },
      companyGroupAdminId,
    };

    if (legId) requestBody.legID = legId;
    if (status) requestBody.status = status;
    if (securityLevel) requestBody.securityLevel = securityLevel;
    if (iceVoyage !== undefined) requestBody.iceVoyage = iceVoyage;
    if (eca !== undefined) requestBody.eca = eca;
    if (cosp) requestBody.cosp = cosp;
    if (eosp) requestBody.eosp = eosp;
    if (arrivalFew) requestBody.arrivalFew = arrivalFew;
    if (eta) requestBody.eta = eta;
    if (estimatedDistance) requestBody.estimatedDistance = parseFloat(estimatedDistance);
    if (displacement) requestBody.displacement = parseFloat(displacement);
    if (draftFore) requestBody.draftFore = parseFloat(draftFore);
    if (draftMid) requestBody.draftMid = parseFloat(draftMid);
    if (draftAft) requestBody.draftAft = parseFloat(draftAft);
    if (totalCargoOnboard) requestBody.totalCargoOnboard = parseFloat(totalCargoOnboard);
    if (loadingCondition) requestBody.loadingCondition = loadingCondition;
    if (chartererName) requestBody.chartererName = chartererName;
    if (chartererNo) requestBody.chartererNo = chartererNo;
    if (cpSpeed) requestBody.cpSpeed = parseFloat(cpSpeed);
    if (cpConsumptionTotal) requestBody.cpConsumptionTotal = parseFloat(cpConsumptionTotal);

    const response = await axios.post(`${VOYAGES_API_URL}/create`, requestBody);

    return response.data;
  } catch (error: any) {
    console.error('Error creating voyage:', error);
    throw new Error(error.response?.data?.message || 'Error creating voyage');
  }
};

export const updateVoyage = async (
  voyageId: number,
  voyageNumber: string,
  departurePort: string,
  arrivalPort: string,
  startDate: string,
  endDate: string,
  voyageRoute: string,
  active: boolean,
  legId?: string,
  status?: string,
  securityLevel?: string,
  iceVoyage?: boolean,
  eca?: boolean,
  cosp?: string,
  eosp?: string,
  arrivalFew?: string,
  eta?: string,
  estimatedDistance?: string,
  displacement?: string,
  draftFore?: string,
  draftMid?: string,
  draftAft?: string,
  totalCargoOnboard?: string,
  loadingCondition?: string,
  chartererName?: string,
  chartererNo?: string,
  cpSpeed?: string,
  cpConsumptionTotal?: string
) => {
  try {
    const requestBody: any = {
      voyageNumber,
      departurePort,
      arrivalPort,
      startDate,
      endDate,
      voyageRoute,
      isActive: active,
    };

    if (legId) requestBody.legID = legId;
    if (status) requestBody.status = status;
    if (securityLevel) requestBody.securityLevel = securityLevel;
    if (iceVoyage !== undefined) requestBody.iceVoyage = iceVoyage;
    if (eca !== undefined) requestBody.eca = eca;
    if (cosp) requestBody.cosp = cosp;
    if (eosp) requestBody.eosp = eosp;
    if (arrivalFew) requestBody.arrivalFew = arrivalFew;
    if (eta) requestBody.eta = eta;
    if (estimatedDistance) requestBody.estimatedDistance = parseFloat(estimatedDistance);
    if (displacement) requestBody.displacement = parseFloat(displacement);
    if (draftFore) requestBody.draftFore = parseFloat(draftFore);
    if (draftMid) requestBody.draftMid = parseFloat(draftMid);
    if (draftAft) requestBody.draftAft = parseFloat(draftAft);
    if (totalCargoOnboard) requestBody.totalCargoOnboard = parseFloat(totalCargoOnboard);
    if (loadingCondition) requestBody.loadingCondition = loadingCondition;
    if (chartererName) requestBody.chartererName = chartererName;
    if (chartererNo) requestBody.chartererNo = chartererNo;
    if (cpSpeed) requestBody.cpSpeed = parseFloat(cpSpeed);
    if (cpConsumptionTotal) requestBody.cpConsumptionTotal = parseFloat(cpConsumptionTotal);

    const response = await axios.put(`${VOYAGES_API_URL}/update/${voyageId}`, requestBody);

    return response.data;
  } catch (error: any) {
    console.error('Error updating voyage:', error);
    throw new Error(error.response?.data?.message || 'Error updating voyage');
  }
};

export const deleteVoyage = async (accessToken: string, voyageId: number): Promise<Voyage[]> => {
  try {
    const response = await axios.delete(VOYAGES_API_URL + "/delete/" + voyageId,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`, // Attach the access token

        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Error deleting voyage item:', error);
    throw new Error(error.response?.data?.message || 'Error deleting voyage item');
  }
};



export const startVoyage = async (
  voyageID: number,
): Promise<CustomAssignedReports> => {
  try {

    const response = await axios.post(`${VOYAGES_API_URL}/${voyageID}/start`);

    return response.data;
  } catch (error: any) {
    console.error('Full error object:', error);
    throw new Error(error?.response?.data?.message || error.message || 'Error cloning template');
  }
};

export const endVoyage = async (
  voyageID: number,
): Promise<CustomAssignedReports> => {
  try {

    const response = await axios.post(`${VOYAGES_API_URL}/${voyageID}/end`);

    return response.data;
  } catch (error: any) {
    console.error('Full error object:', error);
    throw new Error(error?.response?.data?.message || error.message || 'Error cloning template');
  }
};

export const getActiveVoyageForVessel = async (
  vesselId: number,
): Promise<Voyage[]> => {
  try {

    const response = await axios.get(`${VOYAGES_API_URL}/vessel/${vesselId}`);

    return response.data;
  } catch (error: any) {
    console.error('Full error object:', error);
    throw new Error(error?.response?.data?.message || error.message || 'Error cloning template');
  }
};

export const submitConsumptionROB = async (
  payload: any,
): Promise<CustomAssignedReports> => {
  try {

    const response = await axios.post(`${API_URL}/consumption/submit`, payload);

    return response.data;
  } catch (error: any) {
    console.error('Full error object:', error);
    throw new Error(error?.response?.data?.message || error.message || 'Error cloning template');
  }
};

export const getConsumptionROBData = async (
  accessToken: string,
  voyageID: number,
): Promise<any> => {
  try {
    const response = await axios.get(
      `${API_URL}/consumption/user-data`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          voyageId: voyageID
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Error fetching consumption ROB data:', error);
    throw new Error(
      error?.response?.data?.message || error.message || 'Failed to fetch consumption data'
    );
  }
};


//Integration for new position report
// —–––– Vessels APIs ––––

export const getVesselList = async (): Promise<Vessel[]> => {
  try {
    const response = await axios.get(VESSEL_API_URL, {
      headers: {
      },
    });

    return response.data;

  } catch (error: any) {
    console.error('Error fetching vessel list:', error);
    throw new Error(error.response?.data?.message || 'Error fetching vessel list');
  }
};


export const getCompanyAdminList = async (): Promise<CompanyAdmin[]> => {
  try {
    const response = await axios.get(COMPANY_ADMIN_API_URL);

    return response.data; // Return company data

  } catch (error: any) {
    console.error('Error fetching company admin list:', error);
    throw new Error(error.response?.data?.message || 'Error fetching company admin list');
  }
};

// Latest-by-day reports (Position Report - new)
export const getLatestReportsByDay = async (
  fromISO: string, // 'YYYY-MM-DD'
  toISO: string,   // same as fromISO (one day at a time)
  vesselId: number
): Promise<any[]> => {
  try {
    const response = await axios.get(`${API_URL}/reports/latest-by-day`, {
      params: { from: fromISO, to: toISO, vesselId }
    })
    return response.data // array; we'll read [0]?.values
  } catch (error: any) {
    console.error('Error fetching latest-by-day reports:', error)
    throw new Error(error?.response?.data?.message || 'Error fetching latest-by-day reports')
  }
}

// GET /vessels/operations/{vesselId}
export const getVesselOperations = async (vesselId: number): Promise<VesselOperations> => {
  try {
    const response = await axios.get(`${VESSEL_API_URL}/operations/${vesselId}`);
    return response.data as VesselOperations;
  } catch (error: any) {
    console.error('Error fetching vessel operations:', error);
    throw new Error(error?.response?.data?.message || 'Error fetching vessel operations');
  }
};


// === Cargo Operations APIs ===
const CARGO_OPERATIONS_API_URL = `${API_URL}/cargo-operations`;

export interface CargoOperationFilters {
  companyId?: number | null;
  vesselId?: number | null;
  voyageId?: number | null;
  breakupType?: CargoBreakupType | null;
  fromDate?: string | null;
  toDate?: string | null;
  searchText?: string | null;
  page?: number;
  size?: number;
}

export interface CargoOperationPageResponse {
  content: CargoOperation[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export const getCargoOperations = async (filters: CargoOperationFilters = {}): Promise<CargoOperationPageResponse> => {
  try {
    const params: any = {};
    if (filters.companyId) params.companyId = filters.companyId;
    if (filters.vesselId) params.vesselId = filters.vesselId;
    if (filters.voyageId) params.voyageId = filters.voyageId;
    if (filters.breakupType) params.breakupType = filters.breakupType;
    if (filters.fromDate) params.fromDate = filters.fromDate;
    if (filters.toDate) params.toDate = filters.toDate;
    if (filters.searchText) params.searchText = filters.searchText;
    if (filters.page !== undefined) params.page = filters.page;
    if (filters.size !== undefined) params.size = filters.size;

    const response = await axios.get(CARGO_OPERATIONS_API_URL, { params });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching cargo operations:', error);
    throw new Error(error?.response?.data?.message || 'Error fetching cargo operations');
  }
};

export const getCargoOperationById = async (id: number): Promise<CargoOperation> => {
  try {
    const response = await axios.get(`${CARGO_OPERATIONS_API_URL}/${id}`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching cargo operation:', error);
    throw new Error(error?.response?.data?.message || 'Error fetching cargo operation');
  }
};

export const createCargoOperation = async (payload: CargoOperationRequest): Promise<CargoOperation> => {
  try {
    const response = await axios.post(CARGO_OPERATIONS_API_URL, payload);
    return response.data;
  } catch (error: any) {
    console.error('Error creating cargo operation:', error);
    throw new Error(error?.response?.data?.message || 'Error creating cargo operation');
  }
};

export const updateCargoOperation = async (id: number, payload: CargoOperationRequest): Promise<CargoOperation> => {
  try {
    const response = await axios.put(`${CARGO_OPERATIONS_API_URL}/${id}`, payload);
    return response.data;
  } catch (error: any) {
    console.error('Error updating cargo operation:', error);
    throw new Error(error?.response?.data?.message || 'Error updating cargo operation');
  }
};

export const deleteCargoOperation = async (id: number): Promise<void> => {
  try {
    await axios.delete(`${CARGO_OPERATIONS_API_URL}/${id}`);
  } catch (error: any) {
    console.error('Error deleting cargo operation:', error);
    throw new Error(error?.response?.data?.message || 'Error deleting cargo operation');
  }
};
