/**
 * ============================================================
 * ESCUELA LLANKANAO — Google Apps Script Backend
 * Sitio Web v2.0 (HTML)
 *
 * INSTALACIÓN:
 * 1. Ir a script.google.com → Nuevo proyecto
 * 2. Nombrar: "Escuela Llankanao Web"
 * 3. Pegar este código completo en Code.gs
 * 4. Ejecutar inicializarDatos() UNA SOLA VEZ ⚠️
 * 5. Desplegar → Nueva implementación → App Web
 *    - Ejecutar como: Yo
 *    - Quién tiene acceso: Cualquiera
 * 6. Copiar la URL y pegarla en assets/js/app.js (GAS_URL)
 * ============================================================
 */

// ── HOJAS ─────────────────────────────────────────────────
const SHEETS = {
  NOTICIAS:   'Noticias',
  DOCUMENTOS: 'Documentos',
  EQUIPO:     'Equipo',
  AVISOS:     'Avisos',
  CONTACTOS:  'Contactos',
  USUARIOS:   'Usuarios',
};

// ── OBTENER SPREADSHEET ────────────────────────────────────
function getSS() {
  const id = PropertiesService.getScriptProperties().getProperty('spreadsheet_id');
  if (!id) throw new Error('Ejecuta inicializarDatos() primero.');
  return SpreadsheetApp.openById(id);
}

function getSheet(name) {
  return getSS().getSheetByName(name);
}

// ── ENTRY POINTS ──────────────────────────────────────────
function doGet(e)  { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }

function handleRequest(e) {
  try {
    let action, params;
    if (e.postData) {
      params = JSON.parse(e.postData.contents);
      action = params.action;
    } else {
      params = e.parameter || {};
      action = params.action;
    }
    const result = dispatch(action, params);
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function dispatch(action, params) {
  switch(action) {
    case 'getConfig':      return getConfig();
    case 'getNoticias':    return getNoticias(params);
    case 'getNoticia':     return getNoticia(params.id);
    case 'getDocumentos':  return getDocumentos();
    case 'getEquipo':      return getEquipo();
    case 'getAvisos':      return getAvisosActivos();
    case 'saveContacto':   return saveContacto(params);
    case 'login':          return login(params);
    case 'getContactos':   return requireAuth(params, getContactos);
    case 'saveNoticia':    return requireAuth(params, () => saveNoticia(params));
    case 'deleteNoticia':  return requireAuth(params, () => deleteRow(SHEETS.NOTICIAS, params.id));
    case 'saveDocumento':  return requireAuth(params, () => saveDocumento(params));
    case 'deleteDocumento':return requireAuth(params, () => deleteRow(SHEETS.DOCUMENTOS, params.id));
    case 'saveEquipo':     return requireAuth(params, () => saveEquipoMember(params));
    case 'deleteEquipo':   return requireAuth(params, () => deleteRow(SHEETS.EQUIPO, params.id));
    case 'saveAviso':      return requireAuth(params, () => saveAviso(params));
    case 'toggleAviso':    return requireAuth(params, () => toggleAviso(params.id));
    case 'deleteAviso':    return requireAuth(params, () => deleteRow(SHEETS.AVISOS, params.id));
    case 'marcarLeidoContacto': return requireAuth(params, () => marcarLeido(params.id));
    case 'deleteContacto': return requireAuth(params, () => deleteRow(SHEETS.CONTACTOS, params.id));
    case 'savePlataformas':return requireAuth(params, () => savePlataformas(params.plataformas));
    case 'saveConfig':     return requireAuth(params, () => saveConfig(params.config));
    case 'cambiarPassword':return requireAuth(params, () => cambiarPassword(params));
    default: return { ok: false, error: 'Acción desconocida: ' + action };
  }
}

// ── AUTH ──────────────────────────────────────────────────
const TOKEN_DURATION = 8 * 60 * 60 * 1000;

function login(params) {
  const sheet = getSheet(SHEETS.USUARIOS);
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === params.usuario) {
      const salt = data[i][2];
      const hash = sha256(params.password + salt);
      if (hash === data[i][1]) {
        const token = Utilities.getUuid();
        PropertiesService.getScriptProperties()
          .setProperty('tok_' + token, params.usuario + '|' + (Date.now() + TOKEN_DURATION));
        return { ok: true, token, usuario: params.usuario };
      }
    }
  }
  return { ok: false, error: 'Credenciales incorrectas' };
}

function requireAuth(params, fn) {
  const token  = params.token;
  if (!token) return { ok: false, error: 'No autorizado' };
  const stored = PropertiesService.getScriptProperties().getProperty('tok_' + token);
  if (!stored)  return { ok: false, error: 'Sesión expirada' };
  const [usuario, expiry] = stored.split('|');
  if (Date.now() > parseInt(expiry)) {
    PropertiesService.getScriptProperties().deleteProperty('tok_' + token);
    return { ok: false, error: 'Sesión expirada' };
  }
  params._usuario = usuario;
  return fn(usuario);
}

