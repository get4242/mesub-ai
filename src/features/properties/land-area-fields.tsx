"use client";
import { useState } from "react";

export function LandAreaFields({ squareMetres }: { squareMetres?: string | number | null }) {
  const [unit, setUnit] = useState(squareMetres == null ? "rai_ngan_sqwah" : "sqm");
  return <fieldset className="form-grid">
    <legend>พื้นที่ดิน</legend>
    <label className="field"><span>หน่วยพื้นที่</span><select name="landAreaUnit" value={unit} onChange={(event) => setUnit(event.target.value)}>
      <option value="rai_ngan_sqwah">ไร่ / งาน / ตร.ว.</option>
      <option value="sqwah">ตารางวา</option>
      <option value="sqm">ตารางเมตร</option>
    </select></label>
    <label className="field" hidden={unit !== "sqm"}><span>ตารางเมตร</span><input name="landAreaSquareMetres" inputMode="decimal" defaultValue={squareMetres == null ? "" : String(squareMetres)} /></label>
    <label className="field" hidden={unit !== "rai_ngan_sqwah"}><span>ไร่</span><input name="landRai" inputMode="numeric" /></label>
    <label className="field" hidden={unit !== "rai_ngan_sqwah"}><span>งาน</span><input name="landNgan" inputMode="numeric" /></label>
    <label className="field" hidden={unit === "sqm"}><span>ตารางวา</span><input name="landSqwah" inputMode="decimal" /></label>
  </fieldset>;
}
