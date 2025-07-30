import { Routes } from '@angular/router';
import { Partlistcomponent } from './component/partlistcomponent/partlistcomponent';
import { Logincomponent } from './component/logincomponent/logincomponent';

export const routes: Routes = [
  { path: '', redirectTo: 'log-in', pathMatch: 'full' },
  { path: 'parts', component: Partlistcomponent },
  { path: 'log-in', component: Logincomponent },
];
