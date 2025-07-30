import { Routes } from '@angular/router';
import { Partlistcomponent } from './component/partlistcomponent/partlistcomponent';
import { Logincomponent } from './component/logincomponent/logincomponent';
import { AuthGuard } from './auth-guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'parts', component: Partlistcomponent, canActivate: [AuthGuard] },
  { path: 'login', component: Logincomponent },
];
