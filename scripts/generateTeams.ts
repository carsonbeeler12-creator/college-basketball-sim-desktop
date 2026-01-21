// scripts/generateTeams.ts
// Helper script to generate fictional team names from real NCAA team data
// with realistic prestige ratings

/**
 * Real team data structure
 */
type RealTeam = {
  realName: string; // e.g., "Duke University"
  city: string;
  state: string;
  nickname: string; // e.g., "Blue Devils"
  prestige: number; // 1-100 based on historical performance
  conferenceId: string;
}

/**
 * Converts real team names to fictional equivalents
 * Strategy: Use city-based names, avoid real university names entirely
 */
function createFictionalName(realName: string, city: string, nickname: string): {
  name: string;
  id: string;
} {
  // Extract university name (remove common suffixes and prefixes)
  let universityName = realName
    .replace(/^University\s+of\s+/i, '') // Remove "University of" prefix
    .replace(/University|College|State|Tech|Institute/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  
  // Always use city-based naming - REAL CITY NAMES ARE ALLOWED
  // Pattern: [Real City] + [Suffix] - avoids real university names while keeping real cities
  
  // Special handling for some cities to create more distinct fictional university names
  // Only change the university name, NOT the city name
  const nameMap: Record<string, string> = {
    'West Lafayette': 'Lafayette Tech', // University name, city stays "West Lafayette"
    'College Station': 'Brazos State', // University name, city stays "College Station"
    'Chapel Hill': 'Carolina University', // University name, city stays "Chapel Hill"
    'Ann Arbor': 'Washtenaw University', // University name, city stays "Ann Arbor"
    'Bloomington': 'Monroe University', // University name, city stays "Bloomington"
    'East Lansing': 'Ingham State', // University name, city stays "East Lansing"
    'State College': 'Centre University', // University name, city stays "State College"
    'College Park': 'Prince George\'s University', // University name, city stays "College Park"
  }
  
  // If we have a special mapping, use it; otherwise generate from real city name
  let fictionalName: string
  if (nameMap[city]) {
    fictionalName = nameMap[city]
  } else {
    // Create fictional name based on real city name (city names are allowed)
    const suffixes = ['University', 'State', 'Metropolitan', 'Tech', 'College', 'Institute']
    const suffix = suffixes[Math.floor((city.charCodeAt(0) + city.length) % suffixes.length)]
    fictionalName = `${city} ${suffix}`
  }
  
  const id = createId(fictionalName, city)
  return { name: fictionalName.trim(), id }
}

/**
 * Converts real nicknames to fictional equivalents
 * Strategy: Change to similar but distinct nicknames
 */
function createFictionalNickname(realNickname: string, city: string): string {
  const nicknameMap: Record<string, string> = {
    // Avoid trademarked nicknames
    'Boilermakers': 'Engineers', // Purdue -> West Lafayette Tech
    'Blue Devils': 'Demons', // Duke
    'Tar Heels': 'Carolina Blue', // UNC
    'Wildcats': 'Cougars', // Kentucky, Arizona, etc.
    'Jayhawks': 'Hawks', // Kansas
    'Spartans': 'Warriors', // Michigan State
    'Wolverines': 'Wolves', // Michigan
    'Hoosiers': 'Hoosiers', // Keep generic state nickname
    'Buckeyes': 'Bucks', // Ohio State
    'Badgers': 'Badgers', // Generic enough
    'Cavaliers': 'Cavs', // Virginia
    'Cardinals': 'Redbirds', // Louisville
    'Orange': 'Citrus', // Syracuse
    'Seminoles': 'Warriors', // Florida State
    'Hurricanes': 'Storm', // Miami
    'Fighting Irish': 'Shamrocks', // Notre Dame
    'Tigers': 'Panthers', // Clemson, Auburn, LSU, Missouri
    'Demon Deacons': 'Deacons', // Wake Forest
    'Hokies': 'Techies', // Virginia Tech
    'Panthers': 'Wildcats', // Pittsburgh
    'Yellow Jackets': 'Bees', // Georgia Tech
    'Eagles': 'Falcons', // Boston College
    'Gators': 'Swampers', // Florida
    'Volunteers': 'Vols', // Tennessee
    'Crimson Tide': 'Crimson', // Alabama
    'Razorbacks': 'Hogs', // Arkansas
    'Aggies': 'Farmers', // Texas A&M
    'Bulldogs': 'Dogs', // Georgia, Mississippi State
    'Gamecocks': 'Roosters', // South Carolina
    'Commodores': 'Admirals', // Vanderbilt
    'Rebels': 'Raiders', // Ole Miss
    'Bears': 'Bruins', // Baylor
    'Red Raiders': 'Raiders', // Texas Tech
    'Sooners': 'Boomers', // Oklahoma
    'Mountaineers': 'Mountains', // West Virginia
    'Cyclones': 'Tornadoes', // Iowa State
    'Longhorns': 'Horns', // Texas
    'Cowboys': 'Riders', // Oklahoma State
    'Horned Frogs': 'Frogs', // TCU
    'Bruins': 'Bears', // UCLA
    'Ducks': 'Webfoots', // Oregon
    'Trojans': 'Warriors', // USC
    'Cardinal': 'Red', // Stanford
    'Golden Bears': 'Bears', // California
    'Buffaloes': 'Buffs', // Colorado
    'Utes': 'Red', // Utah
    'Huskies': 'Dogs', // Washington
    'Sun Devils': 'Devils', // Arizona State
    'Beavers': 'Dam Builders', // Oregon State
    'Cougars': 'Wildcats', // Washington State
    'Aztecs': 'Warriors', // San Diego State
    'Wolf Pack': 'Wolves', // Nevada
    'Broncos': 'Stallions', // Boise State
    'Runnin\' Rebels': 'Runners', // UNLV
    'Rams': 'Sheep', // Colorado State, VCU
    'Lobos': 'Wolves', // New Mexico
    'Cowboys': 'Riders', // Wyoming
    'Cougars': 'Wildcats', // Houston
    'Bearcats': 'Cats', // Cincinnati
    'Mustangs': 'Stallions', // SMU
    'Owls': 'Hooters', // Temple
    'Knights': 'Swords', // UCF
    'Pirates': 'Raiders', // East Carolina
    'Shockers': 'Shakers', // Wichita State
    'Green Wave': 'Waves', // Tulane
    'Bulls': 'Horns', // South Florida
    'Flyers': 'Flyers', // Generic enough
    'Spiders': 'Webs', // Richmond
    'Bonnies': 'Bonnies', // Generic enough
    'Patriots': 'Patriots', // Generic enough
    'Dukes': 'Dukes', // Generic enough
    'Minutemen': 'Minutemen', // Generic enough
    'Colonials': 'Colonials', // Generic enough
    'Explorers': 'Explorers', // Generic enough
    'Hawks': 'Hawks', // Generic enough
    'Red Storm': 'Storm', // St. John's
    'Pirates': 'Raiders', // Seton Hall
    'Friars': 'Monks', // Providence
    'Blue Demons': 'Demons', // DePaul
    'Gaels': 'Highlanders', // Saint Mary's
    'Dons': 'Dons', // Generic enough
    'Lions': 'Lions', // Generic enough
    'Waves': 'Waves', // Generic enough
    'Pilots': 'Aviators', // Portland
    'Toreros': 'Matadors', // San Diego
  }
  
  // Use mapped nickname or create variation
  if (nicknameMap[realNickname]) {
    return nicknameMap[realNickname]
  }
  
  // Generic fallback: use a similar but different nickname
  const genericNicknames = ['Wildcats', 'Eagles', 'Panthers', 'Tigers', 'Bears', 'Wolves', 'Hawks', 'Lions']
  return genericNicknames[Math.floor((city.charCodeAt(0) + realNickname.length) % genericNicknames.length)]
}

/**
 * Create a short ID from team name
 */
function createId(name: string, city: string): string {
  // Take first 3 letters of each word, or first 3 letters of city
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return (parts[0].substring(0, 3) + parts[1].substring(0, 2)).toLowerCase().replace(/[^a-z]/g, '')
  }
  return city.substring(0, 5).toLowerCase().replace(/[^a-z]/g, '').padEnd(3, 'x')
}

/**
 * Comprehensive list of real NCAA D1 teams with prestige based on RECENT performance (2014-2024)
 * Focus on: Championships, Final 4s, Elite 8s, Sweet 16s, tournament consistency
 * Prestige scale: 90+ = Elite champions, 80-89 = Very strong, 70-79 = Solid/Good,
 *                 60-69 = Average, 50-59 = Below average, 40-49 = Low major, <40 = Bottom tier
 */
