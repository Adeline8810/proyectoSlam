import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PreguntaService } from '../../../services/pregunta.service';
import { RespuestaService } from '../../../services/respuesta.service';
import { Pregunta } from '../../../models/pregunta';
import { Respuesta } from '../../../models/respuesta';
import { MenuBarComponent } from '../../components/menu-bar/menu-bar.component';
import { forkJoin, firstValueFrom } from 'rxjs';
import { TraduccionService } from '../../../services/traduccion.service';
import confetti from 'canvas-confetti';

@Component({
  selector: 'app-slam',
  standalone: true,
  imports: [CommonModule, FormsModule, MenuBarComponent],
  templateUrl: './slam.component.html',
  styleUrls: ['./slam.component.css']
})
export class SlamComponent implements OnInit {
  preguntas: Pregunta[] = [];
  respuestas: Respuesta[] = [];
  preguntaActual = 0;
  respuestaActual = '';
  fotoFile: File | null = null;
  fotoPreview: string | null = null;
  completado = false;
  usuarioId!: number; // ✅ Ahora siempre será number después de la verificación
  nombreUsuario: string = '';
  fotoUrlServidor: string | null = null;
  idiomaSeleccionado = 'es';
  preguntasTraducidas: { [key: string]: { [id: number]: string } } = {};
  cargandoTraduccion = false;

  cargando: boolean = false;

  constructor(private preguntaService: PreguntaService, private respuestaService: RespuestaService,
    private traduccionService: TraduccionService) {}

  ngOnInit(): void {
  const u = localStorage.getItem('usuario');
  this.fotoUrlServidor = localStorage.getItem('user_foto_perfil') || 'assets/img/default.png';
  // Eliminamos la lógica de la foto de aquí arriba porque el array está vacío todavía

  if (!u) {
    alert('Debes iniciar sesión');
    return;
  }

  const usuarioObj = JSON.parse(u);
  this.usuarioId = usuarioObj.id;
  this.nombreUsuario = usuarioObj.nombre;

  // ⚡ Cargar preguntas y respuestas existentes en paralelo
  forkJoin({
    preguntas: this.preguntaService.obtenerPreguntas(),
    respuestas: this.respuestaService.obtenerRespuestasPorUsuario(this.usuarioId)
  }).subscribe({
    next: ({ preguntas, respuestas }) => {
      this.preguntas = preguntas;

      // Mapear respuestas existentes
      this.respuestas = preguntas.map(q => {
        const rExistente = respuestas.find(r => r.preguntaId === q.id);
        return {
          id: rExistente?.id,
          preguntaId: q.id,
          usuarioId: this.usuarioId,
          texto: rExistente?.texto || null,
          fotoUrl: rExistente?.fotoUrl || null
        };
      });

      // --- AQUÍ VA EL CAMBIO SEGURO ---
      if (this.respuestas.length > 0) {
        this.preguntaActual = 0;
        this.respuestaActual = this.respuestas[0].texto || '';

        // 1. Prioridad: Foto que viene de la Base de Datos
        // 2. Si no hay en BD, intentamos la del LocalStorage (caché)
        const baseApi = 'https://backend-ruth-slam.onrender.com';

        const fotoGuardada = localStorage.getItem('user_foto_perfil');

       if (this.respuestas[0]?.fotoUrl) {
    const urlBD = this.respuestas[0].fotoUrl;
    // Si la URL de la BD ya es completa (empieza con http), la usamos tal cual
    // Si es solo "/uploads/...", le sumamos la baseApi
    this.fotoUrlServidor = urlBD.startsWith('http') ? urlBD : `${baseApi}${urlBD}`;
    this.fotoPreview = this.fotoUrlServidor;
}
else if (fotoGuardada) {
    this.fotoUrlServidor = fotoGuardada.startsWith('http') ? fotoGuardada : `${baseApi}${fotoGuardada}`;
    this.fotoPreview = this.fotoUrlServidor;
}
      }
    },
    error: err => console.error(err)
  });
}

onFotoSeleccionada(ev: any) {
  const f: File = ev.target.files && ev.target.files[0];
  if (!f) return;
  this.fotoFile = f;
  const reader = new FileReader();
  reader.onload = (e) => {
    const result = (e.target as any).result;
    this.fotoPreview = result;
    this.fotoUrlServidor = result; // Guardamos temporalmente la base64 para la vista
  };
  reader.readAsDataURL(f);
}
  anterior() {
    this.respuestas[this.preguntaActual].texto = this.respuestaActual || null;
    if (this.preguntaActual > 0) {
      this.preguntaActual--;
      this.respuestaActual = this.respuestas[this.preguntaActual].texto || '';
      //this.fotoPreview = this.respuestas[this.preguntaActual].fotoUrl || null;
     this.fotoPreview = this.respuestas[this.preguntaActual].fotoUrl || this.fotoUrlServidor;


    }
    this.obtenerTraduccionActual();
  }

