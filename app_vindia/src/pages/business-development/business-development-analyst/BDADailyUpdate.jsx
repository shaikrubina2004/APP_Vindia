import RoleDailyUpdate from "../../../components/dailyupdate/RoleDailyUpdate";
import "./BDADailyUpdate.css";

// The wrapper class lets the full-width layout apply to the BDA page only —
// the shared styles are also used by Finance, Operations and other roles.
export default function BDADailyUpdate() {
  return (
    <div className="bda-daily-wide">
      <RoleDailyUpdate reportType="bda" title="Daily Update" />
    </div>
  );
}