/**
 * ESCUELA LLANKANAO — Google Apps Script v3.0
 * Nuevos módulos: Calendario, Académico, Usuarios, Plataformas con clave
 * ⚠️  Si ya tienes datos: NO ejecutar inicializarDatos() — usar agregarHojasNuevas()
 */

var SHEET_NOTICIAS   = 'Noticias';
var SHEET_DOCUMENTOS = 'Documentos';
var SHEET_EQUIPO     = 'Equipo';
var SHEET_AVISOS     = 'Avisos';
var SHEET_CONTACTOS  = 'Contactos';
var SHEET_USUARIOS   = 'Usuarios';
var SHEET_CALENDARIO = 'Calendario';

// ── ENTRY POINTS ──────────────────────────────────────────
function doGet(e)  { return responder(ejecutar(e)); }
function doPost(e) { return responder(ejecutar(e)); }

function responder(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function ejecutar(e) {
  try {
    var p = e.parameter || {};
    if (e.postData) {
      try {
        var body = JSON.parse(e.postData.contents);
        var keys = Object.keys(body);
        for (var i = 0; i < keys.length; i++) p[keys[i]] = body[keys[i]];
      } catch(ex) {}
    }
    var keys2 = Object.keys(p);
    for (var j = 0; j < keys2.length; j++) {
      var k = keys2[j];
      if (typeof p[k] === 'string' && p[k].length > 0 && (p[k][0] === '{' || p[k][0] === '[')) {
        try { p[k] = JSON.parse(p[k]); } catch(ex) {}
      }
    }
    return despachar(p.action, p);
  } catch(err) {
    return { ok: false, error: err.message };
  }
}

function despachar(accion, p) {
  switch(accion) {
    // Públicas
    case 'getConfig':           return getConfig();
    case 'getNoticias':         return getNoticias(p);
    case 'getNoticia':          return getNoticia(p.id);
    case 'getDocumentos':       return getDocumentos();
    case 'getEquipo':           return getEquipo();
    case 'getAvisos':           return getAvisosActivos();
    case 'saveContacto':        return saveContacto(p);
    case 'getCalendario':       return getCalendario();
    case 'getAcademico':        return getAcademico();
    case 'verificarClavePlat':  return verificarClavePlat(p);
    case 'login':               return login(p);
    // Autenticadas — admin y editor
    case 'saveNoticia':         return conAuth(p, ['admin','editor'], function(){ return saveNoticia(p); });
    case 'deleteNoticia':       return conAuth(p, ['admin','editor'], function(){ return borrarFila(SHEET_NOTICIAS, p.id); });
    case 'saveAviso':           return conAuth(p, ['admin','editor'], function(){ return saveAviso(p); });
    case 'toggleAviso':         return conAuth(p, ['admin','editor'], function(){ return toggleAviso(p.id); });
    case 'deleteAviso':         return conAuth(p, ['admin','editor'], function(){ return borrarFila(SHEET_AVISOS, p.id); });
    // Solo admin
    case 'uploadImagen':       return conAuth(p, ['admin','editor'], function(){ return uploadImagen(p); });
    case 'getSocialConfig':    return conAuth(p, ['admin'], getSocialConfig);
    case 'saveSocialConfig':   return conAuth(p, ['admin'], function(){ return saveSocialConfig(p); });
    case 'saveDocumento':       return conAuth(p, ['admin'], function(){ return saveDocumento(p); });
    case 'deleteDocumento':     return conAuth(p, ['admin'], function(){ return borrarFila(SHEET_DOCUMENTOS, p.id); });
    case 'saveEquipo':          return conAuth(p, ['admin'], function(){ return saveEquipo(p); });
    case 'deleteEquipo':        return conAuth(p, ['admin'], function(){ return borrarFila(SHEET_EQUIPO, p.id); });
    case 'marcarLeidoContacto': return conAuth(p, ['admin'], function(){ return marcarLeido(p.id); });
    case 'deleteContacto':      return conAuth(p, ['admin'], function(){ return borrarFila(SHEET_CONTACTOS, p.id); });
    case 'getModulos':          return getModulos();
    case 'saveModulos':         return conAuth(p, ['admin'], function(){ return saveModulos(p); });
    case 'getSecciones':        return getSecciones();
    case 'getPagina':           return getPagina(p.pagina);
    case 'savePagina':          return conAuth(p, ['admin'], function(){ return savePagina(p); });
    case 'saveGaleria':         return conAuth(p, ['admin'], function(){ return saveGaleria(p); });
    case 'saveSecciones':       return conAuth(p, ['admin'], function(){ return saveSecciones(p); });
    case 'savePlataformas':     return conAuth(p, ['admin'], function(){ return savePlataformas(p); });
    case 'saveConfig':          return conAuth(p, ['admin'], function(){ return saveConfig(p); });
    case 'cambiarPassword':     return conAuth(p, ['admin','editor'], function(){ return cambiarPassword(p); });
    case 'saveCalendario':      return conAuth(p, ['admin'], function(){ return saveCalendario(p); });
    case 'deleteCalendario':    return conAuth(p, ['admin'], function(){ return borrarFila(SHEET_CALENDARIO, p.id); });
    case 'saveAcademico':       return conAuth(p, ['admin'], function(){ return saveAcademico(p); });
    case 'getUsuarios':         return conAuth(p, ['admin'], getUsuarios);
    case 'saveUsuario':         return conAuth(p, ['admin'], function(){ return saveUsuario(p); });
    case 'deleteUsuario':       return conAuth(p, ['admin'], function(){ return deleteUsuario(p.usuario); });
    default: return { ok: false, error: 'Accion desconocida: ' + accion };
  }
}

// ── AUTENTICACIÓN ─────────────────────────────────────────
var DURACION_TOKEN = 8 * 60 * 60 * 1000;

function hash256(texto) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, texto)
    .map(function(b){ return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
}

function login(p) {
  var id = PropertiesService.getScriptProperties().getProperty('spreadsheet_id');
  if (!id) return { ok: false, error: 'Sistema no inicializado. Ejecuta inicializarDatos().' };
  var sheet = SpreadsheetApp.openById(id).getSheetByName(SHEET_USUARIOS);
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === p.usuario) {
      var salt = data[i][2];
      if (hash256(p.password + salt) === data[i][1]) {
        var token = Utilities.getUuid();
        var rol   = data[i][4] || 'editor';
        PropertiesService.getScriptProperties()
          .setProperty('tok_' + token, p.usuario + '|' + (Date.now() + DURACION_TOKEN) + '|' + rol);
        return { ok: true, token: token, usuario: p.usuario, rol: rol };
      }
    }
  }
  return { ok: false, error: 'Credenciales incorrectas' };
}

