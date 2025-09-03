import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Part, PartResponse } from '../module/part.model';
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

  getParts(
    pcbRef?: string,
    partNumber?: string,
    value?: string,
    description?: string,
    type?: string,
    page?: number,
    pageSize?: number
  ): Observable<PartResponse> {
    return this.http.get<PartResponse>(`${this.apiUrl}/part`, {
      headers: this.getHeaders(),
      params: {
        pcb_ref: pcbRef ?? '',
        part_number: partNumber ?? '',
        value: value ?? '',
        description: description ?? '',
        type: type ?? '',
        page: page ?? 0,
        page_size: pageSize ?? 10,
      },
    });
  }
}
