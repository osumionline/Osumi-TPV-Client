import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { ActivatedRoute, RouterLink } from '@angular/router';

/**
 * Muestra una página provisional para un módulo de Gestión pendiente.
 */
@Component({
  selector: 'otpv-management-placeholder',
  templateUrl: './management-placeholder.component.html',
  styleUrl: './management-placeholder.component.scss',
  imports: [MatButton, MatIcon, RouterLink],
})
export default class ManagementPlaceholderComponent {
  private readonly route: ActivatedRoute = inject(ActivatedRoute);

  private readonly titleValue: unknown = this.route.snapshot.data['title'];
  private readonly descriptionValue: unknown = this.route.snapshot.data['description'];
  private readonly iconValue: unknown = this.route.snapshot.data['icon'];

  readonly title: string = typeof this.titleValue === 'string' ? this.titleValue : 'Gestión';

  readonly description: string =
    typeof this.descriptionValue === 'string' ? this.descriptionValue : '';

  readonly icon: string = typeof this.iconValue === 'string' ? this.iconValue : 'settings';
}
