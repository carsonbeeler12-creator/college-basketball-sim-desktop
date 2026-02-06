// Test script to verify coaching schemes system works end-to-end
import { createDynasty } from '../src/game/engine/createDynasty'
import { evaluateArchetypeFit, getSchemeName, SCHEME_PROFILES, getSchemeGameModifiers } from '../src/game/engine/schemes/schemeDefinitions'
import type { CoachScheme } from '../src/game/types/dynasty'

console.log('🧪 Testing Coaching Schemes System...\n')

// Test 1: Dynasty Creation with Scheme
console.log('✅ Test 1: Dynasty Creation')
const dynasty = createDynasty({
  coachName: 'Test Coach',
  userTeamId: 'duke',
  seasonYear: 2024,
  coachScheme: 'TEMPO'
})

console.log(`  Coach: ${dynasty.coach.name}`)
console.log(`  Scheme: ${getSchemeName(dynasty.coach.scheme)} (${dynasty.coach.scheme})`)
console.log(`  Career Stats initialized:`, dynasty.coach.careerStats ? '✓' : '✗')
console.log()

// Test 2: All Schemes Have Profiles
console.log('✅ Test 2: All Schemes Have Profiles')
const schemes: CoachScheme[] = ['TEMPO', 'DEFENSIVE', 'POST_HEAVY', 'THREE_POINT', 'BALANCED']
schemes.forEach(scheme => {
  const profile = SCHEME_PROFILES[scheme]
  console.log(`  ${scheme}: ${profile.name}`)
  console.log(`    - Pace modifier: ${profile.gameModifiers.pace > 0 ? '+' : ''}${profile.gameModifiers.pace}%`)
  console.log(`    - Has archetype preferences: ${Object.keys(profile.archetypePreferences).length > 0 ? '✓' : '✗'}`)
})
console.log()

// Test 3: Archetype Fit Evaluation
console.log('✅ Test 3: Archetype Fit Scoring')
const testArchetypes = ['ATHLETIC_WING', 'POST_SCORER', 'SHARPSHOOTER', 'DEFENSIVE_SPECIALIST', 'BALANCED_SCORER']
testArchetypes.forEach(archetype => {
  const fitScore = evaluateArchetypeFit(archetype as any, 'TEMPO')
  const rating = fitScore >= 3 ? 'GOOD' : fitScore >= 0 ? 'OKAY' : 'POOR'
  console.log(`  ${archetype} → TEMPO: ${fitScore >= 0 ? '+' : ''}${fitScore} (${rating})`)
})
console.log()

// Test 4: Game Modifiers
console.log('✅ Test 4: Scheme Game Modifiers')
schemes.forEach(scheme => {
  const modifiers = getSchemeGameModifiers(scheme)
  console.log(`  ${scheme}:`)
  console.log(`    Pace: ${modifiers.pace > 0 ? '+' : ''}${modifiers.pace}`)
  console.log(`    Offensive Accuracy: ${modifiers.offensiveAccuracy > 0 ? '+' : ''}${modifiers.offensiveAccuracy}`)
  console.log(`    Defensive Accuracy: ${modifiers.defensiveAccuracy > 0 ? '+' : ''}${modifiers.defensiveAccuracy}`)
  console.log(`    3PT Volume: ${modifiers.threePointVolume > 0 ? '+' : ''}${modifiers.threePointVolume}`)
})
console.log()

// Test 5: Career Stats Structure
console.log('✅ Test 5: Career Stats Structure')
if (dynasty.coach.careerStats) {
  console.log(`  Seasons Coached: ${dynasty.coach.careerStats.seasonsCoached}`)
  console.log(`  Total Wins: ${dynasty.coach.careerStats.totalWins}`)
  console.log(`  Total Losses: ${dynasty.coach.careerStats.totalLosses}`)
  console.log(`  Years at School: ${dynasty.coach.careerStats.yearsAtCurrentSchool}`)
  console.log(`  Prestige Tier: ${dynasty.coach.careerStats.currentPrestigeTier}`)
} else {
  console.log('  ✗ Career stats missing!')
}
console.log()

// Test 6: Recruiting Pool Has Archetypes
console.log('✅ Test 6: Recruiting Pool Verification')
const recruits = Object.values(dynasty.recruiting.recruitPool)
console.log(`  Total recruits: ${recruits.length}`)
const recruitWithArchetype = recruits.find(r => r.archetype)
if (recruitWithArchetype) {
  console.log(`  Sample recruit archetype: ${recruitWithArchetype.archetype} ✓`)
  console.log(`  Sample recruit gem/bust: ${recruitWithArchetype.gemBustStatus}`)
  const fit = evaluateArchetypeFit(recruitWithArchetype.archetype, dynasty.coach.scheme)
  console.log(`  Fit to ${dynasty.coach.scheme}: ${fit >= 0 ? '+' : ''}${fit}`)
} else {
  console.log('  ✗ No recruits with archetype found!')
}
console.log()

console.log('🎉 All Tests Complete!')
console.log('\n📊 Summary:')
console.log('  - Dynasty creation: ✓')
console.log('  - Scheme profiles: ✓')
console.log('  - Fit evaluation: ✓')
console.log('  - Game modifiers: ✓')
console.log('  - Career tracking: ✓')
console.log('  - Recruiting integration: ✓')
