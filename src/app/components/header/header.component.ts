import { Component, input, type InputSignal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';

type HeaderOption =
  'ventas' | 'articulos' | 'compras' | 'clientes' | 'almacen' | 'caja' | 'gestion';

interface HeaderItem {
  readonly id: HeaderOption;
  readonly label: string;
  readonly icon: string;
  readonly route: string | null;
}

/**
 * Muestra la navegación principal de Osumi TPV Client.
 */
@Component({
  selector: 'otpv-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  imports: [MatButton, MatIcon, MatTooltip, RouterLink],
})
export default class HeaderComponent {
  readonly selectedOption: InputSignal<HeaderOption> = input.required<HeaderOption>();

  readonly appName: InputSignal<string> = input<string>('Osumi TPV');

  readonly items: readonly HeaderItem[] = [
    {
      id: 'ventas',
      label: 'Ventas',
      icon: 'point_of_sale',
      route: '/ventas',
    },
    {
      id: 'articulos',
      label: 'Artículos',
      icon: 'inventory_2',
      route: null,
    },
    {
      id: 'compras',
      label: 'Compras',
      icon: 'shopping_cart',
      route: null,
    },
    {
      id: 'clientes',
      label: 'Clientes',
      icon: 'groups',
      route: null,
    },
    {
      id: 'almacen',
      label: 'Almacén',
      icon: 'warehouse',
      route: null,
    },
    {
      id: 'caja',
      label: 'Caja',
      icon: 'payments',
      route: null,
    },
    {
      id: 'gestion',
      label: 'Gestión',
      icon: 'settings',
      route: null,
    },
  ];
}
