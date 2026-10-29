export interface Team {
  id: number | null;
  name: string;
  shortName: string;
  crest: string | null;
}
export interface Goal {
  teamId: number | null;
  scorer: string;
  minute: number | null;
  injuryTime: number | null;
  type: string;
}
export interface BroadcastInfo {
  channels: string[];
  status: 'confirmed' | 'review' | 'unconfirmed' | 'unavailable';
  source: 'GE' | 'CBF' | null;
  sourceUrl: string | null;
  checkedAt: string | null;
  stale: boolean;
}
export interface Match {
  id: number;
  utcDate: string;
  status: string;
  minute: number | null;
  venue: string | null;
  competition: { code: string; name: string };
  homeTeam: Team;
  awayTeam: Team;
  goals: Goal[];
  broadcast: BroadcastInfo;
  score: {
    winner: string | null;
    fullTime: { home: number | null; away: number | null };
  };
}
export interface MatchDayResponse {
  date: string;
  timezone: string;
  fetchedAt: string;
  stale: boolean;
  matchesSource: 'ge' | 'football-data.org' | 'cbf';
  broadcastsAvailable: boolean;
  broadcastsCheckedAt: string | null;
  goalEventsAvailable: boolean | null;
  matches: Match[];
}
export interface MatchPreviewTeam {
  teamId: number | null;
  teamName: string;
  probableLineup: string | null;
  suspended: string | null;
  injured: string | null;
  otherAbsences: string | null;
}
export interface MatchPreview {
  available: boolean;
  source: 'GE' | null;
  sourceUrl: string | null;
  matchPageUrl: string | null;
  title: string | null;
  summary: string | null;
  updatedAt: string | null;
  stale: boolean;
  teams: MatchPreviewTeam[];
  message: string;
}