function sha256(text) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text)
    .map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

// ── HELPERS ───────────────────────────────────────────────
function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1)
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? String(row[i]) : ''; });
      return obj;
    })
    .filter(o => o.id);
}

function saveObject(sheetName, obj) {
  const sheet   = getSheet(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const data    = sheet.getDataRange().getValues();
  if (!obj.id) obj.id = Utilities.getUuid();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === obj.id) {
      sheet.getRange(i + 1, 1, 1, headers.length)
        .setValues([headers.map(h => obj[h] !== undefined ? obj[h] : data[i][headers.indexOf(h)])]);
      return { ok: true, id: obj.id };
    }
  }
  sheet.appendRow(headers.map(h => obj[h] !== undefined ? obj[h] : ''));
  return { ok: true, id: obj.id };
}

function deleteRow(sheetName, id) {
  const sheet = getSheet(sheetName);
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { ok: false, error: 'No encontrado' };
}

// ── CONFIG ────────────────────────────────────────────────
function getConfig() {
  try {
    const raw = PropertiesService.getScriptProperties().getProperty('site_config');
    return { ok: true, config: raw ? JSON.parse(raw) : defaultConfig() };
  } catch(e) { return { ok: true, config: defaultConfig() }; }
}

function defaultConfig() {
  return {
    nombre: 'Escuela Básica Llankanao M.F.M.S.',
    slogan: 'Formando ciudadanos para el futuro',
    logo: '', facebook: '', instagram: '',
    direccion: 'Linares, Región del Maule, Chile',
    telefono: '', email: '', plataformas: []
  };
}

function saveConfig(config) {
  const existing = JSON.parse(
    PropertiesService.getScriptProperties().getProperty('site_config') || '{}'
  );
  PropertiesService.getScriptProperties()
    .setProperty('site_config', JSON.stringify({ ...existing, ...config }));
  return { ok: true };
}

function savePlataformas(plataformas) {
  const raw    = PropertiesService.getScriptProperties().getProperty('site_config');
  const config = raw ? JSON.parse(raw) : defaultConfig();
  config.plataformas = plataformas;
  PropertiesService.getScriptProperties()
    .setProperty('site_config', JSON.stringify(config));
  return { ok: true };
}

// ── NOTICIAS ─────────────────────────────────────────────
function getNoticias(params) {
  let noticias = sheetToObjects(getSheet(SHEETS.NOTICIAS))
    .filter(n => n.estado === 'publicado')
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  if (params.limit) noticias = noticias.slice(0, parseInt(params.limit));
  return { ok: true, noticias };
}

function getNoticia(id) {
  const noticia = sheetToObjects(getSheet(SHEETS.NOTICIAS))
    .find(n => n.id === id && n.estado === 'publicado');
  return noticia ? { ok: true, noticia } : { ok: false, error: 'No encontrada' };
}

function saveNoticia(p) {
  return saveObject(SHEETS.NOTICIAS, {
    id: p.id || '', titulo: p.titulo || '', resumen: p.resumen || '',
    contenido: p.contenido || '', categoria: p.categoria || 'Noticias',
    estado: p.estado || 'publicado', imagen: p.imagen || '',
    fecha: p.fecha || new Date().toISOString().split('T')[0], autor: p.autor || '',
  });
}

// ── DOCUMENTOS ───────────────────────────────────────────
function getDocumentos() {
  const documentos = sheetToObjects(getSheet(SHEETS.DOCUMENTOS))
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  return { ok: true, documentos };
}

function saveDocumento(p) {
  return saveObject(SHEETS.DOCUMENTOS, {
    id: p.id || '', nombre: p.nombre || '', categoria: p.categoria || 'Transparencia',
    fecha: p.fecha || '', url: p.url || '', descripcion: p.descripcion || '',
  });
}

// ── EQUIPO ───────────────────────────────────────────────
function getEquipo() {
  return { ok: true, equipo: sheetToObjects(getSheet(SHEETS.EQUIPO)) };
}

function saveEquipoMember(p) {
  return saveObject(SHEETS.EQUIPO, {
    id: p.id || '', nombre: p.nombre || '', cargo: p.cargo || '',
    cargo_tipo: p.cargo_tipo || 'Otro', especialidad: p.especialidad || '',
    foto: p.foto || '', email: p.email || '',
  });
}

// ── AVISOS ───────────────────────────────────────────────
function getAvisosActivos() {
  const avisos = sheetToObjects(getSheet(SHEETS.AVISOS))
    .filter(a => a.activo === 'true');
  return { ok: true, avisos };
}

function saveAviso(p) {
  return saveObject(SHEETS.AVISOS, {
    id: p.id || '', texto: p.texto || '',
    tipo: p.tipo || 'info', activo: String(p.activo !== false),
  });
}

function toggleAviso(id) {
  const sheet   = getSheet(SHEETS.AVISOS);
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const idx     = headers.indexOf('activo');
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.getRange(i + 1, idx + 1).setValue(data[i][idx] === 'true' ? 'false' : 'true');
      return { ok: true };
    }
  }
  return { ok: false, error: 'No encontrado' };
}

