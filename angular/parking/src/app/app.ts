import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Raíz de la app: solo aloja el enrutador; cada ruta pone su título (ver app.routes.ts). */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}
