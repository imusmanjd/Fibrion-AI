"use client";

import {
  DragEvent,
  ChangeEvent,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { uploadDataset } from "@/lib/api";

export default function AnalyzePage() {
  const router = useRouter();

  const [file, setFile] =
    useState<File | null>(null);

  const [processType, setProcessType] =
    useState("weaving");

  const [email, setEmail] =
    useState("");

  const [telegram, setTelegram] =
    useState("");

  const [sendEmail, setSendEmail] =
    useState(false);

  const [sendTelegram, setSendTelegram] =
    useState(false);

  const [dragging, setDragging] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  function acceptFile(candidate?: File) {
    if (!candidate) return;

    const valid =
      candidate.name.endsWith(".csv") ||
      candidate.name.endsWith(".xlsx") ||
      candidate.name.endsWith(".xls");

    if (!valid) {
      setError(
        "Please upload a CSV or Excel file.",
      );
      return;
    }

    setError("");
    setFile(candidate);
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    acceptFile(
      event.dataTransfer.files?.[0],
    );
  }

  function handleChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    acceptFile(event.target.files?.[0]);
  }

  async function handleSubmit() {
    if (!file) {
      setError("Select a dataset first.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const channels: string[] = [];

      if (sendEmail) channels.push("email");
      if (sendTelegram) channels.push("telegram");

      const result = await uploadDataset(
        file,
        processType,
        channels,
        telegram || undefined,
        email || undefined,
      );

      router.push(
        `/analysis/${result.run_id}`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Upload failed.",
      );
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="eyebrow">
        New analysis
      </div>

      <h1 className="page-title">
        Analyze production data.
      </h1>

      <p className="page-description">
        Upload a production dataset and let Fibrion
        validate, calculate, reason, visualize and
        verify the results.
      </p>

      <section className="section">
        <div className="card card-pad">
          <div
            className={`upload-zone ${
              dragging ? "dragging" : ""
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() =>
              setDragging(false)
            }
            onDrop={handleDrop}
          >
            <div>
              <div className="upload-icon">
                ↑
              </div>

              <p className="upload-title">
                {file
                  ? file.name
                  : "Drop your production dataset here"}
              </p>

              <p className="upload-copy">
                CSV or Excel · drag and drop or browse
              </p>

              <label className="button button-secondary">
                Browse files
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  hidden
                  onChange={handleChange}
                />
              </label>
            </div>
          </div>

          <div
            className="grid grid-2"
            style={{ marginTop: 22 }}
          >
            <div>
              <label className="label">
                Process type
              </label>

              <select
                className="select"
                value={processType}
                onChange={(event) =>
                  setProcessType(
                    event.target.value,
                  )
                }
              >
                <option value="weaving">
                  Weaving
                </option>
              </select>
            </div>

            <div>
              <label className="label">
                Dataset
              </label>

              <div className="card card-pad">
                {file
                  ? `${file.name} · ${(
                      file.size /
                      1024 /
                      1024
                    ).toFixed(2)} MB`
                  : "No dataset selected"}
              </div>
            </div>
          </div>

          <div className="section">
            <div className="section-head">
              <div>
                <h2 className="section-title">
                  Report delivery
                </h2>

                <div className="section-meta">
                  You can also send the completed PDF
                  later from the report screen.
                </div>
              </div>
            </div>

            <div className="grid grid-2">
              <div className="card card-pad">
                <label
                  style={{
                    display: "flex",
                    gap: 9,
                    alignItems: "center",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(event) =>
                      setSendEmail(
                        event.target.checked,
                      )
                    }
                  />
                  Send by email
                </label>

                {sendEmail && (
                  <input
                    className="input"
                    style={{ marginTop: 12 }}
                    type="email"
                    placeholder="manager@company.com"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                  />
                )}
              </div>

              <div className="card card-pad">
                <label
                  style={{
                    display: "flex",
                    gap: 9,
                    alignItems: "center",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={sendTelegram}
                    onChange={(event) =>
                      setSendTelegram(
                        event.target.checked,
                      )
                    }
                  />
                  Send to Telegram
                </label>

                {sendTelegram && (
                  <input
                    className="input"
                    style={{ marginTop: 12 }}
                    placeholder="Telegram chat ID"
                    value={telegram}
                    onChange={(event) =>
                      setTelegram(
                        event.target.value,
                      )
                    }
                  />
                )}
              </div>
            </div>
          </div>

          {error && (
            <div
              className="badge badge-danger"
              style={{ marginTop: 20 }}
            >
              {error}
            </div>
          )}

          <div
            className="action-row"
            style={{
              justifyContent: "flex-end",
              marginTop: 25,
            }}
          >
            <button
              className="button button-primary"
              disabled={!file || loading}
              onClick={handleSubmit}
            >
              {loading
                ? "Starting Fibrion..."
                : "Run analysis →"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}