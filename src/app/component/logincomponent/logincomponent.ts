import { Component, inject } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { Api } from '../../core/service/api';
import { User } from '../../core/module/user.model';
import { Router } from '@angular/router';

/**
 * @title Basic use of `<table mat-table>`
 */
@Component({
  selector: 'app-login-component',
  styleUrl: 'logincomponent.scss',
  templateUrl: 'logincomponent.html',
  standalone: true,
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
  api = inject(Api);
  loginForm: FormGroup;

  // eslint-disable-next-line @angular-eslint/prefer-inject
  constructor(private fb: FormBuilder, private router: Router) {
    this.loginForm = this.fb.group({
      userName: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  onClickLogin() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched(); // Optional: shows validation messages
      return;
    }

    const user: User = {
      userName: this.loginForm.get('userName')?.value || '',
      password: this.loginForm.get('password')?.value || '',
    };

    this.api.postLogin(user).subscribe({
      next: (data) => {
        localStorage.setItem('token', data.token);
      },
      error: (error) => {
        console.error('Error fetching data from API:', error);
      },
      complete: () => {
        this.router.navigate(['/parts']);
      },
    });
  }
}