function conAuth(p, rolesPermitidos, fn) {
  var token  = p.token;
  if (!token) return { ok: false, error: 'No autorizado' };
  var stored = PropertiesService.getScriptProperties().getProperty('tok_' + token);
  if (!stored) return { ok: false, error: 'Sesion expirada' };
  var partes  = stored.split('|');
  var usuario = partes[0];
  var expiry  = parseInt(partes[1]);
  var rol     = partes[2] || 'editor';
  if (Date.now() > expiry) {
    PropertiesService.getScriptProperties().deleteProperty('tok_' + token);
    return { ok: false, error: 'Sesion expirada' };
  }
  if (rolesPermitidos.indexOf(rol) === -1) return { ok: false, error: 'Sin permiso para esta accion' };
  p._usuario = usuario;
  p._rol     = rol;
  return fn(usuario);
}

// ── HELPERS ───────────────────────────────────────────────
function abrirSS() {
  var id = PropertiesService.getScriptProperties().getProperty('spreadsheet_id');
  if (!id) return null;
  return SpreadsheetApp.openById(id);
}

function obtenerHoja(nombre) {
  var ss = abrirSS();
  if (!ss) return null;
  return ss.getSheetByName(nombre);
}

function hojaAObjetos(hoja) {
  if (!hoja) return [];
  var data = hoja.getDataRange().getValues();
  if (data.length < 2) return [];
  var enc = data[0];
  return data.slice(1).map(function(fila) {
    var obj = {};
    enc.forEach(function(h, i) { obj[h] = fila[i] !== undefined ? String(fila[i]) : ''; });
    return obj;
  }).filter(function(o){ return o.id; });
}

function guardarObjeto(nombreHoja, obj) {
  var hoja = obtenerHoja(nombreHoja);
  var enc  = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
  var data = hoja.getDataRange().getValues();
  if (!obj.id) obj.id = Utilities.getUuid();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === obj.id) {
      hoja.getRange(i+1, 1, 1, enc.length)
        .setValues([enc.map(function(h){ return obj[h] !== undefined ? obj[h] : data[i][enc.indexOf(h)]; })]);
      return { ok: true, id: obj.id };
    }
  }
  hoja.appendRow(enc.map(function(h){ return obj[h] !== undefined ? obj[h] : ''; }));
  return { ok: true, id: obj.id };
}

function borrarFila(nombreHoja, id) {
  var hoja = obtenerHoja(nombreHoja);
  var data = hoja.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) { hoja.deleteRow(i+1); return { ok: true }; }
  }
  return { ok: false, error: 'No encontrado' };
}

