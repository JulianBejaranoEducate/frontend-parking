import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environments';

export interface BackendUser {
  id: string;
  name: string;
  email: string;
  roleId: number;
  status_user: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);
  
  getUnactiveUsers(): Promise<BackendUser[]> {
    return firstValueFrom(this.http.get<BackendUser[]>(`${environment.apiUrl}/users/unactive`));
  }

  activateUser(id: string): Promise<void> {
    return firstValueFrom(this.http.put<void>(`${environment.apiUrl}/users/activate/${id}`, {}));
  }

  deactivateUser(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${environment.apiUrl}/users/deactivate/${id}`));
  }
}
