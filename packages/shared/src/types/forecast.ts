export interface ForecastEvent {
  type:        'RENT' | 'SALARY' | 'SUBSCRIPTION' | 'IMPULSE_RISK' | 'GOAL_MILESTONE';
  description: string;
  amount?:     number;
  probability: number;  // 0.0–1.0
}

export interface ForecastPoint {
  date:             string;   // ISO date YYYY-MM-DD
  projectedBalance: number;   // EUR
  lowerBound:       number;   // 80% confidence interval lower
  upperBound:       number;   // 80% confidence interval upper
  events:           ForecastEvent[];
}
