import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  email = 'global.admin@example.com';
  password = 'Password123!';

  submit(): void {
    this.errorMessage.set(null);

    if (!this.email || !this.password) {
      this.errorMessage.set('Vnesite e-pošto in geslo.');
      return;
    }

    this.loading.set(true);

    this.authService
      .login({
        email: this.email.trim(),
        password: this.password,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.router.navigate(['/app/dashboard']);
        },
        error: (error) => {
          console.error(error);
          this.errorMessage.set('Prijava ni uspela. Preverite podatke.');
        },
      });
  }
}