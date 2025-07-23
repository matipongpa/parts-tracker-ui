import { Routes } from '@angular/router';
import { Partlistcomponent } from './partlistcomponent/partlistcomponent';

export const routes: Routes = [
  { path: '', redirectTo: 'parts', pathMatch: 'full' },
  { path: 'parts', component: Partlistcomponent },
];
