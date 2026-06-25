import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import * as TaskActions from './task.actions';
import * as TaskSelectors from './task.selectors';
import { Task } from '../../models/task.model';

@Injectable({
  providedIn: 'root'
})
export class TaskFacade {
  private store = inject(Store);

  tasks$ = this.store.select(TaskSelectors.selectAllTasks);
  loading$ = this.store.select(TaskSelectors.selectTasksLoading);
  error$ = this.store.select(TaskSelectors.selectTasksError);

  loadTasks() {
    this.store.dispatch(TaskActions.loadTasks());
  }

  addTask(task: Omit<Task, 'id' | 'createdAt'>) {
    this.store.dispatch(TaskActions.addTask({ task }));
  }

  updateTask(task: Task) {
    this.store.dispatch(TaskActions.updateTask({ task }));
  }

  deleteTask(id: string) {
    this.store.dispatch(TaskActions.deleteTask({ id }));
  }
}
