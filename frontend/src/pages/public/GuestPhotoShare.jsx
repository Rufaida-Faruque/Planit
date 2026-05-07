import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "../../api/axios";

/**
 * Public page: guests use camera to snap photos; each upload goes to the event album.
 * No login — access is the secret token in the URL.
 */
export default function GuestPhotoShare() {
  const { eventId, token } = useParams();
  const [ready, setReady] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [count, setCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`/public/${eventId}/photo-share/${token}`);
        if (cancelled) return;
        if (res.data?.ok) {
          setTitle(res.data.title || "Event");
          setReady(true);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.response?.data?.message || "This link is not valid or sharing has ended.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId, token]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        setStatus(
          "Camera access was denied or unavailable. Use “Choose from gallery” below."
        );
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [ready]);

  const uploadBlob = async (blob, filename = "photo.jpg") => {
    setUploading(true);
    setStatus("");
    try {
      const fd = new FormData();
      fd.append("photo", blob, filename);
      const res = await axios.post(
        `/public/${eventId}/photo-share/${token}/upload`,
        fd
      );
      setCount(res.data?.totalPhotos ?? count + 1);
      setStatus("Photo shared — thank you!");
    } catch (e) {
      setStatus(e?.response?.data?.message || "Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  const captureFromCamera = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) {
      setStatus("Camera not ready yet.");
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) uploadBlob(blob, "capture.jpg");
      },
      "image/jpeg",
      0.92
    );
  };

  const onFilePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadBlob(file, file.name);
    e.target.value = "";
  };

  if (error) {
    return (
      <div className="container" style={{ padding: "24px", maxWidth: "520px" }}>
        <h2>Photo sharing</h2>
        <p style={{ color: "#b91c1c" }}>{error}</p>
        <Link to="/">Back home</Link>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="container" style={{ padding: "24px" }}>
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: "16px", maxWidth: "480px", margin: "0 auto" }}>
      <h2 style={{ marginBottom: "8px" }}>{title}</h2>
      <p style={{ color: "#555", marginBottom: "16px" }}>
        Allow camera access, then tap <strong>Take photo &amp; share</strong>. Your picture is
        sent straight to the host&apos;s event album.
      </p>

      <div
        style={{
          borderRadius: "12px",
          overflow: "hidden",
          background: "#111",
          marginBottom: "12px",
          aspectRatio: "3 / 4",
          maxHeight: "56vh",
        }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <button type="button" onClick={captureFromCamera} disabled={uploading}>
          {uploading ? "Uploading…" : "Take photo & share"}
        </button>
        <label
          style={{
            display: "block",
            textAlign: "center",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            cursor: uploading ? "default" : "pointer",
            background: "#f9fafb",
            color: "#111827",
          }}
        >
          <input
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            disabled={uploading}
            onChange={onFilePick}
          />
          Choose from gallery
        </label>
      </div>

      {status && (
        <p style={{ marginTop: "12px", color: status.includes("fail") ? "#b45309" : "#059669" }}>
          {status}
        </p>
      )}
      {count > 0 && (
        <p style={{ marginTop: "8px", fontSize: "14px", color: "#6b7280" }}>
          You&apos;ve shared <strong>{count}</strong> photo{count === 1 ? "" : "s"} this session.
        </p>
      )}
    </div>
  );
}
