import { Component } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';

/**
 * @title Basic use of `<table mat-table>`
 */
@Component({
  selector: 'app-login-component',
  styleUrl: 'logincomponent.scss',
  templateUrl: 'logincomponent.html',
  imports: [
    FormsModule,
    MatTableModule,
    MatSortModule,
    MatInputModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    CommonModule,
  ],
})
export class Logincomponent {
  userName = '';
  password = '';

  onClickLogin() {
    console.log(this.userName);
  }
}
