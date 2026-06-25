import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TaskState } from './task.reducer';

export const selectTaskState = createFeatureSelector<TaskState>('tasks');

export const selectAllTasks = createSelector(
  selectTaskState,
  state => state.tasks
);

export const selectTasksLoading = createSelector(
  selectTaskState,
  state => state.loading
);

export const selectTasksError = createSelector(
  selectTaskState,
  state => state.error
);
