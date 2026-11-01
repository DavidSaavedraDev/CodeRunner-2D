# 🚀 CodeRunner-2D

**CodeRunner-2D** es un juego web 2D con estética **cyber/developer** donde debes sobrevivir, esquivar enemigos y mantener tu puntuación en ascenso. Está construido con una arquitectura modular en **ES6**, pensada para escalar y mantener el código limpio.

## 🧰 Tecnologías

- **JavaScript (ES6+)**
- **HTML5 Canvas (2D Context)**
- **CSS3**

## 🎮 Controles

- **Mover jugador:** `W / A / S / D` o `Flechas`
- **Reiniciar partida (Game Over):** `Enter` o `Espacio`

## ✨ Características principales

- Enemigos dinámicos que aparecen desde la parte superior o derecha y persiguen al jugador.
- Dificultad progresiva basada en la puntuación (más velocidad y mayor presión de aparición).
- Sistema de vidas con colisiones AABB (bounding box) y breve estado de inmunidad/parpadeo.
- Pantalla de **Game Over** interactiva con reinicio inmediato desde teclado.
- Estructura modular en clases (`Game`, `Player`, `Entity`, `Enemy`, `InputHandler`) para facilitar futuras expansiones.

## ⚡ Cómo probarlo rápidamente

### 1. Clonar el repositorio

```bash
git clone https://github.com/DavidSaavedraDev/CodeRunner-2D.git
cd CodeRunner-2D
```

### 2. Ejecutar el juego

Abre `index.html` en tu navegador.

> Recomendado: usar una extensión como **Live Server** en VS Code/Visual Studio para recarga rápida durante desarrollo.

---

¡Listo! Ya puedes jugar, iterar mecánicas y evolucionar el proyecto hacia una experiencia arcade más completa.
