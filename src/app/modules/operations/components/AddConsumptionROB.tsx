// components/AddConsumptionROB.tsx
import {
  forwardRef,
  useImperativeHandle,
  useState,
  useMemo,
  useEffect,
} from 'react';
import { Fields, Voyage } from '../core/_models';

export interface AddConsumptionROBRef {
  /** Returns a flat array of { field, valueText } for every entry */
  getPayload: () => { field: number; valueText: string }[];
}

interface Props {
  sectionTitle: string;
  voyage: Voyage | null;
  /** Exactly the five Fields[] you fetched for this tab */
  fields: Fields[];
  onChange: (label: string, id: number, value: string) => void;
  values?: { [fieldId: number]: { value: string; label: string } };
}

interface MachineryRow {
  fieldId: number;
  value: string;
  consumedId: number;
  consumed: string;
  robId: number;
  rob: string;
}

interface OuterRow {
  fuelTypeId: number;
  fuelType: string;
  robId: number;
  rob: string;
  machineries: MachineryRow[];
}

const AddConsumptionROB = forwardRef<AddConsumptionROBRef, Props>(
  ({ sectionTitle, voyage, fields, onChange, values }, ref) => {

    const getArray = (id: number): string[] => {
      const val = values?.[id]?.value ?? ''; // <-- fallback to empty string
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    const getNestedArray = (id: number): string[][] => {
      const val = values?.[id]?.value ?? ''; // <-- fallback
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) && Array.isArray(parsed[0]) ? parsed : [];
      } catch {
        return [];
      }
    };
    const removeOuterRow = (outerIndex: number) => {
      setRows((prevRows) => {
        if (prevRows.length <= 1) return prevRows; // Prevent deleting if only 1 section exists
        return prevRows.filter((_, idx) => idx !== outerIndex);
      });
    };

    // 1️⃣ Extract the five specific Fields by label, with a complete Fields fallback
    const fieldMap = useMemo(() => {
      console.log("Available fields:", fields.map(f => f.label));
      const makeEmptyField = (label: string): Fields => ({
        id: -1,
        label,
        fieldType: 'unknown',
        readOnly: false,
        isActive: false,
        required: false,
        submenuId: -1,
        optionsJson: [],
      });

      

      const find = (label: string, occurrence = 1): Fields => {
        const matches = fields.filter(f => f.label.trim().toLowerCase() === label.trim().toLowerCase());
        if (matches.length < occurrence) {
          console.warn(`Field "${label}" occurrence ${occurrence} not found – using empty fallback.`);
          return makeEmptyField(`${label} [#${occurrence}]`);
        }
        return matches[occurrence - 1];
      };
      

      return {
        fuelTypeField: find('Fuel Type'),
        outerRobField: find('ROB', 1),
        machineryField: find('Machinery'),
        consumedField: find('Consumed'),
        innerRobField: find('ROB', 2),
      };
    }, [fields]);

    const {
      fuelTypeField,
      outerRobField,
      machineryField,
      consumedField,
      innerRobField
    } = fieldMap;

    useEffect(() => {
      if (fields.length === 0 || !values) return;

      const outerRobArr = getArray(fieldMap.outerRobField.id);
      const fuelTypeArr = getArray(fieldMap.fuelTypeField.id);

      const machineryArr = getNestedArray(fieldMap.machineryField.id);
      const consumedArr = getNestedArray(fieldMap.consumedField.id);
      const innerRobArr = getNestedArray(fieldMap.innerRobField.id);

      const outerCount = Math.max(fuelTypeArr.length, outerRobArr.length) || 1;

      const initialRows = [...Array(outerCount)].map((_, oi) => ({
        fuelTypeId: fieldMap.fuelTypeField.id,
        fuelType: fuelTypeArr[oi] ?? '',
        robId: fieldMap.outerRobField.id,
        rob: outerRobArr[oi] ?? '',
        machineries: [...Array(machineryArr[oi]?.length || 1)].map((_, ii) => ({
          fieldId: fieldMap.machineryField.id,
          value: machineryArr[oi]?.[ii] ?? '',
          consumedId: fieldMap.consumedField.id,
          consumed: consumedArr[oi]?.[ii] ?? '',
          robId: fieldMap.innerRobField.id,
          rob: innerRobArr[oi]?.[ii] ?? '',
        })),
      }));

      setRows(initialRows);
    }, [fields, values]); // ✅ make sure values is added here

    console.log("🔍 Matched Fields:");
    console.log("Fuel Type:", fuelTypeField);
    console.log("Outer ROB:", outerRobField);
    console.log("Machinery:", machineryField);
    console.log("Consumed:", consumedField);
    console.log("Inner ROB:", innerRobField);


    // Grab their option arrays
    const fuelOptions = fuelTypeField.optionsJson!;
    const machineryOptions = machineryField.optionsJson!;

    // 2️⃣ Initialize rows state
    // const [rows, setRows] = useState<OuterRow[]>(() => {
    //   if (!values) {
    //     // fallback to empty if no prefilled data
    //     return [{
    //       fuelTypeId: fuelTypeField.id,
    //       fuelType: '',
    //       robId: outerRobField.id,
    //       rob: '',
    //       machineries: [{
    //         fieldId: machineryField.id,
    //         value: '',
    //         consumedId: consumedField.id,
    //         consumed: '',
    //         robId: innerRobField.id,
    //         rob: '',
    //       }],
    //     }];
    //   }

    //   const outerRobArr = getArray(outerRobField.id);
    //   const fuelTypeArr = getArray(fuelTypeField.id);

    //   const machineryArr = getNestedArray(machineryField.id);
    //   const consumedArr = getNestedArray(consumedField.id);
    //   const innerRobArr = getNestedArray(innerRobField.id);

    //   const outerCount = Math.max(fuelTypeArr.length, outerRobArr.length) || 1;

    //   return [...Array(outerCount)].map((_, oi) => ({
    //     fuelTypeId: fuelTypeField.id,
    //     fuelType: fuelTypeArr[oi] ?? '',
    //     robId: outerRobField.id,
    //     rob: outerRobArr[oi] ?? '',
    //     machineries: [...Array(machineryArr[oi]?.length || 1)].map((_, ii) => ({
    //       fieldId: machineryField.id,
    //       value: machineryArr[oi]?.[ii] ?? '',
    //       consumedId: consumedField.id,
    //       consumed: consumedArr[oi]?.[ii] ?? '',
    //       robId: innerRobField.id,
    //       rob: innerRobArr[oi]?.[ii] ?? '',
    //     })),
    //   }));
    // });

    const [rows, setRows] = useState<OuterRow[]>(() => {
      if (!values) {
        return [{
          fuelTypeId: fieldMap.fuelTypeField.id,
          fuelType: '',
          robId: fieldMap.outerRobField.id,
          rob: '',
          machineries: [{
            fieldId: fieldMap.machineryField.id,
            value: '',
            consumedId: fieldMap.consumedField.id,
            consumed: '',
            robId: fieldMap.innerRobField.id,
            rob: '',
          }],
        }];
      }
      return [];
    });

    console.log("Initial rows", rows);


    // 3️⃣ Expose getPayload()
    useImperativeHandle(ref, () => ({
      getPayload: () =>
        rows.flatMap((r) => {
          const outer = [
            { field: r.fuelTypeId, valueText: r.fuelType },
            { field: r.robId, valueText: r.rob },
          ];
          const inners = r.machineries.flatMap((m) => [
            { field: m.fieldId, valueText: m.value },
            { field: m.consumedId, valueText: m.consumed },
            { field: m.robId, valueText: m.rob },
          ]);
          return outer.concat(inners);
        }),
    }), [rows]);

    // Handlers
    const addOuterRow = () => {
      setRows(rs => [
        ...rs,
        {
          fuelTypeId: fuelTypeField.id,
          fuelType: '',
          robId: outerRobField.id,
          rob: '',
          machineries: [{
            fieldId: machineryField.id,
            value: '',
            consumedId: consumedField.id,
            consumed: '',
            robId: innerRobField.id,
            rob: '',
          }],
        }
      ]);
    };

    const addInnerRow = (outerIndex: number) => {
      setRows(rs => {
        const copy = [...rs];
        copy[outerIndex].machineries.push({
          fieldId: machineryField.id,
          value: '',
          consumedId: consumedField.id,
          consumed: '',
          robId: innerRobField.id,
          rob: '',
        });
        return copy;
      });
    };

    const removeInnerRow = (outerIndex: number, innerIndex: number) => {
      setRows(rs => {
        const copy = [...rs];
        if (copy[outerIndex].machineries.length > 1) {
          copy[outerIndex].machineries.splice(innerIndex, 1);
        }
        return copy;
      });
    };

    const updateOuter = (
      outerIndex: number,
      key: 'fuelType' | 'rob',
      value: string
    ) => {
      setRows(rs => {
        const copy = [...rs];
        // @ts-ignore
        copy[outerIndex][key] = value;

        // If outer ROB updated, recalculate all inner ROBs
        if (key === 'rob') {
          const outerRob = parseFloat(value) || 0;
          copy[outerIndex].machineries = copy[outerIndex].machineries.map((mach) => {
            const consumed = parseFloat(mach.consumed) || 0;
            const newRob = (outerRob - consumed).toString();
            mach.rob = newRob;
            return mach;
          });
        }

        // 🔁 NEW: collect and stringify all values for this field
        const allFuelTypes = copy.map(r => r.fuelType);
        const allRobs = copy.map(r => r.rob);
        if (key === 'fuelType') {
          onChange(fuelTypeField.label, fuelTypeField.id, JSON.stringify(allFuelTypes));
        } else {
          onChange(outerRobField.label, outerRobField.id, JSON.stringify(allRobs));
        }

        // 🔁 Also update dependent inner ROBs in parent
        const allInnerRobs = copy.map(r => r.machineries.map(m => m.rob));
        onChange(innerRobField.label, innerRobField.id, JSON.stringify(allInnerRobs));

        return copy;
      });
    };

    const updateInner = (
      outerIndex: number,
      innerIndex: number,
      key: 'value' | 'consumed' | 'rob',
      value: string
    ) => {
      setRows(rs => {
        const copy = [...rs];
        const mach = copy[outerIndex].machineries[innerIndex];
        mach[key] = value;

        // Update inner rob if consumed changed
        if (key === 'consumed') {
          const outerRob = parseFloat(copy[outerIndex].rob) || 0;
          const consumed = parseFloat(value) || 0;
          const newRob = (outerRob - consumed).toString();
          mach.rob = newRob;
        }

        // 🔁 NEW: Update all arrays in parent
        const allMachinery = copy.map(r => r.machineries.map(m => m.value));
        const allConsumed = copy.map(r => r.machineries.map(m => m.consumed));
        const allInnerRobs = copy.map(r => r.machineries.map(m => m.rob));

        onChange(machineryField.label, machineryField.id, JSON.stringify(allMachinery));
        onChange(consumedField.label, consumedField.id, JSON.stringify(allConsumed));
        onChange(innerRobField.label, innerRobField.id, JSON.stringify(allInnerRobs));

        return copy;
      });
    };

    // 4️⃣ Render
    return (
  <div className="px-3">
    <h4 className="fw-bold text-dark py-3">{sectionTitle}</h4>

    {rows.map((row, oi) => (
      <div key={oi} className="border rounded p-5 mb-4">

        {/* Section Header */}
        <div className="d-flex align-items-center gap-2 mb-3">
          {/* Add Button on the Left */}
          <button
            type="button"
            className="btn btn-action btn-action-primary d-flex align-items-center justify-content-center"
            onClick={addOuterRow}
          >
            +
          </button>

          {/* Form Controls */}
          <select
            className="form-select"
            value={row.fuelType}
            onChange={e => updateOuter(oi, 'fuelType', e.target.value)}
            style={{ backgroundColor: '#F9FAFB', borderColor: '#D1D5DB', cursor: 'pointer', padding: '1rem'}}
          >
            <option value="">Select Fuel Type</option>
            {fuelOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>

          <input
            type="number"
            className="form-control"
            placeholder="ROB"
            value={row.rob}
            onChange={e => updateOuter(oi, 'rob', e.target.value)}
            style={{ backgroundColor: '#F9FAFB', borderColor: '#D1D5DB', cursor: 'pointer', padding:'1rem' }}
          />

          {/* Delete Button on the Right */}
          <button
            type="button"
            className="btn btn-action btn-action-danger d-flex align-items-center justify-content-center"
            onClick={() => removeOuterRow(oi)}
            disabled={rows.length === 1}
            style={{ margin: '0px' }}
          >
            −
          </button>
        </div>

        {/* Machineries */}
        {row.machineries.map((mach, ii) => (
          <div key={ii} className="d-flex align-items-center gap-2 ms-4 mb-2">

            {/* Add Button on the Left (Secondary Style) */}
            <button
              type="button"
              className="btn btn-action-sm btn-action-secondary-primary d-flex align-items-center justify-content-center"
              onClick={() => addInnerRow(oi)}
            >
              +
            </button>

            {/* Form Controls */}
            <select
              className="form-select"
              value={mach.value}
              onChange={e => updateInner(oi, ii, 'value', e.target.value)}
              style={{ backgroundColor: '#F9FAFB', borderColor: '#D1D5DB', cursor: 'pointer',padding:'1rem' }}
            >
              <option value="">Select Machinery</option>
              {machineryOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>

            <input
              type="number"
              className="form-control"
              placeholder="Consumed"
              value={mach.consumed}
              onChange={e => updateInner(oi, ii, 'consumed', e.target.value)}
              style={{ backgroundColor: '#F9FAFB', borderColor: '#D1D5DB', cursor: 'pointer',padding:'1rem' }}
            />

            <input
              type="number"
              className="form-control"
              placeholder="ROB"
              value={mach.rob}
              readOnly
              style={{ backgroundColor: '#E5E7EB', borderColor: '#D1D5DB', cursor: 'pointer',padding:'1rem' }}
            />

            {/* Delete Button on the Right (Secondary Style) */}
            <button
              type="button"
              className="btn btn-action-sm btn-action-secondary-danger d-flex align-items-center justify-content-center"
              onClick={() => removeInnerRow(oi, ii)}
              disabled={row.machineries.length === 1}
              style={{ margin:'0'}}
            >
              −
            </button>
          </div>
        ))}
      </div>
    ))}
  </div>
);
}
);

export default AddConsumptionROB;
