# Escuela Básica Llankanao M.F.M.S. — Sitio Web HTML
## Versión HTML pura + Google Apps Script

---

## ✅ Requisitos
- Cualquier hosting (cPanel, GitHub Pages, Netlify, etc.)
- **No requiere PHP ni MySQL**
- Cuenta de Google (Google Workspace o Gmail)

---

## 🚀 Instalación en 4 pasos

### Paso 1 — Configurar Google Apps Script
1. Ir a **script.google.com** → Nuevo proyecto
2. Nombrar: **"Escuela Llankanao Web"**
3. Pegar el contenido de `Code.gs`
4. Ejecutar `inicializarDatos()` **UNA SOLA VEZ** ⚠️
5. **Desplegar** → Nueva implementación → **App Web**:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquiera**
6. **Copiar la URL** del deployment

### Paso 2 — Configurar la URL del GAS
- Abrir `assets/js/app.js`
- Buscar: `const GAS_URL = 'https://script.google.com/macros/s/TU_DEPLOYMENT_ID/exec';`
- Reemplazar con la URL copiada en el paso anterior

### Paso 3 — Subir al hosting
- Subir **todos los archivos** a `public_html/`
- Mantener la estructura de carpetas (`assets/css/`, `assets/js/`, `assets/img/`)

### Paso 4 — Primer acceso al admin
- URL: `https://www.escuelallankanao.cl/admin.html`
- Usuario: **`admin`**
- Contraseña: **`Llankanao2024!`**
- ⚠️ **Cambiar la contraseña inmediatamente**

---

## 📁 Estructura de archivos

```
/
├── index.html          # Página de inicio
├── nosotros.html       # Historia y misión
├── academico.html      # Plan de estudios
├── equipo.html         # Nuestro equipo (dinámico)
├── noticias.html       # Listado de noticias (dinámico)
├── noticia.html        # Artículo individual (dinámico)
├── calendario.html     # Calendario escolar
├── matricula.html      # Proceso de matrícula
├── transparencia.html  # Documentos públicos (dinámico)
├── plataformas.html    # Accesos a sistemas (dinámico)
├── contacto.html       # Formulario de contacto
├── admin.html          # Panel administrador
├── 404.html            # Página de error
├── robots.txt
├── Code.gs             # ← Pegar en Google Apps Script
└── assets/
    ├── css/style.css
    ├── js/app.js       # ← Configurar GAS_URL aquí
    └── img/logo.svg    # ← Reemplazar con logo real
```

---

## ⚙️ Configuración inicial desde el Admin

1. **Admin → Configuración → Escuela** — nombre, dirección, teléfono, email
2. **Admin → Configuración → Redes Sociales** — Facebook, Instagram
3. **Admin → Plataformas** — URLs de Sistema de Notas, Inspectoría, Bodega, Transporte
4. **Admin → Equipo** — Agregar directivos y docentes
5. **Admin → Noticias** — Publicar primeras noticias

---

## 🔄 Compatibilidad GitHub Pages

Este sitio funciona directamente en **GitHub Pages** (gratis):
1. Crear repositorio público en GitHub
2. Subir todos los archivos
3. Settings → Pages → Branch: main
4. URL: `https://TU_USUARIO.github.io/TU_REPO/`

---

**Desarrollado para Escuela Básica Llankanao M.F.M.S. · Linares, Chile**
