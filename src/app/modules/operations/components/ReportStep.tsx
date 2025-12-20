// components/ReportStep.tsx
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Fields, WarningLevel } from '../core/_models';
import { validateField } from '../core/validationUtils';

export interface ReportStepRef {
  validateStep: () => boolean;
  getWarnings: () => { hasWarnings: boolean; warningCount: number };
}

interface ReportStepProps {
  sectionTitle: string;
  formSections: Fields[];
  values: Record<string, any>;
  onChange: (label: string, id: string, value: any) => void;
  onValidate?: (isValid: boolean) => void;
  voyage?: any;
  selectedReport?: any;
}

// Helper: chunk array into groups of 3
const chunkArray = (array: any[], size: number) => {
  const chunked = [];
  for (let i = 0; i < array.length; i += size) {
    chunked.push(array.slice(i, i + size));
  }
  return chunked;
};

const ReportStep = forwardRef<ReportStepRef, ReportStepProps>(
  ({ sectionTitle, formSections, values, onChange, onValidate, voyage, selectedReport }, ref) => {

    const [errors, setErrors] = useState<{ [label: string]: string }>({})
    const latestWarningCount = useRef(0);
    const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

    const validate = () => {
      const newErrors: { [id: string]: string } = {};
      let hasStrictErrors = false;
      let warningCounter = 0; // count SOFT warnings
      const allTouched: Record<string, boolean> = {};

      formSections.forEach((field) => {
        const fieldValue = values[field.id]?.value ?? values[field.label]?.value ?? values[field.id] ?? values[field.label];
        const errorMsg = validateField(field, fieldValue);

        if (errorMsg) {
          newErrors[field.id] = errorMsg;
          allTouched[field.id] = true;

          if (field.warningOnly === WarningLevel.STRICT) hasStrictErrors = true;
          else if (field.warningOnly === WarningLevel.SOFT) warningCounter++;
        }
      });

      latestWarningCount.current = warningCounter; // ✅ update the ref

      setErrors(newErrors);
      setTouchedFields(prev => ({ ...prev, ...allTouched })); // show all errors

      if (onValidate) onValidate(!hasStrictErrors);

      return !hasStrictErrors;
    };

    // ✅ Expose validate function to parent via ref
    useImperativeHandle(ref, () => ({
      validateStep: validate,
      getWarnings: () => ({
        hasWarnings: latestWarningCount.current > 0,
        warningCount: latestWarningCount.current,
      }),
    }));

    useEffect(() => {
      validate();
    }, [formSections, values]);

    useEffect(() => {
      formSections.forEach((field) => {
        const isReadOnly = field.readOnly;
        const currentValue = values[field.id]?.value;

        const valueMap: Record<string, any> = {
          'Vessel Name': voyage?.vessel?.fleet_name,
          'Voyage Number': voyage?.voyageNumber,
          'Report Type': selectedReport?.name,
          'Departure Port': voyage?.departurePort,
          'Departure Datetime': voyage?.startDate,
          'Arrival Port': voyage?.arrivalPort,
          'ETA Datetime': voyage?.endDate,
        };

        const shouldPopulate =
          isReadOnly &&
          valueMap[field.label] !== undefined &&
          (currentValue === undefined || currentValue === '');

        if (shouldPopulate) {
          onChange(field.label, field.id.toString(), valueMap[field.label]);
        }
      });
    }, [formSections]);

    const renderField = (field: Fields) => {
      const commonProps = {
        id: field.id.toString(),
        name: field.id.toString(),
        value: values[field.id] || '',
        onChange: (e: React.ChangeEvent<any>) => onChange(field.label, field.id.toString(), e.target.value),
        className: 'form-control grey-input',
      };

      switch (field.fieldType.toUpperCase()) {
        case 'TEXT':
        case 'DATE':
        case 'TIME':
        case 'DATETIME': {
          const inputType =
            field.fieldType.toUpperCase() === 'DATETIME'
              ? 'datetime-local'
              : field.fieldType.toLowerCase();

          return (
            <div className="input-group">
              <input
                type={inputType}
                disabled={field.readOnly}
                id={field.id.toString()}
                value={values[field.id]?.value ?? ''}
                minLength={field.minValue} // ✅ For min length validation
                maxLength={field.maxValue} // ✅ For max length validation
                onBlur={() => {
                  setTouchedFields((prev) => ({ ...prev, [field.id]: true }));
                }}
                onChange={(e) => {
                  const newValue = e.target.value;
                  onChange(field.label, field.id.toString(), newValue);

                  const errorMsg = validateField(field, newValue);
                  setErrors((prevErrors) => {
                    const newErrors = { ...prevErrors };
                    if (errorMsg) {
                      newErrors[field.id] = errorMsg;
                    } else {
                      delete newErrors[field.id];
                    }
                    return newErrors;
                  });
                }}
                className={`form-control ${field.readOnly ? 'readonly-input' : 'grey-input'}`}
              />

              {/* ✅ Show unit like NUMBER field */}
              {field.unit && <span className="input-group-text">{field.unit}</span>}
            </div>
          );
        }
        case 'NUMBER':
          return (
            <div className="input-group">
              <input
                type="number"
                className={`form-control ${field.readOnly ? 'readonly-input' : 'grey-input'}`}
                value={values[field.id]?.value ?? ''}
                onBlur={() => {
                  setTouchedFields(prev => ({ ...prev, [field.id]: true }));
                }}
                onChange={(e) => {
                  const newValue = e.target.value;
                  onChange(field.label, field.id.toString(), newValue);

                  const errorMsg = validateField(field, newValue);
                  setErrors((prevErrors) => {
                    const newErrors = { ...prevErrors };
                    if (errorMsg) {
                      newErrors[field.id] = errorMsg;
                    } else {
                      delete newErrors[field.id];
                    }
                    return newErrors;
                  });
                }} required={field.required}
              />
              {field.unit && <span className="input-group-text">{field.unit}</span>}
            </div>
          );
        case 'TEXTAREA':
          return <textarea {...commonProps} rows={3} />;
        case 'SELECT':
          return (
            <select value={values[field.id]?.value || ''}
              onBlur={() => {
                setTouchedFields(prev => ({ ...prev, [field.id]: true }));
              }}
              onChange={(e) => {
                const newValue = e.target.value;
                onChange(field.label, field.id.toString(), newValue);

                const errorMsg = validateField(field, newValue);
                setErrors((prevErrors) => {
                  const newErrors = { ...prevErrors };
                  if (errorMsg) {
                    newErrors[field.id] = errorMsg;
                  } else {
                    delete newErrors[field.id];
                  }
                  return newErrors;
                });
              }} className={`form-control ${field.readOnly ? 'readonly-input' : 'grey-input'}`}>
              <option value="">Select</option>
              {field.optionsJson?.map(opt => {
                if (typeof opt === 'string') {
                  return <option key={opt} value={opt}>{opt}</option>;
                }
              })}
            </select>
          );
        case 'RADIO':
          return (
            <div>
              {field.optionsJson?.map(opt => (
                <label key={opt} className="me-3">
                  <input
                    type="radio"
                    name={field.id.toString()}
                    value={opt}
                    checked={values[field.id] === opt}
                    onBlur={() => {
                      setTouchedFields(prev => ({ ...prev, [field.id]: true }));
                    }}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      onChange(field.label, field.id.toString(), newValue);

                      const errorMsg = validateField(field, newValue);
                      setErrors((prevErrors) => {
                        const newErrors = { ...prevErrors };
                        if (errorMsg) {
                          newErrors[field.id] = errorMsg;
                        } else {
                          delete newErrors[field.id];
                        }
                        return newErrors;
                      });
                    }} className="me-1"
                  />
                  {opt}
                </label>
              ))}
            </div>
          );

        case 'CHECKBOX':
          return (
            <div>
              {field.optionsJson?.map(opt => (
                <label key={opt} className="me-3">
                  <input
                    type="checkbox"
                    value={opt}
                    checked={Array.isArray(values[field.id]?.value) && values[field.id].value.includes(opt)}
                    onBlur={() => {
                      setTouchedFields(prev => ({ ...prev, [field.id]: true }));
                    }}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const currentValues = values[field.id]?.value || [];
                      const updated = checked
                        ? [...currentValues, opt]
                        : currentValues.filter((v: string) => v !== opt);
                      onChange(field.label, field.id.toString(), updated);
                    }}
                    className="me-1"
                  />
                  {opt}
                </label>
              ))}
            </div>
          );

        default:
          return <input type="text" {...commonProps} />;
      }
    };

    // ✅ Helper function to format geo labels dynamically
    const formatGeoLabel = (label: string) => {
      const lowerLabel = label.toLowerCase();

      if (lowerLabel.includes("latitude")) {
        // Extract prefix before "latitude"
        const prefix = lowerLabel.split("latitude")[0].trim(); // e.g., "start position" or "stop position"
        return `${prefix ? capitalizeWords(prefix) + " " : ""}Latitude`;
      }

      if (lowerLabel.includes("longitude")) {
        const prefix = lowerLabel.split("longitude")[0].trim();
        return `${prefix ? capitalizeWords(prefix) + " " : ""}Longitude`;
      }

      return label;
    };

    // ✅ Capitalize each word of a prefix (e.g., "start position" → "Start Position")
    const capitalizeWords = (str: string) =>
      str.replace(/\b\w/g, (char) => char.toUpperCase());

    // --- Geo helpers (group start/stop/generic + consistent order) ---
