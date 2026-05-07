import { useMemo, useState } from "react";
import { EVENT_CHECKLIST_TEMPLATES } from "../../constants/eventChecklistTemplates.js";
import { createDefaultChecklistRows } from "../../constants/defaultClientChecklist.js";

function normalizeRowsFromApi(list) {
  return (list || []).map((row, i) => ({
    key: row._id ? String(row._id) : `item-${i}-${row.text?.slice(0, 8)}`,
    _id: row._id ? String(row._id) : undefined,
    text: row.text || "",
    done: Boolean(row.done),
    notes: row.notes || "",
    sortOrder: Number(row.sortOrder ?? i),
  }));
}

export function mapApiChecklistToState(list) {
  const normalized = normalizeRowsFromApi(list);
  if (normalized.length === 0) {
    return createDefaultChecklistRows();
  }
  return normalized;
}

export function mapStateToApiPayload(rows) {
  return rows
    .filter((r) => String(r.text || "").trim())
    .map((r, index) => ({
      ...(r._id ? { _id: r._id } : {}),
      text: String(r.text || "").trim(),
      done: Boolean(r.done),
      notes: String(r.notes || "").trim(),
      sortOrder: index,
    }));
}

const rowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "8px 10px",
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
  background: "#fff",
};

/**
 * Simple planning checklist: checkbox + one line of text per task.
 */
export default function EventPlanningChecklist({
  rows,
  setRows,
  onSave,
  saving,
  readOnly = false,
}) {
  const [templateId, setTemplateId] = useState("");

  const completed = useMemo(
    () => rows.filter((r) => r.done).length,
    [rows]
  );

  const applyTemplate = () => {
    const tpl = EVENT_CHECKLIST_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) {
      alert("Choose a template first");
      return;
    }
    const newItems = tpl.items.map((text, i) => ({
      key: `tpl-${tpl.id}-${Date.now()}-${i}`,
      text,
      done: false,
      notes: "",
      sortOrder: rows.length + i,
    }));
    setRows((prev) => [...prev, ...newItems]);
    setTemplateId("");
  };

  const addBlankRow = () => {
    setRows((prev) => [
      ...prev,
      {
        key: `new-${Date.now()}`,
        text: "",
        done: false,
        notes: "",
        sortOrder: prev.length,
      },
    ]);
  };

  const updateRow = (key, patch) => {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r))
    );
  };

  const removeRow = (key) => {
    setRows((prev) => prev.filter((r) => r.key !== key));
  };

  const move = (key, dir) => {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.key === key);
      if (idx < 0) return prev;
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[j]] = [copy[j], copy[idx]];
      return copy;
    });
  };

  const pct =
    rows.length === 0 ? 0 : Math.round((completed / rows.length) * 100);

  return (
    <div className="card card--fluid">
      <h3>Planning checklist</h3>
      <p style={{ color: "#666", marginBottom: "12px", fontSize: "15px" }}>
        Tick items off as you go. Add your own lines anytime — changes are saved when you
        click Save.
      </p>

      {rows.length > 0 && (
        <p style={{ marginBottom: "14px", fontSize: "14px", color: "#374151" }}>
          <strong>{completed}</strong> of <strong>{rows.length}</strong> done ({pct}%)
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {rows.map((row) => (
          <div
            key={row.key}
            style={{
              ...rowStyle,
              background: row.done ? "#f0fdf4" : "#fff",
            }}
          >
            <input
              type="checkbox"
              checked={row.done}
              disabled={readOnly}
              onChange={(e) =>
                updateRow(row.key, { done: e.target.checked })
              }
              aria-label={row.text ? `Done: ${row.text}` : "Done"}
              style={{ width: "18px", height: "18px", flexShrink: 0, cursor: "pointer" }}
            />
            <input
              type="text"
              placeholder="Task"
              value={row.text}
              readOnly={readOnly}
              onChange={(e) => updateRow(row.key, { text: e.target.value })}
              style={{
                flex: 1,
                minWidth: 0,
                margin: 0,
                border: "none",
                background: "transparent",
                fontSize: "15px",
                textDecoration: row.done ? "line-through" : "none",
                color: row.done ? "#6b7280" : "#111",
              }}
            />
            <div
              style={{
                display: "flex",
                gap: "4px",
                flexShrink: 0,
                alignItems: "center",
              }}
            >
              <button
                type="button"
                onClick={() => move(row.key, -1)}
                disabled={readOnly}
                style={{ width: "auto", padding: "4px 8px", fontSize: "13px" }}
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(row.key, 1)}
                disabled={readOnly}
                style={{ width: "auto", padding: "4px 8px", fontSize: "13px" }}
                aria-label="Move down"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeRow(row.key)}
                disabled={readOnly}
                style={{ width: "auto", padding: "4px 10px", fontSize: "13px" }}
                aria-label="Remove task"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: "14px",
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          onClick={addBlankRow}
          disabled={readOnly}
          style={{ width: "auto" }}
        >
          Add task
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || readOnly}
          style={{ width: "auto" }}
        >
          {saving ? "Saving…" : "Save checklist"}
        </button>
      </div>

      <details
        style={{ marginTop: "16px", fontSize: "14px", color: "#555" }}
        open={!readOnly ? undefined : false}
      >
        <summary
          style={{
            cursor: readOnly ? "default" : "pointer",
            userSelect: "none",
            pointerEvents: readOnly ? "none" : "auto",
            opacity: readOnly ? 0.5 : 1,
          }}
        >
          Add more ideas from a template
        </summary>
        <div
          style={{
            marginTop: "10px",
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            alignItems: "center",
          }}
        >
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            disabled={readOnly}
            style={{ minWidth: "200px" }}
          >
            <option value="">Choose…</option>
            {EVENT_CHECKLIST_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={applyTemplate}
            disabled={readOnly}
            style={{ width: "auto" }}
          >
            Add to list
          </button>
        </div>
        <p style={{ marginTop: "8px", fontSize: "13px", color: "#888", marginBottom: 0 }}>
          Templates append to your list — you can delete lines you don’t need.
        </p>
      </details>
    </div>
  );
}
