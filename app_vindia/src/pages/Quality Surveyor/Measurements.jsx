import { useState } from "react";
import "./Measurements.css";

export default function Measurements() {

  const [elements, setElements] = useState([
    {
      id: 1,
      name: "COLUMNS",
      drawingRef: "STR-01",
      unit: "m³",
      rows: [
        { id: 1, desc: "300×1200 mm", nos: 4, l: 0.3, b: 1.2, h: 3 }
      ],
      rate: 6800
    }
  ]);

  const calcQty = (r) => {
    return r.nos * r.l * r.b * r.h;
  };

  const totalQty = (el) => el.rows.reduce((s, r) => s + calcQty(r), 0);

  const grandTotal = elements.reduce(
    (s, el) => s + totalQty(el) * el.rate,
    0
  );

  const update = (elId, rowId, field, value) => {
    setElements(prev =>
      prev.map(el =>
        el.id === elId
          ? {
              ...el,
              rows: el.rows.map(r =>
                r.id === rowId ? { ...r, [field]: value } : r
              )
            }
          : el
      )
    );
  };

  const addRow = (elId) => {
    setElements(prev =>
      prev.map(el =>
        el.id === elId
          ? {
              ...el,
              rows: [
                ...el.rows,
                { id: Date.now(), desc: "New", nos: 1, l: 0, b: 0, h: 0 }
              ]
            }
          : el
      )
    );
  };

  return (
    <div className="measure-page">

      <h2>📐 QS Measurement (Based on Structural Drawing)</h2>

      {elements.map((el, index) => (
        <div className="card" key={el.id}>

          <div className="card-header">
            <h3>{index + 1}. {el.name}</h3>
            <span>Drawing: {el.drawingRef}</span>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Nos</th>
                  <th>L</th>
                  <th>B</th>
                  <th>H</th>
                  <th>Qty</th>
                </tr>
              </thead>

              <tbody>
                {el.rows.map(r => (
                  <tr key={r.id}>
                    <td>
                      <input value={r.desc}
                        onChange={e => update(el.id, r.id, "desc", e.target.value)} />
                    </td>

                    <td>
                      <input type="number" value={r.nos}
                        onChange={e => update(el.id, r.id, "nos", e.target.value)} />
                    </td>

                    <td>
                      <input type="number" value={r.l}
                        onChange={e => update(el.id, r.id, "l", e.target.value)} />
                    </td>

                    <td>
                      <input type="number" value={r.b}
                        onChange={e => update(el.id, r.id, "b", e.target.value)} />
                    </td>

                    <td>
                      <input type="number" value={r.h}
                        onChange={e => update(el.id, r.id, "h", e.target.value)} />
                    </td>

                    <td>{calcQty(r).toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button className="add-btn" onClick={() => addRow(el.id)}>
              + Add Row
            </button>
          </div>

          <div className="summary">
            Total Qty: <b>{totalQty(el).toFixed(3)} {el.unit}</b>  
            | Rate: ₹ {el.rate}  
            | Amount: ₹ {(totalQty(el) * el.rate).toLocaleString()}
          </div>

        </div>
      ))}

      <div className="grand-total">
        Grand Total: ₹ {grandTotal.toLocaleString()}
      </div>

    </div>
  );
}