const GEO_PART_RE = /(deg|min|sec|direction)/i;
const normalize = (s: string) => s.toLowerCase().replace(/postion/g, 'position');

type GeoGroups = {
  lat: { start: Fields[]; stop: Fields[]; generic: Fields[] };
  lon: { start: Fields[]; stop: Fields[]; generic: Fields[] };
};

const groupGeoFields = (fields: Fields[]): GeoGroups => {
  const groups: GeoGroups = {
    lat: { start: [], stop: [], generic: [] },
    lon: { start: [], stop: [], generic: [] },
  };

  fields.forEach((f) => {
    const l = normalize(f.label);
    const isLat = l.includes('latitude');
    const isLon = l.includes('longitude');
    const isGeoPart = GEO_PART_RE.test(l);

    if (!(isLat || isLon) || !isGeoPart) return;

    const bucket = isLat ? groups.lat : groups.lon;
    if (l.includes('start')) bucket.start.push(f);
    else if (l.includes('stop')) bucket.stop.push(f);
    else bucket.generic.push(f);
  });

  const order = ['deg', 'min', 'sec', 'direction'];
  const sortFn = (a: Fields, b: Fields) =>
    order.findIndex((k) => normalize(a.label).includes(k)) -
    order.findIndex((k) => normalize(b.label).includes(k));

  (['start', 'stop', 'generic'] as const).forEach((k) => {
    groups.lat[k].sort(sortFn);
    groups.lon[k].sort(sortFn);
  });

  return groups;
};

