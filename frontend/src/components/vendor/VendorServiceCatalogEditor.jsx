import { useEffect, useState } from "react";
import axios from "../../api/axios";

export default function VendorServiceCatalogEditor({ portfolio, onSaved }) {
  const [msg, setMsg] = useState("");

  const save = async (partial) => {
    try {
      await axios.post("/portfolio", partial);
      setMsg("Saved");
      onSaved?.();
      setTimeout(() => setMsg(""), 2500);
    } catch (e) {
      setMsg(e?.response?.data?.message || "Save failed");
    }
  };

  if (!portfolio?.category) {
    return (
      <p style={{ color: "#666" }}>
        Create your portfolio (including category) before defining services.
      </p>
    );
  }

  const cat = portfolio.category;

  if (cat === "venue") {
    return (
      <VenueHallsEditor
        initial={portfolio.venueServices?.halls || []}
        onSave={(halls) => save({ venueServices: { halls } })}
        msg={msg}
      />
    );
  }
  if (cat === "catering") {
    return (
      <CateringEditor
        initial={portfolio.cateringServices || {}}
        onSave={(cateringServices) => save({ cateringServices })}
        msg={msg}
      />
    );
  }
  if (cat === "photography") {
    return (
      <PhotoEditor
        initial={portfolio.photographyServices || {}}
        onSave={(photographyServices) => save({ photographyServices })}
        msg={msg}
      />
    );
  }
  if (cat === "decoration") {
    return (
      <DecorationEditor
        initial={portfolio.decorationServices || {}}
        onSave={(decorationServices) => save({ decorationServices })}
        msg={msg}
      />
    );
  }
  return null;
}

function Msg({ text }) {
  if (!text) return null;
  return (
    <p style={{ fontSize: "13px", marginTop: "8px", color: "#15803d" }}>{text}</p>
  );
}