// ── CONFIG ────────────────────────────────────────────────
function configDefault() {
  return {
    nombre: 'Escuela Básica Llankanao M.F.M.S.',
    slogan: 'Formando ciudadanos para el futuro',
    logo: '', facebook: '', instagram: '',
    direccion: 'Linares, Región del Maule, Chile',
    telefono: '', email: '', plataformas: []
  };
}

function getConfig() {
  var raw = PropertiesService.getScriptProperties().getProperty('site_config');
  return { ok: true, config: raw ? JSON.parse(raw) : configDefault() };
}

function saveConfig(p) {
  var config = p.config;
  if (typeof config === 'string') {
    try { config = JSON.parse(config); } catch(e) { return { ok: false, error: 'Error parseando config' }; }
  }
  if (!config) return { ok: false, error: 'No se recibió configuración' };
  var raw    = PropertiesService.getScriptProperties().getProperty('site_config');
  var actual = raw ? JSON.parse(raw) : configDefault();
  var keys   = Object.keys(config);
  for (var i = 0; i < keys.length; i++) actual[keys[i]] = config[keys[i]];
  PropertiesService.getScriptProperties().setProperty('site_config', JSON.stringify(actual));
  return { ok: true };
}

function savePlataformas(p) {
  var plataformas = p.plataformas;
  // Si viene como string JSON, parsear
  if (typeof plataformas === 'string') {
    try { plataformas = JSON.parse(plataformas); } catch(e) { return { ok: false, error: 'Error parseando plataformas' }; }
  }
  if (!plataformas) return { ok: false, error: 'No se recibieron plataformas' };
  var raw    = PropertiesService.getScriptProperties().getProperty('site_config');
  var config = raw ? JSON.parse(raw) : configDefault();
  config.plataformas = plataformas;
  PropertiesService.getScriptProperties().setProperty('site_config', JSON.stringify(config));
  return { ok: true };
}

// ── VERIFICAR CLAVE PLATAFORMA ────────────────────────────
function verificarClavePlat(p) {
  var raw    = PropertiesService.getScriptProperties().getProperty('site_config');
  var config = raw ? JSON.parse(raw) : configDefault();
  var plats  = config.plataformas || [];
  for (var i = 0; i < plats.length; i++) {
    if (plats[i].nombre === p.nombre) {
      if (!plats[i].clave) return { ok: true }; // sin clave, acceso libre
      if (plats[i].clave === p.clave) return { ok: true, url: plats[i].url };
      return { ok: false, error: 'Clave incorrecta' };
    }
  }
  return { ok: false, error: 'Plataforma no encontrada' };
}

// ── NOTICIAS ─────────────────────────────────────────────
function getNoticias(p) {
  var noticias = hojaAObjetos(obtenerHoja(SHEET_NOTICIAS))
    .filter(function(n){ return n.estado === 'publicado'; })
    .sort(function(a,b){ return new Date(b.fecha) - new Date(a.fecha); });
  if (p.limit) noticias = noticias.slice(0, parseInt(p.limit));
  return { ok: true, noticias: noticias };
}

function getNoticia(id) {
  var n = hojaAObjetos(obtenerHoja(SHEET_NOTICIAS))
    .filter(function(x){ return x.id === id && x.estado === 'publicado'; })[0];
  return n ? { ok: true, noticia: n } : { ok: false, error: 'No encontrada' };
}

function saveNoticia(p) {
  return guardarObjeto(SHEET_NOTICIAS, {
    id: p.id||'', titulo: p.titulo||'', resumen: p.resumen||'',
    contenido: p.contenido||'', categoria: p.categoria||'Noticias',
    estado: p.estado||'publicado', imagen: p.imagen||'',
    fecha: p.fecha||new Date().toISOString().split('T')[0], autor: p.autor||p._usuario||''
  });
}

// ── DOCUMENTOS ───────────────────────────────────────────
function getDocumentos() {
  var docs = hojaAObjetos(obtenerHoja(SHEET_DOCUMENTOS))
    .sort(function(a,b){ return new Date(b.fecha) - new Date(a.fecha); });
  return { ok: true, documentos: docs };
}

function saveDocumento(p) {
  return guardarObjeto(SHEET_DOCUMENTOS, {
    id: p.id||'', nombre: p.nombre||'', categoria: p.categoria||'Transparencia',
    fecha: p.fecha||'', url: p.url||'', descripcion: p.descripcion||''
  });
}

// ── EQUIPO ───────────────────────────────────────────────
function getEquipo() {
  return { ok: true, equipo: hojaAObjetos(obtenerHoja(SHEET_EQUIPO)) };
}

