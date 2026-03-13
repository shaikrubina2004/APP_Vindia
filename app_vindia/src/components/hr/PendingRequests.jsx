import { FaClipboardList } from "react-icons/fa";

function PendingRequests(){
return(

<div className="dashboard-card">

<h3><FaClipboardList className="card-icon"/> Pending Requests</h3>

<ul>
<li>Leave Requests : 3</li>
<li>Travel Requests : 1</li>
<li>Document Verification : 2</li>
</ul>

</div>

)
}

export default PendingRequests;