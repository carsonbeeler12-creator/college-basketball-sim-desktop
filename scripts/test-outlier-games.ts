// Test for outlier/explosion performances
import type { Dynasty } from "../src/game/types/dynasty";
import { createDynasty } from "../src/game/engine/createDynasty";
import { simulateGame } from "../src/game/engine/sim/simGame_v0";
import { TEAMS } from "../src/game/defaultData";

function main() {
  console.log("=== OUTLIER PERFORMANCE TEST ===\n");
  console.log("Looking for 'crazy' stat lines across 1000 games...\n");

  let dynasty = createDynasty({ coachName: "Test Coach", userTeamId: TEAMS[0].id });
  
  const teams = Object.values(dynasty.league.teamsById);
  const teamA = teams[0];
  const teamB = teams[1];
  
  // Track extreme performances
  const extremes = {
    points: { value: 0, player: "", game: 0 },
    rebounds: { value: 0, player: "", game: 0 },
    assists: { value: 0, player: "", game: 0 },
    steals: { value: 0, player: "", game: 0 },
    blocks: { value: 0, player: "", game: 0 },
  };
  
  const benchmarks = {
    "40+ points": 0,
    "35+ points": 0,
    "30+ points": 0,
    "15+ rebounds": 0,
    "10+ assists": 0,
    "5+ steals": 0,
    "5+ blocks": 0,
    "Triple double (10/10/10)": 0,
  };

  const numGames = 1000;
  
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
    
    const game = dynasty.league.gamesById[gameId];
    if (!game?.result?.boxScore?.playerLinesByTeam) continue;
    
    const allLines = [...game.result.boxScore.playerLinesByTeam.home, ...game.result.boxScore.playerLinesByTeam.away];
    
    for (const line of allLines) {
      const player = dynasty.playersById[line.playerId];
      if (!player) continue;
      
      const name = `${player.identity.firstName} ${player.identity.lastName}`;
      
      // Track extremes
      if (line.points > extremes.points.value) {
        extremes.points = { value: line.points, player: name, game: i + 1 };
      }
      if (line.rebounds > extremes.rebounds.value) {
        extremes.rebounds = { value: line.rebounds, player: name, game: i + 1 };
      }
      if (line.assists > extremes.assists.value) {
        extremes.assists = { value: line.assists, player: name, game: i + 1 };
      }
      if (line.steals > extremes.steals.value) {
        extremes.steals = { value: line.steals, player: name, game: i + 1 };
      }
      if (line.blocks > extremes.blocks.value) {
        extremes.blocks = { value: line.blocks, player: name, game: i + 1 };
      }
      
      // Count benchmarks
      if (line.points >= 40) benchmarks["40+ points"]++;
      if (line.points >= 35) benchmarks["35+ points"]++;
      if (line.points >= 30) benchmarks["30+ points"]++;
      if (line.rebounds >= 15) benchmarks["15+ rebounds"]++;
      if (line.assists >= 10) benchmarks["10+ assists"]++;
      if (line.steals >= 5) benchmarks["5+ steals"]++;
      if (line.blocks >= 5) benchmarks["5+ blocks"]++;
      
      // Triple double
      let doubleCount = 0;
      if (line.points >= 10) doubleCount++;
      if (line.rebounds >= 10) doubleCount++;
      if (line.assists >= 10) doubleCount++;
      if (line.steals >= 10) doubleCount++;
      if (line.blocks >= 10) doubleCount++;
      if (doubleCount >= 3) benchmarks["Triple double (10/10/10)"]++;
    }
    
    if ((i + 1) % 200 === 0) {
      console.log(`  Simulated ${i + 1}/${numGames} games...`);
    }
  }

  console.log("\n=== EXTREME PERFORMANCES FOUND ===\n");
  
  console.log("SINGLE-GAME RECORDS:");
  console.log(`  Points:   ${extremes.points.value} by ${extremes.points.player} (Game ${extremes.points.game})`);
  console.log(`  Rebounds: ${extremes.rebounds.value} by ${extremes.rebounds.player} (Game ${extremes.rebounds.game})`);
  console.log(`  Assists:  ${extremes.assists.value} by ${extremes.assists.player} (Game ${extremes.assists.game})`);
  console.log(`  Steals:   ${extremes.steals.value} by ${extremes.steals.player} (Game ${extremes.steals.game})`);
  console.log(`  Blocks:   ${extremes.blocks.value} by ${extremes.blocks.player} (Game ${extremes.blocks.game})`);
  
  console.log("\n\nOUTLIER FREQUENCY (across 1000 games, ~25 players/game):");
  console.log("─".repeat(60));
  
  const totalPlayerGames = numGames * 25;
  
  for (const [label, count] of Object.entries(benchmarks)) {
    const pct = ((count / totalPlayerGames) * 100).toFixed(3);
    const per100 = ((count / numGames) * 100).toFixed(1);
    console.log(`${label.padEnd(30)} ${count.toString().padStart(4)} times  (${pct}% of player-games, ${per100} per 100 team-games)`);
  }
  
  console.log("\n=== HISTORICAL COMPARISON ===\n");
  
  const ncaaRecords = {
    "Points (single game)": { ncaa: "54 (Pete Maravich)", sim: extremes.points.value },
    "Rebounds (single game)": { ncaa: "34 (Bill Chambers)", sim: extremes.rebounds.value },
    "Assists (single game)": { ncaa: "22 (Tony Fairley)", sim: extremes.assists.value },
    "Steals (single game)": { ncaa: "13 (Mookie Blaylock)", sim: extremes.steals.value },
    "Blocks (single game)": { ncaa: "14 (Shaquille O'Neal)", sim: extremes.blocks.value },
  };
  
  console.log("Real NCAA Records vs Sim Maximum:");
  console.log("─".repeat(60));
  for (const [stat, data] of Object.entries(ncaaRecords)) {
    const simVal = data.sim.toString().padStart(2);
    console.log(`${stat.padEnd(30)} NCAA: ${data.ncaa.padEnd(25)} Sim: ${simVal}`);
  }
  
  console.log("\n\nANALYSIS:");
  if (extremes.points.value >= 45) {
    console.log("✓ GREAT: Sim allows truly historic scoring performances");
  } else if (extremes.points.value >= 35) {
    console.log("⚠ MODERATE: Sim allows good performances but not truly historic");
  } else {
    console.log("✗ LIMITED: Sim may be capping elite performances too much");
  }
  
  if (benchmarks["40+ points"] > 0) {
    console.log(`✓ 40+ point games DO occur (${benchmarks["40+ points"]} times in 1000 games)`);
  } else {
    console.log("✗ No 40+ point games found - variance may be too low");
  }
  
  if (benchmarks["Triple double (10/10/10)"] > 0) {
    console.log(`✓ Triple-doubles DO occur (${benchmarks["Triple double (10/10/10)"]} times)`);
  } else {
    console.log("✗ No triple-doubles found in 1000 games - may be too rare");
  }
  
  console.log("\n=== TEST COMPLETE ===\n");
}

main();
