const Clients = ({ clients = [] }) => {
  return (
    <div>
      <h2>Clients</h2>
      {clients.length === 0 ? <p>No clients found.</p> : null}

      {clients.map((c) => (
        <div key={c._id} className="card">
          <strong>{c.name || "Unnamed client"}</strong>
          <div>{c.email || "No email"}</div>
        </div>
      ))}
    </div>
  );
};

export default Clients;