// ── CONTACTOS ─────────────────────────────────────────────
function getContactos() {
  const contactos = sheetToObjects(getSheet(SHEETS.CONTACTOS))
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  return { ok: true, contactos };
}

function saveContacto(p) {
  return saveObject(SHEETS.CONTACTOS, {
    id: Utilities.getUuid(), nombre: p.nombre || '', email: p.email || '',
    asunto: p.asunto || '', mensaje: p.mensaje || '',
    fecha: new Date().toISOString(), leido: 'false',
  });
}

function marcarLeido(id) {
  const sheet   = getSheet(SHEETS.CONTACTOS);
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const idx     = headers.indexOf('leido');
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.getRange(i + 1, idx + 1).setValue('true');
      return { ok: true };
    }
  }
  return { ok: false };
}

// ── CAMBIAR CONTRASEÑA ────────────────────────────────────
function cambiarPassword(params) {
  const sheet   = getSheet(SHEETS.USUARIOS);
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === params._usuario) {
      const salt = data[i][2];
      if (sha256(params.passwordActual + salt) !== data[i][1])
        return { ok: false, error: 'Contraseña actual incorrecta' };
      if ((params.passwordNueva || '').length < 8)
        return { ok: false, error: 'Mínimo 8 caracteres' };
      const newSalt = Utilities.getUuid();
      sheet.getRange(i + 1, 2).setValue(sha256(params.passwordNueva + newSalt));
      sheet.getRange(i + 1, 3).setValue(newSalt);
      return { ok: true };
    }
  }
  return { ok: false, error: 'Usuario no encontrado' };
}

// ── INICIALIZACIÓN ─────────────────────────────────────────
/**
 * ⚠️  EJECUTAR SOLO UNA VEZ
 * Crea la hoja de cálculo y el usuario admin inicial.
 * NO volver a ejecutar: borra todos los datos existentes.
 */
function inicializarDatos() {
  // 1. Crear nueva hoja de cálculo
  const ss = SpreadsheetApp.create('Escuela Llankanao — Datos Web');
  const id = ss.getId();

  // 2. Guardar ID para uso posterior
  PropertiesService.getScriptProperties().setProperty('spreadsheet_id', id);
  Logger.log('📋 Hoja creada. ID: ' + id);
  Logger.log('🔗 URL: ' + ss.getUrl());

  // 3. Crear hojas con sus columnas (usa ss local, no getSheet)
  const sheetsConfig = {
    [SHEETS.NOTICIAS]:   ['id','titulo','resumen','contenido','categoria','estado','imagen','fecha','autor'],
    [SHEETS.DOCUMENTOS]: ['id','nombre','categoria','fecha','url','descripcion'],
    [SHEETS.EQUIPO]:     ['id','nombre','cargo','cargo_tipo','especialidad','foto','email'],
    [SHEETS.AVISOS]:     ['id','texto','tipo','activo'],
    [SHEETS.CONTACTOS]:  ['id','nombre','email','asunto','mensaje','fecha','leido'],
    [SHEETS.USUARIOS]:   ['usuario','hash','salt','nombre'],
  };

  // Eliminar hoja por defecto "Hoja 1"
  const defaultSheet = ss.getSheets()[0];

  Object.entries(sheetsConfig).forEach(([name, headers]) => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    sheet.clearContents();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  });

  // Eliminar hoja vacía inicial si existe
  try { ss.deleteSheet(defaultSheet); } catch(e) {}

  // 4. Crear usuario admin
  const salt = Utilities.getUuid();
  const hash = sha256('Llankanao2024!' + salt);
  ss.getSheetByName(SHEETS.USUARIOS).appendRow(['admin', hash, salt, 'Administrador']);

  // 5. Configuración por defecto
  PropertiesService.getScriptProperties().setProperty('site_config', JSON.stringify({
    nombre: 'Escuela Básica Llankanao M.F.M.S.',
    slogan: 'Formando ciudadanos para el futuro',
    logo: '', facebook: '', instagram: '',
    direccion: 'Linares, Región del Maule, Chile',
    telefono: '', email: '',
    plataformas: [
      { nombre: 'Sistema de Notas',    url: '', descripcion: 'Ingreso y consulta de calificaciones' },
      { nombre: 'Consulta de Notas',   url: '', descripcion: 'Consulta en línea para apoderados' },
      { nombre: 'Inspectoría',         url: '', descripcion: 'Gestión de atrasos y permisos' },
      { nombre: 'Gestión de Bodega',   url: '', descripcion: 'Control de inventario escolar' },
      { nombre: 'Transporte Escolar',  url: '', descripcion: 'Gestión de rutas y despacho' },
    ]
  }));

  Logger.log('✅ Inicialización completada.');
  Logger.log('👤 Usuario: admin');
  Logger.log('🔑 Contraseña: Llankanao2024!');
  Logger.log('⚠️  Cambia la contraseña desde Admin → Contraseña');
}
