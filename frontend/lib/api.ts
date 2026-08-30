import type {
  AnalysisRun,
  UploadResponse,
} from "./types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

export async function uploadDataset(
  file: File,
  processType = "weaving",
  deliveryChannels: string[] = [],
  telegramChatId?: string,
  recipientEmail?: string,
) {
  const form = new FormData();

  form.append("file", file);
  form.append("process_type", processType);
  form.append(
    "delivery_channels",
    deliveryChannels.join(","),
  );

  if (telegramChatId) {
    form.append(
      "telegram_chat_id",
      telegramChatId,
    );
  }

  if (recipientEmail) {
    form.append(
      "recipient_email",
      recipientEmail,
    );
  }

  const response = await fetch(
    `${API_URL}/upload`,
    {
      method: "POST",
      body: form,
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      body || "Upload failed.",
    );
  }

  return response.json() as Promise<UploadResponse>;
}

export async function getRun(
  runId: string,
) {
  const response = await fetch(
    `${API_URL}/runs/${runId}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error(
      "Could not retrieve analysis run.",
    );
  }

  return response.json() as Promise<AnalysisRun>;
}

export function getReportUrl(
  runId: string,
) {
  return `${API_URL}/runs/${runId}/report`;
}

export function getChartUrl(
  runId: string,
  chartName: string,
) {
  return (
    `${API_URL}/runs/${runId}/charts/` +
    encodeURIComponent(chartName)
  );
}

export async function sendReport(
  runId: string,
  channel: "email" | "telegram",
  recipient: string,
) {
  const response = await fetch(
    `${API_URL}/runs/${runId}/send`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel,
        recipient,
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      body || "Could not send report.",
    );
  }

  return response.json();
}