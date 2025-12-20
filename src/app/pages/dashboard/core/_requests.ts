import axios from 'axios';
import { VesselDetails } from './_models';

const API_URL = process.env.REACT_APP_API_URL

const VESSEL_DETAILS_API_URL = `${API_URL}/vessels`;

export const getVesselDetails = async (vesselId: number): Promise<VesselDetails> => {
  try {
    const response = await axios.get(`${VESSEL_DETAILS_API_URL}/${vesselId}/tracking`);

    return response.data;

  } catch (error: any) {
    console.error('Error fetching details for vessel:', error);
    throw new Error(error.response?.data?.message || 'Error fetching details for vessel');
  }
};
