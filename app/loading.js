export default function Loading() {
  return (
    <div className="global-page-loading-overlay">
      <div className="global-page-loading-card">
        <div className="global-page-spinner" />
        <div className="global-page-loading-title">Loading Page...</div>
        <div className="global-page-loading-sub">Please wait a moment</div>
      </div>
    </div>
  );
}