  pasar() {
    this.respuestas[this.preguntaActual].texto = null;
    this.siguiente();
  }

  siguiente() {

    this.lanzarChispitas();
    this.respuestas[this.preguntaActual].texto = this.respuestaActual || null;

    if (this.preguntaActual < this.preguntas.length - 1) {
      this.preguntaActual++;
      this.respuestaActual = this.respuestas[this.preguntaActual].texto || '';
      //this.fotoPreview = this.respuestas[this.preguntaActual].fotoUrl || null;
this.fotoPreview = this.respuestas[this.preguntaActual].fotoUrl || this.fotoUrlServidor;
      // Animación opcional de "bounce"
      const title = document.querySelector('.slam-title');
      if (title) {
        title.classList.add('bounce');
        setTimeout(() => title.classList.remove('bounce'), 300);
      }
    } else {
      this.guardarTodo();
    }

    this.obtenerTraduccionActual();
  }


lanzarChispitas() {
    const duration = 2 * 1000; // 2 segundos de chispitas
    const end = Date.now() + duration;

    const frame = () => {
      // Colores: Rosa fuerte, Blanco y Rosa pastel (como tu SLAM)
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 }, // Salen de la izquierda
        colors: ['#ff4a68', '#ffffff', '#ffe6eb']
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 }, // Salen de la derecha
        colors: ['#ff4a68', '#ffffff', '#ffe6eb']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }




async guardarTodo() {
  this.respuestas[this.preguntaActual].texto = this.respuestaActual || null;

  try {
    if (this.fotoFile) {
      // 1. Obtenemos el ID del usuario logueado (importante para que el backend sepa de quién es la foto)
      const usuarioId = localStorage.getItem('usuarioId') || '';

      // 2. Subimos la foto pasando el ID
      const pathRelativo = await firstValueFrom(this.respuestaService.subirFoto(this.fotoFile, usuarioId));

      // 3. Limpiamos la URL con un "timestamp" para romper la caché del navegador
      const timestamp = new Date().getTime();

      const urlCompleta = `https://backend-ruth-slam.onrender.com${pathRelativo}?v=${new Date().getTime()}`;

      // Sincronizamos
      this.respuestas.forEach(r => r.fotoUrl = urlCompleta);
      this.fotoUrlServidor = urlCompleta;
      localStorage.setItem('user_foto_perfil', urlCompleta);

    }
  } catch (err) {
    console.error('Error al subir foto:', err);
    alert('Hubo un problema al subir la imagen.');
  }

  // Guardar el resto de respuestas
 this.respuestaService.guardarRespuestas(this.respuestas).subscribe({
  next: () => {
    this.completado = true;

    // Si subimos una foto, la guardamos en el localStorage para que
    // al refrescar el perfil se vea la nueva y no la de Ruth
    if (this.fotoUrlServidor) {
      localStorage.setItem('user_foto_perfil', this.fotoUrlServidor);
      console.log('Foto actualizada en storage:', this.fotoUrlServidor);
    }
  },
  error: err => {
    console.error(err);
    alert('Error al guardar respuestas');
  }
});
}




// Método para cambiar idioma
cambiarIdioma(lang: string) {
  this.idiomaSeleccionado = lang;
  this.preguntasTraducidas = {}; // Limpiamos caché al cambiar de idioma
  this.obtenerTraduccionActual();
}



obtenerTraduccionActual() {
  const pregunta = this.preguntas[this.preguntaActual];
  const idPregunta = pregunta.id;
  const lang = this.idiomaSeleccionado;

  // 1. Si es español, mostramos el original y salimos
  if (lang === 'es') {
    this.cargando = false;
    return;
  }

  // 2. Si YA tenemos esta pregunta en ESTE idioma, no llamamos al servidor
  if (this.preguntasTraducidas[lang] && this.preguntasTraducidas[lang][idPregunta]) {
    this.cargando = false;
    return;
  }

  // 3. Si no la tenemos, activamos el reloj y pedimos al Backend
  this.cargando = true;
  this.traduccionService.traducir(pregunta.texto, lang).subscribe({
    next: (res) => {
      // Inicializamos el objeto del idioma si no existe
      if (!this.preguntasTraducidas[lang]) {
        this.preguntasTraducidas[lang] = {};
      }
      // Guardamos la respuesta
      this.preguntasTraducidas[lang][idPregunta] = res;
      this.cargando = false;
    },
    error: (err) => {
      console.error('Error en RENDER:', err);
      this.cargando = false;
    }
  });
}

}
