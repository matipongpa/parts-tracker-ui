import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Part } from '../module/part.model';
import { Observable } from 'rxjs';
import { Token, User } from '../module/user.model';

@Injectable({
  providedIn: 'root',
})
export class Api {
  private apiUrl = 'http://localhost:8080/api';

  http = inject(HttpClient);

  getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  postLogin(user: User): Observable<Token> {
    return this.http.post<Token>(`${this.apiUrl}/login`, user, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      }),
    });
  }

  getAllParts(): Observable<Part[]> {
    return this.http.get<Part[]>(`${this.apiUrl}/part`, {
      headers: this.getHeaders(),
    });
  }

  getPartswithParam(partNumber: string, value: string): Observable<Part[]> {
    return this.http.get<Part[]>(`${this.apiUrl}/part`, {
      headers: this.getHeaders(),
      params: {
        partNumber: partNumber,
        value: value,
      },
    });
  }
}
