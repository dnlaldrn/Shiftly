import { Medal, Trophy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import ErrorMessage from './ErrorMessage'
import { Skeleton } from './Skeleton'
import { formatMoney } from '../lib/format'
import { supabase } from '../lib/supabase'

type Rank = { rank: number; username: string; pay_centavos: number }

type Props = { userId: string; cutoffStart: string; ended: boolean; currency: string; onLatest: () => void }

// Only people who joined are ranked or can see the rankings. The leaderboard database function enforces both.
export default function Leaderboard({ userId, ...cutoff }: Props) {
  const [participating, setParticipating] = useState<boolean | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('profiles').select('participating').eq('user_id', userId).single().then(({ data, error }) => {
      if (error) setError('Could not load the leaderboard. Check your connection and try again.')
      else setParticipating(data.participating)
    })
  }, [userId])

  async function join(joined: boolean) {
    setBusy(true)
    setError('')
    const { error } = await supabase.from('profiles').update({ participating: joined }).eq('user_id', userId)
    setBusy(false)
    if (error) return setError(`Could not ${joined ? 'join' : 'leave'} the leaderboard. Check your connection and try again.`)
    setParticipating(joined)
    setConfirming(false)
  }

  if (participating === null) return error ? <ErrorMessage>{error}</ErrorMessage> : <PodiumSkeleton />

  if (!participating) {
    return (
      <>
        <section className="card leaderboard-wait">
          <Trophy size={28} aria-hidden="true" />
          <h2>Join the leaderboard</h2>
          <p className="hint">
            See how your gross pay ranks against everyone who joined. Until you join, your pay stays hidden and you
            can't see the rankings.
          </p>
          <button className="primary" onClick={() => setConfirming(true)}>Participate</button>
        </section>
        {confirming && (
          <JoinDialog busy={busy} error={error} onConfirm={() => join(true)} onClose={() => {
            setConfirming(false)
            setError('')
          }} />
        )}
      </>
    )
  }

  return (
    <>
      <Rankings key={cutoff.cutoffStart} {...cutoff} />
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <button className="leaderboard-leave" disabled={busy} onClick={() => join(false)}>
        {busy ? 'Leaving…' : 'Leave the leaderboard'}
      </button>
    </>
  )
}

type DialogProps = { busy: boolean; error: string; onConfirm: () => void; onClose: () => void }

function JoinDialog({ busy, error, onConfirm, onClose }: DialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  return (
    <dialog
      ref={dialog}
      className="day-dialog centered"
      aria-labelledby="join-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialog.current && !busy) dialog.current?.close()
      }}
    >
      <div className="stack">
        <h2 id="join-title">Disclose your pay?</h2>
        <p>
          Your username and gross pay will be disclosed and ranked for every cut-off, past ones included. Everyone
          else who joined can see them.
        </p>
        <p className="hint">You can leave at any time, and your pay is hidden again.</p>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <div className="dialog-actions">
          <button type="button" autoFocus disabled={busy} onClick={() => dialog.current?.close()}>Cancel</button>
          <button type="button" className="primary" disabled={busy} onClick={onConfirm}>
            {busy ? 'Joining…' : 'Participate'}
          </button>
        </div>
      </div>
    </dialog>
  )
}

function PodiumSkeleton() {
  return (
    <ol className="podium" aria-busy="true" aria-label="Loading rankings">
      {[1, 2, 3].map((place) => (
        <li key={place}><Skeleton width="3rem" /><Skeleton width="60%" /><Skeleton width="45%" /></li>
      ))}
    </ol>
  )
}

// Mount with key={cutoffStart} so each cut-off starts from a fresh loading state.
type RankingsProps = Omit<Props, 'userId'>

function Rankings({ cutoffStart, ended, currency, onLatest }: RankingsProps) {
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
        <p className="hint">Keep logging your hours. Everyone who joined is ranked by gross pay once the cut-off is over.</p>
        <button onClick={onLatest}>See the latest results</button>
      </section>
    )
  }
  if (error) return <ErrorMessage>{error}</ErrorMessage>
  if (!ranks) return <PodiumSkeleton />
  if (ranks.length === 0) return <p className="card hint">Nobody who joined logged any pay in this cut-off.</p>

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