// Render one geo field cell with fixed width (so all 8 sit in one row)
const renderGeoField = (
  field: Fields,
  renderFieldFn: (f: Fields) => React.ReactNode,
  errors: Record<string, string>
) => {
  const isDir = normalize(field.label).includes('direction');
  const width = isDir ? 90 : 140; // direction is smaller, others a bit wider
  return (
    <div
      key={field.id}
      style={{ flex: '0 0 auto', width, minWidth: width }}
    >
      {renderFieldFn(field)}
      {errors[field.id] && (
        <div
          className={`mt-1 small ${errors[field.id].startsWith('⚠️') ? 'text-warning' : 'text-danger'}`}
        >
          {errors[field.id]}
        </div>
      )}
    </div>
  );
};


    // // ✅ Identify latitude-related fields dynamically
    // const latitudeFields = formSections.filter(field =>
    //   /(latitude\s*deg|latitude\s*min|latitude\s*sec|latitude\s*direction)/i.test(field.label)
    // );

    // // ✅ Identify longitude-related fields dynamically
    // const longitudeFields = formSections.filter(field =>
    //   /(longitude\s*deg|longitude\s*min|longitude\s*sec|longitude\s*direction)/i.test(field.label)
    // );

    // // ✅ Remaining other fields
    // const otherFields = formSections.filter(field =>
    //   !/(latitude\s*deg|latitude\s*min|latitude\s*sec|latitude\s*direction|longitude\s*deg|longitude\s*min|longitude\s*sec|longitude\s*direction)/i.test(field.label)
    // );

    // const fieldChunks = chunkArray(otherFields, 3);

    // ✅ Group geo fields by Start/Stop/Generic and by Lat/Lon
const geo = groupGeoFields(formSections);