const REAL_TEAMS: RealTeam[] = [
  // ACC - Recent performance (2014-2024)
  { realName: 'Duke University', city: 'Durham', state: 'NC', nickname: 'Blue Devils', prestige: 92, conferenceId: 'acc' }, // Multiple Final 4s, consistently strong
  { realName: 'University of North Carolina', city: 'Chapel Hill', state: 'NC', nickname: 'Tar Heels', prestige: 94, conferenceId: 'acc' }, // 2017 champion, multiple deep runs
  { realName: 'University of Virginia', city: 'Charlottesville', state: 'VA', nickname: 'Cavaliers', prestige: 88, conferenceId: 'acc' }, // 2019 champion, consistent
  { realName: 'Louisville', city: 'Louisville', state: 'KY', nickname: 'Cardinals', prestige: 72, conferenceId: 'acc' }, // Post-scandal, weaker recently
  { realName: 'Syracuse University', city: 'Syracuse', state: 'NY', nickname: 'Orange', prestige: 70, conferenceId: 'acc' }, // Final 4 in 2016, weaker recently
  { realName: 'North Carolina State', city: 'Raleigh', state: 'NC', nickname: 'Wolfpack', prestige: 75, conferenceId: 'acc' }, // Sweet 16 in 2024, improving
  { realName: 'Florida State University', city: 'Tallahassee', state: 'FL', nickname: 'Seminoles', prestige: 76, conferenceId: 'acc' }, // Elite 8 in 2021, solid
  { realName: 'Miami University', city: 'Coral Gables', state: 'FL', nickname: 'Hurricanes', prestige: 78, conferenceId: 'acc' }, // Elite 8 2022, Final 4 2023!
  { realName: 'Notre Dame', city: 'South Bend', state: 'IN', nickname: 'Fighting Irish', prestige: 71, conferenceId: 'acc' }, // Elite 8 in 2016, inconsistent
  { realName: 'Clemson University', city: 'Clemson', state: 'SC', nickname: 'Tigers', prestige: 74, conferenceId: 'acc' }, // Elite 8 in 2024, best finish in decades
  { realName: 'Wake Forest University', city: 'Winston-Salem', state: 'NC', nickname: 'Demon Deacons', prestige: 65, conferenceId: 'acc' }, // Struggling recently
  { realName: 'Virginia Tech', city: 'Blacksburg', state: 'VA', nickname: 'Hokies', prestige: 68, conferenceId: 'acc' }, // Some tournament appearances
  { realName: 'Pittsburgh', city: 'Pittsburgh', state: 'PA', nickname: 'Panthers', prestige: 66, conferenceId: 'acc' }, // Some tournament appearances
  { realName: 'Georgia Tech', city: 'Atlanta', state: 'GA', nickname: 'Yellow Jackets', prestige: 62, conferenceId: 'acc' }, // Weak recently
  { realName: 'Boston College', city: 'Chestnut Hill', state: 'MA', nickname: 'Eagles', prestige: 58, conferenceId: 'acc' }, // Weak recently
  
  // Big Ten - Recent performance (2014-2024)
  { realName: 'Michigan State University', city: 'East Lansing', state: 'MI', nickname: 'Spartans', prestige: 87, conferenceId: 'big-ten' }, // Final 4 in 2019, consistent
  { realName: 'University of Michigan', city: 'Ann Arbor', state: 'MI', nickname: 'Wolverines', prestige: 82, conferenceId: 'big-ten' }, // Final 4 in 2018, weaker recently
  { realName: 'Indiana University', city: 'Bloomington', state: 'IN', nickname: 'Hoosiers', prestige: 72, conferenceId: 'big-ten' }, // Struggling in recent years
  { realName: 'Purdue University', city: 'West Lafayette', state: 'IN', nickname: 'Boilermakers', prestige: 88, conferenceId: 'big-ten' }, // Final 4 in 2024, consistently strong
  { realName: 'Ohio State University', city: 'Columbus', state: 'OH', nickname: 'Buckeyes', prestige: 79, conferenceId: 'big-ten' }, // Some deep runs, solid
  { realName: 'Wisconsin', city: 'Madison', state: 'WI', nickname: 'Badgers', prestige: 77, conferenceId: 'big-ten' }, // Final 4 in 2014, consistent
  { realName: 'Maryland', city: 'College Park', state: 'MD', nickname: 'Terrapins', prestige: 74, conferenceId: 'big-ten' }, // Solid, some tournament runs
  { realName: 'Iowa', city: 'Iowa City', state: 'IA', nickname: 'Hawkeyes', prestige: 73, conferenceId: 'big-ten' }, // Consistent tournament team
  { realName: 'Illinois', city: 'Champaign', state: 'IL', nickname: 'Fighting Illini', prestige: 75, conferenceId: 'big-ten' }, // Strong recently, Elite 8 in 2024
  { realName: 'Minnesota', city: 'Minneapolis', state: 'MN', nickname: 'Golden Gophers', prestige: 64, conferenceId: 'big-ten' }, // Weak recently
  { realName: 'Northwestern', city: 'Evanston', state: 'IL', nickname: 'Wildcats', prestige: 66, conferenceId: 'big-ten' }, // First tournament in 2017, improving
  { realName: 'Penn State', city: 'State College', state: 'PA', nickname: 'Nittany Lions', prestige: 63, conferenceId: 'big-ten' }, // Weak recently
  { realName: 'Nebraska', city: 'Lincoln', state: 'NE', nickname: 'Cornhuskers', prestige: 60, conferenceId: 'big-ten' }, // Weak, no recent tournament success
  { realName: 'Rutgers', city: 'Piscataway', state: 'NJ', nickname: 'Scarlet Knights', prestige: 64, conferenceId: 'big-ten' }, // Improving, some tournament appearances
  
  // SEC - Recent performance (2014-2024)
  { realName: 'University of Kentucky', city: 'Lexington', state: 'KY', nickname: 'Wildcats', prestige: 90, conferenceId: 'sec' }, // Consistent Elite 8/Final 4 runs
  { realName: 'University of Florida', city: 'Gainesville', state: 'FL', nickname: 'Gators', prestige: 78, conferenceId: 'sec' }, // Elite 8 in 2017, solid
  { realName: 'University of Tennessee', city: 'Knoxville', state: 'TN', nickname: 'Volunteers', prestige: 82, conferenceId: 'sec' }, // Consistently strong recently, Sweet 16s
  { realName: 'Auburn University', city: 'Auburn', state: 'AL', nickname: 'Tigers', prestige: 81, conferenceId: 'sec' }, // Final 4 in 2019, strong recently
  { realName: 'Alabama', city: 'Tuscaloosa', state: 'AL', nickname: 'Crimson Tide', prestige: 82, conferenceId: 'sec' }, // Final 4 in 2024, very strong recently
  { realName: 'Arkansas', city: 'Fayetteville', state: 'AR', nickname: 'Razorbacks', prestige: 79, conferenceId: 'sec' }, // Elite 8 in 2021, 2022, consistently strong
  { realName: 'LSU', city: 'Baton Rouge', state: 'LA', nickname: 'Tigers', prestige: 74, conferenceId: 'sec' }, // Sweet 16 in 2019, some issues
  { realName: 'Texas A&M', city: 'College Station', state: 'TX', nickname: 'Aggies', prestige: 71, conferenceId: 'sec' }, // Sweet 16 in 2018, 2024
  { realName: 'Missouri', city: 'Columbia', state: 'MO', nickname: 'Tigers', prestige: 68, conferenceId: 'sec' }, // Inconsistent
  { realName: 'Georgia', city: 'Athens', state: 'GA', nickname: 'Bulldogs', prestige: 63, conferenceId: 'sec' }, // Weak recently
  { realName: 'Mississippi State', city: 'Starkville', state: 'MS', nickname: 'Bulldogs', prestige: 66, conferenceId: 'sec' }, // Some tournament appearances
  { realName: 'South Carolina', city: 'Columbia', state: 'SC', nickname: 'Gamecocks', prestige: 75, conferenceId: 'sec' }, // Final 4 in 2017!
  { realName: 'Vanderbilt', city: 'Nashville', state: 'TN', nickname: 'Commodores', prestige: 62, conferenceId: 'sec' }, // Weak recently
  { realName: 'Ole Miss', city: 'Oxford', state: 'MS', nickname: 'Rebels', prestige: 61, conferenceId: 'sec' }, // Weak recently
  
  // Big 12 - Recent performance (2014-2024)
  { realName: 'University of Kansas', city: 'Lawrence', state: 'KS', nickname: 'Jayhawks', prestige: 93, conferenceId: 'big-12' }, // 2022 champion, consistently elite
  { realName: 'Baylor University', city: 'Waco', state: 'TX', nickname: 'Bears', prestige: 88, conferenceId: 'big-12' }, // 2021 champion!
  { realName: 'Texas Tech', city: 'Lubbock', state: 'TX', nickname: 'Red Raiders', prestige: 79, conferenceId: 'big-12' }, // Final 4 in 2019, championship game
  { realName: 'Oklahoma', city: 'Norman', state: 'OK', nickname: 'Sooners', prestige: 75, conferenceId: 'big-12' }, // Final 4 in 2016, solid
  { realName: 'West Virginia', city: 'Morgantown', state: 'WV', nickname: 'Mountaineers', prestige: 76, conferenceId: 'big-12' }, // Consistent tournament team
  { realName: 'Iowa State', city: 'Ames', state: 'IA', nickname: 'Cyclones', prestige: 77, conferenceId: 'big-12' }, // Elite 8 in 2014, consistently strong
  { realName: 'Texas', city: 'Austin', state: 'TX', nickname: 'Longhorns', prestige: 74, conferenceId: 'big-12' }, // Elite 8 in 2024, solid
  { realName: 'Oklahoma State', city: 'Stillwater', state: 'OK', nickname: 'Cowboys', prestige: 70, conferenceId: 'big-12' }, // Some tournament appearances
  { realName: 'TCU', city: 'Fort Worth', state: 'TX', nickname: 'Horned Frogs', prestige: 71, conferenceId: 'big-12' }, // Sweet 16 in 2022, improving
  { realName: 'Kansas State', city: 'Manhattan', state: 'KS', nickname: 'Wildcats', prestige: 73, conferenceId: 'big-12' }, // Elite 8 in 2018, solid
  
  // Pac-12 - Recent performance (2014-2024)
  { realName: 'UCLA', city: 'Los Angeles', state: 'CA', nickname: 'Bruins', prestige: 86, conferenceId: 'pac-12' }, // Final 4 in 2021, consistently strong
  { realName: 'University of Arizona', city: 'Tucson', state: 'AZ', nickname: 'Wildcats', prestige: 88, conferenceId: 'pac-12' }, // Final 4 in 2024, consistently elite
  { realName: 'Oregon', city: 'Eugene', state: 'OR', nickname: 'Ducks', prestige: 80, conferenceId: 'pac-12' }, // Final 4 in 2017, consistently strong
  { realName: 'USC', city: 'Los Angeles', state: 'CA', nickname: 'Trojans', prestige: 77, conferenceId: 'pac-12' }, // Elite 8 in 2021, solid
  { realName: 'Stanford', city: 'Palo Alto', state: 'CA', nickname: 'Cardinal', prestige: 68, conferenceId: 'pac-12' }, // Some tournament appearances
  { realName: 'Colorado', city: 'Boulder', state: 'CO', nickname: 'Buffaloes', prestige: 71, conferenceId: 'pac-12' }, // Sweet 16 in 2021, solid
  { realName: 'Utah', city: 'Salt Lake City', state: 'UT', nickname: 'Utes', prestige: 69, conferenceId: 'pac-12' }, // Some tournament appearances
  { realName: 'Washington', city: 'Seattle', state: 'WA', nickname: 'Huskies', prestige: 65, conferenceId: 'pac-12' }, // Weak recently
  { realName: 'Arizona State', city: 'Tempe', state: 'AZ', nickname: 'Sun Devils', prestige: 68, conferenceId: 'pac-12' }, // Some tournament appearances
  { realName: 'Oregon State', city: 'Corvallis', state: 'OR', nickname: 'Beavers', prestige: 67, conferenceId: 'pac-12' }, // Elite 8 in 2021!
  { realName: 'California', city: 'Berkeley', state: 'CA', nickname: 'Golden Bears', prestige: 58, conferenceId: 'pac-12' }, // Weak recently
  { realName: 'Washington State', city: 'Pullman', state: 'WA', nickname: 'Cougars', prestige: 64, conferenceId: 'pac-12' }, // Weak recently
  
  // Big East - Recent performance (2014-2024)
  { realName: 'Villanova University', city: 'Villanova', state: 'PA', nickname: 'Wildcats', prestige: 94, conferenceId: 'big-east' }, // 2016 & 2018 champion!
  { realName: 'Connecticut', city: 'Storrs', state: 'CT', nickname: 'Huskies', prestige: 96, conferenceId: 'big-east' }, // 2023 & 2024 champion! Back-to-back
  { realName: 'Marquette University', city: 'Milwaukee', state: 'WI', nickname: 'Golden Eagles', prestige: 80, conferenceId: 'big-east' }, // Elite 8 in 2024, consistently strong
  { realName: 'Creighton University', city: 'Omaha', state: 'NE', nickname: 'Bluejays', prestige: 78, conferenceId: 'big-east' }, // Elite 8 in 2024, consistently strong
  { realName: 'Xavier University', city: 'Cincinnati', state: 'OH', nickname: 'Musketeers', prestige: 76, conferenceId: 'big-east' }, // Elite 8 in 2017, consistently strong
  { realName: 'Seton Hall University', city: 'South Orange', state: 'NJ', nickname: 'Pirates', prestige: 72, conferenceId: 'big-east' }, // Consistent tournament team
  { realName: 'Providence College', city: 'Providence', state: 'RI', nickname: 'Friars', prestige: 73, conferenceId: 'big-east' }, // Sweet 16 in 2022
  { realName: 'Butler University', city: 'Indianapolis', state: 'IN', nickname: 'Bulldogs', prestige: 70, conferenceId: 'big-east' }, // Weaker recently
  { realName: 'St. John\'s University', city: 'Queens', state: 'NY', nickname: 'Red Storm', prestige: 64, conferenceId: 'big-east' }, // Weak recently
  { realName: 'Georgetown University', city: 'Washington', state: 'DC', nickname: 'Hoyas', prestige: 62, conferenceId: 'big-east' }, // Struggling recently
  { realName: 'DePaul University', city: 'Chicago', state: 'IL', nickname: 'Blue Demons', prestige: 58, conferenceId: 'big-east' }, // Weak recently
  
  // AAC - Recent performance (2014-2024)
  { realName: 'Houston', city: 'Houston', state: 'TX', nickname: 'Cougars', prestige: 87, conferenceId: 'aac' }, // Final 4 in 2021, consistently elite
  { realName: 'Cincinnati', city: 'Cincinnati', state: 'OH', nickname: 'Bearcats', prestige: 73, conferenceId: 'aac' }, // Consistent tournament team
  { realName: 'Memphis', city: 'Memphis', state: 'TN', nickname: 'Tigers', prestige: 72, conferenceId: 'aac' }, // Some tournament appearances
  { realName: 'Wichita State', city: 'Wichita', state: 'KS', nickname: 'Shockers', prestige: 74, conferenceId: 'aac' }, // Sweet 16 in 2018, consistent
  { realName: 'Temple', city: 'Philadelphia', state: 'PA', nickname: 'Owls', prestige: 68, conferenceId: 'aac' },
  { realName: 'SMU', city: 'Dallas', state: 'TX', nickname: 'Mustangs', prestige: 64, conferenceId: 'aac' },
  { realName: 'UCF', city: 'Orlando', state: 'FL', nickname: 'Knights', prestige: 63, conferenceId: 'aac' },
  { realName: 'Tulane', city: 'New Orleans', state: 'LA', nickname: 'Green Wave', prestige: 58, conferenceId: 'aac' },
  { realName: 'East Carolina', city: 'Greenville', state: 'NC', nickname: 'Pirates', prestige: 56, conferenceId: 'aac' },
  { realName: 'Tulsa', city: 'Tulsa', state: 'OK', nickname: 'Golden Hurricane', prestige: 62, conferenceId: 'aac' },
  { realName: 'South Florida', city: 'Tampa', state: 'FL', nickname: 'Bulls', prestige: 59, conferenceId: 'aac' },
  
  // Mountain West - Recent performance (2014-2024)
  { realName: 'San Diego State', city: 'San Diego', state: 'CA', nickname: 'Aztecs', prestige: 82, conferenceId: 'mwc' }, // Final 4 in 2023! Championship game
  { realName: 'Nevada', city: 'Reno', state: 'NV', nickname: 'Wolf Pack', prestige: 71, conferenceId: 'mwc' },
  { realName: 'Boise State', city: 'Boise', state: 'ID', nickname: 'Broncos', prestige: 68, conferenceId: 'mwc' },
  { realName: 'UNLV', city: 'Las Vegas', state: 'NV', nickname: 'Runnin\' Rebels', prestige: 67, conferenceId: 'mwc' },
  { realName: 'Utah State', city: 'Logan', state: 'UT', nickname: 'Aggies', prestige: 66, conferenceId: 'mwc' },
  { realName: 'Colorado State', city: 'Fort Collins', state: 'CO', nickname: 'Rams', prestige: 63, conferenceId: 'mwc' },
  { realName: 'New Mexico', city: 'Albuquerque', state: 'NM', nickname: 'Lobos', prestige: 62, conferenceId: 'mwc' },
  { realName: 'Fresno State', city: 'Fresno', state: 'CA', nickname: 'Bulldogs', prestige: 59, conferenceId: 'mwc' },
  { realName: 'Wyoming', city: 'Laramie', state: 'WY', nickname: 'Cowboys', prestige: 58, conferenceId: 'mwc' },
  { realName: 'San Jose State', city: 'San Jose', state: 'CA', nickname: 'Spartans', prestige: 52, conferenceId: 'mwc' },
  { realName: 'Air Force', city: 'Colorado Springs', state: 'CO', nickname: 'Falcons', prestige: 51, conferenceId: 'mwc' },
  
  // Atlantic 10
  { realName: 'Dayton', city: 'Dayton', state: 'OH', nickname: 'Flyers', prestige: 77, conferenceId: 'a10' },
  { realName: 'VCU', city: 'Richmond', state: 'VA', nickname: 'Rams', prestige: 72, conferenceId: 'a10' },
  { realName: 'Davidson', city: 'Davidson', state: 'NC', nickname: 'Wildcats', prestige: 69, conferenceId: 'a10' },
  { realName: 'Saint Louis', city: 'St. Louis', state: 'MO', nickname: 'Billikens', prestige: 67, conferenceId: 'a10' },
  { realName: 'Rhode Island', city: 'Kingston', state: 'RI', nickname: 'Rams', prestige: 65, conferenceId: 'a10' },
  { realName: 'Richmond', city: 'Richmond', state: 'VA', nickname: 'Spiders', prestige: 64, conferenceId: 'a10' },
  { realName: 'St. Bonaventure', city: 'St. Bonaventure', state: 'NY', nickname: 'Bonnies', prestige: 63, conferenceId: 'a10' },
  { realName: 'George Mason', city: 'Fairfax', state: 'VA', nickname: 'Patriots', prestige: 62, conferenceId: 'a10' },
  { realName: 'Duquesne', city: 'Pittsburgh', state: 'PA', nickname: 'Dukes', prestige: 59, conferenceId: 'a10' },
  { realName: 'Massachusetts', city: 'Amherst', state: 'MA', nickname: 'Minutemen', prestige: 58, conferenceId: 'a10' },
  { realName: 'Fordham', city: 'Bronx', state: 'NY', nickname: 'Rams', prestige: 57, conferenceId: 'a10' },
  { realName: 'George Washington', city: 'Washington', state: 'DC', nickname: 'Colonials', prestige: 56, conferenceId: 'a10' },
  { realName: 'La Salle', city: 'Philadelphia', state: 'PA', nickname: 'Explorers', prestige: 55, conferenceId: 'a10' },
  { realName: 'St. Joseph\'s', city: 'Philadelphia', state: 'PA', nickname: 'Hawks', prestige: 54, conferenceId: 'a10' },
  
  // West Coast Conference - Recent performance (2014-2024)
  { realName: 'Gonzaga University', city: 'Spokane', state: 'WA', nickname: 'Bulldogs', prestige: 95, conferenceId: 'wcc' }, // Championship game in 2017, 2021, consistently elite
  { realName: 'Saint Mary\'s', city: 'Moraga', state: 'CA', nickname: 'Gaels', prestige: 75, conferenceId: 'wcc' },
  { realName: 'BYU', city: 'Provo', state: 'UT', nickname: 'Cougars', prestige: 73, conferenceId: 'wcc' },
  { realName: 'San Francisco', city: 'San Francisco', state: 'CA', nickname: 'Dons', prestige: 66, conferenceId: 'wcc' },
  { realName: 'Loyola Marymount', city: 'Los Angeles', state: 'CA', nickname: 'Lions', prestige: 62, conferenceId: 'wcc' },
  { realName: 'Pepperdine', city: 'Malibu', state: 'CA', nickname: 'Waves', prestige: 60, conferenceId: 'wcc' },
  { realName: 'Santa Clara', city: 'Santa Clara', state: 'CA', nickname: 'Broncos', prestige: 59, conferenceId: 'wcc' },
  { realName: 'Portland', city: 'Portland', state: 'OR', nickname: 'Pilots', prestige: 55, conferenceId: 'wcc' },
  { realName: 'Pacific', city: 'Stockton', state: 'CA', nickname: 'Tigers', prestige: 53, conferenceId: 'wcc' },
  { realName: 'San Diego', city: 'San Diego', state: 'CA', nickname: 'Toreros', prestige: 52, conferenceId: 'wcc' },
  
  // MAC - Mid-American Conference
  { realName: 'Buffalo', city: 'Buffalo', state: 'NY', nickname: 'Bulls', prestige: 65, conferenceId: 'mac' },
  { realName: 'Akron', city: 'Akron', state: 'OH', nickname: 'Zips', prestige: 62, conferenceId: 'mac' },
  { realName: 'Kent State', city: 'Kent', state: 'OH', nickname: 'Golden Flashes', prestige: 61, conferenceId: 'mac' },
  { realName: 'Ohio', city: 'Athens', state: 'OH', nickname: 'Bobcats', prestige: 60, conferenceId: 'mac' },
  { realName: 'Toledo', city: 'Toledo', state: 'OH', nickname: 'Rockets', prestige: 59, conferenceId: 'mac' },
  { realName: 'Ball State', city: 'Muncie', state: 'IN', nickname: 'Cardinals', prestige: 57, conferenceId: 'mac' },
  { realName: 'Bowling Green', city: 'Bowling Green', state: 'OH', nickname: 'Falcons', prestige: 56, conferenceId: 'mac' },
  { realName: 'Eastern Michigan', city: 'Ypsilanti', state: 'MI', nickname: 'Eagles', prestige: 55, conferenceId: 'mac' },
  { realName: 'Miami (OH)', city: 'Oxford', state: 'OH', nickname: 'RedHawks', prestige: 54, conferenceId: 'mac' },
  { realName: 'Western Michigan', city: 'Kalamazoo', state: 'MI', nickname: 'Broncos', prestige: 53, conferenceId: 'mac' },
  { realName: 'Northern Illinois', city: 'DeKalb', state: 'IL', nickname: 'Huskies', prestige: 52, conferenceId: 'mac' },
  { realName: 'Central Michigan', city: 'Mount Pleasant', state: 'MI', nickname: 'Chippewas', prestige: 51, conferenceId: 'mac' },
  
  // Conference USA
  { realName: 'Western Kentucky', city: 'Bowling Green', state: 'KY', nickname: 'Hilltoppers', prestige: 67, conferenceId: 'cusa' },
  { realName: 'Louisiana Tech', city: 'Ruston', state: 'LA', nickname: 'Bulldogs', prestige: 63, conferenceId: 'cusa' },
  { realName: 'UTEP', city: 'El Paso', state: 'TX', nickname: 'Miners', prestige: 61, conferenceId: 'cusa' },
  { realName: 'Middle Tennessee', city: 'Murfreesboro', state: 'TN', nickname: 'Blue Raiders', prestige: 60, conferenceId: 'cusa' },
  { realName: 'Old Dominion', city: 'Norfolk', state: 'VA', nickname: 'Monarchs', prestige: 59, conferenceId: 'cusa' },
  { realName: 'UAB', city: 'Birmingham', state: 'AL', nickname: 'Blazers', prestige: 58, conferenceId: 'cusa' },
  { realName: 'UTSA', city: 'San Antonio', state: 'TX', nickname: 'Roadrunners', prestige: 55, conferenceId: 'cusa' },
  { realName: 'North Texas', city: 'Denton', state: 'TX', nickname: 'Mean Green', prestige: 54, conferenceId: 'cusa' },
  { realName: 'Florida Atlantic', city: 'Boca Raton', state: 'FL', nickname: 'Owls', prestige: 53, conferenceId: 'cusa' },
  { realName: 'Rice', city: 'Houston', state: 'TX', nickname: 'Owls', prestige: 52, conferenceId: 'cusa' },
  { realName: 'Charlotte', city: 'Charlotte', state: 'NC', nickname: '49ers', prestige: 51, conferenceId: 'cusa' },
  { realName: 'FIU', city: 'Miami', state: 'FL', nickname: 'Panthers', prestige: 50, conferenceId: 'cusa' },
  
  // Sun Belt
  { realName: 'Georgia State', city: 'Atlanta', state: 'GA', nickname: 'Panthers', prestige: 61, conferenceId: 'sun-belt' },
  { realName: 'Louisiana', city: 'Lafayette', state: 'LA', nickname: 'Ragin\' Cajuns', prestige: 60, conferenceId: 'sun-belt' },
  { realName: 'UT Arlington', city: 'Arlington', state: 'TX', nickname: 'Mavericks', prestige: 58, conferenceId: 'sun-belt' },
  { realName: 'Texas State', city: 'San Marcos', state: 'TX', nickname: 'Bobcats', prestige: 57, conferenceId: 'sun-belt' },
  { realName: 'South Alabama', city: 'Mobile', state: 'AL', nickname: 'Jaguars', prestige: 56, conferenceId: 'sun-belt' },
  { realName: 'Arkansas State', city: 'Jonesboro', state: 'AR', nickname: 'Red Wolves', prestige: 55, conferenceId: 'sun-belt' },
  { realName: 'Appalachian State', city: 'Boone', state: 'NC', nickname: 'Mountaineers', prestige: 54, conferenceId: 'sun-belt' },
  { realName: 'Coastal Carolina', city: 'Conway', state: 'SC', nickname: 'Chanticleers', prestige: 53, conferenceId: 'sun-belt' },
  { realName: 'Georgia Southern', city: 'Statesboro', state: 'GA', nickname: 'Eagles', prestige: 52, conferenceId: 'sun-belt' },
  { realName: 'Louisiana-Monroe', city: 'Monroe', state: 'LA', nickname: 'Warhawks', prestige: 51, conferenceId: 'sun-belt' },
  { realName: 'Troy', city: 'Troy', state: 'AL', nickname: 'Trojans', prestige: 50, conferenceId: 'sun-belt' },
  { realName: 'Little Rock', city: 'Little Rock', state: 'AR', nickname: 'Trojans', prestige: 49, conferenceId: 'sun-belt' },
  
  // Ivy League
  { realName: 'Harvard', city: 'Cambridge', state: 'MA', nickname: 'Crimson', prestige: 71, conferenceId: 'ivy' },
  { realName: 'Princeton', city: 'Princeton', state: 'NJ', nickname: 'Tigers', prestige: 70, conferenceId: 'ivy' },
  { realName: 'Yale', city: 'New Haven', state: 'CT', nickname: 'Bulldogs', prestige: 69, conferenceId: 'ivy' },
  { realName: 'Pennsylvania', city: 'Philadelphia', state: 'PA', nickname: 'Quakers', prestige: 67, conferenceId: 'ivy' },
  { realName: 'Cornell', city: 'Ithaca', state: 'NY', nickname: 'Big Red', prestige: 65, conferenceId: 'ivy' },
  { realName: 'Dartmouth', city: 'Hanover', state: 'NH', nickname: 'Big Green', prestige: 63, conferenceId: 'ivy' },
  { realName: 'Brown', city: 'Providence', state: 'RI', nickname: 'Bears', prestige: 62, conferenceId: 'ivy' },
  { realName: 'Columbia', city: 'New York', state: 'NY', nickname: 'Lions', prestige: 61, conferenceId: 'ivy' },
  
  // Patriot League
  { realName: 'Colgate', city: 'Hamilton', state: 'NY', nickname: 'Raiders', prestige: 66, conferenceId: 'patriot' },
  { realName: 'Bucknell', city: 'Lewisburg', state: 'PA', nickname: 'Bison', prestige: 64, conferenceId: 'patriot' },
  { realName: 'Lehigh', city: 'Bethlehem', state: 'PA', nickname: 'Mountain Hawks', prestige: 63, conferenceId: 'patriot' },
  { realName: 'Army', city: 'West Point', state: 'NY', nickname: 'Black Knights', prestige: 62, conferenceId: 'patriot' },
  { realName: 'Navy', city: 'Annapolis', state: 'MD', nickname: 'Midshipmen', prestige: 61, conferenceId: 'patriot' },
  { realName: 'Lafayette', city: 'Easton', state: 'PA', nickname: 'Leopards', prestige: 60, conferenceId: 'patriot' },
  { realName: 'American', city: 'Washington', state: 'DC', nickname: 'Eagles', prestige: 59, conferenceId: 'patriot' },
  { realName: 'Boston University', city: 'Boston', state: 'MA', nickname: 'Terriers', prestige: 58, conferenceId: 'patriot' },
  { realName: 'Loyola Maryland', city: 'Baltimore', state: 'MD', nickname: 'Greyhounds', prestige: 57, conferenceId: 'patriot' },
  { realName: 'Holy Cross', city: 'Worcester', state: 'MA', nickname: 'Crusaders', prestige: 56, conferenceId: 'patriot' },
  
  // Horizon League
  { realName: 'Wright State', city: 'Dayton', state: 'OH', nickname: 'Raiders', prestige: 63, conferenceId: 'horizon' },
  { realName: 'Northern Kentucky', city: 'Highland Heights', state: 'KY', nickname: 'Norse', prestige: 62, conferenceId: 'horizon' },
  { realName: 'Oakland', city: 'Rochester', state: 'MI', nickname: 'Golden Grizzlies', prestige: 61, conferenceId: 'horizon' },
  { realName: 'Detroit Mercy', city: 'Detroit', state: 'MI', nickname: 'Titans', prestige: 59, conferenceId: 'horizon' },
  { realName: 'Green Bay', city: 'Green Bay', state: 'WI', nickname: 'Phoenix', prestige: 58, conferenceId: 'horizon' },
  { realName: 'Milwaukee', city: 'Milwaukee', state: 'WI', nickname: 'Panthers', prestige: 57, conferenceId: 'horizon' },
  { realName: 'Cleveland State', city: 'Cleveland', state: 'OH', nickname: 'Vikings', prestige: 56, conferenceId: 'horizon' },
  { realName: 'Youngstown State', city: 'Youngstown', state: 'OH', nickname: 'Penguins', prestige: 55, conferenceId: 'horizon' },
  { realName: 'UIC', city: 'Chicago', state: 'IL', nickname: 'Flames', prestige: 54, conferenceId: 'horizon' },
  { realName: 'IUPUI', city: 'Indianapolis', state: 'IN', nickname: 'Jaguars', prestige: 53, conferenceId: 'horizon' },
  { realName: 'Robert Morris', city: 'Moon Township', state: 'PA', nickname: 'Colonials', prestige: 52, conferenceId: 'horizon' },
  
  // Missouri Valley
  { realName: 'Loyola Chicago', city: 'Chicago', state: 'IL', nickname: 'Ramblers', prestige: 73, conferenceId: 'mvc' },
  { realName: 'Drake', city: 'Des Moines', state: 'IA', nickname: 'Bulldogs', prestige: 68, conferenceId: 'mvc' },
  { realName: 'Bradley', city: 'Peoria', state: 'IL', nickname: 'Braves', prestige: 66, conferenceId: 'mvc' },
  { realName: 'Indiana State', city: 'Terre Haute', state: 'IN', nickname: 'Sycamores', prestige: 64, conferenceId: 'mvc' },
  { realName: 'Missouri State', city: 'Springfield', state: 'MO', nickname: 'Bears', prestige: 63, conferenceId: 'mvc' },
  { realName: 'Valparaiso', city: 'Valparaiso', state: 'IN', nickname: 'Beacons', prestige: 62, conferenceId: 'mvc' },
  { realName: 'Northern Iowa', city: 'Cedar Falls', state: 'IA', nickname: 'Panthers', prestige: 61, conferenceId: 'mvc' },
  { realName: 'Illinois State', city: 'Normal', state: 'IL', nickname: 'Redbirds', prestige: 60, conferenceId: 'mvc' },
  { realName: 'Southern Illinois', city: 'Carbondale', state: 'IL', nickname: 'Salukis', prestige: 59, conferenceId: 'mvc' },
  { realName: 'Evansville', city: 'Evansville', state: 'IN', nickname: 'Purple Aces', prestige: 58, conferenceId: 'mvc' },
  
  // Summit League
  { realName: 'South Dakota State', city: 'Brookings', state: 'SD', nickname: 'Jackrabbits', prestige: 66, conferenceId: 'summit' },
  { realName: 'Oral Roberts', city: 'Tulsa', state: 'OK', nickname: 'Golden Eagles', prestige: 64, conferenceId: 'summit' },
  { realName: 'North Dakota State', city: 'Fargo', state: 'ND', nickname: 'Bison', prestige: 62, conferenceId: 'summit' },
  { realName: 'Denver', city: 'Denver', state: 'CO', nickname: 'Pioneers', prestige: 60, conferenceId: 'summit' },
  { realName: 'Omaha', city: 'Omaha', state: 'NE', nickname: 'Mavericks', prestige: 58, conferenceId: 'summit' },
  { realName: 'South Dakota', city: 'Vermillion', state: 'SD', nickname: 'Coyotes', prestige: 57, conferenceId: 'summit' },
  { realName: 'Purdue Fort Wayne', city: 'Fort Wayne', state: 'IN', nickname: 'Mastodons', prestige: 56, conferenceId: 'summit' },
  { realName: 'Western Illinois', city: 'Macomb', state: 'IL', nickname: 'Leathernecks', prestige: 55, conferenceId: 'summit' },
  { realName: 'North Dakota', city: 'Grand Forks', state: 'ND', nickname: 'Fighting Hawks', prestige: 54, conferenceId: 'summit' },
  
  // WAC
  { realName: 'Grand Canyon', city: 'Phoenix', state: 'AZ', nickname: 'Antelopes', prestige: 65, conferenceId: 'wac' },
  { realName: 'New Mexico State', city: 'Las Cruces', state: 'NM', nickname: 'Aggies', prestige: 63, conferenceId: 'wac' },
  { realName: 'Utah Valley', city: 'Orem', state: 'UT', nickname: 'Wolverines', prestige: 61, conferenceId: 'wac' },
  { realName: 'Seattle', city: 'Seattle', state: 'WA', nickname: 'Redhawks', prestige: 59, conferenceId: 'wac' },
  { realName: 'Cal Baptist', city: 'Riverside', state: 'CA', nickname: 'Lancers', prestige: 57, conferenceId: 'wac' },
  { realName: 'Tarleton State', city: 'Stephenville', state: 'TX', nickname: 'Texans', prestige: 56, conferenceId: 'wac' },
  { realName: 'UT Rio Grande Valley', city: 'Edinburg', state: 'TX', nickname: 'Vaqueros', prestige: 55, conferenceId: 'wac' },
  { realName: 'Dixie State', city: 'St. George', state: 'UT', nickname: 'Trailblazers', prestige: 54, conferenceId: 'wac' },
  { realName: 'Chicago State', city: 'Chicago', state: 'IL', nickname: 'Cougars', prestige: 48, conferenceId: 'wac' },
  { realName: 'Southern Utah', city: 'Cedar City', state: 'UT', nickname: 'Thunderbirds', prestige: 53, conferenceId: 'wac' },
  { realName: 'Abilene Christian', city: 'Abilene', state: 'TX', nickname: 'Wildcats', prestige: 56, conferenceId: 'wac' },
  { realName: 'Sam Houston', city: 'Huntsville', state: 'TX', nickname: 'Bearkats', prestige: 58, conferenceId: 'wac' },
  
  // Big Sky
  { realName: 'Montana', city: 'Missoula', state: 'MT', nickname: 'Grizzlies', prestige: 66, conferenceId: 'big-sky' },
  { realName: 'Weber State', city: 'Ogden', state: 'UT', nickname: 'Wildcats', prestige: 65, conferenceId: 'big-sky' },
  { realName: 'Eastern Washington', city: 'Cheney', state: 'WA', nickname: 'Eagles', prestige: 63, conferenceId: 'big-sky' },
  { realName: 'Northern Colorado', city: 'Greeley', state: 'CO', nickname: 'Bears', prestige: 61, conferenceId: 'big-sky' },
  { realName: 'Montana State', city: 'Bozeman', state: 'MT', nickname: 'Bobcats', prestige: 60, conferenceId: 'big-sky' },
  { realName: 'Portland State', city: 'Portland', state: 'OR', nickname: 'Vikings', prestige: 58, conferenceId: 'big-sky' },
  { realName: 'Idaho State', city: 'Pocatello', state: 'ID', nickname: 'Bengals', prestige: 57, conferenceId: 'big-sky' },
  { realName: 'Sacramento State', city: 'Sacramento', state: 'CA', nickname: 'Hornets', prestige: 56, conferenceId: 'big-sky' },
  { realName: 'Idaho', city: 'Moscow', state: 'ID', nickname: 'Vandals', prestige: 55, conferenceId: 'big-sky' },
  { realName: 'Northern Arizona', city: 'Flagstaff', state: 'AZ', nickname: 'Lumberjacks', prestige: 54, conferenceId: 'big-sky' },
  { realName: 'Idaho', city: 'Moscow', state: 'ID', nickname: 'Vandals', prestige: 55, conferenceId: 'big-sky' },
  { realName: 'Northern Arizona', city: 'Flagstaff', state: 'AZ', nickname: 'Lumberjacks', prestige: 54, conferenceId: 'big-sky' },
  
  // Big West
  { realName: 'UC Santa Barbara', city: 'Santa Barbara', state: 'CA', nickname: 'Gauchos', prestige: 67, conferenceId: 'big-west' },
  { realName: 'UC Irvine', city: 'Irvine', state: 'CA', nickname: 'Anteaters', prestige: 65, conferenceId: 'big-west' },
  { realName: 'Long Beach State', city: 'Long Beach', state: 'CA', nickname: '49ers', prestige: 63, conferenceId: 'big-west' },
  { realName: 'Hawaii', city: 'Honolulu', state: 'HI', nickname: 'Rainbow Warriors', prestige: 62, conferenceId: 'big-west' },
  { realName: 'Cal State Fullerton', city: 'Fullerton', state: 'CA', nickname: 'Titans', prestige: 60, conferenceId: 'big-west' },
  { realName: 'UC Davis', city: 'Davis', state: 'CA', nickname: 'Aggies', prestige: 59, conferenceId: 'big-west' },
  { realName: 'Cal Poly', city: 'San Luis Obispo', state: 'CA', nickname: 'Mustangs', prestige: 57, conferenceId: 'big-west' },
  { realName: 'UC Riverside', city: 'Riverside', state: 'CA', nickname: 'Highlanders', prestige: 56, conferenceId: 'big-west' },
  { realName: 'Cal State Northridge', city: 'Northridge', state: 'CA', nickname: 'Matadors', prestige: 55, conferenceId: 'big-west' },
  { realName: 'UC San Diego', city: 'La Jolla', state: 'CA', nickname: 'Tritons', prestige: 54, conferenceId: 'big-west' },
  
  // OVC - Ohio Valley Conference
  { realName: 'Murray State', city: 'Murray', state: 'KY', nickname: 'Racers', prestige: 68, conferenceId: 'ovc' },
  { realName: 'Belmont', city: 'Nashville', state: 'TN', nickname: 'Bruins', prestige: 67, conferenceId: 'ovc' },
  { realName: 'Austin Peay', city: 'Clarksville', state: 'TN', nickname: 'Governors', prestige: 62, conferenceId: 'ovc' },
  { realName: 'Eastern Illinois', city: 'Charleston', state: 'IL', nickname: 'Panthers', prestige: 58, conferenceId: 'ovc' },
  { realName: 'Tennessee Tech', city: 'Cookeville', state: 'TN', nickname: 'Golden Eagles', prestige: 57, conferenceId: 'ovc' },
  { realName: 'Morehead State', city: 'Morehead', state: 'KY', nickname: 'Eagles', prestige: 56, conferenceId: 'ovc' },
  { realName: 'Jacksonville State', city: 'Jacksonville', state: 'AL', nickname: 'Gamecocks', prestige: 55, conferenceId: 'ovc' },
  { realName: 'Tennessee State', city: 'Nashville', state: 'TN', nickname: 'Tigers', prestige: 54, conferenceId: 'ovc' },
  { realName: 'Southeast Missouri State', city: 'Cape Girardeau', state: 'MO', nickname: 'Redhawks', prestige: 53, conferenceId: 'ovc' },
  { realName: 'Eastern Kentucky', city: 'Richmond', state: 'KY', nickname: 'Colonels', prestige: 52, conferenceId: 'ovc' },
  { realName: 'SIU Edwardsville', city: 'Edwardsville', state: 'IL', nickname: 'Cougars', prestige: 51, conferenceId: 'ovc' },
  { realName: 'UT Martin', city: 'Martin', state: 'TN', nickname: 'Skyhawks', prestige: 50, conferenceId: 'ovc' },
  
  // SoCon - Southern Conference
  { realName: 'Wofford', city: 'Spartanburg', state: 'SC', nickname: 'Terriers', prestige: 66, conferenceId: 'socon' },
  { realName: 'UNC Greensboro', city: 'Greensboro', state: 'NC', nickname: 'Spartans', prestige: 64, conferenceId: 'socon' },
  { realName: 'Furman', city: 'Greenville', state: 'SC', nickname: 'Paladins', prestige: 63, conferenceId: 'socon' },
  { realName: 'East Tennessee State', city: 'Johnson City', state: 'TN', nickname: 'Buccaneers', prestige: 62, conferenceId: 'socon' },
  { realName: 'Chattanooga', city: 'Chattanooga', state: 'TN', nickname: 'Mocs', prestige: 61, conferenceId: 'socon' },
  { realName: 'Mercer', city: 'Macon', state: 'GA', nickname: 'Bears', prestige: 60, conferenceId: 'socon' },
  { realName: 'Western Carolina', city: 'Cullowhee', state: 'NC', nickname: 'Catamounts', prestige: 58, conferenceId: 'socon' },
  { realName: 'Samford', city: 'Birmingham', state: 'AL', nickname: 'Bulldogs', prestige: 57, conferenceId: 'socon' },
  { realName: 'The Citadel', city: 'Charleston', state: 'SC', nickname: 'Bulldogs', prestige: 54, conferenceId: 'socon' },
  { realName: 'VMI', city: 'Lexington', state: 'VA', nickname: 'Keydets', prestige: 53, conferenceId: 'socon' },
  
  // Southland
  { realName: 'Stephen F. Austin', city: 'Nacogdoches', state: 'TX', nickname: 'Lumberjacks', prestige: 66, conferenceId: 'southland' },
  { realName: 'Nicholls State', city: 'Thibodaux', state: 'LA', nickname: 'Colonels', prestige: 60, conferenceId: 'southland' },
  { realName: 'Abilene Christian', city: 'Abilene', state: 'TX', nickname: 'Wildcats', prestige: 59, conferenceId: 'southland' },
  { realName: 'Southeastern Louisiana', city: 'Hammond', state: 'LA', nickname: 'Lions', prestige: 57, conferenceId: 'southland' },
  { realName: 'Texas A&M Corpus Christi', city: 'Corpus Christi', state: 'TX', nickname: 'Islanders', prestige: 56, conferenceId: 'southland' },
  { realName: 'McNeese State', city: 'Lake Charles', state: 'LA', nickname: 'Cowboys', prestige: 55, conferenceId: 'southland' },
  { realName: 'New Orleans', city: 'New Orleans', state: 'LA', nickname: 'Privateers', prestige: 54, conferenceId: 'southland' },
  { realName: 'Lamar', city: 'Beaumont', state: 'TX', nickname: 'Cardinals', prestige: 53, conferenceId: 'southland' },
  { realName: 'Northwestern State', city: 'Natchitoches', state: 'LA', nickname: 'Demons', prestige: 52, conferenceId: 'southland' },
  { realName: 'Houston Baptist', city: 'Houston', state: 'TX', nickname: 'Huskies', prestige: 51, conferenceId: 'southland' },
  { realName: 'Central Arkansas', city: 'Conway', state: 'AR', nickname: 'Bears', prestige: 50, conferenceId: 'southland' },
  { realName: 'Incarnate Word', city: 'San Antonio', state: 'TX', nickname: 'Cardinals', prestige: 49, conferenceId: 'southland' },
  
  // NEC - Northeast Conference
  { realName: 'Wagner', city: 'Staten Island', state: 'NY', nickname: 'Seahawks', prestige: 62, conferenceId: 'nec' },
  { realName: 'Bryant', city: 'Smithfield', state: 'RI', nickname: 'Bulldogs', prestige: 60, conferenceId: 'nec' },
  { realName: 'Merrimack', city: 'North Andover', state: 'MA', nickname: 'Warriors', prestige: 58, conferenceId: 'nec' },
  { realName: 'Mount St. Mary\'s', city: 'Emmitsburg', state: 'MD', nickname: 'Mountaineers', prestige: 57, conferenceId: 'nec' },
  { realName: 'St. Francis Brooklyn', city: 'Brooklyn', state: 'NY', nickname: 'Terriers', prestige: 56, conferenceId: 'nec' },
  { realName: 'LIU', city: 'Brooklyn', state: 'NY', nickname: 'Sharks', prestige: 55, conferenceId: 'nec' },
  { realName: 'Sacred Heart', city: 'Fairfield', state: 'CT', nickname: 'Pioneers', prestige: 54, conferenceId: 'nec' },
  { realName: 'Central Connecticut', city: 'New Britain', state: 'CT', nickname: 'Blue Devils', prestige: 53, conferenceId: 'nec' },
  { realName: 'Fairleigh Dickinson', city: 'Teaneck', state: 'NJ', nickname: 'Knights', prestige: 52, conferenceId: 'nec' },
  { realName: 'St. Francis (PA)', city: 'Loretto', state: 'PA', nickname: 'Red Flash', prestige: 51, conferenceId: 'nec' },
  
  // Big South
  { realName: 'Winthrop', city: 'Rock Hill', state: 'SC', nickname: 'Eagles', prestige: 64, conferenceId: 'big-south' },
  { realName: 'Radford', city: 'Radford', state: 'VA', nickname: 'Highlanders', prestige: 61, conferenceId: 'big-south' },
  { realName: 'Campbell', city: 'Buies Creek', state: 'NC', nickname: 'Fighting Camels', prestige: 59, conferenceId: 'big-south' },
  { realName: 'Gardner-Webb', city: 'Boiling Springs', state: 'NC', nickname: 'Runnin\' Bulldogs', prestige: 58, conferenceId: 'big-south' },
  { realName: 'UNC Asheville', city: 'Asheville', state: 'NC', nickname: 'Bulldogs', prestige: 57, conferenceId: 'big-south' },
  { realName: 'Charleston Southern', city: 'Charleston', state: 'SC', nickname: 'Buccaneers', prestige: 56, conferenceId: 'big-south' },
  { realName: 'High Point', city: 'High Point', state: 'NC', nickname: 'Panthers', prestige: 55, conferenceId: 'big-south' },
  { realName: 'Presbyterian', city: 'Clinton', state: 'SC', nickname: 'Blue Hose', prestige: 54, conferenceId: 'big-south' },
  { realName: 'Longwood', city: 'Farmville', state: 'VA', nickname: 'Lancers', prestige: 53, conferenceId: 'big-south' },
  { realName: 'USC Upstate', city: 'Spartanburg', state: 'SC', nickname: 'Spartans', prestige: 52, conferenceId: 'big-south' },
  
  // MEAC
  { realName: 'Norfolk State', city: 'Norfolk', state: 'VA', nickname: 'Spartans', prestige: 62, conferenceId: 'meac' },
  { realName: 'North Carolina Central', city: 'Durham', state: 'NC', nickname: 'Eagles', prestige: 60, conferenceId: 'meac' },
  { realName: 'Morgan State', city: 'Baltimore', state: 'MD', nickname: 'Bears', prestige: 58, conferenceId: 'meac' },
  { realName: 'Howard', city: 'Washington', state: 'DC', nickname: 'Bison', prestige: 57, conferenceId: 'meac' },
  { realName: 'Bethune-Cookman', city: 'Daytona Beach', state: 'FL', nickname: 'Wildcats', prestige: 56, conferenceId: 'meac' },
  { realName: 'North Carolina A&T', city: 'Greensboro', state: 'NC', nickname: 'Aggies', prestige: 55, conferenceId: 'meac' },
  { realName: 'Delaware State', city: 'Dover', state: 'DE', nickname: 'Hornets', prestige: 54, conferenceId: 'meac' },
  { realName: 'South Carolina State', city: 'Orangeburg', state: 'SC', nickname: 'Bulldogs', prestige: 53, conferenceId: 'meac' },
  { realName: 'Coppin State', city: 'Baltimore', state: 'MD', nickname: 'Eagles', prestige: 52, conferenceId: 'meac' },
  { realName: 'Maryland Eastern Shore', city: 'Princess Anne', state: 'MD', nickname: 'Hawks', prestige: 51, conferenceId: 'meac' },
  { realName: 'Florida A&M', city: 'Tallahassee', state: 'FL', nickname: 'Rattlers', prestige: 50, conferenceId: 'meac' },
  
  // SWAC
  { realName: 'Texas Southern', city: 'Houston', state: 'TX', nickname: 'Tigers', prestige: 61, conferenceId: 'swac' },
  { realName: 'Prairie View A&M', city: 'Prairie View', state: 'TX', nickname: 'Panthers', prestige: 59, conferenceId: 'swac' },
  { realName: 'Grambling State', city: 'Grambling', state: 'LA', nickname: 'Tigers', prestige: 57, conferenceId: 'swac' },
  { realName: 'Southern', city: 'Baton Rouge', state: 'LA', nickname: 'Jaguars', prestige: 56, conferenceId: 'swac' },
  { realName: 'Alabama State', city: 'Montgomery', state: 'AL', nickname: 'Hornets', prestige: 55, conferenceId: 'swac' },
  { realName: 'Jackson State', city: 'Jackson', state: 'MS', nickname: 'Tigers', prestige: 54, conferenceId: 'swac' },
  { realName: 'Alcorn State', city: 'Lorman', state: 'MS', nickname: 'Braves', prestige: 53, conferenceId: 'swac' },
  { realName: 'Arkansas-Pine Bluff', city: 'Pine Bluff', state: 'AR', nickname: 'Golden Lions', prestige: 52, conferenceId: 'swac' },
  { realName: 'Mississippi Valley State', city: 'Itta Bena', state: 'MS', nickname: 'Delta Devils', prestige: 51, conferenceId: 'swac' },
  { realName: 'Alabama A&M', city: 'Normal', state: 'AL', nickname: 'Bulldogs', prestige: 50, conferenceId: 'swac' },
  { realName: 'Bethune-Cookman', city: 'Daytona Beach', state: 'FL', nickname: 'Wildcats', prestige: 49, conferenceId: 'swac' },
  
  // America East
  { realName: 'Vermont', city: 'Burlington', state: 'VT', nickname: 'Catamounts', prestige: 68, conferenceId: 'america-east' },
  { realName: 'Stony Brook', city: 'Stony Brook', state: 'NY', nickname: 'Seawolves', prestige: 63, conferenceId: 'america-east' },
  { realName: 'UMBC', city: 'Baltimore', state: 'MD', nickname: 'Retrievers', prestige: 61, conferenceId: 'america-east' },
  { realName: 'Albany', city: 'Albany', state: 'NY', nickname: 'Great Danes', prestige: 59, conferenceId: 'america-east' },
  { realName: 'New Hampshire', city: 'Durham', state: 'NH', nickname: 'Wildcats', prestige: 57, conferenceId: 'america-east' },
  { realName: 'Hartford', city: 'West Hartford', state: 'CT', nickname: 'Hawks', prestige: 56, conferenceId: 'america-east' },
  { realName: 'Binghamton', city: 'Vestal', state: 'NY', nickname: 'Bearcats', prestige: 55, conferenceId: 'america-east' },
  { realName: 'Maine', city: 'Orono', state: 'ME', nickname: 'Black Bears', prestige: 54, conferenceId: 'america-east' },
  { realName: 'UMass Lowell', city: 'Lowell', state: 'MA', nickname: 'River Hawks', prestige: 53, conferenceId: 'america-east' },
  
  // ASUN
  { realName: 'Liberty', city: 'Lynchburg', state: 'VA', nickname: 'Flames', prestige: 67, conferenceId: 'asun' },
  { realName: 'Lipscomb', city: 'Nashville', state: 'TN', nickname: 'Bisons', prestige: 63, conferenceId: 'asun' },
  { realName: 'Florida Gulf Coast', city: 'Fort Myers', state: 'FL', nickname: 'Eagles', prestige: 62, conferenceId: 'asun' },
  { realName: 'North Florida', city: 'Jacksonville', state: 'FL', nickname: 'Ospreys', prestige: 59, conferenceId: 'asun' },
  { realName: 'Jacksonville', city: 'Jacksonville', state: 'FL', nickname: 'Dolphins', prestige: 58, conferenceId: 'asun' },
  { realName: 'Kennesaw State', city: 'Kennesaw', state: 'GA', nickname: 'Owls', prestige: 57, conferenceId: 'asun' },
  { realName: 'Stetson', city: 'DeLand', state: 'FL', nickname: 'Hatters', prestige: 56, conferenceId: 'asun' },
  { realName: 'Bellarmine', city: 'Louisville', state: 'KY', nickname: 'Knights', prestige: 55, conferenceId: 'asun' },
  { realName: 'Central Arkansas', city: 'Conway', state: 'AR', nickname: 'Bears', prestige: 54, conferenceId: 'asun' },
  { realName: 'Eastern Kentucky', city: 'Richmond', state: 'KY', nickname: 'Colonels', prestige: 53, conferenceId: 'asun' },
  { realName: 'North Alabama', city: 'Florence', state: 'AL', nickname: 'Lions', prestige: 52, conferenceId: 'asun' },
  { realName: 'Queens', city: 'Charlotte', state: 'NC', nickname: 'Royals', prestige: 51, conferenceId: 'asun' },
  
  // MAAC
  { realName: 'Iona', city: 'New Rochelle', state: 'NY', nickname: 'Gaels', prestige: 68, conferenceId: 'maac' },
  { realName: 'Rider', city: 'Lawrenceville', state: 'NJ', nickname: 'Broncs', prestige: 63, conferenceId: 'maac' },
  { realName: 'Monmouth', city: 'West Long Branch', state: 'NJ', nickname: 'Hawks', prestige: 62, conferenceId: 'maac' },
  { realName: 'Canisius', city: 'Buffalo', state: 'NY', nickname: 'Golden Griffins', prestige: 60, conferenceId: 'maac' },
  { realName: 'Siena', city: 'Loudonville', state: 'NY', nickname: 'Saints', prestige: 59, conferenceId: 'maac' },
  { realName: 'Manhattan', city: 'Riverdale', state: 'NY', nickname: 'Jaspers', prestige: 58, conferenceId: 'maac' },
  { realName: 'Quinnipiac', city: 'Hamden', state: 'CT', nickname: 'Bobcats', prestige: 57, conferenceId: 'maac' },
  { realName: 'Marist', city: 'Poughkeepsie', state: 'NY', nickname: 'Red Foxes', prestige: 56, conferenceId: 'maac' },
  { realName: 'Fairfield', city: 'Fairfield', state: 'CT', nickname: 'Stags', prestige: 55, conferenceId: 'maac' },
  { realName: 'Niagara', city: 'Lewiston', state: 'NY', nickname: 'Purple Eagles', prestige: 54, conferenceId: 'maac' },
  { realName: 'Saint Peter\'s', city: 'Jersey City', state: 'NJ', nickname: 'Peacocks', prestige: 53, conferenceId: 'maac' },
]

