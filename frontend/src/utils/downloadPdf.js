import axios from "../api/axios";

/**
 * GET a PDF from the API and trigger a browser download.
 * @param {string} path - e.g. `/invoices/client/event/${id}` (no /api prefix)
 * @param {string} fallbackName - filename if Content-Disposition is missing
 */
export async function downloadPdf(path, fallbackName = "document.pdf") {
  const res = await axios.get(path, {
    responseType: "blob",
    validateStatus: () => true,
  });
  const ctype = res.headers["content-type"] || "";
  if (res.status >= 400 || !ctype.includes("pdf")) {
    let msg = "Download failed";
    try {
      const text = await res.data.text();
      const j = JSON.parse(text);
      msg = j.message || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const blob = new Blob([res.data], { type: "application/pdf" });
  const cd =
    res.headers["content-disposition"] ||
    res.headers["Content-Disposition"] ||
    "";
  let filename = fallbackName;
  const star = /filename\*=UTF-8''([^;\n]+)/i.exec(cd);
  const quoted = /filename="([^"]+)"/i.exec(cd);
  const plain = /filename=([^;\n]+)/i.exec(cd);
  if (star) {
    try {
      filename = decodeURIComponent(star[1].trim());
    } catch {
      filename = star[1].trim();
    }
  } else if (quoted) {
    filename = quoted[1];
  } else if (plain) {
    filename = plain[1].replace(/"/g, "").trim();
  }
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
