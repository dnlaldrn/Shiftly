import { Medal, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import ErrorMessage from './ErrorMessage'
import { Skeleton } from './Skeleton'
import { formatMoney } from '../lib/format'
import { supabase } from '../lib/supabase'

type Rank = { rank: number; username: string; pay_centavos: number }

// Mount with key={cutoffStart} so each cut-off starts from a fresh loading state.
type Props = { cutoffStart: string; ended: boolean; currency: string; onLatest: () => void }

export default function Leaderboard({ cutoffStart, ended, currency, onLatest }: Props) {
  const [ranks, setRanks] = useState<Rank[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!ended) return
    let stale = false
    supabase.rpc('leaderboard', { start_date: cutoffStart }).then(({ data, error }) => {
      if (stale) return
      if (error) setError('Could not load the rankings. Check your connection and try again.')
      else setRanks(data)
    })
    return () => {
      stale = true
    }
  }, [cutoffStart, ended])

  if (!ended) {
    return (
      <section className="card leaderboard-wait">
        <Trophy size={28} aria-hidden="true" />
        <h2>Rankings are announced when this cut-off ends</h2>
        <p className="hint">Keep logging your hours. Everyone's gross pay is ranked once the cut-off is over.</p>
        <button onClick={onLatest}>See the latest results</button>
      </section>
    )
  }
  if (error) return <ErrorMessage>{error}</ErrorMessage>
  if (!ranks) {
    return (
      <ol className="podium" aria-busy="true" aria-label="Loading rankings">
        {[1, 2, 3].map((place) => (
          <li key={place}><Skeleton width="3rem" /><Skeleton width="60%" /><Skeleton width="45%" /></li>
        ))}
      </ol>
    )
  }
  if (ranks.length === 0) return <p className="card hint">Nobody logged any pay in this cut-off.</p>

  return (
    <>
      <ol className="podium" aria-label="Top 3">
        {ranks.slice(0, 3).map((row) => (
          <li key={row.username} className={`place-${row.rank}`}>
            <span className="podium-rank">
              {row.rank === 1 ? <Trophy size={18} aria-hidden="true" /> : <Medal size={18} aria-hidden="true" />}
              Top {row.rank}
            </span>
            <strong>{row.username}</strong>
            <span className="podium-pay">{formatMoney(row.pay_centavos, currency)}</span>
          </li>
        ))}
      </ol>
      {ranks.length > 3 && (
        <ol className="ranks" aria-label="Other ranks">
          {ranks.slice(3).map((row) => (
            <li key={row.username}>
              <span className="rank-number">{row.rank}</span>
              <span className="rank-name">{row.username}</span>
              <span className="rank-pay">{formatMoney(row.pay_centavos, currency)}</span>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}
