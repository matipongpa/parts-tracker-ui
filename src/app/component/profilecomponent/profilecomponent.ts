import { Component, inject, Injectable } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
/**
 * @title Basic use of `<table mat-table>`
 */
@Component({
  selector: 'app-profile-component',
  styleUrl: 'profilecomponent.scss',
  templateUrl: 'profilecomponent.html',
  standalone: true,
  imports: [MatButtonModule],
})
export class Profilecomponent {
  router = inject(Router);

  onClickLogOut() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
