function QuickModuleCard({title,onClick}){

return(

<div className="module-card" onClick={onClick}>

<h3>{title}</h3>
<p>Open {title}</p>

</div>

)

}

export default QuickModuleCard