function saveEquipo(p) {
  return guardarObjeto(SHEET_EQUIPO, {
    id: p.id||'', nombre: p.nombre||'', cargo: p.cargo||'',
    cargo_tipo: p.cargo_tipo||'Otro', especialidad: p.especialidad||'',
    foto: p.foto||'', email: p.email||''
  });
}

// ── AVISOS ───────────────────────────────────────────────
function getAvisosActivos() {
  var avisos = hojaAObjetos(obtenerHoja(SHEET_AVISOS))
    .filter(function(a){ return a.activo === 'true'; });
  return { ok: true, avisos: avisos };
}

// ── SUBIDA DE IMÁGENES A GOOGLE DRIVE ────────────────────

function uploadImagen(p) {
  try {
    // Decodificar base64
    var base64  = p.base64;
    var nombre  = p.nombre  || ('imagen_' + Date.now() + '.jpg');
    var mimeType = p.mimeType || 'image/jpeg';

    if (!base64) return { ok: false, error: 'No se recibió imagen' };

    // Limpiar prefijo data:image/...;base64, si viene
    if (base64.indexOf(',') > -1) base64 = base64.split(',')[1];

    var bytes = Utilities.base64Decode(base64);
    var blob  = Utilities.newBlob(bytes, mimeType, nombre);

    // Obtener o crear carpeta "Noticias Escuela" en Drive
    var carpeta = obtenerCarpetaNoticias();
    var archivo = carpeta.createFile(blob);

    // Compartir públicamente (necesario para Instagram y visualización web)
    archivo.setSharing(
      DriveApp.Access.ANYONE_WITH_LINK,
      DriveApp.Permission.VIEW
    );

    var fileId = archivo.getId();
    // URL directa para visualización en web e Instagram
    var url = 'https://drive.google.com/uc?export=view&id=' + fileId;

    return { ok: true, url: url, fileId: fileId, nombre: nombre };
  } catch(e) {
    return { ok: false, error: 'Error subiendo imagen: ' + e.message };
  }
}

function obtenerCarpetaNoticias() {
  var nombreCarpeta = 'Noticias - Escuela Llankanao';
  // Buscar carpeta existente
  var carpetas = DriveApp.getFoldersByName(nombreCarpeta);
  if (carpetas.hasNext()) return carpetas.next();
  // Crear si no existe
  var nueva = DriveApp.createFolder(nombreCarpeta);
  nueva.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return nueva;
}



function getSocialConfig() {
  var raw = PropertiesService.getScriptProperties().getProperty('social_config');
  return { ok: true, config: raw ? JSON.parse(raw) : {} };
}

function saveSocialConfig(p) {
  var cfg = p.config;
  if (typeof cfg === 'string') {
    try { cfg = JSON.parse(cfg); } catch(e) { return { ok: false, error: 'Error parseando config' }; }
  }
  // Nunca guardar datos vacíos encima de datos existentes
  var raw = PropertiesService.getScriptProperties().getProperty('social_config');
  var actual = raw ? JSON.parse(raw) : {};
  var keys = Object.keys(cfg);
  for (var i = 0; i < keys.length; i++) {
    if (cfg[keys[i]] !== '') actual[keys[i]] = cfg[keys[i]];
  }
  PropertiesService.getScriptProperties().setProperty('social_config', JSON.stringify(actual));
  return { ok: true };
}

