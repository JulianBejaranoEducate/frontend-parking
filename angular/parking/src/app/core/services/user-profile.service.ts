import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environments';

@Injectable({ providedIn: 'root' })
export class UserProfileService {
    private readonly http = inject(HttpClient);

    async syncCurrentUser(displayName: string | null): Promise<void> {
        const name = displayName?.trim() ?? '';
        const nameLength = Array.from(name).length;

        if (nameLength < 2 || nameLength > 100 || !/^\p{L}+(?:[ ]*\p{L}+)*$/u.test(name)) {
            throw new Error('Firebase display name is missing or invalid');
        }

        await firstValueFrom(this.http.post<void>(`${environment.apiUrl}/users`, { name }));
    }
}