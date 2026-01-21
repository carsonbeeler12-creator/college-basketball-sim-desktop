export type Screen =
  | 'home'
  | 'newDynasty'
  | 'dynastyHub'
  | 'roster'
  | 'rotation'
  | 'sim'
  | 'simResults'
  | 'boxScore'
  | 'recruiting'
  | 'draftDepartures'
  | 'standings'
  | 'teamDetail'
  | 'bracket'
  | 'conferenceTournaments'

export type PlayerAward =
  | 'PLAYER_OF_THE_YEAR'
  | 'ALL_AMERICAN_FIRST'
  | 'ALL_AMERICAN_SECOND'
  | 'ALL_AMERICAN_THIRD'
  | 'ALL_CONFERENCE_FIRST'
  | 'ALL_CONFERENCE_SECOND'
  | 'FRESHMAN_OF_THE_YEAR'
  | 'DEFENSIVE_PLAYER_OF_THE_YEAR'
  | 'SIXTH_MAN_OF_THE_YEAR'

export type Team = {
  id: string
  name: string
  city: string
  state: string
  nickname: string
  prestige: number
  conferenceId?: string // Conference ID (e.g., "acc", "big-ten", "sec")
}
