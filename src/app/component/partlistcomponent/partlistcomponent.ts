import { Component } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { Api } from '../../core/service/api';
import { Part } from '../../core/module/part.model';

/**
 * @title Basic use of `<table mat-table>`
 */
@Component({
  selector: 'part-list-component',
  styleUrl: 'partlistcomponent.scss',
  templateUrl: 'partlistcomponent.html',
  imports: [MatTableModule],
})
export class Partlistcomponent {
  constructor(private api: Api) {}

  dataSource: Part[] = [];

  ngOnInit(): void {
    this.FetchPartData();
  }

  async FetchPartData() {
    this.api.getParts().subscribe({
      next: (data) => {
        this.dataSource = data;
        console.log('Data fetched from API:', data);
      },
      error: (error) => {
        console.error('Error fetching data from API:', error);
      },
      complete: () => {
        console.log('API call completed.');
      },
    });
  }
  displayedColumns: string[] = [
    'id',
    'part_number',
    'description',
    'type',
    'values',
  ];
}