// ✅ Remaining other (non-geo-part) fields
const otherFields = formSections.filter((field) => {
  const l = normalize(field.label);
  return !((l.includes('latitude') || l.includes('longitude')) && GEO_PART_RE.test(l));
});

const fieldChunks = chunkArray(otherFields, 3);

// Local styles for the geo strips (scoped to this component only)
const scrollRowStyle: React.CSSProperties = {
  display: 'flex',
  overflowX: 'auto',
  flexWrap: 'nowrap',
  gap: '24px',
  padding: '6px 0',
  WebkitOverflowScrolling: 'touch',
  scrollbarWidth: 'thin',
};

const clusterColStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minWidth: 'fit-content',
};

const fieldRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'nowrap',
  gap: '8px',
};



    return (
      <div className="px-3">
        <h4 className="fw-bold text-dark py-3">{sectionTitle}</h4>

        {/* ✅ Render other fields in 3-column layout */}
        {fieldChunks.map((chunk, rowIndex) => (
          <div className="row gx-5 gy-4 mb-3" key={rowIndex}>
            {chunk.map((field, colIndex) => (
              <div className="col-md-4" key={field.id || colIndex}>
                <div className="text-muted mb-1">
                  {field.label} {field.required && <span className="text-danger">*</span>}
                </div>
                {renderField(field)}
                {errors[field.id] && (
                  <div className={`mt-1 small ${errors[field.id].startsWith('⚠️') ? 'text-warning' : 'text-danger'}`}>
                    {errors[field.id]}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

     {/* === Row 1: Latitude (8 boxes in one row, locally scrollable) === */}
{(geo.lat.start.length || geo.lat.stop.length || geo.lat.generic.length) && (
  <div className="mb-3">
    <div style={scrollRowStyle}>
      {/* Start or Generic Latitude cluster (4 boxes) */}
      {(geo.lat.start.length || geo.lat.generic.length) && (
        <div style={clusterColStyle}>
          <div className="text-muted mb-1">
            {geo.lat.start.length ? 'Start Position Latitude' : 'Latitude'} <span className="text-danger">*</span>
          </div>
          <div style={fieldRowStyle}>
            {(geo.lat.start.length ? geo.lat.start : geo.lat.generic).map((f) => (
              <div key={`lat-start-${f.id}`} style={{ flex: '0 0 auto' }}>
                {renderGeoField(f, renderField, errors)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stop Latitude cluster (4 boxes) */}
      {geo.lat.stop.length > 0 && (
        <div style={clusterColStyle}>
          <div className="text-muted mb-1">
            Stop Position Latitude <span className="text-danger">*</span>
          </div>
          <div style={fieldRowStyle}>
            {geo.lat.stop.map((f) => (
              <div key={`lat-stop-${f.id}`} style={{ flex: '0 0 auto' }}>
                {renderGeoField(f, renderField, errors)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
)}



{/* === Row 2: Longitude (8 boxes in one row, locally scrollable) === */}
{(geo.lon.start.length || geo.lon.stop.length || geo.lon.generic.length) && (
  <div className="mb-3">
    <div style={scrollRowStyle}>
      {/* Start or Generic Longitude cluster (4 boxes) */}
      {(geo.lon.start.length || geo.lon.generic.length) && (
        <div style={clusterColStyle}>
          <div className="text-muted mb-1">
            {geo.lon.start.length ? 'Start Position Longitude' : 'Longitude'} <span className="text-danger">*</span>
          </div>
          <div style={fieldRowStyle}>
            {(geo.lon.start.length ? geo.lon.start : geo.lon.generic).map((f) => (
              <div key={`lon-start-${f.id}`} style={{ flex: '0 0 auto' }}>
                {renderGeoField(f, renderField, errors)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stop Longitude cluster (4 boxes) */}
      {geo.lon.stop.length > 0 && (
        <div style={clusterColStyle}>
          <div className="text-muted mb-1">
            Stop Position Longitude <span className="text-danger">*</span>
          </div>
          <div style={fieldRowStyle}>
            {geo.lon.stop.map((f) => (
              <div key={`lon-stop-${f.id}`} style={{ flex: '0 0 auto' }}>
                {renderGeoField(f, renderField, errors)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
)}



      </div>
    );
  }
);

export default ReportStep;
