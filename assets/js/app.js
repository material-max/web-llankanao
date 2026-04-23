/* ============================================================
   ESCUELA LLANKANAO — app.js
   Componentes compartidos + integración Google Apps Script
   ============================================================ */

// ── CONFIGURACIÓN GAS ──────────────────────────────────────
// Después de desplegar el Google Apps Script, pegar la URL aquí:
const GAS_URL = 'https://script.google.com/macros/s/AKfycbx0fulywu16KpQ-Tkj0OT-UoG3QbILNjRhVOVmAA-jLB6u69pexmM_4pOlthykfJwsV-g/exec';

// Configuración local (se sobreescribe con datos del GAS si está disponible)
const SITE_CONFIG = {
  nombre: 'Escuela Básica Llankanao M.F.M.S.',
  nombreCorto: 'E.B. Llankanao',
  slogan: 'Formando ciudadanos para el futuro',
  direccion: 'Linares, Región del Maule, Chile',
  telefono: '',
  email: '',
  facebook: '',
  instagram: '',
  logo: 'assets/img/logo.png',
  plataformas: []
};

// ── NAVBAR HTML ────────────────────────────────────────────
function renderNavbar(activePage = '') {
  const pages = {
    'index': 'inicio',
    'nosotros': 'nosotros',
    'academico': 'academico',
    'equipo': 'equipo',
    'noticias': 'noticias',
    'calendario': 'calendario',
    'matricula': 'matricula',
    'transparencia': 'transparencia',
    'plataformas': 'plataformas',
    'contacto': 'contacto',
  };
  const isActive = (p) => activePage === p ? 'active' : '';

  const topbarHTML = `
  <div class="topbar d-none d-md-block">
    <div class="container">
      <div class="d-flex justify-content-between align-items-center">
        <span id="topbar-contact">
          <i class="fas fa-map-marker-alt me-1"></i> ${SITE_CONFIG.direccion}
          ${SITE_CONFIG.telefono ? `<span class="sep">|</span><i class="fas fa-phone me-1"></i> ${SITE_CONFIG.telefono}` : ''}
          ${SITE_CONFIG.email ? `<span class="sep">|</span><i class="fas fa-envelope me-1"></i> ${SITE_CONFIG.email}` : ''}
        </span>
        <span>
          ${SITE_CONFIG.facebook ? `<a href="${SITE_CONFIG.facebook}" target="_blank" class="me-2"><i class="fab fa-facebook-f"></i></a>` : ''}
          ${SITE_CONFIG.instagram ? `<a href="${SITE_CONFIG.instagram}" target="_blank"><i class="fab fa-instagram"></i></a>` : ''}
        </span>
      </div>
    </div>
  </div>`;

  const navHTML = `
  <nav class="navbar navbar-expand-lg sticky-top" id="mainNav">
    <div class="container">
      <a class="navbar-brand" href="index.html">
        <img src="assets/img/logo.png" alt="Logo" onerror="this.onerror=null;this.src='assets/img/logo.svg'"
             style="height:48px;width:48px;min-width:48px;border-radius:50%;object-fit:contain;background:#1B4F8A;border:2px solid #D4A843;flex-shrink:0;display:block">
        <div class="brand-text">
          <div class="brand-name">Escuela Llankanao</div>
          <div class="brand-sub">M.F.M.S. • Linares</div>
        </div>
      </a>
      <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navMenu">
        <ul class="navbar-nav ms-auto align-items-lg-center gap-lg-1">
          <li class="nav-item"><a class="nav-link ${isActive('index')}" href="index.html">Inicio</a></li>
          <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle ${['nosotros','equipo'].includes(activePage)?'active':''}" href="#" data-bs-toggle="dropdown">Institución</a>
            <ul class="dropdown-menu">
              <li><a class="dropdown-item" href="nosotros.html"><i class="fas fa-school me-2 text-primary"></i>Nosotros</a></li>
              <li><a class="dropdown-item" href="equipo.html"><i class="fas fa-users me-2 text-primary"></i>Nuestro Equipo</a></li>
              <li><hr class="dropdown-divider"></li>
              <li><a class="dropdown-item" href="transparencia.html"><i class="fas fa-file-alt me-2 text-primary"></i>Transparencia</a></li>
            </ul>
          </li>
          <li class="nav-item"><a class="nav-link ${isActive('academico')}" href="academico.html">Académico</a></li>
          <li class="nav-item"><a class="nav-link ${isActive('noticias')}" href="noticias.html">Noticias</a></li>
          <li class="nav-item"><a class="nav-link ${isActive('calendario')}" href="calendario.html">Calendario</a></li>
          <li class="nav-item"><a class="nav-link ${isActive('plataformas')}" href="plataformas.html">Plataformas</a></li>
          <li class="nav-item"><a class="nav-link ${isActive('contacto')}" href="contacto.html">Contacto</a></li>
          <li class="nav-item ms-lg-2"><a class="nav-link btn-matricula px-4 py-2" href="matricula.html">Matrícula</a></li>
        </ul>
      </div>
    </div>
  </nav>`;

  return topbarHTML + navHTML;
}