function publicarEnRedes(p) {
  var resultado = { ok: true, facebook: null, instagram: null };

  var raw = PropertiesService.getScriptProperties().getProperty('social_config');
  var social = raw ? JSON.parse(raw) : {};

  // ── FACEBOOK ──────────────────────────────────────────
  if (p.facebook === 'true' || p.facebook === true) {
    if (!social.fb_page_id || !social.fb_page_token) {
      resultado.facebook = { ok: false, error: 'Falta Page ID o Page Token de Facebook en Configuración → Redes Sociales' };
    } else {
      try {
        var fbMsg = p.titulo + '\n\n' + (p.resumen || '') + (p.link ? '\n\n🔗 ' + p.link : '');
        var fbParams = { message: fbMsg, access_token: social.fb_page_token };
        if (p.imagen_url) fbParams.link = p.imagen_url;

        var fbUrl = 'https://graph.facebook.com/v25.0/' + social.fb_page_id + '/feed';
        var fbResp = UrlFetchApp.fetch(fbUrl, {
          method: 'post',
          payload: fbParams,
          muteHttpExceptions: true
        });
        var fbData = JSON.parse(fbResp.getContentText());
        if (fbData.id) {
          resultado.facebook = { ok: true, post_id: fbData.id };
        } else {
          resultado.facebook = { ok: false, error: (fbData.error && fbData.error.message) || 'Error desconocido de Facebook' };
        }
      } catch(e) {
        resultado.facebook = { ok: false, error: 'Error de conexión con Facebook: ' + e.message };
      }
    }
  }

  // ── INSTAGRAM ─────────────────────────────────────────
  // Instagram requiere imagen pública + cuenta Business conectada a FB Page
  if (p.instagram === 'true' || p.instagram === true) {
    if (!social.ig_user_id || !social.ig_access_token) {
      resultado.instagram = { ok: false, error: 'Falta Instagram User ID o Access Token en Configuración → Redes Sociales' };
    } else if (!p.imagen_url) {
      resultado.instagram = { ok: false, error: 'Instagram requiere una imagen pública. Agrega URL de imagen a la noticia.' };
    } else {
      try {
        var igCaption = p.titulo + '\n\n' + (p.resumen || '') + (p.link ? '\n\n🔗 ' + p.link : '') + '\n\n' + (social.ig_hashtags || '');
        var igBase   = 'https://graph.facebook.com/v25.0/' + social.ig_user_id;
        var igToken  = social.ig_access_token;

        // Paso 1: Crear container
        var igMedia = UrlFetchApp.fetch(igBase + '/media', {
          method: 'post',
          payload: {
            image_url:    p.imagen_url,
            caption:      igCaption,
            access_token: igToken
          },
          muteHttpExceptions: true
        });
        var igMediaData = JSON.parse(igMedia.getContentText());

        if (!igMediaData.id) {
          resultado.instagram = { ok: false, error: (igMediaData.error && igMediaData.error.message) || 'No se pudo crear el container de Instagram' };
        } else {
          // Paso 2: Publicar container
          var igPub = UrlFetchApp.fetch(igBase + '/media_publish', {
            method: 'post',
            payload: {
              creation_id:  igMediaData.id,
              access_token: igToken
            },
            muteHttpExceptions: true
          });
          var igPubData = JSON.parse(igPub.getContentText());
          if (igPubData.id) {
            resultado.instagram = { ok: true, media_id: igPubData.id };
          } else {
            resultado.instagram = { ok: false, error: (igPubData.error && igPubData.error.message) || 'No se pudo publicar en Instagram' };
          }
        }
      } catch(e) {
        resultado.instagram = { ok: false, error: 'Error de conexión con Instagram: ' + e.message };
      }
    }
  }

  return resultado;
}

function getAvisosAll() {
  var avisos = hojaAObjetos(obtenerHoja(SHEET_AVISOS));
  return { ok: true, avisos: avisos };
}

function saveAviso(p) {
  return guardarObjeto(SHEET_AVISOS, {
    id: p.id||'', texto: p.texto||'',
    tipo: p.tipo||'info', activo: String(p.activo !== false)
  });
}

function toggleAviso(id) {
  var hoja = obtenerHoja(SHEET_AVISOS);
  var data = hoja.getDataRange().getValues();
  var idx  = data[0].indexOf('activo');
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      hoja.getRange(i+1, idx+1).setValue(data[i][idx] === 'true' ? 'false' : 'true');
      return { ok: true };
    }
  }
  return { ok: false };
}

// ── CONTACTOS ─────────────────────────────────────────────
function getContactos() {
  var contactos = hojaAObjetos(obtenerHoja(SHEET_CONTACTOS))
    .sort(function(a,b){ return new Date(b.fecha) - new Date(a.fecha); });
  return { ok: true, contactos: contactos };
}

function saveContacto(p) {
  return guardarObjeto(SHEET_CONTACTOS, {
    id: Utilities.getUuid(), nombre: p.nombre||'', email: p.email||'',
    asunto: p.asunto||'', mensaje: p.mensaje||'',
    fecha: new Date().toISOString(), leido: 'false'
  });
}

function marcarLeido(id) {
  var hoja = obtenerHoja(SHEET_CONTACTOS);
  var data = hoja.getDataRange().getValues();
  var idx  = data[0].indexOf('leido');
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      hoja.getRange(i+1, idx+1).setValue('true');
      return { ok: true };
    }
  }
  return { ok: false };
}

// ── CALENDARIO ────────────────────────────────────────────
function getCalendario() {
  var eventos = hojaAObjetos(obtenerHoja(SHEET_CALENDARIO))
    .sort(function(a,b){ return new Date(a.fecha) - new Date(b.fecha); });
  return { ok: true, eventos: eventos };
}

function saveCalendario(p) {
  return guardarObjeto(SHEET_CALENDARIO, {
    id: p.id||'', titulo: p.titulo||'', fecha: p.fecha||'',
    fecha_fin: p.fecha_fin||'', tipo: p.tipo||'evento', descripcion: p.descripcion||''
  });
}