function VenueHallsEditor({ initial, onSave, msg }) {
  const [halls, setHalls] = useState(initial);

  useEffect(() => {
    setHalls(initial);
  }, [initial]);

  const update = (i, patch) => {
    setHalls((prev) =>
      prev.map((h, idx) => (idx === i ? { ...h, ...patch } : h))
    );
  };

  const add = () => {
    setHalls((prev) => [
      ...prev,
      {
        name: "Hall",
        location: "",
        facilities: [],
        flatSessionPrice: 0,
        hourlyRate: 0,
        minimumHours: 4,
        operatingOpen: "09:00",
        operatingClose: "22:00",
      },
    ]);
  };

  const remove = (i) =>
    setHalls((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <div style={{ marginTop: "16px" }}>
      <h3>Your halls & venues</h3>
      <p style={{ fontSize: "14px", color: "#555" }}>
        Add each hall or space clients can book. Set flat session fee and/or hourly rate.
      </p>
      {halls.map((h, i) => (
        <div
          key={h._id || i}
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            padding: "12px",
            marginBottom: "10px",
          }}
        >
          <input
            placeholder="Hall name"
            value={h.name}
            onChange={(e) => update(i, { name: e.target.value })}
            style={{ width: "100%", marginBottom: "6px" }}
          />
          <input
            placeholder="Address / building"
            value={h.location || ""}
            onChange={(e) => update(i, { location: e.target.value })}
            style={{ width: "100%", marginBottom: "6px" }}
          />
          <textarea
            placeholder="Facilities (comma-separated)"
            value={(h.facilities || []).join(", ")}
            onChange={(e) =>
              update(i, {
                facilities: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            rows={2}
            style={{ width: "100%", marginBottom: "6px" }}
          />
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <label>
              Flat session
              <input
                type="number"
                min="0"
                value={h.flatSessionPrice ?? 0}
                onChange={(e) =>
                  update(i, { flatSessionPrice: Number(e.target.value || 0) })
                }
              />
            </label>
            <label>
              Hourly rate
              <input
                type="number"
                min="0"
                value={h.hourlyRate ?? 0}
                onChange={(e) =>
                  update(i, { hourlyRate: Number(e.target.value || 0) })
                }
              />
            </label>
            <label>
              Min hours
              <input
                type="number"
                min="0"
                step="0.5"
                value={h.minimumHours ?? 1}
                onChange={(e) =>
                  update(i, { minimumHours: Number(e.target.value || 1) })
                }
              />
            </label>
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
            <input
              type="time"
              value={h.operatingOpen || "09:00"}
              onChange={(e) => update(i, { operatingOpen: e.target.value })}
            />
            <input
              type="time"
              value={h.operatingClose || "22:00"}
              onChange={(e) => update(i, { operatingClose: e.target.value })}
            />
          </div>
          <button type="button" onClick={() => remove(i)} style={{ marginTop: "8px" }}>
            Remove hall
          </button>
        </div>
      ))}
      <button type="button" onClick={add}>
        + Add hall
      </button>
      <button type="button" onClick={() => onSave(halls)} style={{ marginLeft: "10px" }}>
        Save venue services
      </button>
      <Msg text={msg} />
    </div>
  );
}

function CateringEditor({ initial, onSave, msg }) {
  const [packs, setPacks] = useState(initial.packages || []);
  const [items, setItems] = useState(initial.menuItems || []);
  const [allowCustom, setAllowCustom] = useState(
    initial.allowCustomMenu !== false
  );

  useEffect(() => {
    setPacks(initial.packages || []);
    setItems(initial.menuItems || []);
    setAllowCustom(initial.allowCustomMenu !== false);
  }, [initial]);

  return (
    <div style={{ marginTop: "16px" }}>
      <h3>Menus & packages</h3>
      <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <input
          type="checkbox"
          checked={allowCustom}
          onChange={(e) => setAllowCustom(e.target.checked)}
        />
        Allow clients to build custom menus from items
      </label>
      <h4 style={{ marginTop: "12px" }}>Packages (per person)</h4>
      {packs.map((p, i) => (
        <div key={i} style={{ marginBottom: "8px", padding: "8px", background: "#f9fafb", borderRadius: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ margin: "0 0 6px", fontSize: "12px", color: "#6b7280" }}>
              Package {i + 1}
            </p>
            <button
              type="button"
              onClick={() => setPacks((prev) => prev.filter((_, idx) => idx !== i))}
              style={{ width: "auto", padding: "4px 8px" }}
            >
              Remove package
            </button>
          </div>
          <label style={{ display: "block", fontSize: "12px", color: "#374151" }}>
            Package name
          </label>
          <input
            placeholder="Package name"
            value={p.name || ""}
            onChange={(e) => {
              const n = [...packs];
              n[i] = { ...n[i], name: e.target.value };
              setPacks(n);
            }}
          />
          <label style={{ display: "block", fontSize: "12px", color: "#374151" }}>
            Description / inclusions
          </label>
          <textarea
            placeholder="Description"
            value={p.description || ""}
            rows={2}
            onChange={(e) => {
              const n = [...packs];
              n[i] = { ...n[i], description: e.target.value };
              setPacks(n);
            }}
          />
          <label style={{ display: "block", fontSize: "12px", color: "#374151" }}>
            Price per person
          </label>
          <input
            type="number"
            placeholder="Price / person"
            value={p.pricePerPerson ?? 0}
            onChange={(e) => {
              const n = [...packs];
              n[i] = {
                ...n[i],
                pricePerPerson: Number(e.target.value || 0),
              };
              setPacks(n);
            }}
          />
          <label style={{ display: "block", fontSize: "12px", color: "#374151" }}>
            Minimum guests
          </label>
          <input
            type="number"
            placeholder="Min guests"
            value={p.minGuests ?? 1}
            onChange={(e) => {
              const n = [...packs];
              n[i] = { ...n[i], minGuests: Number(e.target.value || 1) };
              setPacks(n);
            }}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          setPacks((prev) => [
            ...prev,
            {
              name: "",
              description: "",
              pricePerPerson: 0,
              minGuests: 1,
              menuHighlights: [],
            },
          ])
        }
      >
        + Package
      </button>

      {allowCustom && (
        <>
          <h4 style={{ marginTop: "16px" }}>À la carte items (custom menu)</h4>
          {items.map((it, i) => (
            <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
              <label style={{ display: "flex", flexDirection: "column", fontSize: "12px", color: "#374151" }}>
                Dish name
                <input
                  placeholder="Dish"
                  value={it.name || ""}
                  onChange={(e) => {
                    const n = [...items];
                    n[i] = { ...n[i], name: e.target.value };
                    setItems(n);
                  }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", fontSize: "12px", color: "#374151" }}>
                Price per person
                <input
                  type="number"
                  placeholder="/person"
                  value={it.pricePerPerson ?? 0}
                  onChange={(e) => {
                    const n = [...items];
                    n[i] = {
                      ...n[i],
                      pricePerPerson: Number(e.target.value || 0),
                    };
                    setItems(n);
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() =>
                  setItems((prev) => prev.filter((_, idx) => idx !== i))
                }
                style={{ width: "auto", padding: "6px 10px", alignSelf: "end" }}
              >
                Remove dish
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setItems((prev) => [
                ...prev,
                { name: "", pricePerPerson: 0 },
              ])
            }
          >
            + Menu item
          </button>
        </>
      )}

      <div style={{ marginTop: "12px" }}>
        <button
          type="button"
          onClick={() =>
            onSave({
              packages: packs,
              menuItems: items,
              allowCustomMenu: allowCustom,
            })
          }
        >
          Save catering services
        </button>
      </div>
      <Msg text={msg} />
    </div>
  );
}

function PhotoEditor({ initial, onSave, msg }) {
  const [packages, setPackages] = useState(initial.packages || []);

  useEffect(() => {
    setPackages(initial.packages || []);
  }, [initial]);

  return (
    <div style={{ marginTop: "16px" }}>
      <h3>Photography packages</h3>
      <h4 style={{ marginTop: "12px" }}>Packages</h4>
      {packages.map((p, i) => (
        <div key={i} style={{ padding: "8px", background: "#f9fafb", marginBottom: "8px", borderRadius: "8px" }}>
          <input
            placeholder="Name"
            value={p.name || ""}
            onChange={(e) => {
              const n = [...packages];
              n[i] = { ...n[i], name: e.target.value };
              setPackages(n);
            }}
          />
          <input
            placeholder="Facilities (comma-separated)"
            value={(p.facilities || []).join(", ")}
            onChange={(e) => {
              const n = [...packages];
              n[i] = {
                ...n[i],
                facilities: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              };
              setPackages(n);
            }}
          />
          <input
            type="number"
            placeholder="Hour rate"
            value={p.hourRate ?? 0}
            onChange={(e) => {
              const n = [...packages];
              n[i] = {
                ...n[i],
                hourRate: Number(e.target.value || 0),
              };
              setPackages(n);
            }}
          />
          <small style={{ color: "#6b7280", display: "block", marginTop: "4px" }}>
            Hour rate = charge for each hour of coverage (for example, 1500 means 1500 per hour).
          </small>
          <input
            type="number"
            min="1"
            step="0.5"
            placeholder="Minimum hour"
            value={p.minimumHour ?? 1}
            onChange={(e) => {
              const n = [...packages];
              n[i] = { ...n[i], minimumHour: Number(e.target.value || 1) };
              setPackages(n);
            }}
          />
          <small style={{ color: "#6b7280", display: "block", marginTop: "4px" }}>
            Minimum hour = minimum billable hours for this package (client cannot book less than this).
          </small>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          setPackages((prev) => [
            ...prev,
            {
              name: "",
              facilities: [],
              hourRate: 0,
              minimumHour: 1,
            },
          ])
        }
      >
        + Package
      </button>

      <div style={{ marginTop: "12px" }}>
        <button
          type="button"
          onClick={() =>
            onSave({
              packages,
            })
          }
        >
          Save photography services
        </button>
      </div>
      <Msg text={msg} />
    </div>
  );
}

function DecorationEditor({ initial, onSave, msg }) {
  const apiOrigin = (axios.defaults.baseURL || "").replace(/\/api\/?$/, "") || "http://localhost:5000";
  const [packages, setPackages] = useState(initial.packages || []);
  const [singleItems, setSingleItems] = useState(
    initial.singleItems || initial.galleryItems || []
  );
  const [photobooth, setPhotobooth] = useState(
    initial.photobooth || {
      enabled: false,
      note: "",
    }
  );

  useEffect(() => {
    setPackages(initial.packages || []);
    setSingleItems(initial.singleItems || initial.galleryItems || []);
    setPhotobooth(
      initial.photobooth || {
        enabled: false,
        note: "",
      }
    );
  }, [initial]);

  const uploadImage = async (file) => {
    if (!file) return "";
    const formData = new FormData();
    formData.append("image", file);
    const res = await axios.post("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data?.url || "";
  };

  return (
    <div style={{ marginTop: "16px" }}>
      <h3>Decoration packages, single items & custom photobooth</h3>
      {packages.map((p, i) => (
        <div key={i} style={{ padding: "8px", background: "#f9fafb", marginBottom: "8px", borderRadius: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong style={{ fontSize: "12px", color: "#374151" }}>Package {i + 1}</strong>
            <button
              type="button"
              onClick={() => setPackages((prev) => prev.filter((_, idx) => idx !== i))}
              style={{ width: "auto", padding: "4px 8px" }}
            >
              Remove package
            </button>
          </div>
          <label style={{ display: "block", fontSize: "12px", color: "#374151" }}>Package name</label>
          <input
            placeholder="Package title"
            value={p.name || ""}
            onChange={(e) => {
              const n = [...packages];
              n[i] = { ...n[i], name: e.target.value };
              setPackages(n);
            }}
          />
          <label style={{ display: "block", fontSize: "12px", color: "#374151" }}>
            Inclusion pictures (upload one or more)
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              e.target.value = "";
              if (!files.length) return;
              try {
                const uploaded = [];
                for (const file of files) {
                  const url = await uploadImage(file);
                  if (url) uploaded.push(url);
                }
                if (!uploaded.length) return;
                setPackages((prev) => {
                  const n = [...prev];
                  const cur = n[i]?.inclusionPictures || [];
                  n[i] = { ...n[i], inclusionPictures: [...cur, ...uploaded] };
                  return n;
                });
              } catch {
                alert("Image upload failed");
              }
            }}
          />
          {(p.inclusionPictures || []).length > 0 && (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
              {(p.inclusionPictures || []).map((u, picIdx) => (
                <div key={`${u}-${picIdx}`} style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "6px" }}>
                  <img
                    src={u.startsWith("http") ? u : `${apiOrigin}${u}`}
                    alt={`Inclusion ${picIdx + 1}`}
                    style={{ width: "92px", height: "72px", objectFit: "cover", borderRadius: "6px" }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setPackages((prev) => {
                        const n = [...prev];
                        const pics = [...(n[i].inclusionPictures || [])];
                        pics.splice(picIdx, 1);
                        n[i] = { ...n[i], inclusionPictures: pics };
                        return n;
                      })
                    }
                    style={{ width: "auto", padding: "4px 8px", marginTop: "6px" }}
                  >
                    Remove pic
                  </button>
                </div>
              ))}
            </div>
          )}
          <label style={{ display: "block", fontSize: "12px", color: "#374151" }}>Price for rent</label>
          <input
            type="number"
            placeholder="Price for rent"
            value={p.priceForRent ?? p.price ?? 0}
            onChange={(e) => {
              const n = [...packages];
              n[i] = { ...n[i], priceForRent: Number(e.target.value || 0) };
              setPackages(n);
            }}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          setPackages((prev) => [
            ...prev,
            { name: "", inclusionPictures: [], priceForRent: 0 },
          ])
        }
      >
        + Decoration package
      </button>

      <h4 style={{ marginTop: "16px" }}>Rent single items</h4>
      {singleItems.map((g, i) => (
        <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
          <label style={{ display: "flex", flexDirection: "column", fontSize: "12px", color: "#374151" }}>
            Item name
          <input
            placeholder="Item name"
            value={g.name || g.title || ""}
            onChange={(e) => {
              const n = [...singleItems];
              n[i] = { ...n[i], name: e.target.value };
              setSingleItems(n);
            }}
          />
          </label>
          <label style={{ display: "flex", flexDirection: "column", fontSize: "12px", color: "#374151" }}>
            Item picture (upload)
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try {
                  const url = await uploadImage(file);
                  if (!url) return;
                  setSingleItems((prev) => {
                    const n = [...prev];
                    n[i] = { ...n[i], imageUrl: url };
                    return n;
                  });
                } catch {
                  alert("Image upload failed");
                }
              }}
            />
          </label>
          {g.imageUrl ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", justifyContent: "end" }}>
              <img
                src={g.imageUrl.startsWith("http") ? g.imageUrl : `${apiOrigin}${g.imageUrl}`}
                alt={g.name || "Item"}
                style={{ width: "92px", height: "72px", objectFit: "cover", borderRadius: "6px", border: "1px solid #e5e7eb" }}
              />
              <button
                type="button"
                onClick={() =>
                  setSingleItems((prev) => {
                    const n = [...prev];
                    n[i] = { ...n[i], imageUrl: "" };
                    return n;
                  })
                }
                style={{ width: "auto", padding: "4px 8px" }}
              >
                Remove image
              </button>
            </div>
          ) : null}
          <label style={{ display: "flex", flexDirection: "column", fontSize: "12px", color: "#374151" }}>
            Hourly rate
          <input
            type="number"
            placeholder="Hourly rate"
            value={g.hourlyRate ?? g.price ?? 0}
            onChange={(e) => {
              const n = [...singleItems];
              n[i] = { ...n[i], hourlyRate: Number(e.target.value || 0) };
              setSingleItems(n);
            }}
          />
          </label>
          <label style={{ display: "flex", flexDirection: "column", fontSize: "12px", color: "#374151" }}>
            Minimum hour
          <input
            type="number"
            min="1"
            step="0.5"
            placeholder="Minimum hour"
            value={g.minimumHour ?? 1}
            onChange={(e) => {
              const n = [...singleItems];
              n[i] = { ...n[i], minimumHour: Number(e.target.value || 1) };
              setSingleItems(n);
            }}
          />
          </label>
          <button
            type="button"
            onClick={() => setSingleItems((prev) => prev.filter((_, idx) => idx !== i))}
            style={{ width: "auto", padding: "6px 10px", alignSelf: "end" }}
          >
            Remove item
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          setSingleItems((prev) => [
            ...prev,
            { name: "", imageUrl: "", hourlyRate: 0, minimumHour: 1 },
          ])
        }
      >
        + Single item
      </button>

      <h4 style={{ marginTop: "16px" }}>Custom photobooth option</h4>
      <label>
        <input
          type="checkbox"
          checked={photobooth.enabled}
          onChange={(e) =>
            setPhotobooth((prev) => ({ ...prev, enabled: e.target.checked }))
          }
        />{" "}
        Allow clients to request a customized photobooth
      </label>
      {photobooth.enabled && (
        <textarea
          placeholder="Optional note for clients (e.g. available booth types, limits)"
          value={photobooth.note || ""}
          rows={2}
          onChange={(e) =>
            setPhotobooth((prev) => ({
              ...prev,
              note: e.target.value,
            }))
          }
          style={{ marginTop: "8px", width: "100%" }}
        />
      )}

      <div style={{ marginTop: "12px" }}>
        <button
          type="button"
          onClick={() =>
            onSave({
              packages,
              singleItems,
              photobooth,
            })
          }
        >
          Save decoration services
        </button>
      </div>
      <Msg text={msg} />
    </div>
  );
}
