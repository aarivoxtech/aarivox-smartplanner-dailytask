import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { catchError, map, mergeMap, switchMap } from 'rxjs/operators';
import * as TaskActions from './task.actions';
import { Task } from '../../models/task.model';
import { environment } from '../../../../environments/environment';

@Injectable()
export class TaskEffects {
  private actions$ = inject(Actions);
  private http = inject(HttpClient);

  loadTasks$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TaskActions.loadTasks),
      switchMap(() =>
        this.http.get<Task[]>(`${environment.apiUrl}/tasks`).pipe(
          map(tasks => TaskActions.loadTasksSuccess({ tasks })),
          catchError(error => of(TaskActions.loadTasksFailure({ error })))
        )
      )
    )
  );

  addTask$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TaskActions.addTask),
      mergeMap(({ task }) =>
        this.http.post<Task>(`${environment.apiUrl}/tasks`, task).pipe(
          map(savedTask => TaskActions.addTaskSuccess({ task: savedTask })),
          catchError(error => of(TaskActions.addTaskFailure({ error })))
        )
      )
    )
  );
}
