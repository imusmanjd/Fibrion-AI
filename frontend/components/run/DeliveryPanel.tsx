/**
 * frontend/components/run/DeliveryPanel.tsx
 *
 * Shown only once a run has completed. Uses the existing
 * POST /runs/{id}/send endpoint (lib/api.ts: sendReport), which was
 * built for exactly this — sending a finished report on request —
 * but previously unused because delivery was wrongly collected
 * before the upload even started.
 */

"use client";

import { useEffect, useState } from "react";
import { sendReport } from "@/lib/api";
import { getDeliveryPrefs, saveDeliveryPrefs } from "@/lib/delivery-prefs";

type SendState = "idle" | "sending" | "sent" | "error";

export default function DeliveryPanel({ runId }: { runId: string }) {
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [email, setEmail] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");

  const [emailState, setEmailState] = useState<SendState>("idle");
  const [telegramState, setTelegramState] = useState<SendState>("idle");

  // Pre-fill from last time, purely as a convenience — nothing is
  // sent until the person presses Send.
  useEffect(() => {
    const prefs = getDeliveryPrefs();
    setEmailEnabled(prefs.emailEnabled);
    setEmail(prefs.email);
    setTelegramEnabled(prefs.telegramEnabled);
    setTelegramChatId(prefs.telegramChatId);
  }, []);

  async function handleSend(channel: "email" | "telegram") {
    const recipient = channel === "email" ? email : telegramChatId;
    if (!recipient) return;

    const setState = channel === "email" ? setEmailState : setTelegramState;

    setState("sending");
    try {
      await sendReport(runId, channel, recipient);
      setState("sent");
      saveDeliveryPrefs({ emailEnabled, email, telegramEnabled, telegramChatId });
    } catch {
      setState("error");
    }
  }

  return (
    <div className="delivery-panel">
      <div
        className={`delivery-row ${emailEnabled ? "delivery-row-active" : ""}`}
        role="switch"
        aria-checked={emailEnabled}
        tabIndex={0}
        onClick={() => setEmailEnabled((v) => !v)}
        onKeyDown={(e) => e.key === "Enter" && setEmailEnabled((v) => !v)}
      >
        <div className="delivery-row-label">
          <span className="delivery-row-title">Email</span>
          <span className="delivery-row-sub">Send a copy of this report by email</span>
        </div>
        <div className="delivery-switch">
          <div className="delivery-switch-thumb" />
        </div>
      </div>

      {emailEnabled && (
        <div className="delivery-send-row">
          <input
            className="text-input"
            type="email"
            placeholder="name@company.com"
            value={email}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailState("idle");
            }}
          />
          <button
            type="button"
            className="button button-secondary"
            disabled={!email || emailState === "sending"}
            onClick={() => handleSend("email")}
          >
            {emailState === "sending" ? "Sending…" : emailState === "sent" ? "Sent ✓" : "Send"}
          </button>
        </div>
      )}
      {emailState === "error" && (
        <p style={{ color: "var(--fault)", fontSize: 12 }}>
          Could not send. Check the address and try again.
        </p>
      )}

      <div
        className={`delivery-row ${telegramEnabled ? "delivery-row-active" : ""}`}
        role="switch"
        aria-checked={telegramEnabled}
        tabIndex={0}
        onClick={() => setTelegramEnabled((v) => !v)}
        onKeyDown={(e) => e.key === "Enter" && setTelegramEnabled((v) => !v)}
      >
        <div className="delivery-row-label">
          <span className="delivery-row-title">Telegram</span>
          <span className="delivery-row-sub">Send a copy of this report via Telegram</span>
        </div>
        <div className="delivery-switch">
          <div className="delivery-switch-thumb" />
        </div>
      </div>

      {telegramEnabled && (
        <div className="delivery-send-row">
          <input
            className="text-input"
            type="text"
            placeholder="Telegram chat ID"
            value={telegramChatId}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              setTelegramChatId(e.target.value);
              setTelegramState("idle");
            }}
          />
          <button
            type="button"
            className="button button-secondary"
            disabled={!telegramChatId || telegramState === "sending"}
            onClick={() => handleSend("telegram")}
          >
            {telegramState === "sending" ? "Sending…" : telegramState === "sent" ? "Sent ✓" : "Send"}
          </button>
        </div>
      )}
      {telegramState === "error" && (
        <p style={{ color: "var(--fault)", fontSize: 12 }}>
          Could not send. Check the chat ID and try again.
        </p>
      )}
    </div>
  );
}