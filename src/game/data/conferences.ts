// src/game/data/conferences.ts
// Conference definitions with completely fictional names
// All names are original and not based on real trademarks

import type { Conference, ID } from '../types/dynasty'

/**
 * Major conferences with original fictional names.
 * Team assignments will be made when teams are loaded from CSV.
 */
export const CONFERENCES: Conference[] = [
  {
    id: 'acc',
    name: 'Eastern Collegiate League',
    teamIds: [], // Will be populated from teams.csv based on conferenceId
  },
  {
    id: 'big-ten',
    name: 'Northern Collegiate Conference',
    teamIds: [],
  },
  {
    id: 'sec',
    name: 'Southeastern Collegiate League',
    teamIds: [],
  },
  {
    id: 'big-12',
    name: 'Central Collegiate Conference',
    teamIds: [],
  },
  {
    id: 'pac-12',
    name: 'Western Collegiate League',
    teamIds: [],
  },
  {
    id: 'big-east',
    name: 'Atlantic Collegiate Conference',
    teamIds: [],
  },
  {
    id: 'aac',
    name: 'American Collegiate Conference',
    teamIds: [],
  },
  {
    id: 'mwc',
    name: 'Mountain Collegiate League',
    teamIds: [],
  },
  {
    id: 'a10',
    name: 'Atlantic Collegiate League',
    teamIds: [],
  },
  {
    id: 'wcc',
    name: 'Pacific Collegiate Conference',
    teamIds: [],
  },
  {
    id: 'mac',
    name: 'Midwestern Collegiate League',
    teamIds: [],
  },
  {
    id: 'cusa',
    name: 'Continental Collegiate Conference',
    teamIds: [],
  },
  {
    id: 'sun-belt',
    name: 'Southern Regional Conference',
    teamIds: [],
  },
  {
    id: 'ivy',
    name: 'Heritage Collegiate League',
    teamIds: [],
  },
  {
    id: 'patriot',
    name: 'Independent Schools League',
    teamIds: [],
  },
  {
    id: 'horizon',
    name: 'Horizon Collegiate Conference',
    teamIds: [],
  },
  {
    id: 'mvc',
    name: 'Valley Collegiate League',
    teamIds: [],
  },
  {
    id: 'wac',
    name: 'Western Independent Conference',
    teamIds: [],
  },
  {
    id: 'big-sky',
    name: 'Mountain States Conference',
    teamIds: [],
  },
  {
    id: 'big-west',
    name: 'Western States Conference',
    teamIds: [],
  },
  {
    id: 'c-usa',
    name: 'Interstate Collegiate Conference',
    teamIds: [],
  },
  {
    id: 'ovc',
    name: 'Ohio River Conference',
    teamIds: [],
  },
  {
    id: 'socon',
    name: 'Southern Conference League',
    teamIds: [],
  },
  {
    id: 'southland',
    name: 'Gulf States Conference',
    teamIds: [],
  },
  {
    id: 'summit',
    name: 'Summit Collegiate League',
    teamIds: [],
  },
  {
    id: 'nec',
    name: 'Northeastern Collegiate Conference',
    teamIds: [],
  },
  {
    id: 'big-south',
    name: 'South Atlantic Conference',
    teamIds: [],
  },
  {
    id: 'meac',
    name: 'Eastern Collegiate Athletic Conference',
    teamIds: [],
  },
  {
    id: 'swac',
    name: 'Southwest Collegiate Conference',
    teamIds: [],
  },
  {
    id: 'america-east',
    name: 'Northeast Independent League',
    teamIds: [],
  },
  {
    id: 'asun',
    name: 'ASUN Alliance',
    teamIds: [],
  },
  {
    id: 'maac',
    name: 'MAAC Alliance',
    teamIds: [],
  },
]

export function getConferenceById(id: string): Conference | undefined {
  return CONFERENCES.find(c => c.id === id)
}

export function getConferencesForTeams(teams: Array<{ id: ID; conferenceId?: string }>): Conference[] {
  const updated = CONFERENCES.map(conf => ({
    ...conf,
    teamIds: teams.filter(t => t.conferenceId === conf.id).map(t => t.id),
  }))
  return updated.filter(conf => conf.teamIds.length > 0)
}