/**
 * Generate teams.csv content
 */
function generateTeamsCSV(): string {
  const lines: string[] = ['id,name,city,state,nickname,prestige,conferenceId']
  
  const usedIds = new Set<string>()
  
  for (const team of REAL_TEAMS) {
    const { name, id } = createFictionalName(team.realName, team.city, team.nickname)
    const fictionalNickname = createFictionalNickname(team.nickname, team.city)
    // Keep real city names - they're allowed
    const cityName = team.city
    
    // Ensure unique ID
    let uniqueId = id
    let counter = 1
    while (usedIds.has(uniqueId)) {
      uniqueId = `${id}${counter}`
      counter++
    }
    usedIds.add(uniqueId)
    
    const line = [
      uniqueId,
      name,
      cityName, // Use real city name (allowed)
      team.state,
      fictionalNickname, // Use fictional nickname (required)
      team.prestige.toString(),
      team.conferenceId,
    ].join(',')
    
    lines.push(line)
  }
  
  return lines.join('\n')
}

/**
 * Main execution
 */
// Write CSV to stdout (can be piped to file)
const csv = generateTeamsCSV()
console.log(csv)

// Also log stats to stderr
const stats = {
  totalTeams: REAL_TEAMS.length,
  conferences: new Set(REAL_TEAMS.map(t => t.conferenceId)).size,
  avgPrestige: Math.round(REAL_TEAMS.reduce((sum, t) => sum + t.prestige, 0) / REAL_TEAMS.length),
  maxPrestige: Math.max(...REAL_TEAMS.map(t => t.prestige)),
  minPrestige: Math.min(...REAL_TEAMS.map(t => t.prestige)),
}

console.error('\n📊 Team Generation Stats:')
console.error(`   Total Teams: ${stats.totalTeams}`)
console.error(`   Conferences: ${stats.conferences}`)
console.error(`   Prestige Range: ${stats.minPrestige}-${stats.maxPrestige} (avg: ${stats.avgPrestige})`)

export { generateTeamsCSV, REAL_TEAMS, createFictionalName }