// ── ACADÉMICO ─────────────────────────────────────────────
function getAcademico() {
  var raw = PropertiesService.getScriptProperties().getProperty('academico_config');
  return { ok: true, academico: raw ? JSON.parse(raw) : academicoDefault() };
}

function saveAcademico(p) {
  var academico = p.academico;
  if (typeof academico === 'string') {
    try { academico = JSON.parse(academico); } catch(e) { return { ok: false, error: 'Error parseando académico' }; }
  }
  if (!academico) return { ok: false, error: 'Sin datos' };
  PropertiesService.getScriptProperties().setProperty('academico_config', JSON.stringify(academico));
  return { ok: true };
}

function academicoDefault() {
  return {
    niveles: [
      { nombre:'1° Básico', descripcion:'Iniciación a la lectoescritura y matemáticas básicas.', foto:'' },
      { nombre:'2° Básico', descripcion:'Consolidación de lectura, escritura y operaciones fundamentales.', foto:'' },
      { nombre:'3° Básico', descripcion:'Ampliación del vocabulario y comprensión lectora.', foto:'' },
      { nombre:'4° Básico', descripcion:'Desarrollo del pensamiento crítico.', foto:'' },
      { nombre:'5° Básico', descripcion:'Profundización en ciencias naturales y sociales.', foto:'' },
      { nombre:'6° Básico', descripcion:'Fortalecimiento de habilidades comunicativas.', foto:'' },
      { nombre:'7° Básico', descripcion:'Preparación para el nivel medio.', foto:'' },
      { nombre:'8° Básico', descripcion:'Consolidación de la educación básica.', foto:'' }
    ],
    asignaturas: [
      { nombre:'Lenguaje y Comunicación', icono:'fas fa-book-open', color:'#3498db' },
      { nombre:'Matemáticas', icono:'fas fa-calculator', color:'#e74c3c' },
      { nombre:'Ciencias Naturales', icono:'fas fa-flask', color:'#2ecc71' },
      { nombre:'Historia y Cs. Sociales', icono:'fas fa-globe-americas', color:'#e67e22' },
      { nombre:'Inglés', icono:'fas fa-language', color:'#9b59b6' },
      { nombre:'Educación Física', icono:'fas fa-running', color:'#1abc9c' },
      { nombre:'Artes Visuales', icono:'fas fa-palette', color:'#f39c12' },
      { nombre:'Música', icono:'fas fa-music', color:'#e91e63' },
      { nombre:'Tecnología', icono:'fas fa-laptop', color:'#607d8b' },
      { nombre:'Religión', icono:'fas fa-star', color:'#795548' }
    ],
    programas: [
      { nombre:'PIE', descripcion:'Programa de Integración Escolar — apoyo especializado para estudiantes con NEE.' },
      { nombre:'SEP', descripcion:'Subvención Escolar Preferencial — reforzamiento para estudiantes prioritarios.' },
      { nombre:'JEC', descripcion:'Jornada Escolar Completa — horario extendido con actividades complementarias.' }
    ],
    horario: {
      manana: '08:00 – 13:30',
      almuerzo: '13:30 – 14:30',
      tarde: '14:30 – 16:30',
      dias: 'Lunes a Viernes'
    }
  };
}

// ── USUARIOS ──────────────────────────────────────────────
function getUsuarios() {
  var hoja = obtenerHoja(SHEET_USUARIOS);
  var data = hoja.getDataRange().getValues();
  if (data.length < 2) return { ok: true, usuarios: [] };
  var usuarios = data.slice(1).map(function(r){
    return { usuario: r[0], nombre: r[3]||'', rol: r[4]||'editor' };
  }).filter(function(u){ return u.usuario; });
  return { ok: true, usuarios: usuarios };
}

function saveUsuario(p) {
  var hoja = obtenerHoja(SHEET_USUARIOS);
  var data = hoja.getDataRange().getValues();
  // Actualizar si existe
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === p.usuario) {
      if (p.password) {
        var newSalt = Utilities.getUuid();
        hoja.getRange(i+1, 2).setValue(hash256(p.password + newSalt));
        hoja.getRange(i+1, 3).setValue(newSalt);
      }
      if (p.nombre) hoja.getRange(i+1, 4).setValue(p.nombre);
      if (p.rol)    hoja.getRange(i+1, 5).setValue(p.rol);
      return { ok: true };
    }
  }
  // Nuevo usuario
  if (!p.password) return { ok: false, error: 'Se requiere contraseña para nuevo usuario' };
  var salt = Utilities.getUuid();
  var h    = hash256(p.password + salt);
  hoja.appendRow([p.usuario, h, salt, p.nombre||'', p.rol||'editor']);
  return { ok: true };
}

