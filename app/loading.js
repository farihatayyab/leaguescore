import LoadingText from "@/components/LoadingText";

export default function Loading() {
  return (
    <div className="page-loading" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <LoadingText />
    </div>
  );
}