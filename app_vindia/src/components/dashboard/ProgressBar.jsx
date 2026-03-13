function ProgressBar({ value }) {

  return (

    <div className="progress-wrapper">

      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${value}%` }}
        />
      </div>

      <span className="progress-text">{value}%</span>

    </div>

  );

}

export default ProgressBar;