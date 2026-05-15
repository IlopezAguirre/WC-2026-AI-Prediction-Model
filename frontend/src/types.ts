export interface TeamProbabilities {
  winner: number;
  final: number;
  semi: number;
  quarter: number;
}

export interface Predictions {
  [team: string]: TeamProbabilities;
}

export interface Match {
  group: string;
  home: string;
  away: string;
  predicted_home_goals: number;
  predicted_away_goals: number;
}

export interface TeamStanding {
  team: string;
  points: number;
  gf: number;
  ga: number;
  gd: number;
}

export interface Standings {
  [group: string]: TeamStanding[];
}
