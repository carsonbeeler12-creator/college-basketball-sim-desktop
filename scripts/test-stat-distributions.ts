// Script to analyze stat distributions by position and role
import type { Dynasty, Position, PlayerBoxScoreLine } from "../src/game/types/dynasty";
import { createDynasty } from "../src/game/engine/createDynasty";
import { simulateGame } from "../src/game/engine/sim/simGame_v0";
import { TEAMS } from "../src/game/defaultData";

interface StatsByPosition {
  [position: string]: {
    points: number[];
    rebounds: number[];
    assists: number[];
    steals: number[];
    blocks: number[];
    minutes: number[];
  };
}

function analyzeStats(stats: number[]): {
  avg: number;
  max: number;
  p75: number;
  p90: number;
  p95: number;
  stdDev: number;
} {
  if (stats.length === 0) return { avg: 0, max: 0, p75: 0, p90: 0, p95: 0, stdDev: 0 };
  
  const sorted = [...stats].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const avg = sum / sorted.length;
  
  const variance = sorted.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / sorted.length;
  const stdDev = Math.sqrt(variance);
  
  const p75 = sorted[Math.floor(sorted.length * 0.75)];
  const p90 = sorted[Math.floor(sorted.length * 0.90)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const max = sorted[sorted.length - 1];
  
  return { avg, max, p75, p90, p95, stdDev };
}

function main() {
  console.log("=== STAT DISTRIBUTION ANALYSIS ===\n");
  console.log("Simulating 500 games to analyze stat distributions by position...\n");

  let dynasty = createDynasty({ coachName: "Test Coach", userTeamId: TEAMS[0].id });
  
  // Grab two competitive teams
  const teams = Object.values(dynasty.league.teamsById);
  const teamA = teams[0];
  const teamB = teams[1];
  
  console.log(`  Team A: ${teamA.name} (ID: ${teamA.teamId}) - Roster size: ${teamA.roster?.playerIds?.length || 0}`);
  console.log(`  Team B: ${teamB.name} (ID: ${teamB.teamId}) - Roster size: ${teamB.roster?.playerIds?.length || 0}`);
  
  if (!teamA.roster?.playerIds?.length || !teamB.roster?.playerIds?.length) {
    console.error("ERROR: Teams don't have rosters!");
    return;
  }
  
  const statsByPos: StatsByPosition = {
    PG: { points: [], rebounds: [], assists: [], steals: [], blocks: [], minutes: [] },
    SG: { points: [], rebounds: [], assists: [], steals: [], blocks: [], minutes: [] },
    SF: { points: [], rebounds: [], assists: [], steals: [], blocks: [], minutes: [] },
    PF: { points: [], rebounds: [], assists: [], steals: [], blocks: [], minutes: [] },
    C: { points: [], rebounds: [], assists: [], steals: [], blocks: [], minutes: [] },
  };

  const numGames = 500;
  
  for (let i = 0; i < numGames; i++) {
    const gameId = `test-game-${i}`;
    
    const result = simulateGame({
      dynasty,
      homeTeamId: teamA.teamId,
      awayTeamId: teamB.teamId,
      gameId,
      seasonYear: dynasty.world.seasonYear,
      day: dynasty.world.day,
    });
    
    dynasty = result.dynasty;
    
    // Extract box scores from the game
    const game = dynasty.league.gamesById[gameId];
    
    if (i === 0) {
      console.log(`  Game object keys:`, Object.keys(game || {}));
      console.log(`  Result:`, game?.result ? "exists" : "missing");
      console.log(`  BoxScore:`, game?.result?.boxScore ? "exists" : "missing");
      if (game?.result?.boxScore) {
        console.log(`  BoxScore keys:`, Object.keys(game.result.boxScore));
        console.log(`  playerLinesByTeam:`, game.result.boxScore.playerLinesByTeam ? "exists" : "missing");
        if (game.result.boxScore.playerLinesByTeam) {
          console.log(`  Home lines:`, Array.isArray(game.result.boxScore.playerLinesByTeam.home) ? `array[${game.result.boxScore.playerLinesByTeam.home.length}]` : "not array");
          console.log(`  Away lines:`, Array.isArray(game.result.boxScore.playerLinesByTeam.away) ? `array[${game.result.boxScore.playerLinesByTeam.away.length}]` : "not array");
        }
      }
    }
    
    if (!game?.result?.boxScore?.playerLinesByTeam) continue;
    
    const allLines = [...game.result.boxScore.playerLinesByTeam.home, ...game.result.boxScore.playerLinesByTeam.away];
    
    if (i === 0) {
      console.log(`  First game sample - found ${allLines.length} player lines`);
      for (const line of allLines.slice(0, 3)) {
        const p = dynasty.playersById[line.playerId];
        console.log(`    Player ${line.playerId}: ${p?.identity?.position}, ${line.minutes} min, ${line.points} pts`);
      }
    }
    
    for (const line of allLines) {
      const player = dynasty.playersById[line.playerId];
      if (!player) continue;
      
      const pos = player.identity.position as Position;
      if (!statsByPos[pos]) continue;
      
      // Track all players with 15+ minutes (rotation players)
      if (line.minutes >= 15) {
        statsByPos[pos].points.push(line.points);
        statsByPos[pos].rebounds.push(line.rebounds);
        statsByPos[pos].assists.push(line.assists);
        statsByPos[pos].steals.push(line.steals);
        statsByPos[pos].blocks.push(line.blocks);
        statsByPos[pos].minutes.push(line.minutes);
      }
    }
    
    if ((i + 1) % 100 === 0) {
      console.log(`  Simulated ${i + 1}/${numGames} games...`);
    }
  }

  console.log("\n=== RESULTS (Rotation Players 15+ minutes) ===\n");

  // NCAA Reference Data
  const ncaaRanges = {
    PG: { points: [10, 15], rebounds: [2, 4], assists: [6, 8], steals: [1.8, 2.5], blocks: [0.3, 0.8] },
    SG: { points: [14, 22], rebounds: [3, 6], assists: [1.5, 3], steals: [1.8, 2.8], blocks: [0.3, 1.0] },
    SF: { points: [12, 20], rebounds: [4, 7], assists: [1.5, 3.5], steals: [1.2, 2.2], blocks: [0.5, 1.5] },
    PF: { points: [14, 20], rebounds: [7, 10], assists: [1, 2.5], steals: [0.8, 1.8], blocks: [1.0, 2.2] },
    C: { points: [10, 15], rebounds: [8, 12], assists: [1, 2], steals: [0.5, 1.5], blocks: [2.0, 3.5] },
  };

  const positions: Position[] = ["PG", "SG", "SF", "PF", "C"];
  
  for (const pos of positions) {
    const data = statsByPos[pos];
    const ncaa = ncaaRanges[pos];
    
    console.log(`\n${pos} (n=${data.points.length} player-games)`);
    console.log("─".repeat(70));
    
    const stats = {
      Points: analyzeStats(data.points),
      Rebounds: analyzeStats(data.rebounds),
      Assists: analyzeStats(data.assists),
      Steals: analyzeStats(data.steals),
      Blocks: analyzeStats(data.blocks),
    };
    
    const statNames: (keyof typeof stats)[] = ["Points", "Rebounds", "Assists", "Steals", "Blocks"];
    
    for (const statName of statNames) {
      const s = stats[statName];
      const ncaaKey = statName.toLowerCase() as keyof typeof ncaa;
      const [ncaaLow, ncaaHigh] = ncaa[ncaaKey];
      
      const withinRange = s.avg >= ncaaLow && s.avg <= ncaaHigh;
      const flag = withinRange ? "✓" : "✗";
      
      console.log(`${statName.padEnd(10)} ${flag}  Avg: ${s.avg.toFixed(1)} (NCAA: ${ncaaLow}-${ncaaHigh})`);
      console.log(`${"".padEnd(14)}Max: ${s.max.toFixed(1)}  |  P75: ${s.p75.toFixed(1)}  |  P90: ${s.p90.toFixed(1)}  |  P95: ${s.p95.toFixed(1)}  |  σ: ${s.stdDev.toFixed(1)}`);
    }
  }

  console.log("\n=== ANALYSIS COMPLETE ===\n");
}

main();