function deleteUsuario(usuario) {
  if (usuario === 'admin') return { ok: false, error: 'No se puede eliminar al administrador principal' };
  var hoja = obtenerHoja(SHEET_USUARIOS);
  var data = hoja.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === usuario) { hoja.deleteRow(i+1); return { ok: true }; }
  }
  return { ok: false, error: 'Usuario no encontrado' };
}

// ── MÓDULOS PERSONALIZADOS ────────────────────────────────
function getModulos() {
  var raw = PropertiesService.getScriptProperties().getProperty('modulos_inicio');
  return { ok: true, modulos: raw ? JSON.parse(raw) : [] };
}

function saveModulos(p) {
  var modulos = p.modulos;
  if (typeof modulos === 'string') {
    try { modulos = JSON.parse(modulos); } catch(e) { return { ok: false, error: 'Error parseando módulos' }; }
  }
  PropertiesService.getScriptProperties().setProperty('modulos_inicio', JSON.stringify(modulos || []));
  return { ok: true };
}


function getGaleria() {
  var raw = PropertiesService.getScriptProperties().getProperty('galeria');
  return { ok: true, galeria: raw ? JSON.parse(raw) : [] };
}

function saveGaleria(p) {
  var galeria = p.galeria;
  if (typeof galeria === 'string') {
    try { galeria = JSON.parse(galeria); } catch(e) { return { ok: false, error: 'Error parseando galería' }; }
  }
  PropertiesService.getScriptProperties().setProperty('galeria', JSON.stringify(galeria || []));
  return { ok: true };
}

// ── SECCIONES INICIO ──────────────────────────────────────
function getSecciones() {
  var raw = PropertiesService.getScriptProperties().getProperty('secciones_inicio');
  return { ok: true, secciones: raw ? JSON.parse(raw) : seccionesDefault() };
}

function saveSecciones(p) {
  var secciones = p.secciones;
  if (typeof secciones === 'string') {
    try { secciones = JSON.parse(secciones); } catch(e) { return { ok: false, error: 'Error' }; }
  }
  PropertiesService.getScriptProperties().setProperty('secciones_inicio', JSON.stringify(secciones));
  return { ok: true };
}

function seccionesDefault() {
  return {
    hero:        { activa: true },
    plataformas: { activa: true },
    sobreNosotros: { activa: true },
    noticias:    { activa: true },
    galeria:     { activa: false, titulo: 'Galería Fotográfica', subtitulo: 'Momentos de nuestra comunidad educativa', columnas: 3 },
    redes:       { activa: true },
    matricula:   { activa: true }
  };
}


function getPagina(pagina) {
  var raw = PropertiesService.getScriptProperties().getProperty('pagina_' + pagina);
  return { ok: true, contenido: raw ? JSON.parse(raw) : null };
}

function savePagina(p) {
  var contenido = p.contenido;
  if (typeof contenido === 'string') {
    try { contenido = JSON.parse(contenido); } catch(e) { return { ok: false, error: 'Error parseando contenido' }; }
  }
  PropertiesService.getScriptProperties().setProperty('pagina_' + p.pagina, JSON.stringify(contenido || {}));
  return { ok: true };
}


function cambiarPassword(p) {
  var hoja = obtenerHoja(SHEET_USUARIOS);
  var data = hoja.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === p._usuario) {
      var salt = data[i][2];
      if (hash256(p.passwordActual + salt) !== data[i][1])
        return { ok: false, error: 'Contraseña actual incorrecta' };
      if (!p.passwordNueva || p.passwordNueva.length < 8)
        return { ok: false, error: 'Mínimo 8 caracteres' };
      var newSalt = Utilities.getUuid();
      hoja.getRange(i+1, 2).setValue(hash256(p.passwordNueva + newSalt));
      hoja.getRange(i+1, 3).setValue(newSalt);
      return { ok: true };
    }
  }
  return { ok: false, error: 'Usuario no encontrado' };
}

