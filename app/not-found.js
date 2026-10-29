import Link from "next/link";

export default function NotFound() {
  return (
    <div className="panel empty-state">
      <h1>Page not found</h1>
      <p className="muted">The match or page you are looking for does not exist, or it is no longer available.</p>
      <Link href="/football" className="btn-grad inline">Back to live scores</Link>
    </div>
  );
}
