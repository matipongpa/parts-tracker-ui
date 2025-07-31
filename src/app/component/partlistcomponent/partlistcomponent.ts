import { Component, inject, OnInit } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { Api } from '../../core/service/api';
import { Part } from '../../core/module/part.model';
import { MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Router } from '@angular/router';
import { Profilecomponent } from '../profilecomponent/profilecomponent';

/**
 * @title Basic use of `<table mat-table>`
 */
@Component({
  selector: 'app-part-list-component',
  styleUrl: 'partlistcomponent.scss',
  templateUrl: 'partlistcomponent.html',
  imports: [
    FormsModule,
    MatTableModule,
    MatSortModule,
    MatInputModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    CommonModule,
    Profilecomponent,
  ],
})
export class Partlistcomponent implements OnInit {
  api = inject(Api);
  router = inject(Router);
  isShowFilter = false;
  dataSource: Part[] = [];
  searchFormControl = new FormControl('', []);
  //ngModel
  partNumber = '';
  value = '';

  ngOnInit(): void {
    this.FetchPartData();
  }

  async onSearch() {
    this.api.getPartswithParam(this.partNumber, this.value).subscribe({
      next: (data) => {
        this.dataSource = data;
      },
      error: (error) => {
        console.error('Error fetching data from API:', error);
      },
      complete: () => {
        console.log('API call completed.');
      },
    });
  }

  async FetchPartData() {
    this.api.getAllParts().subscribe({
      next: (data) => {
        this.dataSource = data;
      },
      error: (error) => {
        console.error('Error fetching data from API:', error);
        if (
          (error as HttpErrorResponse).status === HttpStatusCode.Unauthorized
        ) {
          this.router.navigate(['/login']);
        }
      },
      complete: () => {
        console.log('API call completed.');
      },
    });
  }

  onClickFilter() {
    this.isShowFilter = !this.isShowFilter;
    this.FetchPartData();
  }

  displayedColumns: string[] = [
    'id',
    'part_number',
    'description',
    'type',
    'values',
  ];
}