// ── FOOTER HTML ───────────────────────────────────────────
function renderFooter() {
  const year = new Date().getFullYear();
  return `
  <footer>
    <div class="container">
      <div class="row g-4">
        <div class="col-lg-4">
          <h6>Escuela Básica Llankanao</h6>
          <p style="color:rgba(255,255,255,.6);font-size:.9rem;line-height:1.7">
            Formando ciudadanos íntegros comprometidos con su entorno, entregando educación de calidad con énfasis en valores e inclusión.
          </p>
          <div class="social-links mt-3">
            ${SITE_CONFIG.facebook ? `<a href="${SITE_CONFIG.facebook}" target="_blank" title="Facebook"><i class="fab fa-facebook-f"></i></a>` : ''}
            ${SITE_CONFIG.instagram ? `<a href="${SITE_CONFIG.instagram}" target="_blank" title="Instagram"><i class="fab fa-instagram"></i></a>` : ''}
            <a href="https://wa.me/${(SITE_CONFIG.telefono||'').replace(/\D/g,'')}" target="_blank" title="WhatsApp"><i class="fab fa-whatsapp"></i></a>
          </div>
        </div>
        <div class="col-sm-6 col-lg-2">
          <h6>Institución</h6>
          <ul>
            <li><a href="nosotros.html">Nosotros</a></li>
            <li><a href="equipo.html">Nuestro Equipo</a></li>
            <li><a href="academico.html">Oferta Académica</a></li>
            <li><a href="matricula.html">Matrícula</a></li>
            <li><a href="transparencia.html">Transparencia</a></li>
          </ul>
        </div>
        <div class="col-sm-6 col-lg-2">
          <h6>Estudiantes</h6>
          <ul>
            <li><a href="noticias.html">Noticias</a></li>
            <li><a href="calendario.html">Calendario</a></li>
            <li><a href="plataformas.html">Plataformas</a></li>
            <li><a href="contacto.html">Contacto</a></li>
          </ul>
        </div>
        <div class="col-lg-4">
          <h6>Plataformas</h6>
          <div id="footer-plataformas">
            <ul>
              <li><a href="plataformas.html"><i class="fas fa-graduation-cap me-2"></i>Sistema de Notas</a></li>
              <li><a href="plataformas.html"><i class="fas fa-search me-2"></i>Consulta de Notas</a></li>
              <li><a href="plataformas.html"><i class="fas fa-user-check me-2"></i>Inspectoría</a></li>
              <li><a href="plataformas.html"><i class="fas fa-boxes me-2"></i>Gestión de Bodega</a></li>
            </ul>
          </div>
          <div class="mt-3" style="font-size:.85rem;color:rgba(255,255,255,.5)">
            <i class="fas fa-map-marker-alt me-1"></i> ${SITE_CONFIG.direccion}<br>
            ${SITE_CONFIG.telefono ? `<i class="fas fa-phone me-1"></i> ${SITE_CONFIG.telefono}<br>` : ''}
            ${SITE_CONFIG.email ? `<i class="fas fa-envelope me-1"></i> ${SITE_CONFIG.email}` : ''}
          </div>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <div class="container d-flex justify-content-between flex-wrap gap-2">
        <span>© ${year} Escuela Básica Llankanao M.F.M.S. • Linares, Chile</span>
        <span>Desarrollado para la comunidad educativa</span>
      </div>
    </div>
  </footer>
  <button id="backToTop" title="Volver arriba"><i class="fas fa-chevron-up"></i></button>`;
}

// ── INICIALIZAR COMPONENTES ────────────────────────────────
function initComponents(activePage = '') {
  // Inyectar navbar
  const navContainer = document.getElementById('navbar-container');
  if (navContainer) navContainer.innerHTML = renderNavbar(activePage);

  // Inyectar footer
  const footerContainer = document.getElementById('footer-container');
  if (footerContainer) footerContainer.innerHTML = renderFooter();

  // Scroll navbar
  const nav = document.getElementById('mainNav');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 50);
    });
  }

  // Back to top
  const btn = document.getElementById('backToTop');
  if (btn) {
    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 400);
    });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // Reveal on scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ── API GOOGLE APPS SCRIPT ─────────────────────────────────
async function gasGet(action, params = {}) {
  const url = new URL(GAS_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const r = await fetch(url.toString(), { signal: controller.signal });
    return r.json();
  } finally { clearTimeout(timeout); }
}

// GAS no soporta CORS preflight (POST), se envía todo como GET
async function gasPost(action, data = {}) {
  const url = new URL(GAS_URL);
  url.searchParams.set('action', action);
  Object.entries(data).forEach(([k, v]) => {
    if (typeof v === 'object') {
      url.searchParams.set(k, JSON.stringify(v));
    } else {
      url.searchParams.set(k, v);
    }
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const r = await fetch(url.toString(), { signal: controller.signal });
    return r.json();
  } finally { clearTimeout(timeout); }
}

// ── ANIMADOR DE CONTADORES ─────────────────────────────────
function animateCounters() {
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count);
    const duration = 1800;
    const step = target / (duration / 16);
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = Math.floor(current) + (el.dataset.suffix || '');
      if (current >= target) clearInterval(timer);
    }, 16);
  });
}

// ── AVISOS DINÁMICOS ───────────────────────────────────────
async function loadAvisos() {
  try {
    const data = await gasGet('getAvisos');
    const container = document.getElementById('avisos-container');
    if (!container || !data.avisos?.length) return;
    container.innerHTML = data.avisos.map(a => `
      <div class="aviso-banner alert-${a.tipo || 'info'}" style="background:${a.tipo==='warning'?'#fef3cd':a.tipo==='danger'?'#f8d7da':a.tipo==='success'?'#d4edda':'#cce5ff'};color:${a.tipo==='warning'?'#856404':a.tipo==='danger'?'#721c24':a.tipo==='success'?'#155724':'#004085'}">
        <div class="container"><i class="fas fa-bell me-2"></i>${a.texto}</div>
      </div>`).join('');
  } catch (e) { /* GAS no configurado aún */ }
}

// ── FORMATEAR FECHA ────────────────────────────────────────
function formatFecha(fechaStr) {
  try {
    const d = new Date(fechaStr);
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch { return fechaStr; }
}

// ── TRUNCAR TEXTO ──────────────────────────────────────────
function truncate(text, len = 120) {
  return text?.length > len ? text.substring(0, len) + '...' : text || '';
}
