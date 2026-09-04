"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import RunView from "@/components/run/RunView";

export default function RunDetailPage() {
  const params = useParams<{ runId: string }>();
  const router = useRouter();
  const runId = params.runId;

  return (
    <div>
      <div className="run-topbar">
        <Link href="/datasets" className="run-breadcrumb">
          ← Back to datasets
        </Link>
      </div>

      <RunView
        runId={runId}
        onReset={() => router.push("/analyze")}
        resetLabel="New analysis"
      />
    </div>
  );
}