// ── INICIALIZACIÓN COMPLETA (primera vez) ─────────────────
function inicializarDatos() {
  var ss = SpreadsheetApp.create('Escuela Llankanao — Base de Datos Web');
  var id = ss.getId();
  PropertiesService.getScriptProperties().setProperty('spreadsheet_id', id);

  var columnas = {};
  columnas[SHEET_NOTICIAS]   = ['id','titulo','resumen','contenido','categoria','estado','imagen','fecha','autor'];
  columnas[SHEET_DOCUMENTOS] = ['id','nombre','categoria','fecha','url','descripcion'];
  columnas[SHEET_EQUIPO]     = ['id','nombre','cargo','cargo_tipo','especialidad','foto','email'];
  columnas[SHEET_AVISOS]     = ['id','texto','tipo','activo'];
  columnas[SHEET_CONTACTOS]  = ['id','nombre','email','asunto','mensaje','fecha','leido'];
  columnas[SHEET_USUARIOS]   = ['usuario','hash','salt','nombre','rol'];
  columnas[SHEET_CALENDARIO] = ['id','titulo','fecha','fecha_fin','tipo','descripcion'];

  var hojaInicial = ss.getSheets()[0];
  var nombres = Object.keys(columnas);
  for (var i = 0; i < nombres.length; i++) {
    var nombre = nombres[i];
    var cols   = columnas[nombre];
    var hoja   = ss.insertSheet(nombre);
    hoja.getRange(1, 1, 1, cols.length).setValues([cols]);
    hoja.getRange(1, 1, 1, cols.length).setFontWeight('bold');
    hoja.setFrozenRows(1);
  }
  try { ss.deleteSheet(hojaInicial); } catch(e) {}

  var salt = Utilities.getUuid();
  ss.getSheetByName(SHEET_USUARIOS).appendRow(['admin', hash256('Llankanao2024!' + salt), salt, 'Administrador', 'admin']);

  PropertiesService.getScriptProperties().setProperty('site_config', JSON.stringify({
    nombre: 'Escuela Básica Llankanao M.F.M.S.', slogan: 'Formando ciudadanos para el futuro',
    logo: '', facebook: '', instagram: '',
    direccion: 'Linares, Región del Maule, Chile', telefono: '', email: '',
    plataformas: [
      { nombre:'Sistema de Notas',   url:'', clave:'', descripcion:'Ingreso y consulta de calificaciones' },
      { nombre:'Consulta de Notas',  url:'', clave:'', descripcion:'Consulta en línea para apoderados' },
      { nombre:'Inspectoría',        url:'', clave:'', descripcion:'Gestión de atrasos y permisos' },
      { nombre:'Gestión de Bodega',  url:'', clave:'', descripcion:'Control de inventario escolar' },
      { nombre:'Transporte Escolar', url:'', clave:'', descripcion:'Gestión de rutas y despacho' }
    ]
  }));

  Logger.log('✅ Listo. Hoja: ' + ss.getUrl());
  Logger.log('👤 admin / Llankanao2024!');
}

// ── MIGRACIÓN (si ya tienes datos) ────────────────────────
// Ejecutar una vez para agregar las hojas nuevas sin borrar nada
function agregarHojasNuevas() {
  var ss = abrirSS();
  if (!ss) { Logger.log('ERROR: Ejecuta inicializarDatos() primero'); return; }

  // Agregar columna rol a Usuarios si no existe
  var hUsuarios = ss.getSheetByName(SHEET_USUARIOS);
  var headers   = hUsuarios.getRange(1, 1, 1, hUsuarios.getLastColumn()).getValues()[0];
  if (headers.indexOf('rol') === -1) {
    hUsuarios.getRange(1, headers.length + 1).setValue('rol');
    hUsuarios.getRange(1, headers.length + 1).setFontWeight('bold');
    // Poner 'admin' al usuario admin
    var data = hUsuarios.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === 'admin') hUsuarios.getRange(i+1, headers.length + 1).setValue('admin');
      else hUsuarios.getRange(i+1, headers.length + 1).setValue('editor');
    }
    Logger.log('✅ Columna rol agregada a Usuarios');
  }

  // Crear hoja Calendario si no existe
  if (!ss.getSheetByName(SHEET_CALENDARIO)) {
    var hCal = ss.insertSheet(SHEET_CALENDARIO);
    var cols = ['id','titulo','fecha','fecha_fin','tipo','descripcion'];
    hCal.getRange(1, 1, 1, cols.length).setValues([cols]);
    hCal.getRange(1, 1, 1, cols.length).setFontWeight('bold');
    hCal.setFrozenRows(1);
    Logger.log('✅ Hoja Calendario creada');
  }

  // Agregar campo clave a plataformas en config
  var raw = PropertiesService.getScriptProperties().getProperty('site_config');
  if (raw) {
    var cfg = JSON.parse(raw);
    if (cfg.plataformas) {
      cfg.plataformas = cfg.plataformas.map(function(p){
        if (!p.hasOwnProperty('clave')) p.clave = '';
        return p;
      });
      PropertiesService.getScriptProperties().setProperty('site_config', JSON.stringify(cfg));
    }
  }

  Logger.log('✅ Migración completada');
}
