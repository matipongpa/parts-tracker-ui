import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Part } from '../module/part.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Api {
  private apiUrl = 'http://localhost:8080/api';

  constructor(private http: HttpClient) {}

  headers = new HttpHeaders({
    'Content-Type': 'application/json', // HttpClient usually defaults to this for JSON bodies
  });

  getParts(): Observable<Part[]> {
    return this.http.get<Part[]>(`${this.apiUrl}/part`, {
      headers: this.headers,
    });
  }
}
