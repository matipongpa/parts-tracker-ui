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
import { PageEvent, MatPaginatorModule } from '@angular/material/paginator';
import { count } from 'rxjs';

/**
 * @title Basic use of `<table mat-table>`
 */

const defaultPageIndex = 0;
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
    MatPaginatorModule,
  ],
})
export class Partlistcomponent implements OnInit {
  api = inject(Api);
  router = inject(Router);

  isShowFilter = false;
  dataSource: Part[] = [];
  searchFormControl = new FormControl('', []);
  //ngModel
  pcbRef = '';
  value = '';
  description = '';
  type = '';
  partNumber = '';

  length = 50;
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [10, 100];
  showPageSizeOption = true;

  handlePageEvent(e: PageEvent) {
    this.pageSize = e.pageSize;
    this.pageIndex = e.pageIndex;
    this.HandleGetPartParam(this.pageIndex, this.pageSize);
  }

  ngOnInit(): void {
    this.FetchPartData();
  }

  async onSearch() {
    this.HandleGetPartParam(defaultPageIndex, this.pageSize);
  }

  async FetchPartData() {
    this.api.getParts().subscribe({
      next: (res) => {
        this.dataSource = res.list;
        this.length = res.count;
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

  async HandleGetPartParam(pageIndex: number, pageSize: number) {
    this.api
      .getParts(
        this.pcbRef,
        this.partNumber,
        this.value,
        this.description,
        this.type,
        pageIndex,
        pageSize
      )
      .subscribe({
        next: (res) => {
          this.dataSource = res.list;
          this.length = res.count;
        },
        error: (error) => {
          console.error('Error fetching data from API:', error);
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
    'pcb-ref',
    'part_number',
    'description',
    'type',
    'values',
  ];
}
