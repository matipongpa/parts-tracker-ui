import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Part } from '../module/part.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Api {
  private apiUrl = 'http://localhost:8080/api';

  http = inject(HttpClient);

  headers = new HttpHeaders({
    'Content-Type': 'application/json', // HttpClient usually defaults to this for JSON bodies
  });

  getAllParts(): Observable<Part[]> {
    return this.http.get<Part[]>(`${this.apiUrl}/part`, {
      headers: this.headers,
    });
  }

  getPartswithParam(partNumber: string, value: string): Observable<Part[]> {
    return this.http.get<Part[]>(`${this.apiUrl}/part`, {
      headers: this.headers,
      params: {
        partNumber: partNumber,
        value: value,
      },
    });
  }
}
