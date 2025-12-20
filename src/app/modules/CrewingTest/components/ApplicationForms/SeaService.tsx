import React from 'react';
import { SeaServiceRequest } from '../../core/_models';
import { KTSVG } from '../../../../../_metronic/helpers';

interface SeaServiceProps {
  seaServices: SeaServiceRequest[];
  handleSeaServiceChange: (index: number, field: keyof SeaServiceRequest, value: string) => void;
  handleAddSeaService: () => void;
  handleRemoveSeaService: (index: number) => void;
  fieldErrors: Record<string, string>;
}

const SeaService: React.FC<SeaServiceProps> = ({
  seaServices,
  handleSeaServiceChange,
  handleAddSeaService,
  handleRemoveSeaService,
  fieldErrors,
}) => {
  return (
    <div className="container my-4">
      <h5 className="fw-bold mb-3">
        Previous Sea Service
        <small className="fw-normal d-block mt-1">(All sea service details from Cadets/Jr Level. List recent vessel first)</small>
      </h5>
      <div className="table-responsive">
        <table className="table table-bordered align-middle text-center" style={{ minWidth: '1200px' }}>
          <thead className="table-light">
            <tr>
              <th>Sr. No.</th>
              <th>Company Name</th>
              <th>Vessel Name</th>
              <th>Type of Vessel/ Flag</th>
              <th>GRT/DWT</th>
              <th>Engine Type</th>
              <th>KWT/ ME BHP</th>
              <th>Rank</th>
              <th>From</th>
              <th>To</th>
              <th>Total Months/Days</th>
              <th>Reason for S/OFF</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {seaServices.map((service, index) => (
              <tr key={service.id ?? `new-${index}`}>
              <td>{service.serialNo}</td>            
                <td>
                  <input
                    type="text"
                    className={`form-control ${fieldErrors[`sea_companyName_${index}`] ? 'is-invalid' : ''}`}
                    value={service.companyName || ''}
                    onChange={(e) => handleSeaServiceChange(index, 'companyName', e.target.value)}
                  />
                  {fieldErrors[`sea_companyName_${index}`] && (
                    <div className="invalid-feedback">{fieldErrors[`sea_companyName_${index}`]}</div>
                  )}
                </td>
                <td>
                  <input
                    type="text"
                    className={`form-control ${fieldErrors[`sea_vesselName_${index}`] ? 'is-invalid' : ''}`}
                    value={service.vesselName || ''}
                    onChange={(e) => handleSeaServiceChange(index, 'vesselName', e.target.value)}
                  />
                  {fieldErrors[`sea_vesselName_${index}`] && (
                    <div className="invalid-feedback">{fieldErrors[`sea_vesselName_${index}`]}</div>
                  )}
                </td>
                <td>
                  <input
                    type="text"
                    className={`form-control ${fieldErrors[`sea_typeOfVesselFlag_${index}`] ? 'is-invalid' : ''}`}
                    value={service.typeOfVesselFlag || ''}
                    onChange={(e) => handleSeaServiceChange(index, 'typeOfVesselFlag', e.target.value)}
                  />
                  {fieldErrors[`sea_typeOfVesselFlag_${index}`] && (
                    <div className="invalid-feedback">{fieldErrors[`sea_typeOfVesselFlag_${index}`]}</div>
                  )}
                </td>
                <td>
                  <input
                    type="text"
                    className={`form-control ${fieldErrors[`sea_grtdrt_${index}`] ? 'is-invalid' : ''}`}
                    value={service.grtdrt || ''}
                    onChange={(e) => handleSeaServiceChange(index, 'grtdrt', e.target.value)}
                  />
                  {fieldErrors[`sea_grtdrt_${index}`] && (
                    <div className="invalid-feedback">{fieldErrors[`sea_grtdrt_${index}`]}</div>
                  )}
                </td>
                <td>
                  <input
                    type="text"
                    className={`form-control ${fieldErrors[`sea_engineType_${index}`] ? 'is-invalid' : ''}`}
                    value={service.engineType || ''}
                    onChange={(e) => handleSeaServiceChange(index, 'engineType', e.target.value)}
                  />
                  {fieldErrors[`sea_engineType_${index}`] && (
                    <div className="invalid-feedback">{fieldErrors[`sea_engineType_${index}`]}</div>
                  )}
                </td>
                <td>
                  <input
                    type="text"
                    className={`form-control ${fieldErrors[`sea_kwtBhp_${index}`] ? 'is-invalid' : ''}`}
                    value={service.kwtBhp || ''}
                    onChange={(e) => handleSeaServiceChange(index, 'kwtBhp', e.target.value)}
                  />
                  {fieldErrors[`sea_kwtBhp_${index}`] && (
                    <div className="invalid-feedback">{fieldErrors[`sea_kwtBhp_${index}`]}</div>
                  )}
                </td>
                <td>
                  <input
                    type="text"
                    className={`form-control ${fieldErrors[`sea_rank_${index}`] ? 'is-invalid' : ''}`}
                    value={service.rank || ''}
                    onChange={(e) => handleSeaServiceChange(index, 'rank', e.target.value)}
                  />
                  {fieldErrors[`sea_rank_${index}`] && (
                    <div className="invalid-feedback">{fieldErrors[`sea_rank_${index}`]}</div>
                  )}
                </td>
                <td>
                  <input
                    type="date"
                    className={`form-control ${fieldErrors[`sea_fromDate_${index}`] ? 'is-invalid' : ''}`}
                    value={service.fromDate || ''}
                    onChange={(e) => handleSeaServiceChange(index, 'fromDate', e.target.value)}
                  />
                  {fieldErrors[`sea_fromDate_${index}`] && (
                    <div className="invalid-feedback">{fieldErrors[`sea_fromDate_${index}`]}</div>
                  )}
                </td>
                <td>
                  <input
                    type="date"
                    className={`form-control ${fieldErrors[`sea_toDate_${index}`] ? 'is-invalid' : ''}`}
                    value={service.toDate || ''}
                    onChange={(e) => handleSeaServiceChange(index, 'toDate', e.target.value)}
                  />
                  {fieldErrors[`sea_toDate_${index}`] && (
                    <div className="invalid-feedback">{fieldErrors[`sea_toDate_${index}`]}</div>
                  )}
                </td>
                <td>
                  <input
                    type="text"
                    className={`form-control ${fieldErrors[`sea_totalMonthsDays_${index}`] ? 'is-invalid' : ''}`}
                    value={service.totalMonthsDays || ''}
                    onChange={(e) => handleSeaServiceChange(index, 'totalMonthsDays', e.target.value)}
                  />
                  {fieldErrors[`sea_totalMonthsDays_${index}`] && (
                    <div className="invalid-feedback">{fieldErrors[`sea_totalMonthsDays_${index}`]}</div>
                  )}
                </td>
                <td>
                  <input
                    type="text"
                    className={`form-control ${fieldErrors[`sea_reasonForSignOff_${index}`] ? 'is-invalid' : ''}`}
                    value={service.reasonForSignOff || ''}
                    onChange={(e) => handleSeaServiceChange(index, 'reasonForSignOff', e.target.value)}
                  />
                  {fieldErrors[`sea_reasonForSignOff_${index}`] && (
                    <div className="invalid-feedback">{fieldErrors[`sea_reasonForSignOff_${index}`]}</div>
                  )}
                </td>
                <td>
                  <div className="d-flex gap-1">
                    <button
                      type="button"
                      className="btn btn-success btn-sm"
                      onClick={handleAddSeaService}
                      title="Add Entry"
                    >
                      <KTSVG path="/media/icons/duotune/arrows/arr009.svg" className="svg-icon-2x" />
                    </button>
                    {(seaServices.length > 1 || !!service.id) && (
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRemoveSeaService(index)}
                        title="Remove Entry"
                      >
                        <KTSVG path="/media/icons/duotune/arrows/arr010.svg" className="svg-icon-2x" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SeaService;