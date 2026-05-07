const Vendors = ({ vendors = [] }) => {
  return (
    <div>
      <h2>Vendor Management</h2>

      {vendors.length === 0 ? <p>No vendors found.</p> : null}
      {vendors.map((v) => (
        <div key={v._id} className="card">
          <h3>{v.name}</h3>
          <p>{v.email || "No email"}</p>
          <p>Verification: {v.verificationStatus || "none"}</p>
        </div>
      ))}
    </div>
  );
};

export default Vendors;