import { useState, useMemo } from 'react'
import type { Dynasty, ID } from '../../game/types/dynasty'
import type { Screen } from '../../game/types'
import { calculateHourBudget } from '../../game/engine/recruiting/calculateHourBudget'
import { getRemainingHours, getTotalAllocatedHours, allocateHoursToRecruit, getTotalScoutingHours } from '../../game/engine/recruiting/allocateHours'
import { addRecruitToBoard, removeRecruitFromBoard, offerScholarship, scoutRecruit } from '../../game/engine/recruiting/boardManagement'
import { projectMinutesForNextSeason, getOpportunityColor, getOpportunityRating } from '../../game/engine/minutes/projectMinutes'
import { getAvailableScholarships, getOfferedScholarshipsCount } from '../../game/engine/recruiting/scholarshipLimits'
import { evaluateArchetypeFit } from '../../game/engine/schemes/schemeDefinitions'
import { POSITIONS } from '../hooks/useRotationController'
import { teamName, getRatingDisplayName } from '../utils/format'
import type { RatingKey } from '../../game/types/dynasty'

export function RecruitingScreen(props: {
  activeSave: Dynasty | null
  setScreen: (s: Screen) => void
  setActiveSave: (d: Dynasty) => void
}) {
  const { activeSave, setScreen, setActiveSave } = props
  const [selectedRecruitId, setSelectedRecruitId] = useState<ID | null>(null)
  const [positionFilter, setPositionFilter] = useState<string>('ALL')
  const [starFilter, setStarFilter] = useState<string>('ALL')
  const [fitFilter, setFitFilter] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState<string>('')

  if (!activeSave) {
    return (
      <section className="card wide">
        <p className="cardText muted">No dynasty loaded.</p>
      </section>
    )
  }

  const userTeamId = activeSave.league.userTeamId
  const recruitingState = activeSave.recruiting
  const recruitPool = recruitingState?.recruitPool ?? {}
  const board = recruitingState?.boardsByTeamId?.[userTeamId]
  const hourBudget = calculateHourBudget(activeSave, userTeamId)
  const totalAllocated = getTotalAllocatedHours(activeSave, userTeamId)
  const scoutingHours = getTotalScoutingHours(activeSave, userTeamId)
  const remainingHours = getRemainingHours(activeSave, userTeamId)
  const scholarships = getAvailableScholarships(activeSave, userTeamId)
  const offeredCount = getOfferedScholarshipsCount(activeSave, userTeamId)
  
  // Use saved board progress (progress only updates weekly, not immediately)
  const displayBoard = board

  // Get all recruits (from pool)
  const allRecruits = Object.values(recruitPool)

  // Separate recruits into: committed (to your team), on board, and available
  const { committedRecruits, boardRecruits, nonBoardRecruits } = useMemo(() => {
    const committedList: typeof allRecruits = []
    const boardList: typeof allRecruits = []
    const nonBoardList: typeof allRecruits = []
    
    const userBoard = recruitingState?.boardsByTeamId?.[userTeamId]
    const boardRecruitIds = userBoard?.recruitIds ?? []
    
    for (const recruit of allRecruits) {
      // Committed recruits go in their own section
      if (recruit.status === 'COMMITTED' && recruit.committedToTeamId === userTeamId) {
        committedList.push(recruit)
      } else if (boardRecruitIds.includes(recruit.recruitId)) {
        // On board but not committed
        boardList.push(recruit)
      } else {
        // Available (not on board)
        nonBoardList.push(recruit)
      }
    }
    
    // Sort all lists
    const sortRecruits = (recruits: typeof allRecruits) => {
      return [...recruits].sort((a, b) => {
        if (b.starRating !== a.starRating) return b.starRating - a.starRating
        return (b.ratings.overall ?? 0) - (a.ratings.overall ?? 0)
      })
    }
    
    return {
      committedRecruits: sortRecruits(committedList),
      boardRecruits: sortRecruits(boardList),
      nonBoardRecruits: sortRecruits(nonBoardList),
    }
  }, [allRecruits, recruitingState, userTeamId])

  // Filter recruits (committed are always shown, no filtering)
  const filteredCommittedRecruits = committedRecruits // Always show all committed

  const filteredBoardRecruits = useMemo(() => {
    let filtered = boardRecruits
    if (positionFilter !== 'ALL') {
      filtered = filtered.filter(r => r.position === positionFilter)
    }
    if (starFilter !== 'ALL') {
      filtered = filtered.filter(r => r.starRating === Number(starFilter))
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(r => {
        const name = `${r.firstName} ${r.lastName}`.toLowerCase()
        const hometown = r.hometown.toLowerCase()
        return name.includes(term) || hometown.includes(term)
      })
    }
    if (fitFilter !== 'ALL' && activeSave?.coach.scheme) {
      filtered = filtered.filter(r => {
        const fitScore = evaluateArchetypeFit(r.archetype, activeSave.coach.scheme!)
        if (fitFilter === 'GOOD') return fitScore >= 3
        if (fitFilter === 'OKAY') return fitScore >= 0 && fitScore < 3
        if (fitFilter === 'BAD') return fitScore < 0
        return true
      })
    }
    return filtered
  }, [boardRecruits, positionFilter, starFilter, searchTerm, fitFilter, activeSave?.coach.scheme])

  const filteredNonBoardRecruits = useMemo(() => {
    let filtered = nonBoardRecruits
    if (positionFilter !== 'ALL') {
      filtered = filtered.filter(r => r.position === positionFilter)
    }
    if (starFilter !== 'ALL') {
      filtered = filtered.filter(r => r.starRating === Number(starFilter))
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(r => {
        const name = `${r.firstName} ${r.lastName}`.toLowerCase()
        const hometown = r.hometown.toLowerCase()
        return name.includes(term) || hometown.includes(term)
      })
    }
    if (fitFilter !== 'ALL' && activeSave?.coach.scheme) {
      filtered = filtered.filter(r => {
        const fitScore = evaluateArchetypeFit(r.archetype, activeSave.coach.scheme!)
        if (fitFilter === 'GOOD') return fitScore >= 3
        if (fitFilter === 'OKAY') return fitScore >= 0 && fitScore < 3
        if (fitFilter === 'BAD') return fitScore < 0
        return true
      })
    }
    return filtered
  }, [nonBoardRecruits, positionFilter, starFilter, searchTerm, fitFilter, activeSave?.coach.scheme])

  // Get selected recruit
  const selectedRecruit = selectedRecruitId 
    ? recruitPool[selectedRecruitId] ?? null
    : (filteredBoardRecruits[0] ?? filteredNonBoardRecruits[0] ?? null)

  // Get user team's progress (use stored progress - only updates weekly during sim)
  // Fall back to initial interest if no stored progress yet
  const storedProgress = displayBoard?.progressByRecruitId?.[selectedRecruit?.recruitId ?? '']
  const userProgress = storedProgress !== undefined 
    ? storedProgress 
    : (selectedRecruit?.interestByTeamId[userTeamId] ?? 0)
  const hoursAllocated = selectedRecruit ? (board?.hoursAllocatedByRecruitId?.[selectedRecruit.recruitId] ?? 0) : 0
  const scholarshipOffered = selectedRecruit ? (board?.scholarshipOfferedToRecruitId?.[selectedRecruit.recruitId] ?? false) : false

  // Get competition (other teams recruiting) - use stored progress or initial interest
  const competition = useMemo(() => {
    if (!selectedRecruit) return []
    const competitors: Array<{ teamId: ID; progress: number }> = []
    
    // Check all teams that have this recruit on their board
    for (const [teamId, otherBoard] of Object.entries(recruitingState?.boardsByTeamId ?? {})) {
      if (teamId === userTeamId) continue
      if (!otherBoard?.recruitIds?.includes(selectedRecruit.recruitId)) continue
      
      // Use stored progress (only updates weekly during sim), or fall back to initial interest
      // Note: If storedProgress is 0, it might be the initial value, so we should check initial interest
      const storedProgress = otherBoard?.progressByRecruitId?.[selectedRecruit.recruitId]
      const progress = (storedProgress !== undefined && storedProgress > 0)
        ? storedProgress 
        : (selectedRecruit.interestByTeamId[teamId] ?? 0)
      competitors.push({ teamId, progress })
    }

    // Sort by progress (desc)
    competitors.sort((a, b) => b.progress - a.progress)

    return competitors.slice(0, 5) // Top 5 competitors
  }, [selectedRecruit, recruitingState, userTeamId])

  // Calculate opportunity for this recruit's position
  const minutesProjection = projectMinutesForNextSeason(activeSave, userTeamId)
  const positionOpp = minutesProjection?.byPosition[selectedRecruit?.position ?? 'PG'] ?? null

  // Format height
  const formatHeight = (inches: number) => {
    const ft = Math.floor(inches / 12)
    const inch = inches % 12
    return `${ft}'${inch}"`
  }

  // Get star display
  const getStarDisplay = (stars: number) => '★'.repeat(stars) + '☆'.repeat(5 - stars)

  // Get overall display based on scout level
  const getOverallDisplay = (recruit: typeof allRecruits[0]) => {
    if (!recruit) return '?? OVR'
    const scoutLevel = recruit.scoutedByTeamId[userTeamId] ?? 'NONE'
    const overall = recruit.ratings.overall ?? 0
    
    if (scoutLevel === 'FULL') {
      return `${overall} OVR`
    } else if (scoutLevel === 'PARTIAL') {
      // Show rating band (round to nearest 5)
      const rounded = Math.round(overall / 5) * 5
      return `${rounded - 5}-${rounded + 5} OVR`
    } else {
      return '?? OVR'
    }
  }

  // Get gem/bust status display
  const getGemBustDisplay = (recruit: typeof allRecruits[0]) => {
    if (!recruit) return null
    const scoutLevel = recruit.scoutedByTeamId[userTeamId] ?? 'NONE'
    if (scoutLevel !== 'FULL') return null
    
    const status = recruit.gemBustStatus
    if (status === 'GEM') {
      return { text: '💎 GEM', color: '#4caf50' }
    } else if (status === 'BUST') {
      return { text: '⚠️ BUST', color: '#ff5252' }
    }
    return null
  }

  // Get scheme fit badge for recruit
  const getSchemeFitBadge = (recruit: typeof allRecruits[0]) => {
    if (!recruit || !activeSave || !activeSave.coach.scheme) return null
    
    const fitScore = evaluateArchetypeFit(recruit.archetype, activeSave.coach.scheme)
    
    if (fitScore >= 3) {
      return { text: '✓ Fits', color: '#4caf50', bg: 'rgba(76, 175, 80, 0.2)' }
    } else if (fitScore >= 0) {
      return { text: '~ Okay', color: '#ffc107', bg: 'rgba(255, 193, 7, 0.2)' }
    } else {
      return { text: '✗ Mismatch', color: '#ff5252', bg: 'rgba(255, 82, 82, 0.2)' }
    }
  }

  // Get rating display based on scout level
  const getRatingDisplay = (recruit: typeof allRecruits[0], ratingKey: RatingKey): string => {
    if (!recruit) return '??'
    const scoutLevel = recruit.scoutedByTeamId[userTeamId] ?? 'NONE'
    const rating = recruit.ratings[ratingKey] ?? 0
    
    if (scoutLevel === 'FULL') {
      return String(rating)
    } else if (scoutLevel === 'PARTIAL') {
      // Show range: round to nearest 5, then show ±5 range
      const rounded = Math.round(rating / 5) * 5
      const lower = Math.max(1, rounded - 5)
      const upper = Math.min(99, rounded + 5)
      return `${lower}-${upper}`
    } else {
      return '??'
    }
  }

  // Get color class for rating value
  const getRatingColorClass = (recruit: typeof allRecruits[0], ratingKey: RatingKey): string => {
    if (!recruit) return ''
    const scoutLevel = recruit.scoutedByTeamId[userTeamId] ?? 'NONE'
    if (scoutLevel !== 'FULL') return ''
    
    const rating = recruit.ratings[ratingKey] ?? 0
    if (rating >= 80) return 'excellent'
    if (rating >= 70) return 'good'
    if (rating >= 60) return 'average'
    if (rating >= 50) return 'poor'
    return 'weak'
  }

  // Group stats by category
  const statGroups = {
    offense: ['shooting2', 'shooting3', 'freeThrow', 'finishing', 'ballHandling', 'passing'] as RatingKey[],
    defense: ['perimeterDefense', 'rimDefense', 'steal', 'block'] as RatingKey[],
    physical: ['athleticism', 'strength', 'stamina'] as RatingKey[],
  }

  return (
    <section className="card wide recruitingContainer">
      <div className="recruitingHeader">
        <h2 className="recruitingTitle">Recruiting</h2>
        <div className="recruitingHeaderActions">
          <div className="recruitingMetrics">
            <div className="recruitingMetricItem">
              Weekly Budget: <strong className="recruitingMetricValue">{hourBudget} hours</strong>
            </div>
            <div className="recruitingMetricItem">
              Recruiting: <strong className={totalAllocated > hourBudget ? 'recruitingMetricValue warn' : 'recruitingMetricValue'}>
                {totalAllocated}h
              </strong>
            </div>
            {scoutingHours > 0 && (
              <div className="recruitingMetricItem">
                Scouting: <strong className="recruitingMetricValue muted">
                  {scoutingHours}h
                </strong>
              </div>
            )}
            <div className="recruitingMetricItem">
              Remaining: <strong className={remainingHours < 50 ? 'recruitingMetricValue warn' : 'recruitingMetricValue primary'}>
                {remainingHours} hours
              </strong>
            </div>
            <div className="recruitingScholarships">
              Scholarships: <strong className={scholarships.estimatedAvailable === 0 ? 'recruitingMetricValue warn' : 'recruitingMetricValue'}>
                {scholarships.estimatedAvailable}/{scholarships.total}
              </strong>
              {' '}
              <span className="recruitingScholarshipsSub">
                ({offeredCount} offered, {scholarships.committed} committed)
                {scholarships.leaving.total > 0 && (
                  <> • {scholarships.leaving.total} leaving ({scholarships.leaving.graduating} grad{scholarships.leaving.likelyDraft > 0 ? `, ~${scholarships.leaving.likelyDraft} likely draft` : ''})</>
                )}
              </span>
            </div>
          </div>
          <button className="btn secondary" onClick={() => setScreen('dynastyHub')}>
            Back
          </button>
        </div>
      </div>

      <div className="recruitingMainContent">
        {/* Left Panel - Recruit List */}
        <div className="recruitingLeftPanel">
          {/* Filters */}
          <div className="recruitingFilters">
            <div className="recruitingFilterGroup">
              <input 
                type="text"
                className="input recruitingSearchInput" 
                placeholder="Search by name or hometown..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="recruitingFilterGroup">
              <select 
                className="input recruitingFilterSelect" 
                value={positionFilter}
                onChange={e => setPositionFilter(e.target.value)}
              >
                <option value="ALL">All Positions</option>
                {POSITIONS.map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>
            <select 
              className="input recruitingFilterSelect" 
              value={starFilter}
              onChange={e => setStarFilter(e.target.value)}
            >
              <option value="ALL">All Stars</option>
              {[5, 4, 3, 2, 1].map(stars => (
                <option key={stars} value={String(stars)}>{stars}★</option>
              ))}
            </select>
            <select 
              className="input recruitingFilterSelect" 
              value={fitFilter}
              onChange={e => setFitFilter(e.target.value)}
            >
              <option value="ALL">All Scheme Fits</option>
              <option value="GOOD">✓ Good Fit</option>
              <option value="OKAY">~ Okay Fit</option>
              <option value="BAD">✗ Poor Fit</option>
            </select>
          </div>

          {/* Recruit List */}
          <div className="recruitingRecruitList">
            {/* Committed Recruits Section */}
            {filteredCommittedRecruits.length > 0 && (
              <>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: 700, 
                  color: '#4caf50', 
                  marginBottom: 12,
                  marginTop: 4,
                  paddingBottom: 8,
                  paddingTop: 8,
                  borderBottom: '2px solid #4caf50',
                  backgroundColor: 'rgba(76, 175, 80, 0.15)',
                  borderRadius: '4px',
                  paddingLeft: 8,
                }}>
                  ✅ COMMITTED ({filteredCommittedRecruits.length})
                </div>
                {filteredCommittedRecruits.map((recruit) => {
                  const isSelected = recruit.recruitId === selectedRecruitId
                  
                  return (
                    <button
                      key={recruit.recruitId}
                      onClick={() => setSelectedRecruitId(recruit.recruitId)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '12px 14px',
                        marginBottom: 6,
                        border: `2px solid ${isSelected ? '#66bb6a' : '#4caf50'}`,
                        borderRadius: '8px',
                        backgroundColor: isSelected ? 'rgba(76, 175, 80, 0.25)' : 'rgba(76, 175, 80, 0.1)',
                        color: 'var(--text)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'rgba(76, 175, 80, 0.2)'
                          e.currentTarget.style.borderColor = '#66bb6a'
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'rgba(76, 175, 80, 0.1)'
                          e.currentTarget.style.borderColor = '#4caf50'
                        }
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '14px', color: '#4caf50' }}>
                          {recruit.rank && (
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#ffd700' }}>
                              #{recruit.rank}
                            </span>
                          )}
                          {recruit.isGenerational && (
                            <span style={{ fontSize: '12px', color: '#ffd700', fontWeight: 800, marginRight: 4 }} title="Generational Talent">
                              ⭐
                            </span>
                          )}
                          <span>✓ {recruit.firstName} {recruit.lastName}</span>
                          {getGemBustDisplay(recruit) && (() => {
                            const badge = getGemBustDisplay(recruit)!
                            const isGem = badge.text.includes('GEM')
                            return (
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '2px 5px',
                                borderRadius: '3px',
                                backgroundColor: isGem ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 82, 82, 0.3)',
                                color: badge.color,
                                marginLeft: 6
                              }}>
                                {isGem ? '💎' : '⚠️'}
                              </span>
                            )
                          })()}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                          {getStarDisplay(recruit.starRating)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                        <span style={{ color: 'var(--muted)' }}>
                          {recruit.position} • {getOverallDisplay(recruit)}
                        </span>
                        <span style={{ color: '#4caf50', fontWeight: 700, fontSize: '13px' }}>
                          COMMITTED
                        </span>
                      </div>
                    </button>
                  )
                })}
                <div style={{ height: 20 }} /> {/* Extra spacing after committed */}
              </>
            )}

            {/* Board Recruits Section */}
            {filteredBoardRecruits.length > 0 && (
              <>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: 700, 
                  color: 'var(--text)', 
                  marginBottom: 12,
                  marginTop: 8,
                  paddingBottom: 8,
                  paddingTop: 8,
                  borderBottom: '2px solid var(--primary)',
                  backgroundColor: 'rgba(90, 130, 255, 0.1)',
                  borderRadius: '4px',
                  paddingLeft: 8,
                }}>
                  ⭐ ON BOARD ({filteredBoardRecruits.length})
                </div>
                {filteredBoardRecruits.map((recruit) => {
                  const isSelected = recruit.recruitId === selectedRecruitId
                  // Use stored progress (only updates weekly during sim)
                  const progress = displayBoard?.progressByRecruitId?.[recruit.recruitId] ?? board?.progressByRecruitId?.[recruit.recruitId] ?? 0
                  // Check if committed to another team - show red left border
                  const isCommittedElsewhere = recruit.status === 'COMMITTED' && recruit.committedToTeamId && recruit.committedToTeamId !== userTeamId
                  // Get scheme fit
                  const fitBadge = getSchemeFitBadge(recruit)
                
                return (
                  <button
                    key={recruit.recruitId}
                    onClick={() => setSelectedRecruitId(recruit.recruitId)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '12px 14px',
                      marginBottom: 6,
                      border: isCommittedElsewhere 
                        ? `1px solid var(--border)` 
                        : `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                      borderLeft: isCommittedElsewhere ? '4px solid #ff5252' : undefined,
                      borderRadius: '8px',
                      backgroundColor: isSelected ? 'rgba(90, 130, 255, 0.15)' : (isCommittedElsewhere ? 'rgba(255, 82, 82, 0.08)' : 'transparent'),
                      color: 'var(--text)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = isCommittedElsewhere ? 'rgba(255, 82, 82, 0.12)' : 'rgba(255,255,255,0.08)'
                        e.currentTarget.style.borderColor = 'var(--accent)'
                        // Preserve red left border on hover
                        if (isCommittedElsewhere) {
                          e.currentTarget.style.borderLeft = '4px solid #ff5252'
                        }
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = isCommittedElsewhere ? 'rgba(255, 82, 82, 0.08)' : 'transparent'
                        e.currentTarget.style.borderColor = 'var(--border)'
                        // Preserve red left border on hover out
                        if (isCommittedElsewhere) {
                          e.currentTarget.style.borderLeft = '4px solid #ff5252'
                        }
                      }
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: '14px' }}>
                        {recruit.rank && (
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#ffd700' }}>
                            #{recruit.rank}
                          </span>
                        )}
                        {recruit.isGenerational && (
                          <span style={{ fontSize: '12px', color: '#ffd700', fontWeight: 800 }} title="Generational Talent">
                            ⭐
                          </span>
                        )}
                        <span>{recruit.firstName} {recruit.lastName}</span>
                        {isCommittedElsewhere && (
                          <span style={{ fontSize: '10px', color: '#ff5252', fontWeight: 700, marginLeft: 4 }}>
                            ✗
                          </span>
                        )}
                        {getGemBustDisplay(recruit) && (() => {
                          const badge = getGemBustDisplay(recruit)!
                          const isGem = badge.text.includes('GEM')
                          return (
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 5px',
                              borderRadius: '3px',
                              backgroundColor: isGem ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 82, 82, 0.3)',
                              color: badge.color,
                              marginLeft: 6
                            }}
                            title={badge.text}
                            >
                              {isGem ? '💎' : '⚠️'}
                            </span>
                          )
                        })()}
                        {fitBadge && (
                          <span 
                            style={{ 
                              fontSize: '10px', 
                              fontWeight: 700, 
                              color: fitBadge.color,
                              backgroundColor: fitBadge.bg,
                              padding: '2px 6px',
                              borderRadius: '3px',
                              marginLeft: 6
                            }}
                            title={`Scheme Fit: ${fitBadge.text}`}
                          >
                            {fitBadge.text}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                        {getStarDisplay(recruit.starRating)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                      <span style={{ color: 'var(--muted)' }}>
                        {recruit.position} • {getOverallDisplay(recruit)}
                      </span>
                      {isCommittedElsewhere ? (
                        <span style={{ color: '#ff5252', fontWeight: 600, fontSize: '11px' }}>
                          Committed Elsewhere
                        </span>
                      ) : (
                        <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                          {progress}%
                        </span>
                      )}
                    </div>
                  </button>
                )
                })}
                <div style={{ height: 16 }} /> {/* Spacing */}
              </>
            )}

            {/* Non-Board Recruits Section */}
            {filteredNonBoardRecruits.length > 0 && (
              <>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: 700, 
                  color: 'var(--text)', 
                  marginBottom: 12,
                  marginTop: filteredBoardRecruits.length > 0 ? 20 : 8,
                  paddingBottom: 8,
                  paddingTop: 8,
                  borderBottom: '2px solid var(--border)',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderRadius: '4px',
                  paddingLeft: 8,
                }}>
                  📋 AVAILABLE ({filteredNonBoardRecruits.length})
                </div>
                {filteredNonBoardRecruits.map((recruit) => {
                  const isSelected = recruit.recruitId === selectedRecruitId
                  // Check if committed to another team - show red left border
                  const isCommittedElsewhere = recruit.status === 'COMMITTED' && recruit.committedToTeamId && recruit.committedToTeamId !== userTeamId
                  
                  return (
                    <button
                      key={recruit.recruitId}
                      onClick={() => setSelectedRecruitId(recruit.recruitId)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '12px 14px',
                        marginBottom: 6,
                        border: isCommittedElsewhere 
                          ? `1px solid var(--border)` 
                          : `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                        borderLeft: isCommittedElsewhere ? '4px solid #ff5252' : undefined,
                        borderRadius: '8px',
                        backgroundColor: isSelected ? 'rgba(90, 130, 255, 0.15)' : (isCommittedElsewhere ? 'rgba(255, 82, 82, 0.08)' : 'transparent'),
                        color: 'var(--text)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = isCommittedElsewhere ? 'rgba(255, 82, 82, 0.12)' : 'rgba(255,255,255,0.08)'
                          e.currentTarget.style.borderColor = 'var(--accent)'
                          // Preserve red left border on hover
                          if (isCommittedElsewhere) {
                            e.currentTarget.style.borderLeft = '4px solid #ff5252'
                          }
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = isCommittedElsewhere ? 'rgba(255, 82, 82, 0.08)' : 'transparent'
                          e.currentTarget.style.borderColor = 'var(--border)'
                          // Preserve red left border on hover out
                          if (isCommittedElsewhere) {
                            e.currentTarget.style.borderLeft = '4px solid #ff5252'
                          }
                        }
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: '14px' }}>
                          {recruit.rank && (
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#ffd700' }}>
                              #{recruit.rank}
                            </span>
                          )}
                          {recruit.isGenerational && (
                            <span style={{ fontSize: '12px', color: '#ffd700', fontWeight: 800, marginRight: 4 }} title="Generational Talent">
                              ⭐
                            </span>
                          )}
                          <span>{recruit.firstName} {recruit.lastName}</span>
                          {isCommittedElsewhere && (
                            <span style={{ fontSize: '10px', color: '#ff5252', fontWeight: 700, marginLeft: 4 }}>
                              ✗
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                          {getStarDisplay(recruit.starRating)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                        <span style={{ color: 'var(--muted)' }}>
                          {recruit.position} • {getOverallDisplay(recruit)}
                        </span>
                        {isCommittedElsewhere && (
                          <span style={{ color: '#ff5252', fontWeight: 600, fontSize: '11px' }}>
                            Committed Elsewhere
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </>
            )}

            {filteredCommittedRecruits.length === 0 && filteredBoardRecruits.length === 0 && filteredNonBoardRecruits.length === 0 && (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--muted)' }}>
                No recruits found
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Prospect Detail */}
        {selectedRecruit ? (
          <div style={{ 
            flex: 1, 
            border: '1px solid var(--border)', 
            borderRadius: '12px',
            backgroundColor: 'rgba(255,255,255,0.03)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minWidth: 0,
          }}>
            <div style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}>
            {/* Prospect Overview */}
            <div style={{ marginBottom: 24, flexShrink: 0 }} className="revealAnimation">
              <h3 style={{ margin: 0, marginBottom: 20, fontSize: '18px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>PROSPECT OVERVIEW</h3>
              
              <div style={{ display: 'flex', gap: 24, marginBottom: 0 }}>
                {/* Player "Avatar" placeholder */}
                <div style={{
                  width: '140px',
                  height: '140px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(90, 130, 255, 0.2)',
                  border: '2px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '56px',
                  fontWeight: 700,
                  color: 'var(--text)',
                  flexShrink: 0,
                }}>
                  {selectedRecruit.firstName[0]}{selectedRecruit.lastName[0]}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <div style={{ fontSize: '28px', fontWeight: 700 }}>
                      {selectedRecruit.firstName.toUpperCase()} {selectedRecruit.lastName.toUpperCase()}
                    </div>
                    {selectedRecruit.rank && (
                      <div style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        color: '#ffd700',
                        backgroundColor: 'rgba(255, 215, 0, 0.2)',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 215, 0, 0.4)',
                      }}>
                        #{selectedRecruit.rank}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '15px', color: 'var(--muted)', marginBottom: 6 }}>
                    {formatHeight(selectedRecruit.heightIn)} • {selectedRecruit.weightLb} lbs
                  </div>
                  <div style={{ fontSize: '15px', color: 'var(--muted)', marginBottom: 12 }}>
                    {selectedRecruit.hometown}
                  </div>
                  {/* Primary Stats - Large and Prominent */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div className="statLabel">Overall Rating</div>
                      <div className="primaryStat">{getOverallDisplay(selectedRecruit).replace(' OVR', '')}</div>
                    </div>
                    <div>
                      <div className="statLabel">Star Rating</div>
                      <div className="secondaryStat" style={{ fontSize: '20px', color: '#ffd700' }}>
                        {getStarDisplay(selectedRecruit.starRating)}
                      </div>
                    </div>
                    <div>
                      <div className="statLabel">Position</div>
                      <div className="secondaryStat">{selectedRecruit.position}</div>
                    </div>
                  </div>
                  
                  {/* Generational Talent Badge - Most Prominent */}
                  {selectedRecruit.isGenerational && (
                    <div style={{ 
                      marginBottom: 12,
                      display: 'inline-block',
                      padding: '8px 16px',
                      borderRadius: '10px',
                      fontSize: '15px',
                      fontWeight: 800,
                      background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(255, 165, 0, 0.2))',
                      border: '2px solid #ffd700',
                      color: '#ffd700',
                      textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
                      boxShadow: '0 4px 12px rgba(255, 215, 0, 0.4)',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      animation: 'pulse 2s ease-in-out infinite'
                    }}>
                      ⭐ GENERATIONAL TALENT ⭐
                    </div>
                  )}
                  
                  {/* Gem/Bust Badge - Prominent */}
                  {getGemBustDisplay(selectedRecruit) && (() => {
                    const badge = getGemBustDisplay(selectedRecruit)!
                    const isGem = badge.text.includes('GEM')
                    return (
                      <div style={{ 
                        marginBottom: 12,
                        padding: '10px 16px',
                        backgroundColor: isGem ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 82, 82, 0.2)',
                        border: `2px solid ${isGem ? '#4caf50' : '#ff5252'}`,
                        borderRadius: '8px',
                        fontSize: '15px',
                        fontWeight: 700,
                        color: badge.color,
                        textAlign: 'center',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {badge.text}
                      </div>
                    )
                  })()}
                  {positionOpp && (
                    <div style={{ fontSize: '13px', marginTop: 12 }}>
                      Opportunity: <span style={{ color: getOpportunityColor(positionOpp.opportunityScore), fontWeight: 600 }}>
                        {getOpportunityRating(positionOpp.opportunityScore)}
                      </span> ({positionOpp.availableMinutes} min available)
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Committed Status Banner - Committed to YOUR team */}
            {selectedRecruit.status === 'COMMITTED' && selectedRecruit.committedToTeamId === userTeamId && (
              <div style={{
                marginBottom: 24,
                padding: 16,
                borderRadius: '10px',
                border: '2px solid #4caf50',
                backgroundColor: 'rgba(76, 175, 80, 0.15)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#4caf50', marginBottom: 6 }}>
                  ✓ COMMITTED
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text)' }}>
                  {selectedRecruit.firstName} {selectedRecruit.lastName} has committed to {teamName(userTeamId)}
                </div>
              </div>
            )}

            {/* Committed to Another Team Banner */}
            {selectedRecruit.status === 'COMMITTED' && selectedRecruit.committedToTeamId && selectedRecruit.committedToTeamId !== userTeamId && (
              <div style={{
                marginBottom: 24,
                padding: 16,
                borderRadius: '10px',
                border: '2px solid #ff5252',
                backgroundColor: 'rgba(255, 82, 82, 0.15)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#ff5252', marginBottom: 6 }}>
                  ✗ COMMITTED ELSEWHERE
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text)' }}>
                  {selectedRecruit.firstName} {selectedRecruit.lastName} has committed to {teamName(selectedRecruit.committedToTeamId)}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: 8 }}>
                  You can no longer recruit this player. They will be removed from your board.
                </div>
              </div>
            )}

            {/* Player Stats Panel - Grouped by Category */}
            <div style={{ marginBottom: 24, flexShrink: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: 16, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                PLAYER STATS
                {(() => {
                  const scoutLevel = selectedRecruit.scoutedByTeamId[userTeamId] ?? 'NONE'
                  if (scoutLevel === 'NONE') {
                    return <span style={{ fontSize: '11px', fontWeight: 400, marginLeft: 8, color: '#ff9800', textTransform: 'none' }}>(Not Scouted)</span>
                  } else if (scoutLevel === 'PARTIAL') {
                    return <span style={{ fontSize: '11px', fontWeight: 400, marginLeft: 8, color: '#8bc34a', textTransform: 'none' }}>(Partially Scouted)</span>
                  } else {
                    return <span style={{ fontSize: '11px', fontWeight: 400, marginLeft: 8, color: '#4caf50', textTransform: 'none' }}>(Fully Scouted)</span>
                  }
                })()}
              </div>
              
              {/* Offense Stats */}
              <div className="statGroup">
                <div className="statGroupTitle">Offense</div>
                <div className="ratingsGrid">
                  {statGroups.offense.map((key) => (
                    <div key={key} className="ratingRow statReveal">
                      <span className="ratingLabel">{getRatingDisplayName(key)}</span>
                      <span className={`ratingValue ${getRatingColorClass(selectedRecruit, key)}`}>
                        {getRatingDisplay(selectedRecruit, key)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Defense Stats */}
              <div className="statGroup" style={{ marginTop: 16 }}>
                <div className="statGroupTitle">Defense</div>
                <div className="ratingsGrid">
                  {statGroups.defense.map((key) => (
                    <div key={key} className="ratingRow statReveal">
                      <span className="ratingLabel">{getRatingDisplayName(key)}</span>
                      <span className={`ratingValue ${getRatingColorClass(selectedRecruit, key)}`}>
                        {getRatingDisplay(selectedRecruit, key)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Physical Stats */}
              <div className="statGroup" style={{ marginTop: 16 }}>
                <div className="statGroupTitle">Physical</div>
                <div className="ratingsGrid">
                  {statGroups.physical.map((key) => (
                    <div key={key} className="ratingRow statReveal">
                      <span className="ratingLabel">{getRatingDisplayName(key)}</span>
                      <span className={`ratingValue ${getRatingColorClass(selectedRecruit, key)}`}>
                        {getRatingDisplay(selectedRecruit, key)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recruiting Standings */}
            {selectedRecruit.status !== 'COMMITTED' || selectedRecruit.committedToTeamId !== userTeamId ? (
              <div style={{ marginBottom: 24, flexShrink: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: 14, color: 'var(--muted)' }}>
                  RECRUITING STANDINGS
                </div>
                
                <div style={{ marginBottom: 0 }}>
                  {/* User Team */}
                  <div style={{
                    padding: '14px 18px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'rgba(90, 130, 255, 0.1)',
                    marginBottom: 10,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ fontWeight: 600, fontSize: '15px' }}>
                        {teamName(userTeamId)}
                      </div>
                      {userProgress > 0 && competition.length > 0 && userProgress >= (competition[0]?.progress ?? 0) && (
                        <span style={{ 
                          padding: '4px 10px', 
                          borderRadius: '6px', 
                          backgroundColor: '#4caf50',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}>
                          LEAD
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
                        Interest: {userProgress}%
                      </div>
                      {hoursAllocated > 0 && (
                        <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                          {hoursAllocated} hours allocated
                        </div>
                      )}
                    </div>
                  </div>

                {/* Competition */}
                {competition.map((comp, idx) => {
                  const progressDiff = comp.progress - userProgress
                  
                  return (
                    <div 
                      key={comp.teamId}
                      style={{
                        padding: '12px 18px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        marginBottom: 8,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '14px', fontWeight: 500 }}>
                          {idx + 1}. {teamName(comp.teamId)}
                        </div>
                        <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
                          Interest: {comp.progress}%
                          {progressDiff > 0 && (
                            <span style={{ color: '#ff9800', marginLeft: 10, fontWeight: 600 }}>+{progressDiff}%</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {competition.length === 0 && (
                <div style={{ padding: 12, textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>
                  No other teams recruiting this prospect
                </div>
              )}
              </div>
            ) : null}

            {/* Hour Allocation - Only show if not committed */}
            {selectedRecruit.status !== 'COMMITTED' && board?.recruitIds.includes(selectedRecruit.recruitId) && (
              <div style={{ marginBottom: 24, padding: 20, border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.03)', flexShrink: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: 12, color: 'var(--muted)' }}>
                    ALLOCATE HOURS
                  </div>

                  {!scholarshipOffered && (
                    <div style={{
                      padding: 12,
                      marginBottom: 16,
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 152, 0, 0.15)',
                      border: '1px solid rgba(255, 152, 0, 0.3)',
                      color: '#ff9800',
                      fontSize: '13px',
                      textAlign: 'center',
                    }}>
                      ⚠️ You must offer a scholarship before allocating hours
                    </div>
                  )}
                  
                  {/* Progress Bar - Calculated immediately from hours and scholarship */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '13px', color: 'var(--muted)' }}>
                      <span>Interest: <strong style={{ color: 'var(--text)' }}>{userProgress}%</strong></span>
                      <span>{hoursAllocated} hours allocated</span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '28px',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      border: '1px solid var(--border)',
                    }}>
                      <div style={{
                        width: `${Math.max(0, Math.min(100, userProgress))}%`,
                        height: '100%',
                        backgroundColor: userProgress >= 80 ? '#4caf50' : userProgress >= 50 ? '#8bc34a' : '#5b9fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: userProgress > 20 ? 'white' : 'var(--text)',
                        minWidth: userProgress > 0 ? '28px' : '0',
                        transition: 'width 0.3s ease',
                      }}>
                        {userProgress > 10 && `${userProgress}%`}
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: 4, fontStyle: 'italic' }}>
                      Interest updates weekly after simming
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '14px', fontWeight: 500 }}>
                      Current: <strong>{hoursAllocated} hours</strong>
                    </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
                    {[5, 10, 20, 30, 50].map(amount => {
                      // Calculate new total by adding to current allocation
                      const currentAllocated = selectedRecruit ? (board?.hoursAllocatedByRecruitId?.[selectedRecruit.recruitId] ?? 0) : 0
                      const newTotal = currentAllocated + amount
                      // Check if we can afford: newTotal + (other hours allocated) <= budget
                      // Other hours = totalAllocated - currentAllocated
                      // So: newTotal <= budget - (totalAllocated - currentAllocated) = remainingHours + currentAllocated
                      const otherHoursAllocated = totalAllocated - currentAllocated
                      const canAfford = newTotal <= (hourBudget - otherHoursAllocated)
                      const canAllocate = canAfford && selectedRecruit && scholarshipOffered
                      return (
                        <button
                          key={amount}
                          className="btn secondary"
                          disabled={!canAllocate}
                          onClick={() => {
                            if (!activeSave || !selectedRecruit) return
                            
                            // Check if recruit is committed to another team
                            if (selectedRecruit.status === 'COMMITTED' && selectedRecruit.committedToTeamId !== userTeamId) {
                              alert(`${selectedRecruit.firstName} ${selectedRecruit.lastName} has already committed to another school. They will be removed from your board.`)
                              return
                            }
                            
                            // Get fresh current value to avoid stale closure
                            const currentHours = board?.hoursAllocatedByRecruitId?.[selectedRecruit.recruitId] ?? 0
                            const newTotalHours = currentHours + amount
                            // Ensure hours end in 0 or 5
                            const roundedTotal = Math.round(newTotalHours / 5) * 5
                            const updated = allocateHoursToRecruit(activeSave, userTeamId, selectedRecruit.recruitId, roundedTotal)
                            if (updated) {
                              setActiveSave(updated)
                            } else {
                              // Allocation failed - check why
                              if (!board?.recruitIds.includes(selectedRecruit.recruitId)) {
                                alert('This recruit is not on your board.')
                              } else if (!scholarshipOffered) {
                                alert('You must offer a scholarship before allocating hours.')
                              } else if (selectedRecruit.status === 'COMMITTED' && selectedRecruit.committedToTeamId !== userTeamId) {
                                alert(`${selectedRecruit.firstName} ${selectedRecruit.lastName} has already committed to another school.`)
                              } else {
                                alert('Unable to allocate hours. Please try again.')
                              }
                            }
                          }}
                          style={{ fontSize: '13px', padding: '8px 14px', opacity: canAllocate ? 1 : 0.5 }}
                        >
                          +{amount}
                        </button>
                      )
                    })}
                    {(() => {
                      // Calculate maximum allowed hours for this recruit
                      const currentHoursForMax = selectedRecruit ? (board?.hoursAllocatedByRecruitId?.[selectedRecruit.recruitId] ?? 0) : 0
                      const otherHoursAllocated = totalAllocated - currentHoursForMax
                      const maxAllowed = hourBudget - otherHoursAllocated
                      const roundedMax = Math.floor(maxAllowed / 5) * 5
                      const canAllocateMore = roundedMax > currentHoursForMax && selectedRecruit && scholarshipOffered
                      
                      return (
                        <button
                          className="btn secondary"
                          onClick={() => {
                            if (!activeSave || !selectedRecruit) return
                            
                            // Check if recruit is committed to another team
                            if (selectedRecruit.status === 'COMMITTED' && selectedRecruit.committedToTeamId !== userTeamId) {
                              alert(`${selectedRecruit.firstName} ${selectedRecruit.lastName} has already committed to another school. They will be removed from your board.`)
                              return
                            }
                            
                            // Calculate maximum allowed hours for this recruit
                            const currentHours = board?.hoursAllocatedByRecruitId?.[selectedRecruit.recruitId] ?? 0
                            const otherHours = totalAllocated - currentHours
                            const max = hourBudget - otherHours
                            // Round down to nearest 5
                            const roundedMax = Math.floor(max / 5) * 5
                            const updated = allocateHoursToRecruit(activeSave, userTeamId, selectedRecruit.recruitId, roundedMax)
                            if (updated) {
                              setActiveSave(updated)
                            } else {
                              // Allocation failed - check why
                              if (!board?.recruitIds.includes(selectedRecruit.recruitId)) {
                                alert('This recruit is not on your board.')
                              } else if (!scholarshipOffered) {
                                alert('You must offer a scholarship before allocating hours.')
                              } else if (selectedRecruit.status === 'COMMITTED' && selectedRecruit.committedToTeamId !== userTeamId) {
                                alert(`${selectedRecruit.firstName} ${selectedRecruit.lastName} has already committed to another school.`)
                              } else {
                                alert('Unable to allocate hours. Please try again.')
                              }
                            }
                          }}
                          disabled={!canAllocateMore}
                          style={{ fontSize: '12px', padding: '6px 12px', opacity: canAllocateMore ? 1 : 0.5 }}
                        >
                          All ({roundedMax}h max)
                        </button>
                      )
                    })()}
                  </div>
                  {hoursAllocated > 0 && (
                    <button
                      className="btn secondary"
                      onClick={() => {
                        if (!activeSave || !selectedRecruit) return
                        
                        // Check if recruit is committed to another team
                        if (selectedRecruit.status === 'COMMITTED' && selectedRecruit.committedToTeamId !== userTeamId) {
                          alert(`${selectedRecruit.firstName} ${selectedRecruit.lastName} has already committed to another school. They will be removed from your board.`)
                          return
                        }
                        
                        const updated = allocateHoursToRecruit(activeSave, userTeamId, selectedRecruit.recruitId, 0)
                        if (updated) {
                          setActiveSave(updated)
                        } else {
                          // Allocation failed - check why
                          if (!board?.recruitIds.includes(selectedRecruit.recruitId)) {
                            alert('This recruit is not on your board.')
                          } else if (selectedRecruit.status === 'COMMITTED' && selectedRecruit.committedToTeamId !== userTeamId) {
                            alert(`${selectedRecruit.firstName} ${selectedRecruit.lastName} has already committed to another school.`)
                          }
                        }
                      }}
                      style={{ fontSize: '13px', padding: '8px 14px' }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}

            </div>

            {/* Actions - Fixed at bottom (hide for committed recruits) */}
            {selectedRecruit.status !== 'COMMITTED' || selectedRecruit.committedToTeamId !== userTeamId ? (
              <div style={{ padding: 20, borderTop: '1px solid var(--border)', backgroundColor: 'rgba(255,255,255,0.02)', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {board && !board.recruitIds.includes(selectedRecruit.recruitId) && board.recruitIds.length < 20 ? (
                    <button 
                      className="btn"
                      onClick={() => {
                        if (!activeSave) return
                        const updated = addRecruitToBoard(activeSave, userTeamId, selectedRecruit.recruitId)
                        if (updated) {
                          setActiveSave(updated)
                        } else if (board?.recruitIds.length >= 20) {
                          alert('Board is full (20/20). Remove a recruit to add another.')
                        }
                      }}
                    >
                      Add to Board
                    </button>
                  ) : board?.recruitIds.includes(selectedRecruit.recruitId) ? (
                    <button 
                      className="btn secondary"
                      onClick={() => {
                        if (!activeSave) return
                        const updated = removeRecruitFromBoard(activeSave, userTeamId, selectedRecruit.recruitId)
                        setActiveSave(updated)
                      }}
                    >
                      Remove from Board
                    </button>
                  ) : (
                    <div style={{ color: 'var(--muted)', fontSize: '14px' }}>
                      Board is full (20/20)
                    </div>
                  )}
                  
                  {(() => {
                    const currentScoutLevel = selectedRecruit.scoutedByTeamId[userTeamId] ?? 'NONE'
                    const canScout = currentScoutLevel !== 'FULL'
                    const hoursNeeded = currentScoutLevel === 'NONE' ? 10 : currentScoutLevel === 'PARTIAL' ? 20 : 0
                    const hasEnoughHours = remainingHours >= hoursNeeded
                    const isOnBoard = board?.recruitIds.includes(selectedRecruit.recruitId) ?? false
                    const canScoutNow = canScout && hasEnoughHours && isOnBoard
                    const scoutLabel = currentScoutLevel === 'NONE' ? `Scout (Partial) - ${hoursNeeded}h` : currentScoutLevel === 'PARTIAL' ? `Scout (Full) - ${hoursNeeded}h` : 'Fully Scouted'
                    
                    return (
                      <button 
                        className="btn secondary"
                        disabled={!canScoutNow}
                        onClick={() => {
                          if (!activeSave) return
                          const updated = scoutRecruit(activeSave, userTeamId, selectedRecruit.recruitId)
                          if (updated) {
                            setActiveSave(updated)
                            // Trigger re-render to show animation
                            setSelectedRecruitId(selectedRecruit.recruitId)
                          } else {
                            if (!isOnBoard) {
                              alert('You must add this recruit to your board before scouting.')
                            } else if (!hasEnoughHours) {
                              alert(`Insufficient hours. You need ${hoursNeeded} hours to scout this recruit.`)
                            } else {
                              alert('Unable to scout this recruit. Please try again.')
                            }
                          }
                        }}
                        style={{ opacity: canScoutNow ? 1 : 0.5 }}
                      >
                        {scoutLabel}
                      </button>
                    )
                  })()}
                  
                  {!scholarshipOffered && board?.recruitIds.includes(selectedRecruit.recruitId) && (
                  <button 
                    className="btn"
                    disabled={scholarships.estimatedAvailable === 0}
                    onClick={() => {
                      if (!activeSave) return
                      const updated = offerScholarship(activeSave, userTeamId, selectedRecruit.recruitId)
                      if (updated) {
                        setActiveSave(updated)
                      } else if (scholarships.estimatedAvailable === 0) {
                        const leavingInfo = scholarships.leaving.total > 0 
                          ? ` You have ${scholarships.leaving.total} player${scholarships.leaving.total > 1 ? 's' : ''} leaving (${scholarships.leaving.graduating} graduating${scholarships.leaving.likelyDraft > 0 ? `, ~${scholarships.leaving.likelyDraft} likely draft` : ''}), but cannot offer more until they actually depart.`
                          : ''
                        alert(`No scholarships available. You have ${scholarships.total} total scholarships. ${scholarships.used} are used (${scholarships.committed} committed recruits + current roster), and ${offeredCount} are offered.${leavingInfo}`)
                      }
                    }}
                    style={{ opacity: scholarships.estimatedAvailable === 0 ? 0.5 : 1 }}
                  >
                    Offer Scholarship {scholarships.estimatedAvailable === 0 && '(No scholarships available)'}
                  </button>
                )}
                
                {scholarshipOffered && (
                  <div style={{ 
                    padding: '8px 12px', 
                    borderRadius: '8px', 
                    backgroundColor: 'rgba(76, 175, 80, 0.2)',
                    color: '#4caf50',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}>
                    ✓ Scholarship Offered
                  </div>
                )}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div style={{ 
            flex: 1, 
            border: '1px solid var(--border)', 
            borderRadius: '12px',
            backgroundColor: 'rgba(255,255,255,0.03)',
            padding: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--muted)',
          }}>
            Select a recruit to view details
          </div>
        )}
      </div>
    </section>
  )
}
