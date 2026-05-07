const Events = ({ events = [] }) => {
  return (
    <div>
      <h2>Events</h2>
      {events.length === 0 ? <p>No events found.</p> : null}

      {events.map((e) => (
        <div key={e._id} className="card">
          <h3>{e.title}</h3>
          <p>Client: {e.clientId?.name || e.clientId?.email || "Unknown client"}</p>
          <p>Status: {e.status}</p>
          <p>Closed by admin: {e.postClosureLocked ? "Yes" : "No"}</p>
        </div>
      ))}
    </div>
  );
};

export default Events;