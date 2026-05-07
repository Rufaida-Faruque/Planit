const Overview = ({
  vendors = [],
  clients = [],
  events = [],
}) => {
  return (
    <div>
      <h2>Overview</h2>

      <div className="card">Total Vendors: {vendors.length}</div>
      <div className="card">Total Clients: {clients.length}</div>
      <div className="card">Total Events: {events.length}</div>

      <div className="card">
        Pending Vendors: {vendors.filter(v => v.status === "pending").length}
      </div>
    </div>
  );
};

export default Overview;