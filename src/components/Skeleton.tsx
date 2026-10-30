import Brand from './Brand'

export function Skeleton({ width }: { width: string }) {
  return <span className="skeleton" style={{ width }} aria-hidden="true" />
}

export function SkeletonDays({ count }: { count: number }) {
  return (
    <ul className="days" aria-busy="true" aria-label="Loading days">
      {Array.from({ length: count }, (_, index) => (
        <li className="day" key={index}>
          <div className="day-placeholder">
            <Skeleton width="30%" />
            <Skeleton width="45%" />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function SkeletonSummary() {
  return (
    <section className="summary" aria-busy="true" aria-label="Loading cut-off summary">
      <div className="total"><span>Gross pay</span><strong><Skeleton width="10rem" /></strong></div>
      <div><span>Regular hours</span><strong><Skeleton width="3rem" /></strong></div>
      <div><span>Overtime hours</span><strong><Skeleton width="3rem" /></strong></div>
      <div><span>Night hours</span><strong><Skeleton width="3rem" /></strong></div>
    </section>
  )
}

export function DashboardSkeleton() {
  return (
    <main aria-busy="true">
      <header className="top"><Brand /></header>
      <h1><Skeleton width="9rem" /></h1>
      <section className="card countdown" aria-label="Loading cut-off">
        <Skeleton width="11rem" />
        <Skeleton width="7rem" />
      </section>
      <div className="period-placeholder"><Skeleton width="13rem" /></div>
      <SkeletonSummary />
      <SkeletonDays count={8} />
    </main>
  )
}
