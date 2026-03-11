import type { SeasonalTask } from "./seasonal-tasks";

export interface VisibleReminder extends SeasonalTask {
  seasonYear: number;
}
