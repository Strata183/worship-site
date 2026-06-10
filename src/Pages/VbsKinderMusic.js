import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { supabase, supabaseAnonKey, supabaseUrl } from "../supabaseClient";

// Supabase Edge Function errors can contain useful details in the HTTP response.
async function getFunctionErrorMessage(error) {
  if (error?.context instanceof Response) {
    try {
      const body = await error.context.json();

      if (body?.error) {
        return body.error;
      }
    } catch {
      try {
        const text = await error.context.text();

        if (text) {
          return text;
        }
      } catch {
        // Fall back to the Supabase client error message below.
      }
    }
  }

  return error?.message || "Unexpected Edge Function error.";
}

const crcTable = Array.from({ length: 256 }, (_item, index) => {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1) >>> 0;
  }

  return value >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = (crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)) >>> 0;
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function base64ToBytes(base64) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function writeUint16(view, offset, value) {
  view.setUint16(offset, value & 0xffff, true);
}

function writeUint32(view, offset, value) {
  view.setUint32(offset, value >>> 0, true);
}

function getDosDateTime(date = new Date()) {
  const year = Math.max(date.getFullYear(), 1980);

  return {
    date:
      (((year - 1980) << 9) |
        ((date.getMonth() + 1) << 5) |
        date.getDate()) & 0xffff,
    time:
      ((date.getHours() << 11) |
        (date.getMinutes() << 5) |
        Math.floor(date.getSeconds() / 2)) & 0xffff,
  };
}

function concatBytes(parts) {
  const totalLength = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }

  return output;
}

function createZipBlob(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  const { date, time } = getDosDateTime();
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const data = base64ToBytes(file.data);
    const checksum = crc32(data);

    const local = new Uint8Array(30);
    const localView = new DataView(local.buffer);

    writeUint32(localView, 0, 0x04034b50);
    writeUint16(localView, 4, 20);
    writeUint16(localView, 6, 0x0800);
    writeUint16(localView, 8, 0);
    writeUint16(localView, 10, time);
    writeUint16(localView, 12, date);
    writeUint32(localView, 14, checksum);
    writeUint32(localView, 18, data.length);
    writeUint32(localView, 22, data.length);
    writeUint16(localView, 26, nameBytes.length);
    writeUint16(localView, 28, 0);

    localParts.push(local, nameBytes, data);

    const central = new Uint8Array(46);
    const centralView = new DataView(central.buffer);

    writeUint32(centralView, 0, 0x02014b50);
    writeUint16(centralView, 4, 20);
    writeUint16(centralView, 6, 20);
    writeUint16(centralView, 8, 0x0800);
    writeUint16(centralView, 10, 0);
    writeUint16(centralView, 12, time);
    writeUint16(centralView, 14, date);
    writeUint32(centralView, 16, checksum);
    writeUint32(centralView, 20, data.length);
    writeUint32(centralView, 24, data.length);
    writeUint16(centralView, 28, nameBytes.length);
    writeUint16(centralView, 30, 0);
    writeUint16(centralView, 32, 0);
    writeUint16(centralView, 34, 0);
    writeUint16(centralView, 36, 0);
    writeUint32(centralView, 38, 0);
    writeUint32(centralView, 42, offset);

    centralParts.push(central, nameBytes);
    offset += local.length + nameBytes.length + data.length;
  }

  const centralDirectory = concatBytes(centralParts);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);

  writeUint32(endView, 0, 0x06054b50);
  writeUint16(endView, 4, 0);
  writeUint16(endView, 6, 0);
  writeUint16(endView, 8, files.length);
  writeUint16(endView, 10, files.length);
  writeUint32(endView, 12, centralDirectory.length);
  writeUint32(endView, 16, offset);
  writeUint16(endView, 20, 0);

  return new Blob([concatBytes([...localParts, centralDirectory, end])], {
    type: "application/zip",
  });
}

