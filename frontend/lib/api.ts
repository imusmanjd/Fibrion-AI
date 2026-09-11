import type {
  AnalysisRun,
  AuthUser,
  UploadResponse,
} from "./types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "/api";

async function readErrorDetail(response: Response, fallback: string) {
  try {
    const body = await response.json();
    return body?.detail || fallback;
  } catch {
    return fallback;
  }
}

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
      credentials: "include",
      body: form,
    },
  );

  if (!response.ok) {
    throw new Error(await readErrorDetail(response, "Upload failed."));
  }

  return response.json() as Promise<UploadResponse>;
}

export async function getRun(
  runId: string,
) {
  const response = await fetch(
    `${API_URL}/runs/${runId}`,
    { cache: "no-store", credentials: "include" },
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
      credentials: "include",
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
    throw new Error(await readErrorDetail(response, "Could not send report."));
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function registerUser(
  email: string,
  password: string,
  fullName?: string,
) {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, full_name: fullName || null }),
  });

  if (!response.ok) {
    throw new Error(await readErrorDetail(response, "Could not create account."));
  }

  return response.json() as Promise<AuthUser>;
}

export async function loginUser(email: string, password: string) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(await readErrorDetail(response, "Could not log in."));
  }

  return response.json() as Promise<AuthUser>;
}

export async function logoutUser() {
  await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}

/** Returns the logged-in user, or null if there's no valid session. Never throws. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) return null;
    return (await response.json()) as AuthUser;
  } catch {
    return null;
  }
}