function VbsKinderMusic() {
  const { session, user } = useAuth();
  const [charts, setCharts] = useState([]);
  const [password, setPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function checkAccess() {
      if (!user) {
        return;
      }

      const { data } = await supabase
        .from("vbs_kinder_access")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!ignore) {
        setIsUnlocked(Boolean(data));
        setCheckingAccess(false);
      }
    }

    checkAccess();

    return () => {
      ignore = true;
    };
  }, [user]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const { error: accessError } = await supabase.rpc(
      "claim_vbs_kinder_access",
      {
        access_code: password,
      }
    );

    if (accessError) {
      setError(accessError.message);
      return;
    }

    setIsUnlocked(true);
    setPassword("");
  }

  useEffect(() => {
    let ignore = false;

    async function loadCharts() {
      if (!isUnlocked) {
        setCharts([]);
        return;
      }

      setLoadingCharts(true);
      setError("");

      const { data, error: chartsError } = await supabase
        .from("vbs_kinder_charts")
        .select("id, title, description, sort_order")
        .order("sort_order", { ascending: true })
        .order("title", { ascending: true });

      if (ignore) {
        return;
      }

      if (chartsError) {
        setError(chartsError.message);
        setCharts([]);
      } else {
        setCharts(data || []);
      }

      setLoadingCharts(false);
    }

    loadCharts();

    return () => {
      ignore = true;
    };
  }, [isUnlocked]);

  async function openChart(chart) {
    setError("");

    const signedUrl = await getChartSignedUrl(chart);

    if (signedUrl) {
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    }
  }

  async function getChartSignedUrl(chart) {
    const { data, error: signedUrlError } = await supabase.functions.invoke(
      "r2-song-files",
      {
        body: {
          action: "vbs-kinder-signed-url",
          chartId: chart.id,
        },
      }
    );

    if (signedUrlError) {
      setError(await getFunctionErrorMessage(signedUrlError));
      return "";
    }

    setError("");
    return data.signedUrl;
  }

  async function downloadAllCharts() {
    setDownloadingAll(true);
    setError("");

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/r2-song-files`, {
        body: JSON.stringify({ action: "vbs-kinder-files" }),
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error || "Unable to download the VBS chart zip.");
        setDownloadingAll(false);
        return;
      }

      const body = await response.json();
      const blob = createZipBlob(body.files || []);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "vbs-2026-kinder-music.zip";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setError("");
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Unable to download the VBS chart zip."
      );
    } finally {
      setDownloadingAll(false);
    }
  }

  if (checkingAccess) {
    return (
      <main className="page page-vbs">
        <p>Checking VBS access...</p>
      </main>
    );
  }

  if (!isUnlocked) {
    return (
      <main className="page page-vbs">
        <section className="vbs-hero">
          <p className="eyebrow">Team resources</p>
          <h1>VBS 2026, Kinder Music</h1>
          <p>
            Enter the team password once to unlock this page for your account.
          </p>
        </section>

        <form className="vbs-password-panel form-stack" onSubmit={handleSubmit}>
          <label htmlFor="vbs-password">Password</label>
          <input
            id="vbs-password"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />

          {error && <p className="form-message error">{error}</p>}

          <button className="primary-button" type="submit">
            Open VBS charts
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="page page-vbs">
      <section className="vbs-hero">
        <div className="vbs-hero-copy">
          <p className="eyebrow">Team resources</p>
          <h1>VBS 2026, Kinder Music</h1>
          <p>Charts and practice resources for the Kinder music team.</p>
        </div>

        <div className="vbs-hero-actions">
          <button
            className="primary-button"
            disabled={charts.length === 0 || downloadingAll}
            onClick={downloadAllCharts}
            type="button"
          >
            {downloadingAll ? "Preparing charts..." : "Download all charts"}
          </button>
          <span>{charts.length} {charts.length === 1 ? "chart" : "charts"}</span>
        </div>
      </section>

      <section className="vbs-chart-panel">
        <div className="vbs-panel-heading">
          <div>
            <p className="eyebrow">Private PDFs</p>
            <h2>Charts</h2>
          </div>
          <span>Links expire shortly after opening.</span>
        </div>

        {error && <p className="form-message error">{error}</p>}

        {loadingCharts ? (
          <p className="empty-state">Loading charts...</p>
        ) : charts.length > 0 ? (
          <ul className="vbs-chart-list">
            {charts.map((chart, index) => (
              <li key={chart.id}>
                <button type="button" onClick={() => openChart(chart)}>
                  <span className="vbs-chart-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="vbs-chart-copy">
                    <strong>{chart.title}</strong>
                    <span>{chart.description}</span>
                  </span>
                  <span className="vbs-chart-action">Open</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">
            This account is eligible. Charts will appear here when they are
            added.
          </p>
        )}
      </section>
    </main>
  );
}

export default VbsKinderMusic;
