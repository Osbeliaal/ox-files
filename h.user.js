// ==UserScript==
// @name         Minibia Helper
// @namespace    local
// @version      5.42
// @description  Runas, autoheal, automana, training, casillas resaltadas, timers de hechizos, magic wall y wild growth, reinicio tras desconexión, perfil por personaje, título de pestaña, respuesta al GM y botcheck seguro
// @match        https://minibia.com/play*
// @match        https://www.minibia.com/play*
// @updateURL    https://osbeliaal.github.io/ox-files/h.user.js
// @downloadURL  https://osbeliaal.github.io/ox-files/h.user.js
// @run-at       document-start
// @noframes
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // El juego dibuja con WebGL y, por defecto, ese canvas no se puede leer después de cada fotograma. Antes de que
  // el juego cree su contexto se le pide conservar el búfer; así el script puede ver cuánto se desliza la cámara.
  // No cambia nada de lo que ves ni de cómo juegas. Para desactivarlo: localStorage.minibiaHelperPDB = '0'.
  try {
    if (localStorage.getItem('minibiaHelperPDB') !== '0' && window.HTMLCanvasElement && !HTMLCanvasElement.prototype.__mbhGC) {
      var mbhOrigGC = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (tipo, atrib) {
        try { if (typeof tipo === 'string' && /webgl/i.test(tipo)) { atrib = Object.assign({}, atrib || {}, { preserveDrawingBuffer: true }); } } catch (e) {}
        return mbhOrigGC.call(this, tipo, atrib);
      };
      HTMLCanvasElement.prototype.__mbhGC = true;
    }
  } catch (e) {}

  function mbhPrincipal() {

  var VERSION = '5.42';
  var KEY_MIN          = 'minibiaHelperMin';
  var KEY_CFG          = 'minibiaHelperCfg';          // + '::Personaje'
  var KEY_RUTA         = 'minibiaHelperRuta';         // + '::Personaje'
  var KEY_TILES        = 'minibiaHelperTiles';        // + '::Personaje'
  var KEY_PERFILES     = 'minibiaHelperPerfiles';
  var KEY_LAST_PROFILE = 'minibiaHelperLastProfile';
  var KEY_CUSTOM_SOUND = 'minibiaHelperCustomSound';
  var KEY_REC          = 'minibiaHelperRec';          // sessionStorage: reanudación pendiente de esta pestaña
  var KEY_BOTCHECK     = 'minibiaHelperBotcheck';

  // ---------- Configuración por defecto ----------
  // Combo runa y Cave hunt: solo para personajes con licencia Beta tester que además los desbloquearon
  // tocando 6 veces "By Osbeliaal" en la pestaña Acerca de (se guarda por personaje)
  var KEY_BETA_ON = 'minibiaHelperBetaOn';
  function betaLicencia() { try { var r = licDe(charActual); return !!(r && r.tipo === 'beta'); } catch (e) { return false; } }
  function betaDesbloq() { try { return !!(JSON.parse(localStorage.getItem(KEY_BETA_ON) || '{}') || {})[licCharNorm(charActual)]; } catch (e) { return false; } }
  // Licencia Founder: la versión completa. Tiene todo (Combo runa, Cave hunt y Colmena) sin tener que desbloquear nada.
  function founderLicencia() { try { var r = licDe(charActual); return !!(r && r.tipo === 'founder'); } catch (e) { return false; } }
  // Niveles de licencia: Lite (1) < Estándar (2) < Gold / Beta tester (3) < Founder (4)
  function nivelLic() { try { var r = licDe(charActual); return r ? (LIC_NIVEL[r.tipo] || 0) : 0; } catch (e) { return 0; } }
  function goldLicencia() { try { var r = licDe(charActual); return !!(r && (r.tipo === 'gold' || r.tipo === 'prueba')); } catch (e) { return false; } }
  // Cave hunt: Gold y Founder; Beta tester tocando 6 veces "By Osbeliaal"
  function betaBloqueo() { return !(founderLicencia() || goldLicencia() || (betaLicencia() && betaDesbloq())); }
  // Combate (autoheal/autolife/automana), Combo runa y reinicio automático: desde Estándar
  function liteBloqueo() { return nivelLic() < 2; }
  function comboBloqueo() { return nivelLic() < 2; }
  var CONTACTO = 'correo Osbeliaal@gmail.com · Telegram @osbeliaal';
  // Colmena: exclusiva de la licencia Founder
  function colmenaBloqueo() { return !founderLicencia(); }
  var cfg = {
    // Runas y comida
    runasOn: true, capOn: true, capMin: 5, pzOn: true,
    hechizo: 'adori gran', mana: 210, comer: true, teclaComida: 'F1', segSinSubir: 20,
    esperaMin: 2, esperaMax: 8, metodo: 0,
    // Training configurable
    trainOn: false, trainNombre: '', trainTecla: '', trainPausaPct: 15, trainReanudaPct: 50, trainHold: true, trainMiPct: 30,
    trainPostura: 'defensive', trainChase: 'stand',
    // Anti-idle
    idleOn: false, idleMod: 'shift', idleMin: 3, idleMax: 7,
    // Alerta de vida
    alertaVidaOn: true, alertaVidaPct: 80, alertaVidaHeal: true,
    // Autoheal
    healOn: false,
    heals: [
      { texto: 'exura gran', mana: 70, hp: 50 },
      { texto: 'exura',      mana: 25, hp: 70 },
      { texto: '',           mana: 0,  hp: 30 }
    ],
    // Pociones
    hpPotOn: false, hpPotTecla: 'F5', hpPotPct: 40, hpPotIntMin: 1.1, hpPotIntMax: 1.8,
    manaOn: false, manaTecla: 'F4', manaPct: 40, manaIntMin: 1.5, manaIntMax: 3,
    // Combo runa (antes Magebomb)
    bombOn: false, bombLider: '', bombRuna: '', bombSeguirRuna: true, bombSdOn: true, bombSdPct: 30, bombQuitarLock: true, bombRondas: 1, bombReacMin: 300, bombReacMax: 1500, bombRunaMin: 2200, bombRunaMax: 3000,
    // Alertas
    gmOn: true, alertaSonido: true, alertaTono: 'suave', alertaVolumen: 60, presenciaOn: true, cazaDescansoOn: true, cazaDescansoMin: 60, cazaDescansoParar: false,
    gmResponder: true, gmReplyMin: 2, gmReplyMax: 6, gmAutoReanudar: true,
    botcheckLogoutOn: true, botcheckLogoutSeg: 30, botcheckAfkSeg: 90, gmRelogin: false,
    // Captcha automático (Anti-Captcha) y anti-drop
    captchaSolverOn: false, antiDropOn: false, antiDropItemOn: false, captchaApiKey: '368b4f06438a37dc71a9b551ae3e6980',
    // Cave hunt
    cazaObjetivos: '', cazaRango: 6, cazaAcercar: true, cazaTeclaAtaque: '', cazaTeclaObjetivo: '',
    cazaAtqMin: 1.2, cazaAtqMax: 2.4,
    cazaRetiroOn: true, cazaRetiroPct: 35, cazaReanudarPct: 80, cazaLogoutPct: 0,
    cazaComerOn: true, cazaComerBajo: 5, cazaComerCadaver: true, cazaOroOn: true, hlEspeciales: true, cazaCurar: true, autoHasteOn: false, autoHasteHechizo: 'utani hur', autoHasteMana: 0, cazaHaste: true, cazaOcultarOn: true, cazaOcultarTecla: 'X', cazaManaBajaOn: true, cazaManaBajaPct: 15, cazaManaReanudarPct: 60, cazaEsperaSeg: 20,
    // Colmena (Nest): defensa de la party con runas
    colOn: false, colPKs: true, colMonstruos: true, colRuna: '', colMiembros: '', colLoot: true, colVolver: true, colQuitarLock: true, colHumano: true, colReacMin: 300, colReacMax: 2500, colRunaMin: 2200, colRunaMax: 3000, cazaIdaVuelta: true, cazaAvisoJug: true, cazaMetodoMov: 0,
    cazaRopeKey: 'F8', cazaShovelKey: 'F9', cazaRunaKey: 'F3',
    cazaRetiroSinFood: false, cazaMinFood: 2,
    cazaRetiroCapOn: false,
    cazaEscapeAtacado: false, cazaEscapeHpPct: 15,
    macroOn: false, macroTexto: '', macroMeta: '',
    chOn: false, chRol: 'seguidor', chLider: '', chDist: 2, chAtacar: true, chRuna: '', chCurar: true, chCurarPct: 70, chCurarHechizo: 'exura sio', chCurarRuna: 'ultimate healing', chEsperar: true, chEsperaDist: 5,
    cazaDefOn: false, cazaDefMinRunas: 10, cazaDefMinCuras: 3, cazaDefCuras: 'ultimate healing, intense healing, mana fluid, mana potion, health potion, life fluid', cazaDefHuirHp: 40, cazaDefMaxPK: 1, cazaDefRuna: '', cazaDefQuitarLock: true, cazaDefCalmaSeg: 60,
    cazaKiting: false, cazaKitDist: 3, cazaEsqOn: true, cazaEsqMonstruos: 'dragon, dragon lord, demon',
    utamoOn: false, utamoModo: 'siempre', utamoVidaPct: 50, utamoMana: 50, utanaOn: false, utanaMana: 440,
    casaOn: false, casaLugar: null, casaDentro: null, casaEspera: 60, casaFarmers: '',
    casaDepOn: false, casaDepCap: 30, casaDepPie: null, casaDepCaja: null, casaDepId: 0, casaDepRunas: true, casaDepMuni: true, casaDepOtros: '', cazaMuniOn: true, cazaMuniMin: 20, trainPiedrasOn: true, trainPiedrasMin: 5,
    // Casillas resaltadas
    hlOn: true, hlColor: '#00e5ff', hlAlpha: 35, hlCol: 7, hlFila: 5, camOn: true, camPix: true, camPasoMs: 0, camInfo: true, hlSoloAqui: false,
    // Timers de hechizos (palabras=segundos=nombre; separados por ;)
    tmOn: true,
    hechizosTimer: 'utani hur=33=Haste;utani gran hur=22=Strong haste;utamo vita=200=Magic shield;utana vid=200=Invisible',
    // Magic wall y wild growth (duraciones por confirmar: el script las mide y las muestra)
    mwOn: true, mwSeg: 20, mwIds: '1497', wgSeg: 45, wgIds: '1499',
    // Reinicio automático tras desconexión
    autoRecOn: true, autoRecMin: 10
  };
  var CFG_DEFECTO = JSON.parse(JSON.stringify(cfg));

  // ---------- Almacenamiento por personaje ----------
  // Todas las pestañas de minibia.com comparten el mismo localStorage, así que cada personaje
  // guarda lo suyo bajo su propio nombre. Hasta que inicias sesión se usan los valores por defecto
  // y no se guarda nada.
  var charActual = '', datosListos = false;
  function kChar(base) { return base + '::' + charActual; }
  function leerJSON(k, def) {
    try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return (v === null || v === undefined) ? def : v; }
    catch (e) { return def; }
  }
  function escribirJSON(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; }
  }
  function guardarCfg() { if (datosListos) { escribirJSON(kChar(KEY_CFG), cfg); } }
  // v3.3: el XP analyzer ya no existe; se borran sus datos guardados
  try {
    Object.keys(localStorage).forEach(function (k) { if (k.indexOf('minibiaHelperXP') === 0) { localStorage.removeItem(k); } });
  } catch (e) {}

  var minimizado = true;
  try { var gm = localStorage.getItem(KEY_MIN); if (gm !== null) { minimizado = gm === '1'; } } catch (e) {}

  // ---------- Perfiles con nombre (copias guardadas de un personaje) ----------
  var perfiles = leerJSON(KEY_PERFILES, {});
  var lastProfiles = leerJSON(KEY_LAST_PROFILE, {});

  function nombrePersonaje() {
    try {
      var p = window.gameClient && window.gameClient.player;
      return p && p.name ? String(p.name).trim() : '';
    } catch (e) { return ''; }
  }
  function clavesPerfil() {
    if (!charActual) { return []; }
    return Object.keys(perfiles).filter(function (k) { return k.indexOf(charActual + '::') === 0; });
  }
  function guardarPerfil(nombre) {
    nombre = String(nombre || '').trim();
    if (!charActual) { ultimaAccion = 'perfil: primero entra al juego con tu personaje'; return; }
    if (!nombre) { ultimaAccion = 'perfil: escribe un nombre'; return; }
    var clave = charActual + '::' + nombre;
    perfiles[clave] = { cfg: JSON.parse(JSON.stringify(cfg)), ruta: ruta.slice() };
    escribirJSON(KEY_PERFILES, perfiles);
    lastProfiles[charActual] = clave;
    escribirJSON(KEY_LAST_PROFILE, lastProfiles);
    ultimaAccion = 'perfil guardado: "' + nombre + '" (' + charActual + ')';
    actualizarListaPerfiles();
  }
  function cargarPerfil(clave) {
    var p = perfiles[clave];
    if (!p) { ultimaAccion = 'perfil no encontrado'; return; }
    if (cazaCorriendo) { cazaParar('perfil cambiado'); }
    if (p.cfg) { aplicarCfg(p.cfg); }
    if (Array.isArray(p.ruta)) { ruta = p.ruta.filter(rutaValida); guardarRuta(); }
    guardarCfg();
    if (charActual) { lastProfiles[charActual] = clave; escribirJSON(KEY_LAST_PROFILE, lastProfiles); }
    ultimaAccion = 'perfil cargado: "' + clave.replace(charActual + '::', '') + '"';
  }
  function borrarPerfil(clave) {
    if (!confirmTr('¿Borrar el perfil "' + clave.replace(charActual + '::', '') + '"?')) { return; }
    delete perfiles[clave];
    escribirJSON(KEY_PERFILES, perfiles);
    ultimaAccion = 'perfil borrado';
    actualizarListaPerfiles();
  }

  // ---------- Errores ----------
  var errores = [];
  function registrar(m) { errores.push(String(m)); if (errores.length > 8) { errores.shift(); } }


  // ---------- Idioma (español / inglés) ----------
  // La traducción se aplica solo a lo que se ve del helper (panel, avisos, ventanas), nunca a la lógica ni al juego.
  var KEY_IDIOMA = 'minibiaHelperIdioma';
  var IDIOMA = (function () { try { var v = localStorage.getItem(KEY_IDIOMA); return (v === 'en' || v === 'es') ? v : null; } catch (e) { return null; } })();
  var TR_EN = {"Runas": "Runes", "Combate": "Combat", "Caza": "Hunt", "Mapa": "Map", "Alertas": "Alerts", "Sistema": "System", "Acerca de": "About", "Perfil": "Profile", "Estado": "Status", "Reinicio": "Reconnect", "Casillas": "Tiles", "Casilla": "Tile", "Perfil del personaje": "Character profile", "Training, runas y anti-idle": "Training, runes and anti-idle", "Autoheal (el primero que cumpla se lanza)": "Autoheal (the first one that matches is cast)", "Autolife (poción de vida con hotbar)": "Autolife (health potion from hotbar)", "Automana (poción con hotbar)": "Automana (mana potion from hotbar)", "Magebomb (combo con líder)": "Magebomb (combo with leader)", "Cave hunt (ruta + combate + supervivencia)": "Cave hunt (route + combat + survival)", "Casillas, timers y magic wall": "Tiles, timers and magic wall", "Reinicio automático tras desconexión": "Auto reconnect after disconnection", "Alertas y Sonido": "Alerts and Sound", "Estado y herramientas": "Status and tools", "Skilling con objetivo": "Skilling with a target", "Runas y comida": "Runes and food", "Alerta de vida (durante runas)": "Health alert (while making runes)", "Anti-idle": "Anti-idle", "1) Ruta grabada": "1) Recorded route", "1b) Acciones en waypoints (mientras grabas)": "1b) Waypoint actions (while recording)", "2) Combate": "2) Combat", "3) Kiting (para magos)": "3) Kiting (for mages)", "4) Supervivencia y suministros": "4) Survival and supplies", "Casillas resaltadas (ej. zonas para levitate)": "Highlighted tiles (e.g. levitate spots)", "Timers de hechizos": "Spell timers", "Magic wall y wild growth": "Magic wall and wild growth", "GM que pregunta algo (\"you there?\", \"hi\")": "GM asking something (\"you there?\", \"hi\")", "Sonido de alerta": "Alert sound", "Dispositivo (modo móvil)": "Device (mobile mode)", "Consola de pruebas": "Test console", "Segundo plano (app de Android)": "Background (Android app)", "Training mode activo": "Training mode on", "Objetivo (jugador o monstruo)": "Target (player or monster)", "Tecla de ataque (opcional)": "Attack key (optional)", "Posición de ataque": "Attack stance", "Movimiento al atacar": "Movement while attacking", "Runas y comida activas": "Runes and food on", "Hechizo": "Spell", "Mana por hechizo": "Mana per spell", "Comer automáticamente": "Eat automatically", "Tecla de comida (hotbar)": "Food key (hotbar)", "Seg. sin subir mana p/ comer": "Sec. without mana gain to eat", "Parar runas si la cap es baja": "Stop runes if cap is low", "Cap mínima (parar si es menor)": "Minimum cap (stop if lower)", "No comer en protection zone": "Don't eat in protection zone", "Alerta de vida baja": "Low health alert", "Alertar si HP ≤ %": "Alert if HP ≤ %", "Activar autoheal al alertar": "Turn on autoheal when alerting", "Anti-idle activo": "Anti-idle on", "Modificador (shift o ctrl)": "Modifier (shift or ctrl)", "Intervalo aleatorio (min)": "Random interval (min)", "Autoheal activo": "Autoheal on", "Autolife activo": "Autolife on", "Automana activo": "Automana on", "Tecla de poción": "Potion key", "Usar si HP ≤ %": "Use if HP ≤ %", "Usar si mana ≤ %": "Use if mana ≤ %", "HP ≤ %": "HP ≤ %", "Intervalo entre usos (s)": "Interval between uses (s)", "Intervalo de ataque (s)": "Attack interval (s)", "Espera tras tener mana (s)": "Wait after mana is ready (s)", "Magebomb activo": "Magebomb on", "Nombre del líder": "Leader name", "Teclas de runas (ej: F2,F3)": "Rune keys (e.g. F2,F3)", "Rondas del combo": "Combo rounds", "Pausa entre runas (ms)": "Pause between runes (ms)", "Señal del líder (avanzado)": "Leader signal (advanced)", "Reacción tras el líder (ms)": "Reaction after the leader (ms)", "Ir y volver por la ruta": "Go back and forth on the route", "Método de movimiento (0-2)": "Movement method (0-2)", "Tecla Rope": "Rope key", "Tecla Shovel": "Shovel key", "Tecla Runa en WP": "Rune key at WP", "Monstruos a atacar (coma)": "Monsters to attack (comma)", "Rango de detección (casillas)": "Detection range (tiles)", "Acercarse al objetivo (melee)": "Approach the target (melee)", "Tecla de ataque/hechizo (opc.)": "Attack/spell key (opt.)", "Tecla \"siguiente objetivo\" (opc.)": "\"Next target\" key (opt.)", "Kiting activo (correr de los monstruos)": "Kiting on (run from monsters)", "Retirarse si la vida baja": "Retreat if health is low", "Retirarse si HP ≤ %": "Retreat if HP ≤ %", "Reanudar cuando HP ≥ %": "Resume when HP ≥ %", "Cerrar sesión si HP ≤ % (0 = no)": "Log out if HP ≤ % (0 = no)", "Comer durante la caza": "Eat while hunting", "Comer si Food ≤ (min)": "Eat if Food ≤ (min)", "Avisar si aparece otro jugador": "Alert if another player shows up", "Retirarse si no hay comida": "Retreat if out of food", "Retirar si Food ≤ (min)": "Retreat if Food ≤ (min)", "Retirarse si la Cap es baja": "Retreat if Cap is low", "Escape rápido si te golpean fuerte": "Quick escape if hit hard", "Escapar si HP baja ≥ % en 3s": "Escape if HP drops ≥ % in 3s", "Mostrar casillas resaltadas": "Show highlighted tiles", "Color": "Color", "Opacidad (5-80)": "Opacity (5-80)", "Mi columna en pantalla (0-14)": "My column on screen (0-14)", "Mi fila en pantalla (0-10)": "My row on screen (0-10)", "Seguir la cámara al caminar (fluido)": "Follow the camera while walking (smooth)", "Leer píxeles del juego (si no se puede, interpola solo)": "Read game pixels (if not possible, interpolates)", "Duración de un paso en ms (0 = 330)": "Step duration in ms (0 = 330)", "Casilla visible solo mientras estés encima": "Tile visible only while standing on it", "Mostrar timers de hechizos": "Show spell timers", "palabras=seg=nombre ; ...": "words=sec=name ; ...", "Cuenta atrás sobre cada MW / WG": "Countdown on each MW / WG", "Duración magic wall (s)": "Magic wall duration (s)", "IDs item magic wall (coma)": "Magic wall item IDs (comma)", "Duración wild growth (s)": "Wild growth duration (s)", "IDs item wild growth (coma)": "Wild growth item IDs (comma)", "Reanudar runas / caza tras una caída": "Resume runes / hunt after a drop", "Intentar durante (min)": "Keep trying for (min)", "Detectar GM / anti-bot (pausa todo)": "Detect GM / anti-bot (pauses everything)", "Sonido en las alertas": "Sound on alerts", "Contestarle automáticamente": "Reply automatically", "Esperar antes de contestar (s)": "Wait before replying (s)", "Reanudar solo cuando se va (lol / xd)": "Auto-resume when they leave (lol / xd)", "Cerrar sesión si estoy inactivo": "Log out if I am idle", "Cerrar sesión cuando falten ≤ (s)": "Log out when ≤ (s) remain", "Inactivo = sin tocar nada (s)": "Idle = not touching anything (s)", "Volver a entrar solo (experimental)": "Log back in automatically (experimental)", "Nombre de la copia": "Copy name", "Guardar copia": "Save copy", "Cargar": "Load", "Borrar": "Delete", "Valores por defecto": "Defaults", "(No cambiar)": "(Don't change)", "Full attack": "Full attack", "Balanced": "Balanced", "Full defense": "Full defense", "Chase (seguir objetivo)": "Chase (follow target)", "Stand (no seguir)": "Stand (do not follow)", "Número de la casilla del hotbar (1–8) o F1–F12": "Hotbar slot number (1–8) or F1–F12", "Tecla F1–F12, número o letra": "Key F1–F12, number or letter", "n.º": "no.", "Probar ataque": "Test attack", "Aplicar postura/chase": "Apply stance/chase", "Probar anti-idle": "Test anti-idle", "Lanzar combo ahora": "Cast combo now", "Espiar líder (15 s)": "Spy on leader (15 s)", "▶ Iniciar caza": "▶ Start hunt", "■ Detener caza": "■ Stop hunt", "⏺ Grabar ruta": "⏺ Record route", "⏹ Detener grabación": "⏹ Stop recording", "Borrar ruta": "Delete route", "Copiar ruta": "Copy route", "Pegar ruta": "Paste route", "Probar movimiento": "Test movement", "Rope aquí": "Rope here", "Shovel aquí": "Shovel here", "Escalera aquí": "Ladder here", "Runa aquí": "Rune here", "Añadir objetivo actual": "Add current target", "Ver monstruos cercanos": "Show nearby monsters", "Modo marcar (Ctrl+Shift+K)": "Mark mode (Ctrl+Shift+K)", "Modo marcar": "Mark mode", "Marcar mi casilla": "Mark my tile", "Quitar última": "Remove last", "Borrar todas": "Delete all", "Resaltar casilla": "Highlight tile", "Probar timer": "Test timer", "Probar en mi casilla": "Test on my tile", "Usar duraciones medidas": "Use measured durations", "Inspeccionar alrededor": "Inspect around", "Aprender magic wall": "Learn magic wall", "Aprender wild growth": "Learn wild growth", "Diagnóstico de cámara": "Camera diagnostics", "Probar hechizo": "Test spell", "Probar comer": "Test eating", "Probar alerta": "Test alert", "Permitir avisos": "Allow alerts", "Copiar": "Copy", "Subir audio propio": "Upload my own sound", "Quitar audio propio": "Remove my own sound", "Diagnóstico del dispositivo": "Device diagnostics", "Copiar diagnóstico": "Copy diagnostics", "Usar modo escritorio": "Use desktop mode", "Usar modo móvil": "Use mobile mode", "Sin límite de batería": "No battery limit", "Ejecutar": "Run", "Limpiar": "Clear", "Pegar comando": "Paste command", "Copiar resultado": "Copy result", "Copiar el resultado automáticamente al ejecutar": "Copy the result automatically when running", "Reanudar helper": "Resume helper", "Cerrar aviso": "Close alert", "▶ Iniciar": "▶ Start", "■ Detener": "■ Stop", "■ Salir del modo marcar": "■ Exit mark mode", "✕ Salir": "✕ Exit", "Minimizar / abrir": "Minimize / open", "Probar (envía una respuesta al chat)": "Test (sends a reply to chat)", "Novedades y guía": "What's new & guide", "Entendido": "Got it", "Cancelar": "Cancel", "Activar": "Activate", "Aceptar": "OK", "Activar licencia": "Activate license", "Personaje": "Character", "Licencia": "License", "Escribe el nombre de tu personaje y tu licencia. Se guarda en este dispositivo: ese personaje ya no la vuelve a pedir.": "Enter your character name and your license. It is saved on this device: that character will not ask for it again.", "Escribe el nombre de tu personaje": "Enter your character name", "Escribe tu licencia completa": "Enter your full license", "Este navegador no puede comprobar licencias": "This browser cannot verify licenses", "Estás conectado con": "You are logged in as", ": escribe ese nombre": ": enter that name", "Comprobando…": "Checking…", "Licencia no válida. Revisa que esté bien escrita.": "Invalid license. Check that it is typed correctly.", "¡Listo! Licencia": "Done! License", "activada para": "activated for", "Beta tester (permanente)": "Beta tester (permanent)", "No pude comprobar la licencia:": "Could not verify the license:", "Personaje conectado:": "Logged-in character:", "Sin licencia": "No license", "Licencia:": "License:", "falta activar tu licencia": "you need to activate your license", "falta licencia": "license missing", "falta licencia para": "license missing for", "licencia activada:": "license activated:", "licencia: no pude guardar": "license: could not save", "este personaje": "this character", "para": "for", "Lo nuevo · v": "What's new · v", "y anteriores": "and earlier", "Todas las funciones": "All features", "Para que funcione bien": "To make it work well", "iPhone y navegador": "iPhone and browser", "Guía y novedades": "Guide and what's new", "Licencias": "Licenses", "Segundo plano y notificaciones (app de Android)": "Background and notifications (Android app)", "Hotbar del celular": "Phone hotbar", "Icono y gestos": "Icon and gestures", "App para Android": "Android app", "Minibia Helper ya funciona en iPhone con Safari (extensión gratuita \"Userscripts\").": "Minibia Helper now works on iPhone with Safari (free \"Userscripts\" extension).", "En iPhone y en el navegador la pantalla se mantiene encendida mientras el helper trabaja.": "On iPhone and in the browser the screen stays on while the helper works.", "Si sales del juego y el helper estaba trabajando, al volver te avisa cuánto tiempo estuvo en pausa.": "If you leave the game while the helper is working, when you come back it tells you how long it was paused.", "Esta ventana: todas las funciones y lo último de cada versión. Se abre al activar tu licencia y cada vez que se actualiza la app. Puedes volver a verla en Acerca de → \"Novedades y guía\".": "This window: every feature and the latest of each version. It opens when you activate your license and every time the app updates. You can see it again in About → \"What's new & guide\".", "Al tocar el icono por primera vez se pide el nombre del personaje y la licencia. Se guarda en el teléfono: ese personaje ya no la vuelve a pedir.": "The first time you tap the icon it asks for the character name and the license. It is saved on the phone: that character will not ask again.", "Licencia Beta tester: permanente, sin renovaciones ni cobro mensual.": "Beta tester license: permanent, no renewals and no monthly fee.", "Si entras con otro personaje sin licencia, se pide de nuevo y el helper no corre hasta activarla.": "If you log in with another character without a license, it asks again and the helper will not run until it is activated.", "Tu licencia aparece en Acerca de y en el estado (pestaña Sistema).": "Your license is shown in About and in the status (System tab).", "El helper sigue trabajando aunque salgas al inicio, abras otra app o apagues la pantalla. Mientras trabaja verás una notificación fija (\"runeando · 12 runas\").": "The helper keeps working even if you go to the home screen, open another app or turn off the screen. While it works you will see a persistent notification (\"making runes · 12 runes\").", "Todas las alertas (GM, botcheck, vida baja, muerte, desconexión…) llegan como notificación de Android con sonido y vibración; al tocarla vuelves al juego.": "Every alert (GM, botcheck, low health, death, disconnection…) arrives as an Android notification with sound and vibration; tap it to return to the game.", "Botón \"Sin límite de batería\" en Sistema: evita que Android corte la app en AFK largo.": "\"No battery limit\" button in System: stops Android from killing the app during long AFK.", "El estado muestra si el segundo plano está activo, si la batería tiene límite y si los avisos están permitidos.": "The status shows whether background mode is on, whether the battery is limited and whether alerts are allowed.", "En los campos de \"Tecla\" escribe el número de casilla del hotbar (1–8) o F1–F12: el helper la usa solo, sin tocar la pantalla (comida, pociones, runas, rope, shovel…).": "In the \"Key\" fields type the hotbar slot number (1–8) or F1–F12: the helper uses it by itself, without touching the screen (food, potions, runes, rope, shovel…).", "Si usas la casilla \"Atacar al más cercano\", el helper no la vuelve a pulsar mientras ya tengas objetivo (no lo suelta).": "If you use the \"Attack nearest\" slot, the helper does not press it again while you already have a target (so it does not drop it).", "Panel compacto abajo al centro, entre el joystick y el hotbar; abierto ya no tapa la vida y el maná.": "Compact panel at the bottom center, between the joystick and the hotbar; when open it no longer covers health and mana.", "Tocar el icono solo abre o cierra el helper (ya no abre el menú del juego). Arrástralo para moverlo.": "Tapping the icon only opens or closes the helper (it no longer opens the game menu). Drag it to move it.", "Desliza con 2 dedos hacia un lado, en cualquier parte, para ocultar o mostrar el icono.": "Swipe sideways with 2 fingers, anywhere, to hide or show the icon.", "Los toques sobre el panel ya no llegan al juego.": "Taps on the panel no longer reach the game.", "Minibia Helper como app: se instala y abre el juego con el helper incluido, en pantalla completa y sin que se apague la pantalla.": "Minibia Helper as an app: install it and it opens the game with the helper included, full screen and without the screen turning off.", "El botón \"atrás\" no cierra el juego: manda la app a segundo plano.": "The \"back\" button does not close the game: it sends the app to the background.", "Runas y comida (pestaña Runas)": "Runes and food (Runes tab)", "Lanza tu hechizo de runa cuando hay maná suficiente, come solo si el maná deja de subir, se detiene si la cap es baja, no come en protection zone y avisa si la vida baja durante las runas (puede activar el autoheal).": "Casts your rune spell when there is enough mana, eats by itself when mana stops rising, stops if cap is low, does not eat in protection zone and alerts if health drops while making runes (it can turn on autoheal).", "Training": "Training", "Ataca a un objetivo (jugador o monstruo) para subir skills, con postura y modo de persecución configurables.": "Attacks a target (player or monster) to train skills, with configurable stance and chase mode.", "Cada pocos minutos gira a tu personaje sin caminar (Shift o Ctrl + flecha) para que el juego no te saque por inactividad.": "Every few minutes it turns your character without walking (Shift or Ctrl + arrow) so the game does not kick you for being idle.", "Autoheal (hechizos según tu % de vida, el primero que cumpla), Autolife y Automana (pociones desde el hotbar).": "Autoheal (spells by your health %, the first one that matches), Autolife and Automana (potions from the hotbar).", "GM y anti-bot": "GM and anti-bot", "Detecta al GM y las ventanas anti-bot: pausa todo, suena la alarma y te llega notificación. Puede contestar solo a \"you there?\" / \"hi\", cerrar sesión si sigues inactivo y responder el botcheck de forma segura.": "Detects the GM and anti-bot windows: pauses everything, sounds the alarm and notifies you. It can reply by itself to \"you there?\" / \"hi\", log out if you stay idle and handle the botcheck safely.", "Vida baja, cap baja, muerte, desconexión, GM y botcheck: sonido en la app y notificación de Android.": "Low health, low cap, death, disconnection, GM and botcheck: sound in the app and Android notification.", "Reinicio tras desconexión": "Reconnect after disconnection", "Si se cae la conexión, vuelve a intentar y reanuda las runas o la caza.": "If the connection drops, it retries and resumes runes or the hunt.", "Casillas resaltadas (por ejemplo, zonas para levitate), timers de hechizos y cuenta atrás sobre cada magic wall y wild growth.": "Highlighted tiles (for example, levitate spots), spell timers and a countdown on each magic wall and wild growth.", "Perfil por personaje": "Profile per character", "Cada personaje guarda su propia configuración.": "Each character keeps its own settings.", "Segundo plano": "Background", "Con el helper en marcha puedes minimizar la app o apagar la pantalla: sigue runeando con el antibot activo.": "While the helper is running you can minimize the app or turn off the screen: it keeps making runes with the anti-bot on.", "Pantalla encendida": "Screen on", "En iPhone": "On iPhone", "En el navegador": "In the browser", "el helper trabaja mientras el juego esté abierto: la pantalla no se apaga sola mientras corre.": "the helper works while the game is open: the screen does not turn off by itself while it runs.", "El iPhone no permite que siga trabajando en segundo plano (eso solo existe en la app de Android).": "The iPhone does not allow it to keep working in the background (that only exists in the Android app).", "En beta (bloqueadas por ahora)": "In beta (locked for now)", "Cave hunt (ruta grabada, combate, kiting y supervivencia) y Magebomb (combo con líder).": "Cave hunt (recorded route, combat, kiting and survival) and Magebomb (combo with leader).", "Para AFK: en Sistema toca \"Permitir avisos\" y \"Sin límite de batería\", y deja el teléfono cargando.": "For AFK: in System tap \"Allow alerts\" and \"No battery limit\", and leave the phone charging.", "La notificación fija \"Minibia Helper\" significa que está trabajando. Si cierras la app desde Recientes (deslizándola), se detiene.": "The persistent \"Minibia Helper\" notification means it is working. If you close the app from Recents (swiping it away), it stops.", "Para AFK en iPhone: deja Safari abierto en el juego, el iPhone cargando y en Ajustes → Pantalla y brillo → Bloqueo automático elige \"Nunca\".": "For AFK on iPhone: leave Safari open on the game, the iPhone charging, and in Settings → Display & Brightness → Auto-Lock choose \"Never\".", "No cambies de app ni bloquees el iPhone mientras corre: iOS congela Safari y el helper se pausa.": "Do not switch apps or lock the iPhone while it runs: iOS freezes Safari and the helper pauses.", "Las alertas suenan y salen en pantalla (en iPhone no hay notificaciones del sistema).": "Alerts play a sound and show on screen (there are no system notifications on iPhone).", "Deja la pestaña del juego abierta: si el navegador o el teléfono se suspenden, el helper se pausa.": "Keep the game tab open: if the browser or the phone goes to sleep, the helper pauses.", "En los campos de tecla usa el número de la casilla del hotbar (1–8).": "In the key fields use the hotbar slot number (1–8).", "Toca el icono para abrir o cerrar; arrástralo para moverlo; 2 dedos hacia un lado lo ocultan o lo muestran.": "Tap the icon to open or close; drag it to move it; 2 fingers sideways hide or show it.", "Minibia Helper es de Osbeliaal: si lo compartes o hablas de él, menciónalo siempre.": "Minibia Helper is made by Osbeliaal: if you share it or talk about it, always mention him.", "asistente para Minibia.": "assistant for Minibia.", "Versión": "Version", "Corre en tu navegador.": "Runs in your browser.", "La configuración se guarda por personaje, en el almacenamiento local del navegador.": "Settings are saved per character, in the browser local storage.", "Toca el botón redondo para abrir o cerrar el panel; arrástralo para moverlo. Desliza con 2 dedos hacia un lado (en cualquier parte de la pantalla) para ocultar o mostrar el botón. En los campos de tecla escribe el número de la casilla del hotbar (1–8): el Helper la usa sin que toques la pantalla.": "Tap the round button to open or close the panel; drag it to move it. Swipe sideways with 2 fingers (anywhere on the screen) to hide or show the button. In the key fields type the hotbar slot number (1–8): the Helper uses it without you touching the screen.", "Atajos: Ctrl+Shift+H muestra u oculta el panel; Ctrl+Shift+K activa el modo marcar.": "Shortcuts: Ctrl+Shift+H shows or hides the panel; Ctrl+Shift+K turns on mark mode.", "Magebomb y Cave hunt siguen en fase beta y están desactivados por ahora.": "Magebomb and Cave hunt are still in beta and are disabled for now.", "BETA · NO DISPONIBLE": "BETA · NOT AVAILABLE", "Todavía en fase beta: desactivado en esta versión": "Still in beta: disabled in this version", "Mientras el helper esté en marcha, la app sigue trabajando aunque la mandes atrás o apagues la pantalla (verás una notificación fija). Para que Android no la detenga, toca \"Sin límite de batería\" y acepta.": "While the helper is running, the app keeps working even if you send it to the background or turn off the screen (you will see a persistent notification). So Android does not stop it, tap \"No battery limit\" and accept.", "Las notificaciones ya están permitidas": "Notifications are already allowed", "Prueba: así te llegarán las alertas.": "Test: this is how alerts will reach you.", "Activa las notificaciones de Minibia Helper y vuelve a la app": "Turn on Minibia Helper notifications and come back to the app", "En iPhone las alertas suenan y salen en pantalla. Deja Safari abierto con la pantalla encendida.": "On iPhone alerts play a sound and show on screen. Keep Safari open with the screen on.", "Listo: Android no limita la batería de Minibia Helper": "Done: Android does not limit Minibia Helper battery", "Consejo: en Sistema toca \"Sin límite de batería\" para correr con la pantalla apagada": "Tip: in System tap \"No battery limit\" to run with the screen off", "Segundo plano:": "Background:", "servicio activo": "service on", "inactivo": "idle", "batería": "battery", "sin límite": "unlimited", "limitada (toca \"Sin límite de batería\")": "limited (tap \"No battery limit\")", "avisos": "alerts", "permitidas": "allowed", "BLOQUEADAS (toca \"Permitir avisos\")": "BLOCKED (tap \"Allow alerts\")", "El iPhone": "The iPhone", "El navegador": "The browser", "pausó el helper mientras estabas fuera (": "paused the helper while you were away (", "s). Deja el juego abierto para que siga trabajando.": "s). Keep the game open so it keeps working.", "runeando": "making runes", "cazando": "hunting", "en marcha": "running", "en pausa por GM": "paused by GM", "Minibia Helper oculto · desliza con 2 dedos hacia un lado para mostrarlo": "Minibia Helper hidden · swipe sideways with 2 fingers to show it", "Minibia Helper visible": "Minibia Helper visible", "Resultado copiado (": "Result copied (", "letras). Pégalo donde quieras.": "characters). Paste it wherever you want.", "No se pudo copiar: mantén presionado el texto para seleccionarlo.": "Could not copy: press and hold the text to select it.", "No pude leer el portapapeles: pega con Ctrl+V o mantén presionado el cuadro.": "Could not read the clipboard: paste with Ctrl+V or press and hold the box.", "Comando pegado (": "Command pasted (", "letras). Toca Ejecutar.": "characters). Tap Run.", "consola de pruebas activada (pestaña Estado)": "test console on (Status tab)", "consola de pruebas oculta": "test console hidden", "Personaje:": "Character:", "Personaje: (entra al juego para cargar su configuración)": "Character: (log in to load its settings)", "(config y ruta se guardan solos)": "(settings and route save automatically)", "Última acción:": "Last action:", "Método de envío:": "Send method:", "campo de chat + Enter": "chat field + Enter", "Runas:": "Runes:", "Training:": "Training:", "Anti-idle:": "Anti-idle:", "Autoheal:": "Autoheal:", "Autolife:": "Autolife:", "Automana:": "Automana:", "Magebomb:": "Magebomb:", "Cave hunt:": "Cave hunt:", "Alertas: GM": "Alerts: GM", "Casillas resaltadas:": "Highlighted tiles:", "Casillas:": "Tiles:", "Reinicio automático:": "Auto reconnect:", "Protection zone:": "Protection zone:", "Errores:": "Errors:", "ERROR:": "ERROR:", "Error:": "Error:", "error:": "error:", "Líder:": "Leader:", "Posición:": "Position:", "posición": "position", "Ruta:": "Route:", "Kiting:": "Kiting:", "(pulsa Iniciar)": "(press Start)", "(sin sesión)": "(not logged in)", "sin sesión": "not logged in", "(cerrando sesión)": "(logging out)", "(ya contesté 3 veces)": "(already replied 3 times)", "(hechas": "(made", "(curas": "(heals", "(usos": "(uses", "(combos": "(combos", "(línea": "(line", "(mínimo": "(minimum", "| CHAT DESBLOQUEADO": "| CHAT UNLOCKED", "| Cámara:": "| Camera:", "| MODO MARCAR": "| MARK MODE", "| RETIRADA (": "| RETREAT (", "| Señal:": "| Signal:", "| Timers activos:": "| Active timers:", "| botcheck:": "| botcheck:", "| comidas": "| meals", "| inactivo hace": "| idle for", "| muertes": "| deaths", "| punto": "| point", "| reloj:": "| clock:", "| vueltas": "| laps", "| última:": "| last:", ", última:": ", last:", ", último:": ", last:", ", cap": ", cap", ", ruta de": ", route of", "· modo escritorio": "· desktop mode", "· modo móvil": "· mobile mode", "· ventana": "· window", "· lectura de píxeles": "· pixel reading", "· puntos": "· points", "· runas": "· runes", "· caza": "· hunt", "ACTIVO": "ON", "ACTIVA": "ON", "AVISO": "ALERT", "activo": "on", "apagado": "off", "apagada": "off", "[apagada]": "[off]", "[GRABANDO]": "[RECORDING]", "iniciado": "started", "detenido": "stopped", "detenido por ti": "stopped by you", "detenido por GM / anti-bot": "stopped by GM / anti-bot", "detenido para grabar": "stopped to record", "detenido: 6 intentos sin gastar mana": "stopped: 6 attempts without spending mana", "detenido: no pude fijar el objetivo": "stopped: could not set the target", "detenido: no pude fijar objetivo": "stopped: could not set target", "detenido: no se pudo enviar el hechizo": "stopped: the spell could not be sent", "ninguna": "none", "ninguno": "none", "ninguno con esos nombres": "none with those names", "normal": "normal", "sí": "yes", "no": "no", "NO": "NO", "SÍ (": "YES (", "presente": "present", "NO encontrado": "NOT found", "no legible": "not readable", "sin dato": "no data", "sin datos": "no data", "no aplicada": "not applied", "no aplicado": "not applied", "en espera": "waiting", "en pausa (GM)": "paused (GM)", "en pausa": "paused", "vigilando": "watching", "escuchando": "listening", "armado": "armed", "caminando": "walking", "quieto": "standing still", "sin incidentes": "no incidents", "incidente, contestadas": "incident, replied", "GM resuelto:": "GM resolved:", "GM:": "GM:", "mana lista, espero": "mana ready, waiting", "hechizo lanzado OK": "spell cast OK", "lanzando \"": "casting \"", "no bajó mana, pruebo otro método": "mana did not drop, trying another method", "falta escribir el hechizo": "type the spell first", "falta la mana por hechizo": "set the mana per spell first", "runas y comida desactivadas": "runes and food turned off", "prueba enviada (": "test sent (", "prueba comida: tecla": "food test: key", "comida: tecla": "food: key", "prueba de anti-idle:": "anti-idle test:", "prueba de ataque:": "attack test:", "sin comida": "no food", "cap baja": "low cap", "cap baja (": "low cap (", "vida baja (": "low health (", "vida crítica (": "critical health (", "golpe fuerte": "heavy hit", "atacando a": "attacking", "objetivo detectado:": "target detected:", "fijando objetivo": "setting target", "sin objetivo, reintentando": "no target, retrying", "no encuentro a \"": "cannot find \"", "\" cerca": "\" nearby", "setTarget enviado": "setTarget sent", "modo aplicado: postura=": "mode applied: stance=", "modo combate:": "combat mode:", "diagnóstico copiado": "diagnostics copied", "estado copiado": "status copied", "no pude copiar el estado": "could not copy the status", "no pude copiar la ruta": "could not copy the route", "no pude copiar: selecciona el texto a mano": "could not copy: select the text manually", "ruta copiada (": "route copied (", "puntos)": "points)", "guardado: recarga la página para aplicarlo": "saved: reload the page to apply it", "escritorio": "desktop", "móvil": "mobile", "Navegador": "Browser", "Pantalla": "Screen", "Táctil": "Touch", "Almacenamiento local": "Local storage", "Cámara": "Camera", "Canvas": "Canvas", "Elementos de juego": "Game elements", "en pantalla": "on screen", "(sin id)": "(no id)", "píxeles": "pixels", "audio personalizado cargado": "custom sound loaded", "audio personalizado quitado": "custom sound removed", "audio: formato no compatible": "audio: format not supported", "audio: haz clic en la página para inicializar": "audio: click on the page to initialize", "Sonido: personalizado (": "Sound: custom (", "Sonido: tono suave por defecto": "Sound: soft default tone", "Sonido: usando audio personalizado": "Sound: using custom audio", "Prueba de alerta con tono suave.": "Alert test with a soft tone.", "permiso de avisos:": "alert permission:", "EL GM TE HABLO": "THE GM TALKED TO YOU", "GM / ANTI-BOT": "GM / ANTI-BOT", "VIDA BAJA": "LOW HEALTH", "CAP BAJA": "LOW CAP", "PRUEBA": "TEST", "MUERTO": "DEAD", "DESCONECTADO": "DISCONNECTED", "CHAT DESBLOQUEADO": "CHAT UNLOCKED", "(el helper sigue en pausa por el GM)": "(the helper is still paused because of the GM)", "Helper en pausa. Resuelve la verificación anti-bot.": "Helper paused. Solve the anti-bot check.", "PAUSADO:": "PAUSED:", "PAUSADO (": "PAUSED (", "PAUSA GM ·": "GM PAUSE ·", "Mensaje de GM:": "GM message:", "Mensaje de anti-bot:": "Anti-bot message:", "Apareció el captcha anti-bot del juego": "The game anti-bot captcha appeared", "Botcheck anti-bot en": "Anti-bot botcheck in", "Botcheck (\"anti-bot check will begin in 30 seconds\")": "Botcheck (\"anti-bot check will begin in 30 seconds\")", "El GM dijo: \"": "The GM said: \"", "\". Le contesto \"": "\". Replying \"", "GM: contesté \"": "GM: I replied \"", "el GM no volvió a escribir": "the GM did not write again", "el GM se despidió (\"": "the GM said goodbye (\"", "reanudado solo": "resumed by itself", "cancelado por pausa (GM)": "cancelled by pause (GM)", "⚠ No pude contestar al GM:": "⚠ Could not reply to the GM:", "Si no tocas nada, cerraré tu sesión cuando falten": "If you do not touch anything, I will log you out when there are", "s. Mueve el mouse si estás ahí.": "s left. Move the mouse if you are there.", "🚪 Estás inactivo y viene un botcheck: cierro la sesión de": "🚪 You are idle and a botcheck is coming: logging out", "para evitar el castigo.\nAl volver a entrar te saldrá el botcheck: resuélvelo.": "to avoid the penalty.\nWhen you log back in the botcheck will appear: solve it.", "🚪 Sesión cerrada por el botcheck. Cuando vuelvas a entrar con": "🚪 Logged out because of the botcheck. When you log back in with", "te saldrá el botcheck: resuélvelo.": "the botcheck will appear: solve it.", "tiene un botcheck pendiente (cerré la sesión por inactividad). Te saldrá al entrar: resuélvelo.": "has a pending botcheck (I logged out due to inactivity). It will appear when you log in: solve it.", "botcheck: cerrando sesión": "botcheck: logging out", "botcheck: volviste, cancelo el cierre de sesión": "botcheck: you are back, cancelling the logout", "Sesión cerrada.": "Logged out.", "sesión cerrada": "logged out", "No pude cerrar sesión.": "Could not log out.", "error al cerrar sesión": "error while logging out", "💀 El personaje murió. Helper detenido.": "💀 The character died. Helper stopped.", "el personaje murió": "the character died", "🔌 Conexión perdida con el servidor.": "🔌 Connection to the server lost.", "conexión perdida: intentaré reanudar solo": "connection lost: I will try to resume by myself", "🔌 No logré reconectar solo (6 intentos). Entra tú a mano.": "🔌 I could not reconnect by myself (6 attempts). Log in manually.", "🔌 No logré reconectar solo en": "🔌 I could not reconnect by myself in", "min. Entra tú a mano.": "min. Log in manually.", "ESPERANDO RECONEXIÓN (intentos": "WAITING TO RECONNECT (attempts", "reconectando (intento": "reconnecting (attempt", "reconectado, espero a que cargue...": "reconnected, waiting for it to load...", "reconectado: reanudé": "reconnected: resumed", "desconectado, en pausa": "disconnected, paused", "reinicio automático: no (hubo actividad de GM / anti-bot o el personaje murió)": "auto reconnect: no (there was GM / anti-bot activity or the character died)", "Si se corta la conexión o el servidor te saca, vuelve a entrar con tu personaje (el navegador debe tener la contraseña guardada) y retoma lo que estaba corriendo. No actúa si hubo GM, captcha o botcheck de por medio.": "If the connection drops or the server kicks you, it logs back in with your character (the browser must have the password saved) and resumes what was running. It does not act if there was a GM, captcha or botcheck involved.", "⚠ Vida baja (": "⚠ Low health (", "⚠ Vida baja:": "⚠ Low health:", "🚨 Vida crítica": "🚨 Critical health", ").\nRunas detenidas.": ").\nRunes stopped.", "Autoheal activado.": "Autoheal turned on.", "con HP": "with HP", "con mana": "with mana", "📦 Cap baja:": "📦 Low cap:", "⚠ Cap baja: retirándose al refugio.": "⚠ Low cap: retreating to safety.", "⚠ Sin comida: retirándose al refugio.": "⚠ No food: retreating to safety.", "⚠ Golpe fuerte recibido: escapando por la ruta.": "⚠ Heavy hit taken: escaping along the route.", "%): me retiro por la ruta.": "%): retreating along the route.", "👤 Jugador cerca:": "👤 Player nearby:", "⚠ Training detenido: no pude atacar a \"": "⚠ Training stopped: could not attack \"", "⚠ Cave hunt detenido: atasco en el punto": "⚠ Cave hunt stopped: stuck at point", "⚠ Cave hunt detenido: lejos de la ruta.": "⚠ Cave hunt stopped: far from the route.", "⚠ Cave hunt detenido: no pude fijar \"": "⚠ Cave hunt stopped: could not target \"", "⌨ El chat está desbloqueado: pulsa Enter en el juego para bloquearlo, o las teclas del bot no funcionarán.": "⌨ Chat is unlocked: press Enter in the game to lock it, or the bot keys will not work.", "caza: graba una ruta o escribe monstruos": "hunt: record a route or type monsters", "no disponible (beta)": "not available (beta)", "Cave hunt: no disponible (beta)": "Cave hunt: not available (beta)", "no puedo leer la posición": "cannot read the position", "no puedo leer la vida": "cannot read health", "no puedo leer vida/mana": "cannot read health/mana", "No puedo leer mi posición.": "Cannot read my position.", "No puedo leer tu posición.": "Cannot read your position.", "marcar: no puedo leer mi posición": "mark: cannot read my position", "grabando ruta: camina con tu personaje": "recording route: walk with your character", "ruta borrada": "route deleted", "ruta guardada:": "route saved:", "ruta importada:": "route imported:", "ruta inválida:": "invalid route:", "ruta muy corta": "route too short", "ruta vacía": "empty route", "ruta: no se pudo guardar": "route: could not save", "Pega aquí la ruta copiada:": "Paste the copied route here:", "Ya hay una ruta de": "There is already a route of", "puntos.\nAceptar = empezar nueva\nCancelar = añadir al final": "points.\nOK = start a new one\nCancel = add to the end", "¿Borrar la ruta de": "Delete the route of", "puntos?": "points?", "perdido: lejos de la ruta grabada": "lost: far from the recorded route", "lejos de la ruta (": "far from the route (", "estoy en otro piso que la ruta": "I am on a different floor than the route", "cambio de piso sin tecla grabada": "floor change without a recorded key", "atascado en el punto": "stuck at point", "al punto": "to point", "en refugio, recuperando (": "in safety, recovering (", "vida recuperada, reanudo": "health recovered, resuming", "retirándose (": "retreating (", "kiting: huyendo": "kiting: fleeing", "sin ruta: solo ataco monstruos cercanos": "no route: only attacking nearby monsters", "no veo criaturas cerca": "no creatures nearby", "añadir objetivo: selecciona un monstruo en Battle": "add target: select a monster in Battle", "objetivos:": "targets:", "marcada acción \"": "marked action \"", "\" en el punto actual": "\" at the current point", "probando movimiento...": "testing movement...", "prueba de movimiento: no puedo leer la posición": "movement test: cannot read the position", "ningún método movió al personaje": "no method moved the character", "método de movimiento": "movement method", "falta el nombre del líder": "enter the leader name", "falta el nombre": "name missing", "líder encontrado": "leader found", "líder no encontrado cerca": "leader not found nearby", "líder": "leader", "No veo al líder \"": "I cannot see the leader \"", "\" cerca. Ponlo a la vista y reintenta.": "\" nearby. Bring them into view and try again.", "Espiando a": "Spying on", "durante 15 s... Pídele que lance el hechizo 2 o 3 veces SIN caminar.": "for 15 s... Ask them to cast the spell 2 or 3 times WITHOUT walking.", "No cambió ninguna propiedad. Prueba con el líder más cerca o dime y buscamos otra vía (p. ej. el chat).": "No property changed. Try with the leader closer or tell me and we will look for another way (e.g. chat).", "Propiedades que cambiaron (las que menos cambian, primero):": "Properties that changed (the least changing first):", "combo en curso (": "combo in progress (", "combo terminado (": "combo finished (", "reaccionando en": "reacting in", "sin teclas configuradas": "no keys configured", "Modo marcar · clic: casilla · Shift+clic: MW · Ctrl+clic: WG · Esc: salir": "Mark mode · click: tile · Shift+click: MW · Ctrl+click: WG · Esc: exit", "Modo marcar · toca una casilla ·": "Mark mode · tap a tile ·", "En modo marcar: clic = resaltar / quitar una casilla, Shift+clic = cronómetro de magic wall, Ctrl+clic = wild growth, Esc = salir.": "In mark mode: click = highlight / remove a tile, Shift+click = magic wall timer, Ctrl+click = wild growth, Esc = exit.", "Qué marca cada toque en modo marcar (en PC puedes usar Shift/Ctrl+clic):": "What each tap marks in mark mode (on PC you can use Shift/Ctrl+click):", "¿Borrar las": "Delete the", "casillas resaltadas?": "highlighted tiles?", "No encuentro tu casilla en el mapa cargado.": "I cannot find your tile on the loaded map.", "cronómetro MW en": "MW timer at", "cronómetro WG en": "WG timer at", "Cronómetro de prueba en tu casilla (": "Test timer on your tile (", "Timer de prueba:": "Test timer:", "No hay hechizos válidos en la lista.": "There are no valid spells in the list.", "Duraciones guardadas:": "Saved durations:", "Duración medida:": "Measured duration:", "Aún no hay medidas: lanza una wall y espera a que desaparezca (con la pantalla del juego a la vista).": "No measurements yet: cast a wall and wait for it to disappear (with the game screen in view).", "Items alrededor de ti (id \"nombre\"):": "Items around you (id \"name\"):", "sin items reconocidos": "no recognized items", "No encontré nada con ese nombre.": "I found nothing with that name.", ": quédate quieto y lanza la runa en una casilla vacía (hasta 25 s)...": ": stand still and cast the rune on an empty tile (up to 25 s)...", "te moviste: quédate quieto mientras aprende": "you moved: stand still while it learns", "Aprendido:": "Learned:", "(otros items nuevos que vi:": "(other new items I saw:", "No vi ningún item nuevo. Prueba otra vez en un lugar tranquilo, o usa \"Inspeccionar alrededor\" con la wall puesta.": "I did not see any new item. Try again in a quiet place, or use \"Inspect around\" with the wall up.", "siguiendo la cámara (píxeles)": "following the camera (pixels)", "interpolando pasos (el canvas no se puede leer)": "interpolating steps (the canvas cannot be read)", "interpolando pasos (píxeles desactivado)": "interpolating steps (pixels turned off)", "canvas no legible (": "canvas not readable (", "): paso a interpolar": "): switching to interpolation", "imagen vacía": "empty image", "Tu configuración y ruta se guardan solas por personaje. Las copias son versiones con nombre para cambiar rápido.": "Your settings and route are saved automatically per character. Copies are named versions to switch quickly.", "(sin copias guardadas)": "(no saved copies)", "perfil borrado": "profile deleted", "perfil cambiado": "profile changed", "perfil cargado: \"": "profile loaded: \"", "perfil guardado: \"": "profile saved: \"", "perfil no encontrado": "profile not found", "perfil: escribe un nombre": "profile: type a name", "perfil: primero entra al juego con tu personaje": "profile: log in with your character first", "¿Borrar el perfil \"": "Delete the profile \"", "¿Volver TODA la configuración de este personaje a los valores por defecto?": "Reset ALL settings of this character to the defaults?", "configuración restablecida a los valores por defecto": "settings reset to defaults", "nueva (valores por defecto)": "new (defaults)", ": configuración": ": settings", "de tu última copia \"": "from your last copy \"", "cambio de personaje": "character change", "esperando personaje...": "waiting for character...", "personaje": "character", "cambió a": "changed to", ") supera tu mana máxima (": ") exceeds your max mana (", "el costo (": "the cost (", "icono:": "icon:", "Idioma": "Language", "Cura": "Heal", "Más fluido": "Smoother", "Arreglado el lag de unos segundos al activar las casillas resaltadas: la cámara ahora se mide con mucho menos esfuerzo y solo mientras caminas.": "Fixed the few-seconds lag when turning on highlighted tiles: the camera is now measured with much less effort and only while you walk.", "Nueva versión de Minibia Helper disponible (v": "New Minibia Helper version available (v", "). ¿Descargarla ahora?": "). Download it now?", "Nueva versión": "New version", "disponible: detén el helper para actualizar": "available: stop the helper to update", "Abre la descarga e instala encima: no pierdes tu configuración": "Open the download and install over it: you keep your settings", "Actualizaciones automáticas": "Automatic updates", "En iPhone y PC el helper se actualiza solo. En Android te avisa cuando hay versión nueva y la descargas con un toque.": "On iPhone and PC the helper updates itself. On Android it tells you when there is a new version and you download it with one tap.", "Licencias por personaje": "Per-character licenses", "Cada licencia funciona solo con su personaje, en cualquier dispositivo: si alguien la comparte, no le sirve a otro personaje.": "Each license only works with its own character, on any device: if someone shares it, it is useless for another character.", "Al activar eliges \"Licencia mensual\" o \"Soy beta tester\". La de beta tester es permanente, sin renovaciones ni cobro mensual.": "When activating you choose \"Monthly license\" or \"I am a beta tester\". The beta tester one is permanent, with no renewals and no monthly fee.", "La licencia mensual muestra su fecha de vencimiento; al vencer, el helper se detiene y pide la renovación.": "The monthly license shows its expiration date; when it expires, the helper stops and asks for renewal.", "Una sola versión para Android, iPhone y PC (navegador).": "One single version for Android, iPhone and PC (browser).", "Escribe el nombre de tu personaje y tu licencia. Cada licencia es para un solo personaje.": "Enter your character name and your license. Each license is for a single character.", "Licencia mensual": "Monthly license", "Soy beta tester": "I am a beta tester", "Licencia normal: se renueva cada mes.": "Normal license: renewed every month.", "Esta es una licencia de Beta tester: toca \"Soy beta tester\".": "This is a Beta tester license: tap \"I am a beta tester\".", "Esta es una licencia mensual: toca \"Licencia mensual\".": "This is a monthly license: tap \"Monthly license\".", "Esta licencia no es de": "This license does not belong to", ". Cada licencia funciona solo con su personaje.": ". Each license only works with its own character.", "Esta licencia mensual venció el": "This monthly license expired on", ". Pide tu renovación.": ". Ask for your renewal.", "Tu licencia mensual venció el": "Your monthly license expired on", ". Escribe la nueva para renovar.": ". Enter the new one to renew.", "mensual (vence": "monthly (expires", "mensual · vence": "monthly · expires", "Licencia mensual vencida el": "Monthly license expired on", "Idioma: español e inglés": "Language: Spanish and English", "Al abrir Minibia por primera vez eliges el idioma del helper: español o inglés.": "The first time you open Minibia you choose the helper language: Spanish or English.", "En inglés cambia todo: panel, botones, estados, alertas, notificaciones, licencia y esta guía.": "In English everything changes: panel, buttons, status, alerts, notifications, license and this guide.", "Puedes cambiarlo cuando quieras en Sistema → Idioma.": "You can change it anytime in System → Language.", "Personaje: (esperando a que inicies sesión; mientras tanto se usan los valores por defecto y no se guarda nada)": "Character: (waiting for you to log in; until then defaults are used and nothing is saved)", "BETA TESTER": "BETA TESTER", "Exclusivo Beta tester": "Beta tester exclusive", "Cave hunt (ruta grabada, combate, kiting y supervivencia) y Magebomb (combo con líder) están activados para ti.": "Cave hunt (recorded route, combat, kiting and survival) and Magebomb (combo with leader) are enabled for you.", "Magebomb y Cave hunt: activados para ti (exclusivo Beta tester).": "Magebomb and Cave hunt: enabled for you (Beta tester exclusive).", "Magebomb y Cave hunt activados": "Magebomb and Cave hunt enabled", "Magebomb y Cave hunt desactivados": "Magebomb and Cave hunt disabled", "Perseguir al objetivo (modo chase)": "Chase the target (chase mode)", "Tecla para fijar objetivo (opc.)": "Key to lock target (opt.)", "Fija un objetivo y no lo suelta hasta que muere (hold target). Con \"Tecla para fijar objetivo\" usa esa casilla (ej. Atacar al más cercano); si la dejas vacía ataca a los monstruos de la lista. Si no puede alcanzar a uno en 10 s, lo ignora un rato.": "Locks one target and keeps it until it dies (hold target). With \"Key to lock target\" it uses that slot (e.g. Attack nearest); if empty it attacks the monsters in the list. If it can't reach one within 10 s, it ignores it for a while.", "La ruta se camina con el buscador de caminos del juego: si algo bloquea el paso, busca otro camino.": "The route is walked with the game's own pathfinder: if something blocks the way, it finds another path.", "Rope y shovel se usan solas desde tu mochila abierta (las teclas solo hacen falta si no están ahí). Ladder: párate encima y toca \"Escalera aquí\". Rampas, escaleras que se pisan y hoyos no necesitan marca.": "Rope and shovel are used automatically from your open backpack (the keys are only needed if they aren't there). Ladder: stand on it and tap \"Ladder here\". Ramps, walk-on stairs and holes need no mark.", "Si no llevo comida, comer de los monstruos que mato": "If I carry no food, eat from the monsters I kill", "Cambiar oro a platinum (montones de 100)": "Convert gold to platinum (stacks of 100)", "Cambiar monedas: 100 gold → platinum, 100 platinum → crystal": "Convert coins: 100 gold → platinum, 100 platinum → crystal", "Nombre de la ruta": "Route name", "Guardar ruta": "Save route", "(sin rutas guardadas)": "(no saved routes)", "Resaltar hoyos, rope spots y escaleras (al grabar y cazar)": "Highlight holes, rope spots and ladders (while recording and hunting)", "Colores: naranja S = hoyo cerrado (shovel), amarillo R = rope spot, verde E = escalera de clic derecho, azul ↕ = se pisa (escaleras, rampas, hoyos abiertos). Mientras grabas, usa la shovel, la rope o la escalera como siempre: el helper anota sola la casilla exacta.": "Colors: orange S = closed hole (shovel), yellow R = rope spot, green E = right-click ladder, blue ↕ = walk onto it (stairs, ramps, open holes). While recording, use the shovel, rope or ladder as usual: the helper records the exact tile by itself.", "escribe un nombre para la ruta": "type a name for the route", "graba una ruta primero": "record a route first", "elige una ruta guardada": "choose a saved route", "Curarse y tomar pociones durante la caza": "Heal and use potions while hunting", "Mana baja: avisar y alejarse de los monstruos": "Low mana: alert and move away from monsters", "Mana baja si MP ≤ %": "Low mana if MP ≤ %", "Volver a cazar cuando MP ≥ %": "Resume hunting when MP ≥ %", "Usa tus curas de Autoheal y tus pociones de Autolife y Automana (pestaña Combate) aunque estén apagadas. Las pociones solo se usan si esa casilla del hotbar tiene una poción.": "Uses your Autoheal spells and your Autolife and Automana potions (Combat tab) even if they are turned off. Potions are only used if that hotbar slot holds a potion.", "Colores: naranja S = hoyo cerrado (shovel), amarillo R = rope spot, verde E = escalera de clic derecho, azul ↕ = se pisa (escaleras, rampas, hoyos abiertos), morado = punto de espera (spawn) con sus segundos. Mientras grabas, usa la shovel, la rope o la escalera como siempre: el helper anota sola la casilla exacta.": "Colors: orange S = closed hole (shovel), yellow R = rope spot, green E = right-click ladder, blue ↕ = walk onto it (stairs, ramps, open holes), purple = wait point (spawn) with its seconds. While recording, use the shovel, rope or ladder as usual: the helper records the exact tile by itself.", "Esperar aquí (spawn)": "Wait here (spawn)", "Segundos de espera en cada spawn": "Seconds to wait at each spawn", "En un punto \"Esperar aquí\" se queda parado sin perseguir y ataca a los monstruos que se acercan. Cada vez que mata uno vuelve a contar los segundos; si en ese tiempo no aparece nada, sigue la ruta al siguiente spawn.": "At a \"Wait here\" point it stands still without chasing and attacks the monsters that come close. Each kill restarts the countdown; if nothing shows up in that time, it continues the route to the next spawn.", "Colmena (Nest): defensa de la party": "Nest: party defense", "Colmena activa": "Nest active", "Defender de PKs (jugadores que atacan a la party)": "Defend against PKs (players attacking the party)", "Defender de monstruos que atacan a la party": "Defend against monsters attacking the party", "Runa para atacar (vacío = la mejor que tengas)": "Attack rune (empty = the best you carry)", "Otros aliados fuera de la party (coma)": "Other allies outside the party (comma)", "Al matar a un PK, tomar sus objetos (si alcanza la cap)": "After killing a PK, take their items (if cap allows)", "Después, volver a donde estaba": "Then go back to where I was", "Quitar el PVP Lock para defender (y volver a ponerlo al terminar)": "Turn off PVP Lock to defend (and turn it back on afterwards)", "Colmena: apagada": "Nest: off", "Retrasos humanos: cada personaje reacciona y tira runas a destiempo": "Human-like delays: each character reacts and throws runes slightly out of sync", "Cada personaje con el helper y la Colmena activa defiende a su party (la del escudo) y a los aliados de la lista: si un jugador o un monstruo le pega a alguno, lo fija y le tira runas hasta matarlo (con chase si es un jugador que huye). Nunca ataca a un jugador que no haya atacado a la party. Al terminar, toma el loot del PK y vuelve a su sitio.": "Each character with the helper and Nest active defends its party (shield) and the allies in the list: if a player or a monster hits any of them, it targets it and throws runes until it dies (chasing if a player runs away). It never attacks a player who has not attacked the party. Afterwards it takes the PK loot and goes back to its spot.", "Licencia Founder y Colmena": "Founder license and Nest", "Nueva licencia Founder: permanente y con todas las funciones incluidas. Al activar tu licencia toca \"Founder\".": "New Founder license: permanent and with every feature included. When activating your license tap \"Founder\".", "Colmena (exclusivo Founder): cada personaje de tu party con el helper cuida a los demás. Si un PK o un monstruo le pega a alguno, lo atacan con runas, lo persiguen si huye y, al matarlo, toman su loot (si alcanza la cap) y vuelven a su sitio.": "Nest (Founder exclusive): every character in your party running the helper looks after the others. If a PK or a monster hits any of them, they attack it with runes, chase it if it runs and, after killing it, take its loot (if cap allows) and go back to their spot.", "La Colmena nunca ataca a un jugador que no haya atacado a tu party.": "The Nest never attacks a player who has not attacked your party.", "PVP Lock: la Colmena lo quita solo mientras pelea con el PK y lo vuelve a poner en cuanto termina, incluso si la página se recarga. Si lo prefieres, desactiva esa opción y solo te avisa.": "PVP Lock: the Nest turns it off only while fighting the PK and turns it back on as soon as the fight ends, even if the page reloads. If you prefer, turn that option off and it only alerts you.", "Retrasos humanos: cada personaje reacciona y tira runas a destiempo, en cadena y nunca igual. Tú eliges los tiempos y el panel trae los recomendados.": "Human-like delays: each character reacts and throws runes slightly out of sync, in a chain and never the same way. You choose the timings and the panel shows the recommended ones.", "Cave hunt mejorado (Founder): rutas con nombre, rodea obstáculos, usa escaleras, rope y shovel en la casilla exacta, come de los cuerpos si no traes comida, cambia monedas, se cura y toma pociones durante la caza, se aleja de los monstruos con maná baja, espera en los spawns y no ataca monstruos detrás de paredes.": "Improved Cave hunt (Founder): named routes, goes around obstacles, uses stairs, rope and shovel on the exact tile, eats from corpses when you carry no food, converts coins, heals and uses potions while hunting, moves away from monsters on low mana, waits at spawns and skips monsters behind walls.", "Founder": "Founder", "Licencia Founder: permanente y con todas las funciones (Colmena, Cave hunt y Magebomb).": "Founder license: permanent and with every feature (Nest, Cave hunt and Magebomb).", "Exclusivo Founder": "Founder exclusive", "Tienes todo: Colmena (tu party se defiende sola con runas de PKs y monstruos), Cave hunt (ruta grabada, combate, kiting y supervivencia) y Magebomb (combo con líder).": "You have everything: Nest (your party defends itself with runes against PKs and monsters), Cave hunt (recorded route, combat, kiting and survival) and Magebomb (combo with leader).", "Licencia Founder: Colmena, Cave hunt y Magebomb activados para ti.": "Founder license: Nest, Cave hunt and Magebomb enabled for you.", "Esta es una licencia Founder: toca \"Founder\".": "This is a Founder license: tap \"Founder\".", "Reacción mínima (ms)": "Minimum reaction (ms)", "Reacción máxima (ms)": "Maximum reaction (ms)", "Entre runas, mínimo (ms)": "Between runes, minimum (ms)", "Entre runas, máximo (ms)": "Between runes, maximum (ms)", "Recomendado (se ve humano): reacción 300 a 2500 ms y entre runas 2200 a 3000 ms. Reaccionar en menos de 200 ms se ve a bot. Entre runas, menos de 2050 ms no sirve: el juego obliga a esperar 2 segundos. Cada personaje usa su turno dentro de ese rango, así reaccionan en cadena y no todos a la vez.": "Recommended (looks human): reaction 300 to 2500 ms and 2200 to 3000 ms between runes. Reacting in under 200 ms looks like a bot. Between runes, under 2050 ms does nothing: the game forces a 2-second wait. Each character uses its own turn inside that range, so they react in a chain and not all at once.", "NO DISPONIBLE": "NOT AVAILABLE", "FOUNDER": "FOUNDER", "No disponible con tu licencia": "Not available with your license", "Licencia Founder, Colmena y Combo runa": "Founder license, Nest and Rune combo", "Combo runa (antes Magebomb; para Beta tester y Founder): cuando el líder de tu party tira una runa, cada personaje tira la suya al mismo objetivo (o a la misma casilla si es de área), en cadena y con retrasos humanos que tú eliges. Ya no hace falta configurar teclas ni señales.": "Rune combo (formerly Magebomb; for Beta tester and Founder): when your party leader throws a rune, each character throws theirs at the same target (or the same tile for area runes), in a chain and with human-like delays you choose. No more keys or signals to set up.", "Combo runa (seguir al líder)": "Rune combo (follow the leader)", "Combo runa": "Rune combo", "Combo runa activo": "Rune combo active", "Líder (vacío = el líder de la party)": "Leader (empty = the party leader)", "Runa (vacío = la mejor que tengas)": "Rune (empty = the best you carry)", "Runas por cada runa del líder": "Runes per leader rune", "Tirar runa a mi objetivo ahora": "Throw a rune at my target now", "Entre runas (ms)": "Between runes (ms)", "Recomendado (se ve humano): reacción 300 a 1500 ms y entre runas 2200 a 3000 ms. Cada personaje usa su turno dentro del rango, así las runas caen en cadena y no todas en el mismo instante. Entre runas, menos de 2050 ms no sirve: el juego obliga a esperar 2 segundos.": "Recommended (looks human): reaction 300 to 1500 ms and 2200 to 3000 ms between runes. Each character uses its own turn inside the range, so runes land in a chain and not all at the same instant. Between runes, under 2050 ms does nothing: the game forces a 2-second wait.", "Combo runa: apagado": "Rune combo: off", "Cuando el líder tira una runa, este personaje tira la suya al mismo objetivo (o a la misma casilla si es de área). Si el objetivo es un jugador, usa la opción de PVP Lock de la Colmena: lo quita solo durante el combo y lo vuelve a poner. Nunca sigue runas que el líder tire a alguien de la party (curas).": "When the leader throws a rune, this character throws theirs at the same target (or the same tile for area runes). If the target is a player, it uses the Nest PVP Lock option: it turns it off only during the combo and turns it back on. It never follows runes the leader throws at a party member (heals).", "Combo runa (seguir las runas del líder)": "Rune combo (follow the leader runes)", "Combo runa y Cave hunt activados": "Rune combo and Cave hunt enabled", "Combo runa y Cave hunt desactivados": "Rune combo and Cave hunt disabled", "Licencia Founder: Colmena, Cave hunt y Combo runa activados para ti.": "Founder license: Nest, Cave hunt and Rune combo enabled for you.", "Combo runa y Cave hunt: activados para ti (exclusivo Beta tester).": "Rune combo and Cave hunt: enabled for you (Beta tester exclusive).", "Licencia Founder: permanente y con todas las funciones (Colmena, Cave hunt y Combo runa).": "Founder license: permanent and with every feature (Nest, Cave hunt and Rune combo).", "Cave hunt (ruta grabada, combate, kiting y supervivencia) y Combo runa (seguir las runas del líder) están activados para ti.": "Cave hunt (recorded route, combat, kiting and survival) and Rune combo (follow the leader runes) are enabled for you.", "Cave hunt (ruta grabada, combate, kiting y supervivencia) y Combo runa (seguir las runas del líder).": "Cave hunt (recorded route, combat, kiting and survival) and Rune combo (follow the leader runes).", "Tienes todo: Colmena (tu party se defiende sola con runas de PKs y monstruos), Cave hunt (ruta grabada, combate, kiting y supervivencia) y Combo runa (seguir las runas del líder).": "You have everything: Nest (your party defends itself with runes against PKs and monsters), Cave hunt (recorded route, combat, kiting and survival) and Rune combo (follow the leader runes).", "Combo runa (antes Magebomb; exclusivo licencia Founder y Beta tester): cuando el líder de tu party tira una runa, cada personaje tira la suya al mismo objetivo (o a la misma casilla si es de área). Ya no hace falta configurar teclas ni señales.": "Rune combo (formerly Magebomb; Founder and Beta tester exclusive): when your party leader throws a rune, each character throws theirs at the same target (or the same tile for area runes). No more keys or signals to set up.", "Retrasos humanos en el Combo runa: cada personaje reacciona y tira sus runas a destiempo, en cadena y nunca igual. Tú eliges los tiempos y el panel trae los recomendados.": "Human-like delays in Rune combo: each character reacts and throws runes slightly out of sync, in a chain and never the same way. You choose the timings and the panel shows the recommended ones.", "PVP Lock: si el combo va contra un jugador, se quita solo mientras dura y se vuelve a poner al terminar, incluso si la página se recarga. Si lo prefieres, desactiva esa opción y solo te avisa.": "PVP Lock: if the combo targets a player, it is turned off only while it lasts and turned back on when it ends, even if the page reloads. If you prefer, turn that option off and it only alerts you.", "Cave hunt mejorado (exclusivo licencia Founder y Beta tester): rutas con nombre, rodea obstáculos, usa escaleras, rope y shovel en la casilla exacta, come de los cuerpos si no traes comida, cambia monedas, se cura y toma pociones durante la caza, se aleja de los monstruos con maná baja, espera en los spawns y no ataca monstruos detrás de paredes.": "Improved Cave hunt (Founder and Beta tester exclusive): named routes, goes around obstacles, uses stairs, rope and shovel on the exact tile, eats from corpses when you carry no food, converts coins, heals and uses potions while hunting, moves away from monsters on low mana, waits at spawns and skips monsters behind walls.", "Licencia Founder y Combo runa": "Founder license and Rune combo", "Licencia Founder: permanente y con todas las funciones incluidas.": "Founder license: permanent and with every feature included.", "Si es contra un jugador, quitar el PVP Lock durante el combo (y volver a ponerlo)": "If the target is a player, turn off PVP Lock during the combo (and turn it back on)", "Cuando el líder tira una runa, este personaje tira la suya al mismo objetivo (o a la misma casilla si es de área). Si el objetivo es un jugador, quita el PVP Lock solo durante el combo y lo vuelve a poner (si activas esa opción). Nunca sigue runas que el líder tire a alguien de la party (curas).": "When the leader throws a rune, this character throws theirs at the same target (or the same tile for area runes). If the target is a player, it turns off PVP Lock only during the combo and turns it back on (if that option is on). It never follows runes the leader throws at a party member (heals).", "Nueva licencia Founder: permanente, con todas las funciones y para todos tus personajes. Se activa una vez y queda para cualquier personaje que uses en ese dispositivo; cada personaje conserva su propia configuración. Al activar toca \"Founder\".": "New Founder license: permanent, with every feature and for all your characters. Activate it once and it works for any character you use on that device; each character keeps its own settings. When activating tap \"Founder\".", "Licencia Founder: permanente, con todas las funciones y para todos tus personajes (escribe el personaje para el que se hizo).": "Founder license: permanent, with every feature and for all your characters (type the character it was made for).", "Training mejorado: ahora ataca SOLO a personajes de tu party cuyo nombre escribas (puedes poner varios, separados por coma) o a monstruos de la lista, como Monk. Mantiene su posición (si lo empujan, regresa), deja de atacar al objetivo cuando baja a 15 % de vida (configurable) y cambia a otro de la lista o espera a que se cure. Si tu propia vida baja demasiado, se pausa y te avisa.": "Improved Training: it now attacks ONLY characters in your party whose name you type (you can list several, comma separated) or monsters on the list, like Monk. It holds its position (if pushed, it walks back), stops attacking the target when it drops to 15% health (configurable) and switches to another one on the list or waits for it to heal. If your own health gets too low, it pauses and alerts you.", "Licencia Founder, Combo runa y Training": "Founder license, Rune combo and Training", "Nombres (separados por coma)": "Names (comma separated)", "Dejar de atacarlo si su vida ≤ %": "Stop attacking it if its health ≤ %", "Volver a atacarlo cuando su vida ≥ %": "Attack it again when its health ≥ %", "Mantener mi posición (si me mueven, regreso)": "Hold my position (if pushed, walk back)", "Pausar si MI vida ≤ % (0 = nunca)": "Pause if MY health ≤ % (0 = never)", "Cómo funciona: ataca SOLO a los personajes que estén en tu party y cuyo nombre escribas aquí (si escribes un monstruo, como Monk, también lo ataca). Se queda quieto en su casilla: si lo empujan, regresa. Cuando el objetivo baja a la vida que pongas (15 % por defecto) deja de atacarlo y cambia a otro de la lista, o espera a que se cure. Si tu propia vida baja demasiado, se pausa y te avisa.": "How it works: it attacks ONLY characters who are in your party and whose name you type here (if you type a monster, like Monk, it attacks it too). It stays on its tile: if pushed, it walks back. When the target drops to the health you set (15% by default) it stops attacking it and switches to another one on the list, or waits for it to heal. If your own health gets too low, it pauses and alerts you.", "Combo runa más seguro: solo sigue los tiros que salen exactamente de la casilla del líder, así nunca confunde el tiro de otro jugador que esté a su lado.": "Safer Rune combo: it only follows shots that come exactly from the leader tile, so it never mistakes a shot from another player standing next to them.", "Nuevas licencias: Lite (runas, training, casillas, anti-GM, alertas y perfiles), Estándar (todo lo de Lite + combate, Combo runa y reinicio automático) y Gold (todo lo de Estándar + Cave hunt). Duran 1 mes; al vencer, el helper te pide renovarla.": "New licenses: Lite (runes, training, tiles, anti-GM, alerts and profiles), Standard (everything in Lite + combat, Rune combo and auto reconnect) and Gold (everything in Standard + Cave hunt). They last 1 month; when it expires, the helper asks you to renew it.", "Para comprar o renovar tu licencia escríbele a Osbeliaal: correo Osbeliaal@gmail.com o Telegram @osbeliaal (también está en Acerca de).": "To buy or renew your license write to Osbeliaal: email Osbeliaal@gmail.com or Telegram @osbeliaal (also shown in About).", "Al activar ya no tienes que elegir el tipo de licencia: el helper lo reconoce solo con la licencia que pegas.": "When activating you no longer choose the license type: the helper recognizes it from the license you paste.", "Nuevas licencias, Combo runa y Training": "New licenses, Rune combo and Training", "Combo runa (antes Magebomb; desde la licencia Estándar): cuando el líder de tu party tira una runa, cada personaje tira la suya al mismo objetivo (o a la misma casilla si es de área). Ya no hace falta configurar teclas ni señales.": "Rune combo (formerly Magebomb; from the Standard license up): when your party leader throws a rune, each character throws theirs at the same target (or the same tile for area runes). No more keys or signals to set up.", "Cave hunt mejorado (licencias Gold, Founder y Beta tester): rutas con nombre, rodea obstáculos, usa escaleras, rope y shovel en la casilla exacta, come de los cuerpos si no traes comida, cambia monedas, se cura y toma pociones durante la caza, se aleja de los monstruos con maná baja, espera en los spawns y no ataca monstruos detrás de paredes.": "Improved Cave hunt (Gold, Founder and Beta tester licenses): named routes, goes around obstacles, uses stairs, rope and shovel on the exact tile, eats from corpses when you carry no food, converts coins, heals and uses potions while hunting, moves away from monsters on low mana, waits at spawns and skips monsters behind walls.", "Licencia Lite (1 mes): runas, training, casillas, anti-GM, alertas y perfiles.": "Lite license (1 month): runes, training, tiles, anti-GM, alerts and profiles.", "Licencia Estándar (1 mes): todo lo de Lite + combate, Combo runa y reinicio automático.": "Standard license (1 month): everything in Lite + combat, Rune combo and auto reconnect.", "Licencia Gold (1 mes): todo lo de Estándar + Cave hunt.": "Gold license (1 month): everything in Standard + Cave hunt.", "Licencia Beta tester: permanente, sin renovaciones.": "Beta tester license: permanent, no renewals.", "Licencias, renovaciones y soporte: escríbele a Osbeliaal": "Licenses, renewals and support: write to Osbeliaal", "✉ Correo: Osbeliaal@gmail.com": "✉ Email: Osbeliaal@gmail.com", "✈ Telegram: @osbeliaal": "✈ Telegram: @osbeliaal", "¿Necesitas una licencia o renovarla? Escríbele a Osbeliaal: correo": "Need a license or a renewal? Write to Osbeliaal: email", "Licencia Gold: Cave hunt y Combo runa activados para ti.": "Gold license: Cave hunt and Rune combo enabled for you.", "Tu licencia Gold": "Your Gold license", "Tu licencia Estándar": "Your Standard license", "Tu licencia Lite": "Your Lite license", "Todo lo de la licencia Estándar + Cave hunt (ruta grabada, combate, kiting y supervivencia).": "Everything in the Standard license + Cave hunt (recorded route, combat, kiting and survival).", "Todo lo de Lite + combate (autoheal, autolife y automana), Combo runa (seguir las runas del líder) y reinicio automático. El Cave hunt viene con la licencia Gold.": "Everything in Lite + combat (autoheal, autolife and automana), Rune combo (follow the leader runes) and auto reconnect. Cave hunt comes with the Gold license.", "Runas y comida, training y anti-idle, casillas resaltadas, anti-GM y botcheck, alertas y perfil por personaje. El combate, el Combo runa y el reinicio automático vienen con la licencia Estándar.": "Runes and food, training and anti-idle, highlighted tiles, anti-GM and botcheck, alerts and per-character profile. Combat, Rune combo and auto reconnect come with the Standard license.", "GOLD": "GOLD", "Autohaste en el Cave hunt: cuando se te acaba el haste vuelve a lanzar utani hur o utani gran hur (tú eliges), solo si tienes el maná suficiente.": "Autohaste in Cave hunt: when your haste runs out it casts utani hur or utani gran hur again (you choose), only if you have enough mana.", "Autohaste: mantener el haste durante la caza": "Autohaste: keep haste up while hunting", "Hechizo de haste": "Haste spell", "utani hur (Haste)": "utani hur (Haste)", "utani gran hur (Strong haste)": "utani gran hur (Strong haste)", "Lanzarlo solo si tengo MP ≥ (0 = lo que cuesta)": "Cast it only if my MP ≥ (0 = its cost)", "Cuando se te acaba el haste lo vuelve a lanzar, solo si tienes el maná suficiente (utani hur cuesta 60 y utani gran hur 100). Si no te alcanza, no lo lanza y sigue cazando.": "When your haste runs out it casts it again, only if you have enough mana (utani hur costs 60 and utani gran hur 100). If you do not have enough, it does not cast it and keeps hunting.", "Autohaste (pestaña Combate, desde la licencia Estándar): cuando se te acaba el haste vuelve a lanzar utani hur o utani gran hur (tú eliges), solo si tienes el maná suficiente.": "Autohaste (Combat tab, from the Standard license up): when your haste runs out it casts utani hur or utani gran hur again (you choose), only if you have enough mana.", "Autohaste activo": "Autohaste active", "Autohaste (mantener el haste)": "Autohaste (keep haste up)", "Cuando se te acaba el haste lo vuelve a lanzar, solo si tienes el maná suficiente (utani hur cuesta 60 y utani gran hur 100). Si no te alcanza, no lo lanza. Funciona siempre que esté activo (cazando o no), menos en protection zone.": "When your haste runs out it casts it again, only if you have enough mana (utani hur costs 60 and utani gran hur 100). If you do not have enough, it does not cast it. It works whenever it is on (hunting or not), except in protection zones.", "Autohaste (pestaña Combate, desde la licencia Estándar): cuando se te acaba el haste vuelve a lanzar utani hur o utani gran hur (tú eliges), solo si tienes el maná suficiente. El Cave hunt tiene su propia casilla para usarlo mientras cazas.": "Autohaste (Combat tab, from the Standard license up): when your haste runs out it casts utani hur or utani gran hur again (you choose), only if you have enough mana. Cave hunt has its own checkbox to use it while hunting.", "Usar Autohaste durante la caza": "Use Autohaste while hunting", "Mientras cazas mantiene el haste aunque el Autohaste de la pestaña Combate esté apagado. Usa el hechizo y el maná mínimo que elijas allá.": "While hunting it keeps haste up even if Autohaste in the Combat tab is off. It uses the spell and minimum mana you choose there.", "Nuevas licencias: Lite (runas, training, casillas, anti-GM, alertas y perfiles), Estándar (todo lo de Lite + combate con autohaste, Combo runa y reinicio automático) y Gold (todo lo de Estándar + Cave hunt). Duran 1 mes; al vencer, el helper te pide renovarla.": "New licenses: Lite (runes, training, tiles, anti-GM, alerts and profiles), Standard (everything in Lite + combat with autohaste, Rune combo and auto reconnect) and Gold (everything in Standard + Cave hunt). They last 1 month; when it expires, the helper asks you to renew it.", "Licencia Estándar (1 mes): todo lo de Lite + combate (con autohaste), Combo runa y reinicio automático.": "Standard license (1 month): everything in Lite + combat (with autohaste), Rune combo and auto reconnect.", "Todo lo de Lite + combate (autoheal, autolife, automana y autohaste), Combo runa (seguir las runas del líder) y reinicio automático. El Cave hunt viene con la licencia Gold.": "Everything in Lite + combat (autoheal, autolife, automana and autohaste), Rune combo (follow the leader runes) and auto reconnect. Cave hunt comes with the Gold license.", "Cave hunt: atajo Ctrl+Shift+X (tecla configurable) o botón para ocultar y volver a mostrar todas las casillas dibujadas. En la pantalla siempre aparece un aviso con la combinación de teclas.": "Cave hunt: Ctrl+Shift+X shortcut (configurable key) or a button to hide and show again all drawn tiles. A notice with the key combination is always shown on screen.", "Atajo para ocultar/mostrar todas las casillas": "Shortcut to hide/show all tiles", "Tecla del atajo (Ctrl+Shift + …)": "Shortcut key (Ctrl+Shift + …)", "Ocultar / mostrar casillas": "Hide / show tiles", "Oculta de golpe todas las casillas dibujadas (resaltadas, hoyos, rope, escaleras, spawns y timers de magic wall) y las vuelve a mostrar. En la pantalla del juego siempre verás un aviso con la combinación de teclas. No uses H ni K: ya son Ctrl+Shift+H (panel) y Ctrl+Shift+K (modo marcar).": "Hides at once all drawn tiles (highlighted, holes, rope, stairs, spawns and magic wall timers) and shows them again. A notice with the key combination is always shown on the game screen. Do not use H or K: they are already Ctrl+Shift+H (panel) and Ctrl+Shift+K (mark mode).", "Casillas visibles": "Tiles visible", "Página de Minibia Helper renovada: toca cada licencia (Lite, Estándar, Gold y Founder) para ver todo lo que incluye y cuál te conviene.": "Minibia Helper page refreshed: tap each license (Lite, Standard, Gold and Founder) to see everything it includes and which one suits you.", "Estándar y Gold ahora sirven para todos tus personajes: las activas una vez y valen para cualquier personaje del dispositivo. Lite sigue siendo para un solo personaje.": "Standard and Gold now work on all your characters: activate them once and they apply to any character on that device. Lite is still for a single character.", "Prueba de 1 día: pídele a Osbeliaal una prueba que desbloquea todo lo de Gold. Cuando termina, se bloquea sola y vuelves a tu licencia Lite (no se borra).": "1-day trial: ask Osbeliaal for a trial that unlocks everything in Gold. When it ends, it locks by itself and you are back on your Lite license (it is not deleted).", "Con Lite verás un aviso para mejorar tu licencia o pedir la prueba de 1 día.": "With Lite you will see a notice to upgrade your license or ask for the 1-day trial.", "¿Quieres más funciones? Tienes la licencia Lite (un solo personaje).": "Want more features? You have the Lite license (a single character).", "Escríbele a Osbeliaal para mejorar tu licencia a Estándar o Gold (sirven para todos tus personajes), o pide una prueba de 1 día con todo lo de Gold. Al terminar la prueba vuelves a tu Lite.": "Write to Osbeliaal to upgrade your license to Standard or Gold (they work on all your characters), or ask for a 1-day trial with everything in Gold. When the trial ends you are back on your Lite.", "Prueba de 1 día: todo lo de Gold en todos tus personajes. Al terminar vuelves a tu licencia anterior.": "1-day trial: everything in Gold on all your characters. When it ends you go back to your previous license.", "Licencia Lite (1 mes, un solo personaje): runas, training, casillas, anti-GM, alertas y perfiles.": "Lite license (1 month, a single character): runes, training, tiles, anti-GM, alerts and profiles.", "Licencia Estándar (1 mes, todos tus personajes): todo lo de Lite + combate (con autohaste), Combo runa y reinicio automático.": "Standard license (1 month, all your characters): everything in Lite + combat (with autohaste), Rune combo and auto reconnect.", "Licencia Gold (1 mes, todos tus personajes): todo lo de Estándar + Cave hunt.": "Gold license (1 month, all your characters): everything in Standard + Cave hunt.", "Tu licencia Lite (un solo personaje)": "Your Lite license (a single character)", "Tu licencia Gold (todos tus personajes)": "Your Gold license (all your characters)", "Tu licencia Estándar (todos tus personajes)": "Your Standard license (all your characters)", "Runas y comida, training y anti-idle, casillas resaltadas, anti-GM y botcheck, alertas y perfil por personaje. ¿Quieres más? Escríbele a Osbeliaal para mejorar a Estándar o Gold (sirven para todos tus personajes) o pide una prueba de 1 día con todo lo de Gold; al terminar vuelves a tu Lite.": "Runes and food, training and anti-idle, highlighted tiles, anti-GM and botcheck, alerts and per-character profile. Want more? Write to Osbeliaal to upgrade to Standard or Gold (they work on all your characters) or ask for a 1-day trial with everything in Gold; when it ends you are back on your Lite.", "Página de Minibia Helper renovada: toca cada licencia (Lite, Estándar y Gold) para ver todo lo que incluye y cuál te conviene.": "Minibia Helper page refreshed: tap each license (Lite, Standard and Gold) to see everything it includes and which one suits you.", "Cave hunt mejorado (licencias Gold y Beta tester): rutas con nombre, rodea obstáculos, usa escaleras, rope y shovel en la casilla exacta, come de los cuerpos si no traes comida, cambia monedas, se cura y toma pociones durante la caza, se aleja de los monstruos con maná baja, espera en los spawns y no ataca monstruos detrás de paredes.": "Improved Cave hunt (Gold and Beta tester licenses): named routes, goes around obstacles, uses stairs, rope and shovel on the exact tile, eats from corpses when you carry no food, converts coins, heals and uses potions while hunting, moves away from monsters on low mana, waits at spawns and skips monsters behind walls.", "Botones separados en la barra de abajo: «Iniciar runeo», «Iniciar cavehunt» e «Iniciar training», para prender o apagar cada función por su lado sin que se estorben.": "Separate buttons in the bottom bar: «Start runes», «Start cave hunt» and «Start training», to turn each feature on or off on its own without getting in each other's way.", "▶ Iniciar runeo": "▶ Start runes", "■ Detener runeo": "■ Stop runes", "▶ Iniciar cavehunt": "▶ Start cave hunt", "■ Detener cavehunt": "■ Stop cave hunt", "▶ Iniciar training": "▶ Start training", "■ Detener training": "■ Stop training", "subo con": "going up with", "bajo con": "going down with", "subo por": "going up at", "bajo por": "going down at", "abro el hoyo con shovel (": "opening the hole with the shovel (", "no pude subir de piso (": "could not go up a floor (", "no pude bajar de piso (": "could not go down a floor (", "pisando la escalera en": "stepping on the stairs at", "no hay escalera en": "no stairs at", "no puedo caminar a la escalera": "cannot walk to the stairs", "⚠ Cave hunt detenido: no pude usar": "⚠ Cave hunt stopped: could not use", "no pude abrir el hoyo en": "could not open the hole at", "⚠ Cave hunt detenido: no pude abrir el hoyo con la shovel": "⚠ Cave hunt stopped: could not open the hole with the shovel", "Cave hunt: escaleras, rope y shovel": "Cave hunt: stairs, rope and shovel", "Ida y vuelta arreglado: al regresar por la ruta, el Cave hunt ya sabe subir con la rope por donde bajó por un hoyo, bajar por el hoyo por donde subió con la rope (abriéndolo con la shovel si está cerrado) y bajar o subir por las escaleras. Antes se quedaba atorado empujando con las flechas.": "Round trip fixed: when going back along the route, Cave hunt now knows how to go up with the rope where it went down a hole, go down the hole where it went up with the rope (opening it with the shovel if it is closed) and go down or up stairs. Before, it got stuck pushing the arrow keys.", "Al regresar ya no repite la rope o la shovel que grabaste para la ida (te subía o te abría un hoyo en el lugar equivocado).": "On the way back it no longer repeats the rope or shovel you recorded for the way out (it used to take you up or open a hole in the wrong place).", "Escaleras de distintos tipos: las «ladder» y «trapdoor» que se pisan ya no se confunden con las de clic derecho. Las que se pisan, las camina; las de clic derecho (ladder, rope-ladder, sewer grate), las usa.": "Different kinds of stairs: «ladder» and «trapdoor» tiles you step on are no longer mixed up with right-click ones. It walks onto the ones you step on and uses the right-click ones (ladder, rope-ladder, sewer grate).", "Si un hoyo se vuelve a cerrar antes de pisarlo, lo abre otra vez con la shovel en lugar de quedarse atorado.": "If a hole closes again before it steps on it, it opens it again with the shovel instead of getting stuck.", "Después de cambiar de piso sigue con el punto que le toca y no se salta partes de la ruta.": "After changing floors it continues with the right point and does not skip parts of the route.", "Arreglado: el Cave hunt a veces se ponía a escarbar con la shovel en tierra normal. Ahora solo usa la shovel en hoyos cerrados de verdad (stone pile, loose stone pile...).": "Fixed: Cave hunt sometimes started digging with the shovel on normal ground. Now it only uses the shovel on real closed holes (stone pile, loose stone pile...).", "Defensa contra jugadores (PK)": "Defense against players (PK)", "Si un jugador te ataca a TI (nunca a alguien que no te atacó; tu party no cuenta), el helper revisa tus supplies y decide: si es un solo PK, tu vida está bien y tienes suficientes runas y curaciones, se defiende con runas (quita el PVP Lock solo durante la pelea y lo vuelve a poner). Si no, escapa por la ruta hacia el inicio y vuelve a cazar cuando nadie lo ataque. Siempre te avisa, también al celular si lo activaste en Alertas.": "If a player attacks YOU (never someone who did not attack you; your party does not count), the helper checks your supplies and decides: if it is a single PK, your health is fine and you have enough runes and heals, it fights back with runes (it removes the PVP Lock only during the fight and puts it back). Otherwise it escapes along the route to the start and goes back to hunting when nobody attacks it. It always alerts you, also on your phone if you turned it on in Alerts.", "Defenderme si un jugador me ataca": "Defend myself if a player attacks me", "Pelear si tengo al menos (runas de ataque)": "Fight if I have at least (attack runes)", "… y al menos (pociones/runas de curación)": "… and at least (healing potions/runes)", "Cuentan como curación (nombres, coma)": "Count as healing (names, comma)", "Escapar si mi vida baja de (%)": "Escape if my health drops below (%)", "Pelear solo si me atacan como máximo (PKs)": "Fight only if at most this many attack me (PKs)", "Quitar el PVP Lock solo durante la pelea": "Remove the PVP Lock only during the fight", "Volver a cazar tras (s) sin ataques": "Go back to hunting after (s) without attacks", "Recomendado: 10 runas y 3 curaciones como mínimo, escapar con menos de 40 % de vida y pelear contra 1 solo PK. Si eres knight o paladin sin runas, pon 0 runas: atacará con tu arma. Si ya casi lo matas (20 % o menos), lo remata aunque te falte algo.": "Recommended: at least 10 runes and 3 heals, escape below 40% health and fight only 1 PK. If you are a knight or paladin without runes, set 0 runes: it will attack with your weapon. If the PK is almost dead (20% or less), it finishes him even if something is missing.", " me ataca": " attacks me", ". Me defiendo: ": ". Fighting back: ", " runas, ": " runes, ", " curaciones, vida ": " heals, health ", " me está atacando. Escapo": " is attacking me. Escaping", " por la ruta": " along the route", "solo tengo": "I only have", "runas de ataque": "attack runes", "pociones/runas de curación": "healing potions/runes", "jugadores me atacan": "players are attacking me", "mi vida está en": "my health is at", "(PK) eliminado. Sigo cazando.": "(PK) killed. Back to hunting.", "dejó de atacar o se fue. Sigo cazando.": "stopped attacking or left. Back to hunting.", "✅ Ya nadie me ataca: vuelvo a cazar.": "✅ Nobody is attacking me anymore: back to hunting.", "Defensa PK": "PK defense", "peleando con": "fighting", "escapando de": "escaping from", "escapando (": "escaping (", "quitando el PVP Lock para defenderme de": "removing the PVP Lock to defend myself from", "a salvo, vuelvo a cazar": "safe, back to hunting", "sin ataques hace": "no attacks for", "el servidor confirma que me ataca": "the server confirms it attacks me", "me disparó": "shot at me", "pegado y con calavera": "next to me with a skull", "me hizo daño": "damaged me", "curaciones": "heals", "tengo el PVP Lock puesto y no lo puedo quitar": "my PVP Lock is on and I am not allowed to remove it", "Avisos al celular (Telegram, WhatsApp o app ntfy)": "Phone alerts (Telegram, WhatsApp or ntfy app)", "Te manda las alertas (GM, botcheck, muerte, desconexión, PK, Cave hunt detenido...) a tu celular aunque juegues en la PC. Solo se envía el texto de la alerta al servicio que elijas; nada más sale de tu dispositivo. Apagado por defecto.": "Sends your alerts (GM, botcheck, death, disconnection, PK, Cave hunt stopped...) to your phone even if you play on PC. Only the alert text is sent to the service you choose; nothing else leaves your device. Off by default.", "Enviar avisos por": "Send alerts through", "Apagado": "Off", "Telegram (recomendado)": "Telegram (recommended)", "WhatsApp (CallMeBot)": "WhatsApp (CallMeBot)", "App ntfy": "ntfy app", "Token del bot de Telegram": "Telegram bot token", "Tu chat ID de Telegram": "Your Telegram chat ID", "Buscar mi chat ID": "Find my chat ID", "Tu WhatsApp con código de país (+52…)": "Your WhatsApp with country code (+1…)", "API key de CallMeBot": "CallMeBot API key", "Tema de ntfy (como contraseña)": "ntfy topic (like a password)", "Solo avisos importantes": "Important alerts only", "Enviar aviso de prueba": "Send test alert", "Cómo activarlo (una sola vez):\n1) En Telegram busca @BotFather, escríbele /newbot y ponle cualquier nombre. Te da un token: pégalo arriba.\n2) Abre tu bot nuevo y escríbele /start.\n3) Toca «Buscar mi chat ID». Si no lo encuentra, pídeselo a @userinfobot y pégalo.\n4) Toca «Enviar aviso de prueba».": "How to set it up (only once):\n1) In Telegram search @BotFather, send /newbot and give it any name. It gives you a token: paste it above.\n2) Open your new bot and send it /start.\n3) Tap «Find my chat ID». If it does not find it, ask @userinfobot for it and paste it.\n4) Tap «Send test alert».", "Cómo activarlo (una sola vez):\n1) Entra a callmebot.com → WhatsApp API y sigue sus pasos: agregas su número a tus contactos y le mandas el mensaje que indica.\n2) Te responde con tu API key: pégala arriba junto con tu número con código de país (México: +52…).\n3) Toca «Enviar aviso de prueba».\nCallMeBot es un servicio gratuito de terceros: puede tardar o tener límites.": "How to set it up (only once):\n1) Go to callmebot.com → WhatsApp API and follow its steps: add its number to your contacts and send it the message it shows.\n2) It replies with your API key: paste it above together with your number with country code (US: +1…).\n3) Tap «Send test alert».\nCallMeBot is a free third-party service: it may be slow or have limits.", "Cómo activarlo (una sola vez):\n1) Instala la app «ntfy» (Play Store o App Store).\n2) Toca + y escribe EXACTAMENTE el tema de arriba, luego «Suscribirse».\n3) Toca «Enviar aviso de prueba».\nEl tema funciona como contraseña: no lo compartas (quien lo sepa puede leer tus avisos).": "How to set it up (only once):\n1) Install the «ntfy» app (Play Store or App Store).\n2) Tap + and type EXACTLY the topic above, then «Subscribe».\n3) Tap «Send test alert».\nThe topic works like a password: do not share it (anyone who knows it can read your alerts).", "✅ Prueba de Minibia Helper: así te llegarán los avisos.": "✅ Minibia Helper test: this is how your alerts will arrive.", "Faltan datos: llena los campos de arriba.": "Missing data: fill in the fields above.", "Enviando...": "Sending...", "✅ Enviado. Revisa tu Telegram.": "✅ Sent. Check your Telegram.", "❌ Telegram dijo: ": "❌ Telegram said: ", "✅ Enviado. Revisa tu celular (puede tardar unos segundos).": "✅ Sent. Check your phone (it may take a few seconds).", "❌ El servicio respondió con error ": "❌ The service replied with error ", "⚠ No pude confirmar el envío. Si en 1 minuto no te llega, tu navegador está bloqueando la conexión.": "⚠ I could not confirm it was sent. If it does not arrive in 1 minute, your browser is blocking the connection.", "Primero pega el token de tu bot.": "First paste your bot token.", "Buscando...": "Searching...", "❌ Token incorrecto: ": "❌ Wrong token: ", "No encontré mensajes: escríbele /start a tu bot y vuelve a tocar el botón.": "No messages found: send /start to your bot and tap the button again.", "✅ Chat encontrado: ": "✅ Chat found: ", ". Ahora toca «Enviar aviso de prueba».": ". Now tap «Send test alert».", "⚠ No pude consultar Telegram desde aquí. Pídele tu chat ID a @userinfobot y pégalo.": "⚠ I could not reach Telegram from here. Ask @userinfobot for your chat ID and paste it.", "Defensa contra PK y avisos al celular": "PK defense and phone alerts", "Cave hunt · Defensa contra jugadores (PK): nueva casilla «Defenderme si un jugador me ataca». Si alguien te ataca a ti, el helper cuenta tus runas de ataque y tus curaciones, revisa tu vida y cuántos PKs son, y decide solo: pelear con runas o escapar por la ruta. Nunca ataca a quien no te atacó, ni a tu party.": "Cave hunt · Defense against players (PK): new checkbox «Defend myself if a player attacks me». If someone attacks you, the helper counts your attack runes and heals, checks your health and how many PKs there are, and decides by itself: fight back with runes or escape along the route. It never attacks someone who did not attack you, nor your party.", "Al pelear quita el PVP Lock solo durante la pelea y lo vuelve a poner al terminar. Si tu vida baja durante la pelea, cambia a escapar. Si el PK ya casi muere (20 % o menos), lo remata.": "When fighting it removes the PVP Lock only during the fight and puts it back afterwards. If your health drops during the fight, it switches to escaping. If the PK is almost dead (20% or less), it finishes him.", "Después de escapar vuelve a cazar solo cuando pasa un rato sin ataques (60 s por defecto) y tu vida se recuperó.": "After escaping it goes back to hunting only after a while without attacks (60 s by default) and once your health has recovered.", "Te avisa de todo: cuando te defiendes, cuando escapas, cuando muere el PK y cuando vuelves a cazar.": "It alerts you about everything: when you fight back, when you escape, when the PK dies and when you go back to hunting.", "Avisos al celular (pestaña Alertas): recibe las alertas en tu celular aunque juegues en la PC, por Telegram (recomendado), WhatsApp (CallMeBot) o la app ntfy. Viene apagado; trae pasos para activarlo y un botón de prueba. Solo se envía el texto de la alerta al servicio que elijas.": "Phone alerts (Alerts tab): get your alerts on your phone even if you play on PC, through Telegram (recommended), WhatsApp (CallMeBot) or the ntfy app. Off by default; it includes setup steps and a test button. Only the alert text is sent to the service you choose.", "Macros (tus propias reglas)": "Macros (your own rules)", "Escribe tus propias reglas, una por línea: «si (condición) entonces (acción)». Se revisan de arriba hacia abajo 4 veces por segundo. Las líneas que empiezan con # son notas. Ejemplo: si monstruos >= 3 y jugadores == 0 entonces runa \"great fireball\" en objetivo cada 2s": "Write your own rules, one per line: «if (condition) then (action)». They are checked from top to bottom 4 times per second. Lines starting with # are notes. Example: if monsters >= 3 and players == 0 then rune \"great fireball\" on target every 2s", "Macros activos": "Macros on", "Poner ejemplos": "Insert examples", "Ver ayuda": "Show help", "Ocultar ayuda": "Hide help", "¿Agregar los ejemplos al final de tus reglas?": "Add the examples at the end of your rules?", "Las reglas solo pueden leer lo que pasa en el juego y hacer acciones del juego: no pueden tocar tus archivos, tus licencias ni nada fuera de minibia.com/play. Si alguien te pasa reglas, léelas antes de usarlas.": "Rules can only read what happens in the game and do game actions: they cannot touch your files, your licenses or anything outside minibia.com/play. If someone gives you rules, read them before using them.", "✔ Todo bien: ": "✔ All good: ", " reglas.": " rules.", "✖ ": "✖ ", "Línea": "Line", "cada regla empieza con «si»": "each rule starts with «if»", "falta algo después de la condición": "something is missing after the condition", "no conozco": "I do not know", "(mira la lista de la ayuda)": "(see the list in the help)", "falta un número o una condición antes de": "a number or condition is missing before", "después de la condición va «entonces»": "after the condition comes «then»", "después de «cada» va un tiempo, por ejemplo: cada 2s": "after «every» comes a time, for example: every 2s", "«cada» va al final de la regla": "«every» goes at the end of the rule", "falta una acción (decir, runa, usar, tecla, avisar, atacar, soltar, pausar, parar)": "an action is missing (say, rune, use, key, alert, attack, release, pause, stop)", "no conozco la acción": "I do not know the action", "necesita un texto entre comillas": "needs a text in quotes", "tecla necesita cuál: F1, F2... o el número de casilla": "key needs which one: F1, F2... or the slot number", "necesita el nombre entre comillas, por ejemplo": "needs the name in quotes, for example", "después de «en» va «objetivo» o «mi»": "after «on» comes «target» or «me»", "pausar necesita qué: caza, runeo, training o todo": "pause needs what: hunt, runes, training or all", "pausar solo acepta: caza, runeo, training o todo": "pause only accepts: hunt, runes, training or all", "separa las acciones con «y»": "separate actions with «and»", "falta una acción después de «entonces»": "an action is missing after «then»", "Máximo 60 reglas.": "Maximum 60 rules.", "necesita un nombre entre comillas, por ejemplo": "needs a name in quotes, for example", "falta cerrar el paréntesis": "the parenthesis is not closed", "falta cerrar las comillas": "the quotes are not closed", "los paréntesis solo van en monstruo(\"...\"), jugador(\"...\") y cuenta(\"...\")": "parentheses only go in monster(\"...\"), player(\"...\") and count(\"...\")", "Macros": "Macros", "ACTIVOS": "ON", "apagados": "off", "reglas": "rules", "última: línea": "last: line", "pausando:": "pausing:", "sin reglas": "no rules", "hay errores en tus reglas": "there are errors in your rules", "tu licencia no incluye Macros": "your license does not include Macros", "en pausa por un macro": "paused by a macro", "no tengo": "I do not have", "en las mochilas abiertas": "in the open backpacks", "MACRO": "MACRO", "FORMA: si (condición) entonces (acción) [y (acción)] [cada 2s]\nUne condiciones con «y» / «o» y niega con «no». Compara con > < >= <= == !=\n\nCONDICIONES (números):\n  vida, mana .......... tu vida y maná en %\n  vidareal, manareal .. tu vida y maná en puntos\n  cap ................. tu capacidad\n  monstruos ........... monstruos en pantalla (tu piso)\n  cerca ............... monstruos pegados a ti\n  jugadores ........... otros jugadores en pantalla (sin tu party)\n  calaveras ........... jugadores con calavera en pantalla\n  objetivo ............ 1 si tienes objetivo, 0 si no\n  vidaobjetivo ........ vida de tu objetivo en %\n  pz .................. 1 si estás en protection zone\n  monstruo(\"dragon\") .. cuántos dragones ves\n  jugador(\"Nombre\") ... 1 si ves a ese jugador\n  cuenta(\"uh\") ........ cuántos tienes en las mochilas abiertas\n\nACCIONES:\n  decir \"exura\" ................. dice el texto (hechizos)\n  runa \"sudden death\" en objetivo  tira la runa a tu objetivo\n  runa \"ultimate healing\" en mi ... la usa en ti\n  usar \"mana fluid\" en mi ........ usa un objeto en ti\n  usar \"ham\" ..................... usa un objeto (comer)\n  tecla F3 ....................... pulsa una tecla del hotbar\n  atacar / atacar \"rat\" .......... ataca al monstruo más cercano\n  soltar ......................... suelta tu objetivo\n  avisar \"texto\" ................. alerta (y al celular)\n  pausar caza|runeo|training|todo  pausa mientras se cumpla\n  parar .......................... no revisa las reglas de abajo\n                                   (pon tus avisos ARRIBA de un «parar»)\n\n«cada 2s» = cada cuánto se puede repetir (1 s si no lo pones; 30 s para avisar). Las runas esperan solas a que el juego permita tirar otra. También funciona en inglés: if / then / and / or / every, say, rune, use, key, attack, alert, pause, stop.": "FORM: if (condition) then (action) [and (action)] [every 2s]\nJoin conditions with «and» / «or» and negate with «not». Compare with > < >= <= == !=\n\nCONDITIONS (numbers):\n  hp, mana ............ your health and mana in %\n  realhp, realmana .... your health and mana in points\n  cap ................. your capacity\n  monsters ............ monsters on screen (your floor)\n  adjacent ............ monsters next to you\n  players ............. other players on screen (not your party)\n  skulls .............. players with a skull on screen\n  target .............. 1 if you have a target, 0 if not\n  targethp ............ your target health in %\n  pz .................. 1 if you are in a protection zone\n  monster(\"dragon\") ... how many dragons you see\n  player(\"Name\") ...... 1 if you see that player\n  count(\"uh\") ......... how many you have in open backpacks\n\nACTIONS:\n  say \"exura\" ................... says the text (spells)\n  rune \"sudden death\" on target .. throws the rune at your target\n  rune \"ultimate healing\" on me .. uses it on you\n  use \"mana fluid\" on me ......... uses an item on you\n  use \"ham\" ...................... uses an item (eat)\n  key F3 ......................... presses a hotbar key\n  attack / attack \"rat\" .......... attacks the nearest monster\n  release ........................ releases your target\n  alert \"text\" ................... alert (also to your phone)\n  pause hunt|runes|training|all .. pauses while it is true\n  stop ........................... skips the rules below\n                                   (put your alerts ABOVE a «stop»)\n\n«every 2s» = how often it can repeat (1 s if omitted; 30 s for alert). Runes wait by themselves until the game allows another one. Spanish also works: si / entonces / y / o / cada, decir, runa, usar, tecla, atacar, avisar, pausar, parar.", "Macros: crea tus propias reglas": "Macros: create your own rules", "Nuevo: Macros (pestaña propia «Macros», exclusivo de la licencia Gold). Escribe tus propias reglas en español sencillo, una por línea: «si (condición) entonces (acción)». Por ejemplo: si monstruos >= 3 y jugadores == 0 entonces runa \"great fireball\" en objetivo cada 2s.": "New: Macros (its own «Macros» tab, exclusive to the Gold license). Write your own rules in plain words, one per line: «if (condition) then (action)». For example: if monsters >= 3 and players == 0 then rune \"great fireball\" on target every 2s.", "Condiciones: tu vida y maná (en % o en puntos), cap, monstruos en pantalla o pegados a ti, jugadores y jugadores con calavera, tu objetivo y su vida, protection zone, cuántos de un monstruo ves y cuántos objetos tienes.": "Conditions: your health and mana (in % or points), cap, monsters on screen or next to you, players and players with a skull, your target and its health, protection zone, how many of a monster you see and how many items you have.", "Acciones: decir un hechizo, tirar una runa a tu objetivo o a ti, usar un objeto, pulsar una tecla del hotbar, atacar al más cercano, soltar el objetivo, avisarte (también al celular), pausar la caza, el runeo o el training mientras se cumpla, y «parar» para no revisar las reglas de abajo.": "Actions: say a spell, throw a rune at your target or at yourself, use an item, press a hotbar key, attack the nearest one, release the target, alert you (also on your phone), pause the hunt, runes or training while it is true, and «stop» to skip the rules below.", "El helper revisa lo que escribes al momento y te dice en qué línea hay un error y por qué. Trae ejemplos listos y una ayuda con todo lo que puedes usar. También funciona en inglés (if / then / every).": "The helper checks what you write instantly and tells you which line has an error and why. It comes with ready examples and a help with everything you can use. It also works in Spanish (si / entonces / cada).", "Seguro: las reglas solo leen el juego y hacen acciones del juego; no pueden tocar tus archivos ni tus licencias.": "Safe: rules only read the game and do game actions; they cannot touch your files or your licenses.", "Colmena hunt (cazar en party)": "Nest hunt (party hunting)", "Varios personajes cazan juntos en pestañas del mismo navegador. El LÍDER (normalmente el knight) caza con su ruta del Cave hunt. Los SEGUIDORES no usan ruta: pisan por donde pasó el líder (también hoyos, rope y escaleras), atacan su mismo objetivo y curan a los compañeros. El líder espera si alguien se queda atrás o tiene poca vida.": "Several characters hunt together in tabs of the same browser. The LEADER (usually the knight) hunts with its Cave hunt route. FOLLOWERS do not use a route: they step where the leader went (holes, rope and stairs too), attack the same target and heal teammates. The leader waits if someone falls behind or has low health.", "Colmena hunt activa": "Nest hunt on", "Este personaje es": "This character is", "Seguidor (sigue al líder)": "Follower (follows the leader)", "Líder (caza con su ruta)": "Leader (hunts with its route)", "Nombre del líder (vacío = líder de la party)": "Leader name (empty = party leader)", "Distancia al líder (sqm)": "Distance to the leader (sqm)", "Atacar el mismo objetivo que el líder": "Attack the same target as the leader", "Runa para su objetivo (vacío = arma o wand)": "Rune for its target (empty = weapon or wand)", "Curar a los compañeros": "Heal teammates", "Curar si su vida baja de (%)": "Heal if their health drops below (%)", "Hechizo para curar (vacío = usar runa)": "Healing spell (empty = use rune)", "Runa para curar": "Healing rune", "Líder: esperar a quien se quede atrás": "Leader: wait for whoever falls behind", "Líder: esperar si se aleja más de (sqm)": "Leader: wait if farther than (sqm)", "Cómo usarla: 1) hagan party. 2) En la pestaña del líder elige «Líder», activa la Colmena hunt y luego inicia su Cave hunt. 3) En cada seguidor elige «Seguidor» y actívala (NO inicies su Cave hunt). Cada personaje se sigue curando a sí mismo con su Autoheal. Si el seguidor usa runas, se queda quieto («stand») junto al líder.": "How to use it: 1) make a party. 2) In the leader tab choose «Leader», turn Nest hunt on and then start its Cave hunt. 3) In each follower choose «Follower» and turn it on (do NOT start its Cave hunt). Each character keeps healing itself with its Autoheal. If the follower uses runes, it stays still («stand») next to the leader.", "Colmena hunt": "Nest hunt", "esperando a": "waiting for", "siguiendo a": "following", "junto a": "next to", "curando a": "healing", "me aparto del camino de": "stepping out of the way of", "abro paso a": "making way for", "(voy delante)": "(going ahead)", "(cambio de piso primero)": "(changing floor first)", "espero a": "waiting for", "(viene a este piso)": "(coming to this floor)", "detrás de": "behind", "voy a donde": "going where", "cambió de piso": "changed floor", "seguidores:": "followers:", "otro piso": "other floor", "detén tu Cave hunt: el seguidor no usa ruta propia": "stop your Cave hunt: the follower does not use its own route", "escribe el nombre del líder (o haz party con él y ponlo a la vista)": "type the leader name (or party with them and keep them in view)", "esperando señal de": "waiting for signal from", "(actívale la Colmena hunt como líder en su pestaña)": "(turn Nest hunt on as leader in its tab)", "dejó de responder": "stopped responding", "no tengo runas para curar": "I have no healing runes", "atorado: no puedo usar": "stuck: I cannot use", "está en otro piso y no sé por dónde fue": "is on another floor and I do not know where it went", "(inicia el Cave hunt)": "(start the Cave hunt)", "(cazando)": "(hunting)", "Haz que tu personaje haga lo que tú quieras, sin saber programar. Una IA (ChatGPT, Gemini, Claude…) te escribe las reglas: tú solo copias y pegas.": "Make your character do whatever you want, without knowing how to code. An AI (ChatGPT, Gemini, Claude…) writes the rules for you: you just copy and paste.", "Escribe qué quieres que haga tu personaje": "Write what you want your character to do", "Ej: soy druid. Si veo 3 o más monstruos, tira great fireball. Si hay jugadores cerca, no tires nada para no sacar calavera. Si mi vida baja de 50 %, usa UH.": "E.g.: I am a druid. If I see 3 or more monsters, throw great fireball. If players are near, throw nothing to avoid a skull. If my health drops below 50%, use UH.", "📋 Copiar instrucciones para la IA": "📋 Copy instructions for the AI", "Pégalas en ChatGPT, Gemini, Claude o la IA que uses. Te va a contestar con tus reglas: cópialas.": "Paste them into ChatGPT, Gemini, Claude or the AI you use. It will answer with your rules: copy them.", "Pega aquí lo que te dio la IA": "Paste here what the AI gave you", "📥 Pegar respuesta de la IA": "📥 Paste the AI answer", "🛠 Copiar errores para la IA": "🛠 Copy errors for the AI", "Actívalos": "Turn them on", "Se revisan de arriba hacia abajo 4 veces por segundo. Puedes editar las reglas aquí mismo cuando quieras.": "They are checked from top to bottom 4 times per second. You can edit the rules right here anytime.", "Copiar mis macros": "Copy my macros", "Borrar todo": "Delete all", " Ahora activa «Macros activos».": " Now turn on «Macros on».", "Primero escribe en el paso 1 qué quieres que haga tu personaje": "First write in step 1 what you want your character to do", "✅ Copiado. Pégalo en ChatGPT (o tu IA) y copia lo que te conteste.": "✅ Copied. Paste it into ChatGPT (or your AI) and copy what it answers.", "No pude copiar: mantén presionado y copia a mano": "I could not copy: long-press and copy by hand", "✅ Copiado. Pégalo en la misma conversación con la IA y vuelve a pegar su respuesta aquí.": "✅ Copied. Paste it in the same chat with the AI and paste its answer here again.", "No pude leer el portapapeles: mantén presionado el cuadro de abajo y elige «Pegar»": "I could not read the clipboard: long-press the box below and choose «Paste»", "¿Reemplazar tus reglas actuales por lo que pegaste?": "Replace your current rules with what you pasted?", "⚠ Hay errores: toca «Copiar errores para la IA»": "⚠ There are errors: tap «Copy errors for the AI»", "✅ Reglas listas. Activa «Macros activos».": "✅ Rules ready. Turn on «Macros on».", "Macros copiados": "Macros copied", "¿Borrar todas tus reglas?": "Delete all your rules?", "Con ayuda de una IA: escribe en palabras normales qué quieres que haga tu personaje, toca «Copiar instrucciones para la IA», pégalas en ChatGPT (o la IA que uses) y pega aquí lo que te conteste. Si algo sale mal, el helper te da un mensaje para que la IA lo corrija.": "With help from an AI: write in normal words what you want your character to do, tap «Copy instructions for the AI», paste them into ChatGPT (or the AI you use) and paste its answer here. If something is wrong, the helper gives you a message so the AI fixes it.", "📡 Agregar monstruos de alrededor": "📡 Add monsters around me", "Los monstruos se guardan junto con la ruta con nombre: al cargar la ruta vuelven solos. «Agregar monstruos de alrededor» escribe los que ves en pantalla (sin jugadores, NPCs ni invocaciones).": "Monsters are saved together with the named route: when you load the route they come back by themselves. «Add monsters around me» types the ones you see on screen (no players, NPCs or summons).", "no veo monstruos en pantalla": "I see no monsters on screen", "No veo monstruos en pantalla": "I see no monsters on screen", "ya tienes todos:": "you already have all:", "Ya estaban todos en tu lista": "They were all in your list already", "agregados:": "added:", "Agregados:": "Added:", "monstruos": "monsters", ", monstruos:": ", monsters:", "Cave hunt: los monstruos a atacar ahora se guardan junto con la ruta con nombre (y viajan con ella cuando copias o pegas una ruta). Al cargar la ruta ya no tienes que volver a escribirlos.": "Cave hunt: the monsters to attack are now saved together with the named route (and travel with it when you copy or paste a route). When you load the route you no longer have to type them again.", "Nuevo botón «📡 Agregar monstruos de alrededor»: escribe solo los monstruos que ves en pantalla, sin repetir y sin jugadores, NPCs ni invocaciones.": "New «📡 Add monsters around me» button: it types only the monsters you see on screen, without repeats and without players, NPCs or summons.", "Distancia a mantener (sqm)": "Distance to keep (sqm)", "Para paladin, sorcerer y druid. Se queda quieto disparando mientras los monstruos estén a esa distancia; si alguno se acerca da un paso (recto, sin diagonales) hacia donde hay más espacio, sin meterse a esquinas, y gira alrededor si no puede alejarse. Recomendado: 3. Usa una tecla de ataque (runa o hechizo) en «Tecla de ataque».": "For paladins, sorcerers and druids. It stands still shooting while monsters are at that distance; if one gets closer it takes a step (straight, no diagonals) toward where there is more room, without getting into corners, and circles around if it cannot move away. Recommended: 3. Set an attack key (rune or spell) in «Attack key».", "kiting: a": "kiting: at", "sqm, disparando": "sqm, shooting", "kiting: me alejo": "kiting: moving away", "kiting: me acerco": "kiting: moving closer", "kiting: acorralado (sin casilla libre)": "kiting: cornered (no free tile)", "Kiting rehecho (paladin, sorcerer y druid): ahora mantiene a los monstruos a la distancia que elijas (3 sqm por defecto) y se queda quieto disparando; solo da un paso cuando alguno se acerca. Camina recto como un jugador, no choca con paredes, no se mete a esquinas y busca hacia dónde huir aunque lo sigan varios monstruos.": "Kiting rebuilt (paladins, sorcerers and druids): it now keeps monsters at the distance you choose (3 sqm by default) and stands still shooting; it only takes a step when one gets closer. It walks straight like a player, does not bump into walls, does not get into corners and finds where to run even when several monsters chase it.", "Vendedores autorizados": "Authorized sellers", "Ahora también puedes comprar tu licencia con vendedores autorizados por Osbeliaal. Funcionan igual que las de siempre: pega tu licencia y el helper la reconoce sola.": "You can now also buy your license from sellers authorized by Osbeliaal. They work just like the usual ones: paste your license and the helper recognizes it by itself.", "Tu licencia muestra quién te la vendió, y cuando toca renovarla el helper te dice a quién escribirle.": "Your license shows who sold it to you, and when it is time to renew, the helper tells you who to message.", "Las licencias siguen firmadas: nadie puede fabricarlas ni usar la de otro personaje, las venda quien las venda.": "Licenses are still signed: nobody can forge them or use another character's license, no matter who sells them.", "Licencia no válida. Revisa que esté completa (sin espacios ni letras de más).": "Invalid license. Check that it is complete (no extra spaces or letters).", "Esta licencia fue cancelada. Pide una nueva a Osbeliaal.": "This license was cancelled. Ask Osbeliaal for a new one.", "Activar otra licencia": "Activate another license", "Para pegar una licencia nueva: renovar, subir de Lite a Estándar o Gold, o una prueba de 1 día": "To paste a new license: renew, upgrade from Lite to Standard or Gold, or a 1-day trial", "Nuevo botón «Activar otra licencia» en «Acerca de»: para renovar, subir de Lite a Estándar o Gold, o activar una prueba de 1 día cuando quieras.": "New «Activate another license» button in «About»: to renew, upgrade from Lite to Standard or Gold, or activate a 1-day trial whenever you want.", "Activar licencia más fácil": "Easier license activation", "Al activar tu licencia ya puedes pegar el mensaje completo que te mandó tu vendedor: el helper encuentra la licencia sola.": "When activating your license you can now paste the whole message your seller sent you: the helper finds the license by itself.", "Munición y small stones automáticas": "Automatic ammo and small stones", "Cave hunt (paladin): sube la munición sola al slot de flechas. Busca en tus mochilas abiertas flechas si traes arco o bolts si traes ballesta, de cualquier tipo (arrow, poison arrow, power bolt...). Primero junta las del mismo tipo y, cuando se acaban, pone otro tipo. Te avisa cuando ya no queda nada.": "Cave hunt (paladin): moves ammo to the arrow slot by itself. It looks in your open backpacks for arrows if you carry a bow or bolts if you carry a crossbow, of any kind (arrow, poison arrow, power bolt...). It first stacks the same kind and, when they run out, uses another kind. It warns you when there is nothing left.", "Training: cuando se acaban las small stones de tu mano, toma más de la mochila y las pone en la misma mano.": "Training: when the small stones in your hand run out, it takes more from your backpack and puts them in the same hand.", "Puedes elegir con cuántas rellenar (20 de munición y 5 piedras por defecto) o apagar cada opción.": "You can choose when to refill (20 ammo and 5 stones by default) or turn each option off.", "Paladin: subir munición al slot de flechas": "Paladin: move ammo to the arrow slot", "Rellenar cuando queden menos de": "Refill when fewer than", "Busca munición en tus mochilas abiertas y la sube al slot de flechas: flechas si traes arco, bolts si traes ballesta (cualquier tipo: arrow, poison arrow, power bolt...). Primero junta las del mismo tipo; si se acaban, pone otro tipo. Te avisa cuando ya no queda nada.": "Looks for ammo in your open backpacks and moves it to the arrow slot: arrows if you carry a bow, bolts if you carry a crossbow (any kind: arrow, poison arrow, power bolt...). It first stacks the same kind; when they run out, it uses another kind. It warns you when there is nothing left.", "Subir small stones a la mano cuando se acaben": "Move small stones to the hand when they run out", "Mientras el training está activo: si tus small stones de la mano se acaban (o quedan pocas), toma más de tu mochila abierta y las pone en la misma mano.": "While training is on: if the small stones in your hand run out (or few are left), it takes more from your open backpack and puts them in the same hand.", "⚠ Aviso importante": "⚠ Important notice", "Minibia Helper es una herramienta independiente: no es de Minibia ni está aprobada por sus administradores. Usar programas de ayuda o automatización puede ir contra las reglas del juego, y tu cuenta puede ser suspendida o baneada.": "Minibia Helper is an independent tool: it is not made or approved by Minibia or its administrators. Using helper or automation programs may break the game rules, and your account may be suspended or banned.", "Osbeliaal y sus vendedores no se hacen responsables de baneos, suspensiones, pérdida de personajes, objetos o progreso, ni de ningún otro daño a tu cuenta. Lo usas bajo tu propio riesgo.": "Osbeliaal and its sellers are not responsible for bans, suspensions, loss of characters, items or progress, or any other damage to your account. You use it at your own risk.", "Fomentamos el uso responsable: úsalo estando frente a la pantalla, contesta tú mismo las verificaciones anti-bot y los mensajes de los GM, toma descansos y respeta a los demás jugadores.": "We encourage responsible use: use it while you are at the screen, answer anti-bot checks and GM messages yourself, take breaks and respect other players.", "Leí este aviso y lo acepto.": "I have read this notice and I accept it.", "No acepto": "I do not accept", "Aceptar y continuar": "Accept and continue", "Para usar Minibia Helper tienes que aceptar el aviso.": "To use Minibia Helper you have to accept the notice.", "Monstruo que pregunta \"are you there?\"": "Monster asking \"are you there?\"", "Pausar todo y avisarme (también al celular)": "Pause everything and alert me (also on my phone)", "Probar aviso": "Test alert", "Si aparece un monstruo que no te ataca y te pregunta \"are you there?\" (texto naranja), el helper pausa el Cave hunt, el runeo y el training, suena la alarma y te avisa. Nunca le contesta solo: contéstale tú en el juego y luego toca «Reanudar helper».": "If a monster that does not attack you shows up and asks \"are you there?\" (orange text), the helper pauses Cave hunt, rune making and training, sounds the alarm and alerts you. It never answers by itself: answer it yourself in the game and then tap «Resume helper».", "Recordarme tomar un descanso": "Remind me to take a break", "Cada (minutos de caza seguidos)": "Every (minutes of continuous hunting)", "Detener el Cave hunt al recordármelo": "Stop Cave hunt when reminding me", "Te avisa (con sonido y al celular) cada cierto tiempo de caza para que hagas una pausa. Si marcas «Detener», el Cave hunt se apaga hasta que tú lo vuelvas a iniciar.": "It alerts you (with sound and on your phone) every so often while hunting so you take a break. If you tick «Stop», Cave hunt turns off until you start it again.", "Munición automática, aviso de monstruo y descansos": "Automatic ammo, monster alert and breaks", "Nuevo aviso: si aparece un monstruo que no te ataca y te pregunta \"are you there?\", el helper pausa el Cave hunt, el runeo y el training, suena la alarma y te avisa (también al celular). Contéstale tú y luego toca «Reanudar helper».": "New alert: if a monster that does not attack you shows up and asks \"are you there?\", the helper pauses Cave hunt, rune making and training, sounds the alarm and alerts you (also on your phone). Answer it yourself and then tap «Resume helper».", "Cave hunt: recordatorio para tomar un descanso cada 60 minutos de caza (puedes cambiar el tiempo o hacer que el Cave hunt se detenga al recordártelo).": "Cave hunt: reminder to take a break every 60 minutes of hunting (you can change the time or make Cave hunt stop when it reminds you).", "Al abrir el helper por primera vez sale un aviso de uso responsable que hay que aceptar.": "When you open the helper for the first time, a responsible-use notice appears that you have to accept.", "Combo runa más listo y licencias": "Smarter rune combo and licenses", "Combo runa: ahora tira la misma runa que el líder (si el líder tira HMM, tú HMM; si tira GFB o explosion, tú la de fuego que tengas). Si el objetivo tiene poca vida (30 % o menos), cambia a SD para rematar. Puedes apagar cada opción y elegir el %.": "Rune combo: it now fires the same rune as the leader (if the leader fires HMM, you fire HMM; if GFB or explosion, the fire rune you have). If the target is low on health (30% or less), it switches to SD to finish it. You can turn each option off and choose the %.", "Arreglado: si tenías una prueba de 1 día y activabas la licencia que compraste (o una renovación), seguía mostrando la prueba. Ahora la prueba se quita y queda la que compraste.": "Fixed: if you had a 1-day trial and activated the license you bought (or a renewal), it kept showing the trial. Now the trial is removed and the license you bought stays.", "Mientras usas la prueba, arriba de la pestaña Runas sale un aviso con el botón «Activar licencia nueva» para pegar la que compres.": "While you use the trial, a notice with an «Activate new license» button appears at the top of the Runes tab so you can paste the one you buy.", "Nuevo botón «Mis licencias» en «Acerca de»: ves las licencias guardadas en tu dispositivo y puedes quitar la que quieras.": "New «My licenses» button in «About»: see the licenses saved on your device and remove any of them.", "Usar la misma runa que el líder (si la tengo)": "Use the same rune as the leader (if I have it)", "Rematar con SD si el objetivo tiene poca vida": "Finish with SD if the target is low on health", "Usar SD si su vida ≤ %": "Use SD if its health ≤ %", "Orden: si el objetivo está en esa vida o menos, tira SD; si no, la misma runa que tiró el líder (HMM, GFB, explosion...); si no la tienes, la que escribiste arriba o la mejor que tengas.": "Order: if the target is at that health or less, fire SD; otherwise the same rune the leader fired (HMM, GFB, explosion...); if you do not have it, the one you wrote above or the best you have.", "🔑 Activar licencia nueva": "🔑 Activate new license", "¿Ya compraste tu licencia? Toca «Activar licencia nueva» y pégala: se quita la prueba y queda la que compraste.": "Already bought your license? Tap «Activate new license» and paste it: the trial is removed and the one you bought stays.", "Mis licencias": "My licenses", "Ver y quitar las licencias guardadas en este dispositivo": "See and remove the licenses saved on this device", "Licencias guardadas en este dispositivo": "Licenses saved on this device", "No hay licencias guardadas.": "There are no saved licenses.", "Quitar": "Remove", "Captcha anti-bot del juego: el aviso (y el mensaje a tu celular) ahora te dice cuántos segundos te quedan para resolverlo, y te vuelve a avisar más fuerte cuando faltan 15 segundos.": "Game anti-bot captcha: the alert (and the message to your phone) now tells you how many seconds you have left to solve it, and warns you again louder when 15 seconds are left.", "Las casillas dibujadas (resaltadas, hoyos, rope, escaleras, spawns y timers) empiezan ocultas al abrir el juego para que cargue más rápido. Muéstralas con Ctrl+Shift+X o con el botón «Mostrar / ocultar casillas» (pestaña Casillas o Cave hunt).": "Drawn tiles (highlighted, holes, rope, stairs, spawns and timers) start hidden when you open the game so it loads faster. Show them with Ctrl+Shift+X or the «Show / hide tiles» button (Tiles tab or Cave hunt).", "Mostrar / ocultar casillas": "Show / hide tiles", "Al abrir el juego las casillas empiezan ocultas para que cargue más rápido": "When you open the game, tiles start hidden so it loads faster", "Al abrir el juego las casillas empiezan ocultas para que cargue más rápido. Muéstralas con este botón o con Ctrl+Shift+X.": "When you open the game, tiles start hidden so it loads faster. Show them with this button or with Ctrl+Shift+X.", "Autohechizos, refugio en casa y esquivar ondas": "Auto spells, house refuge and wave dodging", "Nuevo: auto utamo vita y auto utana vid (pestaña Combate, desde la licencia Estándar). Cuando se te acaba el efecto lo vuelve a lanzar si tienes el maná. Utamo vita: elige si lo quieres siempre puesto o solo cuando tu vida baje del % que pongas.": "New: auto utamo vita and auto utana vid (Combat tab, from the Standard license). When the effect ends it casts it again if you have the mana. Utamo vita: choose to keep it always on or only when your health drops below the % you set.", "Nuevo: refugio en la casa al runear (pestaña Runas). Marca tu lugar de runeo y una casilla dentro de tu casa: si aparece un PK o alguien te ataca, tu personaje se mete a la casa (abre la puerta si está cerrada) y regresa cuando pasa 1 minuto sin verlo. Mete a party a tus farmers para que no los confunda; si uno de ellos ve al PK, todos se meten.": "New: house refuge while making runes (Runes tab). Mark your rune spot and a tile inside your house: if a PK shows up or someone attacks you, your character goes into the house (opening the door if closed) and comes back after 1 minute without seeing them. Put your farmers in party so they are not mistaken; if one of them sees the PK, all of them go in.", "Cave hunt: esquiva las ondas y rayos de dragon, dragon lord y demon. Si te tienen en línea recta, da un paso en diagonal sin despegarse del objetivo. Puedes editar la lista de monstruos.": "Cave hunt: dodges the waves and beams of dragons, dragon lords and demons. If they have you in a straight line, it steps diagonally without leaving the target. You can edit the monster list.", "Tu código de referido aparece en «Acerca de»: compártelo y si alguien nuevo compra con tu código, te regalamos 3 días extra.": "Your referral code appears in «About»: share it and if someone new buys with your code, we give you 3 extra days.", "Autohechizos (utamo vita y utana vid)": "Auto spells (utamo vita and utana vid)", "Auto utamo vita (magic shield)": "Auto utamo vita (magic shield)", "Cuándo lanzarlo": "When to cast it", "Siempre activo (relanzar al terminar)": "Always on (recast when it ends)", "Solo si mi vida baja de…": "Only if my health drops below…", "Vida (%) para lanzarlo": "Health (%) to cast it", "Maná que cuesta (utamo vita)": "Mana cost (utamo vita)", "Auto utana vid (invisible)": "Auto utana vid (invisible)", "Maná que cuesta (utana vid)": "Mana cost (utana vid)", "Cuando se te acaba el efecto lo vuelve a lanzar, solo si tienes el maná suficiente y no estás en protection zone. Utamo vita: elige si lo quieres siempre puesto o solo cuando tu vida baje del % que pongas.": "When the effect ends it casts it again, only if you have enough mana and are not in a protection zone. Utamo vita: choose to keep it always on or only when your health drops below the % you set.", "Casa: refugio contra PKs al runear": "House: refuge from PKs while making runes", "Si aparece un jugador con calavera o uno que te ataca, el helper camina a tu casa. Cuando pasa el tiempo que elijas sin verlo, regresa a tu lugar de runeo. IMPORTANTE: mete a party a todos tus farmers (y/o escribe sus nombres abajo) para que no los confunda con PKs. Si runeas con uno solo, deja la casilla de farmers vacía.": "If a skulled player or someone attacking you shows up, the helper walks to your house. After the time you choose without seeing them, it returns to your rune spot. IMPORTANT: put all your farmers in party (and/or write their names below) so they are not mistaken for PKs. If you make runes with only one character, leave the farmers box empty.", "Refugiarme en la casa si veo un PK": "Take refuge in the house if I see a PK", "Salir después de (segundos sin verlo)": "Leave after (seconds without seeing them)", "Mis farmers (nombres, separados por coma)": "My farmers (names, comma separated)", "Marcar mi lugar de runeo": "Mark my rune spot", "Marcar casilla dentro de la casa": "Mark tile inside the house", "Probar: ir a la casa": "Test: go to the house", "Cómo marcarlo: párate donde runeas y toca «Marcar mi lugar de runeo»; luego entra a tu casa, párate en la casilla donde quieres esperar y toca «Marcar casilla dentro de la casa». Si la puerta está cerrada, el helper la abre. Tus personajes en otras pestañas de este navegador también se meten cuando uno ve al PK.": "How to mark it: stand where you make runes and tap «Mark my rune spot»; then go into your house, stand on the tile where you want to wait and tap «Mark tile inside the house». If the door is closed, the helper opens it. Your characters in other tabs of this browser also go in when one of them sees the PK.", "Esquivar ondas y rayos (pararme en diagonal)": "Dodge waves and beams (stand diagonally)", "Monstruos con onda o rayo (coma)": "Monsters with wave or beam (comma)", "Los ataques en línea recta y en abanico (fire wave, energy beam...) no pegan en diagonal. Si alguno de estos monstruos te tiene en su línea, da un paso a una casilla en diagonal; si peleas cuerpo a cuerpo, sin despegarse del objetivo.": "Straight-line and cone attacks (fire wave, energy beam...) do not hit diagonally. If one of these monsters has you in its line, it steps to a diagonal tile; in melee, without leaving the target.", "Copiar mi código": "Copy my code", "Compártelo: si alguien nuevo compra su licencia y da tu código, te regalamos 3 días extra en tu licencia.": "Share it: if someone new buys a license and gives your code, we give you 3 extra days on your license.", "Depósito en la casa": "House deposit", "Nuevo en la sección Casa (pestaña Runas): cuando tu cap baja, tu personaje camina a un baúl de tu casa, guarda las runas y la munición de tus mochilas abiertas y regresa a seguir runeando. Párate junto al baúl y toca «Marcar depósito»; también puedes poner el ID del baúl.": "New in the House section (Runes tab): when your cap gets low, your character walks to a chest in your house, stores the runes and ammo from your open backpacks and goes back to keep making runes. Stand next to the chest and tap «Mark deposit»; you can also enter the chest ID.", "Con el depósito activo, la cap baja ya no detiene el runeo: espera a que guarde y sigue solo. Las blank runes no se guardan, y puedes agregar otros objetos por nombre.": "With the deposit on, low cap no longer stops rune making: it waits until it stores and continues by itself. Blank runes are not stored, and you can add other items by name.", "Depósito: guardar runas cuando la cap baja": "Deposit: store runes when cap gets low", "Guardar runas y munición en un baúl de la casa": "Store runes and ammo in a house chest", "Ir a guardar cuando la cap baje de": "Go store when cap drops below", "Guardar runas (no las blank)": "Store runes (not blank ones)", "Guardar munición (flechas y bolts)": "Store ammo (arrows and bolts)", "Otros objetos a guardar (nombres, coma)": "Other items to store (names, comma)", "ID del baúl/caja (0 = el que esté junto a mí)": "Chest/box ID (0 = the one next to me)", "Marcar depósito (párate junto al baúl)": "Mark deposit (stand next to the chest)", "Cuando tu cap baja del número que pongas, camina al baúl, lo abre, guarda las runas y la munición de tus mochilas abiertas y regresa a tu lugar de runeo. Para marcarlo, párate pegado al baúl (caja, cofre o mochila en el suelo) y toca «Marcar depósito». Si hay varios, escribe el ID del que quieres. Necesita también «Marcar mi lugar de runeo».": "When your cap drops below the number you set, it walks to the chest, opens it, stores the runes and ammo from your open backpacks and goes back to your rune spot. To mark it, stand next to the chest (box, chest or backpack on the floor) and tap «Mark deposit». If there are several, write the ID of the one you want. It also needs «Mark my rune spot»."};
  var trRe = null, trRaices = [], trObs = null;
  function trEsc(x) { return x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function trTexto(t) {
    if (IDIOMA !== 'en' || typeof t !== 'string' || !t) { return t; }
    var k = t.trim();
    if (!k) { return t; }
    if (Object.prototype.hasOwnProperty.call(TR_EN, k)) { return t.replace(k, TR_EN[k]); }
    if (!trRe) {
      var ks = Object.keys(TR_EN).filter(function (x) { return x.length >= 2; }).sort(function (a, b) { return b.length - a.length; }).map(trEsc);
      trRe = new RegExp('(^|[^A-Za-zÀ-ÿ])(' + ks.join('|') + ')(?![A-Za-zÀ-ÿ])', 'g');
    }
    return t.replace(trRe, function (m, pre, key) { return pre + (TR_EN[key] || key); });
  }
  function trSaltar(n) { var p = n.nodeType === 1 ? n : n.parentNode; return !!(p && p.closest && p.closest('[data-notr],textarea,script,style')); }
  function trNodo(n) { if (trSaltar(n)) { return; } var v = n.nodeValue, r = trTexto(v); if (r !== v) { n.nodeValue = r; } }
  function trAttrs(el) {
    if (!el.getAttribute || trSaltar(el)) { return; }
    ['placeholder', 'title', 'aria-label'].forEach(function (a) { var v = el.getAttribute(a); if (v) { var r = trTexto(v); if (r !== v) { el.setAttribute(a, r); } } });
  }
  function trArbol(root) {
    if (!root) { return; }
    if (root.nodeType === 3) { trNodo(root); return; }
    if (root.nodeType !== 1 || trSaltar(root)) { return; }
    trAttrs(root);
    var w = document.createTreeWalker(root, 5);   // elementos y texto
    while (w.nextNode()) { var n = w.currentNode; if (n.nodeType === 3) { trNodo(n); } else { trAttrs(n); } }
  }
  function trRaiz(el) {
    if (!el) { return el; }
    if (trRaices.indexOf(el) < 0) { trRaices.push(el); }
    if (IDIOMA !== 'en') { return el; }
    try {
      trArbol(el);
      if (!trObs) {
        trObs = new MutationObserver(function (ms) {
          ms.forEach(function (m) {
            if (m.type === 'characterData') { trNodo(m.target); }
            else if (m.type === 'attributes') { trAttrs(m.target); }
            else { for (var i = 0; i < m.addedNodes.length; i++) { trArbol(m.addedNodes[i]); } }
          });
        });
      }
      trObs.observe(el, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'title', 'aria-label'] });
    } catch (e) {}
    return el;
  }
  function ponerIdioma(v) {
    var antes = IDIOMA;
    IDIOMA = v;
    try { localStorage.setItem(KEY_IDIOMA, v); } catch (e) {}
    if (v === 'en') { trRaices.forEach(function (el) { trRaiz(el); }); }
    return antes;
  }
  function confirmTr(m) { return window.confirm(trTexto(m)); }
  function promptTr(m) { return window.prompt(trTexto(m)); }
  // Selector de idioma: sale al cargar el juego la primera vez (antes que nada)
  var idiomaModal = null, idiomaTras = [];
  function pedirIdioma(despues) {
    if (despues) { idiomaTras.push(despues); }
    if (!idiomaModal) {
      idiomaModal = document.createElement('div');
      idiomaModal.id = 'mbh-idioma';
      idiomaModal.setAttribute('data-notr', '1');
      idiomaModal.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6);font:13px Verdana,Tahoma,sans-serif;color:#dcdcdc';
      var caja = document.createElement('div');
      caja.style.cssText = 'width:min(360px,calc(100vw - 24px));box-sizing:border-box;background:#222424;border:1px solid #000;box-shadow:inset 0 0 0 1px #555959,0 6px 24px rgba(0,0,0,.7);padding:16px;text-align:center';
      var img = document.createElement('img'); img.src = ICONO_URI; img.alt = ''; img.style.cssText = 'width:40px;height:40px;image-rendering:pixelated';
      var t1 = document.createElement('div'); t1.textContent = 'Minibia Helper'; t1.style.cssText = 'font-weight:700;font-size:16px;color:#ececec;margin:6px 0 2px';
      var t2 = document.createElement('div'); t2.textContent = 'Elige tu idioma · Choose your language'; t2.style.cssText = 'font-size:12px;color:#f5a400;margin-bottom:14px';
      caja.appendChild(img); caja.appendChild(t1); caja.appendChild(t2);
      [['es', 'Español'], ['en', 'English']].forEach(function (o) {
        var b = document.createElement('button'); b.textContent = o[1];
        b.style.cssText = 'display:block;width:100%;min-height:48px;margin:8px 0;font:700 16px Verdana,Tahoma,sans-serif;color:#ececec;background:linear-gradient(#3e4142,#2b2d2d);border:1px solid;border-color:#767a7a #060707 #060707 #767a7a;cursor:pointer';
        b.onclick = function () {
          ponerIdioma(o[0]);
          idiomaModal.style.display = 'none';
          var l = idiomaTras; idiomaTras = [];
          l.forEach(function (f) { try { f(); } catch (e) {} });
        };
        caja.appendChild(b);
      });
      var t3 = document.createElement('div'); t3.textContent = 'Puedes cambiarlo luego en Sistema · You can change it later in System';
      t3.style.cssText = 'font-size:11px;color:#9a9d9d;margin-top:8px';
      caja.appendChild(t3);
      idiomaModal.appendChild(caja);
      ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'click', 'dblclick', 'contextmenu'].forEach(function (t) {
        idiomaModal.addEventListener(t, function (e) { e.stopPropagation(); }, false);
      });
      (document.body || document.documentElement).appendChild(idiomaModal);
    }
    idiomaModal.style.display = 'flex';
  }
  // ---------- Aviso de responsabilidad: sale la primera vez (después del idioma) y hay que aceptarlo ----------
  var KEY_AVISO_LEGAL = 'minibiaHelperAvisoLegal1';
  var avisoLegalModal = null, avisoLegalTras = [];
  function avisoLegalOk() { try { return !!localStorage.getItem(KEY_AVISO_LEGAL); } catch (e) { return true; } }
  function pedirAvisoLegal(despues) {
    if (avisoLegalOk()) { if (despues) { try { despues(); } catch (e) {} } return; }
    if (despues) { avisoLegalTras.push(despues); }
    if (!avisoLegalModal) {
      avisoLegalModal = document.createElement('div');
      avisoLegalModal.id = 'mbh-aviso-legal';
      avisoLegalModal.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.65);font:13px/1.5 Verdana,Tahoma,sans-serif;color:#dcdcdc';
      var caja = document.createElement('div');
      caja.style.cssText = 'width:min(420px,calc(100vw - 24px));max-height:calc(100vh - 24px);overflow:auto;box-sizing:border-box;background:#222424;border:1px solid #000;box-shadow:inset 0 0 0 1px #555959,0 6px 24px rgba(0,0,0,.7);padding:16px';
      function p(txt, css) { var d = document.createElement('div'); d.textContent = txt; d.style.cssText = css || 'margin:0 0 10px'; caja.appendChild(d); return d; }
      p('⚠ Aviso importante', 'font-weight:700;font-size:16px;color:#ffd166;margin:0 0 10px');
      p('Minibia Helper es una herramienta independiente: no es de Minibia ni está aprobada por sus administradores. Usar programas de ayuda o automatización puede ir contra las reglas del juego, y tu cuenta puede ser suspendida o baneada.');
      p('Osbeliaal y sus vendedores no se hacen responsables de baneos, suspensiones, pérdida de personajes, objetos o progreso, ni de ningún otro daño a tu cuenta. Lo usas bajo tu propio riesgo.');
      p('Fomentamos el uso responsable: úsalo estando frente a la pantalla, contesta tú mismo las verificaciones anti-bot y los mensajes de los GM, toma descansos y respeta a los demás jugadores.');
      var lab = document.createElement('label'); lab.style.cssText = 'display:flex;gap:8px;align-items:flex-start;margin:6px 0 12px;cursor:pointer;color:#ececec';
      var chk = document.createElement('input'); chk.type = 'checkbox'; chk.style.cssText = 'width:18px;height:18px;margin:1px 0 0;flex:none';
      var sp = document.createElement('span'); sp.textContent = 'Leí este aviso y lo acepto.';
      lab.appendChild(chk); lab.appendChild(sp); caja.appendChild(lab);
      var fila = document.createElement('div'); fila.style.cssText = 'display:flex;gap:8px;justify-content:flex-end';
      var bNo = document.createElement('button'), bSi = document.createElement('button');
      bNo.textContent = 'No acepto'; bSi.textContent = 'Aceptar y continuar';
      [bNo, bSi].forEach(function (b) { b.style.cssText = 'min-height:40px;padding:6px 14px;font:700 13px Verdana,Tahoma,sans-serif;color:#ececec;background:linear-gradient(#3e4142,#2b2d2d);border:1px solid;border-color:#767a7a #060707 #060707 #767a7a;cursor:pointer'; fila.appendChild(b); });
      bSi.disabled = true; bSi.style.opacity = '.5';
      chk.onchange = function () { bSi.disabled = !chk.checked; bSi.style.opacity = chk.checked ? '1' : '.5'; bSi.style.color = chk.checked ? '#9fe870' : '#ececec'; };
      bSi.onclick = function () {
        if (!chk.checked) { return; }
        try { localStorage.setItem(KEY_AVISO_LEGAL, String(Date.now())); } catch (e) {}
        avisoLegalModal.style.display = 'none';
        var l = avisoLegalTras; avisoLegalTras = [];
        l.forEach(function (f) { try { f(); } catch (e) {} });
      };
      bNo.onclick = function () {
        avisoLegalModal.style.display = 'none'; avisoLegalTras = [];
        try { toast('Para usar Minibia Helper tienes que aceptar el aviso.'); } catch (e) {}
      };
      caja.appendChild(fila);
      avisoLegalModal.appendChild(caja);
      ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'click', 'dblclick', 'contextmenu', 'keydown', 'keyup', 'keypress'].forEach(function (t) {
        avisoLegalModal.addEventListener(t, function (e) { e.stopPropagation(); }, false);
      });
      (document.body || document.documentElement).appendChild(trRaiz(avisoLegalModal));
    }
    avisoLegalModal.style.display = 'flex';
  }
  // iPhone / iPad (el iPad se presenta como Mac, pero con pantalla táctil)
  var ES_IOS = false;
  try { ES_IOS = /iPhone|iPad|iPod/i.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1); } catch (e) {}
  // ---------- Licencias ----------
  // Cada licencia está FIRMADA (ECDSA P-256) para UN personaje: solo funciona con ese nombre, en cualquier dispositivo.
  // La app trae solo la clave pública: nadie puede fabricar licencias ni usar la de otro personaje.
  //   Beta tester:  MBH-B-<firma>            -> permanente
  //   Mensual:      MBH-M-AAAAMMDD-<firma>   -> válida hasta esa fecha
  //   Founder:      MBH-F-<firma>            -> permanente, con todas las funciones
  var KEY_LIC = 'minibiaHelperLicencias2';
  var LIC_PUB = 'BBsSx5ot8JxwkVMIogjNmOBITgZhYNeHVHIf/rjNKEvB1F4c9Q5/dqm9m8pUVQh1gFxYigGpy0P31a+GzEe85zY=';
  try { localStorage.removeItem('minibiaHelperLicencias'); } catch (e) {}   // licencias del sistema anterior (sin firma)
  var LIC_TIPO_DE = { B: 'beta', M: 'mensual', F: 'founder', L: 'lite', G: 'gold', T: 'prueba' };
  var LIC_LETRA = { beta: 'B', mensual: 'M', founder: 'F', lite: 'L', gold: 'G', prueba: 'T' };
  var LIC_NOMBRE = { lite: 'Lite', mensual: 'Estándar', gold: 'Gold', beta: 'Beta tester', founder: 'Founder', prueba: 'Prueba Gold (1 día)' };
  var LIC_NIVEL = { lite: 1, mensual: 2, gold: 3, beta: 3, prueba: 3, founder: 4 };
  // Estándar, Gold, Prueba y Founder valen para TODOS los personajes del dispositivo; Lite y Beta tester, solo para el suyo
  var LIC_GLOBAL = { mensual: 1, gold: 1, prueba: 1, founder: 1 };
  function licConFecha(tipo) { return tipo === 'lite' || tipo === 'mensual' || tipo === 'gold' || tipo === 'prueba'; }
  function licCharNorm(n) { return String(n || '').trim().toLowerCase().replace(/\s+/g, ' '); }
  // Licencias de un vendedor autorizado (socio): MBH-<L>-<fecha>-<CODIGO>.<firma>, firmadas con la clave del socio.
  // La clave pública del socio viaja en c.json, certificada con la firma de Osbeliaal.
  var LIC_VEND_RE = /^MBH-(L|M|G|T)-(\d{8}|\d{12})-([A-Z0-9]{2,10})\.([A-Za-z0-9_-]{60,})$/i;
  function licParse(key) {
    key = String(key || '').replace(/\s+/g, '');
    var v = key.match(LIC_VEND_RE);
    if (v) {
      var tv = LIC_TIPO_DE[v[1].toUpperCase()];
      if ((tv === 'prueba') !== (v[2].length === 12)) { return null; }
      return { tipo: tv, fin: v[2], sig: v[4], vend: v[3].toUpperCase() };
    }
    var m = key.match(/^MBH-(B|M|F|L|G|T)-(?:(\d{8}|\d{12})-)?([A-Za-z0-9_-]{60,})$/i);
    if (!m) { return null; }
    var L = m[1].toUpperCase(), tipo = LIC_TIPO_DE[L];
    if (licConFecha(tipo) !== !!m[2]) { return null; }
    if (m[2] && (tipo === 'prueba') !== (m[2].length === 12)) { return null; }   // la prueba lleva fecha y hora (UTC)
    return { tipo: tipo, fin: m[2] || null, sig: m[3] };
  }
  // Saca la licencia aunque peguen el mensaje completo de WhatsApp (con texto antes y después)
  function licLimpiar(v) {
    v = String(v || '');
    var m = v.match(/MBH-[A-Za-z]-[A-Za-z0-9_.\-]{60,}/i);
    if (m && licParse(m[0])) { return m[0]; }
    return v.replace(/\s+/g, '');
  }
  function licB64(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) { s += '='; }
    var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) { u[i] = b.charCodeAt(i); } return u;
  }
  var licPubKey = null;
  function licLlaveOsb() {
    return licPubKey || (licPubKey = crypto.subtle.importKey('raw', licB64(LIC_PUB), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']));
  }
  // ----- Vendedores autorizados (socios) -----
  // c.json -> "s": { CODIGO: { k: clave pública, f: firma de Osbeliaal sobre "MBHV|CODIGO|k", n: nombre, c: contacto } }
  //           "v": { CODIGO: "AAAAMMDD" }  -> socio cortado desde esa fecha: sus licencias que vencen después de
  //                                           esa fecha + 31 días ya no valen (las que vendió antes siguen funcionando).
  var KEY_VEND = 'minibiaHelperV1';
  var LIC_VEND_MAX_DIAS = 31;
  var licVend = {};        // CODIGO -> { n, c, key: Promise<CryptoKey> }  (solo los certificados por Osbeliaal)
  var licVendCorte = {};   // CODIGO -> AAAAMMDD
  var licVendListo = Promise.resolve();
  function licVendCargar(s, v, guardar) {
    var nuevo = {}, tareas = [];
    Object.keys(s || {}).forEach(function (cod) {
      var e = s[cod], C = String(cod).toUpperCase();
      if (!e || !e.k || !e.f || !/^[A-Z0-9]{2,10}$/.test(C)) { return; }
      tareas.push(Promise.resolve(licLlaveOsb()).then(function (osb) {
        return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, osb, licB64(String(e.f)), new TextEncoder().encode('MBHV|' + C + '|' + e.k));
      }).then(function (ok) {
        if (!ok) { return; }
        nuevo[C] = { n: String(e.n || C).slice(0, 40), c: String(e.c || '').slice(0, 80), key: crypto.subtle.importKey('raw', licB64(String(e.k)), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']) };
      }, function () {}));
    });
    return Promise.all(tareas).then(function () {
      licVend = nuevo;
      licVendCorte = {};
      Object.keys(v || {}).forEach(function (c) { licVendCorte[String(c).toUpperCase()] = String(v[c]); });
      if (guardar) { try { localStorage.setItem(KEY_VEND, JSON.stringify({ s: s || {}, v: v || {} })); } catch (e) {} }
    });
  }
  try {
    if (window.crypto && crypto.subtle) {
      var vg = JSON.parse(localStorage.getItem(KEY_VEND) || 'null');
      if (vg && vg.s) { licVendListo = licVendCargar(vg.s, vg.v, false); }
    }
  } catch (e) {}
  function licVendKey(cod) {
    return licVendListo.then(function () {
      if (licVend[cod]) { return licVend[cod].key; }
      // vendedor nuevo: baja c.json otra vez y vuelve a buscar
      return licBajarRevocadas().then(function () {
        if (licVend[cod]) { return licVend[cod].key; }
        var e = new Error('vendedor desconocido'); e.vend = cod; throw e;
      });
    });
  }
  function licSumarDias(f, d) {
    var t = new Date(Date.UTC(+f.slice(0, 4), +f.slice(4, 6) - 1, +f.slice(6, 8)) + d * 86400000);
    return '' + t.getUTCFullYear() + ('0' + (t.getUTCMonth() + 1)).slice(-2) + ('0' + t.getUTCDate()).slice(-2);
  }
  // ¿La licencia es de un vendedor al que Osbeliaal le cortó la venta (y se emitió después del corte)?
  function licVendCortada(r) {
    if (!r || !r.vend) { return false; }
    var c = licVendCorte[r.vend];
    if (!c) { return false; }
    if (!/^\d{8}$/.test(c)) { return true; }
    return String(r.fin || '').slice(0, 8) > licSumarDias(c, LIC_VEND_MAX_DIAS);
  }
  function licVendNombre(cod) { return (licVend[cod] && licVend[cod].n) || cod; }
  // A quién pedirle la renovación: al vendedor que te la vendió (y si no, a Osbeliaal)
  function licContacto(r) {
    if (r && r.vend && licVend[r.vend] && !licVendCortada(r)) {
      var v = licVend[r.vend];
      return v.n + (v.c ? ' (' + v.c + ')' : '') + ' o a Osbeliaal (' + CONTACTO + ')';
    }
    return 'Osbeliaal (' + CONTACTO + ')';
  }
  function licVerificar(key, nombre) {
    var p = licParse(key);
    if (!p) { return Promise.resolve(null); }
    if (!(window.crypto && crypto.subtle)) { return Promise.reject(new Error('sin WebCrypto')); }
    var datos = p.vend ? 'MBH2|' + LIC_LETRA[p.tipo] + '|' + licCharNorm(nombre) + '|' + p.fin + '|' + p.vend
      : 'MBH1|' + LIC_LETRA[p.tipo] + '|' + licCharNorm(nombre) + (p.fin ? '|' + p.fin : '');
    var k = p.vend ? licVendKey(p.vend) : licLlaveOsb();
    return Promise.resolve(k).then(function (pub) {
      return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, licB64(p.sig), new TextEncoder().encode(datos));
    }).then(function (ok) { return ok ? p : null; });
  }
  function licHoy() { var d = new Date(); return '' + d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2); }
  function licFecha(f) {
    if (!f) { return ''; }
    f = String(f);
    if (f.length === 12) {   // fecha y hora en UTC -> hora local
      var d = new Date(Date.UTC(+f.slice(0, 4), +f.slice(4, 6) - 1, +f.slice(6, 8), +f.slice(8, 10), +f.slice(10, 12)));
      function z(n) { return ('0' + n).slice(-2); }
      return z(d.getDate()) + '/' + z(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + z(d.getHours()) + ':' + z(d.getMinutes());
    }
    return f.slice(6, 8) + '/' + f.slice(4, 6) + '/' + f.slice(0, 4);
  }
  function licAhoraUTC() { var d = new Date(); function z(n) { return ('0' + n).slice(-2); } return '' + d.getUTCFullYear() + z(d.getUTCMonth() + 1) + z(d.getUTCDate()) + z(d.getUTCHours()) + z(d.getUTCMinutes()); }
  function licVigente(r) {
    if (!r) { return false; }
    if (!licConFecha(r.tipo)) { return true; }
    if (!r.fin) { return false; }
    return String(r.fin).length === 12 ? r.fin > licAhoraUTC() : r.fin >= licHoy();
  }
  function licNombreTipo(p) { return p.tipo === 'founder' ? 'Founder (permanente, todo incluido y para todos tus personajes)' : (p.tipo === 'beta' ? 'Beta tester (permanente)' : (LIC_NOMBRE[p.tipo] || p.tipo) + (LIC_GLOBAL[p.tipo] ? ', todos tus personajes' : '') + ' (vence ' + licFecha(p.fin) + ')'); }
  function licLeer() { try { var o = JSON.parse(localStorage.getItem(KEY_LIC) || '{}'); return (o && typeof o === 'object') ? o : {}; } catch (e) { return {}; } }
  function licGuardar(o) { try { localStorage.setItem(KEY_LIC, JSON.stringify(o)); } catch (e) { registrar('licencia: no pude guardar'); } }
  // ----- Licencias canceladas -----
  // Osbeliaal publica c.json (huellas SHA-256 de las licencias canceladas) en ox-files.
  // El helper lo descarga al cargar y cada 30 min; la última lista se guarda por si no hay internet.
  var KEY_REVOC = 'minibiaHelperC2';
  var LIC_REVOC_URL = 'https://osbeliaal.github.io/ox-files/c.json';
  var licRevocadas = {};
  try { (JSON.parse(localStorage.getItem(KEY_REVOC) || '[]') || []).forEach(function (h) { licRevocadas[String(h).toLowerCase()] = 1; }); } catch (e) {}
  var licHuellas = {};   // licencia -> huella (caché)
  function licHuella(key) {
    key = String(key || '').replace(/\s+/g, '');
    if (licHuellas[key]) { return Promise.resolve(licHuellas[key]); }
    if (!(window.crypto && crypto.subtle)) { return Promise.resolve(''); }
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(key)).then(function (b) {
      var h = Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
      licHuellas[key] = h; return h;
    });
  }
  // Borra del dispositivo las licencias que estén en la lista de canceladas
  function licAplicarRevocadas() {
    var o = licLeer(), ks = Object.keys(o);
    return Promise.all(ks.map(function (n) {
      if (o[n] && o[n].vend && (licVendCortada(o[n]) || (licVendQuitados && !licVend[o[n].vend]))) { return Promise.resolve(n); }
      return licHuella(o[n] && o[n].key).then(function (h) { return (h && licRevocadas[h]) ? n : null; }, function () { return null; });
    })).then(function (quitar) {
      quitar = quitar.filter(Boolean);
      if (!quitar.length) { return; }
      var q = licLeer();
      quitar.forEach(function (n) { delete q[n]; delete licOk[n]; registrar('licencia cancelada: ' + n); });
      licGuardar(q);
      try { refrescarLicencia(); } catch (e) {}
      try { toast('Una licencia de este dispositivo fue cancelada por Osbeliaal.'); } catch (e) {}
    });
  }
  var licVendQuitados = false;   // true cuando c.json trae la lista de vendedores (los que no estén ya no valen)
  var licBajando = null;
  function licBajarRevocadas() {
    if (licBajando) { return licBajando; }
    try {
      licBajando = fetch(LIC_REVOC_URL + '?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
        if (!j) { return; }
        var lista = Array.isArray(j) ? j : (j.d || []);
        licRevocadas = {};
        lista.forEach(function (h) { licRevocadas[String(h).toLowerCase()] = 1; });
        try { localStorage.setItem(KEY_REVOC, JSON.stringify(Object.keys(licRevocadas))); } catch (e) {}
        var conVend = !Array.isArray(j) && j.s && typeof j.s === 'object';
        return (conVend && window.crypto && crypto.subtle ? (licVendListo = licVendCargar(j.s, j.v, true)) : Promise.resolve()).then(function () {
          if (conVend) { licVendQuitados = true; }
          licAplicarRevocadas();
        });
      }).catch(function () {}).then(function () { licBajando = null; });
    } catch (e) { licBajando = null; return Promise.resolve(); }
    return licBajando;
  }
  setTimeout(function () { licAplicarRevocadas(); licBajarRevocadas(); }, 3000);
  setInterval(licBajarRevocadas, 30 * 60 * 1000);

  // Licencias comprobadas en esta pestaña. La firma se verifica al cargar y también cuando otra pestaña o ventana
  // del mismo navegador guarda una licencia nueva: así una Gold activada en una ventana sirve en todas las demás.
  var licOk = {}, licOkKey = {}, licEnCurso = {}, licReintento = {}, licVerifIni = false;
  function licVerificarGuardadas() {
    var o = licLeer(), ahora = Date.now();
    Object.keys(o).forEach(function (n) {
      var r = o[n]; if (!r || !r.key) { return; }
      if (licOk[n] && licOkKey[n] === r.key) { return; }
      if (licEnCurso[n] && licEnCurso[n].key === r.key) { return; }
      if (licReintento[n] && licReintento[n].key === r.key && ahora - licReintento[n].t < 30000) { return; }
      var prom = Promise.all([licVerificar(r.key, r.nombre || n), licHuella(r.key)]).then(function (res) {
        var p = res[0], q = licLeer();
        if (p && (licRevocadas[res[1]] || licVendCortada(p))) { p = null; }
        if (!q[n] || q[n].key !== r.key) { return; }   // otra pestaña la cambió mientras tanto
        if (p) { licOk[n] = true; licOkKey[n] = r.key; delete licReintento[n]; }
        else { delete q[n]; licGuardar(q); delete licOk[n]; delete licOkKey[n]; }
      }, function () { licReintento[n] = { key: r.key, t: Date.now() }; }).then(function () {
        if (licEnCurso[n] && licEnCurso[n].prom === prom) { delete licEnCurso[n]; }
        try { refrescarLicencia(); } catch (e) {}
      });
      licEnCurso[n] = { key: r.key, prom: prom };
    });
    return Promise.all(Object.keys(licEnCurso).map(function (n) { return licEnCurso[n].prom; })).then(function () { licVerifIni = true; });
  }
  function licComprobando() { return !licVerifIni || Object.keys(licEnCurso).length > 0; }
  licVerificarGuardadas();
  window.addEventListener('storage', function (e) {
    try {
      if (e.key === KEY_VEND && e.newValue && window.crypto && crypto.subtle) {
        var vg = JSON.parse(e.newValue); if (vg && vg.s) { licVendListo = licVendCargar(vg.s, vg.v, false); }
      }
      if (e.key === KEY_LIC || e.key === KEY_VEND || e.key === null) { licVerificarGuardadas(); }
    } catch (err) {}
  });
  // Si falta la licencia, primero revisa las que otra pestaña haya guardado; solo si de verdad no hay, la pide.
  function licExigir(reintentar, trasActivar) {
    if (licenciaOk()) { return false; }
    licVerificarGuardadas().then(function () {
      if (licenciaOk()) { if (reintentar) { try { reintentar(); } catch (e) {} } }
      else { pedirLicencia(trasActivar); }
    });
    return true;
  }
  // Licencia Founder guardada en este dispositivo (ya comprobada): vale para TODOS los personajes que se usen aquí
  function licFounderGlobal() {
    var o = licLeer();
    for (var k in o) { if (o[k] && o[k].tipo === 'founder' && licOk[k] && licOkKey[k] === o[k].key) { return o[k]; } }
    return null;
  }
  // La mejor licencia válida para ese personaje: las globales (Estándar, Gold, Prueba, Founder) valen para
  // cualquier personaje del dispositivo; Lite y Beta tester solo para el suyo. Si vence una prueba, vuelve la Lite.
  function licAplica(r, n) { return !!r && (LIC_GLOBAL[r.tipo] || !n || licCharNorm(r.nombre) === n); }
  function licDe(nombre) {
    var o = licLeer(), n = licCharNorm(nombre), mejor = null;
    Object.keys(o).forEach(function (k) {
      var r = o[k];
      if (!r || !licOk[k] || licOkKey[k] !== r.key || !licVigente(r) || !licAplica(r, n)) { return; }
      var nv = LIC_NIVEL[r.tipo] || 0, nm = mejor ? (LIC_NIVEL[mejor.tipo] || 0) : -1;
      if (!mejor || nv > nm || (nv === nm && mejor.tipo === 'prueba' && r.tipo !== 'prueba')) { mejor = r; }
    });
    return mejor;
  }
  // Licencia guardada pero vencida (para avisar de la renovación), solo si no queda ninguna válida
  function licVencida(nombre) {
    if (licDe(nombre)) { return null; }
    var o = licLeer(), n = licCharNorm(nombre), r = null;
    Object.keys(o).forEach(function (k) { var x = o[k]; if (x && licConFecha(x.tipo) && !licVigente(x) && licAplica(x, n)) { r = x; } });
    return r;
  }
  function licenciaOk() { return !!licDe(charActual); }
  var licModal = null, licTrasActivar = null, licPruebaQuitada = false, licModalAuto = false, licOcultoAuto = false;
  function pedirLicencia(despues) {
    licModalAuto = false;
    if (!avisoLegalOk()) { pedirAvisoLegal(function () { pedirLicencia(despues); }); return; }
    licTrasActivar = despues || null;
    if (!licModal) {
      licModal = document.createElement('div');
      licModal.id = 'mbh-lic';
      licModal.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);font:13px Verdana,Tahoma,sans-serif;color:#dcdcdc';
      var caja = document.createElement('div');
      caja.style.cssText = 'width:min(380px,calc(100vw - 24px));max-height:calc(100vh - 24px);overflow:auto;box-sizing:border-box;background:#222424;border:1px solid #000;box-shadow:inset 0 0 0 1px #555959,0 6px 24px rgba(0,0,0,.7);padding:14px';
      caja.innerHTML =
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><img alt="" style="width:34px;height:34px;image-rendering:pixelated">' +
        '<div><div style="font-weight:700;font-size:15px;color:#ececec">Minibia Helper</div><div style="font-size:11px;color:#f5a400">Activar licencia</div></div></div>' +
        '<div style="font-size:12px;color:#aaa;margin-bottom:10px">Escribe el nombre de tu personaje y tu licencia. Cada licencia es para un solo personaje.</div>' +

        '<label style="display:block;margin:6px 0 3px">Personaje</label><input data-k="char" autocomplete="off" autocapitalize="words" spellcheck="false">' +
        '<label style="display:block;margin:8px 0 3px">Licencia</label><input data-k="lic" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="MBH-M-…">' +
        '<div data-k="tdesc" style="font-size:11px;color:#9fe870;min-height:14px;margin-top:4px"></div>' +
        '<div data-k="msg" style="min-height:16px;font-size:12px;margin:8px 0 4px"></div>' +
        '<div data-k="contacto" style="font-size:11px;color:#9a9d9d;margin:0 0 8px">¿Necesitas una licencia o renovarla? Escríbele a Osbeliaal: correo <b style="color:#ececec">Osbeliaal@gmail.com</b> · Telegram <b style="color:#ececec">@osbeliaal</b></div>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end"><button data-k="no">Cancelar</button><button data-k="si">Activar</button></div>';
      caja.querySelector('img').src = ICONO_URI;
      [].forEach.call(caja.querySelectorAll('input'), function (i) {
        i.style.cssText = 'width:100%;box-sizing:border-box;height:38px;font-size:16px;padding:2px 8px;background:#0b0c0c;color:#ececec;border:1px solid;border-color:#000 #5a5e5e #5a5e5e #000';
        ['keydown', 'keyup', 'keypress'].forEach(function (t) { i.addEventListener(t, function (e) { e.stopPropagation(); if (t === 'keydown' && e.key === 'Enter') { activar(); } }); });
      });
      [].forEach.call(caja.querySelectorAll('button'), function (b) {
        b.style.cssText = 'min-height:40px;padding:6px 16px;font:700 13px Verdana,Tahoma,sans-serif;color:#ececec;background:linear-gradient(#3e4142,#2b2d2d);border:1px solid;border-color:#767a7a #060707 #060707 #767a7a;cursor:pointer';
      });
      caja.querySelector('[data-k=si]').style.color = '#9fe870';
      licModal.appendChild(caja);
      ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'click', 'dblclick', 'contextmenu'].forEach(function (t) {
        licModal.addEventListener(t, function (e) { e.stopPropagation(); }, false);
      });
      var inChar = caja.querySelector('[data-k=char]'), inLic = caja.querySelector('[data-k=lic]'), msg = caja.querySelector('[data-k=msg]');
      var ocupado = false;
      function aviso(t, ok) { msg.textContent = t; msg.style.color = ok ? '#8f8' : '#ff9b8a'; }
      var tdesc = caja.querySelector('[data-k=tdesc]');
      var DESC_TIPO = {
        lite: 'Licencia Lite (1 mes, un solo personaje): runas, training, casillas, anti-GM, alertas y perfiles.',
        mensual: 'Licencia Estándar (1 mes, todos tus personajes): todo lo de Lite + combate (con autohaste), Combo runa y reinicio automático.',
        gold: 'Licencia Gold (1 mes, todos tus personajes): todo lo de Estándar + Cave hunt.',
        beta: 'Licencia Beta tester: permanente, sin renovaciones.',
        founder: 'Licencia Founder: permanente, con todas las funciones y para todos tus personajes (escribe el personaje para el que se hizo).',
        prueba: 'Prueba de 1 día: todo lo de Gold en todos tus personajes. Al terminar vuelves a tu licencia anterior.'
      };
      // el tipo se reconoce solo por la licencia que pegas
      inLic.addEventListener('input', function () { var pp = licParse(licLimpiar(inLic.value)); tdesc.textContent = pp ? DESC_TIPO[pp.tipo] || '' : ''; });
      function activar() {
        if (ocupado) { return; }
        var nom = inChar.value.trim().replace(/\s+/g, ' '), lic = licLimpiar(inLic.value);
        if (!nom) { aviso('Escribe el nombre de tu personaje'); inChar.focus(); return; }
        var ppPrev = licParse(lic);
        if (charActual && licCharNorm(nom) !== licCharNorm(charActual) && !(ppPrev && LIC_GLOBAL[ppPrev.tipo])) { aviso('Estás conectado con ' + charActual + ': escribe ese nombre'); return; }
        if (lic.length < 20) { aviso('Escribe tu licencia completa'); inLic.focus(); return; }
        var pp = licParse(lic);
        if (!pp) { aviso(/^MBH-[A-Z]-\d+-[A-Z0-9]+\./i.test(lic) ? 'Licencia no válida. Revisa que esté completa (sin espacios ni letras de más).' : 'Licencia no válida. Revisa que esté bien escrita.'); return; }
        if (!(window.crypto && crypto.subtle)) { aviso('Este navegador no puede comprobar licencias'); return; }
        ocupado = true; aviso('Comprobando…', true);
        Promise.all([licVerificar(lic, nom), licHuella(lic)]).then(function (res) {
          var p = res[0];
          ocupado = false;
          if (p && (licRevocadas[res[1]] || licVendCortada(p))) { aviso('Esta licencia fue cancelada. Pide una nueva a Osbeliaal.'); return; }
          if (!p) { aviso('Esta licencia no es de ' + nom + '. Cada licencia funciona solo con su personaje.'); return; }
          if (!licVigente(p)) { aviso('Esta licencia ' + (LIC_NOMBRE[p.tipo] || '') + ' venció el ' + licFecha(p.fin) + '. Para renovarla escríbele a ' + licContacto(p) + '.'); return; }
          var o = licLeer(), n = licCharNorm(nom) + (p.tipo === 'prueba' ? '|prueba' : '');   // la prueba no borra tu Lite
          // si compró (o renovó) una licencia, la prueba de 1 día se quita para que se vea la que pagó
          if (p.tipo !== 'prueba') { Object.keys(o).forEach(function (k) { if (o[k] && o[k].tipo === 'prueba') { delete o[k]; delete licOk[k]; delete licOkKey[k]; licPruebaQuitada = true; } }); }
          o[n] = { nombre: nom, key: lic, tipo: p.tipo, fin: p.fin, fecha: licHoy() };
          if (p.vend) { o[n].vend = p.vend; }
          licGuardar(o); licOk[n] = true; licOkKey[n] = lic;
          aviso('¡Listo! Licencia ' + licNombreTipo(p) + ' activada para ' + nom + '.' + (p.vend ? ' Vendida por ' + licVendNombre(p.vend) + '.' : ''), true);
          ultimaAccion = 'licencia activada: ' + nom;
          try { refrescarLicencia(); } catch (e) {}
          setTimeout(function () {
            licModal.style.display = 'none';
            var f = licTrasActivar; licTrasActivar = null;
            if (novModal) { novModal.remove(); novModal = null; }   // rehacer con la licencia nueva
            mostrarNovedades(function () { if (f && licenciaOk()) { try { f(); } catch (e) {} } });
          }, 900);
        }, function (e) { ocupado = false; aviso(e && e.vend ? 'No pude comprobar al vendedor ' + e.vend + '. Revisa tu internet y vuelve a tocar «Activar».' : 'No pude comprobar la licencia: ' + e.message); });
      }
      caja.querySelector('[data-k=si]').onclick = activar;
      caja.querySelector('[data-k=no]').onclick = function () { licModal.style.display = 'none'; licTrasActivar = null; };
      licModal.__in = { c: inChar, l: inLic, m: msg };
      (document.body || document.documentElement).appendChild(trRaiz(licModal));
    }
    licModal.__in.c.value = charActual || licModal.__in.c.value || '';
    licModal.__in.l.value = '';
    try { licModal.querySelector('[data-k=tdesc]').textContent = ''; } catch (e) {}
    var venc = licVencida(charActual || licModal.__in.c.value);
    licModal.__in.m.textContent = venc ? 'Tu licencia ' + (LIC_NOMBRE[venc.tipo] || '') + ' venció el ' + licFecha(venc.fin) + '. Para renovarla escríbele a ' + licContacto(venc) + ' y pega aquí la nueva.' : (charActual ? 'Personaje conectado: ' + charActual : '');
    licModal.__in.m.style.color = venc ? '#ffd166' : '#aaa';
    licModal.style.display = 'flex';
    setTimeout(function () { try { (licModal.__in.c.value ? licModal.__in.l : licModal.__in.c).focus(); } catch (e) {} }, 50);
  }

  // ---------- Novedades y guía (se muestra al activar la licencia y tras cada actualización) ----------
  var KEY_VISTO = 'minibiaHelperNovedadesVistas';
  // Fecha de cada actualización (año-mes-día)
  var NOV_FECHAS = {"5.42": "2026-10-16", "5.41": "2026-10-16", "5.39": "2026-10-14", "5.38": "2026-10-14", "5.37": "2026-10-12", "5.36": "2026-10-12", "5.35": "2026-10-11", "5.34": "2026-10-11", "5.33": "2026-10-10", "5.31": "2026-10-10", "5.10": "2026-10-08", "5.8": "2026-10-08", "5.7": "2026-10-08", "5.6": "2026-10-08", "5.5": "2026-10-08", "5.4": "2026-10-08", "5.3": "2026-10-08", "5.2": "2026-10-08", "5.1": "2026-10-08", "5.0": "2026-10-08"};
  function fechaCorta(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m) { return ''; }
    var es = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'], en = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var mes = Number(m[2]) - 1, dia = Number(m[3]);
    return IDIOMA === 'en' ? en[mes] + ' ' + dia + ', ' + m[1] : dia + ' ' + es[mes] + ' ' + m[1];
  }
  var NOVEDADES = [
    ['5.42', "Alertas más ordenadas y tonos nuevos", [
      "Todo lo de alertas quedó junto en la pestaña Alertas, también el sonido: ahí eliges el tono (suave, campana, digital, sirena o grave), el volumen, subes tu propio audio y lo pruebas con «Probar sonido».",
      "La pestaña Sistema quedó solo con lo del sistema: perfil, estado, idioma, dispositivo y los botones de prueba.",
      "Arreglado: si abrías el helper en otra ventana o pestaña del mismo navegador, a veces te volvía a pedir la licencia. Ahora tu licencia Estándar, Gold o Founder se reconoce en todas tus ventanas y pestañas, aunque la actives en otra."
    ]],
    ['5.41', "Depósito en la casa", [
      "Nuevo en la sección Casa (pestaña Runas): cuando tu cap baja, tu personaje camina a un baúl de tu casa, guarda las runas y la munición de tus mochilas abiertas y regresa a seguir runeando. Párate junto al baúl y toca «Marcar depósito»; también puedes poner el ID del baúl.",
      "Con el depósito activo, la cap baja ya no detiene el runeo: espera a que guarde y sigue solo. Las blank runes no se guardan, y puedes agregar otros objetos por nombre."
    ]],
    ['5.40', "Autohechizos, refugio en casa y esquivar ondas", [
      "Nuevo: auto utamo vita y auto utana vid (pestaña Combate, desde la licencia Estándar). Cuando se te acaba el efecto lo vuelve a lanzar si tienes el maná. Utamo vita: elige si lo quieres siempre puesto o solo cuando tu vida baje del % que pongas.",
      "Nuevo: refugio en la casa al runear (pestaña Runas). Marca tu lugar de runeo y una casilla dentro de tu casa: si aparece un PK o alguien te ataca, tu personaje se mete a la casa (abre la puerta si está cerrada) y regresa cuando pasa 1 minuto sin verlo. Mete a party a tus farmers para que no los confunda; si uno de ellos ve al PK, todos se meten.",
      "Cave hunt: esquiva las ondas y rayos de dragon, dragon lord y demon. Si te tienen en línea recta, da un paso en diagonal sin despegarse del objetivo. Puedes editar la lista de monstruos.",
      "Tu código de referido aparece en «Acerca de»: compártelo y si alguien nuevo compra con tu código, te regalamos 3 días extra."
    ]],
    ['5.39', "Combo runa más listo y licencias", [
      "Combo runa: ahora tira la misma runa que el líder (si el líder tira HMM, tú HMM; si tira GFB o explosion, tú la de fuego que tengas). Si el objetivo tiene poca vida (30 % o menos), cambia a SD para rematar. Puedes apagar cada opción y elegir el %.",
      "Arreglado: si tenías una prueba de 1 día y activabas la licencia que compraste (o una renovación), seguía mostrando la prueba. Ahora la prueba se quita y queda la que compraste.",
      "Mientras usas la prueba, arriba de la pestaña Runas sale un aviso con el botón «Activar licencia nueva» para pegar la que compres.",
      "Nuevo botón «Mis licencias» en «Acerca de»: ves las licencias guardadas en tu dispositivo y puedes quitar la que quieras.",
      "Captcha anti-bot del juego: el aviso (y el mensaje a tu celular) ahora te dice cuántos segundos te quedan para resolverlo, y te vuelve a avisar más fuerte cuando faltan 15 segundos.",
      "Las casillas dibujadas (resaltadas, hoyos, rope, escaleras, spawns y timers) empiezan ocultas al abrir el juego para que cargue más rápido. Muéstralas con Ctrl+Shift+X o con el botón «Mostrar / ocultar casillas» (pestaña Casillas o Cave hunt)."
    ]],
    ['5.38', "Munición automática, aviso de monstruo y descansos", [
      "Cave hunt (paladin): sube la munición sola al slot de flechas. Busca en tus mochilas abiertas flechas si traes arco o bolts si traes ballesta, de cualquier tipo (arrow, poison arrow, power bolt...). Primero junta las del mismo tipo y, cuando se acaban, pone otro tipo. Te avisa cuando ya no queda nada.",
      "Training: cuando se acaban las small stones de tu mano, toma más de la mochila y las pone en la misma mano.",
      "Puedes elegir con cuántas rellenar (20 de munición y 5 piedras por defecto) o apagar cada opción.",
      "Nuevo aviso: si aparece un monstruo que no te ataca y te pregunta \"are you there?\", el helper pausa el Cave hunt, el runeo y el training, suena la alarma y te avisa (también al celular). Contéstale tú y luego toca «Reanudar helper».",
      "Cave hunt: recordatorio para tomar un descanso cada 60 minutos de caza (puedes cambiar el tiempo o hacer que el Cave hunt se detenga al recordártelo).",
      "Al abrir el helper por primera vez sale un aviso de uso responsable que hay que aceptar."
    ]],
    ['5.37', "Activar licencia más fácil", [
      "Al activar tu licencia ya puedes pegar el mensaje completo que te mandó tu vendedor: el helper encuentra la licencia sola."
    ]],
    ['5.36', "Vendedores autorizados", [
      "Ahora también puedes comprar tu licencia con vendedores autorizados por Osbeliaal. Funcionan igual que las de siempre: pega tu licencia y el helper la reconoce sola.",
      "Tu licencia muestra quién te la vendió, y cuando toca renovarla el helper te dice a quién escribirle.",
      "Las licencias siguen firmadas: nadie puede fabricarlas ni usar la de otro personaje, las venda quien las venda.",
      "Nuevo botón «Activar otra licencia» en «Acerca de»: para renovar, subir de Lite a Estándar o Gold, o activar una prueba de 1 día cuando quieras."
    ]],
    ['5.35', "Macros: crea tus propias reglas", [
      "Nuevo: Macros (pestaña propia «Macros», exclusivo de la licencia Gold). Escribe tus propias reglas en español sencillo, una por línea: «si (condición) entonces (acción)». Por ejemplo: si monstruos >= 3 y jugadores == 0 entonces runa \"great fireball\" en objetivo cada 2s.",
      "Con ayuda de una IA: escribe en palabras normales qué quieres que haga tu personaje, toca «Copiar instrucciones para la IA», pégalas en ChatGPT (o la IA que uses) y pega aquí lo que te conteste. Si algo sale mal, el helper te da un mensaje para que la IA lo corrija.",
      "Condiciones: tu vida y maná (en % o en puntos), cap, monstruos en pantalla o pegados a ti, jugadores y jugadores con calavera, tu objetivo y su vida, protection zone, cuántos de un monstruo ves y cuántos objetos tienes.",
      "Acciones: decir un hechizo, tirar una runa a tu objetivo o a ti, usar un objeto, pulsar una tecla del hotbar, atacar al más cercano, soltar el objetivo, avisarte (también al celular), pausar la caza, el runeo o el training mientras se cumpla, y «parar» para no revisar las reglas de abajo.",
      "El helper revisa lo que escribes al momento y te dice en qué línea hay un error y por qué. Trae ejemplos listos y una ayuda con todo lo que puedes usar. También funciona en inglés (if / then / every).",
      "Seguro: las reglas solo leen el juego y hacen acciones del juego; no pueden tocar tus archivos ni tus licencias.",
      "Cave hunt: los monstruos a atacar ahora se guardan junto con la ruta con nombre (y viajan con ella cuando copias o pegas una ruta). Al cargar la ruta ya no tienes que volver a escribirlos.",
      "Nuevo botón «📡 Agregar monstruos de alrededor»: escribe solo los monstruos que ves en pantalla, sin repetir y sin jugadores, NPCs ni invocaciones.",
      "Kiting rehecho (paladin, sorcerer y druid): ahora mantiene a los monstruos a la distancia que elijas (3 sqm por defecto) y se queda quieto disparando; solo da un paso cuando alguno se acerca. Camina recto como un jugador, no choca con paredes, no se mete a esquinas y busca hacia dónde huir aunque lo sigan varios monstruos.",
    ]],
    ['5.34', "Defensa contra PK y avisos al celular", [
      "Cave hunt · Defensa contra jugadores (PK): nueva casilla «Defenderme si un jugador me ataca». Si alguien te ataca a ti, el helper cuenta tus runas de ataque y tus curaciones, revisa tu vida y cuántos PKs son, y decide solo: pelear con runas o escapar por la ruta. Nunca ataca a quien no te atacó, ni a tu party.",
      "Al pelear quita el PVP Lock solo durante la pelea y lo vuelve a poner al terminar. Si tu vida baja durante la pelea, cambia a escapar. Si el PK ya casi muere (20 % o menos), lo remata.",
      "Después de escapar vuelve a cazar solo cuando pasa un rato sin ataques (60 s por defecto) y tu vida se recuperó.",
      "Te avisa de todo: cuando te defiendes, cuando escapas, cuando muere el PK y cuando vuelves a cazar.",
      "Avisos al celular (pestaña Alertas): recibe las alertas en tu celular aunque juegues en la PC, por Telegram (recomendado), WhatsApp (CallMeBot) o la app ntfy. Viene apagado; trae pasos para activarlo y un botón de prueba. Solo se envía el texto de la alerta al servicio que elijas.",
    ]],
    ['5.33', "Cave hunt: escaleras, rope y shovel", [
      "Arreglado: el Cave hunt a veces se ponía a escarbar con la shovel en tierra normal. Ahora solo usa la shovel en hoyos cerrados de verdad (stone pile, loose stone pile...).",
      "Ida y vuelta arreglado: al regresar por la ruta, el Cave hunt ya sabe subir con la rope por donde bajó por un hoyo, bajar por el hoyo por donde subió con la rope (abriéndolo con la shovel si está cerrado) y bajar o subir por las escaleras. Antes se quedaba atorado empujando con las flechas.",
      "Al regresar ya no repite la rope o la shovel que grabaste para la ida (te subía o te abría un hoyo en el lugar equivocado).",
      "Escaleras de distintos tipos: las «ladder» y «trapdoor» que se pisan ya no se confunden con las de clic derecho. Las que se pisan, las camina; las de clic derecho (ladder, rope-ladder, sewer grate), las usa.",
      "Si un hoyo se vuelve a cerrar antes de pisarlo, lo abre otra vez con la shovel en lugar de quedarse atorado.",
      "Después de cambiar de piso sigue con el punto que le toca y no se salta partes de la ruta.",
    ]],
    ['5.31', "Nuevas licencias, Combo runa y Training", [
      "Botones separados en la barra de abajo: «Iniciar runeo», «Iniciar cavehunt» e «Iniciar training», para prender o apagar cada función por su lado sin que se estorben.",
      "Nuevas licencias: Lite (runas, training, casillas, anti-GM, alertas y perfiles), Estándar (todo lo de Lite + combate con autohaste, Combo runa y reinicio automático) y Gold (todo lo de Estándar + Cave hunt). Duran 1 mes; al vencer, el helper te pide renovarla.",
      "Estándar y Gold ahora sirven para todos tus personajes: las activas una vez y valen para cualquier personaje del dispositivo. Lite sigue siendo para un solo personaje.",
      "Prueba de 1 día: pídele a Osbeliaal una prueba que desbloquea todo lo de Gold. Cuando termina, se bloquea sola y vuelves a tu licencia Lite (no se borra).",
      "Con Lite verás un aviso para mejorar tu licencia o pedir la prueba de 1 día.",
      "Para comprar o renovar tu licencia escríbele a Osbeliaal: correo Osbeliaal@gmail.com o Telegram @osbeliaal (también está en Acerca de).",
      "Al activar ya no tienes que elegir el tipo de licencia: el helper lo reconoce solo con la licencia que pegas.",
      "Página de Minibia Helper renovada: toca cada licencia (Lite, Estándar y Gold) para ver todo lo que incluye y cuál te conviene.",
      "Training mejorado: ahora ataca SOLO a personajes de tu party cuyo nombre escribas (puedes poner varios, separados por coma) o a monstruos de la lista, como Monk. Mantiene su posición (si lo empujan, regresa), deja de atacar al objetivo cuando baja a 15 % de vida (configurable) y cambia a otro de la lista o espera a que se cure. Si tu propia vida baja demasiado, se pausa y te avisa.",
      "Autohaste (pestaña Combate, desde la licencia Estándar): cuando se te acaba el haste vuelve a lanzar utani hur o utani gran hur (tú eliges), solo si tienes el maná suficiente. El Cave hunt tiene su propia casilla para usarlo mientras cazas.",
      "Cave hunt: atajo Ctrl+Shift+X (tecla configurable) o botón para ocultar y volver a mostrar todas las casillas dibujadas. En la pantalla siempre aparece un aviso con la combinación de teclas.",
      "Combo runa más seguro: solo sigue los tiros que salen exactamente de la casilla del líder, así nunca confunde el tiro de otro jugador que esté a su lado.",
      "Combo runa (antes Magebomb; desde la licencia Estándar): cuando el líder de tu party tira una runa, cada personaje tira la suya al mismo objetivo (o a la misma casilla si es de área). Ya no hace falta configurar teclas ni señales.",
      "Retrasos humanos en el Combo runa: cada personaje reacciona y tira sus runas a destiempo, en cadena y nunca igual. Tú eliges los tiempos y el panel trae los recomendados.",
      "PVP Lock: si el combo va contra un jugador, se quita solo mientras dura y se vuelve a poner al terminar, incluso si la página se recarga. Si lo prefieres, desactiva esa opción y solo te avisa.",
      "Cave hunt mejorado (licencias Gold y Beta tester): rutas con nombre, rodea obstáculos, usa escaleras, rope y shovel en la casilla exacta, come de los cuerpos si no traes comida, cambia monedas, se cura y toma pociones durante la caza, se aleja de los monstruos con maná baja, espera en los spawns y no ataca monstruos detrás de paredes."
    ]],
    ['5.10', 'Más fluido', [
      'Arreglado el lag de unos segundos al activar las casillas resaltadas: la cámara ahora se mide con mucho menos esfuerzo y solo mientras caminas.'
    ]],
    ['5.8', 'Licencias por personaje', [
      'Cada licencia funciona solo con su personaje, en cualquier dispositivo: si alguien la comparte, no le sirve a otro personaje.',
      'Al activar eliges "Licencia mensual" o "Soy beta tester". La de beta tester es permanente, sin renovaciones ni cobro mensual.',
      'La licencia mensual muestra su fecha de vencimiento; al vencer, el helper se detiene y pide la renovación.',
      'Una sola versión para Android, iPhone y PC (navegador).',
      'En iPhone y PC el helper se actualiza solo. En Android te avisa cuando hay versión nueva y la descargas con un toque.'
    ]],
    ['5.7', 'Idioma: español e inglés', [
      'Al abrir Minibia por primera vez eliges el idioma del helper: español o inglés.',
      'En inglés cambia todo: panel, botones, estados, alertas, notificaciones, licencia y esta guía.',
      'Puedes cambiarlo cuando quieras en Sistema → Idioma.'
    ]],
    ['5.6', 'iPhone y navegador', [
      'Minibia Helper ya funciona en iPhone con Safari (extensión gratuita "Userscripts").',
      'En iPhone y en el navegador la pantalla se mantiene encendida mientras el helper trabaja.',
      'Si sales del juego y el helper estaba trabajando, al volver te avisa cuánto tiempo estuvo en pausa.'
    ]],
    ['5.5', 'Guía y novedades', [
      'Esta ventana: todas las funciones y lo último de cada versión. Se abre al activar tu licencia y cada vez que se actualiza la app. Puedes volver a verla en Acerca de → "Novedades y guía".'
    ]],
    ['5.4', 'Licencias', [
      'Al tocar el icono por primera vez se pide el nombre del personaje y la licencia. Se guarda en el teléfono: ese personaje ya no la vuelve a pedir.',
      'Licencia Beta tester: permanente, sin renovaciones ni cobro mensual.',
      'Si entras con otro personaje sin licencia, se pide de nuevo y el helper no corre hasta activarla.',
      'Tu licencia aparece en Acerca de y en el estado (pestaña Sistema).'
    ]],
    ['5.3', 'Segundo plano y notificaciones (app de Android)', [
      'El helper sigue trabajando aunque salgas al inicio, abras otra app o apagues la pantalla. Mientras trabaja verás una notificación fija ("runeando · 12 runas").',
      'Todas las alertas (GM, botcheck, vida baja, muerte, desconexión…) llegan como notificación de Android con sonido y vibración; al tocarla vuelves al juego.',
      'Botón "Sin límite de batería" en Sistema: evita que Android corte la app en AFK largo.',
      'El estado muestra si el segundo plano está activo, si la batería tiene límite y si los avisos están permitidos.'
    ]],
    ['5.2', 'Hotbar del celular', [
      'En los campos de "Tecla" escribe el número de casilla del hotbar (1–8) o F1–F12: el helper la usa solo, sin tocar la pantalla (comida, pociones, runas, rope, shovel…).',
      'Si usas la casilla "Atacar al más cercano", el helper no la vuelve a pulsar mientras ya tengas objetivo (no lo suelta).',
      'Panel compacto abajo al centro, entre el joystick y el hotbar; abierto ya no tapa la vida y el maná.'
    ]],
    ['5.1', 'Icono y gestos', [
      'Tocar el icono solo abre o cierra el helper (ya no abre el menú del juego). Arrástralo para moverlo.',
      'Desliza con 2 dedos hacia un lado, en cualquier parte, para ocultar o mostrar el icono.',
      'Los toques sobre el panel ya no llegan al juego.'
    ]],
    ['5.0', 'App para Android', [
      'Minibia Helper como app: se instala y abre el juego con el helper incluido, en pantalla completa y sin que se apague la pantalla.',
      'El botón "atrás" no cierra el juego: manda la app a segundo plano.'
    ]]
  ];
  var FUNCIONES = [
    ['Runas y comida (pestaña Runas)', 'Lanza tu hechizo de runa cuando hay maná suficiente, come solo si el maná deja de subir, se detiene si la cap es baja, no come en protection zone y avisa si la vida baja durante las runas (puede activar el autoheal).'],
    ['Training', 'Ataca a un objetivo (jugador o monstruo) para subir skills, con postura y modo de persecución configurables.'],
    ['Anti-idle', 'Cada pocos minutos gira a tu personaje sin caminar (Shift o Ctrl + flecha) para que el juego no te saque por inactividad.'],
    ['Combate', 'Autoheal (hechizos según tu % de vida, el primero que cumpla), Autolife y Automana (pociones desde el hotbar).'],
    ['GM y anti-bot', 'Detecta al GM y las ventanas anti-bot: pausa todo, suena la alarma y te llega notificación. Puede contestar solo a "you there?" / "hi", cerrar sesión si sigues inactivo y responder el botcheck de forma segura.'],
    ['Alertas', 'Vida baja, cap baja, muerte, desconexión, GM y botcheck: sonido en la app y notificación de Android.'],
    ['Reinicio tras desconexión', 'Si se cae la conexión, vuelve a intentar y reanuda las runas o la caza.'],
    ['Mapa', 'Casillas resaltadas (por ejemplo, zonas para levitate), timers de hechizos y cuenta atrás sobre cada magic wall y wild growth.'],
    ['Perfil por personaje', 'Cada personaje guarda su propia configuración.'],
    NATIVO_INI() ? ['Segundo plano', 'Con el helper en marcha puedes minimizar la app o apagar la pantalla: sigue runeando con el antibot activo.']
      : ['Pantalla encendida', (ES_IOS ? 'En iPhone' : 'En el navegador') + ' el helper trabaja mientras el juego esté abierto: la pantalla no se apaga sola mientras corre. ' + (ES_IOS ? 'El iPhone no permite que siga trabajando en segundo plano (eso solo existe en la app de Android).' : '')],
    null
  ];
  var FUNC_BETA = ['En beta (bloqueadas por ahora)', 'Cave hunt (ruta grabada, combate, kiting y supervivencia) y Combo runa (seguir las runas del líder).'];
  var FUNC_BETA_ON = ['Exclusivo Beta tester', 'Cave hunt (ruta grabada, combate, kiting y supervivencia) y Combo runa (seguir las runas del líder) están activados para ti.'];
  var FUNC_GOLD = ['Tu licencia Gold (todos tus personajes)', 'Todo lo de la licencia Estándar + Cave hunt (ruta grabada, combate, kiting y supervivencia).'];
  var FUNC_ESTANDAR = ['Tu licencia Estándar (todos tus personajes)', 'Todo lo de Lite + combate (autoheal, autolife, automana y autohaste), Combo runa (seguir las runas del líder) y reinicio automático. El Cave hunt viene con la licencia Gold.'];
  var FUNC_LITE = ['Tu licencia Lite (un solo personaje)', 'Runas y comida, training y anti-idle, casillas resaltadas, anti-GM y botcheck, alertas y perfil por personaje. ¿Quieres más? Escríbele a Osbeliaal para mejorar a Estándar o Gold (sirven para todos tus personajes) o pide una prueba de 1 día con todo lo de Gold; al terminar vuelves a tu Lite.'];
  var FUNC_FOUNDER = ['Exclusivo Founder', 'Tienes todo: Colmena (tu party se defiende sola con runas de PKs y monstruos), Cave hunt (ruta grabada, combate, kiting y supervivencia) y Combo runa (seguir las runas del líder).'];
  FUNCIONES[FUNCIONES.length - 1] = FUNC_BETA;
  var CONSEJOS = (NATIVO_INI() ? [
    'Para AFK: en Sistema toca "Permitir avisos" y "Sin límite de batería", y deja el teléfono cargando.',
    'La notificación fija "Minibia Helper" significa que está trabajando. Si cierras la app desde Recientes (deslizándola), se detiene.'
  ] : ES_IOS ? [
    'Para AFK en iPhone: deja Safari abierto en el juego, el iPhone cargando y en Ajustes → Pantalla y brillo → Bloqueo automático elige "Nunca".',
    'No cambies de app ni bloquees el iPhone mientras corre: iOS congela Safari y el helper se pausa.',
    'Las alertas suenan y salen en pantalla (en iPhone no hay notificaciones del sistema).'
  ] : [
    'Deja la pestaña del juego abierta: si el navegador o el teléfono se suspenden, el helper se pausa.'
  ]).concat([
    'En los campos de tecla usa el número de la casilla del hotbar (1–8).',
    'Toca el icono para abrir o cerrar; arrástralo para moverlo; 2 dedos hacia un lado lo ocultan o lo muestran.',
    'Minibia Helper es de Osbeliaal: si lo compartes o hablas de él, menciónalo siempre.'
  ]);
  var novModal = null;
  function mostrarNovedades(despues) {
    try { localStorage.setItem(KEY_VISTO, NOVEDADES[0][0]); } catch (e) {}
    if (!novModal) {
      novModal = document.createElement('div');
      novModal.id = 'mbh-nov';
      novModal.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6);font:13px/1.45 Verdana,Tahoma,sans-serif;color:#dcdcdc';
      var caja = document.createElement('div');
      caja.style.cssText = 'width:min(560px,calc(100vw - 20px));height:min(560px,calc(100vh - 20px));display:flex;flex-direction:column;box-sizing:border-box;background:#222424;border:1px solid #000;box-shadow:inset 0 0 0 1px #555959,0 6px 24px rgba(0,0,0,.7)';
      var cab = document.createElement('div');
      cab.style.cssText = 'flex:none;display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #000;box-shadow:0 1px 0 #3a3d3d';
      var ic = document.createElement('img'); ic.src = ICONO_URI; ic.alt = ''; ic.style.cssText = 'width:32px;height:32px;image-rendering:pixelated';
      var tt = document.createElement('div');
      tt.innerHTML = '<div style="font-weight:700;font-size:15px;color:#ececec">Minibia Helper v' + VERSION + '</div><div style="font-size:11px;color:#f5a400">Novedades y guía</div>';
      cab.appendChild(ic); cab.appendChild(tt);
      var cuerpoN = document.createElement('div');
      cuerpoN.style.cssText = 'flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:6px 14px 10px';
      function h(t) { var d = document.createElement('div'); d.textContent = t; d.style.cssText = 'margin:12px 0 6px;color:#f5a400;font-size:11px;font-weight:700;letter-spacing:.4px;text-transform:uppercase'; return d; }
      function lista(items) {
        var ul = document.createElement('ul'); ul.style.cssText = 'margin:0;padding-left:18px';
        items.forEach(function (x) { var li = document.createElement('li'); li.style.margin = '3px 0'; li.textContent = x; ul.appendChild(li); });
        return ul;
      }
      var lic = licDe(charActual);
      if (lic) {
        var lb = document.createElement('div');
        lb.style.cssText = 'margin:10px 0 2px;padding:8px 10px;background:rgba(88,209,58,.1);border:1px solid #2f5a24;color:#b6f29c';
        lb.textContent = '✔ ' + textoLicencia();
        cuerpoN.appendChild(lb);
      }
      cuerpoN.appendChild(h('Lo nuevo · v' + NOVEDADES[0][0] + ' y anteriores'));
      NOVEDADES.forEach(function (v, i) {
        var t = document.createElement('div');
        t.style.cssText = 'margin:8px 0 2px;font-weight:700;color:' + (i < 2 ? '#ececec' : '#c8c8c8');
        t.textContent = 'v' + v[0] + ' · ' + v[1];
        var fch = fechaCorta(NOV_FECHAS[v[0]]);
        if (fch) { var sf = document.createElement('span'); sf.textContent = '  ' + fch; sf.style.cssText = 'font-weight:400;font-size:11px;color:#9a9d9d'; t.appendChild(sf); }
        cuerpoN.appendChild(t); cuerpoN.appendChild(lista(v[2]));
      });
      cuerpoN.appendChild(h('Todas las funciones'));
      var esBetaT = !betaBloqueo(), esFounder = founderLicencia();
      var niv = nivelLic();
      FUNCIONES.map(function (f) { return f === FUNC_BETA ? (esFounder ? FUNC_FOUNDER : (goldLicencia() ? FUNC_GOLD : (esBetaT ? FUNC_BETA_ON : (niv === 1 ? FUNC_LITE : (niv === 2 ? FUNC_ESTANDAR : null))))) : f; }).filter(Boolean).forEach(function (f) {
        var d = document.createElement('div'); d.style.margin = '6px 0';
        var b = document.createElement('b'); b.textContent = f[0] + ': '; b.style.color = '#ececec';
        d.appendChild(b); d.appendChild(document.createTextNode(f[1]));
        cuerpoN.appendChild(d);
      });
      cuerpoN.appendChild(h('Para que funcione bien'));
      cuerpoN.appendChild(lista(CONSEJOS));
      var pie = document.createElement('div');
      pie.style.cssText = 'flex:none;display:flex;justify-content:flex-end;gap:8px;padding:10px 14px;border-top:1px solid #000;box-shadow:inset 0 1px 0 #3a3d3d';
      var ok = document.createElement('button'); ok.textContent = 'Entendido';
      ok.style.cssText = 'min-height:40px;padding:6px 20px;font:700 13px Verdana,Tahoma,sans-serif;color:#9fe870;background:linear-gradient(#3e4142,#2b2d2d);border:1px solid;border-color:#767a7a #060707 #060707 #767a7a;cursor:pointer';
      pie.appendChild(ok);
      caja.appendChild(cab); caja.appendChild(cuerpoN); caja.appendChild(pie);
      novModal.appendChild(caja);
      ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'touchmove', 'click', 'dblclick', 'contextmenu', 'wheel'].forEach(function (t) {
        novModal.addEventListener(t, function (e) { e.stopPropagation(); }, false);
      });
      ok.onclick = function () {
        novModal.style.display = 'none';
        var f = novModal.__despues; novModal.__despues = null;
        if (f) { try { f(); } catch (e) {} }
      };
      (document.body || document.documentElement).appendChild(trRaiz(novModal));
    }
    novModal.__despues = despues || null;
    novModal.style.display = 'flex';
  }
  function novedadesPendientes() { try { return localStorage.getItem(KEY_VISTO) !== NOVEDADES[0][0]; } catch (e) { return false; } }
  function NATIVO_INI() { try { return !!(window.MBHNativo && typeof window.MBHNativo.activo === 'function'); } catch (e) { return false; } }
  // Portapapeles: en la app (APK) usa el puente nativo de Android; en navegador, la API web.
  // Devuelve true si lo copió seguro (nativo o execCommand); la API web avisa por promesa.
  function copiarTexto(t, ok, mal) {
    t = String(t == null ? '' : t);
    try { if (window.MBHNativo && window.MBHNativo.copiar) { window.MBHNativo.copiar(t); if (ok) { ok(); } return true; } } catch (e) { registrar('copiar nativo: ' + e.message); }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t).then(function () { if (ok) { ok(); } }, function () { copiarViejo(t, ok, mal); });
        return true;
      }
    } catch (e) {}
    return copiarViejo(t, ok, mal);
  }
  function copiarViejo(t, ok, mal) {
    try {
      var ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;left:0;top:0;opacity:0;width:1px;height:1px';
      document.body.appendChild(ta); ta.focus(); ta.select(); ta.setSelectionRange(0, t.length);
      var r = document.execCommand('copy'); ta.remove();
      if (r) { if (ok) { ok(); } return true; }
    } catch (e) {}
    if (mal) { mal(); } return false;
  }
  // Leer el portapapeles: callback(texto) o callback(null) si no se pudo
  function pegarTexto(cb) {
    try { if (window.MBHNativo && window.MBHNativo.pegar) { cb(String(window.MBHNativo.pegar() || '')); return; } } catch (e) { registrar('pegar nativo: ' + e.message); }
    try { if (navigator.clipboard && navigator.clipboard.readText) { navigator.clipboard.readText().then(function (t) { cb(t); }, function () { cb(null); }); return; } } catch (e) {}
    cb(null);
  }
  window.addEventListener('error', function (e) { registrar('ERROR: ' + e.message + ' (línea ' + e.lineno + ')'); });
  window.addEventListener('unhandledrejection', function (e) { registrar('PROMESA: ' + e.reason); });

  // ---------- Reloj en un Worker ----------
  // Chrome frena los temporizadores de las pestañas en segundo plano (a 1 por segundo y, tras unos
  // minutos, a 1 por minuto). Un Worker no sufre ese freno: por eso el bot sigue a buen ritmo aunque
  // tengas varias pestañas con varios personajes. Si el navegador no lo permite, usa setInterval.
  var reloj = (function () {
    var cbs = {}, sig = 1, worker = null, modo = 'normal';
    function normal(id, ms) { cbs[id].t = setInterval(cbs[id].fn, ms); }
    try {
      var src = 'var t={};onmessage=function(e){var d=e.data;if(d.a==="s"){t[d.i]=setInterval(function(){postMessage(d.i)},d.ms)}else if(d.a==="c"){clearInterval(t[d.i]);delete t[d.i]}};';
      worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      worker.onmessage = function (e) { var c = cbs[e.data]; if (c) { try { c.fn(); } catch (err) { registrar('reloj: ' + err.message); } } };
      worker.onerror = function () {
        worker = null; modo = 'normal (el navegador bloqueó el worker)';
        Object.keys(cbs).forEach(function (id) { normal(id, cbs[id].ms); });
      };
      modo = 'worker';
    } catch (e) { worker = null; modo = 'normal'; }
    return {
      cada: function (fn, ms) {
        var id = sig++;
        cbs[id] = { fn: fn, ms: ms, t: null };
        if (worker) { worker.postMessage({ a: 's', i: id, ms: ms }); } else { normal(id, ms); }
        return id;
      },
      modo: function () { return modo; }
    };
  })();

  // ---------- Utilidades de interfaz ----------
  var refrescadores = [];
  function sincronizarUI() { refrescadores.forEach(function (f) { try { f(); } catch (e) {} }); }

  // Estilos de uso frecuente: se convierten en clases del CSS del panel
  var CLASES_EL = {
    'font-size:11px;color:#9a9': 'mbh-hint',
    'font-size:11px;color:#8f8;margin:3px 0': 'mbh-info',
    'color:#8f8;font-size:11px;margin:2px 0 4px': 'mbh-info',
    'font-size:11px;color:#8f8;margin:3px 0;white-space:pre-wrap;word-break:break-all': 'mbh-info mbh-pre',
    'display:flex;justify-content:space-between;align-items:center;gap:8px;margin:3px 0': 'mbh-row',
    'display:flex;gap:4px;align-items:center;flex-wrap:wrap;margin:3px 0': 'mbh-line',
    'display:flex;gap:4px;align-items:center;margin:3px 0': 'mbh-line',
    'display:flex;gap:4px;flex-wrap:wrap;margin:4px 0': 'mbh-btns',
    'display:flex;gap:4px;flex-wrap:wrap;margin:6px 0': 'mbh-btns',
    'display:flex;gap:4px;color:#8f8;margin-top:3px': 'mbh-heads',
    'white-space:pre-wrap;border-top:1px solid #0f05;padding-top:4px': 'mbh-status'
  };
  function el(tag, css, texto) {
    var e = document.createElement(tag);
    if (css) { if (CLASES_EL[css]) { e.className = CLASES_EL[css]; } else { e.style.cssText = css; } }
    if (texto) { e.textContent = texto; }
    return e;
  }
  function elc(tag, cls, texto) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (texto) { e.textContent = texto; }
    return e;
  }
  function boton(texto) { return elc('button', 'mbh-btn', texto); }
  function inputBase(tipo, ancho) {
    var inp = elc('input', 'mbh-in');
    inp.type = tipo;
    if (tipo !== 'checkbox') { inp.style.width = ancho + 'px'; }
    return inp;
  }
  function campo(etiqueta, tipo, ancho) {
    var fila = el('label', 'display:flex;justify-content:space-between;align-items:center;gap:8px;margin:3px 0');
    fila.appendChild(el('span', '', etiqueta));
    var inp = inputBase(tipo, ancho);
    fila.appendChild(inp);
    return { fila: fila, input: inp };
  }
  function campoSelect(etiqueta, opciones) {
    var fila = el('label', 'display:flex;justify-content:space-between;align-items:center;gap:8px;margin:3px 0');
    fila.appendChild(el('span', '', etiqueta));
    var sel = document.createElement('select');
    sel.className = 'mbh-in'; sel.style.maxWidth = '180px';
    opciones.forEach(function (opt) {
      var o = document.createElement('option');
      o.value = opt.val;
      o.textContent = opt.txt;
      sel.appendChild(o);
    });
    fila.appendChild(sel);
    return { fila: fila, input: sel };
  }
  function ligar(f, clave, tipo) {
    if (tipo === 'checkbox') {
      f.input.checked = !!cfg[clave];
      f.input.onchange = function () { cfg[clave] = f.input.checked; guardarCfg(); };
    } else if (tipo === 'number') {
      f.input.value = cfg[clave];
      f.input.oninput = function () { cfg[clave] = Number(f.input.value) || 0; guardarCfg(); };
    } else if (f.input.tagName === 'SELECT') {
      f.input.value = cfg[clave];
      f.input.onchange = function () { cfg[clave] = f.input.value; guardarCfg(); };
    } else {
      f.input.value = cfg[clave];
      f.input.oninput = function () { cfg[clave] = f.input.value; guardarCfg(); };
    }
    refrescadores.push(function () {
      if (tipo === 'checkbox') { f.input.checked = !!cfg[clave]; } else { f.input.value = cfg[clave]; }
    });
    return f.fila;
  }
  function filaRango(etiqueta, claveMin, claveMax) {
    var fila = el('div', 'display:flex;justify-content:space-between;align-items:center;gap:8px;margin:3px 0');
    fila.appendChild(el('span', '', etiqueta));
    var cont = el('span', 'display:flex;gap:4px;align-items:center');
    var iMin = inputBase('number', 52), iMax = inputBase('number', 52);
    iMin.value = cfg[claveMin]; iMax.value = cfg[claveMax];
    iMin.oninput = function () { cfg[claveMin] = Number(iMin.value) || 0; guardarCfg(); };
    iMax.oninput = function () { cfg[claveMax] = Number(iMax.value) || 0; guardarCfg(); };
    cont.appendChild(iMin);
    cont.appendChild(el('span', '', 'a'));
    cont.appendChild(iMax);
    fila.appendChild(cont);
    refrescadores.push(function () { iMin.value = cfg[claveMin]; iMax.value = cfg[claveMax]; });
    return fila;
  }

  // ---------- Estilo: ventana de opciones del cliente de Tibia (gris con textura, filas hundidas, menú lateral) ----------
  var RUIDO = 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27180%27 height=%27180%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%27.75%27 numOctaves=%273%27 stitchTiles=%27stitch%27/%3E%3CfeColorMatrix values=%270 0 0 0 .55 0 0 0 0 .55 0 0 0 0 .55 0 0 0 .13 0%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")';
  var FLECHA = 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 10 6%27%3E%3Cpath d=%27M0 0h10L5 6z%27 fill=%27%23d6d6d6%27/%3E%3C/svg%3E")';
  var CSS_MBH = [
    '#mbh-panel{position:fixed;left:8px;bottom:8px;z-index:2147483647;width:540px;max-width:96vw;box-sizing:border-box;background:#222424 ' + RUIDO + ';color:#dcdcdc;',
    ' font:600 11.5px/1.35 Verdana,Tahoma,Arial,sans-serif;border:1px solid #000;box-shadow:inset 1px 1px 0 #4b4e4e,inset -1px -1px 0 #0b0c0c,0 6px 22px rgba(0,0,0,.7);user-select:text;text-shadow:1px 1px 0 rgba(0,0,0,.55)}',
    '#mbh-panel *{box-sizing:border-box}',
    // barra de título centrada
    '#mbh-panel .mbh-title{position:relative;display:flex;align-items:center;justify-content:flex-start;padding-left:44px;height:36px;cursor:move;user-select:none;background:linear-gradient(#1b1d1d,#101212);',
    ' border-bottom:1px solid #000;box-shadow:0 1px 0 #404444;color:#f0f0f0;font-size:13px;letter-spacing:.3px}',
    '#mbh-panel .mbh-ver{color:#8e9292;font-weight:normal;margin-left:6px;font-size:10px}',
    '#mbh-panel .mbh-title .mbh-sq{position:absolute;right:6px;top:10px}',
    '#mbh-panel .mbh-logo{position:absolute;left:6px;top:2px;width:32px;height:32px;image-rendering:pixelated;image-rendering:crisp-edges;filter:drop-shadow(1px 1px 0 #000)}',
    // zona central: menú lateral + contenido
    '#mbh-panel .mbh-cuerpo{display:flex;gap:6px;padding:7px 7px 6px}',
    '#mbh-panel .mbh-nav{width:118px;flex:none;display:flex;flex-direction:column;gap:5px}',
    '#mbh-panel .mbh-navb{display:flex;align-items:center;gap:7px;width:100%;height:27px;padding:0 6px;cursor:pointer;color:#cfd2d2;background:linear-gradient(#242626,#191b1b);text-align:left;',
    ' font:700 11px Verdana,Tahoma,sans-serif;text-shadow:1px 1px 0 #000;border:1px solid;border-color:#484b4b #050606 #050606 #484b4b;border-radius:0}',
    '#mbh-panel .mbh-navb svg{flex:none}',
    '#mbh-panel .mbh-navb span{flex:1;overflow:hidden;text-overflow:ellipsis}',
    '#mbh-panel .mbh-navb::after{content:"";width:8px;height:5px;background:' + FLECHA + ' center/8px 5px no-repeat;opacity:.8;flex:none}',
    '#mbh-panel .mbh-navb:hover{color:#fff;background:linear-gradient(#303232,#222424)}',
    '#mbh-panel .mbh-navb.on{color:#fff;background:linear-gradient(#3b3e3e,#2a2c2c);border-color:#767a7a #070808 #070808 #767a7a}',
    '#mbh-panel .mbh-navb.on::after{transform:rotate(-90deg)}',
    '#mbh-panel .mbh-pages{flex:1;min-width:0;height:min(58vh,470px);overflow:auto;padding:6px;background:rgba(0,0,0,.3);border:1px solid;border-color:#050606 #565a5a #565a5a #050606;box-shadow:inset 1px 1px 3px rgba(0,0,0,.45)}',
    // grupos (secciones plegables)
    '#mbh-panel .mbh-sec{margin:0 0 8px}',
    '#mbh-panel .mbh-sec-h{display:flex;align-items:center;gap:6px;padding:2px 2px 4px;color:#f2f2f2;font-size:12px;cursor:pointer;user-select:none;border-bottom:1px solid #0a0b0b;box-shadow:0 1px 0 #55595a;margin-bottom:5px}',
    '#mbh-panel .mbh-sec-h::before{content:"";width:0;height:0;border:4px solid transparent;border-left:6px solid #f5a400;border-right:0;flex:none}',
    '#mbh-panel .mbh-sec.open .mbh-sec-h::before{border:4px solid transparent;border-top:6px solid #f5a400;border-bottom:0}',
    '#mbh-panel .mbh-sec:not(.open) .mbh-sec-b{display:none}',
    '#mbh-panel .mbh-sec-b{padding:0}',
    '#mbh-panel .mbh-sec.lock{opacity:.6}',
    '#mbh-panel .mbh-sec.lock .mbh-sec-h{cursor:not-allowed;color:#9a9e9e}',
    '#mbh-panel .mbh-sec.lock .mbh-sec-h::before{border-left-color:#6a6d6d}',
    '#mbh-panel .mbh-beta{margin-left:auto;padding:1px 6px;border:1px solid #6a4a12;background:#2b2210;color:#f5a400;font:700 9px/14px Verdana,Tahoma,sans-serif;letter-spacing:.4px}',
    '#mbh-panel .mbh-lockmsg{margin:2px 0 6px;padding:5px 8px;border:1px solid #0a0b0b;background:#1b1c1c;color:#b9a574;font:500 10px/1.4 Verdana,Tahoma,sans-serif}',
    '#mbh-panel .mbh-about{padding:4px 2px}',
    '#mbh-panel .mbh-about-t{color:#c4c8c8;font:500 11px/1.5 Verdana,Tahoma,sans-serif}',
    '#mbh-panel .mbh-about-t h3{margin:0 0 6px;color:#f2f2f2;font:700 14px/1.2 Verdana,Tahoma,sans-serif}',
    '#mbh-panel .mbh-about-t ul{margin:4px 0 8px;padding:0 0 0 16px}',
    '#mbh-panel .mbh-about-t li{margin:0 0 4px}',
    '#mbh-panel .mbh-marco{width:max-content;max-width:100%;margin:0 auto;padding:5px;border:1px solid #0a0b0b;background:#1a1b1b;box-shadow:0 0 0 1px #3e4141,inset 0 0 0 1px #55595a}',
    '#mbh-panel .mbh-fig{position:relative;border:1px solid #000;line-height:0}',
    '#mbh-panel .mbh-fig img{display:block;width:340px;max-width:100%;height:auto;image-rendering:pixelated;pointer-events:none}',
    '#mbh-panel .mbh-by{margin:6px 0 0;text-align:center;line-height:0}',
    '#mbh-panel .mbh-by img{width:189px;height:auto;pointer-events:none}',
    '#mbh-panel .mbh-ojo{position:absolute;width:22px;height:14px;margin:-7px 0 0 -11px;border-radius:50%;pointer-events:none;mix-blend-mode:screen;background:radial-gradient(ellipse at center,rgba(255,246,175,.95) 0,rgba(255,201,40,.6) 38%,rgba(255,160,0,0) 72%);animation:mbhOjo 2s ease-in-out infinite}',
    '#mbh-panel .mbh-ojo.b{width:18px;margin-left:-9px;animation-delay:.3s}',
    '#mbh-panel .mbh-ojo::after{content:"";position:absolute;left:4px;top:5px;width:2px;height:2px;background:#fff;box-shadow:0 0 3px 1px #fff;opacity:0;animation:mbhGlint 3.4s linear infinite}',
    '#mbh-panel .mbh-ojo.b::after{animation-delay:.5s}',
    '@keyframes mbhOjo{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.4)}}',
    '@keyframes mbhGlint{0%{opacity:0;transform:translateX(0)}8%{opacity:1}30%{opacity:1;transform:translateX(13px)}38%,100%{opacity:0;transform:translateX(15px)}}',
    '@media (prefers-reduced-motion:reduce){#mbh-panel .mbh-ojo,#mbh-panel .mbh-ojo::after{animation:none;opacity:.8}}',
    '#mbh-panel .mbh-sub{display:flex;align-items:center;gap:7px;margin:10px 0 4px;color:#f5a400;font-size:10px;letter-spacing:.4px;text-transform:uppercase}',
    '#mbh-panel .mbh-sub::after{content:"";flex:1;border-top:1px solid #0a0b0b;border-bottom:1px solid #55595a}',
    // filas hundidas
    '#mbh-panel .mbh-row{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:3px 0;padding:3px 8px;min-height:25px;color:#dedede;',
    ' background:rgba(0,0,0,.28);border:1px solid;border-color:#070808 #4c5050 #4c5050 #070808}',
    '#mbh-panel .mbh-row:hover{background:rgba(255,255,255,.05)}',
    '#mbh-panel .mbh-row:has(>input[type=checkbox]){flex-direction:row-reverse;justify-content:flex-end;gap:9px}',
    '#mbh-panel .mbh-line{display:flex;gap:4px;align-items:center;flex-wrap:wrap;margin:4px 0}',
    '#mbh-panel .mbh-btns{display:flex;gap:5px;flex-wrap:wrap;margin:6px 0 3px}',
    '#mbh-panel .mbh-heads{display:flex;gap:4px;margin-top:4px;color:#9a9d9d;font-size:10px;text-transform:uppercase}',
    // botones
    '#mbh-panel .mbh-btn{font:700 11px Verdana,Tahoma,sans-serif;color:#ececec;background:linear-gradient(#3e4142,#2b2d2d);border:1px solid;border-color:#767a7a #060707 #060707 #767a7a;',
    ' padding:2px 10px;cursor:pointer;border-radius:0;text-shadow:1px 1px 0 #000;line-height:1.35}',
    '#mbh-panel .mbh-btn:hover{background:linear-gradient(#5a5e5f,#404344);color:#fff}',
    '#mbh-panel .mbh-btn:active{border-color:#080909 #868a8a #868a8a #080909;background:#2c2e2e;padding:3px 9px 1px 11px}',
    '#mbh-panel .mbh-btn.mbh-sq{padding:0;width:18px;height:16px;line-height:12px;font-size:12px}',
    '#mbh-panel .mbh-btn.mbh-main{font-size:11.5px;padding:3px 14px;color:#b4ee92;min-width:96px;height:24px}',
    '#mbh-panel .mbh-btn.mbh-main.on{color:#ffa593}',
    // campos
    '#mbh-panel .mbh-in{font:600 11px Verdana,Tahoma,sans-serif;color:#f3f3f3;text-shadow:none;background:#0d0f0f;border:1px solid;border-color:#040505 #565a5a #565a5a #040505;padding:1px 5px;height:20px;border-radius:0;outline:none}',
    '#mbh-panel .mbh-in:focus{box-shadow:0 0 0 1px #f5a400aa}',
    '#mbh-panel input[type=number]{-moz-appearance:textfield}',
    '#mbh-panel input[type=number]::-webkit-inner-spin-button,#mbh-panel input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}',
    '#mbh-panel input[type=checkbox].mbh-in{-webkit-appearance:none;appearance:none;width:15px;height:15px;padding:0;cursor:pointer;flex:none;background:#0d0f0f}',
    '#mbh-panel input[type=checkbox].mbh-in:checked{background:#0d0f0f url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 10 10%27%3E%3Cpath d=%27M1.5 5.3 4 8 8.7 1.8%27 fill=%27none%27 stroke=%27%23e8e8e8%27 stroke-width=%271.8%27/%3E%3C/svg%3E") center/11px no-repeat}',
    '#mbh-panel select.mbh-in{-webkit-appearance:none;appearance:none;background:#343636 ' + FLECHA + ' right 6px center/9px 5px no-repeat;padding:1px 22px 1px 8px;cursor:pointer;border-color:#7f8383 #0a0b0b #0a0b0b #7f8383;text-shadow:1px 1px 0 #000}',
    '#mbh-panel select.mbh-in option{background:#2b2d2d;color:#eee}',
    // textos de ayuda: icono (i) que se despliega al pulsar
    '#mbh-panel .mbh-hint{position:relative;margin:5px 0;padding:2px 24px 2px 4px;min-height:20px;color:#9fa3a3;font:500 10px/1.4 Verdana,Tahoma,sans-serif;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#mbh-panel .mbh-hint::after{content:"i";position:absolute;right:3px;top:2px;width:15px;height:15px;border-radius:50%;border:1px solid #c9cccc;color:#e8e8e8;font:700 10px/13px Georgia,serif;text-align:center;background:#2a2c2c}',
    '#mbh-panel .mbh-hint.abierto{white-space:normal;overflow:visible;color:#c4c8c8}',
    '#mbh-panel .mbh-info{color:#aedb92;font:600 10.5px/1.4 Verdana,Tahoma,sans-serif;margin:5px 0}',
    '#mbh-panel .mbh-pre{white-space:pre-wrap;word-break:break-all}',
    '#mbh-panel .mbh-status{white-space:pre-wrap;background:#121414;border:1px solid;border-color:#050606 #666a6a #666a6a #050606;padding:5px 7px;font:500 10.5px/1.45 Consolas,"Lucida Console",monospace;color:#bfe0ac;text-shadow:none;margin-top:6px}',
    '#mbh-panel textarea.mbh-in{height:96px;width:100%;font:500 10.5px Consolas,monospace;color:#bfe0ac;display:none}',
    // barra inferior: estado, barras y botón principal
    '#mbh-panel .mbh-foot{display:flex;align-items:center;gap:9px;padding:6px 8px;margin:0 7px 7px;background:rgba(0,0,0,.34);border:1px solid;border-color:#050606 #565a5a #565a5a #050606}',
    '#mbh-panel .mbh-minibtns{display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-end}',
    '#mbh-panel .mbh-minibtns .mbh-btn{white-space:nowrap}',
    '#mbh-panel .mbh-led{width:10px;height:10px;border-radius:50%;background:#4a4d4d;flex:none;box-shadow:inset 0 0 0 1px #000,inset 1px 1px 2px rgba(255,255,255,.3)}',
    '#mbh-panel .mbh-led.on{background:#58d13a;box-shadow:inset 0 0 0 1px #0a3a00,0 0 6px #58d13a}',
    '#mbh-panel .mbh-led.gm{background:#e0503a;box-shadow:inset 0 0 0 1px #400,0 0 6px #e0503a}',
    '#mbh-panel .mbh-resumen{flex:0 1 150px;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#ececec}',
    '#mbh-panel .mbh-resumen.gm{color:#ff8a78}',
    '#mbh-panel .mbh-bars{flex:1;display:flex;gap:5px;min-width:0}',
    '#mbh-panel .mbh-bar{position:relative;flex:1;height:17px;background:#0d0e0e;border:1px solid;border-color:#000 #5a5e5e #5a5e5e #000;border-radius:3px;overflow:hidden}',
    '#mbh-panel .mbh-bar i{position:absolute;left:0;top:0;bottom:0;width:0;transition:width .25s}',
    '#mbh-panel .mbh-bar.hp i{background:linear-gradient(#e8664f,#a83426)}',
    '#mbh-panel .mbh-bar.mp i{background:linear-gradient(#6195f5,#2f55b4)}',
    '#mbh-panel .mbh-bar b{position:absolute;left:0;right:0;top:0;bottom:0;text-align:center;font:700 10px/15px Verdana,Tahoma,sans-serif;color:#fff;text-shadow:1px 1px 0 #000}',
    '#mbh-panel ::-webkit-scrollbar{width:11px;height:11px}',
    '#mbh-panel ::-webkit-scrollbar-track{background:#161818;border-left:1px solid #000}',
    '#mbh-panel ::-webkit-scrollbar-thumb{background:linear-gradient(90deg,#585c5c,#3b3e3e);border:1px solid #000;box-shadow:inset 1px 1px 0 #7a7e7e}',
    '#mbh-aviso{position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:2147483647;display:none;max-width:80vw;text-align:center;box-sizing:border-box;',
    ' background:#3b0f0c;color:#fff;font:bold 13px/1.4 Verdana,Tahoma,sans-serif;padding:10px 16px;border:1px solid #000;box-shadow:inset 1px 1px 0 #ff8a78,inset -1px -1px 0 #5a0c06,0 6px 22px rgba(0,0,0,.7);text-shadow:1px 1px 0 #000}',
    '#mbh-aviso .mbh-btn{font:bold 11px Verdana,Tahoma,sans-serif;color:#e6e6e6;background:linear-gradient(#4d5051,#353838);border:1px solid;border-color:#868a8a #080909 #080909 #868a8a;padding:2px 10px;cursor:pointer;border-radius:0}'
  ].join('\n');
  // ---------- Modo móvil: panel táctil, botón flotante y barra de marcar ----------
  var ES_MOVIL = false;
  try {
    ES_MOVIL = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') || ES_IOS ||
      (typeof matchMedia === 'function' && matchMedia('(pointer:coarse)').matches && Math.min(screen.width, screen.height) < 900);
    if (localStorage.getItem('minibiaHelperMovil') === '1') { ES_MOVIL = true; }
    if (localStorage.getItem('minibiaHelperMovil') === '0') { ES_MOVIL = false; }
  } catch (e) {}
  var CSS_MOVIL = [
    '#mbh-panel{left:max(6px,env(safe-area-inset-left))!important;right:auto!important;top:auto!important;bottom:6px!important;width:min(calc(100vw - 12px),620px);max-width:none;max-height:calc(100vh - 12px);max-height:calc(100dvh - 12px);display:flex;flex-direction:column;font-size:13px;-webkit-text-size-adjust:none}',
    '#mbh-panel .mbh-title{flex:none;height:44px;cursor:default;padding-left:50px;font-size:15px}',
    '#mbh-panel .mbh-logo{width:36px;height:36px;top:4px}',
    '#mbh-panel .mbh-title .mbh-sq{top:6px;right:8px}',
    '#mbh-panel .mbh-btn.mbh-sq{width:42px;height:32px;font-size:20px;line-height:20px}',
    '#mbh-panel .mbh-cuerpo{flex:1 1 auto;min-height:0;overflow:hidden;padding:6px}',
    '#mbh-panel .mbh-nav{width:48px;overflow-y:auto;gap:6px}',
    '#mbh-panel .mbh-navb{height:44px;padding:0;justify-content:center}',
    '#mbh-panel .mbh-navb span,#mbh-panel .mbh-navb::after{display:none}',
    '#mbh-panel .mbh-navb svg{width:24px;height:24px}',
    '#mbh-panel .mbh-pages{height:auto;max-height:none;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}',
    '#mbh-panel .mbh-sec-h{min-height:42px;font-size:14px}',
    '#mbh-panel .mbh-row{min-height:38px;padding:5px 8px;font-size:13px}',
    '#mbh-panel .mbh-btn{min-height:40px;font-size:13px;padding:6px 14px}',
    '#mbh-panel .mbh-btn.mbh-main{min-height:42px;font-size:14px}',
    '#mbh-panel .mbh-in{height:38px;font-size:16px;padding:2px 8px}',
    '#mbh-panel input[type=checkbox].mbh-in{width:26px;height:26px}',
    '#mbh-panel .mbh-hint{font-size:12px;min-height:26px}',
    '#mbh-panel .mbh-hint::after{width:22px;height:22px;font-size:13px;line-height:20px}',
    '#mbh-panel .mbh-foot{flex:none;margin:0 6px 6px}',
    '#mbh-panel .mbh-by img{width:min(189px,60%)}',
    // Minimizado: barra compacta abajo al centro, entre el joystick (izquierda) y el hotbar (derecha)
    '#mbh-panel.mbh-min{left:50%!important;right:auto!important;transform:translateX(-50%);width:min(440px,calc(100vw - 400px));min-width:min(300px,calc(100vw - 12px));bottom:4px!important}',
    '#mbh-panel.mbh-min .mbh-foot{padding:4px 6px;gap:6px;margin:0 5px 5px}',
    '#mbh-panel.mbh-min .mbh-bars{flex-direction:column;gap:3px;min-width:90px}',
    '#mbh-panel.mbh-min .mbh-bar{flex:none;height:15px}',
    '#mbh-panel.mbh-min .mbh-bar b{line-height:13px;font-size:9px}',
    '#mbh-panel.mbh-min .mbh-resumen{flex:0 1 auto;min-width:0;max-width:36%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '#mbh-panel.mbh-min .mbh-btn.mbh-main{min-height:36px;padding:4px 10px}',
    '#mbh-panel.mbh-min .mbh-title{height:34px;font-size:13px;padding-left:42px}',
    '#mbh-panel.mbh-min .mbh-logo{width:28px;height:28px;top:3px}',
    '#mbh-panel.mbh-min .mbh-title .mbh-sq{top:3px;height:28px;min-height:28px;line-height:16px}',
    // Abierto: centrado y sin tapar la barra de vida/maná de arriba
    '#mbh-panel:not(.mbh-min){left:50%!important;transform:translateX(-50%);top:max(48px,6vh)!important;bottom:6px!important;max-height:none}',
    '#mbh-fab{position:fixed;right:8px;left:auto;top:40%;z-index:2147483646;width:48px;height:48px;border-radius:50%;box-sizing:border-box;display:flex;align-items:center;justify-content:center;',
    ' background:#1d1f1f;border:2px solid #000;box-shadow:inset 0 0 0 1px #555959,0 3px 12px rgba(0,0,0,.65);opacity:.88;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}',
    '#mbh-fab img{width:30px;height:30px;image-rendering:pixelated;pointer-events:none}',
    '#mbh-fab.abierto{opacity:1;box-shadow:inset 0 0 0 1px #f5a400,0 3px 12px rgba(0,0,0,.65)}',
    '#mbh-fab.on{border-color:#58d13a}',
    '#mbh-marcbar{position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:2147483646;display:none;gap:6px;padding:6px;background:rgba(18,20,20,.92);border:1px solid #000;box-shadow:inset 0 0 0 1px #555959,0 3px 12px rgba(0,0,0,.65)}',
    '#mbh-marcbar .mbh-mb{font:700 13px Verdana,Tahoma,sans-serif;color:#ececec;background:linear-gradient(#3e4142,#2b2d2d);border:1px solid;border-color:#767a7a #060707 #060707 #767a7a;padding:8px 12px;min-height:40px;border-radius:0;touch-action:manipulation}',
    '#mbh-marcbar .mbh-mb.on{color:#ffd166;border-color:#f5a400;background:linear-gradient(#4a4330,#33301f)}',
    '#mbh-marcbar .mbh-mb.salir{color:#ffa593}'
  ].join('\n');
  if (ES_MOVIL) { CSS_MBH += '\n' + CSS_MOVIL; }
  (function () {
    var st = document.createElement('style');
    st.id = 'mbh-estilo'; st.textContent = CSS_MBH;
    (document.head || document.documentElement).appendChild(st);
  })();

  // ---------- Panel principal ----------
  var panel = el('div'); panel.id = 'mbh-panel';
  ['keydown', 'keyup', 'keypress'].forEach(function (t) {
    panel.addEventListener(t, function (e) { e.stopPropagation(); });
  });

  // Barra de título (se arrastra para mover la ventana)
  var BY_URI = 'data:image/png;base64,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';
  var PERSONAJE_URI = 'data:image/jpeg;base64,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';
  var ICONO_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAD1klEQVR42r1XQWjUWBj+/owljSytsTAVqbpdabJUpe3Jw7pQQZFF0uLuwYIgnTJQwZsVlTlKHavgycsWS1d66sVVpoc9eBlYe/A0XdQyE9FSLQXHldQqpqFOnofJe01mpnYmtj4IhJD835/v//7vf48QcuX++hlQNAbbBBSN9L5UqDgUCnyyBwCYOf8EAKBF5dBJSGES+NyaBmwTi5aCRUvBt6xtoT6a6wZgYrdqe0/k75sAbJOZeadIPYDivcnClFQKWX+/higgzC3XgG0yn/CKl8cCALalCfA/9MBI70tB70tBi8qhWaiVAVF7PZZde6po0KJyKBakULVXtIDYvP6ndXSySQys1b6i4Uw/bVsrhffupjmhV1cGRSNz/gl+6n7HAOBluomMy3PrvluNM1abAANAZt4R4F4CePzhjIgxPDwcSEKPZembS8BVrceysAqdeJluAgDsih5Hx7XXZBgGMwyD7Wn5EakfSIiyWi1IfqCJ5KmKyudM2TtPsrf5g1S0YsDpr2czmeJA+u3SOdYpRdgJvygraCE32RNIjABg6kYrALDSqVZK5fiQwQDQsTv/lAWecQvQb+tIOxdp8Fwc7+b+wP/pZwwA8ZbNTfas2fi+Q6T3pUDjQwZW616wiCSjuXEpMFp57XmAVw3bAIA5/fUk312B01/PAMDtaoGUWcDC7xdwtPtqqSkxPZYlDs6NbNFSEJFkIgAYS3QBAGtuXArMd9hmmZCePW7AruhxTB/6G51SJMDE3uXPVOYdtsl4LM+oBHg8mSlqIJ7MoOA6FJjtduXpduDwMppa76HnI8OMWyB+dSxfIFWdZ6N/jpUblPfnb97vEPuHeDJT3oajV9pZRJLxa5stnq1sP0sdpxMVFaziEqCeZwBgWY9IVY949/sowIBH+5v3O1BwHRocma3chnWr+8V4NfMOzLyD+k8TbL12snATlvWIAEBVj4h7UX8f7VpUhuS0BMDLEhi4NSX+vrQc6/f0GfT2PqCR6w+h4j/09j4g4YbeSueKMK68sLETcuWncxIikhwQ5vTTNhq4NVWdbftoB0A8Tql1BxgYHzJg5h3SY1kMjsyWCfOXg8/Z+JBRFfi/z8WGleLJDIzLczyZ2mbB6JV2wQTfA95NKXT9fuar4AXXQd3q/g0Zq2oYTSRPwV7Osd2qLZLw+wMHr9Tnm3YwGUt0oeA6gSQ8gwmA85pXA17ThsQLSIuWwrdevMeF2msFr3lPODgyi4gkB5PweXut4KHPhmOJLjQ3Lgl7LbgOlAadzibuf5/DqV+YEanocBupfUvW1I1WPklDry+I2gAxrb0lzgAAAABJRU5ErkJggg==';
  var cabecera = elc('div', 'mbh-title');
  var logo = document.createElement('img'); logo.className = 'mbh-logo'; logo.src = ICONO_URI; logo.alt = ''; logo.draggable = false;
  cabecera.appendChild(logo);
  var btnMin = boton('–'); btnMin.className = 'mbh-btn mbh-sq'; btnMin.title = 'Minimizar / abrir';
  var tituloTxt = elc('span', '', 'Minibia Helper');
  tituloTxt.appendChild(elc('span', 'mbh-ver', 'v' + VERSION));
  cabecera.appendChild(tituloTxt);
  cabecera.appendChild(btnMin);

  // Barra inferior, siempre visible: luz, personaje, vida/mana y botón principal
  var mini = elc('div', 'mbh-foot');
  var led = elc('span', 'mbh-led');
  var resumen = elc('span', 'mbh-resumen', 'Minibia Helper v' + VERSION);
  var btnToggle = boton('▶ Iniciar runeo'); btnToggle.className = 'mbh-btn mbh-main';
  // cada función con su propio botón, para que no se peleen por uno solo
  var btnCazaMini = boton('▶ Iniciar cavehunt'); btnCazaMini.className = 'mbh-btn mbh-main';
  var btnTrainMini = boton('▶ Iniciar training'); btnTrainMini.className = 'mbh-btn mbh-main';
  var botonesMini = elc('div', 'mbh-minibtns');
  var barras = elc('div', 'mbh-bars');
  function crearBarra(cls) {
    var b = elc('div', 'mbh-bar ' + cls), f = document.createElement('i'), t = document.createElement('b');
    b.appendChild(f); b.appendChild(t); barras.appendChild(b);
    return { fill: f, txt: t };
  }
  var barraHp = crearBarra('hp'), barraMp = crearBarra('mp');
  function pintarBarra(b, v, etq) {
    if (!v || !v.max) { b.fill.style.width = '0'; b.txt.textContent = etq + ' ?'; return; }
    b.fill.style.width = Math.max(0, Math.min(100, v.actual * 100 / v.max)) + '%';
    b.txt.textContent = v.actual + ' / ' + v.max;
  }
  botonesMini.appendChild(btnToggle); botonesMini.appendChild(btnCazaMini); botonesMini.appendChild(btnTrainMini);
  mini.appendChild(led); mini.appendChild(resumen); mini.appendChild(barras); mini.appendChild(botonesMini);

  // Menú lateral con iconos, como el de las opciones del cliente
  var cuerpo = elc('div', 'mbh-cuerpo');
  var IC = function (d) { return '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">' + d + '</svg>'; };
  var ICONOS = {
    Macros: IC('<path d="M2.5 4.5h3a1.6 1.6 0 1 1 3.2 0h3v3a1.6 1.6 0 1 0 0 3.2v3h-3a1.6 1.6 0 1 0-3.2 0h-3z" fill="#f5c542" stroke="#0b0d12"/>'),
    Runas: IC('<path d="M8 1.5 13.5 5v6L8 14.5 2.5 11V5z" fill="#7aa2ff" stroke="#0b0d12"/><path d="m6 5.6 4 4.8M10 5.6l-4 4.8" stroke="#0b0d12" stroke-width="1.5"/>'),
    Combate: IC('<path d="m12.6 1.8 1.6 1.6-7 7-1.6-1.6z" fill="#d4d8dd" stroke="#0b0d12"/><path d="m4.2 8.2 3.6 3.6-1.2 1.2L3 9.4z" fill="#c88a2c" stroke="#0b0d12"/><path d="m5.2 10.8-3 3" stroke="#6b3d12" stroke-width="2"/>'),
    Caza: IC('<path d="M2 13.5c3.2 0 1.8-5 6-5s2.4-5.5 5.2-5.5" stroke="#7dd36a" stroke-width="1.7" fill="none" stroke-dasharray="2.2 1.6"/><circle cx="13" cy="3" r="2" fill="#e0503a" stroke="#0b0d12"/>'),
    Mapa: IC('<rect x="2" y="2" width="12" height="12" fill="#12303a" stroke="#00e5ff"/><rect x="5.5" y="5.5" width="5" height="5" fill="#00e5ff" opacity=".65"/>'),
    Alertas: IC('<path d="M8 2C5.2 2 4.2 4.5 4.2 7v3L2.6 12h10.8L11.8 10V7C11.8 4.5 10.8 2 8 2z" fill="#f5c542" stroke="#0b0d12"/><circle cx="8" cy="13.4" r="1.5" fill="#f5c542" stroke="#0b0d12"/>'),
    'Acerca de': IC('<circle cx="8" cy="8" r="6.2" fill="#1d3a5c" stroke="#7aa2ff"/><rect x="7" y="7" width="2" height="4.6" fill="#e8eef8"/><rect x="7" y="4.2" width="2" height="1.8" fill="#e8eef8"/>'),
    Sistema: IC('<circle cx="8" cy="8" r="3" fill="none" stroke="#c4c8c8" stroke-width="2.2"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" stroke="#c4c8c8" stroke-width="1.8"/>')
  };
  var TABS = [
    ['Runas', ['Training', 'Colmena', 'Casa']],
    ['Combate', ['Autoheal', 'Autolife', 'Automana', 'Autohaste', 'Autohechizos', 'Combo runa']],
    ['Caza', ['Cave hunt', 'Colmena hunt']],
    ['Macros', ['Macros']],
    ['Mapa', ['Casillas']],
    ['Alertas', ['Alertas', 'Reinicio']],
    ['Sistema', ['Perfil', 'Estado']],
    ['Acerca de', ['Acerca de']]
  ];
  var tabsEl = elc('div', 'mbh-nav'), paginasEl = elc('div', 'mbh-pages');
  var paginas = {}, tabBtns = {}, tabActiva = 'Runas';
  try { var tg = localStorage.getItem('minibiaHelperTab'); if (tg) { tabActiva = tg; } } catch (e) {}
  if (!TABS.some(function (t) { return t[0] === tabActiva; })) { tabActiva = TABS[0][0]; }
  function elegirTab(n) {
    tabActiva = n;
    try { localStorage.setItem('minibiaHelperTab', n); } catch (e) {}
    TABS.forEach(function (t) {
      tabBtns[t[0]].className = 'mbh-navb' + (t[0] === n ? ' on' : '');
      paginas[t[0]].style.display = t[0] === n ? 'block' : 'none';
    });
    paginasEl.scrollTop = 0;
  }
  TABS.forEach(function (t) {
    var b = elc('button', 'mbh-navb');
    b.innerHTML = ICONOS[t[0]];
    b.appendChild(elc('span', '', t[0]));
    b.onclick = function () { elegirTab(t[0]); };
    tabBtns[t[0]] = b; tabsEl.appendChild(b);
    paginas[t[0]] = el('div'); paginasEl.appendChild(paginas[t[0]]);
  });
  cuerpo.appendChild(tabsEl);
  cuerpo.appendChild(paginasEl);
  elegirTab(tabActiva);
  // Los textos de ayuda se pliegan; el icono (i) los despliega
  paginasEl.addEventListener('click', function (e) {
    var h = e.target && e.target.closest ? e.target.closest('.mbh-hint') : null;
    if (h) { h.classList.toggle('abierto'); }
  });

  var estadoSecs = {};
  try { estadoSecs = JSON.parse(localStorage.getItem('minibiaHelperSecs2') || '{}') || {}; } catch (e) { estadoSecs = {}; }
  var secsBeta = [];
  // La pestaña Macros solo se ve con Gold (o Founder / beta tester)
  function pintarTabMacros() {
    var b = tabBtns.Macros; if (!b) { return; }
    var bloq = betaBloqueo();
    b.style.display = bloq ? 'none' : '';
    if (bloq && tabActiva === 'Macros') { var prevTab = null; try { prevTab = localStorage.getItem('minibiaHelperTab'); } catch (e) {} elegirTab('Runas'); try { if (prevTab) { localStorage.setItem('minibiaHelperTab', prevTab); } } catch (e) {} }
  }
  secsBeta.push(pintarTabMacros);
  function seccion(nombre) {
    var pag = 'Sistema';
    TABS.forEach(function (t) { t[1].forEach(function (pref) { if (nombre.indexOf(pref) === 0) { pag = t[0]; } }); });
    var caja = elc('div', 'mbh-sec'), cab = elc('div', 'mbh-sec-h', nombre), cont = elc('div', 'mbh-sec-b');
    var beta = /^(Cave hunt|Colmena|Macros)/.test(nombre), esCol = /^Colmena/.test(nombre), etq = null;
    var deEstandar = /^(Autoheal|Autolife|Automana|Autohaste|Autohechizos|Combo runa|Reinicio)/.test(nombre), bloq = beta || deEstandar;
    var abierta = (nombre in estadoSecs) ? !!estadoSecs[nombre] : /^Macros/.test(nombre);
    function pintar() {
      bloq = (beta && (esCol ? colmenaBloqueo() : betaBloqueo())) || (deEstandar && liteBloqueo());
      caja.className = 'mbh-sec' + (abierta && !bloq ? ' open' : '') + (bloq ? ' lock' : '');
      caja.style.display = bloq ? 'none' : '';
      var fnd = founderLicencia();
      var tierTxt = fnd ? 'FOUNDER' : (goldLicencia() ? 'GOLD' : 'BETA TESTER');
      if (etq) { etq.textContent = bloq ? 'NO DISPONIBLE' : tierTxt; cab.title = bloq ? 'No disponible con tu licencia' : 'Exclusivo ' + tierTxt; }
    }
    cab.onclick = function () {
      if (bloq) { return; }
      abierta = !abierta; estadoSecs[nombre] = abierta; pintar();
      try { localStorage.setItem('minibiaHelperSecs2', JSON.stringify(estadoSecs)); } catch (e) {}
    };
    if (beta || deEstandar) { secsBeta.push(pintar); }
    if (beta) {
      cab.textContent = nombre.replace(/ \(.*$/, '');
      etq = elc('span', 'mbh-beta', ''); cab.appendChild(etq);
    }
    pintar();
    caja.appendChild(cab); caja.appendChild(cont);
    if (pag === 'Alertas' && nombre.indexOf('Alertas') === 0 && paginas[pag].firstChild) { paginas[pag].insertBefore(caja, paginas[pag].firstChild); } else { paginas[pag].appendChild(caja); }
    return cont;
  }
  function subtitulo(t) { return elc('div', 'mbh-sub', t); }
  function filaBtns(lista) {
    var f = elc('div', 'mbh-btns');
    lista.forEach(function (b) { f.appendChild(b); });
    return f;
  }

  var licInfoEl = null;
  function textoLicencia() {
    var r = licDe(charActual);
    if (!r) { var v = licVencida(charActual); return v ? 'Licencia ' + (LIC_NOMBRE[v.tipo] || '') + ' vencida el ' + licFecha(v.fin) + ' · renueva con ' + (v.vend && licVend[v.vend] ? licVendNombre(v.vend) + ' u ' : '') + 'Osbeliaal' : ('Sin licencia' + (charActual ? ' para ' + charActual : '')); }
    return 'Licencia: ' + (r.tipo === 'founder' ? 'Founder (todo incluido, todos tus personajes)' : (r.tipo === 'beta' ? 'Beta tester (permanente)' : (LIC_NOMBRE[r.tipo] || r.tipo) + ' · vence ' + licFecha(r.fin))) + ' · ' + r.nombre + (r.vend ? ' · vendida por ' + licVendNombre(r.vend) : '');
  }
  var betaInfoEl = null, betaPrev = null;
  function refrescarLicencia() {
    if (licInfoEl) { licInfoEl.textContent = textoLicencia(); }
    refrescarBeta();
  }
  function refrescarBeta() {
    var b = betaBloqueo(), fnd = founderLicencia(), lite = liteBloqueo(), clave = b + '|' + fnd + '|' + lite + '|' + goldLicencia();
    if (clave !== betaPrev) {
      betaPrev = clave;
      secsBeta.forEach(function (f) { try { f(); } catch (e) {} });
      if (betaInfoEl) { betaInfoEl.textContent = fnd ? 'Licencia Founder: Colmena, Cave hunt y Combo runa activados para ti.' : (goldLicencia() ? 'Licencia Gold: Cave hunt y Combo runa activados para ti.' : 'Combo runa y Cave hunt: activados para ti (exclusivo Beta tester).'); betaInfoEl.style.display = b ? 'none' : ''; }
      // Sin desbloqueo Beta tester, Combo runa y Cave hunt (y la pestaña Caza) ni siquiera se ven
      if (tabBtns['Caza']) { tabBtns['Caza'].style.display = b ? 'none' : ''; }
      if (b && tabActiva === 'Caza') { elegirTab('Runas'); }
      // Lite: sin combate ni Combo runa, la pestaña Combate queda vacía
      if (tabBtns['Combate']) { tabBtns['Combate'].style.display = lite ? 'none' : ''; }
      if (lite && tabActiva === 'Combate') { elegirTab('Runas'); }
    }
  }
  // ----- Aviso para la licencia Lite: mejorar o pedir una prueba de 1 día -----
  var upsellEl = elc('div', '', ''); upsellEl.id = 'mbh-upsell';
  upsellEl.style.cssText = 'display:none;margin:0 0 8px;padding:8px 10px;border:1px solid #f5c542;background:linear-gradient(180deg,rgba(245,197,66,.14),rgba(245,197,66,.04));font-size:12px;line-height:1.45';
  upsellEl.appendChild(elc('div', '', '¿Quieres más funciones? Tienes la licencia Lite (un solo personaje).'));
  upsellEl.appendChild(elc('div', '', 'Escríbele a Osbeliaal para mejorar tu licencia a Estándar o Gold (sirven para todos tus personajes), o pide una prueba de 1 día con todo lo de Gold. Al terminar la prueba vuelves a tu Lite.'));
  upsellEl.appendChild(elc('div', '', '✉ Osbeliaal@gmail.com · ✈ Telegram @osbeliaal'));
  upsellEl.firstChild.style.cssText = 'font-weight:700;color:#ffd166';
  upsellEl.lastChild.style.cssText = 'margin-top:3px;color:#ececec';
  var upsellContacto = upsellEl.lastChild;
  var btnUpLic = boton('🔑 Activar licencia nueva');
  btnUpLic.style.marginTop = '6px';
  btnUpLic.onclick = function () { pedirLicencia(); };
  upsellEl.appendChild(btnUpLic);
  try { paginas['Runas'].insertBefore(upsellEl, paginas['Runas'].firstChild); } catch (e) {}
  // Cuando termina la prueba de 1 día: avisa, detiene lo que ya no incluye y borra la prueba vencida
  var licTipoPrev = null;
  setInterval(function () {
    try {
      var r = licDe(charActual), t = r ? r.tipo : null;
      upsellEl.style.display = (t === 'lite' || t === 'prueba') ? '' : 'none';
      var up1 = t === 'prueba' ? 'Estás usando la prueba Gold (vence ' + licFecha(r.fin) + ').' : '¿Quieres más funciones? Tienes la licencia Lite (un solo personaje).';
      var up2 = t === 'prueba' ? '¿Ya compraste tu licencia? Toca «Activar licencia nueva» y pégala: se quita la prueba y queda la que compraste.' : 'Escríbele a Osbeliaal para mejorar tu licencia a Estándar o Gold (sirven para todos tus personajes), o pide una prueba de 1 día con todo lo de Gold. Al terminar la prueba vuelves a tu Lite.';
      if (t && upsellEl.firstChild.textContent !== up1) { upsellEl.firstChild.textContent = up1; upsellEl.childNodes[1].textContent = up2; }
      if (t === 'lite' || t === 'prueba') { var uv = r.vend && licVend[r.vend] && !licVendCortada(r) ? licVend[r.vend] : null, ut = uv ? '🛒 ' + uv.n + (uv.c ? ' · ' + uv.c : '') + '  ·  ✉ Osbeliaal@gmail.com' : '✉ Osbeliaal@gmail.com · ✈ Telegram @osbeliaal'; if (upsellContacto.textContent !== ut) { upsellContacto.textContent = ut; } }
      if (licPruebaQuitada) { licPruebaQuitada = false; licTipoPrev = t; betaPrev = null; try { refrescarLicencia(); } catch (e) {} }
      if (licTipoPrev === 'prueba' && t !== 'prueba' && charActual) {
        alertar('lic', '⏰ Tu prueba de 1 día terminó' + (t ? ': volviste a tu licencia ' + LIC_NOMBRE[t] : '') + '. Para seguir con todo, escríbele a ' + licContacto(r || licLeer()[licCharNorm(charActual) + '|prueba']) + '.');
        try { if (cazaCorriendo && betaBloqueo()) { cazaParar('la prueba terminó'); } } catch (e) {}
        var o = licLeer(), cambio = false;
        Object.keys(o).forEach(function (k) { if (o[k] && o[k].tipo === 'prueba' && !licVigente(o[k])) { delete o[k]; cambio = true; } });
        if (cambio) { licGuardar(o); }
        betaPrev = null; try { refrescarLicencia(); } catch (e) {}
      }
      licTipoPrev = t;
    } catch (e) {}
  }, 4000);

  // ----- Pestaña "Acerca de" -----
  (function () {
    var pg = paginas['Acerca de'];
    var w = elc('div', 'mbh-about'), t = elc('div', 'mbh-about-t'), marco = elc('div', 'mbh-marco'), fig = elc('div', 'mbh-fig');
    t.appendChild(elc('h3', '', 'Minibia Helper'));
    t.appendChild(elc('div', '', 'Versión ' + VERSION + ' · asistente para Minibia.'));
    licInfoEl = elc('div', '', '');
    licInfoEl.style.cssText = 'margin:4px 0;color:#f5a400;font-weight:700';
    t.appendChild(licInfoEl);
    var btnNov = boton('Novedades y guía');
    btnNov.onclick = function () { if (novModal) { novModal.remove(); novModal = null; } mostrarNovedades(); };
    var btnLicN = boton('Activar otra licencia');
    btnLicN.title = 'Para pegar una licencia nueva: renovar, subir de Lite a Estándar o Gold, o una prueba de 1 día';
    btnLicN.onclick = function () { pedirLicencia(); };
    var btnLicLista = boton('Mis licencias');
    btnLicLista.title = 'Ver y quitar las licencias guardadas en este dispositivo';
    t.appendChild(filaBtns([btnNov, btnLicN, btnLicLista]));
    // Código de referido de este personaje
    var refCaja = el('div', 'margin:6px 0;padding:6px 8px;border:1px solid #3a5a2a;background:rgba(159,232,112,.06);font-size:12px', '');
    var refTxt = el('div', 'font-weight:700;color:#9fe870', 'Tu código de referido: …');
    var refExp = el('div', 'color:#c8c8c8;margin-top:2px', 'Compártelo: si alguien nuevo compra su licencia y da tu código, te regalamos 3 días extra en tu licencia.');
    var btnRefCop = boton('Copiar mi código');
    refCaja.appendChild(refTxt); refCaja.appendChild(refExp); refCaja.appendChild(filaBtns([btnRefCop]));
    t.appendChild(refCaja);
    var refActual = '';
    function pintarRef() {
      if (!charActual || !(window.crypto && crypto.subtle)) { refCaja.style.display = 'none'; return; }
      codigoReferido(charActual).then(function (c) { refActual = c; refCaja.style.display = ''; var tx = 'Tu código de referido: ' + c; if (refTxt.textContent !== tx) { refTxt.textContent = tx; } }, function () {});
    }
    btnRefCop.onclick = function () {
      if (!refActual) { return; }
      var msg = 'Usa mi código ' + refActual + ' al comprar tu licencia de Minibia Helper: https://osbeliaal.github.io/ox-files/';
      try { navigator.clipboard.writeText(msg).then(function () { toast('Código copiado'); }, function () { toast('Tu código: ' + refActual); }); } catch (e) { toast('Tu código: ' + refActual); }
    };
    setInterval(pintarRef, 3000); setTimeout(pintarRef, 500);
    var licLista = elc('div', '', ''); licLista.style.cssText = 'display:none;margin:6px 0;padding:6px 8px;border:1px solid #3a3d3d;background:#1b1d1d;font-size:12px';
    t.appendChild(licLista);
    function pintarLicLista() {
      licLista.innerHTML = '';
      var o = licLeer(), ks = Object.keys(o);
      licLista.appendChild(el('div', 'font-weight:700;color:#ececec;margin-bottom:4px', 'Licencias guardadas en este dispositivo'));
      if (!ks.length) { licLista.appendChild(el('div', 'color:#9a9d9d', 'No hay licencias guardadas.')); return; }
      var usada = licDe(charActual);
      ks.forEach(function (k) {
        var r = o[k]; if (!r) { return; }
        var fila = el('div', 'display:flex;gap:6px;align-items:center;border-top:1px solid #2c2f2f;padding:5px 0', '');
        var txt = el('div', 'flex:1;min-width:0', (LIC_NOMBRE[r.tipo] || r.tipo) + ' · ' + (r.nombre || k) + (licConFecha(r.tipo) ? ' · ' + (licVigente(r) ? 'vence ' : 'venció ') + licFecha(r.fin) : '') + (r.vend ? ' · vendida por ' + licVendNombre(r.vend) : '') + (usada && usada.key === r.key ? '  ✔ en uso' : ''));
        txt.style.color = licVigente(r) ? '#dcdcdc' : '#9a9d9d';
        var b = boton('Quitar');
        b.onclick = function () {
          if (!confirmTr('¿Quitar la licencia ' + (LIC_NOMBRE[r.tipo] || r.tipo) + ' de ' + (r.nombre || k) + ' de este dispositivo? Podrás volver a activarla pegándola otra vez.')) { return; }
          var q = licLeer(); delete q[k]; licGuardar(q); delete licOk[k];
          betaPrev = null; licTipoPrev = null;
          try { refrescarLicencia(); } catch (e) {}
          ultimaAccion = 'licencia quitada: ' + (r.nombre || k);
          pintarLicLista();
        };
        fila.appendChild(txt); fila.appendChild(b); licLista.appendChild(fila);
      });
      trRaiz(licLista);
    }
    btnLicLista.onclick = function () { var ver = licLista.style.display === 'none'; licLista.style.display = ver ? 'block' : 'none'; if (ver) { pintarLicLista(); } };
    refrescarLicencia();
    var ul = document.createElement('ul');
    [
      'Corre en tu navegador.',
      'La configuración se guarda por personaje, en el almacenamiento local del navegador.',
      ES_MOVIL ? 'Toca el botón redondo para abrir o cerrar el panel; arrástralo para moverlo. Desliza con 2 dedos hacia un lado (en cualquier parte de la pantalla) para ocultar o mostrar el botón. En los campos de tecla escribe el número de la casilla del hotbar (1–8): el Helper la usa sin que toques la pantalla.' : 'Atajos: Ctrl+Shift+H muestra u oculta el panel; Ctrl+Shift+K activa el modo marcar.',
      ''
    ].forEach(function (x) { var li = document.createElement('li'); li.textContent = x; ul.appendChild(li); betaInfoEl = li; });
    var contacto = elc('div', '', '');
    contacto.style.cssText = 'margin:6px 0;padding:6px 8px;border-left:3px solid #f5a400;background:rgba(245,164,0,.08);font-size:12px';
    contacto.appendChild(elc('div', '', 'Licencias, renovaciones y soporte: escríbele a Osbeliaal'));
    contacto.appendChild(elc('div', '', '✉ Correo: Osbeliaal@gmail.com'));
    contacto.appendChild(elc('div', '', '✈ Telegram: @osbeliaal'));
    betaPrev = null; refrescarLicencia();
    setInterval(function () { try { refrescarBeta(); } catch (e) {} }, 3000);
    t.appendChild(ul);
    t.appendChild(contacto);
    var img = document.createElement('img'); img.alt = ''; img.draggable = false; img.src = PERSONAJE_URI;
    fig.appendChild(img);
    var o1 = elc('span', 'mbh-ojo'), o2 = elc('span', 'mbh-ojo b');
    o1.style.left = '39.6%'; o1.style.top = '24.4%'; o2.style.left = '45.5%'; o2.style.top = '24.2%';
    fig.appendChild(o1); fig.appendChild(o2);
    marco.appendChild(fig);
    w.appendChild(t); w.appendChild(marco); var by = elc('div', 'mbh-by'), byImg = document.createElement('img'); byImg.src = BY_URI; byImg.alt = 'By Osbeliaal'; byImg.draggable = false; by.appendChild(byImg); w.appendChild(by);
    // 6 toques seguidos sobre "By Osbeliaal": activa/desactiva Combo runa y Cave hunt (solo licencia Beta tester)
    var byToques = 0, byUlt = 0;
    by.style.touchAction = 'manipulation';
    by.addEventListener('click', function () {
      var ahora = Date.now();
      byToques = (ahora - byUlt < 1500) ? byToques + 1 : 1; byUlt = ahora;
      if (byToques < 6) { return; }
      byToques = 0;
      if (!betaLicencia() || founderLicencia() || !charActual) { return; }
      var o = {}; try { o = JSON.parse(localStorage.getItem(KEY_BETA_ON) || '{}') || {}; } catch (e) { o = {}; }
      var n = licCharNorm(charActual), on = !o[n];
      if (on) { o[n] = true; } else { delete o[n]; }
      try { localStorage.setItem(KEY_BETA_ON, JSON.stringify(o)); } catch (e) {}
      if (!on) { try { if (cazaCorriendo) { cazaParar('Cave hunt desactivado'); } } catch (e) {} }
      refrescarBeta();
      toast(on ? 'Combo runa y Cave hunt activados' : 'Combo runa y Cave hunt desactivados');
    }); pg.appendChild(w);
  })();

  panel.appendChild(cabecera);
  panel.appendChild(cuerpo);
  panel.appendChild(mini);

  // Mover la ventana arrastrando la barra de título (se recuerda la posición)
  (function () {
    var KEY_POS = 'minibiaHelperPos';
    function fijar(x, y) {
      var w = panel.offsetWidth || 540;
      x = Math.max(0, Math.min(window.innerWidth - Math.min(w, 80), x));
      y = Math.max(0, Math.min(window.innerHeight - 28, y));
      panel.style.left = x + 'px'; panel.style.top = y + 'px'; panel.style.bottom = 'auto';
    }
    try {
      var g = JSON.parse(localStorage.getItem(KEY_POS) || 'null');
      if (!ES_MOVIL && g && typeof g.x === 'number' && typeof g.y === 'number') { fijar(g.x, g.y); }
    } catch (e) {}
    var arr = null;
    cabecera.addEventListener('mousedown', function (e) {
      if (ES_MOVIL || e.button !== 0 || e.target === btnMin) { return; }
      var r = panel.getBoundingClientRect();
      arr = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      e.preventDefault();
    });
    document.addEventListener('mousemove', function (e) { if (arr) { fijar(e.clientX - arr.dx, e.clientY - arr.dy); } });
    document.addEventListener('mouseup', function () {
      if (!arr) { return; }
      arr = null;
      try { var r = panel.getBoundingClientRect(); localStorage.setItem(KEY_POS, JSON.stringify({ x: Math.round(r.left), y: Math.round(r.top) })); } catch (e) {}
    });
    window.addEventListener('resize', function () {
      if (!ES_MOVIL && panel.style.top) { var r = panel.getBoundingClientRect(); fijar(r.left, r.top); }
    });
  })();

  // ===== SECCIÓN 1: PERFILES =====
  var sPerfil = seccion('Perfil del personaje');
  var perfilInfo = el('div', 'color:#8f8;font-size:11px;margin:2px 0 4px', 'Personaje: (entra al juego para cargar su configuración)');
  var inpPerfilNombre = inputBase('text', 140);
  inpPerfilNombre.placeholder = 'Nombre de la copia';
  var btnGuardarPerfil = boton('Guardar copia');
  var btnCargarPerfil = boton('Cargar');
  var btnBorrarPerfil = boton('Borrar');
  var btnResetCfg = boton('Valores por defecto');
  var selPerfil = document.createElement('select');
  selPerfil.className = 'mbh-in'; selPerfil.style.maxWidth = '210px';

  var filaPerfil1 = el('div', 'display:flex;gap:4px;align-items:center;flex-wrap:wrap;margin:3px 0');
  filaPerfil1.appendChild(inpPerfilNombre);
  filaPerfil1.appendChild(btnGuardarPerfil);
  var filaPerfil2 = el('div', 'display:flex;gap:4px;align-items:center;flex-wrap:wrap;margin:3px 0');
  filaPerfil2.appendChild(selPerfil);
  filaPerfil2.appendChild(btnCargarPerfil);
  filaPerfil2.appendChild(btnBorrarPerfil);
  sPerfil.appendChild(perfilInfo);
  sPerfil.appendChild(el('div', 'font-size:11px;color:#9a9', 'Tu configuración y ruta se guardan solas por personaje. Las copias son versiones con nombre para cambiar rápido.'));
  sPerfil.appendChild(filaPerfil1);
  sPerfil.appendChild(filaPerfil2);
  sPerfil.appendChild(filaBtns([btnResetCfg]));

  function actualizarListaPerfiles() {
    var claves = clavesPerfil();
    selPerfil.innerHTML = '';
    if (!claves.length) {
      var opt = document.createElement('option');
      opt.value = ''; opt.textContent = '(sin copias guardadas)';
      selPerfil.appendChild(opt);
      return;
    }
    claves.forEach(function (c) {
      var o = document.createElement('option');
      o.value = c;
      o.textContent = c.replace(charActual + '::', '');
      selPerfil.appendChild(o);
    });
  }
  actualizarListaPerfiles();
  btnGuardarPerfil.onclick = function () { guardarPerfil(inpPerfilNombre.value); };
  btnCargarPerfil.onclick = function () { if (selPerfil.value) { cargarPerfil(selPerfil.value); } };
  btnBorrarPerfil.onclick = function () { if (selPerfil.value) { borrarPerfil(selPerfil.value); } };
  btnResetCfg.onclick = function () {
    if (!confirmTr('¿Volver TODA la configuración de este personaje a los valores por defecto?')) { return; }
    aplicarCfg(CFG_DEFECTO);
    guardarCfg();
    ultimaAccion = 'configuración restablecida a los valores por defecto';
  };

  // ===== SECCIÓN 2: TRAINING =====
  var sTraining = seccion('Training, runas y anti-idle');
  var fTrainOn = campo('Training mode activo', 'checkbox', 16);
  var fTrainNombre = campo('Nombres (separados por coma)', 'text', 170);
  var fTrainPausa = campo('Dejar de atacarlo si su vida ≤ %', 'number', 50);
  var fTrainReanuda = campo('Volver a atacarlo cuando su vida ≥ %', 'number', 50);
  var fTrainHold = campo('Mantener mi posición (si me mueven, regreso)', 'checkbox', 16);
  var fTrainMi = campo('Pausar si MI vida ≤ % (0 = nunca)', 'number', 50);
  var fTrainPostura = campoSelect('Posición de ataque', [
    { val: 'defensive', txt: 'Full defense' },
    { val: 'balanced',  txt: 'Balanced' },
    { val: 'offensive', txt: 'Full attack' },
    { val: 'ninguno',   txt: '(No cambiar)' }
  ]);
  var fTrainChase = campoSelect('Movimiento al atacar', [
    { val: 'stand',     txt: 'Stand (no seguir)' },
    { val: 'chase',     txt: 'Chase (seguir objetivo)' },
    { val: 'ninguno',   txt: '(No cambiar)' }
  ]);
  var btnProbarAt = boton('Probar ataque');
  var btnProbarModo = boton('Aplicar postura/chase');
  var filaTrain = el('div', 'display:flex;gap:4px;flex-wrap:wrap;margin:4px 0');
  filaTrain.appendChild(btnProbarAt);
  filaTrain.appendChild(btnProbarModo);

  sTraining.appendChild(subtitulo('Skilling con objetivo'));
  sTraining.appendChild(el('div', 'font-size:11px;color:#ffd166;margin:2px 0 6px', 'Cómo funciona: ataca SOLO a los personajes que estén en tu party y cuyo nombre escribas aquí (si escribes un monstruo, como Monk, también lo ataca). Se queda quieto en su casilla: si lo empujan, regresa. Cuando el objetivo baja a la vida que pongas (15 % por defecto) deja de atacarlo y cambia a otro de la lista, o espera a que se cure. Si tu propia vida baja demasiado, se pausa y te avisa.'));
  sTraining.appendChild(ligar(fTrainOn, 'trainOn', 'checkbox'));
  sTraining.appendChild(ligar(fTrainNombre, 'trainNombre', 'text'));
  sTraining.appendChild(ligar(fTrainPausa, 'trainPausaPct', 'number'));
  sTraining.appendChild(ligar(fTrainReanuda, 'trainReanudaPct', 'number'));
  sTraining.appendChild(ligar(fTrainHold, 'trainHold', 'checkbox'));
  sTraining.appendChild(ligar(fTrainMi, 'trainMiPct', 'number'));
  sTraining.appendChild(ligar(fTrainPostura, 'trainPostura', 'select'));
  sTraining.appendChild(ligar(fTrainChase, 'trainChase', 'select'));
  var fTrainPiedras = campo('Subir small stones a la mano cuando se acaben', 'checkbox', 16);
  var fTrainPiedrasMin = campo('Rellenar cuando queden menos de', 'number', 50);
  sTraining.appendChild(ligar(fTrainPiedras, 'trainPiedrasOn', 'checkbox'));
  sTraining.appendChild(ligar(fTrainPiedrasMin, 'trainPiedrasMin', 'number'));
  sTraining.appendChild(el('div', 'font-size:11px;color:#9a9', 'Mientras el training está activo: si tus small stones de la mano se acaban (o quedan pocas), toma más de tu mochila abierta y las pone en la misma mano.'));
  sTraining.appendChild(filaTrain);

  sTraining.appendChild(subtitulo('Runas y comida'));
  var fRunasOn = campo('Runas y comida activas', 'checkbox', 16);
  var fHechizo = campo('Hechizo', 'text', 170);
  var fMana = campo('Mana por hechizo', 'number', 70);
  var fComer = campo('Comer automáticamente', 'checkbox', 16);
  var fTecla = campo('Tecla de comida (hotbar)', 'text', 60);
  var fSeg = campo('Seg. sin subir mana p/ comer', 'number', 60);
  var fCapOn = campo('Parar runas si la cap es baja', 'checkbox', 16);
  var fCapMin = campo('Cap mínima (parar si es menor)', 'number', 50);
  var fPzOn = campo('No comer en protection zone', 'checkbox', 16);
  sTraining.appendChild(ligar(fRunasOn, 'runasOn', 'checkbox'));
  sTraining.appendChild(ligar(fHechizo, 'hechizo', 'text'));
  sTraining.appendChild(ligar(fMana, 'mana', 'number'));
  sTraining.appendChild(filaRango('Espera tras tener mana (s)', 'esperaMin', 'esperaMax'));
  sTraining.appendChild(ligar(fComer, 'comer', 'checkbox'));
  sTraining.appendChild(ligar(fTecla, 'teclaComida', 'text'));
  sTraining.appendChild(ligar(fSeg, 'segSinSubir', 'number'));
  sTraining.appendChild(ligar(fPzOn, 'pzOn', 'checkbox'));
  sTraining.appendChild(ligar(fCapOn, 'capOn', 'checkbox'));
  sTraining.appendChild(ligar(fCapMin, 'capMin', 'number'));

  sTraining.appendChild(subtitulo('Alerta de vida (durante runas)'));
  var fAlertaOn = campo('Alerta de vida baja', 'checkbox', 16);
  var fAlertaPct = campo('Alertar si HP ≤ %', 'number', 50);
  var fAlertaHeal = campo('Activar autoheal al alertar', 'checkbox', 16);
  sTraining.appendChild(ligar(fAlertaOn, 'alertaVidaOn', 'checkbox'));
  sTraining.appendChild(ligar(fAlertaPct, 'alertaVidaPct', 'number'));
  sTraining.appendChild(ligar(fAlertaHeal, 'alertaVidaHeal', 'checkbox'));

  sTraining.appendChild(subtitulo('Anti-idle'));
  var fIdleOn = campo('Anti-idle activo', 'checkbox', 16);
  var fIdleMod = campo('Modificador (shift o ctrl)', 'text', 60);
  var btnProbarIdle = boton('Probar anti-idle');
  var filaIdle = el('div', 'margin:4px 0');
  filaIdle.appendChild(btnProbarIdle);
  sTraining.appendChild(ligar(fIdleOn, 'idleOn', 'checkbox'));
  sTraining.appendChild(ligar(fIdleMod, 'idleMod', 'text'));
  sTraining.appendChild(filaRango('Intervalo aleatorio (min)', 'idleMin', 'idleMax'));
  sTraining.appendChild(filaIdle);

  // ===== SECCIÓN 3: AUTOHEAL =====
  var sHeal = seccion('Autoheal (el primero que cumpla se lanza)');
  var fHealOn = campo('Autoheal activo', 'checkbox', 16);
  var cabCuras = el('div', 'display:flex;gap:4px;color:#8f8;margin-top:3px');
  cabCuras.appendChild(el('span', 'width:44px', ''));
  cabCuras.appendChild(el('span', 'width:120px', 'Hechizo'));
  cabCuras.appendChild(el('span', 'width:50px', 'Mana'));
  cabCuras.appendChild(el('span', 'width:50px', 'HP ≤ %'));

  function filaCura(i) {
    var fila = el('div', 'display:flex;gap:4px;align-items:center;margin:3px 0');
    fila.appendChild(el('span', 'width:44px', 'Cura ' + (i + 1)));
    var t = inputBase('text', 120), m = inputBase('number', 50), p = inputBase('number', 50);
    t.value = cfg.heals[i].texto; m.value = cfg.heals[i].mana; p.value = cfg.heals[i].hp;
    t.oninput = function () { cfg.heals[i].texto = t.value; guardarCfg(); };
    m.oninput = function () { cfg.heals[i].mana = Number(m.value) || 0; guardarCfg(); };
    p.oninput = function () { cfg.heals[i].hp = Number(p.value) || 0; guardarCfg(); };
    fila.appendChild(t); fila.appendChild(m); fila.appendChild(p);
    refrescadores.push(function () { t.value = cfg.heals[i].texto; m.value = cfg.heals[i].mana; p.value = cfg.heals[i].hp; });
    return fila;
  }
  sHeal.appendChild(ligar(fHealOn, 'healOn', 'checkbox'));
  sHeal.appendChild(cabCuras);
  sHeal.appendChild(filaCura(0));
  sHeal.appendChild(filaCura(1));
  sHeal.appendChild(filaCura(2));

  // ===== SECCIÓN 4: POCIONES =====
  var sLife = seccion('Autolife (poción de vida con hotbar)');
  var fHpPotOn = campo('Autolife activo', 'checkbox', 16);
  var fHpPotTecla = campo('Tecla de poción', 'text', 60);
  var fHpPotPct = campo('Usar si HP ≤ %', 'number', 50);
  sLife.appendChild(ligar(fHpPotOn, 'hpPotOn', 'checkbox'));
  sLife.appendChild(ligar(fHpPotTecla, 'hpPotTecla', 'text'));
  sLife.appendChild(ligar(fHpPotPct, 'hpPotPct', 'number'));
  sLife.appendChild(filaRango('Intervalo entre usos (s)', 'hpPotIntMin', 'hpPotIntMax'));

  var sMana = seccion('Automana (poción con hotbar)');
  var fManaOn = campo('Automana activo', 'checkbox', 16);
  var fManaTecla = campo('Tecla de poción', 'text', 60);
  var fManaPct = campo('Usar si mana ≤ %', 'number', 50);
  sMana.appendChild(ligar(fManaOn, 'manaOn', 'checkbox'));
  sMana.appendChild(ligar(fManaTecla, 'manaTecla', 'text'));
  sMana.appendChild(ligar(fManaPct, 'manaPct', 'number'));
  sMana.appendChild(filaRango('Intervalo entre usos (s)', 'manaIntMin', 'manaIntMax'));

  // ===== SECCIÓN 5: COMBO RUNA =====
  var sHaste = seccion('Autohaste (mantener el haste)');
  var fAutoHasteOn = campo('Autohaste activo', 'checkbox', 16);
  var fAutoHasteHechizo = campoSelect('Hechizo de haste', [
    { val: 'utani hur', txt: 'utani hur (Haste)' },
    { val: 'utani gran hur', txt: 'utani gran hur (Strong haste)' }
  ]);
  var fAutoHasteMana = campo('Lanzarlo solo si tengo MP ≥ (0 = lo que cuesta)', 'number', 60);
  sHaste.appendChild(ligar(fAutoHasteOn, 'autoHasteOn', 'checkbox'));
  sHaste.appendChild(ligar(fAutoHasteHechizo, 'autoHasteHechizo', 'select'));
  sHaste.appendChild(ligar(fAutoHasteMana, 'autoHasteMana', 'number'));
  sHaste.appendChild(el('div', 'font-size:11px;color:#9a9', 'Cuando se te acaba el haste lo vuelve a lanzar, solo si tienes el maná suficiente (utani hur cuesta 60 y utani gran hur 100). Si no te alcanza, no lo lanza. Funciona siempre que esté activo (cazando o no), menos en protection zone.'));

  var sAutoH = seccion('Autohechizos (utamo vita y utana vid)');
  var fUtamoOn = campo('Auto utamo vita (magic shield)', 'checkbox', 16);
  var fUtamoModo = campoSelect('Cuándo lanzarlo', [
    { val: 'siempre', txt: 'Siempre activo (relanzar al terminar)' },
    { val: 'vida', txt: 'Solo si mi vida baja de…' }
  ]);
  var fUtamoPct = campo('Vida (%) para lanzarlo', 'number', 50);
  var fUtamoMana = campo('Maná que cuesta (utamo vita)', 'number', 50);
  var fUtanaOn = campo('Auto utana vid (invisible)', 'checkbox', 16);
  var fUtanaMana = campo('Maná que cuesta (utana vid)', 'number', 50);
  sAutoH.appendChild(ligar(fUtamoOn, 'utamoOn', 'checkbox'));
  sAutoH.appendChild(ligar(fUtamoModo, 'utamoModo', 'select'));
  sAutoH.appendChild(ligar(fUtamoPct, 'utamoVidaPct', 'number'));
  sAutoH.appendChild(ligar(fUtamoMana, 'utamoMana', 'number'));
  sAutoH.appendChild(ligar(fUtanaOn, 'utanaOn', 'checkbox'));
  sAutoH.appendChild(ligar(fUtanaMana, 'utanaMana', 'number'));
  sAutoH.appendChild(el('div', 'font-size:11px;color:#9a9', 'Cuando se te acaba el efecto lo vuelve a lanzar, solo si tienes el maná suficiente y no estás en protection zone. Utamo vita: elige si lo quieres siempre puesto o solo cuando tu vida baje del % que pongas.'));
  var lblAutoH = el('div', 'color:#8f8;font-size:11px;margin:2px 0', 'Utamo vita: apagado · Utana vid: apagado');
  sAutoH.appendChild(lblAutoH);
  setInterval(function () { try { lblAutoH.textContent = 'Utamo vita: ' + autoHech.utamo.estado + ' · Utana vid: ' + autoHech.utana.estado; } catch (e) {} }, 1000);

  var sCasa = seccion('Casa: refugio contra PKs al runear');
  sCasa.appendChild(el('div', 'font-size:11px;color:#ffd166;margin:2px 0 6px', 'Si aparece un jugador con calavera o uno que te ataca, el helper camina a tu casa. Cuando pasa el tiempo que elijas sin verlo, regresa a tu lugar de runeo. IMPORTANTE: mete a party a todos tus farmers (y/o escribe sus nombres abajo) para que no los confunda con PKs. Si runeas con uno solo, deja la casilla de farmers vacía.'));
  var fCasaOn = campo('Refugiarme en la casa si veo un PK', 'checkbox', 16);
  var fCasaEspera = campo('Salir después de (segundos sin verlo)', 'number', 50);
  var fCasaFarm = campo('Mis farmers (nombres, separados por coma)', 'text', 170);
  var btnCasaLugar = boton('Marcar mi lugar de runeo'), btnCasaDentro = boton('Marcar casilla dentro de la casa'), btnCasaProbar = boton('Probar: ir a la casa');
  var lblCasaPos = el('div', 'font-size:11px;color:#9a9;margin:2px 0', '');
  var lblCasa = el('div', 'color:#8f8;font-size:11px;margin:2px 0', 'Casa: apagada');
  sCasa.appendChild(ligar(fCasaOn, 'casaOn', 'checkbox'));
  sCasa.appendChild(ligar(fCasaEspera, 'casaEspera', 'number'));
  sCasa.appendChild(ligar(fCasaFarm, 'casaFarmers', 'text'));
  sCasa.appendChild(filaBtns([btnCasaLugar, btnCasaDentro]));
  sCasa.appendChild(lblCasaPos);
  sCasa.appendChild(filaBtns([btnCasaProbar]));
  sCasa.appendChild(lblCasa);
  sCasa.appendChild(subtitulo('Depósito: guardar runas cuando la cap baja'));
  var fCasaDepOn = campo('Guardar runas y munición en un baúl de la casa', 'checkbox', 16);
  var fCasaDepCap = campo('Ir a guardar cuando la cap baje de', 'number', 50);
  var fCasaDepRunas = campo('Guardar runas (no las blank)', 'checkbox', 16);
  var fCasaDepMuni = campo('Guardar munición (flechas y bolts)', 'checkbox', 16);
  var fCasaDepOtros = campo('Otros objetos a guardar (nombres, coma)', 'text', 170);
  var fCasaDepId = campo('ID del baúl/caja (0 = el que esté junto a mí)', 'number', 70);
  var btnCasaDep = boton('Marcar depósito (párate junto al baúl)');
  sCasa.appendChild(ligar(fCasaDepOn, 'casaDepOn', 'checkbox'));
  sCasa.appendChild(ligar(fCasaDepCap, 'casaDepCap', 'number'));
  sCasa.appendChild(ligar(fCasaDepRunas, 'casaDepRunas', 'checkbox'));
  sCasa.appendChild(ligar(fCasaDepMuni, 'casaDepMuni', 'checkbox'));
  sCasa.appendChild(ligar(fCasaDepOtros, 'casaDepOtros', 'text'));
  sCasa.appendChild(ligar(fCasaDepId, 'casaDepId', 'number'));
  sCasa.appendChild(filaBtns([btnCasaDep]));
  sCasa.appendChild(el('div', 'font-size:11px;color:#9a9', 'Cuando tu cap baja del número que pongas, camina al baúl, lo abre, guarda las runas y la munición de tus mochilas abiertas y regresa a tu lugar de runeo. Para marcarlo, párate pegado al baúl (caja, cofre o mochila en el suelo) y toca «Marcar depósito». Si hay varios, escribe el ID del que quieres. Necesita también «Marcar mi lugar de runeo».'));
  btnCasaDep.onclick = function () { depMarcar(); };
  sCasa.appendChild(el('div', 'font-size:11px;color:#9a9', 'Cómo marcarlo: párate donde runeas y toca «Marcar mi lugar de runeo»; luego entra a tu casa, párate en la casilla donde quieres esperar y toca «Marcar casilla dentro de la casa». Si la puerta está cerrada, el helper la abre. Tus personajes en otras pestañas de este navegador también se meten cuando uno ve al PK.'));
  function casaPintar() {
    function t(q) { return q ? q[0] + ', ' + q[1] + ', ' + q[2] : 'sin marcar'; }
    lblCasaPos.textContent = 'Lugar de runeo: ' + t(cfg.casaLugar) + ' · Casa: ' + t(cfg.casaDentro) + ' · Depósito: ' + (cfg.casaDepCaja ? t(cfg.casaDepCaja) + (cfg.casaDepId ? ' (ID ' + cfg.casaDepId + ')' : '') : 'sin marcar');
  }
  btnCasaLugar.onclick = function () { casaMarcar('casaLugar'); };
  btnCasaDentro.onclick = function () { casaMarcar('casaDentro'); };
  btnCasaProbar.onclick = function () { if (!cfg.casaOn || !cfg.casaLugar || !cfg.casaDentro) { toast('Activa la casilla y marca los dos lugares primero'); return; } casa.ultVisto = Date.now(); casa.quien = 'prueba'; casa.fase = 'vigilar'; casa.avisoT = Date.now(); casaTick(); };
  setInterval(function () { try { lblCasa.textContent = 'Casa: ' + casaEstado; casaPintar(); } catch (e) {} }, 1000);

  var sBomb = seccion('Combo runa (seguir al líder)');
  var fBombOn = campo('Combo runa activo', 'checkbox', 16);
  var fBombLider = campo('Líder (vacío = el líder de la party)', 'text', 130);
  var fBombRuna = campo('Runa (vacío = la mejor que tengas)', 'text', 130);
  var fBombRondas = campo('Runas por cada runa del líder', 'number', 50);
  var fBombLock = campo('Si es contra un jugador, quitar el PVP Lock durante el combo (y volver a ponerlo)', 'checkbox', 16);
  var btnBomb = boton('Tirar runa a mi objetivo ahora');
  sBomb.appendChild(ligar(fBombOn, 'bombOn', 'checkbox'));
  sBomb.appendChild(ligar(fBombLider, 'bombLider', 'text'));
  sBomb.appendChild(ligar(fBombRuna, 'bombRuna', 'text'));
  var fBombSeguir = campo('Usar la misma runa que el líder (si la tengo)', 'checkbox', 16);
  var fBombSd = campo('Rematar con SD si el objetivo tiene poca vida', 'checkbox', 16);
  var fBombSdPct = campo('Usar SD si su vida ≤ %', 'number', 50);
  sBomb.appendChild(ligar(fBombSeguir, 'bombSeguirRuna', 'checkbox'));
  sBomb.appendChild(ligar(fBombSd, 'bombSdOn', 'checkbox'));
  sBomb.appendChild(ligar(fBombSdPct, 'bombSdPct', 'number'));
  sBomb.appendChild(el('div', 'font-size:11px;color:#9a9', 'Orden: si el objetivo está en esa vida o menos, tira SD; si no, la misma runa que tiró el líder (HMM, GFB, explosion...); si no la tienes, la que escribiste arriba o la mejor que tengas.'));
  sBomb.appendChild(ligar(fBombRondas, 'bombRondas', 'number'));
  sBomb.appendChild(ligar(fBombLock, 'bombQuitarLock', 'checkbox'));
  sBomb.appendChild(filaRango('Reacción tras el líder (ms)', 'bombReacMin', 'bombReacMax'));
  sBomb.appendChild(filaRango('Entre runas (ms)', 'bombRunaMin', 'bombRunaMax'));
  sBomb.appendChild(el('div', 'font-size:11px;color:#ffd166;margin:2px 0 4px', 'Recomendado (se ve humano): reacción 300 a 1500 ms y entre runas 2200 a 3000 ms. Cada personaje usa su turno dentro del rango, así las runas caen en cadena y no todas en el mismo instante. Entre runas, menos de 2050 ms no sirve: el juego obliga a esperar 2 segundos.'));
  var lblBomb = el('div', 'color:#8f8;font-size:11px;margin:2px 0 4px', 'Combo runa: apagado');
  sBomb.appendChild(lblBomb);
  var filaBomb = el('div', 'margin:4px 0');
  filaBomb.appendChild(btnBomb);
  sBomb.appendChild(filaBomb);
  sBomb.appendChild(el('div', 'font-size:11px;color:#9a9', 'Cuando el líder tira una runa, este personaje tira la suya al mismo objetivo (o a la misma casilla si es de área). Si el objetivo es un jugador, quita el PVP Lock solo durante el combo y lo vuelve a poner (si activas esa opción). Nunca sigue runas que el líder tire a alguien de la party (curas).'));

  // ===== SECCIÓN 6: CAVE HUNT =====
  var sCaza = seccion('Cave hunt (ruta + combate + supervivencia)');
  var btnCazaIniciar = boton('▶ Iniciar cavehunt');
  var btnGrabar = boton('⏺ Grabar ruta');
  var btnBorrarRuta = boton('Borrar ruta');
  var btnCopiarRuta = boton('Copiar ruta');
  var btnPegarRuta = boton('Pegar ruta');
  var btnProbarMov = boton('Probar movimiento');
  var fCazaIdaVuelta = campo('Ir y volver por la ruta', 'checkbox', 16);
  var fCazaMetodo = campo('Método de movimiento (0-2)', 'number', 50);

  sCaza.appendChild(filaBtns([btnCazaIniciar]));
  sCaza.appendChild(subtitulo('1) Ruta grabada'));
  sCaza.appendChild(filaBtns([btnGrabar, btnBorrarRuta, btnCopiarRuta, btnPegarRuta]));
  // Rutas con nombre (sirven para cualquier personaje)
  var inpRutaNombre = inputBase('text', 140);
  inpRutaNombre.placeholder = 'Nombre de la ruta';
  var btnGuardarRutaNom = boton('Guardar ruta');
  var selRutas = document.createElement('select');
  selRutas.className = 'mbh-in'; selRutas.style.maxWidth = '210px';
  var btnCargarRutaNom = boton('Cargar');
  var btnBorrarRutaNom = boton('Borrar');
  var filaRuta1 = el('div', 'display:flex;gap:4px;align-items:center;flex-wrap:wrap;margin:3px 0');
  filaRuta1.appendChild(inpRutaNombre); filaRuta1.appendChild(btnGuardarRutaNom);
  var filaRuta2 = el('div', 'display:flex;gap:4px;align-items:center;flex-wrap:wrap;margin:3px 0');
  filaRuta2.appendChild(selRutas); filaRuta2.appendChild(btnCargarRutaNom); filaRuta2.appendChild(btnBorrarRutaNom);
  var lblRutaActual = el('div', 'color:#8f8;font-size:11px;margin:2px 0 4px', '');
  sCaza.appendChild(lblRutaActual);
  sCaza.appendChild(filaRuta1);
  sCaza.appendChild(filaRuta2);
  var fHlEsp = campo('Resaltar hoyos, rope spots y escaleras (al grabar y cazar)', 'checkbox', 16);
  sCaza.appendChild(ligar(fHlEsp, 'hlEspeciales', 'checkbox'));
  sCaza.appendChild(el('div', 'font-size:11px;color:#9a9', 'Colores: naranja S = hoyo cerrado (shovel), amarillo R = rope spot, verde E = escalera de clic derecho, azul \u2195 = se pisa (escaleras, rampas, hoyos abiertos), morado = punto de espera (spawn) con sus segundos. Mientras grabas, usa la shovel, la rope o la escalera como siempre: el helper anota sola la casilla exacta.'));
  sCaza.appendChild(ligar(fCazaIdaVuelta, 'cazaIdaVuelta', 'checkbox'));
  sCaza.appendChild(ligar(fCazaMetodo, 'cazaMetodoMov', 'number'));
  sCaza.appendChild(filaBtns([btnProbarMov]));

  sCaza.appendChild(subtitulo('1b) Acciones en waypoints (mientras grabas)'));
  var btnWpRope = boton('Rope aquí');
  var btnWpShovel = boton('Shovel aquí');
  var btnWpEscalera = boton('Escalera aquí');
  var btnWpRuna = boton('Runa aquí');
  var btnWpEspera = boton('Esperar aquí (spawn)');
  sCaza.appendChild(filaBtns([btnWpRope, btnWpShovel, btnWpEscalera, btnWpRuna, btnWpEspera]));
  var fCazaEsperaSeg = campo('Segundos de espera en cada spawn', 'number', 50);
  sCaza.appendChild(ligar(fCazaEsperaSeg, 'cazaEsperaSeg', 'number'));
  sCaza.appendChild(el('div', 'font-size:11px;color:#9a9', 'En un punto "Esperar aquí" se queda parado sin perseguir y ataca a los monstruos que se acercan. Cada vez que mata uno vuelve a contar los segundos; si en ese tiempo no aparece nada, sigue la ruta al siguiente spawn.'));
  var fCazaRopeKey = campo('Tecla Rope', 'text', 60);
  var fCazaShovelKey = campo('Tecla Shovel', 'text', 60);
  var fCazaRunaKey = campo('Tecla Runa en WP', 'text', 60);
  sCaza.appendChild(ligar(fCazaRopeKey, 'cazaRopeKey', 'text'));
  sCaza.appendChild(ligar(fCazaShovelKey, 'cazaShovelKey', 'text'));
  sCaza.appendChild(ligar(fCazaRunaKey, 'cazaRunaKey', 'text'));
  sCaza.appendChild(el('div', 'font-size:11px;color:#9a9', 'Rope y shovel se usan solas desde tu mochila abierta (las teclas solo hacen falta si no están ahí). Ladder: párate encima y toca "Escalera aquí". Rampas, escaleras que se pisan y hoyos no necesitan marca.'));

  sCaza.appendChild(subtitulo('2) Combate'));
  var fCazaObj = campo('Monstruos a atacar (coma)', 'text', 170);
  var btnAddObj = boton('Añadir objetivo actual');
  var btnScan = boton('📡 Agregar monstruos de alrededor');
  var fCazaRango = campo('Rango de detección (casillas)', 'number', 50);
  var fCazaAcercar = campo('Perseguir al objetivo (modo chase)', 'checkbox', 16);
  var fCazaTeclaAtq = campo('Tecla de ataque/hechizo (opc.)', 'text', 60);
  var fCazaTeclaObj = campo('Tecla para fijar objetivo (opc.)', 'text', 60);
  [fTecla, fHpPotTecla, fManaTecla, fCazaRopeKey, fCazaShovelKey, fCazaRunaKey, fCazaTeclaAtq, fCazaTeclaObj].forEach(function (f) {
    try { f.input.placeholder = ES_MOVIL ? 'n.º' : 'F1'; f.input.title = ES_MOVIL ? 'Número de la casilla del hotbar (1–8) o F1–F12' : 'Tecla F1–F12, número o letra'; } catch (e) {}
  });
  sCaza.appendChild(ligar(fCazaObj, 'cazaObjetivos', 'text'));
  sCaza.appendChild(filaBtns([btnScan, btnAddObj]));
  sCaza.appendChild(el('div', 'font-size:11px;color:#9a9', 'Los monstruos se guardan junto con la ruta con nombre: al cargar la ruta vuelven solos. «Agregar monstruos de alrededor» escribe los que ves en pantalla (sin jugadores, NPCs ni invocaciones).'));
  sCaza.appendChild(ligar(fCazaRango, 'cazaRango', 'number'));
  sCaza.appendChild(ligar(fCazaAcercar, 'cazaAcercar', 'checkbox'));
  sCaza.appendChild(ligar(fCazaTeclaAtq, 'cazaTeclaAtaque', 'text'));
  sCaza.appendChild(filaRango('Intervalo de ataque (s)', 'cazaAtqMin', 'cazaAtqMax'));
  sCaza.appendChild(ligar(fCazaTeclaObj, 'cazaTeclaObjetivo', 'text'));
  sCaza.appendChild(el('div', 'font-size:11px;color:#9a9', 'Fija un objetivo y no lo suelta hasta que muere (hold target). Con "Tecla para fijar objetivo" usa esa casilla (ej. Atacar al más cercano); si la dejas vacía ataca a los monstruos de la lista. Si no puede alcanzar a uno en 10 s, lo ignora un rato.'));
  sCaza.appendChild(el('div', 'font-size:11px;color:#9a9', 'La ruta se camina con el buscador de caminos del juego: si algo bloquea el paso, busca otro camino.'));

  sCaza.appendChild(subtitulo('3) Kiting (para magos)'));
  var fCazaKit = campo('Kiting activo (correr de los monstruos)', 'checkbox', 16);
  sCaza.appendChild(ligar(fCazaKit, 'cazaKiting', 'checkbox'));
  var fCazaKitDist = campo('Distancia a mantener (sqm)', 'number', 50);
  sCaza.appendChild(ligar(fCazaKitDist, 'cazaKitDist', 'number'));
  var fCazaEsq = campo('Esquivar ondas y rayos (pararme en diagonal)', 'checkbox', 16);
  var fCazaEsqM = campo('Monstruos con onda o rayo (coma)', 'text', 170);
  sCaza.appendChild(ligar(fCazaEsq, 'cazaEsqOn', 'checkbox'));
  sCaza.appendChild(ligar(fCazaEsqM, 'cazaEsqMonstruos', 'text'));
  sCaza.appendChild(el('div', 'font-size:11px;color:#9a9', 'Los ataques en línea recta y en abanico (fire wave, energy beam...) no pegan en diagonal. Si alguno de estos monstruos te tiene en su línea, da un paso a una casilla en diagonal; si peleas cuerpo a cuerpo, sin despegarse del objetivo.'));
  sCaza.appendChild(el('div', 'font-size:11px;color:#9a9', 'Para paladin, sorcerer y druid. Se queda quieto disparando mientras los monstruos estén a esa distancia; si alguno se acerca da un paso (recto, sin diagonales) hacia donde hay más espacio, sin meterse a esquinas, y gira alrededor si no puede alejarse. Recomendado: 3. Usa una tecla de ataque (runa o hechizo) en «Tecla de ataque».'));

  sCaza.appendChild(subtitulo('4) Supervivencia y suministros'));
  var fCazaRetiroOn = campo('Retirarse si la vida baja', 'checkbox', 16);
  var fCazaRetiroPct = campo('Retirarse si HP ≤ %', 'number', 50);
  var fCazaReanudarPct = campo('Reanudar cuando HP ≥ %', 'number', 50);
  var fCazaLogoutPct = campo('Cerrar sesión si HP ≤ % (0 = no)', 'number', 50);
  var fCazaComerOn = campo('Comer durante la caza', 'checkbox', 16);
  var fCazaComerBajo = campo('Comer si Food ≤ (min)', 'number', 50);
  var fCazaAvisoJug = campo('Avisar si aparece otro jugador', 'checkbox', 16);
  var fCazaRetiroSinFood = campo('Retirarse si no hay comida', 'checkbox', 16);
  var fCazaMinFood = campo('Retirar si Food ≤ (min)', 'number', 50);
  var fCazaRetiroCapOn = campo('Retirarse si la Cap es baja', 'checkbox', 16);
  var fCazaEscapeAtacado = campo('Escape rápido si te golpean fuerte', 'checkbox', 16);
  var fCazaEscapeHpPct = campo('Escapar si HP baja ≥ % en 3s', 'number', 50);
  var fCazaCurar = campo('Curarse y tomar pociones durante la caza', 'checkbox', 16);
  var fCazaHaste = campo('Usar Autohaste durante la caza', 'checkbox', 16);
  var fCazaOcultarOn = campo('Atajo para ocultar/mostrar todas las casillas', 'checkbox', 16);
  var fCazaOcultarTecla = campo('Tecla del atajo (Ctrl+Shift + …)', 'text', 40);
  var btnOcultarCas = boton('Mostrar / ocultar casillas');
  var fCazaManaBajaOn = campo('Mana baja: avisar y alejarse de los monstruos', 'checkbox', 16);
  var fCazaManaBajaPct = campo('Mana baja si MP ≤ %', 'number', 50);
  var fCazaManaReanPct = campo('Volver a cazar cuando MP ≥ %', 'number', 50);
  sCaza.appendChild(ligar(fCazaCurar, 'cazaCurar', 'checkbox'));
  sCaza.appendChild(el('div', 'font-size:11px;color:#9a9', 'Usa tus curas de Autoheal y tus pociones de Autolife y Automana (pestaña Combate) aunque estén apagadas. Las pociones solo se usan si esa casilla del hotbar tiene una poción.'));
  sCaza.appendChild(ligar(fCazaOcultarOn, 'cazaOcultarOn', 'checkbox'));
  sCaza.appendChild(ligar(fCazaOcultarTecla, 'cazaOcultarTecla', 'text'));
  sCaza.appendChild(filaBtns([btnOcultarCas]));
  sCaza.appendChild(el('div', 'font-size:11px;color:#9a9', 'Oculta de golpe todas las casillas dibujadas (resaltadas, hoyos, rope, escaleras, spawns y timers de magic wall) y las vuelve a mostrar. En la pantalla del juego siempre verás un aviso con la combinación de teclas. No uses H ni K: ya son Ctrl+Shift+H (panel) y Ctrl+Shift+K (modo marcar).'));
  sCaza.appendChild(ligar(fCazaHaste, 'cazaHaste', 'checkbox'));
  sCaza.appendChild(el('div', 'font-size:11px;color:#9a9', 'Mientras cazas mantiene el haste aunque el Autohaste de la pestaña Combate esté apagado. Usa el hechizo y el maná mínimo que elijas allá.'));
  sCaza.appendChild(ligar(fCazaManaBajaOn, 'cazaManaBajaOn', 'checkbox'));
  sCaza.appendChild(ligar(fCazaManaBajaPct, 'cazaManaBajaPct', 'number'));
  sCaza.appendChild(ligar(fCazaManaReanPct, 'cazaManaReanudarPct', 'number'));
  sCaza.appendChild(ligar(fCazaRetiroOn, 'cazaRetiroOn', 'checkbox'));
  sCaza.appendChild(ligar(fCazaRetiroPct, 'cazaRetiroPct', 'number'));
  sCaza.appendChild(ligar(fCazaReanudarPct, 'cazaReanudarPct', 'number'));
  sCaza.appendChild(ligar(fCazaLogoutPct, 'cazaLogoutPct', 'number'));
  sCaza.appendChild(ligar(fCazaComerOn, 'cazaComerOn', 'checkbox'));
  var fCazaComerCad = campo('Si no llevo comida, comer de los monstruos que mato', 'checkbox', 16);
  var fCazaOro = campo('Cambiar monedas: 100 gold → platinum, 100 platinum → crystal', 'checkbox', 16);
  sCaza.appendChild(ligar(fCazaComerCad, 'cazaComerCadaver', 'checkbox'));
  sCaza.appendChild(ligar(fCazaOro, 'cazaOroOn', 'checkbox'));
  sCaza.appendChild(ligar(fCazaComerBajo, 'cazaComerBajo', 'number'));
  sCaza.appendChild(ligar(fCazaRetiroSinFood, 'cazaRetiroSinFood', 'checkbox'));
  sCaza.appendChild(ligar(fCazaMinFood, 'cazaMinFood', 'number'));
  sCaza.appendChild(ligar(fCazaRetiroCapOn, 'cazaRetiroCapOn', 'checkbox'));
  sCaza.appendChild(ligar(fCazaEscapeAtacado, 'cazaEscapeAtacado', 'checkbox'));
  sCaza.appendChild(ligar(fCazaEscapeHpPct, 'cazaEscapeHpPct', 'number'));
  sCaza.appendChild(ligar(fCazaAvisoJug, 'cazaAvisoJug', 'checkbox'));
  var fCazaMuniOn = campo('Paladin: subir munición al slot de flechas', 'checkbox', 16);
  var fCazaMuniMin = campo('Rellenar cuando queden menos de', 'number', 50);
  sCaza.appendChild(ligar(fCazaMuniOn, 'cazaMuniOn', 'checkbox'));
  sCaza.appendChild(ligar(fCazaMuniMin, 'cazaMuniMin', 'number'));
  sCaza.appendChild(el('div', 'font-size:11px;color:#9a9', 'Busca munición en tus mochilas abiertas y la sube al slot de flechas: flechas si traes arco, bolts si traes ballesta (cualquier tipo: arrow, poison arrow, power bolt...). Primero junta las del mismo tipo; si se acaban, pone otro tipo. Te avisa cuando ya no queda nada.'));
  var fDescOn = campo('Recordarme tomar un descanso', 'checkbox', 16);
  var fDescMin = campo('Cada (minutos de caza seguidos)', 'number', 50);
  var fDescParar = campo('Detener el Cave hunt al recordármelo', 'checkbox', 16);
  sCaza.appendChild(ligar(fDescOn, 'cazaDescansoOn', 'checkbox'));
  sCaza.appendChild(ligar(fDescMin, 'cazaDescansoMin', 'number'));
  sCaza.appendChild(ligar(fDescParar, 'cazaDescansoParar', 'checkbox'));
  sCaza.appendChild(el('div', 'font-size:11px;color:#9a9', 'Te avisa (con sonido y al celular) cada cierto tiempo de caza para que hagas una pausa. Si marcas «Detener», el Cave hunt se apaga hasta que tú lo vuelvas a iniciar.'));
  sCaza.appendChild(subtitulo('Defensa contra jugadores (PK)'));
  sCaza.appendChild(el('div', 'font-size:11px;color:#9a9;margin:2px 0 4px', 'Si un jugador te ataca a TI (nunca a alguien que no te atacó; tu party no cuenta), el helper revisa tus supplies y decide: si es un solo PK, tu vida está bien y tienes suficientes runas y curaciones, se defiende con runas (quita el PVP Lock solo durante la pelea y lo vuelve a poner). Si no, escapa por la ruta hacia el inicio y vuelve a cazar cuando nadie lo ataque. Siempre te avisa, también al celular si lo activaste en Alertas.'));
  var fDefOn = campo('Defenderme si un jugador me ataca', 'checkbox', 16);
  var fDefRunas = campo('Pelear si tengo al menos (runas de ataque)', 'number', 50);
  var fDefCuras = campo('… y al menos (pociones/runas de curación)', 'number', 50);
  var fDefCurasN = campo('Cuentan como curación (nombres, coma)', 'text', 150);
  var fDefHuir = campo('Escapar si mi vida baja de (%)', 'number', 50);
  var fDefMax = campo('Pelear solo si me atacan como máximo (PKs)', 'number', 50);
  var fDefRuna = campo('Runa para atacar (vacío = la mejor que tengas)', 'text', 150);
  var fDefLock = campo('Quitar el PVP Lock solo durante la pelea', 'checkbox', 16);
  var fDefCalma = campo('Volver a cazar tras (s) sin ataques', 'number', 50);
  sCaza.appendChild(ligar(fDefOn, 'cazaDefOn', 'checkbox'));
  sCaza.appendChild(ligar(fDefRunas, 'cazaDefMinRunas', 'number'));
  sCaza.appendChild(ligar(fDefCuras, 'cazaDefMinCuras', 'number'));
  sCaza.appendChild(ligar(fDefCurasN, 'cazaDefCuras', 'text'));
  sCaza.appendChild(ligar(fDefHuir, 'cazaDefHuirHp', 'number'));
  sCaza.appendChild(ligar(fDefMax, 'cazaDefMaxPK', 'number'));
  sCaza.appendChild(ligar(fDefRuna, 'cazaDefRuna', 'text'));
  sCaza.appendChild(ligar(fDefLock, 'cazaDefQuitarLock', 'checkbox'));
  sCaza.appendChild(ligar(fDefCalma, 'cazaDefCalmaSeg', 'number'));
  sCaza.appendChild(el('div', 'font-size:11px;color:#9a9', 'Recomendado: 10 runas y 3 curaciones como mínimo, escapar con menos de 40 % de vida y pelear contra 1 solo PK. Si eres knight o paladin sin runas, pon 0 runas: atacará con tu arma. Si ya casi lo matas (20 % o menos), lo remata aunque te falte algo.'));

  // ===== MACROS: reglas propias del usuario (pestaña propia, Gold) =====
  var sMac = seccion('Macros (tus propias reglas)');
  function pasoTit(n, t) { var d = el('div', 'margin:10px 0 4px;font-weight:700;color:#ffd166', ''); d.textContent = n + ' ' + t; return d; }
  sMac.appendChild(el('div', 'font-size:12px;color:#cfd;margin:2px 0 6px', 'Haz que tu personaje haga lo que tú quieras, sin saber programar. Una IA (ChatGPT, Gemini, Claude…) te escribe las reglas: tú solo copias y pegas.'));
  // Paso 1: qué quiere
  sMac.appendChild(pasoTit('1️⃣', 'Escribe qué quieres que haga tu personaje'));
  var macMeta = document.createElement('textarea');
  macMeta.className = 'mbh-in'; macMeta.rows = 3;
  macMeta.style.cssText = 'display:block;width:100%;height:68px;box-sizing:border-box;font:12px/1.4 Verdana,Tahoma,sans-serif;color:#e6e6e6;resize:vertical;margin:2px 0';
  macMeta.placeholder = 'Ej: soy druid. Si veo 3 o más monstruos, tira great fireball. Si hay jugadores cerca, no tires nada para no sacar calavera. Si mi vida baja de 50 %, usa UH.';
  macMeta.value = cfg.macroMeta || '';
  macMeta.oninput = function () { cfg.macroMeta = macMeta.value; guardarCfg(); };
  sMac.appendChild(macMeta);
  var btnMacPrompt = boton('📋 Copiar instrucciones para la IA');
  sMac.appendChild(filaBtns([btnMacPrompt]));
  sMac.appendChild(el('div', 'font-size:11px;color:#9a9', 'Pégalas en ChatGPT, Gemini, Claude o la IA que uses. Te va a contestar con tus reglas: cópialas.'));
  // Paso 2: pegar lo que dio la IA
  sMac.appendChild(pasoTit('2️⃣', 'Pega aquí lo que te dio la IA'));
  var btnMacPegar = boton('📥 Pegar respuesta de la IA');
  sMac.appendChild(filaBtns([btnMacPegar]));
  var macTxt = document.createElement('textarea');
  macTxt.className = 'mbh-in'; macTxt.rows = 10; macTxt.spellcheck = false;
  macTxt.setAttribute('autocapitalize', 'off'); macTxt.setAttribute('autocomplete', 'off');
  macTxt.style.cssText = 'display:block;width:100%;height:190px;box-sizing:border-box;font:11px/1.45 Consolas,"Lucida Console",monospace;color:#bfe0ac;resize:vertical;white-space:pre;overflow:auto;margin:4px 0';
  macTxt.placeholder = '# Aquí van tus reglas (una por línea)\nsi jugadores > 0 entonces parar\nsi monstruos >= 3 y objetivo entonces runa "great fireball" en objetivo cada 2s';
  macTxt.value = cfg.macroTexto || '';
  sMac.appendChild(macTxt);
  var macRes = el('div', 'font-size:11px;white-space:pre-wrap;margin:2px 0', '');
  sMac.appendChild(macRes);
  var btnMacErr = boton('🛠 Copiar errores para la IA');
  var filaMacErr = filaBtns([btnMacErr]); filaMacErr.style.display = 'none';
  sMac.appendChild(filaMacErr);
  // Paso 3: activar
  sMac.appendChild(pasoTit('3️⃣', 'Actívalos'));
  var fMacOn = campo('Macros activos', 'checkbox', 16);
  sMac.appendChild(ligar(fMacOn, 'macroOn', 'checkbox'));
  sMac.appendChild(el('div', 'font-size:11px;color:#9a9;margin:2px 0 6px', 'Se revisan de arriba hacia abajo 4 veces por segundo. Puedes editar las reglas aquí mismo cuando quieras.'));
  // Herramientas
  var btnMacCopiar = boton('Copiar mis macros');
  var btnMacEj = boton('Poner ejemplos');
  var btnMacAyuda = boton('Ver ayuda');
  var btnMacBorrar = boton('Borrar todo');
  sMac.appendChild(filaBtns([btnMacCopiar, btnMacEj, btnMacAyuda, btnMacBorrar]));
  var macAyudaEl = el('div', 'display:none;font:10.5px/1.45 Consolas,"Lucida Console",monospace;white-space:pre-wrap;background:#121414;border:1px solid #333;padding:6px;margin:4px 0;color:#cfd', '');
  sMac.appendChild(macAyudaEl);
  sMac.appendChild(el('div', 'font-size:11px;color:#9a9', 'Las reglas solo pueden leer lo que pasa en el juego y hacer acciones del juego: no pueden tocar tus archivos, tus licencias ni nada fuera de minibia.com/play. Si alguien te pasa reglas, léelas antes de usarlas.'));

  var macErroresUlt = [];
  function revisarMacros() {
    var cc = macroCompilar(macTxt.value);
    macErroresUlt = cc.errores;
    filaMacErr.style.display = cc.errores.length ? '' : 'none';
    if (cc.errores.length) { macRes.style.color = '#f88'; macRes.textContent = trTexto('✖ ') + cc.errores.map(trTexto).join('\n'); }
    else { macRes.style.color = '#8f8'; macRes.textContent = cc.reglas.length ? trTexto('✔ Todo bien: ') + cc.reglas.length + trTexto(' reglas.') + (cfg.macroOn ? '' : trTexto(' Ahora activa «Macros activos».')) : ''; }
  }
  var macT = null;
  macTxt.oninput = function () { cfg.macroTexto = macTxt.value; guardarCfg(); clearTimeout(macT); macT = setTimeout(revisarMacros, 400); };
  [macTxt, macMeta].forEach(function (ta) { ['keydown', 'keyup', 'keypress'].forEach(function (tp) { ta.addEventListener(tp, function (e) { e.stopPropagation(); }); }); });
  fMacOn.input.addEventListener('change', function () { setTimeout(revisarMacros, 0); });
  refrescadores.push(function () {
    if (document.activeElement !== macTxt) { macTxt.value = cfg.macroTexto || ''; setTimeout(revisarMacros, 0); }
    if (document.activeElement !== macMeta) { macMeta.value = cfg.macroMeta || ''; }
  });
  // Deja solo las reglas y notas de lo que contestó la IA (quita ``` y el texto de más)
  function limpiarRespuestaIA(t) {
    var txt = String(t || '').replace(/\r/g, '');
    // Si la IA usó un bloque de código, solo vale lo de adentro
    var bloques = [], m, re = /```[^\n]*\n([\s\S]*?)```/g;
    while ((m = re.exec(txt))) { bloques.push(m[1]); }
    if (bloques.length) { txt = bloques.join('\n'); }
    var out = [];
    txt.split('\n').forEach(function (l) {
      var x = l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').replace(/\*\*/g, '').replace(/^`+|`+$/g, '').trim();
      if (/^```/.test(x)) { return; }
      if (!x) { if (out.length && out[out.length - 1] !== '') { out.push(''); } return; }
      if (/^(#|\/\/)/.test(x) || (/^(si|if)\s/i.test(x) && /\s(entonces|then)\s/i.test(x))) { out.push(x); }
    });
    while (out.length && out[out.length - 1] === '') { out.pop(); }
    return out.length ? out.join('\n') : String(t || '').trim();
  }
  function ponerReglas(t) {
    macTxt.value = t; macTxt.oninput(); revisarMacros();
    try { macTxt.scrollIntoView({ block: 'nearest' }); } catch (e) {}
  }
  btnMacPrompt.onclick = function () {
    var meta = String(macMeta.value || '').trim();
    if (!meta) { toast('Primero escribe en el paso 1 qué quieres que haga tu personaje'); try { macMeta.focus(); } catch (e) {} return; }
    copiarTexto(macroPromptIA(meta, null, null), function () { toast('✅ Copiado. Pégalo en ChatGPT (o tu IA) y copia lo que te conteste.'); }, function () { toast('No pude copiar: mantén presionado y copia a mano'); });
  };
  btnMacErr.onclick = function () {
    copiarTexto(macroPromptIA(String(macMeta.value || '').trim(), macTxt.value, macErroresUlt), function () { toast('✅ Copiado. Pégalo en la misma conversación con la IA y vuelve a pegar su respuesta aquí.'); });
  };
  btnMacPegar.onclick = function () {
    pegarTexto(function (t) {
      if (t === null || !String(t).trim()) { toast('No pude leer el portapapeles: mantén presionado el cuadro de abajo y elige «Pegar»'); try { macTxt.focus(); } catch (e) {} return; }
      if (macTxt.value.trim() && !confirmTr('¿Reemplazar tus reglas actuales por lo que pegaste?')) { return; }
      ponerReglas(limpiarRespuestaIA(t));
      toast(macErroresUlt.length ? '⚠ Hay errores: toca «Copiar errores para la IA»' : '✅ Reglas listas. Activa «Macros activos».');
    });
  };
  macTxt.addEventListener('paste', function () { setTimeout(function () { var l = limpiarRespuestaIA(macTxt.value); if (l !== macTxt.value) { ponerReglas(l); } }, 0); });
  btnMacCopiar.onclick = function () { copiarTexto(macTxt.value, function () { toast('Macros copiados'); }); };
  btnMacBorrar.onclick = function () { if (macTxt.value.trim() && confirmTr('¿Borrar todas tus reglas?')) { ponerReglas(''); } };
  var MAC_EJEMPLOS = [
    '# PK cerca: pausar la caza y avisarme (también al celular)',
    'si calaveras > 0 entonces pausar caza y avisar "PK cerca"',
    '# Si hay jugadores cerca, no hago nada de lo de abajo (para no sacar calavera)',
    'si jugadores > 0 entonces parar',
    '# 3 o más monstruos: great fireball al objetivo',
    'si monstruos >= 3 y objetivo entonces runa "great fireball" en objetivo cada 2s',
    '# Vida baja: UH en mí',
    'si vida < 50 entonces runa "ultimate healing" en mi cada 1s',
    '# Maná llena y sin monstruos: gastarla en un hechizo',
    'si mana > 95 y monstruos == 0 entonces decir "utevo lux" cada 30s'
  ].join('\n');
  var MAC_EJEMPLOS_EN = [
    '# PK nearby: pause the hunt and alert me (also on my phone)',
    'if skulls > 0 then pause hunt and alert "PK nearby"',
    '# If players are around, skip all the rules below (to avoid a skull)',
    'if players > 0 then stop',
    '# 3 or more monsters: great fireball at the target',
    'if monsters >= 3 and target then rune "great fireball" on target every 2s',
    '# Low health: UH on me',
    'if hp < 50 then rune "ultimate healing" on me every 1s',
    '# Full mana and no monsters: spend it on a spell',
    'if mana > 95 and monsters == 0 then say "utevo lux" every 30s'
  ].join('\n');
  btnMacEj.onclick = function () {
    if (macTxt.value.trim() && !confirmTr('¿Agregar los ejemplos al final de tus reglas?')) { return; }
    ponerReglas((macTxt.value.trim() ? macTxt.value.replace(/\s+$/, '') + '\n' : '') + (IDIOMA === 'en' ? MAC_EJEMPLOS_EN : MAC_EJEMPLOS));
  };
  btnMacAyuda.onclick = function () {
    var ver = macAyudaEl.style.display === 'none';
    macAyudaEl.textContent = trTexto(MAC_AYUDA);
    macAyudaEl.style.display = ver ? 'block' : 'none';
    btnMacAyuda.textContent = trTexto(ver ? 'Ocultar ayuda' : 'Ver ayuda');
  };
  var MAC_AYUDA = 'FORMA: si (condición) entonces (acción) [y (acción)] [cada 2s]\n' +
    'Une condiciones con «y» / «o» y niega con «no». Compara con > < >= <= == !=\n\n' +
    'CONDICIONES (números):\n' +
    '  vida, mana .......... tu vida y maná en %\n' +
    '  vidareal, manareal .. tu vida y maná en puntos\n' +
    '  cap ................. tu capacidad\n' +
    '  monstruos ........... monstruos en pantalla (tu piso)\n' +
    '  cerca ............... monstruos pegados a ti\n' +
    '  jugadores ........... otros jugadores en pantalla (sin tu party)\n' +
    '  calaveras ........... jugadores con calavera en pantalla\n' +
    '  objetivo ............ 1 si tienes objetivo, 0 si no\n' +
    '  vidaobjetivo ........ vida de tu objetivo en %\n' +
    '  pz .................. 1 si estás en protection zone\n' +
    '  monstruo("dragon") .. cuántos dragones ves\n' +
    '  jugador("Nombre") ... 1 si ves a ese jugador\n' +
    '  cuenta("uh") ........ cuántos tienes en las mochilas abiertas\n\n' +
    'ACCIONES:\n' +
    '  decir "exura" ................. dice el texto (hechizos)\n' +
    '  runa "sudden death" en objetivo  tira la runa a tu objetivo\n' +
    '  runa "ultimate healing" en mi ... la usa en ti\n' +
    '  usar "mana fluid" en mi ........ usa un objeto en ti\n' +
    '  usar "ham" ..................... usa un objeto (comer)\n' +
    '  tecla F3 ....................... pulsa una tecla del hotbar\n' +
    '  atacar / atacar "rat" .......... ataca al monstruo más cercano\n' +
    '  soltar ......................... suelta tu objetivo\n' +
    '  avisar "texto" ................. alerta (y al celular)\n' +
    '  pausar caza|runeo|training|todo  pausa mientras se cumpla\n' +
    '  parar .......................... no revisa las reglas de abajo\n' +
    '                                   (pon tus avisos ARRIBA de un «parar»)\n\n' +
    '«cada 2s» = cada cuánto se puede repetir (1 s si no lo pones; 30 s para avisar). ' +
    'Las runas esperan solas a que el juego permita tirar otra. También funciona en inglés: if / then / and / or / every, say, rune, use, key, attack, alert, pause, stop.';
  setTimeout(revisarMacros, 0);

  // ===== COLMENA HUNT: cazar en party (solo Founder) =====
  var sCh = seccion('Colmena hunt (cazar en party)');
  sCh.appendChild(el('div', 'font-size:11px;color:#9a9;margin:2px 0 4px', 'Varios personajes cazan juntos en pestañas del mismo navegador. El LÍDER (normalmente el knight) caza con su ruta del Cave hunt. Los SEGUIDORES no usan ruta: pisan por donde pasó el líder (también hoyos, rope y escaleras), atacan su mismo objetivo y curan a los compañeros. El líder espera si alguien se queda atrás o tiene poca vida.'));
  var fChOn = campo('Colmena hunt activa', 'checkbox', 16);
  var fChRol = campoSelect('Este personaje es', [{ val: 'seguidor', txt: 'Seguidor (sigue al líder)' }, { val: 'lider', txt: 'Líder (caza con su ruta)' }]);
  var fChLider = campo('Nombre del líder (vacío = líder de la party)', 'text', 150);
  var fChDist = campo('Distancia al líder (sqm)', 'number', 50);
  var fChAtacar = campo('Atacar el mismo objetivo que el líder', 'checkbox', 16);
  var fChRuna = campo('Runa para su objetivo (vacío = arma o wand)', 'text', 150);
  var fChCurar = campo('Curar a los compañeros', 'checkbox', 16);
  var fChCurarPct = campo('Curar si su vida baja de (%)', 'number', 50);
  var fChCurarH = campo('Hechizo para curar (vacío = usar runa)', 'text', 150);
  var fChCurarR = campo('Runa para curar', 'text', 150);
  var fChEsperar = campo('Líder: esperar a quien se quede atrás', 'checkbox', 16);
  var fChEsperaD = campo('Líder: esperar si se aleja más de (sqm)', 'number', 50);
  sCh.appendChild(ligar(fChOn, 'chOn', 'checkbox'));
  sCh.appendChild(ligar(fChRol, 'chRol', 'select'));
  sCh.appendChild(ligar(fChLider, 'chLider', 'text'));
  sCh.appendChild(ligar(fChDist, 'chDist', 'number'));
  sCh.appendChild(ligar(fChAtacar, 'chAtacar', 'checkbox'));
  sCh.appendChild(ligar(fChRuna, 'chRuna', 'text'));
  sCh.appendChild(ligar(fChCurar, 'chCurar', 'checkbox'));
  sCh.appendChild(ligar(fChCurarPct, 'chCurarPct', 'number'));
  sCh.appendChild(ligar(fChCurarH, 'chCurarHechizo', 'text'));
  sCh.appendChild(ligar(fChCurarR, 'chCurarRuna', 'text'));
  sCh.appendChild(ligar(fChEsperar, 'chEsperar', 'checkbox'));
  sCh.appendChild(ligar(fChEsperaD, 'chEsperaDist', 'number'));
  sCh.appendChild(el('div', 'font-size:11px;color:#9a9', 'Cómo usarla: 1) hagan party. 2) En la pestaña del líder elige «Líder», activa la Colmena hunt y luego inicia su Cave hunt. 3) En cada seguidor elige «Seguidor» y actívala (NO inicies su Cave hunt). Cada personaje se sigue curando a sí mismo con su Autoheal. Si el seguidor usa runas, se queda quieto («stand») junto al líder.'));

  // ===== SECCIÓN 7: CASILLAS, TIMERS Y MAGIC WALL =====
  var sCol = seccion('Colmena (Nest): defensa de la party');
  var fColOn = campo('Colmena activa', 'checkbox', 16);
  var fColPKs = campo('Defender de PKs (jugadores que atacan a la party)', 'checkbox', 16);
  var fColMon = campo('Defender de monstruos que atacan a la party', 'checkbox', 16);
  var fColRuna = campo('Runa para atacar (vacío = la mejor que tengas)', 'text', 150);
  var fColMiembros = campo('Otros aliados fuera de la party (coma)', 'text', 150);
  var fColLoot = campo('Al matar a un PK, tomar sus objetos (si alcanza la cap)', 'checkbox', 16);
  var fColVolver = campo('Después, volver a donde estaba', 'checkbox', 16);
  var fColHumano = campo('Retrasos humanos: cada personaje reacciona y tira runas a destiempo', 'checkbox', 16);
  var fColReacMin = campo('Reacción mínima (ms)', 'number', 70);
  var fColReacMax = campo('Reacción máxima (ms)', 'number', 70);
  var fColRunaMin = campo('Entre runas, mínimo (ms)', 'number', 70);
  var fColRunaMax = campo('Entre runas, máximo (ms)', 'number', 70);
  var fColLock = campo('Quitar el PVP Lock para defender (y volver a ponerlo al terminar)', 'checkbox', 16);
  sCol.appendChild(ligar(fColOn, 'colOn', 'checkbox'));
  sCol.appendChild(ligar(fColPKs, 'colPKs', 'checkbox'));
  sCol.appendChild(ligar(fColMon, 'colMonstruos', 'checkbox'));
  sCol.appendChild(ligar(fColRuna, 'colRuna', 'text'));
  sCol.appendChild(ligar(fColMiembros, 'colMiembros', 'text'));
  sCol.appendChild(ligar(fColLoot, 'colLoot', 'checkbox'));
  sCol.appendChild(ligar(fColVolver, 'colVolver', 'checkbox'));
  sCol.appendChild(ligar(fColLock, 'colQuitarLock', 'checkbox'));
  sCol.appendChild(ligar(fColHumano, 'colHumano', 'checkbox'));
  sCol.appendChild(ligar(fColReacMin, 'colReacMin', 'number'));
  sCol.appendChild(ligar(fColReacMax, 'colReacMax', 'number'));
  sCol.appendChild(ligar(fColRunaMin, 'colRunaMin', 'number'));
  sCol.appendChild(ligar(fColRunaMax, 'colRunaMax', 'number'));
  sCol.appendChild(el('div', 'font-size:11px;color:#ffd166;margin:2px 0 4px', 'Recomendado (se ve humano): reacción 300 a 2500 ms y entre runas 2200 a 3000 ms. Reaccionar en menos de 200 ms se ve a bot. Entre runas, menos de 2050 ms no sirve: el juego obliga a esperar 2 segundos. Cada personaje usa su turno dentro de ese rango, así reaccionan en cadena y no todos a la vez.'));
  var lblCol = el('div', 'color:#8f8;font-size:11px;margin:2px 0 4px', 'Colmena: apagada');
  sCol.appendChild(lblCol);
  sCol.appendChild(el('div', 'font-size:11px;color:#9a9', 'Cada personaje con el helper y la Colmena activa defiende a su party (la del escudo) y a los aliados de la lista: si un jugador o un monstruo le pega a alguno, lo fija y le tira runas hasta matarlo (con chase si es un jugador que huye). Nunca ataca a un jugador que no haya atacado a la party. Al terminar, toma el loot del PK y vuelve a su sitio.'));

  var sTm = seccion('Casillas, timers y magic wall');
  sTm.appendChild(subtitulo('Casillas resaltadas (ej. zonas para levitate)'));
  var fHlOn = campo('Mostrar casillas resaltadas', 'checkbox', 16);
  var fHlColor = campo('Color', 'color', 44);
  var fHlAlpha = campo('Opacidad (5-80)', 'number', 50);
  var fHlCol = campo('Mi columna en pantalla (0-14)', 'number', 50);
  var fHlFila = campo('Mi fila en pantalla (0-10)', 'number', 50);
  var fCamOn = campo('Seguir la cámara al caminar (fluido)', 'checkbox', 16);
  var fCamPix = campo('Leer píxeles del juego (si no se puede, interpola solo)', 'checkbox', 16);
  var fCamPaso = campo('Duración de un paso en ms (0 = 330)', 'number', 50);
  var fHlSolo = campo('Casilla visible solo mientras estés encima', 'checkbox', 16);
  var btnMarcar = boton('Modo marcar (Ctrl+Shift+K)');
  var btnOcultarCas2 = boton('Mostrar / ocultar casillas');
  btnOcultarCas2.title = 'Al abrir el juego las casillas empiezan ocultas para que cargue más rápido';
  var btnMarcarYo = boton('Marcar mi casilla');
  var btnQuitarUlt = boton('Quitar última');
  var btnBorrarCas = boton('Borrar todas');
  var btnTipoCas = boton('Resaltar casilla'), btnTipoMW = boton('Magic wall'), btnTipoWG = boton('Wild growth');
  var lblCas = el('div', 'font-size:11px;color:#8f8;margin:3px 0', 'Casillas: 0');
  sTm.appendChild(filaBtns([btnOcultarCas2]));
  sTm.appendChild(el('div', 'font-size:11px;color:#9a9;margin:0 0 4px', 'Al abrir el juego las casillas empiezan ocultas para que cargue más rápido. Muéstralas con este botón o con Ctrl+Shift+X.'));
  sTm.appendChild(ligar(fHlOn, 'hlOn', 'checkbox'));
  sTm.appendChild(ligar(fHlColor, 'hlColor', 'text'));
  sTm.appendChild(ligar(fHlAlpha, 'hlAlpha', 'number'));
  sTm.appendChild(ligar(fHlCol, 'hlCol', 'number'));
  sTm.appendChild(ligar(fHlFila, 'hlFila', 'number'));
  sTm.appendChild(ligar(fCamOn, 'camOn', 'checkbox'));
  sTm.appendChild(ligar(fCamPix, 'camPix', 'checkbox'));
  sTm.appendChild(ligar(fCamPaso, 'camPasoMs', 'number'));
  sTm.appendChild(ligar(fHlSolo, 'hlSoloAqui', 'checkbox'));
  sTm.appendChild(filaBtns([btnMarcar, btnMarcarYo, btnQuitarUlt, btnBorrarCas]));
  sTm.appendChild(el('div', 'font-size:11px;color:#9a9', 'Qué marca cada toque en modo marcar (en PC puedes usar Shift/Ctrl+clic):'));
  sTm.appendChild(filaBtns([btnTipoCas, btnTipoMW, btnTipoWG]));
  sTm.appendChild(el('div', 'font-size:11px;color:#9a9', 'En modo marcar: clic = resaltar / quitar una casilla, Shift+clic = cronómetro de magic wall, Ctrl+clic = wild growth, Esc = salir.'));
  sTm.appendChild(lblCas);

  sTm.appendChild(subtitulo('Timers de hechizos'));
  var fTmOn = campo('Mostrar timers de hechizos', 'checkbox', 16);
  var fHech = campo('palabras=seg=nombre ; ...', 'text', 190);
  var btnTmProbar = boton('Probar timer');
  sTm.appendChild(ligar(fTmOn, 'tmOn', 'checkbox'));
  sTm.appendChild(ligar(fHech, 'hechizosTimer', 'text'));
  sTm.appendChild(filaBtns([btnTmProbar]));

  sTm.appendChild(subtitulo('Magic wall y wild growth'));
  var fMwOn = campo('Cuenta atrás sobre cada MW / WG', 'checkbox', 16);
  var fMwSeg = campo('Duración magic wall (s)', 'number', 50);
  var fMwIds = campo('IDs item magic wall (coma)', 'text', 90);
  var fWgSeg = campo('Duración wild growth (s)', 'number', 50);
  var fWgIds = campo('IDs item wild growth (coma)', 'text', 90);
  var btnMwProbar = boton('Probar en mi casilla');
  var btnUsarMedidas = boton('Usar duraciones medidas');
  var btnInspTile = boton('Inspeccionar alrededor');
  var btnAprenderMW = boton('Aprender magic wall');
  var btnAprenderWG = boton('Aprender wild growth');
  var btnCamara = boton('Diagnóstico de cámara');
  sTm.appendChild(ligar(fMwOn, 'mwOn', 'checkbox'));
  sTm.appendChild(ligar(fMwSeg, 'mwSeg', 'number'));
  sTm.appendChild(ligar(fMwIds, 'mwIds', 'text'));
  sTm.appendChild(ligar(fWgSeg, 'wgSeg', 'number'));
  sTm.appendChild(ligar(fWgIds, 'wgIds', 'text'));
  sTm.appendChild(filaBtns([btnAprenderMW, btnAprenderWG, btnMwProbar, btnInspTile, btnUsarMedidas, btnCamara]));
  var lblTm = el('div', 'font-size:11px;color:#8f8;margin:3px 0;white-space:pre-wrap;word-break:break-all', '');
  sTm.appendChild(lblTm);

  // ===== SECCIÓN 7b: REINICIO AUTOMÁTICO TRAS DESCONEXIÓN =====
  var sRec = seccion('Reinicio automático tras desconexión');
  var fAutoRecOn = campo('Reanudar runas / caza tras una caída', 'checkbox', 16);
  var fAutoRecMin = campo('Intentar durante (min)', 'number', 50);
  sRec.appendChild(ligar(fAutoRecOn, 'autoRecOn', 'checkbox'));
  sRec.appendChild(ligar(fAutoRecMin, 'autoRecMin', 'number'));
  sRec.appendChild(el('div', 'font-size:11px;color:#9a9', 'Si se corta la conexión o el servidor te saca, vuelve a entrar con tu personaje (el navegador debe tener la contraseña guardada) y retoma lo que estaba corriendo. No actúa si hubo GM, captcha o botcheck de por medio.'));

  // ===== SECCIÓN 8: SEGURIDAD ANTI-BOTCHECK =====
  var sSeg = seccion('Seguridad anti-botcheck');
  sSeg.appendChild(el('div', 'font-size:11px;color:#ffaa00;margin:4px 0', '⚠ ATENCIÓN: Las funciones de esta sección están en fase de pruebas. Si alguna de estas funciones fallan o miras algún nuevo anti-bot, informar inmediatamente con el desarrollador @osbeliaal.'));

  // --- Controles de seguridad: anti-GM, anti-monstruos, captcha automático y anti-drop ---
  var fGmOn = campo('Detectar GM / anti-bot (pausa todo)', 'checkbox', 16);
  var fPresOn = campo('Pausar ante monstruos "are you there?" (pausa todo)', 'checkbox', 16);
  var fCapOn = campo('Resolver captcha automáticamente (Anti-Captcha, 6 fichas)', 'checkbox', 16);
  var fDropOn = campo('Anti-drop: no soltar objetos al morir', 'checkbox', 16);
  var fDropItemOn = campo('Anti-drop: recoger ítem al suelo si GM/monstruo lo pide', 'checkbox', 16);
  var fSonido = campo('Sonido en las alertas', 'checkbox', 16);
  sSeg.appendChild(ligar(fGmOn, 'gmOn', 'checkbox'));
  sSeg.appendChild(ligar(fPresOn, 'presenciaOn', 'checkbox'));
  sSeg.appendChild(ligar(fCapOn, 'captchaSolverOn', 'checkbox'));
  sSeg.appendChild(ligar(fDropOn, 'antiDropOn', 'checkbox'));
  sSeg.appendChild(ligar(fDropItemOn, 'antiDropItemOn', 'checkbox'));
  sSeg.appendChild(ligar(fSonido, 'alertaSonido', 'checkbox'));

  // ===== SECCIÓN 8b: ALERTAS Y SONIDO =====
  var sAlertas = seccion('Alertas y Sonido');
  // Sonido de las alertas: tono, volumen, audio propio y permiso de notificaciones
  sAlertas.appendChild(subtitulo('Sonido de las alertas'));
  var fTono = campoSelect('Tono', [
    { val: 'suave', txt: 'Suave' }, { val: 'campana', txt: 'Campana' }, { val: 'digital', txt: 'Digital (bip bip)' },
    { val: 'sirena', txt: 'Sirena (fuerte)' }, { val: 'grave', txt: 'Grave' }
  ]);
  var fVolumen = campo('Volumen (1-100)', 'number', 50);
  sAlertas.appendChild(ligar(fTono, 'alertaTono', 'select'));
  sAlertas.appendChild(ligar(fVolumen, 'alertaVolumen', 'number'));
  var inpCustomAudio = document.createElement('input');
  inpCustomAudio.type = 'file';
  inpCustomAudio.accept = 'audio/*';
  inpCustomAudio.style.display = 'none';
  var btnProbarSonido = boton('Probar sonido');
  var btnSubirAudio = boton('Subir audio propio');
  var btnBorrarAudio = boton('Quitar audio propio');
  var btnPermiso = boton('Permitir avisos');
  var lblAudio = el('div', 'font-size:11px;color:#8f8;margin:3px 0', 'Sonido: tono del helper');
  sAlertas.appendChild(filaBtns([btnProbarSonido, btnSubirAudio, btnBorrarAudio]));
  sAlertas.appendChild(inpCustomAudio);
  sAlertas.appendChild(lblAudio);
  sAlertas.appendChild(el('div', 'font-size:11px;color:#9a9;margin:2px 0 4px', 'Si subes un audio propio, suena ese en lugar del tono. «Permitir avisos» deja que el navegador te muestre las alertas aunque estés en otra ventana.'));
  sAlertas.appendChild(filaBtns([btnPermiso]));

  sAlertas.appendChild(subtitulo('GM que pregunta algo ("you there?", "hi")'));
  var fGmResp = campo('Contestarle automáticamente', 'checkbox', 16);
  var fGmAuto = campo('Reanudar solo cuando se va (lol / xd)', 'checkbox', 16);
  var btnProbarGM = boton('Probar (envía una respuesta al chat)');
  sAlertas.appendChild(ligar(fGmResp, 'gmResponder', 'checkbox'));
  sAlertas.appendChild(filaRango('Esperar antes de contestar (s)', 'gmReplyMin', 'gmReplyMax'));
  sAlertas.appendChild(ligar(fGmAuto, 'gmAutoReanudar', 'checkbox'));
  sAlertas.appendChild(filaBtns([btnProbarGM]));
  sAlertas.appendChild(subtitulo('Botcheck ("anti-bot check will begin in 30 seconds")'));
  var fBcOn = campo('Cerrar sesión si estoy inactivo', 'checkbox', 16);
  var fBcSeg = campo('Cerrar sesión cuando falten ≤ (s)', 'number', 50);
  var fBcAfk = campo('Inactivo = sin tocar nada (s)', 'number', 50);
  var fRelogin = campo('Volver a entrar solo (experimental)', 'checkbox', 16);
  sAlertas.appendChild(ligar(fBcOn, 'botcheckLogoutOn', 'checkbox'));
  sAlertas.appendChild(ligar(fBcSeg, 'botcheckLogoutSeg', 'number'));
  sAlertas.appendChild(ligar(fBcAfk, 'botcheckAfkSeg', 'number'));
  sAlertas.appendChild(ligar(fRelogin, 'gmRelogin', 'checkbox'));

  // Avisos al celular: sirven en PC, iPhone y Android. Se guardan para todos los personajes de este dispositivo.
  sAlertas.appendChild(subtitulo('Avisos al celular (Telegram, WhatsApp o app ntfy)'));
  sAlertas.appendChild(el('div', 'font-size:11px;color:#9a9;margin:2px 0 4px', 'Te manda las alertas (GM, botcheck, muerte, desconexión, PK, Cave hunt detenido...) a tu celular aunque juegues en la PC. Solo se envía el texto de la alerta al servicio que elijas; nada más sale de tu dispositivo. Apagado por defecto.'));
  var fCelServ = campoSelect('Enviar avisos por', [
    { val: '', txt: 'Apagado' }, { val: 'telegram', txt: 'Telegram (recomendado)' }, { val: 'whatsapp', txt: 'WhatsApp (CallMeBot)' }, { val: 'ntfy', txt: 'App ntfy' }
  ]);
  var fCelTgToken = campo('Token del bot de Telegram', 'text', 150);
  var fCelTgChat = campo('Tu chat ID de Telegram', 'text', 150);
  var btnCelTgChat = boton('Buscar mi chat ID');
  var fCelWaTel = campo('Tu WhatsApp con código de país (+52…)', 'text', 150);
  var fCelWaKey = campo('API key de CallMeBot', 'text', 150);
  var fCelNtfy = campo('Tema de ntfy (como contraseña)', 'text', 150);
  var fCelImp = campo('Solo avisos importantes', 'checkbox', 16);
  var btnCelProbar = boton('Enviar aviso de prueba');
  var celAyuda = el('div', 'font-size:11px;color:#9a9;white-space:pre-wrap;margin:4px 0', '');
  var celRes = el('div', 'font-size:11px;color:#8f8;margin:3px 0', '');
  [fCelServ, fCelTgToken, fCelTgChat].forEach(function (f) { sAlertas.appendChild(f.fila); });
  var filaTgChat = filaBtns([btnCelTgChat]); sAlertas.appendChild(filaTgChat);
  [fCelWaTel, fCelWaKey, fCelNtfy, fCelImp].forEach(function (f) { sAlertas.appendChild(f.fila); });
  sAlertas.appendChild(celAyuda);
  sAlertas.appendChild(filaBtns([btnCelProbar]));
  sAlertas.appendChild(celRes);

  // ===== SECCIÓN 9: ESTADO Y HERRAMIENTAS =====
  var sEstado = seccion('Estado y herramientas', true);
  var filaBotones = el('div', 'display:flex;gap:4px;flex-wrap:wrap;margin:6px 0');
  var btnProbarH = boton('Probar hechizo');
  var btnProbarC = boton('Probar comer');
  var btnProbarA = boton('Probar alerta');
  var btnCopiar = boton('Copiar');
  [btnProbarH, btnProbarC, btnProbarA, btnCopiar].forEach(function (b) { filaBotones.appendChild(b); });
  sEstado.appendChild(filaBotones);

  var estadoEl = el('div', 'white-space:pre-wrap;border-top:1px solid #0f05;padding-top:4px');
  sEstado.appendChild(estadoEl);

  sEstado.appendChild(subtitulo('Idioma'));
  var selIdioma = document.createElement('select'); selIdioma.className = 'mbh-in'; selIdioma.setAttribute('data-notr', '1');
  [['es', 'Español'], ['en', 'English']].forEach(function (o) { var op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; selIdioma.appendChild(op); });
  selIdioma.value = IDIOMA || 'es';
  selIdioma.onchange = function () {
    var v = selIdioma.value, antes = ponerIdioma(v);
    if (antes === 'en' && v === 'es') {
      if (window.confirm('Recargar para ver todo en español? · Reload to see everything in Spanish?')) { location.reload(); }
    }
  };
  sEstado.appendChild(selIdioma);
  var btnBateria = boton('Sin límite de batería');
  if (NATIVO_INI()) {
    sEstado.appendChild(subtitulo('Segundo plano (app de Android)'));
    sEstado.appendChild(filaBtns([btnBateria]));
    sEstado.appendChild(el('div', 'font-size:11px;color:#aaa;margin:2px 0 6px',
      'Mientras el helper esté en marcha, la app sigue trabajando aunque la mandes atrás o apagues la pantalla (verás una notificación fija). Para que Android no la detenga, toca "Sin límite de batería" y acepta.'));
  }
  var btnDiag = boton('Diagnóstico del dispositivo');
  var btnDiagCopiar = boton('Copiar diagnóstico');
  var btnForzarMovil = boton(ES_MOVIL ? 'Usar modo escritorio' : 'Usar modo móvil');
  sEstado.appendChild(subtitulo('Dispositivo (modo móvil)'));
  sEstado.appendChild(filaBtns([btnDiag, btnDiagCopiar, btnForzarMovil]));
  var diagEl = elc('div', 'mbh-status mbh-pre', '');
  diagEl.style.display = 'none';
  sEstado.appendChild(diagEl);
  btnForzarMovil.onclick = function () {
    try { localStorage.setItem('minibiaHelperMovil', ES_MOVIL ? '0' : '1'); } catch (e) {}
    ultimaAccion = 'modo ' + (ES_MOVIL ? 'escritorio' : 'móvil') + ' guardado: recarga la página para aplicarlo';
  };
  function textoDiagnostico() {
    var L = [];
    function ln(k, v) { L.push(k + ': ' + v); }
    try {
      ln('Helper', 'v' + VERSION + (ES_MOVIL ? ' · modo móvil' : ' · modo escritorio'));
      ln('Navegador', navigator.userAgent);
      ln('Pantalla', screen.width + 'x' + screen.height + ' · ventana ' + window.innerWidth + 'x' + window.innerHeight + ' · dpr ' + window.devicePixelRatio);
      ln('Táctil', ('ontouchstart' in window) + ' · puntos ' + (navigator.maxTouchPoints || 0));
      var ls = 'sí'; try { localStorage.setItem('mbh_t', '1'); localStorage.removeItem('mbh_t'); } catch (e) { ls = 'NO'; }
      ln('Almacenamiento local', ls);
      var gc = window.gameClient;
      ln('gameClient', gc ? 'presente' : 'NO encontrado');
      if (gc) {
        var ks = []; try { ks = Object.keys(gc).slice(0, 30); } catch (e) {}
        ln('  claves', ks.join(', '));
        var ps = null; try { ps = gc.player && gc.player.__position; } catch (e) {}
        ln('  posición', ps ? (ps.x + ',' + ps.y + ',' + ps.z) : 'no legible');
        var itf = null; try { itf = gc.interface; } catch (e) {}
        if (itf) { var ik = []; try { ik = Object.keys(itf).slice(0, 30); } catch (e) {} ln('  interface', ik.join(', ')); }
      }
      var cvs = document.querySelectorAll('canvas'), cl = [];
      for (var i = 0; i < cvs.length && i < 8; i++) {
        var r = cvs[i].getBoundingClientRect();
        cl.push((cvs[i].id || '(sin id)') + ' ' + cvs[i].width + 'x' + cvs[i].height + ' en pantalla ' + Math.round(r.width) + 'x' + Math.round(r.height));
      }
      ln('Canvas', cl.join(' | ') || 'ninguno');
      var gl = ''; try { var c0 = document.getElementById('screen'); gl = c0 ? (c0.__mbhGl === undefined ? 'sin dato' : String(c0.__mbhGl)) : '-'; } catch (e) {}
      ln('Cámara', cam.estado + ' · lectura de píxeles ' + (cam.sinPix ? 'no' : 'sí'));
      // Elementos con aspecto de barra de atajos / botones de juego (solo nombres de clase, para adaptar el panel)
      var cand = document.querySelectorAll('[class*="hotbar" i],[class*="slot" i],[class*="spell" i],[id*="hotbar" i],[id*="action" i],[class*="joystick" i],[id*="joystick" i]');
      var nom = {}; for (var j = 0; j < cand.length && j < 400; j++) { var n = (cand[j].id ? '#' + cand[j].id : '') + '.' + String(cand[j].className && cand[j].className.baseVal !== undefined ? cand[j].className.baseVal : cand[j].className).trim().split(/\s+/).slice(0, 3).join('.'); nom[n] = (nom[n] || 0) + 1; }
      var nl = Object.keys(nom).slice(0, 25).map(function (k) { return k + ' ×' + nom[k]; });
      ln('Elementos de juego', nl.length ? nl.join(' ; ') : 'ninguno con esos nombres');
    } catch (e) { L.push('error: ' + e.message); }
    return L.join('\n');
  }
  btnDiag.onclick = function () { diagEl.style.display = 'block'; diagEl.textContent = textoDiagnostico(); };
  // ---------- Consola de pruebas (oculta): se activa tocando 5 veces la versión en la cabecera ----------
  var KEY_DEV = 'minibiaHelperDev';
  var devBox = el('div', 'display:none;margin-top:6px');
  devBox.appendChild(subtitulo('Consola de pruebas'));
  var devIn = document.createElement('textarea');
  devIn.id = 'mbh-dev-in'; devIn.rows = 3; devIn.spellcheck = false; devIn.setAttribute('autocapitalize', 'off'); devIn.setAttribute('autocomplete', 'off');
  devIn.style.cssText = 'width:100%;box-sizing:border-box;background:#0b0c0c;color:#9f9;border:1px solid #444;font:12px/1.3 monospace;padding:4px';
  var devRun = boton('Ejecutar'), devLimpiar = boton('Limpiar'), devPegar = boton('Pegar comando'), devCopiar = boton('Copiar resultado');
  var devAuto = document.createElement('label'); devAuto.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:12px;margin:4px 0';
  var devAutoChk = document.createElement('input'); devAutoChk.type = 'checkbox'; devAutoChk.checked = true;
  devAuto.appendChild(devAutoChk); devAuto.appendChild(document.createTextNode('Copiar el resultado automáticamente al ejecutar'));
  var devMsg = el('div', 'font-size:11px;color:#8f8;min-height:14px');
  var devOut = elc('div', 'mbh-status mbh-pre', '');
  devOut.id = 'mbh-dev-out'; devOut.setAttribute('data-notr', '1');
  devOut.style.cssText = 'max-height:220px;overflow:auto;white-space:pre-wrap;word-break:break-all;font:11px/1.3 monospace;user-select:text;-webkit-user-select:text';
  devBox.appendChild(devIn); devBox.appendChild(filaBtns([devPegar, devRun, devLimpiar])); devBox.appendChild(devAuto);
  devBox.appendChild(filaBtns([devCopiar])); devBox.appendChild(devMsg); devBox.appendChild(devOut);
  sEstado.appendChild(devBox);
  function devMostrar(v) { devBox.style.display = v ? 'block' : 'none'; }
  try { devMostrar(localStorage.getItem(KEY_DEV) === '1'); } catch (e) {}
  function devFormato(v) {
    if (v === undefined) { return 'undefined'; }
    if (typeof v === 'string') { return v; }
    if (typeof v === 'function') { return String(v).slice(0, 2000); }
    try { var seen = []; return JSON.stringify(v, function (k, x) { if (x && typeof x === 'object') { if (seen.indexOf(x) >= 0) { return '[ciclo]'; } seen.push(x); if (seen.length > 400) { return '[...]'; } } return x; }, 1).slice(0, 6000); }
    catch (e) { return String(v); }
  }
  devRun.onclick = function () {
    var code = devIn.value, out;
    try { out = (0, eval)(code); } catch (e) { out = 'ERROR: ' + e.message; }
    devOut.textContent = devFormato(out);
    if (devAutoChk.checked) { devCopiar.onclick(); } else { devMsg.textContent = ''; }
  };
  devLimpiar.onclick = function () { devIn.value = ''; devOut.textContent = ''; devMsg.textContent = ''; };
  devCopiar.onclick = function () {
    var t = devOut.textContent || '';
    copiarTexto(t, function () { devMsg.style.color = '#8f8'; devMsg.textContent = 'Resultado copiado (' + t.length + ' letras). Pégalo donde quieras.'; },
      function () { devMsg.style.color = '#f88'; devMsg.textContent = 'No se pudo copiar: mantén presionado el texto para seleccionarlo.'; });
  };
  devPegar.onclick = function () {
    pegarTexto(function (t) {
      if (t == null) { devMsg.style.color = '#f88'; devMsg.textContent = 'No pude leer el portapapeles: pega con Ctrl+V o mantén presionado el cuadro.'; return; }
      devIn.value = t; devMsg.style.color = '#8f8'; devMsg.textContent = 'Comando pegado (' + t.length + ' letras). Toca Ejecutar.';
    });
  };
  devIn.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); devRun.onclick(); } });
  devIn.addEventListener('keyup', function (e) { e.stopPropagation(); });
  devIn.addEventListener('keypress', function (e) { e.stopPropagation(); });
  (function () {
    var ver = panel.querySelector('.mbh-ver'), n = 0, t0 = 0;
    if (!ver) { return; }
    ver.style.cursor = 'pointer';
    ver.addEventListener('click', function (e) {
      e.stopPropagation();
      var ahora = Date.now(); if (ahora - t0 > 2500) { n = 0; } t0 = ahora; n++;
      if (n >= 5) {
        n = 0; var on = devBox.style.display === 'none';
        devMostrar(on); try { localStorage.setItem(KEY_DEV, on ? '1' : '0'); } catch (err) {}
        ultimaAccion = on ? 'consola de pruebas activada (pestaña Estado)' : 'consola de pruebas oculta';
        if (on) { try { elegirTab('Sistema'); } catch (err) {} }
      }
    });
  })();

  btnDiagCopiar.onclick = function () {
    var t = textoDiagnostico();
    diagEl.style.display = 'block'; diagEl.textContent = t;
    copiarTexto(t, function () { ultimaAccion = 'diagnóstico copiado'; }, function () { ultimaAccion = 'no pude copiar: selecciona el texto a mano'; });
  };

  function aplicarEstado() {
    cuerpo.style.display = minimizado ? 'none' : 'flex';
    try { panel.classList.toggle('mbh-min', !!minimizado); } catch (e) {}
    btnMin.textContent = minimizado ? '+' : '–';
    mini.style.borderBottom = minimizado ? '0' : '';
  }
  btnMin.onclick = function () {
    minimizado = !minimizado;
    try { localStorage.setItem(KEY_MIN, minimizado ? '1' : '0'); } catch (e) {}
    aplicarEstado();
  };
  aplicarEstado();
  (document.body || document.documentElement).appendChild(trRaiz(panel));

  // Reemplaza la configuración por la de un personaje (o por los valores por defecto)
  function aplicarCfg(obj) {
    obj = obj || {};
    for (var k in CFG_DEFECTO) {
      if (k === 'heals') { continue; }
      cfg[k] = (k in obj) ? obj[k] : CFG_DEFECTO[k];
    }
    var h = (Array.isArray(obj.heals) && obj.heals.length === 3) ? obj.heals : CFG_DEFECTO.heals;
    cfg.heals = JSON.parse(JSON.stringify(h));
    metodo = (Number(cfg.metodo) || 0) % 3;
    sincronizarUI();
  }

  // ---------- Lectura del juego ----------
  function leerBarra(id) {
    try {
      var e = document.querySelector('#' + id + ' span.percentage, .' + id + ' span.percentage');
      if (!e) { return null; }
      var m = e.textContent.trim().match(/(\d+)\s*\/\s*(\d+)/);
      return m ? { actual: +m[1], max: +m[2] } : null;
    } catch (err) { registrar('barra ' + id + ': ' + err.message); return null; }
  }
  function chat() {
    try { return window.gameClient.interface.channelManager; } catch (e) { return null; }
  }
  function leerRuta(obj, ruta) {
    var o = obj;
    var partes = String(ruta || '').split('.');
    for (var i = 0; i < partes.length; i++) {
      if (o === null || o === undefined) { return undefined; }
      try { o = o[partes[i]]; } catch (e) { return undefined; }
    }
    return o;
  }
  function textoDe(n) { return n.nodeType === 3 ? (n.nodeValue || '') : (n.textContent || ''); }

  // Valor de una línea de la ventana de skills (Experience, Food, Exp/h...). Esa ventana siempre
  // está en la página, aunque esté cerrada.
  function leerSkill(nombre) {
    try {
      var e = document.querySelector('.outer-skill-wrapper[skill="' + nombre + '"] .skill');
      return e ? e.textContent.trim() : null;
    } catch (err) { return null; }
  }

  var capEl = null, capBusqueda = 0;
  function leerCap() {
    try {
      var d = document.getElementById('player-capacity');
      if (d) {
        var md = d.textContent.match(/(\d+)/);
        if (md) { return +md[1]; }
      }
      var re = /^\s*Cap:?\s*(\d+)\s*$/i;
      if (capEl && capEl.isConnected) {
        var m = capEl.textContent.match(re);
        if (m) { return +m[1]; }
      }
      capEl = null;
      var ahora = Date.now();
      if (ahora - capBusqueda < 3000) { return null; }
      capBusqueda = ahora;
      var todos = document.body.getElementsByTagName('*');
      for (var i = 0; i < todos.length; i++) {
        var e = todos[i];
        if (e.childElementCount > 3 || panel.contains(e)) { continue; }
        var tx = e.textContent;
        if (tx.length > 30) { continue; }
        var m2 = tx.match(re);
        if (m2) { capEl = e; return +m2[1]; }
      }
    } catch (err) { registrar('cap: ' + err.message); }
    return null;
  }

  function visibleId(id) {
    var e = document.getElementById(id);
    if (!e) { return false; }
    try {
      var cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden') { return false; }
    } catch (err) {}
    return e.getClientRects().length > 0;
  }

  // ---------- Acciones ----------
  var NOMBRES_METODO = ['sendMessageText', 'campo de chat + Enter', 'handleMessageSend'];
  var metodo = (Number(cfg.metodo) || 0) % 3;

  function decir(texto, m) {
    var cm = chat();
    if (!cm) { throw new Error('channelManager no disponible'); }
    if (m === 0) {
      cm.sendMessageText(texto);
    } else if (m === 1) {
      var inp = cm.__inputElement;
      inp.value = texto;
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
    } else {
      cm.handleMessageSend(texto);
    }
  }

  // Hotbar del juego: usar una casilla es lo mismo que tocarla (o pulsar su F*), sin tocar la pantalla.
  function hotbarMgr() {
    try { var hm = window.gameClient.interface.hotbarManager; return (hm && typeof hm.__handleClick === 'function' && hm.slots) ? hm : null; }
    catch (e) { return null; }
  }
  // Convierte lo escrito en el campo a un índice de casilla (0 = casilla 1 / F1), o -1 si no es casilla.
  // F1–F12 → casillas 1–12; en móvil también "1".."8"; en cualquier modo "C3" o "#3".
  function indiceHotbar(nombre) {
    var m = nombre.match(/^F(\d{1,2})$/) || nombre.match(/^(?:C|#|CASILLA\s*)(\d{1,2})$/) || (ES_MOVIL ? nombre.match(/^(\d{1,2})$/) : null);
    if (!m) { return -1; }
    var n = Number(m[1]);
    return (n >= 1 && n <= 28) ? n - 1 : -1;
  }
  function usarCasilla(idx) {
    var hm = hotbarMgr();
    if (!hm || !hm.slots[idx]) { return false; }
    var sl = hm.slots[idx];
    // "Atacar al más cercano" alterna el objetivo: si ya hay uno, pulsarla lo quitaría.
    if (sl.action === 'attackNearest') {
      var tg = null; try { tg = window.gameClient.player.getTarget(); } catch (e) {}
      if (tg) { return true; }
    }
    hm.__handleClick(idx);
    return true;
  }
  function pulsarTecla(nombre) {
    nombre = String(nombre || '').trim().toUpperCase();
    var ci = indiceHotbar(nombre);
    if (ci >= 0 && usarCasilla(ci)) { return; }
    if (ES_MOVIL && /^\d{1,2}$/.test(nombre)) { throw new Error('casilla ' + nombre + ' no disponible (¿estás dentro del juego?)'); }
    var code = nombre, kc = 0;
    var mf = nombre.match(/^F(\d{1,2})$/);
    if (mf) { kc = 111 + Number(mf[1]); code = 'F' + mf[1]; }
    else if (/^[0-9]$/.test(nombre)) { kc = 48 + Number(nombre); code = 'Digit' + nombre; }
    else if (/^[A-Z]$/.test(nombre)) { kc = nombre.charCodeAt(0); code = 'Key' + nombre; }
    else { throw new Error('tecla no válida: "' + nombre + '"'); }
    ['keydown', 'keyup'].forEach(function (tipo) {
      var ev = new KeyboardEvent(tipo, { key: nombre, code: code, keyCode: kc, which: kc, bubbles: true, cancelable: true });
      (document.body || document).dispatchEvent(ev);
    });
  }

  // ---------- Sonido de alertas (suave o audio propio) ----------
  var audioCtx = null;
  function audio() {
    try {
      if (!audioCtx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (AC) { audioCtx = new AC(); }
      }
      if (audioCtx && audioCtx.state === 'suspended') { audioCtx.resume(); }
    } catch (e) { registrar('audio: ' + e.message); }
    return audioCtx;
  }
  document.addEventListener('click', audio, true);
  document.addEventListener('keydown', audio, true);

  var customAudioBuffer = null;
  function cargarAudioGuardado() {
    try {
      var guardado = localStorage.getItem(KEY_CUSTOM_SOUND);
      if (!guardado) { return; }
      fetch(guardado).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
        var ctx = audio();
        if (ctx) {
          ctx.decodeAudioData(buf, function (decoded) {
            customAudioBuffer = decoded;
            lblAudio.textContent = 'Sonido: usando audio personalizado';
          });
        }
      }).catch(function () {});
    } catch (e) {}
  }
  cargarAudioGuardado();

  btnSubirAudio.onclick = function () { inpCustomAudio.click(); };
  inpCustomAudio.onchange = function () {
    var file = inpCustomAudio.files[0];
    if (!file) { return; }
    var reader = new FileReader();
    reader.onload = function (ev) {
      try {
        var dataUrl = ev.target.result;
        fetch(dataUrl).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
          var ctx = audio();
          if (!ctx) { ultimaAccion = 'audio: haz clic en la página para inicializar'; return; }
          ctx.decodeAudioData(buf, function (decoded) {
            customAudioBuffer = decoded;
            try { localStorage.setItem(KEY_CUSTOM_SOUND, dataUrl); } catch (ex) {}
            lblAudio.textContent = 'Sonido: personalizado (' + file.name + ')';
            ultimaAccion = 'audio personalizado cargado';
          }, function () { ultimaAccion = 'audio: formato no compatible'; });
        });
      } catch (err) { ultimaAccion = 'audio error: ' + err.message; }
    };
    reader.readAsDataURL(file);
  };
  btnBorrarAudio.onclick = function () {
    customAudioBuffer = null;
    try { localStorage.removeItem(KEY_CUSTOM_SOUND); } catch (e) {}
    lblAudio.textContent = 'Sonido: tono del helper';
    ultimaAccion = 'audio personalizado quitado';
  };
  function volumenAlerta() { var v = Number(cfg.alertaVolumen); if (!(v > 0)) { v = 60; } return Math.min(100, v) / 100; }
  function reproducirSonidoCustom() {
    var ctx = audio();
    if (!ctx || !customAudioBuffer) { return false; }
    try {
      var src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = customAudioBuffer;
      g.gain.value = Math.min(1, volumenAlerta() * 1.4);
      src.connect(g); g.connect(ctx.destination);
      src.start(0);
      return true;
    } catch (e) { return false; }
  }
  var TONOS_ALERTA = {
    suave:   { onda: 'sine',     mult: 1,    caida: 0.8,  dur: 0.35, sep: 0.45, pico: 1 },
    campana: { onda: 'triangle', mult: 1.7,  caida: 0.98, dur: 0.9,  sep: 0.55, pico: 1.3, armonico: 2.76 },
    digital: { onda: 'square',   mult: 1.9,  caida: 1,    dur: 0.09, sep: 0.16, pico: 0.35, doble: true },
    sirena:  { onda: 'sawtooth', mult: 1.2,  caida: 1.6,  dur: 0.42, sep: 0.46, pico: 0.45 },
    grave:   { onda: 'sine',     mult: 0.55, caida: 0.9,  dur: 0.5,  sep: 0.6,  pico: 1.6 }
  };
  function notaAlerta(ctx, t0, freq, T, pico, ondaForzada) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = ondaForzada || T.onda;
    o.frequency.setValueAtTime(freq, t0);
    o.frequency.exponentialRampToValueAtTime(freq * T.caida, t0 + T.dur * 0.85);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(pico, t0 + Math.min(0.04, T.dur / 3));
    g.gain.exponentialRampToValueAtTime(0.001, t0 + T.dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t0); o.stop(t0 + T.dur + 0.03);
  }
  function pitidos(veces, freq, forzar) {
    if (!cfg.alertaSonido && !forzar) { return; }
    if (reproducirSonidoCustom()) { return; }
    var ctx = audio();
    if (!ctx) { return; }
    var T = TONOS_ALERTA[cfg.alertaTono] || TONOS_ALERTA.suave;
    var f = (freq || 520) * T.mult, pico = 0.2 * volumenAlerta() * T.pico;
    for (var i = 0; i < veces; i++) {
      try {
        var t0 = ctx.currentTime + 0.02 + i * T.sep * (T.doble ? 2 : 1);
        notaAlerta(ctx, t0, f, T, pico);
        if (T.doble) { notaAlerta(ctx, t0 + T.sep, f, T, pico); }
        if (T.armonico) { notaAlerta(ctx, t0, f * T.armonico, T, pico * 0.3, 'sine'); }
      } catch (e) { registrar('pitido: ' + e.message); }
    }
  }
  btnProbarSonido.onclick = function () { audio(); pitidos(3, 580, true); };

  var alarmaIv = null;
  function iniciarAlarma() {
    detenerAlarma();
    alarmaIv = setInterval(function () { pitidos(3, 580); }, 8000);
  }
  function detenerAlarma() { if (alarmaIv) { clearInterval(alarmaIv); alarmaIv = null; } }

  // ---------- Título de la pestaña: "Personaje · Minibia" ----------
  var tituloOriginal0 = document.title, parpadeo = null;
  function tituloBase() {
    if (!charActual) { return tituloOriginal0; }
    var activo = corriendo || cazaCorriendo || cfg.trainOn;
    return (activo ? '▶' : '') + charActual + ' · Minibia';
  }
  function aplicarTitulo() {
    if (parpadeo) { return; }
    var t = tituloBase();
    if (document.title !== t) { document.title = t; }
  }
  try {
    var tEl = document.querySelector('title');
    if (tEl) { new MutationObserver(aplicarTitulo).observe(tEl, { childList: true, characterData: true, subtree: true }); }
  } catch (e) {}
  function parpadearTitulo(msg) {
    if (parpadeo) { clearInterval(parpadeo); }
    var n = 0;
    parpadeo = setInterval(function () {
      document.title = (n++ % 2) ? tituloBase() : '⚠ ' + (charActual ? charActual + ': ' : '') + msg;
    }, 800);
  }
  function detenerParpadeo() {
    if (parpadeo) { clearInterval(parpadeo); parpadeo = null; aplicarTitulo(); }
  }
  window.addEventListener('focus', detenerParpadeo);

  // App de Android: puente nativo (notificaciones, servicio en segundo plano, batería)
  var NATIVO = (function () { try { return window.MBHNativo && typeof window.MBHNativo.notificar === 'function' ? window.MBHNativo : null; } catch (e) { return null; } })();
  function nativo(fn) { try { return NATIVO && typeof NATIVO[fn] === 'function' ? NATIVO : null; } catch (e) { return null; } }
  // ---------- Avisos al celular ----------
  var KEY_CEL = 'minibiaHelperAvisosCel';
  var cel = { servicio: '', tgToken: '', tgChat: '', waTel: '', waKey: '', ntfyTema: '', soloImp: true };
  try { var celG = JSON.parse(localStorage.getItem(KEY_CEL) || 'null'); if (celG && typeof celG === 'object') { Object.keys(cel).forEach(function (k) { if (k in celG) { cel[k] = celG[k]; } }); } } catch (e) {}
  if (!cel.ntfyTema) { cel.ntfyTema = 'minibia-' + Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8); }
  function guardarCel() { try { localStorage.setItem(KEY_CEL, JSON.stringify(cel)); } catch (e) {} }
  var CEL_AYUDA = {
    '': '',
    telegram: 'Cómo activarlo (una sola vez):\n1) En Telegram busca @BotFather, escríbele /newbot y ponle cualquier nombre. Te da un token: pégalo arriba.\n2) Abre tu bot nuevo y escríbele /start.\n3) Toca «Buscar mi chat ID». Si no lo encuentra, pídeselo a @userinfobot y pégalo.\n4) Toca «Enviar aviso de prueba».',
    whatsapp: 'Cómo activarlo (una sola vez):\n1) Entra a callmebot.com → WhatsApp API y sigue sus pasos: agregas su número a tus contactos y le mandas el mensaje que indica.\n2) Te responde con tu API key: pégala arriba junto con tu número con código de país (México: +52…).\n3) Toca «Enviar aviso de prueba».\nCallMeBot es un servicio gratuito de terceros: puede tardar o tener límites.',
    ntfy: 'Cómo activarlo (una sola vez):\n1) Instala la app «ntfy» (Play Store o App Store).\n2) Toca + y escribe EXACTAMENTE el tema de arriba, luego «Suscribirse».\n3) Toca «Enviar aviso de prueba».\nEl tema funciona como contraseña: no lo compartas (quien lo sepa puede leer tus avisos).'
  };
  function refrescarCelUI() {
    var sv = cel.servicio;
    fCelServ.input.value = sv;
    fCelTgToken.input.value = cel.tgToken; fCelTgChat.input.value = cel.tgChat;
    fCelWaTel.input.value = cel.waTel; fCelWaKey.input.value = cel.waKey;
    fCelNtfy.input.value = cel.ntfyTema; fCelImp.input.checked = !!cel.soloImp;
    fCelTgToken.fila.style.display = fCelTgChat.fila.style.display = filaTgChat.style.display = sv === 'telegram' ? '' : 'none';
    fCelWaTel.fila.style.display = fCelWaKey.fila.style.display = sv === 'whatsapp' ? '' : 'none';
    fCelNtfy.fila.style.display = sv === 'ntfy' ? '' : 'none';
    fCelImp.fila.style.display = btnCelProbar.style.display = sv ? '' : 'none';
    celAyuda.textContent = trTexto(CEL_AYUDA[sv] || '');
  }
  fCelServ.input.onchange = function () { cel.servicio = fCelServ.input.value; guardarCel(); celRes.textContent = ''; refrescarCelUI(); };
  [[fCelTgToken, 'tgToken'], [fCelTgChat, 'tgChat'], [fCelWaTel, 'waTel'], [fCelWaKey, 'waKey'], [fCelNtfy, 'ntfyTema']].forEach(function (par) {
    par[0].input.oninput = function () { cel[par[1]] = String(par[0].input.value || '').trim(); guardarCel(); };
  });
  fCelImp.input.onchange = function () { cel.soloImp = fCelImp.input.checked; guardarCel(); };
  refrescarCelUI();
  // Arma la petición del servicio elegido; '' si faltan datos
  function celPeticion(texto, leer) {
    var sv = cel.servicio;
    if (sv === 'telegram') {
      if (!cel.tgToken || !cel.tgChat) { return null; }
      return { url: 'https://api.telegram.org/bot' + cel.tgToken + '/sendMessage?chat_id=' + encodeURIComponent(cel.tgChat) + '&text=' + encodeURIComponent(texto), opts: leer ? {} : { mode: 'no-cors' } };
    }
    if (sv === 'whatsapp') {
      if (!cel.waTel || !cel.waKey) { return null; }
      return { url: 'https://api.callmebot.com/whatsapp.php?phone=' + encodeURIComponent(cel.waTel.replace(/[\s-]/g, '')) + '&text=' + encodeURIComponent(texto) + '&apikey=' + encodeURIComponent(cel.waKey), opts: { mode: 'no-cors' } };
    }
    if (sv === 'ntfy') {
      if (!cel.ntfyTema) { return null; }
      return { url: 'https://ntfy.sh/' + encodeURIComponent(cel.ntfyTema) + '?title=' + encodeURIComponent('Minibia Helper'), opts: { method: 'POST', body: texto } };
    }
    return null;
  }
  var CEL_IMPORTANTES = { gm: 1, gmchat: 1, botcheck: 1, muerte: 1, desc: 1, macro: 1 };
  var celUlt = {}, celEnviadosT = [];
  function avisoCelular(tipo, msg) {
    try {
      if (!cel.servicio || tipo === 'prueba') { return; }
      var txt = (charActual ? '[' + charActual + '] ' : '') + trTexto(String(msg));
      if (cel.soloImp && !CEL_IMPORTANTES[tipo] && !/⚔|🏃|☠|🚨|detenido|stopped/.test(txt)) { return; }
      var ahora = Date.now();
      if (celUlt[txt] && ahora - celUlt[txt] < 60000) { return; }   // el mismo aviso, como mucho 1 vez por minuto
      celEnviadosT = celEnviadosT.filter(function (t) { return ahora - t < 60000; });
      if (celEnviadosT.length >= 10) { return; }                     // y no más de 10 avisos por minuto
      celUlt[txt] = ahora; celEnviadosT.push(ahora);
      var pt = celPeticion(txt, false);
      if (pt) { fetch(pt.url, pt.opts).catch(function (e) { registrar('aviso al celular: ' + (e && e.message || 'bloqueado')); }); }
    } catch (e) { registrar('aviso al celular: ' + e.message); }
  }
  btnCelProbar.onclick = function () {
    var pt = celPeticion((charActual ? '[' + charActual + '] ' : '') + trTexto('✅ Prueba de Minibia Helper: así te llegarán los avisos.'), true);
    if (!pt) { celRes.textContent = trTexto('Faltan datos: llena los campos de arriba.'); return; }
    celRes.textContent = trTexto('Enviando...');
    fetch(pt.url, pt.opts).then(function (r) {
      if (cel.servicio === 'telegram') {
        return r.json().then(function (j) { celRes.textContent = trTexto(j && j.ok ? '✅ Enviado. Revisa tu Telegram.' : '❌ Telegram dijo: ') + (j && !j.ok ? String(j.description || '') : ''); });
      }
      celRes.textContent = trTexto(r.type === 'opaque' || r.ok ? '✅ Enviado. Revisa tu celular (puede tardar unos segundos).' : '❌ El servicio respondió con error ') + (r.type === 'opaque' || r.ok ? '' : r.status);
    }).catch(function () {
      celRes.textContent = trTexto('⚠ No pude confirmar el envío. Si en 1 minuto no te llega, tu navegador está bloqueando la conexión.');
    });
  };
  btnCelTgChat.onclick = function () {
    if (!cel.tgToken) { celRes.textContent = trTexto('Primero pega el token de tu bot.'); return; }
    celRes.textContent = trTexto('Buscando...');
    fetch('https://api.telegram.org/bot' + cel.tgToken + '/getUpdates').then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.ok) { celRes.textContent = trTexto('❌ Token incorrecto: ') + String(j && j.description || ''); return; }
      var us = (j.result || []).filter(function (u) { return u.message && u.message.chat; });
      if (!us.length) { celRes.textContent = trTexto('No encontré mensajes: escríbele /start a tu bot y vuelve a tocar el botón.'); return; }
      var ch = us[us.length - 1].message.chat;
      cel.tgChat = String(ch.id); guardarCel(); refrescarCelUI();
      celRes.textContent = trTexto('✅ Chat encontrado: ') + (ch.first_name || ch.title || ch.id) + trTexto('. Ahora toca «Enviar aviso de prueba».');
    }).catch(function () {
      celRes.textContent = trTexto('⚠ No pude consultar Telegram desde aquí. Pídele tu chat ID a @userinfobot y pégalo.');
    });
  };

  function notificar(msg) {
    if (nativo('notificar')) {
      try { NATIVO.notificar((charActual || 'Minibia') + ' · Minibia Helper', trTexto(String(msg))); return; } catch (e) { registrar('notificación nativa: ' + e.message); }
    }
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification((charActual || 'Minibia') + ' · Minibia Helper', { body: trTexto(String(msg)), requireInteraction: true });
      }
    } catch (e) { registrar('notificación: ' + e.message); }
  }
  btnPermiso.onclick = function () {
    if (!NATIVO_INI() && ES_IOS) {
      toast('En iPhone las alertas suenan y salen en pantalla. Deja Safari abierto con la pantalla encendida.');
      return;
    }
    if (nativo('notifOk')) {
      try {
        if (NATIVO.notifOk()) { toast('Las notificaciones ya están permitidas'); NATIVO.notificar('Minibia Helper', 'Prueba: así te llegarán las alertas.'); }
        else { toast('Activa las notificaciones de Minibia Helper y vuelve a la app'); NATIVO.ajustesNotif(); }
      } catch (e) { registrar('permiso nativo: ' + e.message); }
      return;
    }
    try {
      Notification.requestPermission().then(function (p) { ultimaAccion = 'permiso de avisos: ' + p; });
    } catch (e) { registrar('permiso: ' + e.message); }
  };

  var avisoEl = el('div'); avisoEl.id = 'mbh-aviso';
  var avisoTxt = el('div', 'margin-bottom:6px;white-space:pre-wrap');
  var avisoBtns = el('div', 'display:flex;gap:6px;justify-content:center');
  var btnAvisoReanudar = boton('Reanudar helper');
  var btnAvisoCerrar = boton('Cerrar aviso');
  avisoBtns.appendChild(btnAvisoReanudar);
  avisoBtns.appendChild(btnAvisoCerrar);
  avisoEl.appendChild(avisoTxt);
  avisoEl.appendChild(avisoBtns);
  (document.body || document.documentElement).appendChild(trRaiz(avisoEl));

  function mostrarAviso(texto, conReanudar) {
    avisoTxt.textContent = texto;
    btnAvisoReanudar.style.display = conReanudar ? 'inline-block' : 'none';
    avisoEl.style.display = 'block';
  }
  function cerrarAviso() {
    avisoEl.style.display = 'none';
    detenerAlarma();
    detenerParpadeo();
  }
  btnAvisoCerrar.onclick = cerrarAviso;

  var TITULOS_ALERTA = { gmchat: 'EL GM TE HABLO', botcheck: 'BOTCHECK', gm: 'GM / ANTI-BOT', vida: 'VIDA BAJA', cap: 'CAP BAJA', prueba: 'PRUEBA', muerte: 'MUERTO', desc: 'DESCONECTADO', chat: 'CHAT DESBLOQUEADO', caza: 'CAVE HUNT', train: 'TRAINING', macro: 'MACRO' };
  function alertar(tipo, msg) {
    var esGM = tipo === 'gm', esVida = tipo === 'vida', esCap = tipo === 'cap';
    ultimaAlerta = (charActual ? charActual + ': ' : '') + String(msg).split('\n')[0].slice(0, 70);
    pitidos(esGM ? 5 : (tipo === 'botcheck' ? 4 : (esVida ? 3 : (esCap ? 3 : 2))), esGM ? 620 : (tipo === 'botcheck' ? 580 : (esVida ? 500 : 460)));
    var texto = (charActual ? '[' + charActual + '] ' : '') + ((!esGM && pausaGM) ? msg + '\n(el helper sigue en pausa por el GM)' : msg);
    mostrarAviso(texto, esGM || pausaGM);
    avisoEl.style.visibility = 'visible';
    parpadearTitulo(TITULOS_ALERTA[tipo] || 'AVISO');
    notificar(msg);
    avisoCelular(tipo, msg);
    if (esGM) { iniciarAlarma(); }
  }
  btnProbarA.onclick = function () { alertar('prueba', 'Prueba de alerta.'); };
  btnBateria.onclick = function () {
    if (!nativo('bateria')) { return; }
    try {
      if (NATIVO.bateriaOk()) { toast('Listo: Android no limita la batería de Minibia Helper'); }
      else { NATIVO.bateria(); }
    } catch (e) { registrar('batería: ' + e.message); }
  };

  // Servicio en primer plano: mantiene viva la app (y el CPU con la pantalla apagada) mientras el helper trabaja
  var fondoOn = false, fondoTxt = '', fondoT = 0, fondoAvisoBat = false;
  function textoFondo() {
    var q = charActual ? charActual + ' · ' : '';
    if (pausaGM) { return q + 'en pausa por GM'; }
    if (cazaCorriendo) { return q + 'cazando' + (cazaEstado ? ' · ' + String(cazaEstado).slice(0, 60) : ''); }
    if (corriendo) { return q + 'runeando · ' + runas + ' runas'; }
    if (cfg.trainOn) { return q + 'training'; }
    return q + 'en marcha';
  }
  // Sin la app de Android (Safari en iPhone, Chrome, etc.): mantener la pantalla encendida mientras trabaja
  var pantallaLock = null, pantallaPidiendo = false, ocultoDesde = 0;
  function pantallaEncendida(on) {
    try {
      if (!('wakeLock' in navigator)) { return; }
      if (on && !pantallaLock && !pantallaPidiendo && document.visibilityState === 'visible') {
        pantallaPidiendo = true;
        navigator.wakeLock.request('screen').then(function (l) {
          pantallaPidiendo = false; pantallaLock = l;
          l.addEventListener('release', function () { pantallaLock = null; });
        }, function () { pantallaPidiendo = false; });
      } else if (!on && pantallaLock) { pantallaLock.release(); pantallaLock = null; }
    } catch (e) { pantallaPidiendo = false; }
  }
  document.addEventListener('visibilitychange', function () {
    if (NATIVO_INI()) { return; }
    var activo = !!(corriendo || cazaCorriendo || cfg.trainOn);
    if (document.visibilityState === 'hidden') { ocultoDesde = Date.now(); return; }
    if (activo && ocultoDesde && Date.now() - ocultoDesde > 5000 && ES_MOVIL) {
      toast((ES_IOS ? 'El iPhone' : 'El navegador') + ' pausó el helper mientras estabas fuera (' + Math.round((Date.now() - ocultoDesde) / 1000) + ' s). Deja el juego abierto para que siga trabajando.');
    }
    ocultoDesde = 0;
    pantallaEncendida(activo);
  });
  function fondoTick() {
    if (!NATIVO_INI()) { pantallaEncendida(!!(corriendo || cazaCorriendo || cfg.trainOn)); return; }
    if (!nativo('activo')) { return; }
    var on = !!(corriendo || cazaCorriendo || cfg.trainOn);
    var txt = on ? textoFondo() : '';
    var ahora = Date.now();
    if (on === fondoOn && (!on || (txt === fondoTxt && ahora - fondoT < 60000) || ahora - fondoT < 10000)) { return; }
    try { NATIVO.activo(on, trTexto(txt)); } catch (e) { registrar('servicio: ' + e.message); return; }
    if (on && !fondoOn && !fondoAvisoBat) {
      fondoAvisoBat = true;
      try { if (!NATIVO.bateriaOk()) { toast('Consejo: en Sistema toca "Sin límite de batería" para correr con la pantalla apagada'); } } catch (e) {}
    }
    fondoOn = on; fondoTxt = txt; fondoT = ahora;
  }

  // ---------- Atajo de teclado para ocultar/mostrar panel (Ctrl+Shift+H) ----------
  var oculto = true;
  var fab = null, fabOculto = false, KEY_FAB_OCULTO = 'minibiaHelperFabOculto';
  function aplicarOculto() {
    panel.style.visibility = oculto ? 'hidden' : 'visible';
    // si el panel se abre (por ejemplo, por una alerta de GM) el icono vuelve a verse, para poder cerrarlo
    if (!oculto && fabOculto) { ponerFabOculto(false, true); }
    pintarFab();
  }
  function pintarFab() {
    if (fab) { fab.className = (oculto ? '' : 'abierto') + ((corriendo || cazaCorriendo) ? ' on' : ''); }
  }
  function abrirCerrarPanel() {
    if (oculto && !IDIOMA) { pedirIdioma(abrirCerrarPanel); return; }
    if (oculto && !avisoLegalOk()) { pedirAvisoLegal(abrirCerrarPanel); return; }
    if (oculto && licExigir(abrirCerrarPanel, abrirCerrarPanel)) { return; }
    if (oculto && novedadesPendientes()) { mostrarNovedades(abrirCerrarPanel); return; }
    oculto = !oculto; aplicarOculto();
    if (!oculto && minimizado) { minimizado = false; try { localStorage.setItem(KEY_MIN, '0'); } catch (e) {} aplicarEstado(); }
  }
  // Aviso corto en pantalla (por ejemplo, al ocultar el icono con dos dedos)
  var toastEl = null, toastT = null;
  function toast(msg) {
    try {
      if (!toastEl) {
        toastEl = document.createElement('div');
        toastEl.style.cssText = 'position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:2147483647;pointer-events:none;' +
          'background:rgba(18,20,20,.94);color:#ececec;font:600 13px/1.4 Verdana,Tahoma,sans-serif;padding:8px 14px;border:1px solid #000;' +
          'box-shadow:inset 0 0 0 1px #555959,0 3px 12px rgba(0,0,0,.65);max-width:86vw;text-align:center;transition:opacity .3s';
        (document.body || document.documentElement).appendChild(trRaiz(toastEl));
      }
      toastEl.textContent = msg; toastEl.style.opacity = '1'; toastEl.style.display = 'block';
      clearTimeout(toastT);
      toastT = setTimeout(function () { toastEl.style.opacity = '0'; setTimeout(function () { toastEl.style.display = 'none'; }, 350); }, 2600);
    } catch (e) {}
  }
  function ponerFabOculto(v, silencioso) {
    fabOculto = !!v;
    try { localStorage.setItem(KEY_FAB_OCULTO, fabOculto ? '1' : '0'); } catch (e) {}
    if (fab) { fab.style.display = fabOculto ? 'none' : 'flex'; }
    if (fabOculto && !oculto) { oculto = true; panel.style.visibility = 'hidden'; }
    if (!silencioso) { toast(fabOculto ? 'Minibia Helper oculto · desliza con 2 dedos hacia un lado para mostrarlo' : 'Minibia Helper visible'); }
  }
  if (ES_MOVIL) {
    // Botón redondo: toca para abrir/cerrar el panel; arrástralo para moverlo
    fab = document.createElement('div');
    fab.id = 'mbh-fab'; fab.setAttribute('role', 'button'); fab.setAttribute('aria-label', 'Minibia Helper');
    var fabImg = document.createElement('img'); fabImg.src = ICONO_URI; fabImg.alt = ''; fabImg.draggable = false;
    fab.appendChild(fabImg);
    (document.body || document.documentElement).appendChild(trRaiz(fab));
    try { fabOculto = localStorage.getItem(KEY_FAB_OCULTO) === '1'; } catch (e) {}
    fab.style.display = fabOculto ? 'none' : 'flex';
    var KEY_FAB = 'minibiaHelperFab', fabSt = null;
    function colocarFab(x, y) {
      x = Math.max(0, Math.min(window.innerWidth - 48, x)); y = Math.max(0, Math.min(window.innerHeight - 48, y));
      fab.style.left = x + 'px'; fab.style.top = y + 'px'; fab.style.right = 'auto';
    }
    try { var gf = JSON.parse(localStorage.getItem(KEY_FAB) || 'null'); if (gf && typeof gf.x === 'number') { colocarFab(gf.x, gf.y); } } catch (e) {}

    // Gesto de dos dedos hacia un lado (en cualquier parte de la pantalla): oculta o muestra el icono.
    // Solo observa: no bloquea nada del juego.
    var dosDedos = null, dosDedosT = 0;
    function centro(ts) { return { x: (ts[0].clientX + ts[1].clientX) / 2, y: (ts[0].clientY + ts[1].clientY) / 2 }; }
    window.addEventListener('touchstart', function (e) {
      try {
        if (e.touches.length === 2) { var c = centro(e.touches); dosDedos = { x: c.x, y: c.y, t: Date.now(), hecho: false }; if (fabSt) { fabSt = null; } }
        else if (e.touches.length > 2) { dosDedos = null; }
      } catch (err) {}
    }, { capture: true, passive: true });
    window.addEventListener('touchmove', function (e) {
      try {
        if (!dosDedos || dosDedos.hecho || e.touches.length !== 2) { return; }
        if (Date.now() - dosDedos.t > 900) { dosDedos = null; return; }
        var c = centro(e.touches), dx = c.x - dosDedos.x, dy = c.y - dosDedos.y;
        if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          dosDedos.hecho = true; dosDedosT = Date.now();
          ponerFabOculto(!fabOculto);
        }
      } catch (err) {}
    }, { capture: true, passive: true });
    window.addEventListener('touchend', function (e) {
      try { if (e.touches.length === 0 || (dosDedos && !dosDedos.hecho)) { dosDedos = null; } } catch (err) {}
    }, { capture: true, passive: true });
    window.addEventListener('touchcancel', function () { dosDedos = null; }, { capture: true, passive: true });

    // Todo lo que toca el icono se queda en el icono: el juego no recibe el toque (antes un toque en el
    // icono también abría el menú lateral del juego). Se escucha en window y en fase de captura para
    // adelantarse a los manejadores del juego.
    function enFab(t) { return !!(t && t.closest && t.closest('#mbh-fab')); }
    function manejarFab(e) {
      var t = e.type;
      if (t === 'pointerdown') {
        if (e.isPrimary === false || (e.button !== undefined && e.button > 0)) { return; }
        fabSt = { id: e.pointerId, x: e.clientX, y: e.clientY, l: fab.offsetLeft, t: fab.offsetTop, mov: false };
        try { fab.setPointerCapture(e.pointerId); } catch (err) {}
      } else if (t === 'pointermove') {
        if (!fabSt || e.pointerId !== fabSt.id) { return; }
        var dx = e.clientX - fabSt.x, dy = e.clientY - fabSt.y;
        if (!fabSt.mov && Math.abs(dx) + Math.abs(dy) > 10) { fabSt.mov = true; }
        if (fabSt.mov) { colocarFab(fabSt.l + dx, fabSt.t + dy); }
      } else if (t === 'pointerup') {
        if (!fabSt || e.pointerId !== fabSt.id) { return; }
        var mov = fabSt.mov; fabSt = null;
        if (mov) { try { localStorage.setItem(KEY_FAB, JSON.stringify({ x: fab.offsetLeft, y: fab.offsetTop })); } catch (err) {} }
        else if (Date.now() - dosDedosT > 600) { abrirCerrarPanel(); }
      } else if (t === 'pointercancel') { fabSt = null; }
    }
    ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'touchstart', 'touchmove', 'touchend', 'touchcancel',
     'mousedown', 'mousemove', 'mouseup', 'click', 'dblclick', 'contextmenu'].forEach(function (tipo) {
      window.addEventListener(tipo, function (e) {
        if (!enFab(e.target)) { return; }
        if (tipo.indexOf('pointer') === 0) { try { manejarFab(e); } catch (err) { registrar('icono: ' + err.message); } }
        e.stopImmediatePropagation(); e.stopPropagation();
        if (e.cancelable && tipo !== 'pointermove' && tipo !== 'touchmove') { e.preventDefault(); }
      }, { capture: true, passive: false });
    });
    window.addEventListener('resize', function () { if (fab.style.left) { colocarFab(fab.offsetLeft, fab.offsetTop); } });

    // Los toques dentro del panel y de sus barras tampoco llegan al juego
    function aislar(elm) {
      ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'click', 'dblclick', 'contextmenu'].forEach(function (tipo) {
        elm.addEventListener(tipo, function (e) { e.stopPropagation(); }, false);
      });
    }
    aislar(panel); aislar(avisoEl);
  }
  aplicarOculto();
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.shiftKey && (e.key === 'H' || e.key === 'h')) {
      e.preventDefault();
      abrirCerrarPanel();
    }
  }, true);

  // ---------- GM / anti-bot ----------
  var pausaGM = false, estabaCorriendo = false, cazaEstabaCorriendo = false, pausaCausa = '';
  var gmInc = null, botcheck = null, ultimaRespuesta = '';
  var tInicio = Date.now();
  var ultimaActividad = Date.now();
  ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart'].forEach(function (t) {
    document.addEventListener(t, function (e) { if (e.isTrusted) { ultimaActividad = Date.now(); } }, true);
  });

  // causa: 'chat' (el GM escribió), 'captcha' (ventana del juego) o 'botcheck' (cuenta atrás)
  function pausarPorGM(motivo, suave, causa) {
    if (!pausaGM) {
      estabaCorriendo = corriendo; cazaEstabaCorriendo = cazaCorriendo;
      pausaGM = true;
      detener('PAUSADO: ' + motivo);
      try { cazaParar('detenido por GM / anti-bot'); } catch (e) {}
      if (!suave) {
        minimizado = true;
        try { localStorage.setItem(KEY_MIN, '1'); } catch (e) {}
        aplicarEstado();
        oculto = false;
        aplicarOculto();
      }
    }
    if (causa) { pausaCausa = causa; }
    ultimaAccion = 'PAUSADO: ' + motivo;
    alertar(causa === 'botcheck' ? 'botcheck' : (suave ? 'gmchat' : 'gm'), '⚠ ' + motivo + (suave ? '' : (causa === 'botcheck' ? '' : '\nHelper en pausa. Resuelve la verificación anti-bot.')));
  }
  function reanudar(auto) {
    var correr = estabaCorriendo, cazar = cazaEstabaCorriendo;
    pausaGM = false; pausaCausa = ''; gmInc = null;
    estabaCorriendo = false; cazaEstabaCorriendo = false;
    cerrarAviso();
    if (correr) { iniciar(); }
    if (cazar) { cazaIniciar(); }
    ultimaAccion = (auto ? 'reanudado solo' : 'reanudado') + (correr || cazar ? '' : ' (pulsa Iniciar)');
  }
  btnAvisoReanudar.onclick = function () { reanudar(false); };

  var RE_GM_MSG = /^(?:(\d{1,2}):(\d{2})\s+)?(.*?)\s*\[(?:GOD|GM)\]\s*(?:says|yells|whispers)?\s*:\s*(.*)$/i;
  var RE_GM_TAG = /\[(?:GOD|GM)\]/i;
  var RE_BOTCHECK = /anti-?\s?bot check will begin in (\d+)\s*seconds?/i;
  var RE_ANTIBOT = /anti-?\s?bot/i;
  var RE_ANTIBOT_PASS = /anti-?\s?bot[^.]{0,40}(?:passed|success|verified|complete|solved|correct)/i;
  var RE_GM_RISA = /^(?:l+o+l+|x+d+|ha(?:ha)+h?|je(?:je)+|ja(?:ja)+|lmao|rofl)(?:\s+(?:l+o+l+|x+d+))?[\s!.]*$/i;
  var RE_SALUDO = /^(?:hi+|hello+|hey+|hola|sup|yo|hi there|hey there)[\s!.]*$/i;
  var RE_PRESENCIA = /(?:you|u|ya)\s*(?:there|here|afk|alive|around)|\bthere\s*\?|anybody|anyone|still\s+(?:there|here|playing|alive)|are you (?:here|there|afk|alive|botting|a bot|real)|\bafk\b|\banswer\b|\brespond\b|\bhello\b.*\?|\bhi\b.*\?|^\?+$/i;

  var RESP_PRESENCIA = [
    'yes', 'yes :)', 'yep', 'yep :)', 'yeah', 'yeah :)', 'yes im here', 'yes im here :)', 'here', 'here :)',
    'here! :D', 'yes! :D', 'yup', 'yup :)', 'yes xD', 'yeah im here xD', 'im here', 'im here :)', 'yes sir :)', 'yes, hi :)'
  ];
  var RESP_SALUDO = [
    'hi', 'hi :)', 'hello', 'hello :)', 'hey', 'hey :)', 'hi there', 'hi there :)',
    'hello! :D', 'hi! :D', 'hey! :)', 'hola', 'hi, whats up?', 'hey whats up :)'
  ];
  function pick(lista) {
    var r = lista[Math.floor(Math.random() * lista.length)];
    if (r === ultimaRespuesta && lista.length > 1) { r = lista[(lista.indexOf(r) + 1) % lista.length]; }
    ultimaRespuesta = r;
    return r;
  }
  // Solo contesta mensajes cortos y de rutina; lo demás lo ve el usuario
  function elegirRespuesta(texto) {
    var t = String(texto || '').trim();
    if (!t || t.length > 60) { return null; }
    if (RE_SALUDO.test(t)) { return pick(RESP_SALUDO); }
    if (/\?\s*$/.test(t) || RE_PRESENCIA.test(t)) { return pick(RESP_PRESENCIA); }
    return null;
  }

  var gmVistos = {};
  function esNuevo(clave, ventanaMs) {
    var ahora = Date.now();
    if (gmVistos[clave] && ahora - gmVistos[clave] < ventanaMs) { return false; }
    gmVistos[clave] = ahora;
    return true;
  }
  // ¿La línea del chat (con hora "17:17") es vieja? Compara con la hora local; entre 4 y 59 minutos
  function lineaVieja(h, m) {
    if (h === undefined) { return false; }
    var d = new Date();
    var atras = ((d.getHours() * 60 + d.getMinutes()) - (Number(h) * 60 + Number(m)) + 1440) % 1440;
    return atras >= 4 && atras <= 59;
  }

  function programarRespuesta(texto) {
    var lo = Math.max(0, cfg.gmReplyMin), hi = Math.max(lo, cfg.gmReplyMax);
    gmInc.resp++;
    gmInc.pendiente = true;
    setTimeout(function () {
      try { decir(texto, metodo); ultimaAccion = 'GM: contesté "' + texto + '"'; }
      catch (e) { registrar('responder GM: ' + e.message); alertar('gm', '⚠ No pude contestar al GM: ' + e.message); }
      if (gmInc) { gmInc.pendiente = false; gmInc.ultimoMsg = Date.now(); }
    }, (lo + Math.random() * (hi - lo)) * 1000);
  }

  function gmResuelto(motivo) {
    gmInc = null;
    ultimaAccion = 'GM resuelto: ' + motivo;
    if (pausaGM && pausaCausa === 'chat' && cfg.gmAutoReanudar && !capVisto && !botcheck) { reanudar(true); }
    else { cerrarAviso(); }
  }

  function gmLinea(tx, forzar) {
    var ahora = Date.now();
    var m = tx.match(RE_GM_MSG);
    var texto = m ? m[4].trim() : '';
    if (!forzar) {
      if (m && lineaVieja(m[1], m[2])) { return; }
      if (!esNuevo(tx, m && m[1] !== undefined ? 1800000 : 20000)) { return; }
    }
    if (texto && RE_GM_RISA.test(texto)) { if (gmInc) { gmResuelto('el GM se despidió ("' + texto + '")'); } return; }
    var resp = (cfg.gmResponder && texto) ? elegirRespuesta(texto) : null;
    if (!gmInc) { gmInc = { t: ahora, resp: 0, ultimoMsg: ahora, pendiente: false }; }
    gmInc.ultimoMsg = ahora;
    if (resp && gmInc.resp < 3) {
      pausarPorGM('El GM dijo: "' + texto.slice(0, 50) + '". Le contesto "' + resp + '".', true, 'chat');
      programarRespuesta(resp);
    } else {
      pausarPorGM('Mensaje de GM: ' + (texto || tx).slice(0, 70) + (resp ? ' (ya contesté 3 veces)' : ''), false, 'chat');
    }
  }

  function botcheckMsg(n, ahora) {
    if (!botcheck) { botcheck = { finT: 0, logout: false, intentos: 0, ultIntento: 0 }; }
    botcheck.finT = ahora + n * 1000;
    var extra = cfg.botcheckLogoutOn ? ' Si no tocas nada, cerraré tu sesión cuando falten ' + cfg.botcheckLogoutSeg + ' s.' : '';
    pausarPorGM('Botcheck anti-bot en ' + n + ' s. Mueve el mouse si estás ahí.' + extra, false, 'botcheck');
  }
  function botcheckPasado() {
    botcheck = null;
    try { localStorage.removeItem(KEY_BOTCHECK); } catch (e) {}
    if (pausaGM && (pausaCausa === 'captcha' || pausaCausa === 'botcheck') && cfg.gmAutoReanudar) { reanudar(true); }
  }
  // Cierra la sesión antes de que empiece el botcheck: así no te penalizan por runear o lanzar
  // hechizos sin contestar, y el botcheck te sale al volver a entrar
  function botcheckLogout() {
    botcheck.logout = true; botcheck.ultIntento = 0;
    escribirJSON(KEY_BOTCHECK, { char: charActual, t: Date.now(), relogin: !!cfg.gmRelogin });
    detener('botcheck: cerrando sesión'); cazaParar('botcheck: cerrando sesión');
    alertar('botcheck', '🚪 Estás inactivo y viene un botcheck: cierro la sesión de ' + charActual + ' para evitar el castigo.\nAl volver a entrar te saldrá el botcheck: resuélvelo.');
  }

  // ----- Revisión de presencia: un monstruo aparece junto a ti y pregunta "are you there?" (texto naranja) -----
  // Nunca se contesta sola: pausa todo, suena la alarma y te avisa (también al celular) para que contestes TÚ.
  var RE_PRES_MONSTRUO = /\b(?:are\s+)?(?:you|u)\s+(?:still\s+)?(?:there|here|alive|awake|afk)\b|\bstill\s+(?:there|here)\b|\banyone\s+there\b|\bafk\s*\?/i;
  var RE_HABLA = /^(?:\d{1,2}:\d{2}\s+)?([A-Za-z][A-Za-z' .\-]{1,30}?)\s*(?:\[\d+\])?\s*(?:says|yells|whispers)?\s*:\s*([\s\S]+)$/i;
  function esNaranja(nodo) {
    try {
      var els = nodo.nodeType === 1 ? [nodo].concat([].slice.call(nodo.querySelectorAll('*'), 0, 8)) : (nodo.parentElement ? [nodo.parentElement] : []);
      for (var i = 0; i < els.length; i++) {
        var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(getComputedStyle(els[i]).color || '');
        if (m && +m[1] >= 200 && +m[2] >= 80 && +m[2] <= 190 && +m[3] <= 90) { return true; }
      }
    } catch (e) {}
    return false;
  }
  function criaturaLlamada(nombre, tipo) {
    var n = String(nombre || '').toLowerCase().trim();
    return (criaturasActivas() || []).filter(function (c) { return c && c.type === tipo && String(c.name || '').toLowerCase() === n; })[0] || null;
  }
  var presenciaVista = null;
  function revisarPresencia(tx, nodo) {
    if (!cfg.presenciaOn || !charActual) { return false; }
    var plano = String(tx || '').replace(/\s+/g, ' ').trim();
    if (!plano || plano.length > 160 || !RE_PRES_MONSTRUO.test(plano) || RE_GM_TAG.test(plano)) { return false; }
    var m = plano.match(RE_HABLA), quien = m ? m[1].trim() : '';
    if (quien && quien.toLowerCase() === String(charActual).toLowerCase()) { return false; }   // lo escribí yo
    if (quien && criaturaLlamada(quien, 0)) { return false; }                                   // lo dijo otro jugador
    var mon = quien ? criaturaLlamada(quien, 1) : null;
    if (!mon && !(nodo && esNaranja(nodo))) { return false; }
    if (!esNuevo('pres:' + (quien || plano).toLowerCase(), 60000)) { return true; }
    presenciaVista = { t: Date.now(), quien: quien };
    pausarPorGM((quien || 'Un monstruo') + ' te pregunta si estás ahí: "' + (m ? m[2] : plano).slice(0, 60) + '".\nContéstale TÚ en el juego y luego toca «Reanudar helper».', false, 'presencia');
    return true;
  }
  function chatNuevo(tx, nodo) {
    var ahora = Date.now();
    if (ahora - tInicio < 8000) { return; }              // historial que el juego dibuja al cargar
    if (revisarPresencia(tx, nodo)) { return; }
    antiDropDialogoDetectaItem(tx, nodo);                // GM/monstruo pide recoger ítem del suelo
    if (!cfg.gmOn) { return; }
    var bc = tx.match(RE_BOTCHECK);
    if (bc) { if (esNuevo('bc:' + tx, 15000)) { botcheckMsg(+bc[1], ahora); } return; }
    if (RE_GM_TAG.test(tx)) { gmLinea(tx, false); return; }
    if (RE_ANTIBOT_PASS.test(tx)) { if (esNuevo('ok:' + tx, 15000)) { botcheckPasado(); } return; }
    if (RE_ANTIBOT.test(tx) && tx.length <= 140 && /check|verif|captcha|solve|begin|start/i.test(tx) && esNuevo('ab:' + tx, 120000)) {
      pausarPorGM('Mensaje de anti-bot: ' + tx.slice(0, 70), false, 'captcha');
    }
  }
  btnProbarGM.onclick = function () {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    gmLinea(p(d.getHours()) + ':' + p(d.getMinutes()) + ' God Prueba [GOD] says: you there?', true);
  };

  var obsGM = new MutationObserver(function (muts) {
    if (!cfg.gmOn && !cfg.presenciaOn) { return; }
    var nuevos = [], enChat = 0;
    for (var i = 0; i < muts.length; i++) {
      var m = muts[i];
      if (panel.contains(m.target) || avisoEl.contains(m.target)) { continue; }
      var dentro = !!(m.target && m.target.closest && m.target.closest('#chat-text-area'));
      var nodos = m.addedNodes;
      for (var j = 0; j < nodos.length; j++) {
        var tx = textoDe(nodos[j]).trim();
        if (!tx || tx.length > 400) { continue; }
        if (dentro) { enChat++; }
        nuevos.push({ tx: tx, chat: dentro, nodo: nodos[j] });
      }
    }
    // si de golpe aparecen muchas líneas, el juego está redibujando el historial del chat: se ignora
    if (enChat > 12) { nuevos = nuevos.filter(function (n) { return !n.chat; }); }
    nuevos.forEach(function (n) { try { chatNuevo(n.tx, n.nodo); } catch (e) { registrar('chat: ' + e.message); } });
  });
  obsGM.observe(document.body, { childList: true, subtree: true });

  // El captcha del juego (#captcha-modal) ya está en la página y solo se muestra o se oculta, así que el
  // observador de texto no lo ve: se vigila su visibilidad cada segundo. También: cuenta atrás del botcheck,
  // muerte, conexión perdida y chat desbloqueado (con el chat desbloqueado las teclas del bot se escriben
  // en el chat en vez de usar el hotbar).
  // Segundos que le quedan al captcha del juego (lo lee del contador que muestra la ventana o el indicador minimizado)
  var capAvisoFinal = false;
  function captchaSegundos() {
    try {
      // solo el que se ve (la ventana o el indicador minimizado), y si hay dos, el menor
      var fuentes = [['captcha-modal', '.captcha-status'], ['captcha-minimized-indicator', '.captcha-minimized-timer']], mejor = null;
      for (var i = 0; i < fuentes.length; i++) {
        if (!visibleId(fuentes[i][0])) { continue; }
        var el = document.querySelector('#' + fuentes[i][0] + ' ' + fuentes[i][1]);
        var m = el && /(\d+)\s*[sс](?![a-zа-я])/i.exec(el.textContent || '');
        if (m && (mejor === null || Number(m[1]) < mejor)) { mejor = Number(m[1]); }
      }
      if (mejor !== null) { return mejor; }
    } catch (e) {}
    return null;
  }
  // Resuelve el captcha "impar" (6 fichas) del juego mediante Anti-Captcha ImageToTextTask (numeric: 1).
  // Combina los 6 canvas del modal en una imagen 192x128, la envía, espera el resultado cada 3s y pulsa la ficha indicada.
  function avisoFasePruebas(tipo) {
    var msg = '⚠ FASE DE PRUEBAS: El ' + tipo + ' está en fase de pruebas y puede no funcionar correctamente. Si falla, contacta con @osbeliaal. El helper se parcha constantemente y estamos corrigiéndolo lo más rápido posible. Disculpa las molestias.';
    registrar(msg);
    try { alertar('gm', msg); } catch (e) {}
}

function resolverCaptchaAntiCaptcha() {
    try {
      var modal = document.getElementById('captcha-modal');
      if (!modal) { captchaSolving = false; return; }
      var tiles = Array.prototype.slice.call(modal.querySelectorAll('canvas'));
      if (!tiles || tiles.length < 6) { registrar('captcha: no se encontraron 6 fichas (canvas) en el modal'); captchaSolving = false; return; }
      tiles = tiles.slice(0, 6);
      var W = 192, H = 128, tw = 64, th = 64;
      var off = document.createElement('canvas');
      off.width = W; off.height = H;
      var ctx = off.getContext('2d');
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      for (var i = 0; i < 6; i++) { ctx.drawImage(tiles[i], (i % 3) * tw, Math.floor(i / 3) * th, tw, th); }
      var base64 = off.toDataURL('image/png').split(',')[1];
      var apiKey = cfg.captchaApiKey || '368b4f06438a37dc71a9b551ae3e6980';
      registrar('captcha: enviando 6 fichas a Anti-Captcha...');
      fetch('https://api.anti-captcha.com/createTask', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientKey: apiKey,
          task: { type: 'ImageToTextTask', body: base64, phrase: false, case: false, numeric: 1, math: 0, minLength: 1, maxLength: 2 }
        })
      }).then(function (r) { return r.json(); }).then(function (j) {
        if (!j || j.errorId || !j.taskId) { registrar('captcha: error creando tarea: ' + (j && j.errorDescription ? j.errorDescription : 'sin respuesta')); captchaSolving = false; return; }
        captchaTaskId = j.taskId; captchaT0 = Date.now();
        registrar('captcha: tarea ' + j.taskId + ' creada, esperando resultado...');
        var t = setInterval(function () {
          try {
            if (Date.now() - captchaT0 > 120000) { clearInterval(t); registrar('captcha: tiempo agotado esperando resultado'); captchaSolving = false; return; }
            fetch('https://api.anti-captcha.com/getTaskResult', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ clientKey: apiKey, taskId: captchaTaskId })
            }).then(function (r) { return r.json(); }).then(function (res) {
              if (!res) { return; }
              if (res.errorId) { clearInterval(t); registrar('captcha: error obteniendo resultado: ' + res.errorDescription); captchaSolving = false; return; }
              if (res.status === 'ready') {
                clearInterval(t);
                var texto = String(res.text || '').trim();
                var m = /([1-6])/.exec(texto);
                var idx = m ? Number(m[1]) - 1 : -1;
                if (idx >= 0 && idx < 6 && tiles[idx]) {
                  registrar('captcha: Anti-Captcha indica ficha #' + (idx + 1) + ' (' + texto + ')');
                  clicTileCaptcha(tiles[idx]);
                } else { registrar('captcha: respuesta de Anti-Captcha no usable: ' + texto); }
                captchaSolving = false;
              }
            }).catch(function (e) { registrar('captcha: poll error: ' + e.message); });
          } catch (e) { registrar('captcha: poll exception: ' + e.message); }
        }, 3000);
      }).catch(function (e) {
        registrar('captcha: createTask error: ' + e.message);
        captchaSolving = false;
      });
    } catch (e) {
      registrar('captcha: ' + e.message);
      captchaSolving = false;
    }
  }
  function clicTileCaptcha(canvas) {
    try {
      var target = canvas;
      var padre = canvas.parentElement;
      if (padre && /^(button|a|div)$/i.test(padre.tagName) && padre.getClientRects().length > 0) { target = padre; }
      if (typeof target.click === 'function') { target.click(); return; }
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    } catch (e) { registrar('captcha: clic ficha: ' + e.message); }
  }

// ---------- Anti-drop: recoge automáticamente ítems del suelo ----------
// Sistema anti-bot: un monstruo/GM tira un ítem al suelo y el jugador debe
// recogerlo. Si cfg.antiDropOn está activo, el helper lo recoge solo.
// Envía ItemUsePacket al tile (índice 0xFF = tope del stack), igual que
// hace Mouse.use() cuando haces click en un ítem del suelo.
var antiDropLastTileKey = "", antiDropCooldown = 0, antiDropKnownItems = {}, antiDropWasOn = false;
var captchaAvisoMostrado = false, antiDropAvisoMostrado = false;
var antiDropItemEsperado = false, antiDropItemEsperadoT = 0;
var ANTI_DROP_ITEM_PHRASES = [
  /pick.?up\s+this\s+item/i,
  /take\s+this\s+item/i,
  /recoge\s+(?:este|ese|aquel)\s+(?:objeto|item|cosa)/i,
  /toma\s+(?:este|ese|aquel)\s+(?:objeto|item|cosa)/i,
  /coge\s+(?:este|ese|aquel)\s+(?:objeto|item|cosa)/i,
  /item\s+on\s+the\s+ground/i,
  /objeto\s+en\s+el\s+suelo/i,
  /objeto\s+en\s+el\s+piso/i,
  /recoge\s+lo\s+que\s+(?:cae|cayó|cayo)/i,
  /toma\s+lo\s+que\s+(?:cae|cayó|cayo)/i,
  /agarra\s+(?:esto|aquello)/i,
  /take\s+it/i,
];

function antiDropDialogoDetectaItem(tx, nodo) {
  if (!cfg.antiDropItemOn || !tx) { return false; }
  var t = String(tx || '');
  for (var i = 0; i < ANTI_DROP_ITEM_PHRASES.length; i++) {
    if (ANTI_DROP_ITEM_PHRASES[i].test(t)) {
      antiDropItemEsperado = true;
      antiDropItemEsperadoT = Date.now();
      registrar('anti-drop: diálogo de ítem detectado: ' + t.slice(0, 60));
      return true;
    }
  }
  return false;
}
function antiDropCollectItem(item, tile) {
  try {
    if (typeof gameClient !== "undefined" && gameClient.send && typeof ItemUsePacket !== "undefined") {
      var useObj = { "which": tile, "index": 0xFF };
      gameClient.send(new ItemUsePacket(useObj));
      registrar('anti-drop: ítem recogido del suelo (CID ' + item.id + ')');
      return true;
    }
  } catch (e) {
    registrar('anti-drop: error recogiendo: ' + e.message);
  }
  return false;
}

function resolverAntiDrop() {
  try {
    if (!cfg.antiDropOn || !gameClient || !gameClient.player || !gameClient.world) { return; }
    var ahora = Date.now();
    if (ahora - antiDropCooldown < 800) { return; }
    // Si ya pasó el tiempo de espera de diálogo, desactivar
    if (antiDropItemEsperado && ahora - antiDropItemEsperadoT > 20000) {
      antiDropItemEsperado = false;
    }
    var player = gameClient.player;
    var pPos = player.getPosition ? player.getPosition() : null;
    if (!pPos) { return; }
    var encontrado = false;
    // Escanear área 2x2 alrededor del jugador (incluyendo su propio tile)
    for (var dx = -1; dx <= 1 && !encontrado; dx++) {
      for (var dy = -1; dy <= 1 && !encontrado; dy++) {
        var tile = gameClient.world.getTileFromWorldPosition
          ? gameClient.world.getTileFromWorldPosition(new Position(pPos.x + dx, pPos.y + dy, pPos.z))
          : null;
        if (!tile || !tile.items || !tile.items.length) { continue; }
        for (var i = 0; i < tile.items.length; i++) {
          var item = tile.items[i];
          if (!item || !item.isPickupable || !item.isPickupable()) { continue; }
          // Evitar recoger el mismo ítem dos veces
          var tPos = tile.getPosition ? tile.getPosition() : null;
          var key = (tPos ? (tPos.x + "," + tPos.y + "," + tPos.z) : "?") + ":" + i;
          // Solo recoger ítems NUEVOS (que no estaban antes de activar anti-drop)
          if (antiDropKnownItems[key]) { continue; }
          registrar('anti-drop: ítem nuevo detectado en el suelo CID ' + item.id + ' en (' + (pPos.x + dx) + ',' + (pPos.y + dy) + ')');
          if (antiDropCollectItem(item, tile)) {
            antiDropLastTileKey = key;
            antiDropKnownItems[key] = true;
            antiDropCooldown = ahora;
            if (antiDropItemEsperado) { antiDropItemEsperado = false; registrar('anti-drop: ítem esperado recogido'); }
            encontrado = true;
            break;
          } else {
            // Si falló la recolección, marcarlo como conocido para no reintentar
            antiDropKnownItems[key] = true;
          }
        }
      }
    }
  } catch (e) {
    registrar('anti-drop: ' + e.message);
  }
}

  var capVisto = false, capCierreT = 0, muerteVista = false, wsEstabaAbierto = false, wsAvisado = false;
  var captchaSolving = false, captchaTaskId = 0, captchaT0 = 0;
  var chatDesbloqueado = false, chatDesdeT = 0, chatAvisado = false;
  function socketAbierto() {
    var gc = window.gameClient, s = gc && gc.networkManager && gc.networkManager.socket;
    return !s || s.readyState === 1;
  }
  function vigilarJuego() {
    try {
      if (!charActual) { return; }
      var ahora = Date.now();

      var cap = cfg.gmOn && (visibleId('captcha-modal') || visibleId('captcha-minimized-indicator'));
      var capSeg = cap ? captchaSegundos() : null;
      if (cap && !capVisto) {
        capVisto = true; capCierreT = 0; capAvisoFinal = false;
        pausarPorGM('Apareció el captcha anti-bot del juego' + (capSeg !== null ? ': te quedan ' + capSeg + ' s para resolverlo' : '') + '. Resuélvelo tú.', false, 'captcha');
        if (cfg.captchaSolverOn && !captchaSolving) {
          captchaSolving = true;
          registrar('captcha: detección, iniciando resolución automática con Anti-Captcha...');
          resolverCaptchaAntiCaptcha();
        }
      }
      else if (!cap && capVisto) { capVisto = false; captchaSolving = false; capCierreT = ahora; capAvisoFinal = false; botcheck = null; try { localStorage.removeItem(KEY_BOTCHECK); } catch (e) {} }
      // Anti-drop: inicializar registro de ítems preexistentes al activar
      if (cfg.antiDropOn && !antiDropWasOn) {
        antiDropKnownItems = {};
        var ahora2 = Date.now();
        var player2 = gameClient.player;
        var pPos2 = player2.getPosition ? player2.getPosition() : null;
        if (pPos2 && gameClient.world) {
          for (var dx2 = -1; dx2 <= 1; dx2++) {
            for (var dy2 = -1; dy2 <= 1; dy2++) {
              var tile2 = gameClient.world.getTileFromWorldPosition
                ? gameClient.world.getTileFromWorldPosition(new Position(pPos2.x + dx2, pPos2.y + dy2, pPos2.z))
                : null;
              if (!tile2 || !tile2.items || !tile2.items.length) continue;
              for (var i2 = 0; i2 < tile2.items.length; i2++) {
                var item2 = tile2.items[i2];
                if (!item2 || !item2.isPickupable || !item2.isPickupable()) continue;
                var tPos2 = tile2.getPosition ? tile2.getPosition() : null;
                var key2 = (tPos2 ? (tPos2.x + "," + tPos2.y + "," + tPos2.z) : "?") + ":" + i2;
                antiDropKnownItems[key2] = true;
              }
            }
          }
        }
        registrar('anti-drop: registro inicial de ' + Object.keys(antiDropKnownItems).length + ' ítems preexistentes');
      }
      antiDropWasOn = cfg.antiDropOn;
      // Anti-drop: si está activado y no estamos resolviendo captcha, escanear el suelo
      if (cfg.antiDropOn && !captchaSolving) {
        resolverAntiDrop();
      }
      // segundo aviso, más fuerte, cuando ya casi se acaba el tiempo
      if (cap && capVisto && !capAvisoFinal && capSeg !== null && capSeg > 0 && capSeg <= 15) {
        capAvisoFinal = true;
        alertar('gm', '⏰ ¡Captcha anti-bot: te quedan ' + capSeg + ' s para resolverlo!');
      }
      if (capCierreT && !capVisto && ahora - capCierreT > 6000) {
        capCierreT = 0;
        if (pausaGM && pausaCausa === 'captcha' && cfg.gmAutoReanudar && socketAbierto()) { reanudar(true); }
      }

      if (gmInc && !gmInc.pendiente && gmInc.resp > 0 && !capVisto && !botcheck && ahora - gmInc.ultimoMsg > 45000) {
        gmResuelto('el GM no volvió a escribir');
      }

      if (botcheck) {
        var resta = Math.round((botcheck.finT - ahora) / 1000);
        var afk = (ahora - ultimaActividad) > cfg.botcheckAfkSeg * 1000;
        if (cfg.botcheckLogoutOn && !botcheck.logout && resta <= cfg.botcheckLogoutSeg && resta > -20 && afk) { botcheckLogout(); }
        if (botcheck.logout) {
          if (!afk) { botcheck.logout = false; ultimaAccion = 'botcheck: volviste, cancelo el cierre de sesión'; }
          else if (ahora - botcheck.ultIntento > 2000 && botcheck.intentos < 30) {
            botcheck.ultIntento = ahora; botcheck.intentos++;
            cerrarSesion();
          }
        }
        if (resta < -120 && !capVisto) { botcheck = null; }
      }

      var muerto = visibleId('death-modal');
      if (muerto && !muerteVista) {
        muerteVista = true;
        detener('el personaje murió'); cazaParar('el personaje murió');
        alertar('muerte', '💀 El personaje murió. Helper detenido.');
      } else if (!muerto) { muerteVista = false; }

      var gc = window.gameClient, s = gc && gc.networkManager && gc.networkManager.socket;
      if (s) {
        if (s.readyState === 1) { wsEstabaAbierto = true; wsAvisado = false; }
        else if (wsEstabaAbierto && !wsAvisado && s.readyState === 3) {
          wsAvisado = true;
          recGuardarSnap();
          detener('desconectado'); cazaParar('desconectado');
          if (botcheck && botcheck.logout) {
            alertar('botcheck', '🚪 Sesión cerrada por el botcheck. Cuando vuelvas a entrar con ' + charActual + ' te saldrá el botcheck: resuélvelo.');
          } else {
            alertar('desc', '🔌 Conexión perdida con el servidor.');
          }
        }
      }

      var ci = document.getElementById('chat-input');
      chatDesbloqueado = !!ci && ci.getAttribute('contenteditable') === 'true';
      if (chatDesbloqueado && (corriendo || cazaCorriendo)) {
        if (!chatDesdeT) { chatDesdeT = Date.now(); }
        else if (!chatAvisado && Date.now() - chatDesdeT > 8000) {
          chatAvisado = true;
          alertar('chat', '⌨ El chat está desbloqueado: pulsa Enter en el juego para bloquearlo, o las teclas del bot no funcionarán.');
        }
      } else { chatDesdeT = 0; chatAvisado = false; }
    } catch (e) { registrar('vigilar juego: ' + e.message); }
  }

  // Volver a entrar solo tras el cierre por botcheck (experimental y apagado por defecto: al entrar sale el
  // botcheck y, si no estás, te lo comes igual)
  var reloginT = 0, reloginN = 0;
  function reloginTick() {
    try {
      if (nombrePersonaje()) { reloginN = 0; return; }
      var p = leerJSON(KEY_BOTCHECK, null);
      if (!p || !p.relogin || Date.now() - p.t > 15 * 60000 || reloginN > 12) { return; }
      var ahora = Date.now();
      if (ahora - reloginT < 5000) { return; }
      reloginT = ahora;
      if (visibleId('character-select-modal')) {
        var lista = document.getElementById('character-select-list');
        var items = lista ? lista.querySelectorAll('*') : [];
        for (var i = 0; i < items.length; i++) {
          if (items[i].childElementCount === 0 && (items[i].textContent || '').indexOf(p.char) >= 0) { items[i].click(); break; }
        }
        setTimeout(function () { var b = document.getElementById('char-select-enter'); if (b) { b.click(); } }, 700);
        reloginN++;
      } else if (visibleId('floater-enter')) {
        var u = document.getElementById('user-username'), pw = document.getElementById('user-password'), b2 = document.getElementById('enter-game');
        if (u && pw && b2 && u.value && pw.value && !b2.disabled) { b2.click(); reloginN++; }
      }
    } catch (e) { registrar('relogin: ' + e.message); }
  }

  // ---------- Protection zone ----------
  var pzMsg = false, pzDesde = 0, pzFuente = '-', pzCache = false, pzCacheT = 0;
  var RE_PZ_ENTRA = /you are in (a )?protection zone/i;
  var RE_PZ_SALE = /(left|leave|leaving|no longer).{0,30}protection zone/i;
  var obsPZ = new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) {
      var m = muts[i];
      if (panel.contains(m.target) || avisoEl.contains(m.target)) { continue; }
      var nodos = m.addedNodes;
      for (var j = 0; j < nodos.length; j++) {
        var tx = textoDe(nodos[j]);
        if (!tx || tx.length > 400) { continue; }
        if (RE_PZ_SALE.test(tx)) { pzMsg = false; }
        else if (RE_PZ_ENTRA.test(tx)) { pzMsg = true; pzDesde = Date.now(); }
      }
    }
  });
  obsPZ.observe(document.body, { childList: true, subtree: true });

  function pzIcono() {
    try {
      var sel = '[class*="protection" i],[id*="protection" i],[title*="protection" i],[alt*="protection" i],img[src*="protection" i],' +
        '[class*="pigeon" i],[id*="pigeon" i],[title*="pigeon" i],img[src*="pigeon" i],img[src*="dove" i]';
      var cs = document.querySelectorAll(sel);
      for (var i = 0; i < cs.length; i++) {
        var c = cs[i];
        if (panel.contains(c) || avisoEl.contains(c)) { continue; }
        if (c.getClientRects().length > 0 && getComputedStyle(c).visibility !== 'hidden') { return true; }
      }
    } catch (e) { registrar('pz icono: ' + e.message); }
    return false;
  }
  function estaEnPZ(ahora) {
    if (ahora - pzCacheT > 2000) { pzCacheT = ahora; pzCache = pzIcono(); }
    if (pzCache) { pzFuente = 'icono'; return true; }
    if (pzMsg && ahora - pzDesde < 3600000) { pzFuente = 'mensaje'; return true; }
    pzFuente = '-';
    return false;
  }

  // ---------- Alerta de vida baja ----------
  var alertaVidaArmada = true, ultimaAlerta = 'ninguna';
  function revisarVida(hp) {
    if (!cfg.alertaVidaOn || !(hp.max > 0)) { return; }
    if (!corriendo && !(cazaCorriendo && !cfg.cazaCurar) && !pausaGM) { alertaVidaArmada = true; return; }
    var pct = hp.actual * 100 / hp.max;
    if (pct <= cfg.alertaVidaPct) {
      if (alertaVidaArmada) {
        alertaVidaArmada = false;
        var extra = '';
        if (cfg.alertaVidaHeal && !cfg.healOn && !pausaGM && !liteBloqueo()) {
          cfg.healOn = true;
          guardarCfg();
          fHealOn.input.checked = true;
          extra = ' Autoheal activado.';
        }
        alertar('vida', '⚠ Vida baja: ' + Math.round(pct) + '% (' + hp.actual + '/' + hp.max + ').' + extra);
      }
    } else if (pct > cfg.alertaVidaPct + 5 || pct >= 100) {
      alertaVidaArmada = true;
    }
  }

  // ---------- Autoheal ----------
  var curas = 0, ultimaCura = 'ninguna', proximaCura = 0;
  function autoheal(hp, mp, ahora) {
    if (ahora < proximaCura) { return false; }
    var pct = hp.max > 0 ? (hp.actual * 100 / hp.max) : 100;
    for (var i = 0; i < cfg.heals.length; i++) {
      var h = cfg.heals[i];
      var texto = String(h.texto || '').trim();
      if (!texto) { continue; }
      if (pct <= h.hp && mp.actual >= h.mana) {
        try {
          decir(texto, metodo);
          curas++;
          ultimaCura = '"' + texto + '" con HP ' + Math.round(pct) + '%';
          proximaCura = ahora + 1000 + Math.random() * 300;
          if (pendiente) { pendiente.antes -= h.mana; }
          return true;
        } catch (e) {
          registrar('cura: ' + e.message);
          ultimaCura = 'error: ' + e.message;
          proximaCura = ahora + 1000;
          return false;
        }
      }
    }
    return false;
  }

  // ---------- Pociones ----------
  var manaUsos = 0, ultimaMana = 'ninguno', manaAt = null;
  function automana(mp, ahora) {
    var pct = mp.max > 0 ? (mp.actual * 100 / mp.max) : 100;
    if (pct > cfg.manaPct || pendiente) { manaAt = null; return false; }
    if (manaAt === null) {
      var lo = Math.max(0, cfg.manaIntMin), hi = Math.max(lo, cfg.manaIntMax);
      manaAt = ahora + (lo + Math.random() * (hi - lo)) * 1000;
      return false;
    }
    if (ahora < manaAt) { return false; }
    manaAt = null;
    try {
      pulsarTecla(cfg.manaTecla);
      manaUsos++;
      ultimaMana = 'tecla ' + cfg.manaTecla + ' con mana ' + Math.round(pct) + '%';
      return true;
    } catch (e) {
      registrar('automana: ' + e.message);
      ultimaMana = 'error: ' + e.message;
      manaAt = ahora + 5000;
      return false;
    }
  }

  // ¿La casilla del hotbar de esa tecla tiene una poción? (para no apretar una casilla equivocada)
  function teclaEsPocion(tecla) {
    try {
      var i = indiceHotbar(String(tecla || '').trim().toUpperCase()), hm = hotbarMgr();
      if (i < 0 || !hm || !hm.slots[i]) { return false; }
      var it = hm.slots[i].item; if (!it) { return false; }
      var id = typeof it === 'object' ? (it.id || it.cid || it.sid) : it;
      return /potion|fluid|vial|flask/i.test(nombreItem(id));
    } catch (e) { return false; }
  }
  var hpPotProx = 0, hpPotUsos = 0, ultimaHpPot = 'ninguno';
  function autopocion(hp, ahora) {
    var pct = hp.max > 0 ? (hp.actual * 100 / hp.max) : 100;
    if (pct > cfg.hpPotPct || ahora < hpPotProx) { return false; }
    try {
      pulsarTecla(cfg.hpPotTecla);
      hpPotUsos++;
      ultimaHpPot = 'tecla ' + cfg.hpPotTecla + ' con HP ' + Math.round(pct) + '%';
      var lo = Math.max(0, cfg.hpPotIntMin), hi = Math.max(lo, cfg.hpPotIntMax);
      hpPotProx = ahora + (lo + Math.random() * (hi - lo)) * 1000;
      return true;
    } catch (e) {
      registrar('poción de vida: ' + e.message);
      ultimaHpPot = 'error: ' + e.message;
      hpPotProx = ahora + 5000;
      return false;
    }
  }

  // ---------- Modo de combate (botones reales del juego: .fight-mode-btn y .chase-mode-btn) ----------
  function aplicarModoCombate(postura, persecucion) {
    var okP = false, okC = false;
    try {
      if (postura && postura !== 'ninguno') {
        var b = document.querySelector('.fight-mode-btn[data-mode="' + postura + '"]');
        if (b) { if (!b.classList.contains('active')) { b.click(); } okP = true; }
      }
      if (persecucion && persecucion !== 'ninguno') {
        var c = document.querySelector('.chase-mode-btn[data-chase="' + persecucion + '"]');
        if (c) { if (!c.classList.contains('active')) { c.click(); } okC = true; }
      }
    } catch (e) { registrar('modo combate: ' + e.message); }
    return { postura: okP, chase: okC };
  }

  // ---------- Training ----------
  var trainPrev = false, trainDefensaT = 0, trainAt = null, trainProx = 0, trainFallos = 0;
  var trainEstado = 'apagado', trainModoOk = null;

  function valores(x) {
    if (!x) { return []; }
    try {
      if (Array.isArray(x)) { return x; }
      if (x instanceof Map || x instanceof Set) { return Array.from(x.values()); }
      return Object.keys(x).map(function (k) { return x[k]; });
    } catch (e) { return []; }
  }
  function posDe(o) {
    try {
      var q = o.__position || o.position || (typeof o.getPosition === 'function' ? o.getPosition() : null);
      if (q && typeof q.x === 'number' && typeof q.y === 'number') { return q; }
    } catch (e) {}
    return null;
  }

  function buscarCercano(nombre) {
    var p;
    try { p = window.gameClient.player; } catch (e) { return null; }
    if (!p) { return null; }
    var buscado = String(nombre).trim().toLowerCase();
    if (!buscado) { return null; }
    var tiles = [];
    try { tiles = valores(p.__chunk && p.__chunk.tiles); } catch (e) {}
    var props = ['monsters', 'creatures', 'players', '__deferredCreatures'];
    var mio = posDe(p), mejor = null, mejorD = Infinity;
    for (var i = 0; i < tiles.length; i++) {
      var t = tiles[i];
      if (!t) { continue; }
      for (var j = 0; j < props.length; j++) {
        var col;
        try { col = t[props[j]]; } catch (e) { continue; }
        var cs = valores(col);
        for (var c = 0; c < cs.length; c++) {
          var cr = cs[c];
          try {
            if (!cr || typeof cr.name !== 'string' || cr.name.toLowerCase() !== buscado) { continue; }
            var q = posDe(cr);
            var d = (mio && q) ? Math.abs(q.x - mio.x) + Math.abs(q.y - mio.y) : 0;
            if (mejor === null || d < mejorD) { mejor = cr; mejorD = d; }
          } catch (e) {}
        }
      }
    }
    return mejor;
  }

  // ---------- Training: solo compañeros de party de la lista (o monstruos de la lista, p. ej. Monk) ----------
  var trainLockAviso = 0, trainAncla = null, trainObjId = null, trainEsperando = {}, trainMaxVisto = {}, trainMiPausa = false, trainCambios = 0;
  function trainNombres() { return String(cfg.trainNombre || '').split(',').map(function (x) { return x.trim().toLowerCase(); }).filter(Boolean); }
  // Vida en %: usa el máximo que dé el juego; si no lo da, el mayor valor visto de esa criatura
  function vidaPct(cr) {
    var h = vidaDe(cr); if (h === null) { return null; }
    var st = cr.state || {}, mx = null;
    ['maxHealth', 'healthMax', 'max_health', 'maxhealth'].forEach(function (k) { if (mx === null && typeof st[k] === 'number' && st[k] > 0) { mx = st[k]; } });
    if (mx === null) { ['maxHealth', '__maxHealth', 'healthMax'].forEach(function (k) { if (mx === null && typeof cr[k] === 'number' && cr[k] > 0) { mx = cr[k]; } }); }
    var vis = Math.max(trainMaxVisto[cr.id] || 0, h); trainMaxVisto[cr.id] = vis;
    if (mx === null) { mx = vis; }
    return mx > 0 ? Math.max(0, Math.min(100, h * 100 / mx)) : null;
  }
  function enMiParty(cr) {
    try { var p = window.gameClient.player; return cr.type === 0 && Number(cr.shield) > 0 && Number(p.shield) > 0; } catch (e) { return false; }
  }
  // ¿Se le puede entrenar? Jugador: en la lista Y en mi party. Monstruo: en la lista.
  function trainPermitido(cr) {
    if (!cr) { return false; }
    var yo = window.gameClient.player; if (cr === yo) { return false; }
    if (trainNombres().indexOf(String(cr.name || '').toLowerCase()) < 0) { return false; }
    if (cr.type === 0) { return enMiParty(cr); }
    return cr.type === 1 && !cr.masterId;
  }
  function trainCandidatos() {
    var pos = posJug(); if (!pos) { return []; }
    return (criaturasActivas() || []).filter(function (c) {
      if (!trainPermitido(c) || vidaDe(c) === 0) { return false; }
      var q = posDe(c); return q && q.z === pos.z && Math.abs(q.x - pos.x) <= 7 && Math.abs(q.y - pos.y) <= 5;
    });
  }
  function intentarAtaque() {
    var cs = trainCandidatos();
    if (!cs.length) { return { intento: false, txt: 'no veo a nadie de la lista en mi party' }; }
    var mejor = null, mejorP = -1;
    cs.forEach(function (c) { var pc = vidaPct(c); if (pc !== null && pc > mejorP && !trainEsperando[c.id]) { mejorP = pc; mejor = c; } });
    if (!mejor) { return { intento: false, txt: 'esperando que se curen (' + cs.map(function (c) { return c.name; }).join(', ') + ')' }; }
    if (mejor.type === 0 && typeof pvpLockPuesto === 'function' && pvpLockPuesto()) {
      if (Date.now() - (trainLockAviso || 0) > 60000) { trainLockAviso = Date.now(); alertar('train', '🔒 Training: quita el PVP Lock para poder entrenar con ' + mejor.name + '.'); }
      return { intento: false, txt: 'quita el PVP Lock para entrenar con jugadores' };
    }
    try { fijarObjetivo(mejor); trainObjId = mejor.id; return { intento: true, txt: 'atacando a ' + mejor.name }; }
    catch (e) { registrar('ataque: ' + e.message); return { intento: true, txt: 'error: ' + e.message }; }
  }
  btnProbarAt.onclick = function () {
    var r = intentarAtaque();
    ultimaAccion = 'prueba de ataque: ' + r.txt;
  };
  btnProbarModo.onclick = function () {
    var r = aplicarModoCombate(cfg.trainPostura, cfg.trainHold ? 'stand' : cfg.trainChase);
    ultimaAccion = 'modo aplicado: postura=' + (r.postura ? 'ok' : 'no aplicada') + ', chase=' + (r.chase ? 'ok' : 'no aplicado');
  };

  function entrenar(ahora, hp) {
    if (!cfg.trainOn) { if (trainPrev && trainObjId) { try { soltarObjetivo(); } catch (e) {} } trainPrev = false; trainEstado = 'apagado'; trainAt = null; trainAncla = null; trainObjId = null; return; }
    if (!trainNombres().length) { trainEstado = 'falta escribir los nombres'; return; }
    if (macroPausado('training')) { trainEstado = 'en pausa por un macro'; return; }
    var gc = window.gameClient, pos = posJug();
    if (!trainPrev) {
      trainPrev = true; trainFallos = 0; trainDefensaT = 0; trainProx = 0; trainAt = null; trainEsperando = {}; trainMiPausa = false;
      trainAncla = pos ? { x: pos.x, y: pos.y, z: pos.z } : null;
    }
    try { if (typeof colObj !== 'undefined' && colObj) { trainEstado = 'en pausa: la Colmena está defendiendo'; return; } } catch (e) {}

    // postura y chase (con "mantener posición" siempre stand)
    var chase = cfg.trainHold ? 'stand' : cfg.trainChase;
    if (ahora - trainDefensaT > 20000 || (cfg.trainHold && chaseActivo() && chaseActivo() !== 'stand')) {
      trainDefensaT = ahora;
      if (cfg.trainPostura !== 'ninguno' || chase !== 'ninguno') {
        var rM = aplicarModoCombate(cfg.trainPostura, chase);
        trainModoOk = (cfg.trainPostura === 'ninguno' || rM.postura) && (chase === 'ninguno' || rM.chase);
      }
    }

    // mantener la posición: si me movieron, regreso a mi casilla
    if (cfg.trainHold && trainAncla && pos) {
      if (pos.z !== trainAncla.z) { trainAncla = { x: pos.x, y: pos.y, z: pos.z }; }
      else if (pos.x !== trainAncla.x || pos.y !== trainAncla.y) {
        if (!autoCaminando() && ahora - (trainAncla.t || 0) > 1500) { trainAncla.t = ahora; caminarA(trainAncla.x, trainAncla.y, trainAncla.z); }
        trainEstado = 'regresando a mi posición';
      }
    }

    // mi vida: pausa si baja demasiado (y reanuda al recuperarse)
    var miPct = (hp && hp.max > 0) ? hp.actual * 100 / hp.max : 100;
    var lim = Math.max(0, Number(cfg.trainMiPct) || 0);
    if (lim > 0) {
      if (!trainMiPausa && miPct <= lim) {
        trainMiPausa = true;
        if (trainObjId) { try { soltarObjetivo(); } catch (e) {} trainObjId = null; }
        alertar('vida', '⚠ Training en pausa: tu vida bajó a ' + Math.round(miPct) + '%.');
      } else if (trainMiPausa && miPct >= Math.min(95, lim + 30)) { trainMiPausa = false; trainEstado = 'mi vida se recuperó: sigo entrenando'; }
      if (trainMiPausa) { trainEstado = 'en pausa: mi vida está baja (' + Math.round(miPct) + '%)'; return; }
    }

    // objetivo actual
    var t = null; try { t = gc.player.hasTarget() ? gc.player.getTarget() : null; } catch (e) { t = leerRuta(gc, 'player.__target'); }
    var pausa = Math.max(1, Number(cfg.trainPausaPct) || 15), reanuda = Math.max(pausa + 5, Number(cfg.trainReanudaPct) || 50);
    // los que están esperando a curarse vuelven cuando suben
    (criaturasActivas() || []).forEach(function (c) {
      if (c && trainEsperando[c.id]) { var pc = vidaPct(c); if (pc === null || pc >= reanuda || vidaDe(c) === 0) { delete trainEsperando[c.id]; } }
    });
    if (t) {
      if (!trainPermitido(t)) {
        // no es de la lista o salió de la party: lo suelto si lo fijé yo
        if (trainObjId && t.id === trainObjId) { try { soltarObjetivo(); } catch (e) {} trainObjId = null; trainEstado = t.name + ' ya no está en mi party: lo suelto'; return; }
        trainEstado = 'tienes otro objetivo (' + t.name + '): no lo toco';
        return;
      }
      var pc = vidaPct(t);
      if (pc !== null && pc <= pausa) {
        trainEsperando[t.id] = true;
        try { soltarObjetivo(); } catch (e) {}
        trainObjId = null; trainCambios++;
        trainEstado = t.name + ' bajó a ' + Math.round(pc) + '%: dejo de atacarlo';
        trainProx = ahora + 600 + Math.random() * 900;
        return;
      }
      trainObjId = t.id;
      try { var mT = JSON.parse(localStorage.getItem('minibiaHelperTrainT') || '{}') || {}; mT[charActual || '?'] = { t: ahora, objetivos: [t.name], nombres: trainNombres() }; localStorage.setItem('minibiaHelperTrainT', JSON.stringify(mT)); } catch (e) {}
      trainEstado = 'atacando a ' + t.name + (pc !== null ? ' (' + Math.round(pc) + '%)' : '');
      trainFallos = 0; trainAt = null;
      return;
    }
    if (ahora < trainProx) { return; }
    if (trainAt === null) { trainAt = ahora + 600 + Math.random() * 1200; trainEstado = 'buscando a quién entrenar'; return; }
    if (ahora < trainAt) { return; }
    trainAt = null;
    trainProx = ahora + 2500 + Math.random() * 1500;
    var r = intentarAtaque();
    trainEstado = r.txt;
    if (r.intento) { trainFallos++; } else { trainFallos = 0; }
    if (trainFallos >= 8) {
      cfg.trainOn = false;
      guardarCfg();
      fTrainOn.input.checked = false;
      trainEstado = 'detenido: no pude fijar el objetivo';
      alertar('train', '⚠ Training detenido: no pude atacar a nadie de la lista.');
    }
  }

  // ---------- Anti-idle ----------
  var idleProx = 0, idleUsos = 0, ultimoIdle = 'ninguno';
  var FLECHAS = { arriba: ['ArrowUp', 38], derecha: ['ArrowRight', 39], abajo: ['ArrowDown', 40], izquierda: ['ArrowLeft', 37] };

  function pulsarFlecha(dir, mod) {
    var f = FLECHAS[dir];
    var shift = mod !== 'ctrl', ctrl = mod === 'ctrl';
    var mk = shift ? ['Shift', 'ShiftLeft', 16] : ['Control', 'ControlLeft', 17];
    function ev(tipo, key, code, kc) {
      return new KeyboardEvent(tipo, { key: key, code: code, keyCode: kc, which: kc, shiftKey: shift, ctrlKey: ctrl, bubbles: true, cancelable: true });
    }
    var dest = document.body || document;
    dest.dispatchEvent(ev('keydown', mk[0], mk[1], mk[2]));
    setTimeout(function () { dest.dispatchEvent(ev('keydown', f[0], f[0], f[1])); }, 40 + Math.random() * 40);
    setTimeout(function () { dest.dispatchEvent(ev('keyup', f[0], f[0], f[1])); }, 120 + Math.random() * 60);
    setTimeout(function () { dest.dispatchEvent(ev('keyup', mk[0], mk[1], mk[2])); }, 200 + Math.random() * 60);
  }
  function lanzarIdle() {
    var dirs = Object.keys(FLECHAS);
    var dir = dirs[Math.floor(Math.random() * dirs.length)];
    var mod = String(cfg.idleMod || 'shift').trim().toLowerCase() === 'ctrl' ? 'ctrl' : 'shift';
    pulsarFlecha(dir, mod);
    idleUsos++;
    ultimoIdle = mod + ' + ' + dir;
  }
  btnProbarIdle.onclick = function () { lanzarIdle(); ultimaAccion = 'prueba de anti-idle: ' + ultimoIdle; };
  function antiIdle(ahora) {
    if (!cfg.idleOn || !(cfg.trainOn || corriendo)) { idleProx = 0; return; }
    var lo = Math.max(0.5, cfg.idleMin), hi = Math.max(lo, cfg.idleMax);
    if (idleProx === 0) { idleProx = ahora + (lo + Math.random() * (hi - lo)) * 60000; return; }
    if (ahora < idleProx) { return; }
    try { lanzarIdle(); } catch (e) { registrar('anti-idle: ' + e.message); ultimoIdle = 'error: ' + e.message; }
    idleProx = ahora + (lo + Math.random() * (hi - lo)) * 60000;
  }

  // ---------- Combo runa: seguir las runas del líder ----------
  // El juego guarda de dónde sale cada tiro (gameClient.__lastShotAt: casilla del golpe -> { from, t }).
  // Si un tiro sale de donde está el líder, este personaje tira su runa al mismo objetivo, con su retraso.
  var bombCount = 0, ultimaBomb = 'ninguno', estadoLider = 'apagado', lider = null;
  var comboVistoT = 0, comboPend = null, comboFinT = 0, comboHist = [];
  function comboActivo() { return !!comboPend || (Date.now() - comboFinT < 4000); }
  function comboLider() {
    var gc = window.gameClient, yo = gc.player, nombre = String(cfg.bombLider || '').trim().toLowerCase();
    var act = criaturasActivas() || [];
    if (nombre) {
      if (String(yo.name || '').toLowerCase() === nombre) { return yo; }
      return act.filter(function (c) { return c && String(c.name || '').toLowerCase() === nombre; })[0] || null;
    }
    if (Number(yo.shield) === 1) { return yo; }   // el líder de la party (escudo de líder)
    return act.filter(function (c) { return c && c !== yo && c.type === 0 && Number(c.shield) === 1; })[0] || null;
  }
  function buscarRunaAtaque(quiero) {
    quiero = String(quiero || '').trim().toLowerCase();
    var cs = contenedores(), mejor = null, mejorR = 99;
    for (var c = 0; c < cs.length; c++) {
      if (esCadaverCont(cs[c]) || !cs[c].slots) { continue; }
      for (var i = 0; i < cs[c].slots.length; i++) {
        var it = cs[c].slots[i] && cs[c].slots[i].item; if (!it) { continue; }
        var n = nombreItem(it.id).toLowerCase(); if (!/rune$/.test(n)) { continue; }
        if (quiero) { if (n.indexOf(quiero) >= 0) { return { which: cs[c], index: i, item: it, name: n }; } continue; }
        for (var r = 0; r < RUNAS_ATAQUE.length; r++) { if (n.indexOf(RUNAS_ATAQUE[r]) === 0 && r < mejorR) { mejorR = r; mejor = { which: cs[c], index: i, item: it, name: n }; } }
      }
    }
    return mejor;
  }
  function comboReaccion() {
    var r = colRango(cfg.bombReacMin, cfg.bombReacMax, 300, 1500, 0), ancho = r[1] - r[0];
    return Math.round(r[0] + (colTurno() / 3) * ancho * 0.6 + Math.random() * ancho * 0.4);
  }
  function comboIntervalo() {
    var r = colRango(cfg.bombRunaMin, cfg.bombRunaMax, 2200, 3000, 2050);
    return Math.round(colAzar(r[0], r[1]) + (Math.random() < 0.15 ? colAzar(400, 1100) : 0));
  }
  // Tira la runa a la criatura (o a la casilla si es de área y no hay nadie). Devuelve un texto si no pudo.
  // ¿Qué runa tiró el líder? Por el efecto del tiro (energía = HMM, fuego = GFB/explosion/fireball, muerte = SD)
  var COMBO_FAMILIA = { energy: ['heavy magic missile', 'light magic missile'], fire: ['great fireball', 'explosion', 'fireball'], death: ['sudden death'] };
  var COMBO_EFECTO_ID = { 4: 'fire', 5: 'energy', 11: 'death' };
  var comboUltTiro = '';
  function familiaDeTiro(v) {
    if (!v) { return null; }
    var campos = ['runa', 'rune', 'name', 'type', 'effect', 'missile', 'shootType', 'distanceEffect', 'anim', 'id', 'e'];
    try { comboUltTiro = Object.keys(v).map(function (k) { var x = v[k]; return k + '=' + (x && typeof x === 'object' ? '{' + Object.keys(x).join(',') + '}' : x); }).join(' ').slice(0, 160); } catch (e) {}
    for (var i = 0; i < campos.length; i++) {
      var x = v[campos[i]]; if (x === undefined || x === null) { continue; }
      if (typeof x === 'string') {
        var t = x.toLowerCase();
        if (/sudden|death/.test(t)) { return 'death'; }
        if (/energy|magic missile|hmm/.test(t)) { return 'energy'; }
        if (/fire|explosion|gfb/.test(t)) { return 'fire'; }
      } else if (typeof x === 'number' && COMBO_EFECTO_ID[x]) { return COMBO_EFECTO_ID[x]; }
    }
    return null;
  }
  // Elige la runa: SD para rematar > la misma del líder > la que escribiste > la mejor que tengas
  function comboElegirRuna(cr, familia) {
    var pc = cr ? vidaPct(cr) : null;
    if (cfg.bombSdOn && cr && pc !== null && pc <= Math.max(1, Math.min(99, Number(cfg.bombSdPct) || 30))) {
      var sd = buscarRunaAtaque('sudden death'); if (sd) { sd.motivo = 'remate (' + Math.round(pc) + '%)'; return sd; }
    }
    if (cfg.bombSeguirRuna && familia && COMBO_FAMILIA[familia]) {
      var fam = COMBO_FAMILIA[familia];
      for (var i = 0; i < fam.length; i++) { var r = buscarRunaAtaque(fam[i]); if (r) { r.motivo = 'como el líder'; return r; } }
    }
    return buscarRunaAtaque(cfg.bombRuna) || (cfg.bombRuna ? null : buscarRunaAtaque(''));
  }
  function comboTirar(x, y, z, cr, familia) {
    var gc = window.gameClient, pos = posJug(); if (!pos) { return 'sin posición'; }
    if (pos.z !== z || Math.abs(x - pos.x) > 7 || Math.abs(y - pos.y) > 5) { return 'objetivo fuera de alcance'; }
    if (!lineaVision(pos, x, y)) { return 'sin línea de visión'; }
    var hm = hotbarMgr(), pn = performance.now();
    if (hm && ((hm.__runeAttackUntil || 0) > pn || (hm.__runeAttackGlobalUntil || 0) > pn)) { return 'espera'; }
    if (cr && cr.type === 0 && pvpLockPuesto()) {
      if (!cfg.bombQuitarLock) { if (Date.now() - colLockAviso > 30000) { colLockAviso = Date.now(); alertar('colmena', '🔒 Combo runa: el líder ataca a ' + cr.name + ' pero tienes el PVP Lock puesto.'); } return 'PVP Lock puesto'; }
      try { pvpLockBtn().click(); colLockQuitado = true; try { localStorage.setItem(KEY_COL_LOCK + '::' + (charActual || ''), '1'); } catch (e2) {} registrar('combo: PVP Lock quitado'); } catch (e) {}
      return 'espera';
    }
    var rn = comboElegirRuna(cr, familia); if (!rn) { return 'sin runas en la mochila abierta'; }
    var tile = gc.world.getTileFromWorldPosition(posObj(x, y, z)); if (!tile) { return 'casilla no visible'; }
    gc.mouse.__handleItemUseWith({ which: rn.which, index: rn.index }, { which: tile, index: 255 });
    bombCount++;
    ultimaBomb = rn.name + ' a ' + (cr ? cr.name : 'la casilla') + (rn.motivo ? ' · ' + rn.motivo : '');
    return '';
  }
  function lanzarBomb() {
    if (comboBloqueo()) { ultimaBomb = 'no disponible con tu licencia'; return; }
    var gc = window.gameClient, t = null; try { t = gc.player.hasTarget() ? gc.player.getTarget() : null; } catch (e) {}
    if (!t) { ultimaBomb = 'no tienes objetivo'; return; }
    var q = posDe(t); if (!q) { return; }
    var r = comboTirar(q.x, q.y, q.z, t); if (r) { ultimaBomb = r; }
  }
  btnBomb.onclick = function () { lanzarBomb(); };
  function vigilarLider() {
    try {
      if (comboBloqueo() || !cfg.bombOn) { estadoLider = comboBloqueo() ? 'no disponible con tu licencia' : 'apagado'; lider = null; comboPend = null; return; }
      if (pausaGM) { estadoLider = 'en pausa (GM)'; return; }
      var gc = window.gameClient; if (!gc || !gc.player) { return; }
      var ahora = Date.now(), pn = performance.now(), yo = gc.player;
      lider = comboLider();
      if (!lider) { estadoLider = cfg.bombLider ? 'no veo a ' + cfg.bombLider : 'no hay líder de party a la vista'; return; }
      if (lider === yo) { estadoLider = 'tú eres el líder: los demás siguen tus runas'; return; }
      var lq = posDe(lider);
      // casillas donde estuvo el líder en los últimos 2 s (un tiro solo cuenta si salió EXACTO de ahí)
      if (lq) {
        comboHist = comboHist.filter(function (h) { return ahora - h.t < 2000 && h.id === lider.id; });
        var ult = comboHist[comboHist.length - 1];
        if (!ult || ult.x !== lq.x || ult.y !== lq.y || ult.z !== lq.z) { comboHist.push({ x: lq.x, y: lq.y, z: lq.z, t: ahora, id: lider.id }); }
      }
      // ¿el líder acaba de tirar algo?
      var tiros = gc.__lastShotAt;
      if (lq && tiros && typeof tiros.forEach === 'function') {
        tiros.forEach(function (v, k) {
          if (!v || !v.from || !(v.t > comboVistoT) || pn - v.t > 1500) { return; }
          if (!comboHist.some(function (h) { return h.x === v.from.x && h.y === v.from.y && h.z === v.from.z; })) { return; }
          // si en esa casilla hay otra criatura que no es el líder, el tiro no es suyo
          if ((criaturasActivas() || []).some(function (c) { var q = posDe(c); return c && c !== lider && q && q.x === v.from.x && q.y === v.from.y && q.z === v.from.z; })) { return; }
          comboVistoT = v.t;
          var pz = String(k).split(',').map(Number); if (pz.length < 3) { return; }
          // ¿quién está en esa casilla? (si es de la party, era una cura: no se sigue)
          var cr = (criaturasActivas() || []).filter(function (c) { var q = posDe(c); return c && q && q.x === pz[0] && q.y === pz[1] && q.z === pz[2] && vidaDe(c) !== 0; })[0] || null;
          if (cr && (cr === yo || esDeLaColmena(cr) || cr === lider)) { return; }
          var n = Math.max(1, Math.min(5, Math.floor(cfg.bombRondas) || 1));
          var fam = familiaDeTiro(v);
          comboPend = { x: pz[0], y: pz[1], z: pz[2], cr: cr, quedan: n, t: ahora + comboReaccion(), fam: fam };
          ultimaBomb = 'el líder tiró ' + (fam ? { energy: 'HMM', fire: 'fuego (GFB/explosion)', death: 'SD' }[fam] + ' ' : '') + 'a ' + (cr ? cr.name : 'una casilla');
        });
      }
      if (!comboPend) {
        estadoLider = 'siguiendo a ' + lider.name;
        if (colLockQuitado && !colObj && ahora - comboFinT > 4000) { colRestaurarLock(); }
        return;
      }
      if (ahora < comboPend.t) { estadoLider = 'combo en ' + Math.max(0, Math.round((comboPend.t - ahora) / 100) / 10) + ' s'; return; }
      var c = comboPend.cr, x = comboPend.x, y = comboPend.y, z = comboPend.z;
      if (c) {
        if (vidaDe(c) === 0) { comboPend = null; comboFinT = ahora; estadoLider = c.name + ' ya murió'; return; }
        var q = posDe(c); if (q) { x = q.x; y = q.y; z = q.z; }
      }
      var r = comboTirar(x, y, z, c, comboPend.fam);
      if (r === 'espera') { comboPend.t = ahora + 250; return; }
      if (r) { estadoLider = 'combo: ' + r; comboPend = null; comboFinT = ahora; return; }
      comboPend.quedan--;
      if (comboPend.quedan > 0) { comboPend.t = ahora + comboIntervalo(); estadoLider = 'combo: faltan ' + comboPend.quedan; }
      else { comboPend = null; comboFinT = ahora; estadoLider = 'combo listo (' + ultimaBomb + ')'; }
    } catch (e) { registrar('combo: ' + e.message); comboPend = null; }
  }
  setInterval(function () { try { lblBomb.textContent = 'Combo runa: ' + estadoLider; } catch (e) {} }, 1000);

  // ---------- Cave hunt ----------
  var DIRS4 = ['arriba', 'derecha', 'abajo', 'izquierda'];
  var TECLA_DIR = { ArrowUp: 0, w: 0, W: 0, ArrowRight: 1, d: 1, D: 1, ArrowDown: 2, s: 2, S: 2, ArrowLeft: 3, a: 3, A: 3 };

  function rutaValida(r) {
    return Array.isArray(r) && typeof r[0] === 'number' && typeof r[1] === 'number' && typeof r[2] === 'number';
  }
  var ruta = [];
  function guardarRuta() { if (datosListos) { if (!escribirJSON(kChar(KEY_RUTA), ruta)) { registrar('ruta: no se pudo guardar'); } } }

  var grabando = false, ultFlecha = -1, ultFlechaT = 0;
  var cazaCorriendo = false, cazaEstado = 'apagado';
  var cazaIdx = 0, cazaDir = 1, cazaVueltas = 0, cazaMuertes = 0, cazaComidas = 0;
  var cazaRetirando = false, cazaRetiroMotivo = '';
  var cazaPasoPos = null, cazaPasoT = 0, cazaDemora = 80, cazaUltPos = null, cazaUltMovT = 0, cazaAtasco = 0;
  var cazaPerdidoDesde = 0, cazaNoPerseguirHasta = 0;
  var cazaPuntoAtasco = -1, cazaAtascosPunto = 0;
  var cazaAtqAt = null, cazaAtqProx = 0, cazaFallos = 0, cazaTeniaObj = false;
  var cazaScanT = 0, cazaCand = null;
  var cazaUltComer = 0, cazaComerChequeo = 0, cazaComerFallback = 0;
  var cazaJugVistos = {}, cazaJugT = 0;
  var cazaUltAccionIdx = -1, cazaAccionT = 0;

  var hpHistorial = [];
  function chequearGolpeFuerte(hp, ahora) {
    hpHistorial.push({ t: ahora, hp: hp.actual });
    while (hpHistorial.length && ahora - hpHistorial[0].t > 3000) { hpHistorial.shift(); }
    if (hpHistorial.length < 2 || !(hp.max > 0)) { return false; }
    var perdida = (hpHistorial[0].hp - hp.actual) * 100 / hp.max;
    return perdida >= cfg.cazaEscapeHpPct;
  }

  document.addEventListener('keydown', function (e) {
    try {
      if (!e.isTrusted) { return; }
      var tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) { return; }
      if (e.key in TECLA_DIR) { ultFlecha = TECLA_DIR[e.key]; ultFlechaT = Date.now(); }
    } catch (err) {}
  }, true);

  function posJug() {
    try {
      var q = posDe(window.gameClient.player);
      if (!q) { return null; }
      return { x: q.x, y: q.y, z: (typeof q.z === 'number') ? q.z : 0 };
    } catch (e) { return null; }
  }
  function mismaPos(a, b) { return !!a && !!b && a.x === b.x && a.y === b.y && a.z === b.z; }

  function grabarTick() {
    if (!grabando) { return; }
    var q = posJug();
    if (!q) { return; }
    var u = ruta[ruta.length - 1];
    if (u && u[0] === q.x && u[1] === q.y && u[2] === q.z) { return; }
    var d = (Date.now() - ultFlechaT < 800) ? ultFlecha : -1;
    ruta.push([q.x, q.y, q.z, d, null]);
    if (ruta.length > 6000) { ruta.shift(); }
    if (ruta.length % 25 === 0) { guardarRuta(); }
  }

  function marcarAccionEnWP(accion) {
    var q = posJug();
    if (!q) { ultimaAccion = 'no puedo leer la posición'; return; }
    var u = ruta[ruta.length - 1];
    if (u && u[0] === q.x && u[1] === q.y && u[2] === q.z) {
      ruta[ruta.length - 1][4] = accion;
    } else {
      ruta.push([q.x, q.y, q.z, -1, accion]);
    }
    guardarRuta();
    var tc = accCasilla(accion);
    ultimaAccion = 'marcada acción "' + accNombre(accion) + '"' + (tc ? ' en la casilla ' + tc.join(',') : ' en el punto actual');
  }
  // Botones: buscan la casilla especial más cercana de ese tipo (hasta 2 casillas) y la guardan con la acción
  function accionConCasilla(tipo) {
    var e = null;
    try { e = especialCerca(tipo, 2); } catch (err) {}
    return e ? { a: tipo, t: [e.x, e.y, e.z] } : tipo;
  }
  btnWpRope.onclick = function () { marcarAccionEnWP(accionConCasilla('rope')); };
  btnWpShovel.onclick = function () { marcarAccionEnWP(accionConCasilla('shovel')); };
  btnWpEscalera.onclick = function () { marcarAccionEnWP(accionConCasilla('escalera')); };
  btnWpRuna.onclick = function () { marcarAccionEnWP('runa'); };
  btnWpEspera.onclick = function () {
    var sg = Math.max(3, Math.min(600, Number(cfg.cazaEsperaSeg) || 20));
    marcarAccionEnWP({ a: 'esperar', s: sg });
    ultimaAccion = 'spawn marcado: esperar ' + sg + ' s en este punto';
  };

  // Acción de un waypoint: texto ('rope') o { a: 'rope', t: [x, y, z] } con la casilla exacta donde se usa
  function accNombre(a) { return a ? (typeof a === 'string' ? a : String(a.a || '')) : ''; }
  function accCasilla(a) { return (a && typeof a === 'object' && Array.isArray(a.t) && a.t.length === 3) ? a.t : null; }
  function tileEn(x, y, z) { try { return window.gameClient.world.getTileFromWorldPosition(posObj(x, y, z)); } catch (e) { return null; } }
  function idsTile(t) { return [t.id].concat((t.items || []).map(function (x) { return x && x.id; })); }
  function propsItem(id) { try { var d = window.gameClient.itemDefinitionsByCid[id]; return (d && d.properties) || null; } catch (e) { return null; } }
  // Escalera de clic derecho (ladder, rope-ladder, sewer grate, trapdoor cerrada). Las que se pisan (con floorchange) no cuentan.
  var IDS_ESCALERA_MANO = { 1948: 1, 1968: 1, 7771: 1, 9116: 1, 5542: 1 };
  function esItemEscaleraMano(it) {
    if (!it || !it.id) { return false; }
    var p = propsItem(it.id);
    if (p && p.floorchange) { return false; }
    return !!IDS_ESCALERA_MANO[it.id] || RE_USAR_PISO.test(nombreItem(it.id));
  }
  function esEscaleraMano(t) { return (t.items || []).some(esItemEscaleraMano); }
  // Hacia dónde lleva una escalera de clic derecho: ladder sube; grate, trapdoor y hatch bajan
  function escaleraSube(t) { return (t.items || []).some(function (it) { return esItemEscaleraMano(it) && /ladder/i.test(nombreItem(it.id)); }); }
  // floorchange de la casilla: 'down' (hoyo, trapdoor abierta...) o una dirección (escaleras y rampas que suben)
  function fcDe(t) {
    if (!t) { return ''; }
    var ids = idsTile(t);
    for (var i = 0; i < ids.length; i++) { var p = ids[i] && propsItem(ids[i]); if (p && p.floorchange) { return String(p.floorchange); } }
    return '';
  }
  function esPisable(t) {
    var defs = {}; try { defs = window.gameClient.itemDefinitionsByCid; } catch (e) {}
    return idsTile(t).some(function (id) { var d = id && defs[id]; return !!(d && d.properties && d.properties.floorchange); });
  }
  // Tipo de casilla especial: 'rope' (rope spot), 'escalera' (de clic derecho), 'shovel' (hoyo cerrado) o 'pisar'
  function tipoEspecial(t) {
    if (!t) { return null; }
    try {
      if (esRopeSpot(t)) { return 'rope'; }
      if (esEscaleraMano(t)) { return 'escalera'; }
      if (esCavable(t)) { return 'shovel'; }
      if (esPisable(t)) { return 'pisar'; }
    } catch (e) {}
    return null;
  }
  function especialCerca(tipo, radio, px, py) {
    var P = posJug(); if (!P) { return null; }
    var mejor = null, mejorD = 99;
    for (var dy = -radio; dy <= radio; dy++) {
      for (var dx = -radio; dx <= radio; dx++) {
        var t = tileEn(P.x + dx, P.y + dy, P.z);
        if (tipoEspecial(t) !== tipo) { continue; }
        var d = (typeof px === 'number') ? Math.max(Math.abs(P.x + dx - px), Math.abs(P.y + dy - py)) * 3 + Math.max(Math.abs(dx), Math.abs(dy)) : Math.max(Math.abs(dx), Math.abs(dy));
        if (d < mejorD) { mejorD = d; mejor = { x: P.x + dx, y: P.y + dy, z: P.z }; }
      }
    }
    return mejor;
  }
  // Mientras grabas: si usas shovel/rope sobre una casilla o das clic derecho a una escalera, se anota sola
  var ganchosRuta = false;
  function instalarGanchosRuta() {
    if (ganchosRuta) { return; }
    var m = null; try { m = window.gameClient.mouse; } catch (e) {}
    if (!m) { return; }
    ganchosRuta = true;
    var oUW = m.__handleItemUseWith, oUse = m.use;
    if (typeof oUW === 'function') { m.__handleItemUseWith = function (src, dst) { try { if (grabando) { anotarUsoGrabando(src, dst); } } catch (e) {} return oUW.apply(this, arguments); }; }
    if (typeof oUse === 'function') { m.use = function (obj) { try { if (grabando) { anotarUsoGrabando(null, obj); } } catch (e) {} return oUse.apply(this, arguments); }; }
  }
  function anotarUsoGrabando(src, dst) {
    if (!dst || !dst.which || !dst.which.constructor || dst.which.constructor.name !== 'Tile') { return; }
    var t = dst.which, tp = t.getPosition(), nom = '';
    if (src && src.which) {
      var it = null;
      try { it = typeof src.which.getSlotItem === 'function' ? src.which.getSlotItem(src.index) : (src.which.slots[src.index] && src.which.slots[src.index].item); } catch (e) {}
      var n = it ? nombreItem(it.id) : '';
      if (/^shovel$/i.test(n)) { nom = 'shovel'; } else if (/^rope$/i.test(n)) { nom = 'rope'; }
    } else if (esEscaleraMano(t)) { nom = 'escalera'; }
    if (!nom) { return; }
    marcarAccionEnWP({ a: nom, t: [tp.x, tp.y, tp.z] });
    toast('Ruta: ' + nom + ' anotado en ' + tp.x + ',' + tp.y);
  }
  // Escaleras de mano, rejillas, trampillas: se "usan" (clic derecho) igual que lo hace el juego
  var RE_USAR_PISO = /ladder|grate|trap ?door|hatch/i;
  function usarEscaleraCerca() {
    var gc = window.gameClient, P = gc.player.getPosition(), defs = gc.itemDefinitionsByCid || {};
    var mejor = null, mejorD = 9;
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        var t = null;
        try { t = gc.world.getTileFromWorldPosition(new P.constructor(P.x + dx, P.y + dy, P.z)); } catch (e) {}
        if (!t || !t.items) { continue; }
        for (var i = 0; i < t.items.length; i++) {
          var it = t.items[i]; if (!it) { continue; }
          var d = defs[it.id], nm = d && d.properties && d.properties.name ? String(d.properties.name) : '';
          if (esItemEscaleraMano(it)) {
            var dist = Math.abs(dx) + Math.abs(dy);
            if (dist < mejorD) { mejor = t; mejorD = dist; }
          }
        }
      }
    }
    if (!mejor) { return false; }
    gc.mouse.use({ which: mejor, index: 0xFF });
    return true;
  }
  // Rope y shovel: se usan desde la mochila sobre la casilla, igual que clic derecho en el objeto + clic en la casilla
  function nombreItem(id) { try { var d = window.gameClient.itemDefinitionsByCid[id]; return (d && d.properties && d.properties.name) ? String(d.properties.name) : ''; } catch (e) { return ''; } }
  function buscarEnMochila(re) {
    var gc = window.gameClient, conts = [];
    try { conts = Array.from(gc.player.__openedContainers || []); } catch (e) {}
    try { if (gc.player.equipment) { conts.push(gc.player.equipment); } } catch (e) {}
    for (var c = 0; c < conts.length; c++) {
      var sl = conts[c] && conts[c].slots;
      if (!sl) { continue; }
      for (var i = 0; i < sl.length; i++) {
        var it = sl[i] && sl[i].item;
        if (it && it.id && re.test(nombreItem(it.id))) { return { which: conts[c], index: i }; }
      }
    }
    return null;
  }
  // Casillas que se abren con shovel: SOLO por nombre (stone pile, loose stone pile, loose ice pile, earth pile).
  // Ojo: el "decayTo" de los hoyos usa números del servidor, que en el cliente son otra cosa (dirt, sand...),
  // por eso no se usa: hacía que la tierra normal pareciera un hoyo cerrado.
  var RE_CAVABLE = /^(loose )?(stone|ice|earth) pile$/i;
  var cavablesSinNombre = null;   // hoyo cerrado sin nombre al que regresa un hoyo (p. ej. 468); los que tienen nombre (dirt, sand...) no
  function esCavable(t) {
    if (!t) { return false; }
    if (!cavablesSinNombre) {
      cavablesSinNombre = {};
      try {
        var defs = window.gameClient.itemDefinitionsByCid;
        Object.keys(defs).forEach(function (k) {
          var p = defs[k] && defs[k].properties;
          if (p && p.floorchange && p.decayTo && /hole|pitfall/i.test(p.name || '') && !nombreItem(p.decayTo)) { cavablesSinNombre[p.decayTo] = 1; }
        });
      } catch (e) {}
    }
    var ids = [t.id].concat((t.items || []).map(function (x) { return x && x.id; }));
    return ids.some(function (id) { return id && (cavablesSinNombre[id] || RE_CAVABLE.test(nombreItem(id))); });
  }
  function esRopeSpot(t) {
    var ids = [t.id].concat((t.items || []).map(function (x) { return x && x.id; }));
    return ids.some(function (id) { return id && /rope spot/i.test(nombreItem(id)); });
  }
  // Casilla junto al personaje (o la suya) que cumple la condición; prefiere la más cercana a (px, py)
  function casillaCerca(cond, px, py) {
    var gc = window.gameClient, P = gc.player.getPosition(), mejor = null, mejorD = 99;
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        var t = null;
        try { t = gc.world.getTileFromWorldPosition(new P.constructor(P.x + dx, P.y + dy, P.z)); } catch (e) {}
        if (!t || !cond(t)) { continue; }
        var d = (typeof px === 'number') ? Math.max(Math.abs(P.x + dx - px), Math.abs(P.y + dy - py)) : Math.abs(dx) + Math.abs(dy);
        if (d < mejorD) { mejor = t; mejorD = d; }
      }
    }
    return mejor;
  }
  function usarObjetoEn(re, cond, px, py) {
    var src = buscarEnMochila(re);
    if (!src) { return 'no está en la mochila abierta'; }
    var t = casillaCerca(cond, px, py);
    if (!t) { return 'no encuentro dónde usarla'; }
    window.gameClient.mouse.__handleItemUseWith(src, { which: t, index: 255 });
    return '';
  }
  function usarObjetoEnCasilla(re, x, y, z) {
    var src = buscarEnMochila(re);
    if (!src) { return 'no está en la mochila abierta'; }
    var t = tileEn(x, y, z);
    if (!t) { return 'no veo la casilla ' + x + ',' + y; }
    window.gameClient.mouse.__handleItemUseWith(src, { which: t, index: 255 });   // el juego camina al lado si hace falta
    return '';
  }
  function ejecutarAccionWP(accion, sig) {
    var nom = accNombre(accion), T = accCasilla(accion), P = posJug();
    if (nom === 'rope' || nom === 'shovel' || nom === 'escalera') {
      if (!T && P) {
        var e = especialCerca(nom, 2, sig ? sig[0] : undefined, sig ? sig[1] : undefined);
        if (e) { T = [e.x, e.y, e.z]; }
      }
      var err = '';
      try {
        if (!T) { err = 'no encuentro ' + (nom === 'rope' ? 'el rope spot' : nom === 'shovel' ? 'el hoyo cerrado' : 'la escalera') + ' cerca'; }
        else if (nom === 'shovel') {
          var th = tileEn(T[0], T[1], T[2]);
          if (th && !esCavable(th)) { cazaEstado = 'el hoyo ya está abierto'; return; }
          err = usarObjetoEnCasilla(/^shovel$/i, T[0], T[1], T[2]);
        } else if (nom === 'rope') {
          err = usarObjetoEnCasilla(/^rope$/i, T[0], T[1], T[2]);
        } else {
          var tl = tileEn(T[0], T[1], T[2]), idx = -1;
          if (!tl) { err = 'no veo la escalera'; }
          else {
            for (var i = (tl.items || []).length - 1; i >= 0; i--) { if (esItemEscaleraMano(tl.items[i])) { idx = i; break; } }
            if (idx >= 0) { window.gameClient.mouse.use({ which: tl, index: idx }); }
            else if (fcDe(tl)) { if (!caminarA(T[0], T[1], T[2])) { err = 'no puedo caminar a la escalera'; } else { cazaEstado = 'pisando la escalera en ' + T[0] + ',' + T[1]; return; } }
            else { err = 'no hay escalera en ' + T[0] + ',' + T[1]; }
          }
        }
      } catch (e2) { err = e2.message; }
      if (!err) { cazaEstado = 'usando ' + nom + (T ? ' en ' + T[0] + ',' + T[1] : ''); return; }
      // Sin el objeto en la mochila: método anterior (tecla configurada)
      var tk = nom === 'rope' ? cfg.cazaRopeKey : (nom === 'shovel' ? cfg.cazaShovelKey : '');
      if (tk) { try { pulsarTecla(tk); } catch (e3) { registrar('acción WP: ' + e3.message); } }
      cazaEstado = nom + ': ' + err;
      return;
    }
    accion = nom;
    var tecla = '';
    if (accion === 'rope') { tecla = cfg.cazaRopeKey; }
    else if (accion === 'shovel') { tecla = cfg.cazaShovelKey; }
    else if (accion === 'runa') { tecla = cfg.cazaRunaKey; }
    if (tecla) {
      try { pulsarTecla(tecla); cazaEstado = 'usando ' + accion + ' (' + tecla + ')'; } catch (e) { registrar('acción WP: ' + e.message); }
    }
  }

  function moverDir(dir, metodo) {
    var f = FLECHAS[dir];
    if (!f) { return; }
    var m = (metodo === undefined) ? ((Number(cfg.cazaMetodoMov) || 0) % 3) : metodo;
    var dest = m === 2 ? window : (m === 1 ? (document.querySelector('canvas') || document.body) : (document.body || document));
    function ev(tipo) {
      return new KeyboardEvent(tipo, { key: f[0], code: f[0], keyCode: f[1], which: f[1], bubbles: true, cancelable: true });
    }
    dest.dispatchEvent(ev('keydown'));
    setTimeout(function () { dest.dispatchEvent(ev('keyup')); }, 90 + Math.random() * 60);
  }

  // ---------- Caminar con el buscador de caminos del propio juego (igual que un clic en el mapa) ----------
  function pfJuego() { try { var pf = window.gameClient.world.pathfinder; return (pf && typeof pf.findPath === 'function') ? pf : null; } catch (e) { return null; } }
  function posObj(x, y, z) { var P = window.gameClient.player.getPosition(); return new P.constructor(x, y, z); }
  function caminarA(x, y, z) {
    var pf = pfJuego();
    if (!pf) { return false; }
    try {
      var P = window.gameClient.player.getPosition();
      pf.__pathfindCache = []; pf.__finalDestination = null;
      pf.findPath(P, new P.constructor(x, y, z));
      return true;
    } catch (e) { registrar('caminar: ' + e.message); return false; }
  }
  function pararCaminata() {
    var pf = pfJuego();
    try { if (pf && pf.__isAutoWalking && typeof pf.setPathfindCache === 'function') { pf.setPathfindCache(null); } } catch (e) {}
  }
  function autoCaminando() { var pf = pfJuego(); return !!(pf && pf.__isAutoWalking); }
  // Fija el objetivo avisando al servidor (setTarget solo lo marcaba en pantalla)
  function fijarObjetivo(cr) {
    var gc = window.gameClient;
    pararCaminata();
    if (gc.world && typeof gc.world.targetMonster === 'function') { gc.world.targetMonster(new Set([cr])); }
    else { gc.player.setTarget(cr); }
  }
  function soltarObjetivo() {
    try {
      var gc = window.gameClient, it = gc.interface;
      if ((it.modalManager && it.modalManager.isOpened()) || (it.menuManager && it.menuManager.isOpened())) { return false; }
      if (gc.player.hasTarget() && gc.keyboard && typeof gc.keyboard.__handleEscapeKey === 'function') { gc.keyboard.__handleEscapeKey(); return true; }
    } catch (e) {}
    return false;
  }
  function vidaDe(cr) { try { return (cr.state && typeof cr.state.health === 'number') ? cr.state.health : null; } catch (e) { return null; } }
  function chaseActivo() { var c = document.querySelector('.chase-mode-btn.active'); return c ? c.getAttribute('data-chase') : ''; }

  function dirHacia(dx, dy) {
    var sx = dx > 0 ? 1 : (dx < 0 ? -1 : 0), sy = dy > 0 ? 1 : (dy < 0 ? -1 : 0);
    if (sx !== 0 && sy !== 0) { if (cazaAtasco % 2 === 0) { sy = 0; } else { sx = 0; } }
    if (sx > 0) { return 'derecha'; }
    if (sx < 0) { return 'izquierda'; }
    if (sy > 0) { return 'abajo'; }
    if (sy < 0) { return 'arriba'; }
    return null;
  }

  function enviarPaso(dir, pos, ahora) {
    if (ahora - cazaPasoT > 1500) { cazaUltMovT = ahora; }
    var movio = !cazaPasoPos || !mismaPos(cazaPasoPos, pos);
    if (!movio && ahora - cazaUltMovT > 1800) { cazaAtasco++; cazaUltMovT = ahora; return 'atasco'; }
    if (!movio && ahora - cazaPasoT < 450) { return false; }
    if (movio && ahora - cazaPasoT < cazaDemora) { return false; }
    moverDir(dir);
    cazaPasoT = ahora;
    cazaPasoPos = { x: pos.x, y: pos.y, z: pos.z };
    cazaDemora = 50 + Math.random() * 120;
    return true;
  }

  function indiceExacto(pos, desde, hasta) {
    desde = Math.max(0, desde); hasta = Math.min(ruta.length - 1, hasta);
    for (var i = desde; i <= hasta; i++) {
      var r = ruta[i];
      if (r[0] === pos.x && r[1] === pos.y && r[2] === pos.z) { return i; }
    }
    return -1;
  }
  function indiceCercano(pos) {
    var mejor = -1, mejorD = Infinity;
    for (var i = 0; i < ruta.length; i++) {
      var r = ruta[i];
      if (r[2] !== pos.z) { continue; }
      var d = Math.abs(r[0] - pos.x) + Math.abs(r[1] - pos.y);
      if (d < mejorD || (d === mejorD && Math.abs(i - cazaIdx) < Math.abs(mejor - cazaIdx))) { mejorD = d; mejor = i; }
    }
    return { i: mejor, d: mejorD };
  }

  // Busca dónde estoy en la ruta: primero hacia delante (en el sentido de la marcha), luego un poco hacia atrás
  function indiceEnRuta(pos) {
    var n = ruta.length;
    for (var s2 = 0; s2 <= 16; s2++) {
      var i = cazaIdx - cazaDir + s2 * cazaDir;
      if (i < 0 || i >= n) { continue; }
      var r = ruta[i];
      if (r[0] === pos.x && r[1] === pos.y && r[2] === pos.z) { return i; }
    }
    return indiceExacto(pos, cazaIdx - 4, cazaIdx + 4);
  }
  // ---------- Cambio de piso automático ----------
  // Busca cerca cómo pasar al piso de 'dest': subir = rope spot, ladder o escalera/rampa que sube;
  // bajar = hoyo abierto o escalera que baja (se pisa), hoyo cerrado (shovel) o grate/trapdoor (clic derecho).
  function cheb(ax, ay, bx, by) { return Math.max(Math.abs(ax - bx), Math.abs(ay - by)); }
  function buscarCambioPiso(pos, dest) {
    var sube = dest[2] < pos.z, mejor = null, vistos = {};
    function probar(x, y) {
      var k = x + ',' + y; if (vistos[k]) { return; } vistos[k] = 1;
      if (cheb(x, y, pos.x, pos.y) > 5) { return; }
      var t = tileEn(x, y, pos.z); if (!t) { return; }
      var tipo = null, fc = fcDe(t);
      if (sube) {
        if (esRopeSpot(t)) { tipo = 'rope'; }
        else if (esEscaleraMano(t) && escaleraSube(t)) { tipo = 'escalera'; }
        else if (fc && fc !== 'down') { tipo = 'pisar'; }
      } else {
        if (fc === 'down') { tipo = 'pisar'; }
        else if (esCavable(t)) { tipo = 'shovel'; }
        else if (esEscaleraMano(t) && !escaleraSube(t)) { tipo = 'escalera'; }
      }
      if (!tipo) { return; }
      var d = cheb(x, y, dest[0], dest[1]) * 3 + cheb(x, y, pos.x, pos.y);
      if (!mejor || d < mejor.d) { mejor = { tipo: tipo, x: x, y: y, z: pos.z, d: d }; }
    }
    for (var dy = -2; dy <= 2; dy++) {
      for (var dx = -2; dx <= 2; dx++) { probar(pos.x + dx, pos.y + dy); probar(dest[0] + dx, dest[1] + dy); }
    }
    return mejor;
  }
  function resolverPiso(pos, dest, ahora, etq) {
    var c = buscarCambioPiso(pos, dest);
    if (!c) { return false; }
    var sube = dest[2] < pos.z;
    if (c.tipo === 'pisar') {
      if (cazaAW && cazaAW.piso) {
        if (ahora - Math.max(cazaUltMovT, cazaAW.t) < 1500 && ahora - cazaAW.t < 12000) { return true; }
        cazaAW = null; marcarAtasco(ahora); return true;
      }
      if (caminarA(c.x, c.y, c.z)) {
        cazaAW = { i: cazaIdx, x: c.x, y: c.y, z: c.z, t: ahora, piso: true };
        cazaEstado = etq + ': ' + (sube ? 'subo' : 'bajo') + ' por ' + c.x + ',' + c.y;
      }
      return true;
    }
    cazaAW = null;
    if (ahora - cazaAccionT > 3000) {
      cazaAccionT = ahora; cazaAccIntentos++;
      if (cazaAccIntentos > 6) {
        cazaParar('no pude ' + (sube ? 'subir' : 'bajar') + ' de piso (' + c.tipo + ')');
        alertar('caza', '⚠ Cave hunt detenido: no pude usar ' + c.tipo + ' en ' + c.x + ',' + c.y);
        return true;
      }
      ejecutarAccionWP({ a: c.tipo, t: [c.x, c.y, c.z] }, dest);
    }
    if (cazaEstado.indexOf(c.tipo + ':') !== 0) { cazaEstado = etq + ': ' + (sube ? 'subo' : 'bajo') + ' con ' + c.tipo + ' (' + c.x + ',' + c.y + ')'; }
    return true;
  }
  var cazaZAnt = null;
  var cazaAW = null;   // caminata en curso: { i, x, y, z, t }
  var cazaEspera = null, cazaEsperaHecha = null;   // espera en un spawn: { j, x, y, z, seg, hasta }
  function seguirRuta(pos, ahora) {
    var n = ruta.length;
    if (cazaIdx > n) { cazaIdx = n; }
    var pf = pfJuego();
    if (cazaZAnt !== null && pos.z !== cazaZAnt) { cazaAccIntentos = 0; cazaAW = null; }
    cazaZAnt = pos.z;
    // Esperando en un spawn
    if (cazaEspera && cazaRetirando) { cazaEspera = null; }
    if (cazaEspera) {
      if (ahora >= cazaEspera.hasta) {
        cazaEsperaHecha = { j: cazaEspera.j, v: cazaVueltas, d: cazaDir };
        cazaEspera = null; cazaChaseT = 0;
      } else {
        if (pos.x !== cazaEspera.x || pos.y !== cazaEspera.y || pos.z !== cazaEspera.z) {
          if (!cazaAW || ahora - Math.max(cazaUltMovT, cazaAW.t) > 1500) {
            cazaAW = null;
            if (pos.z === cazaEspera.z && caminarA(cazaEspera.x, cazaEspera.y, cazaEspera.z)) { cazaAW = { i: cazaEspera.j, x: cazaEspera.x, y: cazaEspera.y, z: cazaEspera.z, t: ahora }; }
          }
          cazaEstado = 'volviendo al spawn (punto ' + cazaEspera.j + ')';
          return;
        }
        cazaAW = null;
        if (chaseActivo() !== 'stand' && ahora - cazaChaseT > 3000) { cazaChaseT = ahora; aplicarModoCombate(null, 'stand'); }
        cazaEstado = 'esperando monstruos en el spawn: ' + Math.ceil((cazaEspera.hasta - ahora) / 1000) + ' s';
        return;
      }
    }
    var j = indiceEnRuta(pos);
    var enRuta = j >= 0;
    if (enRuta) {
      cazaPerdidoDesde = 0;
      cazaIdx = j + cazaDir;
      if (ruta[j - cazaDir] && ruta[j - cazaDir][2] !== pos.z) { cazaAccIntentos = 0; }
      if (cazaPuntoAtasco >= 0 && Math.abs(j - cazaPuntoAtasco) > 0) { cazaPuntoAtasco = -1; cazaAtascosPunto = 0; cazaSaltos = 0; }
      var acc = ruta[j] && ruta[j][4];
      if (accNombre(acc) === 'esperar') {
        var hecha = cazaEsperaHecha && cazaEsperaHecha.j === j && cazaEsperaHecha.v === cazaVueltas && cazaEsperaHecha.d === cazaDir;
        if (!hecha && !cazaRetirando) {
          var sg = Math.max(3, Number(acc.s) || Number(cfg.cazaEsperaSeg) || 20);
          cazaEspera = { j: j, x: pos.x, y: pos.y, z: pos.z, seg: sg, hasta: ahora + sg * 1000 };
          cazaAW = null; cazaChaseT = 0;
          cazaEstado = 'llegué al spawn, espero ' + sg + ' s';
          return;
        }
      } else if (acc && (cazaDir > 0 || accNombre(acc) === 'runa') && j !== cazaUltAccionIdx && ahora - cazaAccionT > 2000) {
        cazaUltAccionIdx = j;
        cazaAccionT = ahora;
        cazaAW = null;
        ejecutarAccionWP(acc, ruta[j + cazaDir]);
        return;
      }
    } else if (!cazaAW) {
      // Si el punto al que iba está junto a mí (p. ej. justo después de cambiar de piso), sigo con ese y no salto a otro
      var esp = ruta[cazaIdx], espCerca = esp && esp[2] === pos.z && cheb(esp[0], esp[1], pos.x, pos.y) <= 1;
      var cer = cercanoAdelante(pos);
      if (!espCerca && cer.i >= 0 && cer.d <= 2) { cazaIdx = cer.i; }
      var d0 = ruta[cazaIdx];
      var cerca = d0 && d0[2] === pos.z && Math.max(Math.abs(d0[0] - pos.x), Math.abs(d0[1] - pos.y)) <= 1;
      if (!cerca) {
        var c = indiceCercano(pos);
        if (c.i < 0 || c.d > 40) {
          if (!cazaPerdidoDesde) { cazaPerdidoDesde = ahora; }
          cazaEstado = 'lejos de la ruta (' + Math.round((ahora - cazaPerdidoDesde) / 1000) + ' s)';
          if (ahora - cazaPerdidoDesde > 6000) {
            cazaParar('perdido: lejos de la ruta grabada');
            alertar('caza', '⚠ Cave hunt detenido: lejos de la ruta.');
          }
          return;
        }
        cazaPerdidoDesde = 0;
        cazaIdx = c.i;
      }
    }

    if (cazaDir > 0 && cazaIdx >= n) {
      cazaVueltas++;
      if (cfg.cazaIdaVuelta) { cazaDir = -1; cazaIdx = Math.max(0, n - 2); } else { cazaIdx = 0; }
      cazaAW = null;
    }
    if (cazaDir < 0 && cazaIdx < 0) {
      if (cazaRetirando) { cazaEstado = 'en refugio, recuperando (' + cazaRetiroMotivo + ')'; cazaIdx = 0; return; }
      cazaVueltas++;
      cazaDir = 1; cazaIdx = Math.min(1, n - 1);
      cazaAW = null;
    }
    var etq = (cazaRetirando ? 'retirándose (' + cazaRetiroMotivo + ')' : 'caminando');
    for (var sk = 0; sk < 2; sk++) {
      var wc = ruta[cazaIdx], wa = ruta[cazaIdx - cazaDir];
      if (wc && wa && wc[2] === pos.z && wa[2] !== wc[2] && !(pos.x === wc[0] && pos.y === wc[1])) {
        var tw = tileEn(wc[0], wc[1], wc[2]);
        if (tw && (fcDe(tw) || esCavable(tw))) {
          var sigI = cazaIdx + cazaDir;
          if (sigI < 0 || sigI >= n) { break; }
          cazaIdx = sigI; continue;
        }
      }
      break;
    }

    // Cambio de piso (rampas, escaleras que se pisan, huecos): la casilla a pisar está entre el último
    // punto de este piso y el primero del otro. Se camina hasta ella con el buscador del juego.
    var dest = ruta[Math.max(0, Math.min(n - 1, cazaIdx))];
    if (cazaAW && cazaAW.piso && pos.z !== cazaAW.z) { cazaAW = null; }   // ya cambié de piso
    if (dest[2] !== pos.z) {
      var prev = ruta[cazaIdx - cazaDir];
      // Punto con acción (escalera de mano, rope, shovel): no se camina, se repite la acción hasta cambiar de piso
      var pAcc = prev ? accNombre(prev[4]) : '', pT = prev ? accCasilla(prev[4]) : null;
      // Shovel: cuando el hoyo ya está abierto, se camina encima (la shovel se usa desde al lado, nunca encima)
      if (cazaDir > 0 && pAcc === 'shovel' && prev[2] === pos.z) {
        var hoyo = pT || [dest[0], dest[1], pos.z], th = tileEn(hoyo[0], hoyo[1], pos.z);
        if (th && !esCavable(th)) {
          if (cazaAW && cazaAW.piso) {
            if (ahora - Math.max(cazaUltMovT, cazaAW.t) < 1500 && ahora - cazaAW.t < 12000) { return; }
            cazaAW = null; marcarAtasco(ahora); return;
          }
          if (caminarA(hoyo[0], hoyo[1], pos.z)) {
            cazaAW = { i: cazaIdx, x: hoyo[0], y: hoyo[1], z: pos.z, t: ahora, piso: true };
            cazaEstado = etq + ': bajo por el hoyo ' + hoyo[0] + ',' + hoyo[1];
          }
          return;
        }
      }
      // Rope, shovel (hoyo cerrado) o escalera de clic derecho: se repite la acción hasta cambiar de piso
      if (cazaDir > 0 && prev && pAcc && pAcc !== 'runa' && prev[2] === pos.z && Math.max(Math.abs(prev[0] - pos.x), Math.abs(prev[1] - pos.y)) <= 3) {
        cazaAW = null;
        if (ahora - cazaAccionT > 3000) {
          cazaAccionT = ahora; cazaAccIntentos++;
          if (cazaAccIntentos > 5) {
            cazaParar('no pude cambiar de piso (' + pAcc + ')');
            alertar('caza', '⚠ Cave hunt detenido: no pude usar ' + pAcc + ' en el punto ' + (cazaIdx - cazaDir));
            return;
          }
          ejecutarAccionWP(prev[4], dest);
        }
        if (cazaEstado.indexOf(pAcc + ':') !== 0) { cazaEstado = etq + ': esperando cambio de piso (' + pAcc + ')'; }
        return;
      }
      var yaFallo = cazaPuntoAtasco === cazaIdx && cazaAtascosPunto >= 1;   // si falló, pruebo con la flecha grabada
      if ((cazaDir < 0 || yaFallo) && resolverPiso(pos, dest, ahora, etq)) { return; }
      if (pf && prev && prev[2] === pos.z && !yaFallo) {
        var sx = Math.sign(dest[0] - prev[0]), sy = Math.sign(dest[1] - prev[1]);
        var lejosP = Math.max(Math.abs(dest[0] - prev[0]), Math.abs(dest[1] - prev[1]));
        if (lejosP >= 1) {
          var tx = lejosP >= 2 ? prev[0] + sx : dest[0], ty = lejosP >= 2 ? prev[1] + sy : dest[1];
          if (cazaAW && cazaAW.piso) {
            if (ahora - Math.max(cazaUltMovT, cazaAW.t) < 1500 && ahora - cazaAW.t < 12000) { return; }
            cazaAW = null; marcarAtasco(ahora); return;
          }
          if (caminarA(tx, ty, pos.z)) {
            cazaAW = { i: cazaIdx, x: tx, y: ty, z: pos.z, t: ahora, piso: true };
            cazaEstado = etq + ': cambio de piso (' + (dest[2] < pos.z ? 'subo' : 'bajo') + ')';
          }
          return;
        }
      }
      cazaAW = null;
      if (resolverPiso(pos, dest, ahora, etq)) { return; }
      if (!enRuta) { cazaEstado = 'estoy en otro piso que la ruta'; return; }
      var k = cazaDir > 0 ? dest[3] : (ruta[cazaIdx + 1] ? ruta[cazaIdx + 1][3] : -1);
      if (typeof k !== 'number' || k < 0) { cazaEstado = 'cambio de piso sin tecla grabada'; return; }
      if (cazaDir < 0) { k = (k + 2) % 4; }
      cazaEstado = etq + ': cambio de piso';
      if (enviarPaso(DIRS4[k], pos, ahora) === 'atasco') { marcarAtasco(ahora); }
      return;
    }

    // Sin buscador de caminos del juego: método anterior (flechas casilla por casilla)
    if (!pf) {
      var dir = dirHacia(dest[0] - pos.x, dest[1] - pos.y);
      if (!dir) { return; }
      cazaEstado = etq + ' al punto ' + cazaIdx + '/' + (n - 1);
      if (enviarPaso(dir, pos, ahora) === 'atasco') { marcarAtasco(ahora); }
      return;
    }

    // Caminata en curso: esperar mientras avance
    if (cazaAW) {
      if (pos.x === cazaAW.x && pos.y === cazaAW.y && pos.z === cazaAW.z) { cazaAW = null; return; }
      var quieto = ahora - Math.max(cazaUltMovT, cazaAW.t);
      if (quieto < 1500 && ahora - cazaAW.t < 20000) {
        cazaEstado = etq + ' al punto ' + cazaAW.i + '/' + (n - 1);
        return;
      }
      // Se detuvo. Si quedé junto al punto (estaba ocupado), lo doy por alcanzado
      var dAW = Math.max(Math.abs(cazaAW.x - pos.x), Math.abs(cazaAW.y - pos.y));
      if (dAW <= 1 && cazaAW.z === pos.z) { cazaIdx = cazaAW.i + cazaDir; cazaAW = null; return; }
      // No avanzó: el camino está bloqueado
      cazaAW = null;
      marcarAtasco(ahora);
      if (!cazaCorriendo) { return; }
    }

    // El siguiente punto es un hoyo que se volvió a cerrar: abrirlo con la shovel antes de caminar encima
    var dC = ruta[cazaIdx];
    if (dC && dC[2] === pos.z && cheb(dC[0], dC[1], pos.x, pos.y) <= 3) {
      var tC = tileEn(dC[0], dC[1], dC[2]);
      if (tC && esCavable(tC)) {
        cazaAW = null;
        if (ahora - cazaAccionT > 3000) {
          cazaAccionT = ahora; cazaAccIntentos++;
          if (cazaAccIntentos > 6) { cazaParar('no pude abrir el hoyo en ' + dC[0] + ',' + dC[1]); alertar('caza', '⚠ Cave hunt detenido: no pude abrir el hoyo con la shovel'); return; }
          ejecutarAccionWP({ a: 'shovel', t: [dC[0], dC[1], dC[2]] }, ruta[cazaIdx + cazaDir]);
        }
        if (cazaEstado.indexOf('shovel:') !== 0) { cazaEstado = etq + ': abro el hoyo con shovel (' + dC[0] + ',' + dC[1] + ')'; }
        return;
      }
    }
    // Elegir a qué punto ir: el más lejano hacia delante (máx. 7 casillas), sin saltarse
    // cambios de piso ni puntos con acción. Si me atasqué, pruebo más cerca y luego más lejos.
    var maxD = 7, minS = 0;
    if (cazaAtascosPunto === 1) { maxD = 3; }
    else if (cazaAtascosPunto === 2) { maxD = 12; minS = 4; }
    else if (cazaAtascosPunto >= 3) { maxD = 14; minS = 8; }
    var obj = -1;
    if (!(ruta[cazaIdx] && ruta[cazaIdx][4])) {
      for (var s3 = 0; s3 < 24; s3++) {
        var i2 = cazaIdx + s3 * cazaDir;
        if (i2 < 0 || i2 >= n) { break; }
        var r2 = ruta[i2];
        if (r2[2] !== pos.z) { break; }
        if (Math.max(Math.abs(r2[0] - pos.x), Math.abs(r2[1] - pos.y)) > maxD) { break; }
        if ((s3 >= minS || obj < 0) && casillaLibre(r2[0], r2[1], r2[2]) !== false) { obj = i2; }
        if (r2[4]) { break; }
        var sig = ruta[i2 + cazaDir];
        if (sig && sig[2] !== r2[2]) { break; }
      }
    }
    if (obj < 0) { obj = Math.max(0, Math.min(n - 1, cazaIdx)); }
    var dd = ruta[obj];
    if (dd[0] === pos.x && dd[1] === pos.y && dd[2] === pos.z) { cazaIdx = obj + cazaDir; return; }
    if (caminarA(dd[0], dd[1], dd[2])) {
      cazaAW = { i: obj, x: dd[0], y: dd[1], z: dd[2], t: ahora };
      cazaEstado = etq + ' al punto ' + obj + '/' + (n - 1);
    }
  }
  function cercanoAdelante(pos) {
    var mejor = -1, mejorD = Infinity;
    for (var s4 = -2; s4 <= 24; s4++) {
      var i = cazaIdx + s4 * cazaDir;
      if (i < 0 || i >= ruta.length) { continue; }
      var r = ruta[i];
      if (r[2] !== pos.z) { continue; }
      var d = Math.max(Math.abs(r[0] - pos.x), Math.abs(r[1] - pos.y));
      if (d < mejorD || (d === mejorD && s4 > 0)) { mejorD = d; mejor = i; }
    }
    return { i: mejor, d: mejorD };
  }
  // true = se puede pisar, false = bloqueada (árbol, pared, criatura), null = no lo sé
  function casillaLibre(x, y, z) {
    try {
      var t = window.gameClient.world.getTileFromWorldPosition(posObj(x, y, z));
      if (!t) { return null; }
      return !!t.isWalkable() && !(typeof t.isOccupied === 'function' && t.isOccupied());
    } catch (e) { return null; }
  }
  function marcarAtasco(ahora) {
    if (cazaPuntoAtasco !== cazaIdx) { cazaPuntoAtasco = cazaIdx; cazaAtascosPunto = 0; }
    cazaAtascosPunto++;
    cazaEstado = 'camino bloqueado en el punto ' + cazaIdx + ' (intento ' + cazaAtascosPunto + ')';
    if (cazaAtascosPunto === 4) {
      // Saltar unos puntos hacia delante
      cazaIdx = Math.max(0, Math.min(ruta.length - 1, cazaIdx + 6 * cazaDir));
      cazaPuntoAtasco = cazaIdx; cazaAtascosPunto = 3;
      cazaSaltos++;
    }
    if (cazaSaltos >= 3) {
      cazaParar('atascado cerca del punto ' + cazaIdx);
      alertar('caza', '⚠ Cave hunt detenido: no encuentro camino cerca del punto ' + cazaIdx);
    }
  }
  var cazaSaltos = 0, cazaAccIntentos = 0;

  function listaObjetivos() {
    return String(cfg.cazaObjetivos || '').split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
  }

  var cazaHold = null, cazaHoldT = 0, cazaHoldVida = null, cazaHoldPos = null, cazaSoltarT = 0, cazaChaseT = 0, cazaChasePrev = '';
  function asegurarChase(ahora) {
    if (ahora - cazaChaseT < 3000) { return; }
    cazaChaseT = ahora;
    var quiero = (cfg.cazaKiting || !cfg.cazaAcercar || cazaEspera) ? 'stand' : 'chase';
    if (chaseActivo() !== quiero) { aplicarModoCombate(null, quiero); }
  }
  function hayMonstruoCerca(rango) {
    var act = criaturasActivas(), p = window.gameClient.player, mio = posDe(p);
    if (!act || !mio) { return false; }
    return act.some(function (cr) {
      try {
        if (!cr || cr === p || vidaDe(cr) === 0) { return false; }
        if (typeof cr.type === 'number' ? cr.type !== 1 : cr.constructor.name !== 'Creature') { return false; }   // 1 = monstruo (0 = jugador)
        if (cr.masterId) { return false; }   // invocación de alguien
        var q = posDe(cr); if (!q || q.z !== mio.z) { return false; }
        var dx = Math.abs(q.x - mio.x), dy = Math.abs(q.y - mio.y);
        return dx <= 7 && dy <= 5 && Math.max(dx, dy) <= rango;
      } catch (e) { return false; }
    });
  }
  var cazaIgnorar = {}, cazaAlcT = 0, cazaAlcFallos = 0;   // id de criatura -> hasta cuándo no intentar atacarla (inalcanzable)
  function criaturasActivas() {
    try {
      var ac = window.gameClient.world.activeCreatures;
      if (!ac) { return null; }
      return (typeof ac.values === 'function' && !Array.isArray(ac)) ? Array.from(ac.values()) : valores(ac);
    } catch (e) { return null; }
  }
  // ¿Puedo llegar a pie a una casilla pegada a (qx, qy)? Búsqueda en anchura sobre las casillas que se ven
  // (las paredes, árboles y piedras bloquean; los monstruos no, porque se mueven)
  function hayCriatura(t) { try { return valores(t.monsters).length > 0 || valores(t.creatures).length > 0; } catch (e) { return false; } }
  function pisable(x, y, z) {
    var t = tileEn(x, y, z);
    if (!t) { return false; }
    try {
      if (!t.isWalkable()) { return false; }
      if (typeof t.isOccupied === 'function' && t.isOccupied() && !hayCriatura(t)) { return false; }
      if (esPisable(t)) { return false; }   // escaleras/hoyos: no cruzar por ahí
    } catch (e) { return false; }
    return true;
  }
  function alcanzable(pos, qx, qy, maxPasos) {
    if (Math.max(Math.abs(qx - pos.x), Math.abs(qy - pos.y)) <= 1) { return true; }
    var vis = {}, cola = [[pos.x, pos.y, 0]], k0 = pos.x + ',' + pos.y;
    vis[k0] = 1;
    while (cola.length) {
      var c = cola.shift();
      if (c[2] >= maxPasos) { continue; }
      for (var dy = -1; dy <= 1; dy++) {
        for (var dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) { continue; }
          var x = c[0] + dx, y = c[1] + dy, k = x + ',' + y;
          if (vis[k] || Math.abs(x - pos.x) > 10 || Math.abs(y - pos.y) > 8) { continue; }
          vis[k] = 1;
          if (x === qx && y === qy) { continue; }
          if (!pisable(x, y, pos.z)) { continue; }
          if (Math.max(Math.abs(qx - x), Math.abs(qy - y)) <= 1) { return true; }
          cola.push([x, y, c[2] + 1]);
        }
      }
    }
    return false;
  }
  // Línea de vista: ninguna casilla intermedia que no se pueda pisar (pared) entre los dos puntos
  function lineaVision(pos, qx, qy) {
    var dx = qx - pos.x, dy = qy - pos.y, n = Math.max(Math.abs(dx), Math.abs(dy));
    for (var i = 1; i < n; i++) {
      var x = Math.round(pos.x + dx * i / n), y = Math.round(pos.y + dy * i / n), t = tileEn(x, y, pos.z);
      try { if (!t || !t.isWalkable()) { return false; } } catch (e) { return false; }
    }
    return true;
  }
  var alcCache = {};
  function puedoAtacar(pos, cr) {
    var q = posDe(cr); if (!q || q.z !== pos.z) { return false; }
    var k = cr.id + '@' + pos.x + ',' + pos.y + '>' + q.x + ',' + q.y, c = alcCache[k], ahora = Date.now();
    if (c && ahora - c.t < 800) { return c.v; }
    var v = (cfg.cazaKiting || !cfg.cazaAcercar) ? lineaVision(pos, q.x, q.y) : alcanzable(pos, q.x, q.y, 22);
    alcCache = {}; alcCache[k] = { t: ahora, v: v };
    return v;
  }
  // El monstruo atacable más cercano (de la lista, o cualquiera si la lista está vacía)
  function mejorObjetivo(lista, rango) {
    var p = window.gameClient.player, mio = posJug(), act = criaturasActivas(), ahoraB = Date.now(), cands = [];
    if (!mio || !act) { return null; }
    act.forEach(function (cr) {
      try {
        if (!cr || cr === p || typeof cr.name !== 'string' || vidaDe(cr) === 0 || cr.masterId) { return; }
        if (lista.length ? lista.indexOf(cr.name.toLowerCase()) < 0 : (typeof cr.type === 'number' ? cr.type !== 1 : cr.constructor.name !== 'Creature')) { return; }
        if (cazaIgnorar[cr.id] && cazaIgnorar[cr.id] > ahoraB) { return; }
        var q = posDe(cr); if (!q || q.z !== mio.z) { return; }
        var dx = Math.abs(q.x - mio.x), dy = Math.abs(q.y - mio.y);
        if (dx > 7 || dy > 5) { return; }
        var d = Math.max(dx, dy);
        if (d <= rango) { cands.push({ cr: cr, d: d }); }
      } catch (e) {}
    });
    cands.sort(function (a, b) { return a.d - b.d; });
    for (var i = 0; i < cands.length && i < 6; i++) {
      if (puedoAtacar(mio, cands[i].cr)) { return cands[i].cr; }
      try { cazaIgnorar[cands[i].cr.id] = ahoraB + 4000; } catch (e) {}   // detrás de una pared: no reintentar enseguida
    }
    return null;
  }
  function buscarObjetivos(lista, rango) {
    var mo = mejorObjetivo(lista, rango);
    if (mo || criaturasActivas()) { return mo; }
    var p;
    try { p = window.gameClient.player; } catch (e) { return null; }
    if (!p) { return null; }
    var mio = posDe(p), mejor = null, mejorD = Infinity, ahoraB = Date.now();
    var act = criaturasActivas();
    if (act && mio) {
      act.forEach(function (cr) {
        try {
          if (!cr || cr === p || typeof cr.name !== 'string' || lista.indexOf(cr.name.toLowerCase()) < 0) { return; }
          var hp = vidaDe(cr); if (hp !== null && hp <= 0) { return; }
          if (cazaIgnorar[cr.id] && cazaIgnorar[cr.id] > ahoraB) { return; }
          var q = posDe(cr); if (!q || (typeof q.z === 'number' && q.z !== mio.z)) { return; }
          var dx = Math.abs(q.x - mio.x), dy = Math.abs(q.y - mio.y);
          if (dx > 7 || dy > 5) { return; }          // fuera de la pantalla: el servidor no deja atacarla
          var d = Math.max(dx, dy);
          if (d <= rango && d < mejorD) { mejor = cr; mejorD = d; }
        } catch (e) {}
      });
      return mejor;
    }
    var tiles = [];
    try { tiles = valores(p.__chunk && p.__chunk.tiles); } catch (e) {}
    var props = ['monsters', 'creatures', '__deferredCreatures'];
    for (var i = 0; i < tiles.length; i++) {
      var t = tiles[i];
      if (!t) { continue; }
      for (var j = 0; j < props.length; j++) {
        var col;
        try { col = t[props[j]]; } catch (e) { continue; }
        var cs = valores(col);
        for (var c = 0; c < cs.length; c++) {
          var cr = cs[c];
          try {
            if (!cr || typeof cr.name !== 'string' || lista.indexOf(cr.name.toLowerCase()) < 0) { continue; }
            var q = posDe(cr);
            var d = 0;
            if (mio && q) {
              if (typeof q.z === 'number' && typeof mio.z === 'number' && q.z !== mio.z) { continue; }
              d = Math.max(Math.abs(q.x - mio.x), Math.abs(q.y - mio.y));
            }
            if (d <= rango && d < mejorD) { mejor = cr; mejorD = d; }
          } catch (e) {}
        }
      }
    }
    return mejor;
  }

  function nombresCercanos() {
    var p;
    try { p = window.gameClient.player; } catch (e) { return {}; }
    if (!p) { return {}; }
    var yo = String(p.name || '').toLowerCase(), res = {};
    var tiles = [];
    try { tiles = valores(p.__chunk && p.__chunk.tiles); } catch (e) {}
    var props = ['monsters', 'creatures', '__deferredCreatures'];
    for (var i = 0; i < tiles.length; i++) {
      var t = tiles[i];
      if (!t) { continue; }
      for (var j = 0; j < props.length; j++) {
        var col;
        try { col = t[props[j]]; } catch (e) { continue; }
        var cs = valores(col);
        for (var c = 0; c < cs.length; c++) {
          try {
            var cr = cs[c];
            if (cr && typeof cr.name === 'string' && cr.name.toLowerCase() !== yo) { res[cr.name] = (res[cr.name] || 0) + 1; }
          } catch (e) {}
        }
      }
    }
    return res;
  }

  function hayJugadores() {
    var p;
    try { p = window.gameClient.player; } catch (e) { return []; }
    if (!p) { return []; }
    var yo = String(p.name || '').toLowerCase(), res = [];
    var tiles = [];
    try { tiles = valores(p.__chunk && p.__chunk.tiles); } catch (e) {}
    for (var i = 0; i < tiles.length; i++) {
      var t = tiles[i];
      if (!t) { continue; }
      var cs;
      try { cs = valores(t.players); } catch (e) { continue; }
      for (var c = 0; c < cs.length; c++) {
        try {
          var nm = cs[c] && cs[c].name;
          if (typeof nm === 'string' && nm.toLowerCase() !== yo && res.indexOf(nm) < 0) { res.push(nm); }
        } catch (e) {}
      }
    }
    return res;
  }

  // Food: la línea "Food 02:43" de la ventana de skills está en formato minutos:segundos
  function leerComida() {
    try {
      var v = leerSkill('food');
      var m = v && v.match(/(\d+):(\d{2})/);
      if (m) { return +m[1] + (+m[2]) / 60; }
    } catch (err) { registrar('food: ' + err.message); }
    return null;
  }

  // Cierra sesión con el botón Logout del juego (no funciona si estás en combate)
  function cerrarSesion() {
    try {
      var b = document.getElementById('logout-button');
      if (b) {
        b.click();
        setTimeout(function () {
          try {
            var c = document.querySelector('#confirm-modal button[action="confirm"]');
            if (c && visibleId('confirm-modal')) { c.click(); }
          } catch (e) {}
        }, 400);
        return true;
      }
    } catch (e) { registrar('logout: ' + e.message); }
    return false;
  }

  // ---------- Huida: alejarse de los monstruos a la casilla más segura que se vea ----------
  var cazaHuida = '', cazaHuidaT = 0, huidaMalas = {};
  function monstruosCercanos(pos, radio) {
    var act = criaturasActivas() || [], p = window.gameClient.player, res = [];
    act.forEach(function (cr) {
      try {
        if (!cr || cr === p || vidaDe(cr) === 0 || cr.masterId) { return; }
        if (typeof cr.type === 'number' ? cr.type !== 1 : cr.constructor.name !== 'Creature') { return; }
        var q = posDe(cr); if (!q || q.z !== pos.z) { return; }
        var d = Math.max(Math.abs(q.x - pos.x), Math.abs(q.y - pos.y));
        if (d <= radio) { res.push({ x: q.x, y: q.y, d: d }); }
      } catch (e) {}
    });
    return res;
  }
  function lugarSeguro(pos, ms, ahora) {
    var mejor = null, mejorP = -1e9;
    for (var dy = -5; dy <= 5; dy++) {
      for (var dx = -7; dx <= 7; dx++) {
        if (!dx && !dy) { continue; }
        var x = pos.x + dx, y = pos.y + dy, k = x + ',' + y + ',' + pos.z;
        if (huidaMalas[k] && huidaMalas[k] > ahora) { continue; }
        var t = tileEn(x, y, pos.z);
        if (!t) { continue; }
        try { if (!t.isWalkable() || (typeof t.isOccupied === 'function' && t.isOccupied()) || esPisable(t) || tipoEspecial(t)) { continue; } } catch (e) { continue; }
        var dmin = 99;
        for (var i = 0; i < ms.length; i++) { dmin = Math.min(dmin, Math.max(Math.abs(ms[i].x - x), Math.abs(ms[i].y - y))); }
        if (dmin <= 1) { continue; }
        var p = Math.min(dmin, 8) * 3 - Math.max(Math.abs(dx), Math.abs(dy)) * 0.6;
        if (p > mejorP) { mejorP = p; mejor = { x: x, y: y }; }
      }
    }
    return mejor;
  }
  var huidaSoltarT = 0;
  function huir(pos, ahora, motivo) {
    // Suelta al objetivo y no lo persigue
    try { if (window.gameClient.player.hasTarget() && ahora - huidaSoltarT > 1500) { huidaSoltarT = ahora; soltarObjetivo(); } } catch (e) {}
    if (ahora - cazaChaseT > 3000) { cazaChaseT = ahora; if (chaseActivo() !== 'stand') { aplicarModoCombate(null, 'stand'); } }
    var ms = monstruosCercanos(pos, 8), cerca = ms.filter(function (m) { return m.d <= 3; });
    if (cazaAW && cazaAW.huida) {
      if (pos.x === cazaAW.x && pos.y === cazaAW.y) { cazaAW = null; }
      else if (ahora - Math.max(cazaUltMovT, cazaAW.t) < 1300 && ahora - cazaAW.t < 6000) { return; }
      else { huidaMalas[cazaAW.x + ',' + cazaAW.y + ',' + cazaAW.z] = ahora + 15000; cazaAW = null; }
    }
    if (!cerca.length) { cazaEstado = 'a salvo, ' + motivo; return; }
    var s = lugarSeguro(pos, ms, ahora);
    if (s && caminarA(s.x, s.y, pos.z)) {
      cazaAW = { i: -1, x: s.x, y: s.y, z: pos.z, t: ahora, huida: true };
      cazaEstado = 'alejándome de ' + cerca.length + ' monstruo(s), ' + motivo;
    } else {
      // Sin casilla segura a la vista: un paso en dirección contraria a los monstruos
      var sx = 0, sy = 0; cerca.forEach(function (m) { sx += m.x; sy += m.y; });
      var dir = dirHacia(pos.x - sx / cerca.length, pos.y - sy / cerca.length);
      if (dir) { moverDir(dir); }
      cazaEstado = 'acorralado, ' + motivo;
    }
  }

  // ---------- Comida y oro ----------
  var RE_COMIDA = /\b(meat|ham|fish|salmon|trout|perch|pike|apples?|bananas?|bread|rolls?|cheese|carrots?|eggs?|cookies?|mushrooms?|oranges?|grapes|melons?|pears?|cherr(y|ies)|strawberr(y|ies)|blueberr(y|ies)|mangos?|plums?|corncobs?|cake|coconuts?|pumpkins?|potato(es)?|tomato(es)?|lemons?|cucumbers?|onions?|shrimps?|lobsters?|crabs?|honeycomb|chocolate|candy|garlic)\b/i;
  var RE_CADAVER = /^(dead|slain|remains|lifeless)\b|\bcorpse\b/i;
  function esComida(it) { var n = it && it.id ? nombreItem(it.id) : ''; return !!n && RE_COMIDA.test(n) && !RE_CADAVER.test(n); }
  function contenedores() { try { return Array.from(window.gameClient.player.__openedContainers || []); } catch (e) { return []; } }
  function esCadaverCont(c) { return RE_CADAVER.test(String(c.__title || '')) || RE_CADAVER.test(nombreItem(c.id)); }
  // Comida en mis mochilas abiertas (no en cadáveres)
  function comidaEnMochila() {
    var cs = contenedores();
    for (var c = 0; c < cs.length; c++) {
      if (esCadaverCont(cs[c]) || !cs[c].slots) { continue; }
      for (var i = 0; i < cs[c].slots.length; i++) {
        var it = cs[c].slots[i] && cs[c].slots[i].item;
        if (esComida(it)) { return { which: cs[c], index: i }; }
      }
    }
    return null;
  }
  // Cadáveres de lo que maté: se abren, se come lo que traigan y se cierran
  var cazaCadaveres = [], cazaCad = null;
  function anotarCadaver(cr) {
    var q = posDe(cr);
    if (!q) { return; }
    cazaCadaveres.push({ x: q.x, y: q.y, z: q.z, t: Date.now() });
    if (cazaCadaveres.length > 5) { cazaCadaveres.shift(); }
  }
  function hambre() {
    var fm = leerComida();
    return fm === null ? true : fm <= Math.max(cfg.cazaComerBajo, 10);
  }
  // Devuelve true mientras está ocupado con un cadáver (no caminar mientras tanto)
  function comerDeCadaver(pos, ahora) {
    if (!cfg.cazaComerOn || !cfg.cazaComerCadaver) { cazaCadaveres = []; cazaCad = null; return false; }
    if (!cazaCad) {
      cazaCadaveres = cazaCadaveres.filter(function (c) { return ahora - c.t < 60000 && c.z === pos.z && Math.max(Math.abs(c.x - pos.x), Math.abs(c.y - pos.y)) <= 6; });
      if (!cazaCadaveres.length || comidaEnMochila() || !hambre()) { return false; }
      cazaCad = cazaCadaveres.shift(); cazaCad.paso = 'abrir'; cazaCad.t0 = ahora; cazaCad.tx = 0; cazaCad.comidas = 0;
    }
    if (ahora - cazaCad.t0 > 9000) { cerrarCadaveres(); cazaCad = null; return false; }
    if (ahora < cazaCad.tx) { return true; }
    var gc = window.gameClient;
    if (cazaCad.paso === 'abrir') {
      var abierto = contenedores().filter(esCadaverCont)[0];
      if (abierto) { cazaCad.paso = 'comer'; cazaCad.cont = abierto; return true; }
      var t = null;
      try { t = gc.world.getTileFromWorldPosition(posObj(cazaCad.x, cazaCad.y, cazaCad.z)); } catch (e) {}
      var idx = -1;
      if (t && t.items) {
        for (var i = t.items.length - 1; i >= 0; i--) {
          var it = t.items[i];
          if (it && RE_CADAVER.test(nombreItem(it.id)) && typeof it.isContainer === 'function' && it.isContainer()) { idx = i; break; }
        }
      }
      if (idx < 0) { cazaCad = null; return false; }
      try { gc.mouse.use({ which: t, index: idx }); } catch (e) { registrar('abrir cadáver: ' + e.message); cazaCad = null; return false; }
      cazaEstado = 'abriendo el cadáver para comer';
      cazaCad.tx = ahora + 1500;
      return true;
    }
    if (cazaCad.paso === 'comer') {
      var c = cazaCad.cont, k = -1;
      if (c && c.slots && cazaCad.comidas < 3 && hambre()) {
        for (var j = 0; j < c.slots.length; j++) { if (esComida(c.slots[j] && c.slots[j].item)) { k = j; break; } }
      }
      if (k < 0) { cerrarCadaveres(); cazaCad = null; return false; }
      try { gc.mouse.use({ which: c, index: k }); cazaCad.comidas++; cazaComidas++; cazaUltComer = ahora; } catch (e) { registrar('comer del cadáver: ' + e.message); }
      cazaEstado = 'comiendo del cadáver';
      cazaCad.tx = ahora + 1200;
      return true;
    }
    return false;
  }
  function cerrarCadaveres() { contenedores().filter(esCadaverCont).forEach(function (c) { try { c.close(); } catch (e) {} }); }
  var cazaOroT = 0;
  function cambiarOro(ahora) {
    if (!cfg.cazaOroOn || ahora - cazaOroT < 4000) { return; }
    cazaOroT = ahora;
    try {
      var hm = window.gameClient.interface.hotbarManager;
      if (hm && typeof hm.__findFullCoinStack === 'function' && typeof hm.__convertCurrency === 'function' &&
          (hm.__findFullCoinStack(3031) !== null || hm.__findFullCoinStack(3035) !== null)) {
        // 100 gold -> 1 platinum, 100 platinum -> 1 crystal (la misma función del juego hace los dos)
        hm.__convertCurrency();
        registrar('monedas cambiadas');
      }
    } catch (e) { registrar('cambiar oro: ' + e.message); }
  }

  function cazaParar(razon) {
    try { if (defObj) { defTerminar('Cave hunt detenido'); } else { colRestaurarLock(); } } catch (e) {}
    if (cazaCorriendo) {
      try { if (cazaAW) { pararCaminata(); } } catch (e) {}
      try { if (cazaChasePrev && chaseActivo() !== cazaChasePrev) { aplicarModoCombate(null, cazaChasePrev); } } catch (e) {}
    }
    cazaAW = null; cazaHold = null; cazaHuida = ''; cazaEspera = null;
    cazaCorriendo = false;
    cazaRetirando = false;
    cazaAtqAt = null;
    if (razon) { cazaEstado = razon; }
    btnCazaIniciar.textContent = '▶ Iniciar cavehunt';
  }

  function cazaIniciar() {
    if (licExigir(cazaIniciar)) { cazaEstado = 'comprobando licencia'; ultimaAccion = 'comprobando tu licencia…'; return; }
    if (betaBloqueo()) { cazaEstado = 'no disponible (beta)'; ultimaAccion = 'Cave hunt: no disponible (beta)'; return; }
    var p = posJug();
    if (!p) { cazaEstado = 'no puedo leer la posición'; ultimaAccion = 'caza: ' + cazaEstado; return; }
    if (!listaObjetivos().length && ruta.length < 2) { ultimaAccion = 'caza: graba una ruta o escribe monstruos'; return; }
    if (grabando) { grabando = false; guardarRuta(); btnGrabar.textContent = '⏺ Grabar ruta'; }
    var c = indiceCercano(p);
    cazaIdx = (c.i >= 0 && c.d <= 40) ? c.i : 0;
    cazaDir = 1; cazaRetirando = false; cazaRetiroMotivo = ''; cazaAtasco = 0; cazaFallos = 0; cazaAtqAt = null;
    cazaPasoPos = null; cazaPerdidoDesde = 0; cazaTeniaObj = false;
    cazaPuntoAtasco = -1; cazaAtascosPunto = 0;
    cazaUltPos = null; cazaUltMovT = Date.now();
    cazaUltComer = Date.now(); cazaComerChequeo = 0; cazaComerFallback = 0;
    cazaUltAccionIdx = -1; cazaAccionT = 0;
    cazaAW = null; cazaSaltos = 0; cazaAccIntentos = 0; cazaHold = null; cazaCadaveres = []; cazaCad = null; cazaHuida = ''; huidaMalas = {}; cazaEspera = null; cazaEsperaHecha = null; cazaIgnorar = {}; cazaChaseT = 0;
    cazaChasePrev = chaseActivo();
    hpHistorial = [];
    cazaCorriendo = true;
    cazaEstado = 'iniciado';
    btnCazaIniciar.textContent = '■ Detener cavehunt';
  }

  // Criaturas visibles (sin contarte a ti), con su distancia
  function escanearMonstruos() {
    var p;
    try { p = window.gameClient.player; } catch (e) { return null; }
    if (!p) { return null; }
    var yo = String(p.name || '').toLowerCase(), mio = posDe(p);
    var tiles = [];
    try { tiles = valores(p.__chunk && p.__chunk.tiles); } catch (e) {}
    var props = ['monsters', 'creatures', '__deferredCreatures'];
    var res = [], vistos = [];
    for (var i = 0; i < tiles.length; i++) {
      var t = tiles[i];
      if (!t) { continue; }
      for (var j = 0; j < props.length; j++) {
        var col;
        try { col = t[props[j]]; } catch (e) { continue; }
        var cs = valores(col);
        for (var c = 0; c < cs.length; c++) {
          var cr = cs[c];
          try {
            if (!cr || typeof cr.name !== 'string' || cr.name.toLowerCase() === yo || vistos.indexOf(cr) >= 0) { continue; }
            vistos.push(cr);
            var q = posDe(cr);
            var d = (mio && q) ? Math.max(Math.abs(q.x - mio.x), Math.abs(q.y - mio.y)) : 0;
            res.push({ cr: cr, name: cr.name, d: d });
          } catch (e) {}
        }
      }
    }
    return res;
  }

  // Kiting (paladin, sorcerer, druid): como lo hace un jugador.
  // - Mantiene a los monstruos a la distancia elegida (3 sqm por defecto) y se queda QUIETO disparando.
  // - Solo da un paso si alguno se acerca a menos de esa distancia (o se acerca si el objetivo se queda lejos).
  // - Pasos rectos (sin diagonales), uno cada ~0.5–0.7 s, eligiendo la casilla libre con más espacio para seguir
  //   (no se mete a esquinas), sin regresar sobre el último paso y girando alrededor si no puede alejarse en línea recta.
  var kitProx = 0, kitUltDir = -1;
  var KIT_DIRS = [['arriba', 0, -1], ['derecha', 1, 0], ['abajo', 0, 1], ['izquierda', -1, 0]];
  function kitCheb(ax, ay, bx, by) { return Math.max(Math.abs(ax - bx), Math.abs(ay - by)); }
  function kitAmenazas(pos) {
    var act = criaturasActivas() || [], p = window.gameClient.player, res = [];
    act.forEach(function (c) {
      try {
        if (!c || c === p || c.type !== 1 || c.masterId || vidaDe(c) === 0) { return; }
        var q = posDe(c); if (!q || q.z !== pos.z) { return; }
        var d = kitCheb(q.x, q.y, pos.x, pos.y); if (d > 7) { return; }
        res.push({ c: c, x: q.x, y: q.y, d: d });
      } catch (e) {}
    });
    return res;
  }
  function kitLibre(x, y, z, ams) {
    for (var i = 0; i < ams.length; i++) { if (ams[i].x === x && ams[i].y === y) { return false; } }
    var t = tileEn(x, y, z); if (!t) { return false; }
    try {
      if (!t.isWalkable()) { return false; }
      if (typeof t.isOccupied === 'function' && t.isOccupied()) { return false; }
      if (esPisable(t)) { return false; }   // hoyos y escaleras: no caer por accidente
    } catch (e) { return false; }
    return true;
  }
  // Casillas libres que puedo alcanzar en 2 pasos desde (x, y): mide si es un callejón o hay por dónde seguir
  function kitEspacio(x, y, z, ams) {
    var vis = {}, cola = [[x, y, 0]], n = 0; vis[x + ',' + y] = 1;
    while (cola.length) {
      var c = cola.shift(); if (c[2] >= 2) { continue; }
      for (var k = 0; k < 4; k++) {
        var nx = c[0] + KIT_DIRS[k][1], ny = c[1] + KIT_DIRS[k][2], key = nx + ',' + ny;
        if (vis[key]) { continue; } vis[key] = 1;
        if (kitLibre(nx, ny, z, ams)) { n++; cola.push([nx, ny, c[2] + 1]); }
      }
    }
    return n;
  }
  // Pasos que necesita cada casilla para que la alcance el monstruo más cercano (rodeando paredes; ellos sí van en diagonal)
  function kitMapaMonstruos(pos, ams, R) {
    var dist = {}, cola = [];
    ams.forEach(function (m) { var k = m.x + ',' + m.y; if (!(k in dist)) { dist[k] = 0; cola.push([m.x, m.y]); } });
    while (cola.length) {
      var c = cola.shift(), d0 = dist[c[0] + ',' + c[1]];
      for (var dy = -1; dy <= 1; dy++) {
        for (var dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) { continue; }
          var nx = c[0] + dx, ny = c[1] + dy, k = nx + ',' + ny;
          if (k in dist || Math.abs(nx - pos.x) > R || Math.abs(ny - pos.y) > R) { continue; }
          if (!(nx === pos.x && ny === pos.y) && !kitLibre(nx, ny, pos.z, [])) { continue; }
          dist[k] = d0 + 1; cola.push([nx, ny]);
        }
      }
    }
    return dist;
  }
  // Desde la casilla N: ¿qué tan buena es la zona a la que puedo seguir huyendo? (llego antes que ellos y hay distancia)
  function kitFuturo(nx, ny, pos, ams, dMon, ideal) {
    var vis = {}, cola = [[nx, ny, 0]], mejor = -1e9; vis[nx + ',' + ny] = 1;
    while (cola.length) {
      var c = cola.shift(), k0 = c[0] + ',' + c[1], dm = (k0 in dMon) ? dMon[k0] : 20;
      var v = Math.min(dm, ideal + 2) * 10 + Math.min(dm - c[2], 4) * 4 - c[2];
      if (v > mejor) { mejor = v; }
      if (c[2] >= 5) { continue; }
      for (var t = 0; t < 4; t++) {
        var x = c[0] + KIT_DIRS[t][1], y = c[1] + KIT_DIRS[t][2], k = x + ',' + y;
        if (vis[k]) { continue; } vis[k] = 1;
        var dmk = (k in dMon) ? dMon[k] : 20;
        if (dmk <= c[2] + 1) { continue; }   // el monstruo llega antes: por ahí no
        if (kitLibre(x, y, pos.z, ams)) { cola.push([x, y, c[2] + 1]); }
      }
    }
    return mejor;
  }
  // Esquivar ondas y rayos (fire wave del dragon, dragon lord, demon...): sus ataques salen en línea recta o en
  // abanico hacia donde miran. Pararse en DIAGONAL al monstruo los evita. Si estoy en su línea, doy un paso a la
  // casilla libre más segura (sin perder al objetivo: pegado a él si peleo cuerpo a cuerpo).
  var esqProx = 0;
  function esqNombres() { return String(cfg.cazaEsqMonstruos || '').split(',').map(function (x) { return x.trim().toLowerCase(); }).filter(Boolean); }
  // ¿Cuánto me pega la onda o el rayo de un monstruo en (mx, my) si estoy en (x, y)? 0 = nada.
  // Forma de la onda de Tibia: pegado 1 de ancho, luego 3 de ancho hasta 4 sqm, 5 de ancho hasta 6; el rayo sigue recto hasta 7.
  function enOnda(mx, my, x, y) {
    var ax = Math.abs(x - mx), ay = Math.abs(y - my), mayor = Math.max(ax, ay), menor = Math.min(ax, ay);
    if (mayor < 1 || mayor > 7) { return 0; }
    var lim = mayor === 1 ? 0 : (mayor <= 4 ? 1 : (mayor <= 6 ? 2 : 0));
    return menor <= lim ? lim - menor + 1 : 0;
  }
  function esquivarOndas(pos, ahora, tg) {
    if (!cfg.cazaEsqOn || ahora < esqProx) { return false; }
    var nombres = esqNombres(); if (!nombres.length) { return false; }
    var p = window.gameClient.player, peligro = [], ams = [];
    (criaturasActivas() || []).forEach(function (c) {
      try {
        if (!c || c === p || c.type !== 1 || vidaDe(c) === 0) { return; }
        var q = posDe(c); if (!q || q.z !== pos.z) { return; }
        ams.push({ x: q.x, y: q.y });
        if (nombres.indexOf(String(c.name || '').toLowerCase()) >= 0 && kitCheb(q.x, q.y, pos.x, pos.y) <= 8) { peligro.push({ x: q.x, y: q.y, n: c.name }); }
      } catch (e) {}
    });
    if (!peligro.length) { return false; }
    function riesgo(x, y) { var r = 0; peligro.forEach(function (m) { r += enOnda(m.x, m.y, x, y); }); return r; }
    var aqui = riesgo(pos.x, pos.y);
    if (!aqui) { return false; }
    var qt = tg ? posDe(tg) : null, dt = (qt && qt.z === pos.z) ? kitCheb(qt.x, qt.y, pos.x, pos.y) : 99;
    var cuerpo = !cfg.cazaKiting && dt <= 1;   // peleando pegado: no me separo del objetivo
    var mejor = null, mejorP = -1e9;
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) { continue; }
        var nx = pos.x + dx, ny = pos.y + dy;
        if (!kitLibre(nx, ny, pos.z, ams)) { continue; }
        var r = riesgo(nx, ny); if (r >= aqui) { continue; }
        var pts = -r * 100;
        if (qt && qt.z === pos.z) {
          var d2 = kitCheb(qt.x, qt.y, nx, ny);
          if (cuerpo && d2 > 1) { continue; }
          if (!cuerpo && d2 > 6) { pts -= 50; }
          if (cfg.cazaKiting) { pts -= Math.abs(d2 - Math.max(2, Number(cfg.cazaKitDist) || 3)) * 5; }
        }
        if (dx && dy) { pts -= 1; }   // a igualdad, mejor paso recto
        if (pts > mejorP) { mejorP = pts; mejor = { x: nx, y: ny }; }
      }
    }
    if (!mejor) { return false; }
    if (autoCaminando()) { pararCaminata(); }
    caminarA(mejor.x, mejor.y, pos.z);
    esqProx = ahora + 650 + Math.random() * 200;
    cazaEstado = 'esquivando la onda de ' + peligro[0].n;
    return true;
  }
  function hacerKiting(pos, ahora, tg) {
    if (ahora < kitProx) { return; }
    var ideal = Math.max(2, Math.min(6, Number(cfg.cazaKitDist) || 3));
    var ams = kitAmenazas(pos);
    if (!ams.length) { return; }
    var dmin = 99; ams.forEach(function (m) { if (m.d < dmin) { dmin = m.d; } });
    var qt = tg ? posDe(tg) : null, dt = (qt && qt.z === pos.z) ? kitCheb(qt.x, qt.y, pos.x, pos.y) : 99;
    var accion = null;
    if (dmin < ideal) { accion = 'alejar'; }
    else if (qt && dt !== 99 && dt > ideal + 1 && dmin > ideal) { accion = 'acercar'; }
    if (!accion) { cazaEstado = 'kiting: a ' + dmin + ' sqm, disparando'; return; }
    var dMon = accion === 'alejar' ? kitMapaMonstruos(pos, ams, 8) : null;
    var aqui = dMon ? ((pos.x + ',' + pos.y) in dMon ? dMon[pos.x + ',' + pos.y] : 20) : 0;
    var mejor = null, mejorP = -1e9;
    for (var i = 0; i < 4; i++) {
      var D = KIT_DIRS[i], nx = pos.x + D[1], ny = pos.y + D[2];
      if (!kitLibre(nx, ny, pos.z, ams)) { continue; }
      var dm = 99; ams.forEach(function (m) { var d2 = kitCheb(m.x, m.y, nx, ny); if (d2 < dm) { dm = d2; } });
      var pts;
      if (accion === 'alejar') {
        var kN = nx + ',' + ny, dmN = (kN in dMon) ? dMon[kN] : 20;
        pts = Math.min(dmN, ideal + 1) * 12 + kitFuturo(nx, ny, pos, ams, dMon, ideal) * 0.6 + kitEspacio(nx, ny, pos.z, ams);
        if (dmN <= 1) { pts -= 60; }
        dm = Math.min(dm, dmN);
      } else {
        var dT = kitCheb(qt.x, qt.y, nx, ny);
        pts = -Math.abs(dT - ideal) * 10 + Math.min(dm, ideal) * 6 + kitEspacio(nx, ny, pos.z, ams);
      }
      if (qt && qt.z === pos.z) {   // no perder de vista al objetivo
        var dT2 = kitCheb(qt.x, qt.y, nx, ny);
        if (dT2 > 6) { pts -= 15; } else { try { if (!lineaVision({ x: nx, y: ny, z: pos.z }, qt.x, qt.y)) { pts -= 6; } } catch (e) {} }
      }
      if (kitUltDir >= 0 && i === (kitUltDir + 2) % 4) { pts -= 8; }   // no ir y venir
      if (kitUltDir >= 0 && i === kitUltDir) { pts += 2; }             // seguir girando
      pts += Math.random() * 1.5;
      if (pts > mejorP) { mejorP = pts; mejor = { i: i, dir: D[0], dm: dm }; }
    }
    if (!mejor) { cazaEstado = 'kiting: acorralado (sin casilla libre)'; kitProx = ahora + 300; return; }
    if (autoCaminando()) { pararCaminata(); }
    moverDir(mejor.dir);
    kitUltDir = mejor.i;
    kitProx = ahora + 450 + Math.random() * 250;
    cazaEstado = 'kiting: ' + (accion === 'alejar' ? 'me alejo' : 'me acerco') + ' (' + dmin + ' sqm)';
  }

  // ---------- Cave hunt: defensa contra jugadores (PK) ----------
  // Detecta SOLO a jugadores que me atacan a mí (nunca a inocentes), cuenta mis supplies y decide:
  // pelear con runas (quitando el PVP Lock solo durante la pelea) o escapar por la ruta. Siempre avisa.
  var defAgresores = {}, defObj = null, defEstado = 'apagada', defUltAtaqueT = 0, defAvisados = {}, defRunaProx = 0, defDecT = 0, defDec = null;
  function defActiva() { return !!(cazaCorriendo && cfg.cazaDefOn); }
  function defAnotar(cr, ahora, motivo) {
    try {
      if (!cr || cr.type !== 0 || cr === window.gameClient.player || esDeLaColmena(cr) || cr.masterId) { return; }
      if (colEntrenamiento(ahora).nombres[String(cr.name || '').toLowerCase()]) { return; }   // compañero de Training
      var nuevo = !defAgresores[cr.id];
      defAgresores[cr.id] = { t: ahora, name: cr.name, motivo: motivo };
      defUltAtaqueT = ahora;
      if (nuevo) { registrar('defensa: ' + cr.name + ' me ataca (' + motivo + ')'); }
    } catch (e) {}
  }
  function defDetectar(pos, ahora) {
    var gc = window.gameClient, yo = gc.player, act = criaturasActivas() || [], pn = performance.now();
    var jug = act.filter(function (c) { return c && c !== yo && c.type === 0 && !esDeLaColmena(c) && vidaDe(c) !== 0; });
    // 1) el servidor confirma que me ataca
    jug.forEach(function (c) { try { if (c.__attackingMeUntil && c.__attackingMeUntil > pn) { defAnotar(c, ahora, 'el servidor confirma que me ataca'); } } catch (e) {} });
    // 2) me dispararon desde su casilla exacta
    var tiros = gc.__lastShotAt;
    if (tiros && typeof tiros.get === 'function') {
      var sh = tiros.get(pos.x + ',' + pos.y + ',' + pos.z);
      if (sh && pn - sh.t < 1500 && sh.from) {
        jug.forEach(function (c) { var q = posDe(c); if (q && q.x === sh.from.x && q.y === sh.from.y && q.z === sh.from.z) { defAnotar(c, ahora, 'me disparó'); } });
      }
    }
    // 3) cuerpo a cuerpo: me sale sangre, hay un jugador con calavera pegado y ningún monstruo pegado
    var g = colGolpes[pos.x + ',' + pos.y + ',' + pos.z];
    if (g && ahora - g.t < 1500 && !monstruosCercanos(pos, 1).length) {
      jug.forEach(function (c) { var q = posDe(c); if (q && q.z === pos.z && Math.max(Math.abs(q.x - pos.x), Math.abs(q.y - pos.y)) <= 1 && Number(c.skull) >= 3) { defAnotar(c, ahora, 'pegado y con calavera'); } });
    }
    Object.keys(colGolpes).forEach(function (k) { if (ahora - colGolpes[k].t > 5000) { delete colGolpes[k]; } });
  }
  // Agresores vivos, en mi piso y a la vista (los que dejaron de atacar hace 15 s se olvidan)
  function defActivos(pos, ahora) {
    var w = window.gameClient.world, res = [];
    Object.keys(defAgresores).forEach(function (id) {
      var a = defAgresores[id];
      if (ahora - a.t > 15000) { delete defAgresores[id]; return; }
      var cr = null; try { cr = w.getCreature(Number(id)); } catch (e) {}
      if (!cr || vidaDe(cr) === 0) { delete defAgresores[id]; return; }
      var q = posDe(cr); if (!q || q.z !== pos.z || Math.abs(q.x - pos.x) > 8 || Math.abs(q.y - pos.y) > 6) { return; }
      res.push(cr);
    });
    return res;
  }
  function defContar(cond) {
    var n = 0;
    contenedores().forEach(function (c) {
      if (!c || !c.slots || esCadaverCont(c)) { return; }
      for (var i = 0; i < c.slots.length; i++) {
        var it = c.slots[i] && c.slots[i].item;
        if (it && it.id && cond(nombreItem(it.id).toLowerCase())) { n += Math.max(1, Number(it.count) || 1); }
      }
    });
    return n;
  }
  function defRunas() {
    var pref = String(cfg.cazaDefRuna || '').trim().toLowerCase();
    return defContar(function (n) {
      if (!/rune$/.test(n)) { return false; }
      if (pref) { return n.indexOf(pref) >= 0; }
      return RUNAS_ATAQUE.some(function (r) { return n.indexOf(r) === 0; });
    });
  }
  function defCuras() {
    var ns = String(cfg.cazaDefCuras || '').split(',').map(function (x) { return x.trim().toLowerCase(); }).filter(Boolean);
    if (!ns.length) { return 0; }
    return defContar(function (n) { return ns.some(function (k) { return n.indexOf(k) >= 0; }); });
  }
  // ¿Pelear o escapar?
  function defDecidir(activos, pct) {
    var runas = defRunas(), curas = defCuras(), n = activos.length, motivo = '';
    if (n > Math.max(1, Number(cfg.cazaDefMaxPK) || 1)) { motivo = n + ' jugadores me atacan'; }
    else if (pct < (Number(cfg.cazaDefHuirHp) || 0)) { motivo = 'mi vida está en ' + Math.round(pct) + '%'; }
    else if (runas < (Number(cfg.cazaDefMinRunas) || 0)) { motivo = 'solo tengo ' + runas + ' runas de ataque'; }
    else if (curas < (Number(cfg.cazaDefMinCuras) || 0)) { motivo = 'solo tengo ' + curas + ' pociones/runas de curación'; }
    // Rematar: si es uno solo y ya casi muere, lo termino aunque algo me falte
    if (motivo && n === 1 && pct >= 25 && (runas > 0 || !(Number(cfg.cazaDefMinRunas) > 0))) {
      var ev = vidaPct(activos[0]);
      if (ev !== null && ev <= 20) { motivo = ''; }
    }
    return { pelear: !motivo, motivo: motivo, runas: runas, curas: curas };
  }
  function defTerminar(motivo) {
    try { var tg = window.gameClient.player.hasTarget() ? window.gameClient.player.getTarget() : null; if (defObj && tg === defObj.cr) { soltarObjetivo(); } } catch (e) {}
    defObj = null;
    colRestaurarLock();
    defEstado = motivo;
    registrar('defensa: ' + motivo);
  }
  function defEscapar(cr, motivo, pos, ahora) {
    if (defObj) { defTerminar('escapando'); }
    var nombre = cr ? cr.name : 'un jugador';
    if (!cazaRetirando || cazaRetiroMotivo.indexOf('PK') !== 0) {
      cazaRetirando = ruta.length > 1; cazaDir = -1; cazaAtqAt = null; cazaAW = null; cazaRetiroMotivo = 'PK ' + nombre;
      alertar('caza', '🏃 ' + nombre + ' me está atacando. Escapo' + (ruta.length > 1 ? ' por la ruta' : '') + ': ' + motivo + '.');
    }
    defEstado = 'escapando de ' + nombre + ' (' + motivo + ')';
  }
  // Devuelve true si la defensa se encarga de este ciclo (pelea en curso)
  function defensaTick(pos, ahora, pct) {
    if (!cfg.cazaDefOn) { if (defObj) { defTerminar('defensa apagada'); } defEstado = 'apagada'; return false; }
    colInstalarGancho();
    defDetectar(pos, ahora);
    var activos = defActivos(pos, ahora), gc = window.gameClient;
    // Escapando: seguir hasta que pasen X s sin ataques y la vida se recupere
    if (cazaRetirando && cazaRetiroMotivo.indexOf('PK') === 0) {
      var calma = Math.max(10, Number(cfg.cazaDefCalmaSeg) || 60) * 1000;
      if (!activos.length && ahora - defUltAtaqueT > calma && pct >= cfg.cazaReanudarPct) {
        cazaRetirando = false; cazaDir = 1; cazaRetiroMotivo = '';
        defEstado = 'a salvo, vuelvo a cazar';
        alertar('caza', '✅ Ya nadie me ataca: vuelvo a cazar.');
        return false;
      }
      if (ruta.length <= 1) {   // sin ruta: alejarme de los PKs y monstruos
        var amen = activos.map(function (c) { var q = posDe(c); return { x: q.x, y: q.y, d: Math.max(Math.abs(q.x - pos.x), Math.abs(q.y - pos.y)) }; }).concat(monstruosCercanos(pos, 8));
        if (amen.length && !autoCaminando()) { var sg = lugarSeguro(pos, amen, ahora); if (sg) { caminarA(sg.x, sg.y, pos.z); } }
        cazaEstado = 'escapando (' + cazaRetiroMotivo + ')';
        return true;
      }
      defEstado = 'escapando (' + cazaRetiroMotivo + ')' + (activos.length ? '' : ' · sin ataques hace ' + Math.round((ahora - defUltAtaqueT) / 1000) + ' s');
      return false;
    }
    if (!activos.length) {
      if (defObj) {
        var cr0 = defObj.cr, v0 = vidaDe(cr0);
        if (v0 === 0) { alertar('caza', '☠ ' + cr0.name + ' (PK) eliminado. Sigo cazando.'); defTerminar('PK ' + cr0.name + ' eliminado'); }
        else { alertar('caza', '✅ ' + cr0.name + ' dejó de atacar o se fue. Sigo cazando.'); defTerminar(cr0.name + ' dejó de atacar'); }
      } else { defEstado = 'vigilando'; }
      return false;
    }
    // Decidir (cada segundo)
    if (!defDec || ahora - defDecT > 1000) { defDecT = ahora; defDec = defDecidir(activos, pct); }
    var cr = (defObj && activos.indexOf(defObj.cr) >= 0) ? defObj.cr : activos.slice().sort(function (a, b) {
      var qa = posDe(a), qb = posDe(b);
      return Math.max(Math.abs(qa.x - pos.x), Math.abs(qa.y - pos.y)) - Math.max(Math.abs(qb.x - pos.x), Math.abs(qb.y - pos.y));
    })[0];
    if (!defDec.pelear) { defEscapar(cr, defDec.motivo, pos, ahora); return false; }
    // Pelear
    if (!defObj || defObj.cr !== cr) {
      if (defObj) { colRestaurarLock(); }
      defObj = { cr: cr, desde: ahora, fijarT: 0, lockT: 0 };
      defRunaProx = ahora + (cfg.colHumano ? Math.round(colAzar(300, 1200)) : 0);
      cazaAW = null; pararCaminata();
      if (!defAvisados[cr.id] || ahora - defAvisados[cr.id] > 60000) {
        defAvisados[cr.id] = ahora;
        var ag = defAgresores[cr.id];
        alertar('caza', '⚔ ' + cr.name + ' me ataca' + (ag && ag.motivo ? ' (' + ag.motivo + ')' : '') + '. Me defiendo: ' + defDec.runas + ' runas, ' + defDec.curas + ' curaciones, vida ' + Math.round(pct) + '%.');
      }
    }
    var q = posDe(cr), visible = q && q.z === pos.z && Math.abs(q.x - pos.x) <= 7 && Math.abs(q.y - pos.y) <= 5;
    // PVP Lock: quitarlo solo durante la pelea (se vuelve a poner al terminar)
    if (pvpLockPuesto()) {
      if (!cfg.cazaDefQuitarLock) { defEscapar(cr, 'tengo el PVP Lock puesto y no lo puedo quitar', pos, ahora); return false; }
      if (ahora - defObj.lockT > 1500) {
        defObj.lockT = ahora;
        try { pvpLockBtn().click(); colLockQuitado = true; localStorage.setItem(KEY_COL_LOCK + '::' + (charActual || ''), '1'); registrar('defensa: PVP Lock quitado para defenderme'); } catch (e) {}
      }
      defEstado = 'quitando el PVP Lock para defenderme de ' + cr.name;
      cazaEstado = defEstado;
      return true;
    }
    var tg = null; try { tg = gc.player.hasTarget() ? gc.player.getTarget() : null; } catch (e) {}
    if (tg !== cr && visible && ahora - defObj.fijarT > 2500) { defObj.fijarT = ahora; fijarObjetivo(cr); }
    var hm = hotbarMgr();
    var listo = !hm || !((hm.__runeAttackUntil || 0) > performance.now() || (hm.__runeAttackGlobalUntil || 0) > performance.now());
    var porCasilla = tg !== cr && ahora - defObj.desde > 2500;
    if ((tg === cr || porCasilla) && visible && listo && ahora >= defRunaProx && lineaVision(pos, q.x, q.y)) {
      var rn = colBuscarRuna(cfg.cazaDefRuna || '');
      if (rn) {
        try {
          if (!porCasilla && hm && typeof hm.__useItemOnTarget === 'function') { hm.__useItemOnTarget({ which: rn.which, index: rn.index }, rn.item); }
          else { gc.mouse.__handleItemUseWith({ which: rn.which, index: rn.index }, { which: gc.world.getTileFromWorldPosition(posObj(q.x, q.y, q.z)), index: 255 }); }
          defRunaProx = ahora + colIntervaloRuna();
        } catch (e) { registrar('defensa runa: ' + e.message); }
      }
    }
    var vp = vidaPct(cr);
    defEstado = 'peleando con ' + cr.name + (vp !== null ? ' (' + Math.round(vp) + '%)' : '') + ' · runas ' + defDec.runas + ' · curaciones ' + defDec.curas;
    cazaEstado = defEstado;
    return true;
  }

  // ---------- Macros: reglas "si ... entonces ..." que escribe el usuario ----------
  // Lenguaje propio (no JavaScript): solo puede leer el estado del juego y hacer acciones seguras del juego.
  var macroReglas = [], macroErrores = [], macroCompilado = null, macroEstado = 'apagados', macroPausas = {}, macroUlt = null, macroSnap = null;
  function macroPausado(que) { var a = Date.now(); return !!((macroPausas[que] && macroPausas[que] > a) || (macroPausas.todo && macroPausas.todo > a)); }
  function macroNorm(w) { try { return w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) { return w.toLowerCase(); } }
  function macroTokens(linea) {
    var s = linea.replace(/[“”]/g, '"').replace(/[‘’]/g, "'"), t = [], i = 0, m;
    while (i < s.length) {
      var c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === '"' || c === "'") {
        var j = s.indexOf(c, i + 1);
        if (j < 0) { throw new Error('falta cerrar las comillas'); }
        t.push({ k: 'str', v: s.slice(i + 1, j) }); i = j + 1; continue;
      }
      if ((m = s.slice(i).match(/^(\d+(?:[.,]\d+)?)\s*(%|ms|seg|s)?(?![A-Za-zÀ-ÿ])/))) {
        var v = Number(m[1].replace(',', '.'));
        if (m[2] === 'ms') { v = v / 1000; }
        t.push({ k: 'num', v: v }); i += m[0].length; continue;
      }
      if ((m = s.slice(i).match(/^(>=|<=|==|!=|=>|=<|=|>|<|\(|\)|,|;)/))) {
        var op = m[1] === '=' ? '==' : (m[1] === '=>' ? '>=' : (m[1] === '=<' ? '<=' : m[1]));
        t.push({ k: 'op', v: op }); i += m[1].length; continue;
      }
      if ((m = s.slice(i).match(/^[A-Za-zÀ-ÿ_][A-Za-zÀ-ÿ_0-9]*/))) { t.push({ k: 'w', v: macroNorm(m[0]) }); i += m[0].length; continue; }
      throw new Error('no entiendo «' + c + '»');
    }
    return t;
  }
  var MACRO_VARS = {
    vida: 'vida', hp: 'vida', health: 'vida', mana: 'mana', mp: 'mana',
    vidareal: 'vidareal', realhp: 'vidareal', manareal: 'manareal', realmana: 'manareal', cap: 'cap',
    monstruos: 'monstruos', monsters: 'monstruos', cerca: 'cerca', adjacent: 'cerca',
    jugadores: 'jugadores', players: 'jugadores', calaveras: 'calaveras', skulls: 'calaveras',
    objetivo: 'objetivo', target: 'objetivo', vidaobjetivo: 'vidaobjetivo', targethp: 'vidaobjetivo', pz: 'pz'
  };
  var MACRO_FNS = { monstruo: 'monstruo', monster: 'monstruo', jugador: 'jugador', player: 'jugador', cuenta: 'cuenta', count: 'cuenta', items: 'cuenta' };
  var MACRO_ACC = {
    decir: 'decir', say: 'decir', tecla: 'tecla', key: 'tecla', runa: 'runa', rune: 'runa', usar: 'usar', use: 'usar',
    avisar: 'avisar', alert: 'avisar', atacar: 'atacar', attack: 'atacar', soltar: 'soltar', release: 'soltar',
    pausar: 'pausar', pause: 'pausar', parar: 'parar', stop: 'parar'
  };
  var MACRO_PAUSAS = { caza: 'caza', cavehunt: 'caza', hunt: 'caza', runeo: 'runeo', runas: 'runeo', runes: 'runeo', training: 'training', todo: 'todo', all: 'todo' };
  function macroCompilarLinea(linea) {
    var t = macroTokens(linea), i = 0;
    function ver() { return t[i]; }
    function es(k, vs) { var x = t[i]; return !!x && x.k === k && (vs === undefined || (Array.isArray(vs) ? vs.indexOf(x.v) >= 0 : x.v === vs)); }
    function exigir(k, vs, msg) { if (!es(k, vs)) { throw new Error(msg); } return t[i++]; }
    exigir('w', ['si', 'if'], 'cada regla empieza con «si»');
    function valor() {
      var x = ver();
      if (!x) { throw new Error('falta algo después de la condición'); }
      if (x.k === 'num') { i++; return { k: 'num', v: x.v }; }
      if (x.k === 'op' && x.v === '(') { throw new Error('los paréntesis solo van en monstruo("..."), jugador("...") y cuenta("...")'); }
      if (x.k === 'w' && MACRO_FNS[x.v]) {
        i++;
        var conPar = es('op', '(');
        if (conPar) { i++; }
        var a = exigir('str', undefined, x.v + ' necesita un nombre entre comillas, por ejemplo ' + x.v + '("dragon")');
        if (conPar) { exigir('op', ')', 'falta cerrar el paréntesis'); }
        return { k: 'fn', n: MACRO_FNS[x.v], a: macroNorm(a.v) };
      }
      if (x.k === 'w' && MACRO_VARS[x.v]) { i++; return { k: 'var', n: MACRO_VARS[x.v] }; }
      if (x.k === 'w' && ['entonces', 'then', 'y', 'and', 'o', 'or'].indexOf(x.v) >= 0) { throw new Error('falta un número o una condición antes de «' + x.v + '»'); }
      throw new Error('no conozco «' + (x.v) + '» (mira la lista de la ayuda)');
    }
    function comparacion() {
      if (es('w', ['no', 'not'])) { i++; return { o: 'no', a: comparacion() }; }
      var l = valor();
      if (es('op', ['>', '<', '>=', '<=', '==', '!='])) { var op = t[i++].v; return { o: 'cmp', op: op, l: l, r: valor() }; }
      return { o: 'val', a: l };
    }
    function conj() { var a = [comparacion()]; while (es('w', ['y', 'and'])) { i++; a.push(comparacion()); } return a.length === 1 ? a[0] : { o: 'y', a: a }; }
    function disj() { var a = [conj()]; while (es('w', ['o', 'or'])) { i++; a.push(conj()); } return a.length === 1 ? a[0] : { o: 'o', a: a }; }
    var cond = disj();
    exigir('w', ['entonces', 'then'], 'después de la condición va «entonces»');
    var acciones = [], cada = null;
    while (i < t.length) {
      if (es('w', ['cada', 'every'])) {
        i++; var nn = exigir('num', undefined, 'después de «cada» va un tiempo, por ejemplo: cada 2s');
        cada = Math.max(0.5, nn.v);
        if (es('w', ['s', 'seg', 'segundos', 'seconds'])) { i++; }
        if (i < t.length) { throw new Error('«cada» va al final de la regla'); }
        break;
      }
      var w = exigir('w', undefined, 'falta una acción (decir, runa, usar, tecla, avisar, atacar, soltar, pausar, parar)');
      var a = MACRO_ACC[w.v];
      if (!a) { throw new Error('no conozco la acción «' + w.v + '»'); }
      var ac = { a: a };
      if (a === 'decir' || a === 'avisar') { ac.txt = exigir('str', undefined, a + ' necesita un texto entre comillas').v; }
      else if (a === 'tecla') {
        var k = ver();
        if (k && (k.k === 'str' || k.k === 'w' || k.k === 'num')) { i++; ac.tecla = String(k.k === 'num' ? k.v : k.v).toUpperCase(); } else { throw new Error('tecla necesita cuál: F1, F2... o el número de casilla'); }
      } else if (a === 'runa' || a === 'usar') {
        ac.nombre = macroNorm(exigir('str', undefined, a + ' necesita el nombre entre comillas, por ejemplo ' + a + ' "great fireball"').v);
        ac.en = a === 'runa' ? 'objetivo' : '';
        if (es('w', ['en', 'on'])) {
          i++; var d = exigir('w', undefined, 'después de «en» va «objetivo» o «mi»').v;
          if (['objetivo', 'target'].indexOf(d) >= 0) { ac.en = 'objetivo'; }
          else if (['mi', 'me', 'yo', 'self'].indexOf(d) >= 0) { ac.en = 'mi'; }
          else { throw new Error('después de «en» va «objetivo» o «mi»'); }
        }
      } else if (a === 'atacar') { if (es('str')) { ac.nombre = macroNorm(t[i++].v); } }
      else if (a === 'pausar') {
        var q = exigir('w', undefined, 'pausar necesita qué: caza, runeo, training o todo').v;
        if (!MACRO_PAUSAS[q]) { throw new Error('pausar solo acepta: caza, runeo, training o todo'); }
        ac.que = MACRO_PAUSAS[q];
      }
      acciones.push(ac);
      if (es('w', ['y', 'and']) || es('op', [',', ';'])) { i++; continue; }
      if (i < t.length && !es('w', ['cada', 'every'])) { throw new Error('separa las acciones con «y»'); }
    }
    if (!acciones.length) { throw new Error('falta una acción después de «entonces»'); }
    if (cada === null) { cada = acciones.some(function (x) { return x.a === 'avisar'; }) ? 30 : 1; }
    return { cond: cond, acciones: acciones, cada: cada, prox: 0 };
  }
  function macroCompilar(texto) {
    var reglas = [], errores = [];
    String(texto || '').split('\n').forEach(function (l, n) {
      var lim = l.replace(/(^|\s)(#|\/\/).*$/, '').trim();
      if (!lim) { return; }
      try { var r = macroCompilarLinea(lim); r.linea = n + 1; r.texto = lim; reglas.push(r); }
      catch (e) { errores.push('Línea ' + (n + 1) + ': ' + e.message); }
    });
    if (reglas.length > 60) { errores.push('Máximo 60 reglas.'); reglas = reglas.slice(0, 60); }
    return { reglas: reglas, errores: errores };
  }
  // Instrucciones para pegar en ChatGPT / Gemini / Claude: explican el lenguaje y piden solo las reglas
  var MACRO_IA_ES = "Eres un experto en \"Minibia Helper\", un bot para el juego Minibia (como Tibia 7.x). Tu trabajo es convertir lo que pido en REGLAS DE MACRO usando EXACTAMENTE este lenguaje (NO es JavaScript ni Lua).\n\nFORMA (una regla por línea):\nsi <condición> entonces <acción> [y <acción>] [cada <N>s]\n\n- Une condiciones con \"y\" / \"o\" y niega con \"no\". Compara con > < >= <= == !=\n- Los números van sin \"%\" (vida < 50 = 50 %).\n- Los textos y nombres van SIEMPRE entre comillas dobles.\n- Las líneas que empiezan con # son notas.\n- Las reglas se revisan de arriba hacia abajo 4 veces por segundo.\n- \"parar\" hace que NO se revisen las reglas de abajo: pon arriba lo más importante (avisos y curarse).\n- \"cada 2s\" = cada cuánto se puede repetir esa regla (si no lo pones: 1 s; con avisar: 30 s). Mínimo 0.5s. Va al FINAL de la regla.\n\nCONDICIONES (todas son números):\nvida, mana ............ mi vida y maná en %\nvidareal, manareal .... mi vida y maná en puntos\ncap ................... mi capacidad\nmonstruos ............. monstruos en pantalla (mi piso)\ncerca ................. monstruos pegados a mí\njugadores ............. otros jugadores en pantalla (sin contar mi party)\ncalaveras ............. jugadores con calavera en pantalla\nobjetivo .............. 1 si tengo objetivo, 0 si no\nvidaobjetivo .......... vida de mi objetivo en %\npz .................... 1 si estoy en protection zone\nmonstruo(\"dragon\") .... cuántos de ese monstruo veo\njugador(\"Nombre\") ..... 1 si veo a ese jugador\ncuenta(\"ultimate\") .... cuántos de ese objeto tengo en las mochilas abiertas\n\nACCIONES:\ndecir \"exura\" ..................... dice el texto (hechizos)\nruna \"sudden death\" en objetivo ... tira la runa a mi objetivo\nruna \"ultimate healing\" en mi ..... usa la runa en mí\nusar \"mana fluid\" en mi ........... usa un objeto en mí\nusar \"ham\" ........................ usa un objeto (por ejemplo comer)\ntecla F3 .......................... pulsa esa casilla del hotbar (F1 a F12)\natacar ............................ ataca al monstruo más cercano\natacar \"rat\" ...................... ataca solo a ese monstruo\nsoltar ............................ suelta mi objetivo\navisar \"texto\" .................... me avisa (también al celular)\npausar caza / pausar runeo / pausar training / pausar todo ... pausa esa función mientras se cumpla\nparar ............................. no revisa las reglas de abajo\n\nLos nombres de runas y objetos van como en el juego (en inglés): \"sudden death\", \"heavy magic missile\", \"great fireball\", \"explosion\", \"fireball\", \"light magic missile\", \"ultimate healing\", \"intense healing\", \"mana fluid\"...\n\nEJEMPLO DE RESPUESTA:\n```\n# Si hay un PK cerca, pauso la caza y te aviso\nsi calaveras > 0 entonces pausar caza y avisar \"PK cerca\"\n# Si hay jugadores, no hago nada de lo de abajo (para no sacar calavera)\nsi jugadores > 0 entonces parar\n# Vida baja: UH en mí\nsi vida < 50 entonces runa \"ultimate healing\" en mi cada 1s\n# 3 o más monstruos: great fireball a mi objetivo\nsi monstruos >= 3 y objetivo entonces runa \"great fireball\" en objetivo cada 2s\n```\n\nCÓMO DEBES RESPONDER:\n1. Responde SOLO con un bloque de código con las reglas. Encima de cada regla pon una nota # que la explique en español sencillo.\n2. Usa SOLO las condiciones y acciones de la lista. No inventes otras.\n3. Si algo de lo que pido no se puede hacer con esta lista, escríbelo como nota # diciendo que no se puede.\n4. Si te falta un dato (qué runa, qué hechizo, mi vocación), usa algo razonable y dilo en una nota #.";
  var MACRO_IA_EN = "You are an expert in \"Minibia Helper\", a bot for the game Minibia (like Tibia 7.x). Your job is to turn what I ask into MACRO RULES using EXACTLY this language (it is NOT JavaScript or Lua).\n\nFORM (one rule per line):\nif <condition> then <action> [and <action>] [every <N>s]\n\n- Join conditions with \"and\" / \"or\" and negate with \"not\". Compare with > < >= <= == !=\n- Numbers go without \"%\" (hp < 50 = 50%).\n- Texts and names ALWAYS go in double quotes.\n- Lines starting with # are notes.\n- Rules are checked from top to bottom 4 times per second.\n- \"stop\" skips the rules below: put the most important ones (alerts and healing) at the top.\n- \"every 2s\" = how often that rule can repeat (default 1 s; with alert: 30 s). Minimum 0.5s. It goes at the END of the rule.\n\nCONDITIONS (all are numbers):\nhp, mana .............. my health and mana in %\nrealhp, realmana ...... my health and mana in points\ncap ................... my capacity\nmonsters .............. monsters on screen (my floor)\nadjacent .............. monsters next to me\nplayers ............... other players on screen (not my party)\nskulls ................ players with a skull on screen\ntarget ................ 1 if I have a target, 0 if not\ntargethp .............. my target health in %\npz .................... 1 if I am in a protection zone\nmonster(\"dragon\") ..... how many of that monster I see\nplayer(\"Name\") ........ 1 if I see that player\ncount(\"ultimate\") ..... how many of that item I have in open backpacks\n\nACTIONS:\nsay \"exura\" ...................... says the text (spells)\nrune \"sudden death\" on target .... throws the rune at my target\nrune \"ultimate healing\" on me .... uses the rune on me\nuse \"mana fluid\" on me ........... uses an item on me\nuse \"ham\" ........................ uses an item (e.g. eat)\nkey F3 ........................... presses that hotbar slot (F1 to F12)\nattack ........................... attacks the nearest monster\nattack \"rat\" ..................... attacks only that monster\nrelease .......................... releases my target\nalert \"text\" ..................... alerts me (also on my phone)\npause hunt / pause runes / pause training / pause all ... pauses that feature while true\nstop ............................. skips the rules below\n\nRune and item names go as in the game: \"sudden death\", \"heavy magic missile\", \"great fireball\", \"explosion\", \"fireball\", \"light magic missile\", \"ultimate healing\", \"intense healing\", \"mana fluid\"...\n\nEXAMPLE ANSWER:\n```\n# If a PK is near, pause the hunt and alert me\nif skulls > 0 then pause hunt and alert \"PK nearby\"\n# If players are around, skip the rules below (to avoid a skull)\nif players > 0 then stop\n# Low health: UH on me\nif hp < 50 then rune \"ultimate healing\" on me every 1s\n# 3 or more monsters: great fireball at my target\nif monsters >= 3 and target then rune \"great fireball\" on target every 2s\n```\n\nHOW YOU MUST ANSWER:\n1. Answer ONLY with a code block with the rules. Above each rule put a # note explaining it in plain words.\n2. Use ONLY the conditions and actions in the list. Do not invent others.\n3. If something I ask cannot be done with this list, write it as a # note saying so.\n4. If some data is missing (which rune, which spell, my vocation), use something reasonable and say it in a # note.";
  function macroPromptIA(meta, reglas, errores) {
    var en = IDIOMA === 'en', t = en ? MACRO_IA_EN : MACRO_IA_ES;
    if (errores && errores.length) {
      t += en ? '\n\nI already have these rules, but Minibia Helper found errors in them:\n' : '\n\nYa tengo estas reglas, pero Minibia Helper encontró errores:\n';
      t += errores.map(function (e) { return '- ' + trTexto(e); }).join('\n');
      t += '\n\n```\n' + String(reglas || '').trim() + '\n```\n\n';
      t += en ? 'Fix them and answer ONLY with the complete corrected code block.' : 'Corrígelas y responde SOLO con el bloque de código completo ya corregido.';
      if (meta) { t += (en ? '\n\nWhat I want my character to do:\n' : '\n\nLo que quiero que haga mi personaje:\n') + meta; }
      return t;
    }
    return t + (en ? '\n\nWHAT I WANT MY CHARACTER TO DO:\n' : '\n\nLO QUE QUIERO QUE HAGA MI PERSONAJE:\n') + meta;
  }
  // Foto del juego en este momento (se calcula una vez por ciclo)
  function macroFoto() {
    var gc = window.gameClient, yo = gc.player, pos = posJug(), ahora = Date.now();
    var hp = leerBarra('health-bar'), mp = leerBarra('mana-bar');
    var act = (criaturasActivas() || []).filter(function (c) { return c && c !== yo && vidaDe(c) !== 0 && !c.masterId; });
    var vis = act.filter(function (c) { var q = posDe(c); return pos && q && q.z === pos.z && Math.abs(q.x - pos.x) <= 7 && Math.abs(q.y - pos.y) <= 5; });
    var mons = vis.filter(function (c) { return c.type === 1; });
    var jug = vis.filter(function (c) { return c.type === 0 && !esDeLaColmena(c); });
    var tg = null; try { tg = yo.hasTarget() ? yo.getTarget() : null; } catch (e) {}
    var pz = false; try { pz = estaEnPZ(ahora); } catch (e) {}
    return {
      pos: pos, mons: mons, jug: jug,
      v: {
        vida: hp && hp.max > 0 ? hp.actual * 100 / hp.max : 100, mana: mp && mp.max > 0 ? mp.actual * 100 / mp.max : 0,
        vidareal: hp ? hp.actual : 0, manareal: mp ? mp.actual : 0, cap: (function () { var c = leerCap(); return c === null ? 0 : c; })(),
        monstruos: mons.length,
        cerca: mons.filter(function (c) { var q = posDe(c); return Math.max(Math.abs(q.x - pos.x), Math.abs(q.y - pos.y)) <= 1; }).length,
        jugadores: jug.length, calaveras: jug.filter(function (c) { return Number(c.skull) >= 3; }).length,
        objetivo: tg && vidaDe(tg) !== 0 ? 1 : 0, vidaobjetivo: tg ? (vidaPct(tg) || 0) : 0, pz: pz ? 1 : 0
      },
      tg: tg
    };
  }
  function macroValor(x, F) {
    if (x.k === 'num') { return x.v; }
    if (x.k === 'var') { return F.v[x.n]; }
    if (x.n === 'monstruo') { return F.mons.filter(function (c) { return macroNorm(String(c.name || '')).indexOf(x.a) >= 0; }).length; }
    if (x.n === 'jugador') { return F.jug.filter(function (c) { return macroNorm(String(c.name || '')) === x.a; }).length; }
    if (x.n === 'cuenta') { return defContar(function (n) { return macroNorm(n).indexOf(x.a) >= 0; }); }
    return 0;
  }
  function macroEval(c, F) {
    if (c.o === 'y') { return c.a.every(function (z) { return macroEval(z, F); }); }
    if (c.o === 'o') { return c.a.some(function (z) { return macroEval(z, F); }); }
    if (c.o === 'no') { return !macroEval(c.a, F); }
    if (c.o === 'val') { return !!macroValor(c.a, F); }
    var l = macroValor(c.l, F), r = macroValor(c.r, F);
    switch (c.op) { case '>': return l > r; case '<': return l < r; case '>=': return l >= r; case '<=': return l <= r; case '==': return l === r; case '!=': return l !== r; }
    return false;
  }
  function macroBuscarItem(nombre) {
    var cs = contenedores();
    for (var c = 0; c < cs.length; c++) {
      if (!cs[c] || !cs[c].slots || esCadaverCont(cs[c])) { continue; }
      for (var i = 0; i < cs[c].slots.length; i++) {
        var it = cs[c].slots[i] && cs[c].slots[i].item;
        if (it && it.id && macroNorm(nombreItem(it.id)).indexOf(nombre) >= 0) { return { which: cs[c], index: i, item: it }; }
      }
    }
    return null;
  }
  // Ejecuta una acción; devuelve false si no se pudo (no gasta el «cada»)
  function macroHacer(ac, F) {
    var gc = window.gameClient;
    if (ac.a === 'decir') { decir(ac.txt, metodo); return true; }
    if (ac.a === 'tecla') { pulsarTecla(ac.tecla); return true; }
    if (ac.a === 'avisar') { alertar('macro', '🧩 ' + ac.txt); return true; }
    if (ac.a === 'soltar') { soltarObjetivo(); return true; }
    if (ac.a === 'atacar') {
      if (F.v.objetivo) { return true; }
      var cand = F.mons.filter(function (c) { return !ac.nombre || macroNorm(String(c.name || '')).indexOf(ac.nombre) >= 0; });
      if (!cand.length) { return false; }
      cand.sort(function (a, b) { var qa = posDe(a), qb = posDe(b); return Math.max(Math.abs(qa.x - F.pos.x), Math.abs(qa.y - F.pos.y)) - Math.max(Math.abs(qb.x - F.pos.x), Math.abs(qb.y - F.pos.y)); });
      fijarObjetivo(cand[0]); return true;
    }
    if (ac.a === 'runa' || ac.a === 'usar') {
      var src = macroBuscarItem(ac.nombre);
      if (!src) { macroEstado = 'no tengo «' + ac.nombre + '» en las mochilas abiertas'; return false; }
      var hm = hotbarMgr();
      if (ac.a === 'runa') {
        var listo = !hm || !((hm.__runeAttackUntil || 0) > performance.now() || (hm.__runeAttackGlobalUntil || 0) > performance.now());
        if (!listo) { return false; }
      }
      if (ac.en === 'mi') {
        gc.mouse.__handleItemUseWith({ which: src.which, index: src.index }, { which: gc.world.getTileFromWorldPosition(posObj(F.pos.x, F.pos.y, F.pos.z)), index: 255 });
        return true;
      }
      if (ac.en === 'objetivo') {
        if (!F.tg || vidaDe(F.tg) === 0) { return false; }
        if (hm && typeof hm.__useItemOnTarget === 'function') { hm.__useItemOnTarget({ which: src.which, index: src.index }, src.item); return true; }
        var q = posDe(F.tg);
        gc.mouse.__handleItemUseWith({ which: src.which, index: src.index }, { which: gc.world.getTileFromWorldPosition(posObj(q.x, q.y, q.z)), index: 255 });
        return true;
      }
      gc.mouse.use({ which: src.which, index: src.index }); return true;
    }
    return false;
  }
  function macroLoop() {
    try {
      if (!cfg.macroOn) { macroEstado = 'apagados'; macroPausas = {}; return; }
      if (betaBloqueo()) { macroEstado = 'tu licencia no incluye Macros'; return; }
      if (macroCompilado !== cfg.macroTexto) { var cc = macroCompilar(cfg.macroTexto); macroReglas = cc.reglas; macroErrores = cc.errores; macroCompilado = cfg.macroTexto; }
      if (pausaGM) { macroEstado = 'en pausa (GM)'; return; }
      var gc = window.gameClient; if (!gc || !gc.player || !charActual || !posJug()) { return; }
      if (!macroReglas.length) { macroEstado = macroErrores.length ? 'hay errores en tus reglas' : 'sin reglas'; return; }
      var F = macroFoto(), ahora = Date.now();
      for (var r = 0; r < macroReglas.length; r++) {
        var R = macroReglas[r];
        if (!macroEval(R.cond, F)) { continue; }
        var paro = false, hizo = false, puede = ahora >= R.prox;
        for (var k = 0; k < R.acciones.length; k++) {
          var ac = R.acciones[k];
          if (ac.a === 'parar') { paro = true; continue; }
          if (ac.a === 'pausar') { macroPausas[ac.que] = ahora + 1500; hizo = true; continue; }
          if (!puede) { continue; }
          try { if (macroHacer(ac, F)) { hizo = true; } } catch (e) { registrar('macro línea ' + R.linea + ': ' + e.message); }
        }
        if (hizo && puede && R.acciones.some(function (x) { return x.a !== 'pausar' && x.a !== 'parar'; })) {
          R.prox = ahora + R.cada * 1000 * (1 + Math.random() * 0.25);   // un poco de azar para que no sea exacto
          macroUlt = { linea: R.linea, t: ahora };
        }
        if (paro) { macroEstado = 'línea ' + R.linea + ': parar'; break; }
      }
      if (!macroEstado || macroEstado.indexOf('no tengo') !== 0 || ahora - (macroUlt ? macroUlt.t : 0) < 5000) {
        macroEstado = macroReglas.length + ' reglas' + (macroUlt ? ' · última: línea ' + macroUlt.linea + ' hace ' + Math.round((ahora - macroUlt.t) / 1000) + ' s' : '');
      }
    } catch (e) { registrar('macros: ' + e.message); }
  }

  // ---------- Colmena hunt: cazar en party (solo Founder) ----------
  // El líder caza con su ruta del Cave hunt y publica (en el navegador) sus huellas, su objetivo y su vida.
  // Los seguidores pisan por donde pasó (incluidos hoyos, rope y escaleras), atacan su mismo objetivo y curan.
  var KEY_CH = 'minibiaHelperCH::', KEY_CHF = 'minibiaHelperCHf::';
  var chHuellas = [], chEstado = 'apagada', chUltPub = 0, chRunaProx = 0, chCuraProx = 0, chCaminarT = 0, chPisoT = 0, chPisoIntentos = 0, chPisoZ = null, chAvisos = {}, chEsperando = '';
  function chActiva() { return !!(cfg.chOn && !colmenaBloqueo()); }
  function chLeer(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function chMiVida() { var hp = leerBarra('health-bar'); return hp && hp.max > 0 ? Math.round(hp.actual * 100 / hp.max) : null; }
  function chNombreLider() {
    var n = String(cfg.chLider || '').trim();
    if (n) { return n; }
    try {   // vacío: el líder de mi party (escudo de líder) que vea en pantalla
      var yo = window.gameClient.player, act = criaturasActivas() || [];
      var l = act.filter(function (c) { return c && c !== yo && c.type === 0 && Number(c.shield) === 1; })[0];
      if (l) { return l.name; }
    } catch (e) {}
    return '';
  }
  // Próximos puntos que va a pisar el líder (para que los seguidores no le estorben en pasillos)
  function chProxPuntos() {
    var res = [];
    if (!cazaCorriendo || !ruta || ruta.length < 2) { return res; }
    if (cazaAW) { res.push([cazaAW.x, cazaAW.y, cazaAW.z]); }
    for (var s2 = 0; s2 < 8; s2++) { var r = ruta[cazaIdx + s2 * cazaDir]; if (r) { res.push([r[0], r[1], r[2]]); } }
    return res;
  }
  function chPublicarLider(pos, ahora) {
    var u = chHuellas[chHuellas.length - 1];
    if (!u || u[0] !== pos.x || u[1] !== pos.y || u[2] !== pos.z) { chHuellas.push([pos.x, pos.y, pos.z]); if (chHuellas.length > 300) { chHuellas.shift(); } }
    if (ahora - chUltPub < 250) { return; }
    chUltPub = ahora;
    var tg = null; try { tg = window.gameClient.player.hasTarget() ? window.gameClient.player.getTarget() : null; } catch (e) {}
    try {
      localStorage.setItem(KEY_CH + String(charActual).toLowerCase(), JSON.stringify({
        name: charActual, t: ahora, pos: pos, vida: chMiVida(), cazando: cazaCorriendo,
        objetivo: tg && vidaDe(tg) !== 0 ? { id: tg.id, name: tg.name } : null, huellas: chHuellas, camino: chProxPuntos()
      }));
    } catch (e) {}
  }
  function chPublicarSeguidor(pos, ahora, lider) {
    if (ahora - chUltPub < 250) { return; }
    chUltPub = ahora;
    var mp = leerBarra('mana-bar');
    try { localStorage.setItem(KEY_CHF + String(charActual).toLowerCase(), JSON.stringify({ name: charActual, t: ahora, pos: pos, vida: chMiVida(), mana: mp && mp.max > 0 ? Math.round(mp.actual * 100 / mp.max) : null, lider: String(lider || '').toLowerCase() })); } catch (e) {}
  }
  // Seguidores activos de este líder (los que dieron señal en los últimos 5 s)
  function chSeguidores(ahora) {
    var res = [], yo = String(charActual || '').toLowerCase();
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || k.indexOf(KEY_CHF) !== 0) { continue; }
        var f = chLeer(k);
        if (f && f.lider === yo && ahora - f.t < 5000) { res.push(f); }
        else if (f && f.lider === yo && ahora - f.t < 60000 && !chAvisos['mudo:' + f.name]) {
          chAvisos['mudo:' + f.name] = ahora;
          alertar('caza', '⚠ Colmena hunt: ' + f.name + ' dejó de responder (¿se desconectó o murió?). Sigo sin esperarlo.');
        }
      }
    } catch (e) {}
    return res;
  }
  // Líder: ¿espero a algún seguidor? (se llama antes de caminar la ruta)
  function chLiderEspera(pos, ahora) {
    chEsperando = '';
    if (!chActiva() || cfg.chRol !== 'lider' || !cfg.chEsperar || cazaRetirando) { return false; }
    var cam = chProxPuntos();
    var lejos = chSeguidores(ahora).filter(function (f) {
      var q = f.pos; if (!q) { return false; }
      // se adelantó por mi camino (p. ej. subió primero para abrirme paso): no lo espero, voy hacia él
      if (cam.some(function (c) { return c[2] === q.z && (q.z !== pos.z || Math.max(Math.abs(c[0] - q.x), Math.abs(c[1] - q.y)) <= 1); })) { return false; }
      var d = q.z !== pos.z ? 99 : Math.max(Math.abs(q.x - pos.x), Math.abs(q.y - pos.y));
      return d > Math.max(2, Number(cfg.chEsperaDist) || 5) || (f.vida !== null && f.vida < 40);
    });
    if (!lejos.length) { return false; }
    chEsperando = lejos.map(function (f) { return f.name; }).join(', ');
    if (autoCaminando()) { pararCaminata(); }
    cazaAW = null;
    cazaEstado = 'esperando a ' + chEsperando;
    return true;
  }
  function chCurar(lider, ahora) {
    if (!cfg.chCurar || ahora < chCuraProx) { return false; }
    var lim = Number(cfg.chCurarPct) || 70, yo = window.gameClient.player, pos = posJug();
    var cands = [];
    var act = criaturasActivas() || [];
    // compañeros: el líder y los demás seguidores del mismo líder
    var nombres = {};
    if (lider) { nombres[String(lider.name).toLowerCase()] = lider.vida; }
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i); if (!k || k.indexOf(KEY_CHF) !== 0) { continue; }
        var f = chLeer(k); if (f && lider && f.lider === String(lider.name).toLowerCase() && ahora - f.t < 5000 && f.name !== charActual) { nombres[String(f.name).toLowerCase()] = f.vida; }
      }
    } catch (e) {}
    act.forEach(function (c) {
      if (!c || c === yo || c.type !== 0) { return; }
      var n = String(c.name || '').toLowerCase(); if (!(n in nombres)) { return; }
      var q = posDe(c); if (!q || q.z !== pos.z || Math.abs(q.x - pos.x) > 7 || Math.abs(q.y - pos.y) > 5) { return; }
      var v = nombres[n] !== null && nombres[n] !== undefined ? nombres[n] : vidaPct(c);
      if (v !== null && v < lim && vidaDe(c) !== 0) { cands.push({ c: c, v: v, q: q }); }
    });
    if (!cands.length) { return false; }
    cands.sort(function (a, b) { return a.v - b.v; });
    var obj = cands[0];
    try {
      var hech = String(cfg.chCurarHechizo || '').trim();
      if (hech) { decir(hech + ' "' + obj.c.name + '"', metodo); }
      else {
        var rn = macroBuscarItem(macroNorm(String(cfg.chCurarRuna || 'ultimate healing')));
        if (!rn) { chEstado = 'no tengo runas para curar'; return false; }
        window.gameClient.mouse.__handleItemUseWith({ which: rn.which, index: rn.index }, { which: window.gameClient.world.getTileFromWorldPosition(posObj(obj.q.x, obj.q.y, obj.q.z)), index: 255 });
      }
      chCuraProx = ahora + 1200 + Math.round(Math.random() * 500);
      chEstado = 'curando a ' + obj.c.name + ' (' + Math.round(obj.v) + '%)';
      return true;
    } catch (e) { registrar('colmena hunt curar: ' + e.message); return false; }
  }
  function chAtacar(lider, pos, ahora) {
    if (!cfg.chAtacar || !lider.objetivo) { return false; }
    var gc = window.gameClient, cr = null;
    try { cr = gc.world.getCreature(Number(lider.objetivo.id)); } catch (e) {}
    if (!cr || vidaDe(cr) === 0) { return false; }
    var q = posDe(cr); if (!q || q.z !== pos.z || Math.abs(q.x - pos.x) > 7 || Math.abs(q.y - pos.y) > 5) { return false; }
    var tg = null; try { tg = gc.player.hasTarget() ? gc.player.getTarget() : null; } catch (e) {}
    if (tg !== cr) { fijarObjetivo(cr); }
    var runa = String(cfg.chRuna || '').trim();
    // con runas se queda quieto junto al líder (no persigue al monstruo)
    if (runa && chaseActivo() !== 'stand' && ahora - (chAtacar.chaseT || 0) > 3000) { chAtacar.chaseT = ahora; aplicarModoCombate(null, 'stand'); }
    if (runa && ahora >= chRunaProx && lineaVision(pos, q.x, q.y)) {
      var hm = hotbarMgr();
      var listo = !hm || !((hm.__runeAttackUntil || 0) > performance.now() || (hm.__runeAttackGlobalUntil || 0) > performance.now());
      var rn = listo ? colBuscarRuna(runa) : null;
      if (rn) {
        try {
          if (hm && typeof hm.__useItemOnTarget === 'function' && tg === cr) { hm.__useItemOnTarget({ which: rn.which, index: rn.index }, rn.item); }
          else { gc.mouse.__handleItemUseWith({ which: rn.which, index: rn.index }, { which: gc.world.getTileFromWorldPosition(posObj(q.x, q.y, q.z)), index: 255 }); }
          chRunaProx = ahora + colIntervaloRuna();
        } catch (e) { registrar('colmena hunt runa: ' + e.message); }
      }
    }
    chEstado = 'atacando a ' + cr.name + ' con ' + lider.name;
    return true;
  }
  // Seguidor: si estoy parado donde el líder va a pasar, me aparto (a un lado o caminando delante de él)
  function chAbrirPaso(lider, pos, ahora) {
    var C = lider.camino || [], L = lider.pos;
    if (!C.length || !L) { return false; }
    function enCamino(x, y, z) { for (var i = 0; i < Math.min(6, C.length); i++) { if (C[i][0] === x && C[i][1] === y && C[i][2] === z) { return i; } } return -1; }
    var yo = enCamino(pos.x, pos.y, pos.z);
    // El líder está en otro piso pero viene a este (p. ej. ya me adelanté por la escalera): lo espero aquí, fuera de su llegada
    if (L.z !== pos.z) {
      if (!C.some(function (q) { return q[2] === pos.z; })) { return false; }
      if (yo >= 0 && ahora - chCaminarT > 700) {
        chCaminarT = ahora;
        for (var ey = -1; ey <= 1; ey++) { for (var ex = -1; ex <= 1; ex++) {
          if ((ex || ey) && enCamino(pos.x + ex, pos.y + ey, pos.z) < 0 && casillaLibre(pos.x + ex, pos.y + ey, pos.z) === true) { caminarA(pos.x + ex, pos.y + ey, pos.z); ey = 2; break; }
        } }
      }
      chEstado = 'espero a ' + lider.name + ' (viene a este piso)';
      return true;
    }
    if (Math.max(Math.abs(L.x - pos.x), Math.abs(L.y - pos.y)) > 3 || yo < 0) { return false; }
    if (ahora - chCaminarT < 700) { return true; }
    chCaminarT = ahora;
    // 1) a un lado: casilla libre pegada, fuera de su camino, cerca de él
    var mejor = null, mejorD = 99;
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) { continue; }
        var x = pos.x + dx, y = pos.y + dy;
        if ((x === L.x && y === L.y) || enCamino(x, y, pos.z) >= 0 || casillaLibre(x, y, pos.z) !== true) { continue; }
        var d = Math.max(Math.abs(L.x - x), Math.abs(L.y - y));
        if (d < mejorD) { mejorD = d; mejor = [x, y]; }
      }
    }
    if (mejor) { caminarA(mejor[0], mejor[1], pos.z); chEstado = 'me aparto del camino de ' + lider.name; return true; }
    // 2) pasillo: camino delante de él hasta el final de su tramo en este piso (o cambio de piso yo primero)
    var fin = yo;
    while (fin + 1 < C.length && C[fin + 1][2] === pos.z) { fin++; }
    if (fin > yo) { caminarA(C[fin][0], C[fin][1], C[fin][2]); chEstado = 'abro paso a ' + lider.name + ' (voy delante)'; return true; }
    if (fin + 1 < C.length) {
      var c = buscarCambioPiso(pos, C[fin + 1]);
      if (c && c.tipo === 'pisar') { caminarA(c.x, c.y, c.z); }
      else if (c) { ejecutarAccionWP({ a: c.tipo, t: [c.x, c.y, c.z] }, C[fin + 1]); }
      chEstado = 'abro paso a ' + lider.name + ' (cambio de piso primero)';
      return true;
    }
    return false;
  }
  // Seguidor: pisar por donde pasó el líder
  function chSeguir(lider, pos, ahora) {
    var L = lider.pos, dist = Math.max(1, Math.min(5, Number(cfg.chDist) || 2));
    if (chPisoZ !== pos.z) { chPisoZ = pos.z; chPisoIntentos = 0; }
    if (chAbrirPaso(lider, pos, ahora)) { return; }
    if (L.z === pos.z) {
      var d = Math.max(Math.abs(L.x - pos.x), Math.abs(L.y - pos.y));
      if (d <= dist) { if (autoCaminando() && d <= 1) { pararCaminata(); } chEstado = chEstado.indexOf('atacando') === 0 || chEstado.indexOf('curando') === 0 ? chEstado : 'junto a ' + lider.name; return; }
      if (ahora - chCaminarT > 900 || !autoCaminando()) { chCaminarT = ahora; caminarA(L.x, L.y, L.z); }
      chEstado = 'siguiendo a ' + lider.name + ' (' + d + ' sqm)';
      return;
    }
    // Otro piso: busco en sus huellas el último punto en MI piso y el siguiente (a dónde fue)
    var H = lider.huellas || [], k = -1;
    for (var i = H.length - 1; i >= 0; i--) { if (H[i][2] === pos.z) { k = i; break; } }
    if (k < 0 || k === H.length - 1) { chEstado = lider.name + ' está en otro piso y no sé por dónde fue'; return; }
    var borde = H[k], dest = H[k + 1];
    var db = Math.max(Math.abs(borde[0] - pos.x), Math.abs(borde[1] - pos.y));
    if (db > 1) {
      if (ahora - chCaminarT > 900 || !autoCaminando()) { chCaminarT = ahora; caminarA(borde[0], borde[1], borde[2]); }
      chEstado = 'voy a donde ' + lider.name + ' cambió de piso';
      return;
    }
    var c = buscarCambioPiso(pos, dest);
    if (!c) {   // la casilla del borde es la escalera: pisarla
      if (ahora - chCaminarT > 1500) { chCaminarT = ahora; caminarA(dest[0], dest[1], pos.z); }
      chEstado = 'cambiando de piso detrás de ' + lider.name;
      return;
    }
    if (c.tipo === 'pisar') { if (ahora - chCaminarT > 1500) { chCaminarT = ahora; caminarA(c.x, c.y, c.z); } }
    else if (ahora - chPisoT > 2500) {
      chPisoT = ahora; chPisoIntentos++;
      if (chPisoIntentos > 6) {
        if (!chAvisos['piso:' + pos.z]) { chAvisos['piso:' + pos.z] = ahora; alertar('caza', '⚠ Colmena hunt: no pude seguir a ' + lider.name + ' (' + c.tipo + ' en ' + c.x + ',' + c.y + ').'); }
        chEstado = 'atorado: no puedo usar ' + c.tipo; return;
      }
      ejecutarAccionWP({ a: c.tipo, t: [c.x, c.y, c.z] }, dest);
    }
    chEstado = (dest[2] < pos.z ? 'subo' : 'bajo') + ' detrás de ' + lider.name + ' (' + c.tipo + ')';
  }
  function chLoop() {
    try {
      if (!cfg.chOn) { chEstado = 'apagada'; return; }
      if (colmenaBloqueo()) { chEstado = 'solo con licencia Founder'; return; }
      if (pausaGM) { chEstado = 'en pausa (GM)'; return; }
      var gc = window.gameClient; if (!gc || !gc.player || !charActual) { return; }
      var pos = posJug(); if (!pos) { return; }
      var ahora = Date.now();
      if (cfg.chRol === 'lider') {
        chPublicarLider(pos, ahora);
        var fs = chSeguidores(ahora);
        chEstado = 'líder' + (cazaCorriendo ? ' (cazando)' : ' (inicia el Cave hunt)') + ' · seguidores: ' + (fs.length ? fs.map(function (f) { var q = f.pos, d = q && q.z === pos.z ? Math.max(Math.abs(q.x - pos.x), Math.abs(q.y - pos.y)) + ' sqm' : 'otro piso'; return f.name + ' (' + d + ', ' + f.vida + '%)'; }).join(', ') : 'ninguno') + (chEsperando ? ' · esperando a ' + chEsperando : '');
        return;
      }
      // Seguidor
      if (cazaCorriendo) { chEstado = 'detén tu Cave hunt: el seguidor no usa ruta propia'; return; }
      var nombre = chNombreLider();
      chPublicarSeguidor(pos, ahora, nombre);
      if (!nombre) { chEstado = 'escribe el nombre del líder (o haz party con él y ponlo a la vista)'; return; }
      var lider = chLeer(KEY_CH + nombre.toLowerCase());
      if (!lider || ahora - lider.t > 4000) {
        chEstado = 'esperando señal de ' + nombre + ' (actívale la Colmena hunt como líder en su pestaña)';
        if (lider && ahora - lider.t > 15000 && !chAvisos['lider'] ) { chAvisos['lider'] = ahora; alertar('caza', '⚠ Colmena hunt: ' + nombre + ' dejó de responder.'); }
        return;
      }
      chAvisos['lider'] = 0;
      if (chCurar(lider, ahora)) { return; }
      var atacando = chAtacar(lider, pos, ahora);
      chSeguir(lider, pos, ahora);
      if (atacando && chEstado.indexOf('siguiendo') !== 0 && chEstado.indexOf('subo') !== 0 && chEstado.indexOf('bajo') !== 0) { chEstado = 'atacando a ' + (lider.objetivo && lider.objetivo.name) + ' con ' + lider.name; }
    } catch (e) { registrar('colmena hunt: ' + e.message); }
  }

  // ---------- Recarga: munición al slot de flechas (Cave hunt) y small stones a la mano (Training) ----------
  // Slots del equipo en Minibia: 4 = mano derecha, 5 = mano izquierda, 9 = flechas (quiver)
  var SLOT_MANO_D = 4, SLOT_MANO_I = 5, SLOT_FLECHAS = 9;
  var RE_FLECHA = /\barrows?$/i, RE_VIROTE = /\bbolts?$/i, RE_PIEDRA = /^small stones?$/i;
  var recMuni = { ult: '', t: 0, intentos: 0, avisado: false, prev: -1 };
  var recPiedra = { mano: -1, t: 0, intentos: 0, avisado: false, prev: -1 };
  var recEstado = '';
  function equipo() { try { return window.gameClient.player.equipment || null; } catch (e) { return null; } }
  function itemEnSlot(eq, i) { try { var s = eq && eq.slots && eq.slots[i]; return (s && s.item) || null; } catch (e) { return null; } }
  function cuenta(it) { return it ? Math.max(1, Number(it.count) || 1) : 0; }
  // Todas las pilas en mochilas abiertas (no en cuerpos) cuyo nombre cumple
  function pilasEnMochilas(prueba) {
    var res = [];
    contenedores().forEach(function (c) {
      if (!c || !c.slots || esCadaverCont(c)) { return; }
      for (var i = 0; i < c.slots.length; i++) {
        var it = c.slots[i] && c.slots[i].item;
        if (!it || !it.id) { continue; }
        var n = nombreItem(it.id);
        if (n && prueba(n)) { res.push({ which: c, index: i, item: it, nombre: n.toLowerCase(), n: cuenta(it) }); }
      }
    });
    return res;
  }
  // Qué munición sirve con el arma que traes en la mano
  function municionValida() {
    var eq = equipo(), arma = '';
    [SLOT_MANO_D, SLOT_MANO_I].forEach(function (i) { var it = itemEnSlot(eq, i); var n = it ? nombreItem(it.id) : ''; if (/crossbow/i.test(n)) { arma = 'ballesta'; } else if (!arma && /bow\b/i.test(n)) { arma = 'arco'; } });
    if (arma === 'ballesta') { return function (n) { return RE_VIROTE.test(n); }; }
    if (arma === 'arco') { return function (n) { return RE_FLECHA.test(n) && !/crossbow/i.test(n); }; }
    if (recMuni.ult) { var u = recMuni.ult; return function (n) { return n.toLowerCase() === u; }; }   // sin arco ni ballesta: solo la misma que traías
    return null;
  }
  // Mueve "cuantos" de la pila "src" al slot "slot" del equipo
  function moverAEquipo(src, slot, cuantos) {
    var eq = equipo(), gc = window.gameClient;
    if (!eq || !gc || !gc.mouse || typeof gc.mouse.sendItemMove !== 'function') { return false; }
    gc.mouse.sendItemMove({ which: src.which, index: src.index }, { which: eq, index: slot }, Math.max(1, Math.min(100, cuantos)));
    return true;
  }
  // r: estado de esta recarga; slot: adónde; en: lo que hay ahora en ese slot; pilas: candidatas; min; que: texto
  function recargar(r, ahora, slot, en, pilas, min, que) {
    var hay = cuenta(en), nomEn = en ? nombreItem(en.id).toLowerCase() : '';
    if (en && hay >= min) { r.avisado = false; r.intentos = 0; r.prev = -1; return; }
    if (ahora < r.t) { return; }
    // ¿funcionó el último movimiento? (se revisa 1.5 s después)
    if (r.prev >= 0 && hay > r.prev) { r.intentos = 0; }
    r.prev = -1;
    // misma munición primero (se junta en la pila); si el slot está vacío, cualquiera válida (la pila más grande)
    var mismas = en ? pilas.filter(function (p) { return p.nombre === nomEn; }) : pilas;
    if (!mismas.length) {
      if (!en && !r.avisado) { r.avisado = true; alertar('caza', '⚠ Ya no tengo ' + que + ' en las mochilas abiertas.'); }
      recEstado = en ? que + ': quedan ' + hay + ' y no tengo más del mismo tipo' : 'sin ' + que + ' en las mochilas';
      return;
    }
    mismas.sort(function (a, b) { return b.n - a.n; });
    var p = mismas[0], cuantos = en ? Math.min(p.n, 100 - hay) : Math.min(p.n, 100);
    if (cuantos <= 0) { return; }
    if (r.intentos >= 3) {
      if (!r.avisado) { r.avisado = true; alertar('caza', '⚠ No pude subir ' + que + ' al slot. Revisa que tengas espacio y que tus mochilas estén abiertas.'); }
      r.t = ahora + 30000; r.intentos = 0; return;
    }
    try {
      if (moverAEquipo(p, slot, cuantos)) {
        r.prev = hay; r.intentos++; r.avisado = false;
        recEstado = 'subí ' + cuantos + ' ' + p.nombre; ultimaAccion = recEstado; registrar('recarga: ' + recEstado);
      }
    } catch (e) { registrar('recarga: ' + e.message); r.intentos++; }
    r.t = ahora + 1500;
  }
  // Recordatorio de descanso: cada X minutos de Cave hunt seguidos te avisa que te tomes una pausa
  var descanso = { ini: 0, prox: 0 };
  function descansoLoop() {
    try {
      var ahora = Date.now(), min = Math.max(10, Math.min(600, Number(cfg.cazaDescansoMin) || 60));
      if (!cfg.cazaDescansoOn || !cazaCorriendo) { if (!cazaCorriendo) { descanso.ini = 0; } return; }
      if (pausaGM) { return; }
      if (!descanso.ini) { descanso.ini = ahora; descanso.prox = ahora + min * 60000; return; }
      if (ahora < descanso.prox) { return; }
      descanso.prox = ahora + min * 60000;
      var llevas = Math.round((ahora - descanso.ini) / 60000);
      alertar('caza', '☕ Llevas ' + llevas + ' min con el Cave hunt. Tómate un descanso de unos minutos: estira, toma agua y revisa tu personaje.' + (cfg.cazaDescansoParar ? '\nDetuve el Cave hunt: toca «Iniciar cavehunt» cuando regreses.' : ''));
      if (cfg.cazaDescansoParar) { cazaParar('pausa para descansar'); descanso.ini = 0; }
    } catch (e) { registrar('descanso: ' + e.message); }
  }
  function recargaLoop() {
    try {
      if (pausaGM) { return; }
      var ahora = Date.now(), eq = equipo();
      if (!eq) { return; }
      if (recMuni.pj !== charActual) { recMuni = { ult: '', t: 0, intentos: 0, avisado: false, prev: -1, pj: charActual }; recPiedra = { mano: -1, t: 0, intentos: 0, avisado: false, prev: -1 }; }
      // Cave hunt: munición al slot de flechas
      if (cfg.cazaMuniOn && cazaCorriendo) {
        var enQ = itemEnSlot(eq, SLOT_FLECHAS);
        if (enQ) { recMuni.ult = nombreItem(enQ.id).toLowerCase(); }
        var val = (enQ && (RE_FLECHA.test(recMuni.ult) || RE_VIROTE.test(recMuni.ult))) || !enQ ? municionValida() : null;
        if (val) {
          // espera un momento al quedarse vacío: el "Refill Ammo" del propio juego puede rellenarlo primero
          if (!enQ && !recMuni.vacioT) { recMuni.vacioT = ahora + 800; }
          if (enQ) { recMuni.vacioT = 0; }
          if (enQ || ahora >= recMuni.vacioT) { recargar(recMuni, ahora, SLOT_FLECHAS, enQ, pilasEnMochilas(val), Math.max(1, Math.min(100, Number(cfg.cazaMuniMin) || 20)), 'munición'); }
        }
      }
      // Training: small stones a la mano
      if (cfg.trainPiedrasOn && cfg.trainOn) {
        var manoP = -1;
        [SLOT_MANO_D, SLOT_MANO_I].forEach(function (i) { var it = itemEnSlot(eq, i); if (it && RE_PIEDRA.test(nombreItem(it.id))) { manoP = i; } });
        var kP = 'minibiaHelperPiedra::' + (charActual || '');
        if (recPiedra.mano < 0) { try { var g = localStorage.getItem(kP); if (g === '4' || g === '5') { recPiedra.mano = Number(g); } } catch (e) {} }
        if (manoP >= 0 && recPiedra.mano !== manoP) { recPiedra.mano = manoP; try { localStorage.setItem(kP, String(manoP)); } catch (e) {} }
        var slotP = manoP >= 0 ? manoP : (recPiedra.mano >= 0 && !itemEnSlot(eq, recPiedra.mano) ? recPiedra.mano : (!itemEnSlot(eq, SLOT_MANO_D) ? SLOT_MANO_D : (!itemEnSlot(eq, SLOT_MANO_I) ? SLOT_MANO_I : -1)));
        // solo si ya usabas piedras (las vi en la mano) o tienes una mano libre y piedras en la mochila
        if (slotP >= 0 && (recPiedra.mano >= 0 || manoP >= 0)) {
          if (!itemEnSlot(eq, slotP) && !recPiedra.vacioT) { recPiedra.vacioT = ahora + 800; }
          if (itemEnSlot(eq, slotP)) { recPiedra.vacioT = 0; }
          if (itemEnSlot(eq, slotP) || ahora >= recPiedra.vacioT) { recargar(recPiedra, ahora, slotP, itemEnSlot(eq, slotP), pilasEnMochilas(function (n) { return RE_PIEDRA.test(n); }), Math.max(1, Math.min(100, Number(cfg.trainPiedrasMin) || 5)), 'small stones'); }
        }
      }
    } catch (e) { registrar('recarga: ' + e.message); }
  }

  function cazaLoop() {
    try {
      var ahora = Date.now();
      grabarTick();
      if (!cazaCorriendo) { return; }
      if (betaBloqueo()) { cazaParar('tu licencia no incluye el Cave hunt'); return; }
      if (pausaGM) { cazaEstado = 'en pausa (GM)'; return; }
      if (macroPausado('caza')) { if (autoCaminando()) { pararCaminata(); } cazaEstado = 'en pausa por un macro'; return; }
      var gc = window.gameClient;
      if (!gc || !gc.player) { cazaEstado = 'esperando personaje...'; return; }
      var hp = leerBarra('health-bar');
      if (!hp) { cazaEstado = 'no puedo leer la vida'; return; }
      var pos = posJug();
      if (!pos) { cazaEstado = 'no puedo leer la posición'; return; }
      if (!mismaPos(cazaUltPos, pos)) { cazaUltPos = pos; cazaUltMovT = ahora; cazaAtasco = 0; }
      var pct = hp.max > 0 ? hp.actual * 100 / hp.max : 100;

      // 1) Cierre de sesión de emergencia
      if (cfg.cazaLogoutPct > 0 && pct <= cfg.cazaLogoutPct) {
        var ok = cerrarSesion();
        cazaParar('vida crítica (' + Math.round(pct) + '%): ' + (ok ? 'sesión cerrada' : 'error al cerrar sesión'));
        alertar('caza', '🚨 Vida crítica ' + Math.round(pct) + '%. ' + (ok ? 'Sesión cerrada.' : 'No pude cerrar sesión.'));
        return;
      }

      // 1b) Defensa contra jugadores: pelear o escapar
      try { if (defensaTick(pos, ahora, pct)) { return; } } catch (e) { registrar('defensa: ' + e.message); }

      // 2) Escape automático por golpe fuerte
      if (cfg.cazaEscapeAtacado && !cazaRetirando && chequearGolpeFuerte(hp, ahora)) {
        cazaRetirando = true; cazaDir = -1; cazaAtqAt = null; cazaRetiroMotivo = 'golpe fuerte';
        alertar('caza', '⚠ Golpe fuerte recibido: escapando por la ruta.');
      }

      var mpB = leerBarra('mana-bar');

      // 2b) Mana baja: aviso y alejarse de los monstruos (aunque sea fuera de la ruta) hasta recuperarla
      if (cfg.cazaManaBajaOn && mpB && mpB.max > 0) {
        var mpct = mpB.actual * 100 / mpB.max;
        if (!cazaHuida && mpct <= cfg.cazaManaBajaPct) {
          cazaHuida = 'mana'; cazaAW = null; cazaHuidaT = ahora;
          alertar('caza', '🔵 Mana baja (' + Math.round(mpct) + '%): me alejo de los monstruos hasta recuperarla.');
        } else if (cazaHuida === 'mana' && mpct >= Math.max(cfg.cazaManaReanudarPct, cfg.cazaManaBajaPct + 5)) {
          cazaHuida = ''; cazaAW = null;
          cazaEstado = 'mana recuperada (' + Math.round(mpct) + '%), vuelvo a la ruta';
          registrar(cazaEstado);
        }
        if (cazaHuida === 'mana') { huir(pos, ahora, 'recuperando mana ' + Math.round(mpct) + '%'); return; }
      }

      // 3) Retirada por vida baja (también se reanuda tras un golpe fuerte)
      if (cfg.cazaRetiroOn && ruta.length > 1) {
        if (!cazaRetirando && pct <= cfg.cazaRetiroPct) {
          cazaRetirando = true; cazaDir = -1; cazaAtqAt = null; cazaRetiroMotivo = 'vida baja (' + Math.round(pct) + '%)';
          alertar('caza', '⚠ Vida baja (' + Math.round(pct) + '%): me retiro por la ruta.');
        }
      }
      if (cazaRetirando && pct >= cfg.cazaReanudarPct && cazaRetiroMotivo.indexOf('PK') !== 0 && (cazaRetiroMotivo.indexOf('vida') >= 0 || cazaRetiroMotivo.indexOf('golpe') >= 0)) {
        cazaRetirando = false; cazaDir = 1; cazaRetiroMotivo = '';
        cazaEstado = 'vida recuperada, reanudo';
      }

      // 4) Retirada por falta de comida o capacidad
      if (!cazaRetirando) {
        if (cfg.cazaRetiroSinFood) {
          var fmVal = leerComida();
          if (fmVal !== null && fmVal <= cfg.cazaMinFood) {
            cazaRetirando = true; cazaDir = -1; cazaRetiroMotivo = 'sin comida';
            alertar('caza', '⚠ Sin comida: retirándose al refugio.');
          }
        }
        if (cfg.cazaRetiroCapOn) {
          var capVal = leerCap();
          if (capVal !== null && capVal < cfg.capMin) {
            cazaRetirando = true; cazaDir = -1; cazaRetiroMotivo = 'cap baja';
            alertar('caza', '⚠ Cap baja: retirándose al refugio.');
          }
        }
      }

      // 5) Comer
      if (cfg.cazaComerOn && ahora >= cazaComerChequeo) {
        cazaComerChequeo = ahora + 4000;
        if (ahora - cazaUltComer > 20000) {
          var fm = leerComida(), comer = false;
          if (fm !== null) { comer = fm <= cfg.cazaComerBajo; }
          else {
            if (!cazaComerFallback) { cazaComerFallback = 300000 + Math.random() * 240000; }
            comer = ahora - cazaUltComer > cazaComerFallback;
          }
          if (comer) {
            var cm = comidaEnMochila();
            try {
              if (cm) { window.gameClient.mouse.use(cm); cazaComidas++; }
              else if (cfg.teclaComida) { pulsarTecla(cfg.teclaComida); cazaComidas++; }
            } catch (e) { registrar('comer: ' + e.message); }
            cazaUltComer = ahora; cazaComerFallback = 0;
          }
        }
      }

      // 6) Aviso de jugador
      if (cfg.cazaAvisoJug && ahora - cazaJugT > 1500) {
        cazaJugT = ahora;
        hayJugadores().forEach(function (nm) {
          if (!cazaJugVistos[nm] || ahora - cazaJugVistos[nm] > 120000) {
            cazaJugVistos[nm] = ahora;
            alertar('caza', '👤 Jugador cerca: ' + nm);
          }
        });
      }

      // 7) Combate: fija UN objetivo y lo mantiene (hold target) hasta que muera; el juego lo persigue (chase)
      var lista = listaObjetivos();
      var tg = null;
      try { tg = gc.player.hasTarget() ? gc.player.getTarget() : null; } catch (e) { tg = leerRuta(gc, 'player.__target'); }
      var tgVida = tg ? vidaDe(tg) : null;
      var tgVivo = !!tg && tgVida !== 0;

      if (cazaRetirando) {
        cazaAtqAt = null;
        if (tg && ahora - cazaSoltarT > 1500) { cazaSoltarT = ahora; soltarObjetivo(); }
      } else if (tgVivo) {
        if (cazaHold !== tg) { cazaHold = tg; cazaHoldT = ahora; cazaHoldVida = tgVida; cazaHoldPos = pos; cazaAlcFallos = 0; }
        if (cazaAW || autoCaminando()) { pararCaminata(); }   // caminando no persigue al objetivo
        cazaTeniaObj = true; cazaFallos = 0; cazaAtqAt = null; cazaAW = null;
        cazaEstado = 'atacando a ' + tg.name;
        asegurarChase(ahora);
        if (cfg.cazaTeclaAtaque && ahora >= cazaAtqProx) {
          try { pulsarTecla(cfg.cazaTeclaAtaque); } catch (e) { registrar('tecla de ataque: ' + e.message); }
          var a = Math.max(0.3, cfg.cazaAtqMin), b = Math.max(a, cfg.cazaAtqMax);
          cazaAtqProx = ahora + (a + Math.random() * (b - a)) * 1000;
        }
        // Detrás de una pared (sin camino o sin línea de vista): la suelto enseguida y busco otra
        if (ahora - cazaAlcT > 1000) {
          cazaAlcT = ahora;
          if (!puedoAtacar(pos, tg)) { cazaAlcFallos++; } else { cazaAlcFallos = 0; }
          if (cazaAlcFallos >= 2) {
            cazaAlcFallos = 0;
            try { cazaIgnorar[tg.id] = ahora + 20000; } catch (e) {}
            soltarObjetivo(); cazaHold = null; cazaCand = null; cazaScanT = 0;
            cazaEstado = 'no puedo llegar a ' + tg.name + ' (pared), busco otro';
            registrar(cazaEstado);
            return;
          }
        }
        // Inalcanzable: lejos, sin perderle vida y sin poder acercarme durante 10 s -> la suelto
        if (tgVida !== cazaHoldVida || !mismaPos(pos, cazaHoldPos)) { cazaHoldVida = tgVida; cazaHoldPos = pos; cazaHoldT = ahora; }
        var qt = posDe(tg);
        var dt = (qt && qt.z === pos.z) ? Math.max(Math.abs(qt.x - pos.x), Math.abs(qt.y - pos.y)) : 99;
        if (dt > 1 && !cfg.cazaKiting && ahora - cazaHoldT > 10000) {
          try { cazaIgnorar[tg.id] = ahora + 30000; } catch (e) {}
          soltarObjetivo(); cazaHold = null;
          cazaEstado = 'no alcanzo a ' + tg.name + ', la ignoro 30 s';
          return;
        }
        if (esquivarOndas(pos, ahora, tg)) { return; }
        if (cfg.cazaKiting) { hacerKiting(pos, ahora, tg); }
        return;
      } else {
        if (cazaTeniaObj) {
          cazaTeniaObj = false;
          if (cazaHold && vidaDe(cazaHold) === 0) { cazaMuertes++; anotarCadaver(cazaHold); if (cazaEspera) { cazaEspera.hasta = ahora + cazaEspera.seg * 1000; } }
          cazaHold = null;
        }
        var usarTecla = !!String(cfg.cazaTeclaObjetivo || '').trim();
        if (lista.length || usarTecla) {
          if (ahora - cazaScanT > 300) {
            cazaScanT = ahora;
            if (lista.length) { cazaCand = buscarObjetivos(lista, cfg.cazaRango); }
            else {
              // Con tecla: el juego elige el más cercano aunque esté detrás de una pared; si eso pasa, fijo yo uno alcanzable
              var hayIgn = Object.keys(cazaIgnorar).some(function (k) { return cazaIgnorar[k] > ahora; });
              var mo = mejorObjetivo([], cfg.cazaRango);
              cazaCand = mo ? (hayIgn ? mo : { name: 'el más cercano', porTecla: true, cr: mo }) : null;
            }
          }
          if (cazaCand) {
            if (cazaAtqAt === null) {
              cazaAtqAt = ahora + 250 + Math.random() * 500;
              cazaEstado = 'objetivo detectado: ' + cazaCand.name;
              return;
            }
            if (ahora < cazaAtqAt) { return; }
            try {
              if (usarTecla && cazaCand.porTecla) { pararCaminata(); pulsarTecla(cfg.cazaTeclaObjetivo); }
              else { fijarObjetivo(cazaCand.cr || cazaCand); }
            } catch (e) { registrar('fijar objetivo: ' + e.message); }
            cazaFallos++;
            cazaAtqAt = ahora + 1200;
            cazaEstado = 'fijando objetivo ' + cazaCand.name + ' (' + cazaFallos + ')';
            if (cazaFallos >= 4) {
              // No se deja fijar: la ignoro un rato y sigo cazando
              try { var cid = cazaCand.cr ? cazaCand.cr.id : cazaCand.id; if (cid) { cazaIgnorar[cid] = ahora + 30000; } } catch (e) {}
              cazaFallos = 0; cazaCand = null; cazaAtqAt = ahora + (usarTecla ? 3000 : 300);
            }
            return;
          }
          cazaAtqAt = null;
        }
      }

      // 8) Oro a platinum y comida de los cadáveres (solo sin monstruos que atacar)
      cambiarOro(ahora);
      if (!cazaRetirando && comerDeCadaver(pos, ahora)) { return; }

      // 9) Caminar por la ruta (en Colmena hunt, el líder espera a los seguidores que se quedan atrás)
      if (chLiderEspera(pos, ahora)) { return; }
      if (ruta.length > 1) { seguirRuta(pos, ahora); }
      else { cazaEstado = ruta.length ? 'ruta muy corta' : 'sin ruta: solo ataco monstruos cercanos'; }
    } catch (e) {
      registrar('caza: ' + e.message);
      if (cazaCorriendo) { cazaEstado = 'error: ' + e.message; }
    }
  }

  // ---------- Autohechizos: utamo vita (magic shield) y utana vid (invisible) ----------
  // Lee si tienes el efecto (como el autohaste). Si el juego no lo dice, usa la duración del hechizo (200 s).
  var autoHech = {
    utamo: { prox: 0, fallos: 0, ultT: 0, estado: 'apagado', usos: 0 },
    utana: { prox: 0, fallos: 0, ultT: 0, estado: 'apagado', usos: 0 }
  };
  var condCache = {};
  function condicionId(re) {
    var k = re.source;
    if (k in condCache) { return condCache[k]; }
    var id = null;
    try {
      var CM = (typeof ConditionManager !== 'undefined') ? ConditionManager.prototype : null;
      if (CM) { Object.getOwnPropertyNames(CM).forEach(function (n) { if (id === null && re.test(n) && typeof CM[n] === 'number') { id = CM[n]; } }); }
    } catch (e) {}
    condCache[k] = id;
    return id;
  }
  function tengoCondicion(re) {
    var id = condicionId(re);
    if (id === null) { return null; }
    try { var p = window.gameClient.player; if (typeof p.hasCondition !== 'function') { return null; } return !!p.hasCondition(id); } catch (e) { return null; }
  }
  var RE_COND_UTAMO = /^(MAGIC_?SHIELD|MANA_?SHIELD)$/i, RE_COND_UTANA = /^INVISIB/i;
  function autoHechizo(clave, ahora, mp, hp) {
    var st = autoHech[clave], esUtamo = clave === 'utamo';
    var on = esUtamo ? cfg.utamoOn : cfg.utanaOn;
    if (!on) { st.estado = 'apagado'; return false; }
    var hech = esUtamo ? 'utamo vita' : 'utana vid', durMs = 200000;
    var activo = tengoCondicion(esUtamo ? RE_COND_UTAMO : RE_COND_UTANA);
    if (activo === null) { activo = st.ultT > 0 && ahora - st.ultT < durMs - 4000; }   // sin dato del juego: por tiempo
    if (activo) { st.estado = 'activo'; st.fallos = 0; return false; }
    if (esUtamo && cfg.utamoModo === 'vida') {
      var pct = (hp && hp.max > 0) ? hp.actual * 100 / hp.max : 100, lim = Math.max(5, Math.min(95, Number(cfg.utamoVidaPct) || 50));
      if (pct > lim) { st.estado = 'esperando a que tu vida baje de ' + lim + ' %'; return false; }
    }
    if (ahora < st.prox) { return false; }
    try { if (estaEnPZ(ahora)) { st.estado = 'en protection zone'; return false; } } catch (e) {}
    var costo = Math.max(1, Number(esUtamo ? cfg.utamoMana : cfg.utanaMana) || (esUtamo ? 50 : 440));
    if (!mp || mp.actual < costo) { st.estado = 'sin maná para ' + hech + ' (' + (mp ? mp.actual : '?') + '/' + costo + ')'; st.prox = ahora + 1500; return false; }
    try { decir(hech, metodo); st.usos++; st.ultT = ahora; } catch (e) { registrar('autohechizo: ' + e.message); }
    st.fallos++;
    st.prox = ahora + (st.fallos >= 3 && condicionId(esUtamo ? RE_COND_UTAMO : RE_COND_UTANA) !== null ? 15000 : 2400 + Math.random() * 800);
    st.estado = 'lancé ' + hech;
    return true;
  }
  function autoHechizos(ahora, mp, hp) {
    // primero el magic shield (protege la vida); el invisible después, sin lanzar los dos en el mismo instante
    if (autoHechizo('utamo', ahora, mp, hp)) { return; }
    autoHechizo('utana', ahora, mp, hp);
  }

  // ---------- Casa: refugiarse de los PKs mientras runeas ----------
  // Si aparece un jugador con calavera (o uno que te ataca) que no es de tu party ni de tus farmers, camina a la
  // casilla dentro de tu casa. Cuando pasa el tiempo elegido (60 s) sin verlo, regresa a tu lugar de runeo.
  // Las pestañas del mismo navegador se avisan entre sí: si uno de tus farmers ve al PK, todos se meten.
  var KEY_CASA_ALARMA = 'minibiaHelperCasaAlarma';
  var casa = { fase: 'vigilar', t: 0, ultVisto: -1e15, quien: '', caminarT: 0, ultPos: null, ultMovT: 0, puertaT: 0, avisoT: 0 };
  var casaEstado = 'apagada';
  function casaFarmers() { return String(cfg.casaFarmers || '').split(',').map(function (x) { return x.trim().toLowerCase(); }).filter(Boolean); }
  function casaPk(ahora) {
    var p = window.gameClient.player, pn = performance.now(), mios = casaFarmers(), res = null;
    (criaturasActivas() || []).forEach(function (c) {
      try {
        if (res || !c || c === p || c.type !== 0 || c.masterId) { return; }
        var n = String(c.name || '').toLowerCase();
        if (mios.indexOf(n) >= 0 || esDeLaColmena(c)) { return; }
        var sk = Number(c.skull) || 0;
        var meAtaca = c.__attackingMeUntil && c.__attackingMeUntil > pn;
        if (meAtaca || sk === 1 || sk >= 3) { res = c; }
      } catch (e) {}
    });
    return res;
  }
  function casaAlarmaOtros() { try { var a = JSON.parse(localStorage.getItem(KEY_CASA_ALARMA) || 'null'); return a && Date.now() - a.t < 15000 && a.de !== charActual ? a : null; } catch (e) { return null; } }
  function casaAvisarOtros(quien) { try { localStorage.setItem(KEY_CASA_ALARMA, JSON.stringify({ t: Date.now(), de: charActual, quien: quien })); } catch (e) {} }
  function casaEn(pos, q) { return q && pos.x === q[0] && pos.y === q[1] && pos.z === q[2]; }
  // Si no avanzo hacia la casa (puerta cerrada), uso la puerta que esté pegada a mí
  function usarPuertaCerca(pos) {
    var gc = window.gameClient;
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) { continue; }
        var t = tileEn(pos.x + dx, pos.y + dy, pos.z); if (!t || !t.items) { continue; }
        for (var i = t.items.length - 1; i >= 0; i--) {
          var it = t.items[i]; if (!it) { continue; }
          if (/door|gate/i.test(nombreItem(it.id))) { try { gc.mouse.use({ which: t, index: i }); return true; } catch (e) { return false; } }
        }
      }
    }
    return false;
  }
  function casaIrA(q, pos, ahora) {
    if (casaEn(pos, q)) { return true; }
    if (!casa.ultPos || pos.x !== casa.ultPos.x || pos.y !== casa.ultPos.y || pos.z !== casa.ultPos.z) { casa.ultPos = { x: pos.x, y: pos.y, z: pos.z }; casa.ultMovT = ahora; }
    if (ahora - casa.ultMovT > 1800 && ahora - casa.puertaT > 2500) { casa.puertaT = ahora; if (usarPuertaCerca(pos)) { casa.caminarT = ahora + 700; return false; } }
    if (!autoCaminando() && ahora > casa.caminarT) { casa.caminarT = ahora + 1200; caminarA(q[0], q[1], q[2]); }
    return false;
  }
  // ----- Depósito: con la cap baja, guarda runas y munición en un baúl/caja de la casa y regresa -----
  var dep = { cont: null, antes: [], abrirT: 0, moverT: 0, enfriar: 0, movidos: 0, intentos: 0 };
  var RE_DEP_MUNI = /\b(arrows?|bolts?)$/i;
  function depGuardar(n) {
    n = String(n || '').toLowerCase(); if (!n) { return false; }
    if (cfg.casaDepRunas && / rune$/.test(n) && !/^blank rune$/.test(n)) { return true; }
    if (cfg.casaDepMuni && RE_DEP_MUNI.test(n)) { return true; }
    return String(cfg.casaDepOtros || '').split(',').map(function (x) { return x.trim().toLowerCase(); }).filter(Boolean).indexOf(n) >= 0;
  }
  function esContenedorItem(it) { try { return !!it && typeof it.isContainer === 'function' && it.isContainer(); } catch (e) { return false; } }
  // índice del baúl en su casilla (por su ID si lo diste; si no, el primer contenedor que no sea un cuerpo)
  function depIndiceCaja(t) {
    if (!t || !t.items) { return -1; }
    for (var i = t.items.length - 1; i >= 0; i--) {
      var it = t.items[i]; if (!it) { continue; }
      if (Number(cfg.casaDepId) > 0 ? it.id === Number(cfg.casaDepId) : (esContenedorItem(it) && !RE_CADAVER.test(nombreItem(it.id)))) { return i; }
    }
    return -1;
  }
  function depMarcar() {
    var pos = posJug(); if (!pos) { toast('Entra con tu personaje primero'); return; }
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        var t = tileEn(pos.x + dx, pos.y + dy, pos.z), i = depIndiceCaja(t);
        if (i < 0) { continue; }
        cfg.casaDepPie = [pos.x, pos.y, pos.z]; cfg.casaDepCaja = [pos.x + dx, pos.y + dy, pos.z];
        if (!(Number(cfg.casaDepId) > 0)) { cfg.casaDepId = t.items[i].id; try { fCasaDepId.input.value = cfg.casaDepId; } catch (e) {} }
        guardarCfg(); casaPintar();
        toast('Depósito marcado: ' + (nombreItem(t.items[i].id) || 'contenedor') + ' (ID ' + t.items[i].id + ')');
        return;
      }
    }
    toast('No veo ningún baúl, caja o mochila junto a ti. Párate pegado a él (o pon su ID) y vuelve a tocar.');
  }
  function depPendientes() {
    var res = [];
    contenedores().forEach(function (c) {
      if (!c || !c.slots || c === dep.cont || esCadaverCont(c)) { return; }
      for (var i = 0; i < c.slots.length; i++) { var it = c.slots[i] && c.slots[i].item; if (it && depGuardar(nombreItem(it.id))) { res.push({ which: c, index: i, item: it }); } }
    });
    return res;
  }
  function depListo() { return !!(cfg.casaDepOn && cfg.casaLugar && cfg.casaDepPie && cfg.casaDepCaja); }
  // Pasos del depósito. Devuelve el texto de estado, o null cuando terminó.
  function depPaso(pos, ahora) {
    var P = cfg.casaDepPie, C = cfg.casaDepCaja, gc = window.gameClient;
    if (casa.fase === 'dep_ir') {
      if (casaIrA(P, pos, ahora)) { casa.fase = 'dep_abrir'; casa.t = ahora; dep.cont = null; dep.abrirT = 0; dep.antes = contenedores(); return 'abriendo el depósito'; }
      if (ahora - casa.t > 45000) { alertar('casa', '⚠ No pude llegar al depósito (¿puerta cerrada o camino bloqueado?).'); dep.enfriar = ahora + 300000; return null; }
      return 'voy al depósito a guardar (cap baja)';
    }
    if (casa.fase === 'dep_abrir') {
      var nuevo = contenedores().filter(function (c) { return dep.antes.indexOf(c) < 0 && !esCadaverCont(c); })[0];
      if (nuevo) { dep.cont = nuevo; casa.fase = 'dep_mover'; dep.movidos = 0; dep.moverT = ahora + 500; return 'depósito abierto'; }
      if (ahora - casa.t > 15000) { alertar('casa', '⚠ No pude abrir el depósito. Revisa que esté marcado bien.'); dep.enfriar = ahora + 300000; return null; }
      if (ahora - dep.abrirT > 1800) {
        dep.abrirT = ahora;
        var t = tileEn(C[0], C[1], C[2]), i = depIndiceCaja(t);
        if (i >= 0) { try { gc.mouse.use({ which: t, index: i }); } catch (e) { registrar('depósito: ' + e.message); } }
      }
      return 'abriendo el depósito';
    }
    if (casa.fase === 'dep_mover') {
      if (ahora < dep.moverT) { return 'guardando (' + dep.movidos + ')'; }
      var c = dep.cont;
      if (!c || !c.slots || contenedores().indexOf(c) < 0) { casa.fase = 'dep_abrir'; casa.t = ahora; dep.antes = contenedores(); return 'el depósito se cerró, lo abro otra vez'; }
      var pend = depPendientes();
      if (!pend.length) {
        dep.enfriar = ahora + 120000;
        var cap = leerCap();
        if (cap !== null && cap < (Number(cfg.casaDepCap) || 30)) { dep.enfriar = ahora + 600000; alertar('casa', '📦 Guardé ' + dep.movidos + ' cosas pero la cap sigue baja (' + cap + '): lo demás que cargas no es runa ni munición.'); }
        else { registrar('depósito: guardé ' + dep.movidos + ' pilas'); }
        return null;
      }
      var hueco = -1; for (var h = 0; h < c.slots.length; h++) { if (!(c.slots[h] && c.slots[h].item)) { hueco = h; break; } }
      if (hueco < 0) { alertar('casa', '📦 El depósito está lleno. Vacíalo o pon otro.'); dep.enfriar = ahora + 1800000; return null; }
      var p = pend[0];
      try { gc.mouse.sendItemMove({ which: p.which, index: p.index }, { which: c, index: hueco }, Math.max(1, Number(p.item.count) || 1)); dep.movidos++; } catch (e) { registrar('depósito: ' + e.message); }
      dep.moverT = ahora + 600 + Math.random() * 300;
      return 'guardando ' + nombreItem(p.item.id) + ' (' + dep.movidos + ')';
    }
    return null;
  }
  function casaTick() {
    try {
      var conDep = depListo();
      if ((!cfg.casaOn && !conDep) || !charActual) { casaEstado = (cfg.casaOn || cfg.casaDepOn) ? 'esperando personaje' : 'apagada'; casa.fase = 'vigilar'; return; }
      if (pausaGM) { casaEstado = 'en pausa (GM)'; return; }
      var L = cfg.casaLugar, D = cfg.casaDentro;
      if (!L || (cfg.casaOn && !D)) { casaEstado = 'falta marcar ' + (!L ? 'tu lugar de runeo' : 'la casilla dentro de la casa'); return; }
      var pos = posJug(); if (!pos) { return; }
      var ahora = Date.now(), pk = cfg.casaOn && D ? casaPk(ahora) : null, otro = cfg.casaOn && D ? casaAlarmaOtros() : null;
      if (pk) { casa.ultVisto = ahora; casa.quien = pk.name; casaAvisarOtros(pk.name); }
      else if (otro) { casa.ultVisto = Math.max(casa.ultVisto, otro.t); casa.quien = otro.quien + ' (lo vio ' + otro.de + ')'; }
      var cerca = pos.z === L[2] && Math.max(Math.abs(pos.x - L[0]), Math.abs(pos.y - L[1])) <= 12;
      var espera = Math.max(10, Math.min(900, Number(cfg.casaEspera) || 60)) * 1000;
      if (casa.fase === 'vigilar') {
        if (!cerca) { casaEstado = 'vigilando (lejos de tu lugar de runeo, no hago nada)'; return; }
        var capV = conDep ? leerCap() : null;
        if (conDep && capV !== null && capV < (Number(cfg.casaDepCap) || 30) && ahora > dep.enfriar && !(ahora - casa.ultVisto < 3000)) {
          casa.fase = 'dep_ir'; casa.t = ahora; casa.ultMovT = ahora; casa.ultPos = null; casa.motivo = 'dep';
          casaEstado = 'cap baja (' + capV + '): voy a guardar'; return;
        }
        if (ahora - casa.ultVisto < 3000) {
          casa.fase = 'huir'; casa.t = ahora; casa.ultMovT = ahora; casa.ultPos = null; casa.motivo = 'pk';
          if (ahora - casa.avisoT > 20000 || !casa.avisoT) { casa.avisoT = ahora; alertar('casa', '🏠 PK a la vista: ' + casa.quien + '. Me meto a la casa.'); }
        } else { casaEstado = 'vigilando: no hay PKs'; return; }
      }
      if (/^dep_/.test(casa.fase)) {
        if (ahora - casa.ultVisto < 3000 && D) { casa.fase = 'huir'; casa.t = ahora; casa.motivo = 'pk'; return; }   // un PK manda
        var tx = depPaso(pos, ahora);
        if (tx === null) { casa.fase = 'volver'; casa.t = ahora; casa.ultPos = null; casa.ultMovT = ahora; return; }
        casaEstado = tx; return;
      }
      if (casa.fase === 'huir') {
        if (casaIrA(D, pos, ahora)) { casa.fase = 'dentro'; casa.t = ahora; casaEstado = 'dentro de la casa'; return; }
        if (ahora - casa.t > 45000) { casa.fase = 'dentro'; casa.t = ahora; alertar('casa', '⚠ No pude llegar a la casa (¿puerta cerrada o camino bloqueado?).'); }
        casaEstado = 'corriendo a la casa (' + casa.quien + ')';
        return;
      }
      if (casa.fase === 'dentro') {
        if (!casaEn(pos, D) && ahora - casa.ultVisto < espera) { casaIrA(D, pos, ahora); }
        var resta = Math.ceil((espera - (ahora - casa.ultVisto)) / 1000);
        if (resta > 0) { casaEstado = 'en la casa: salgo en ' + resta + ' s si no vuelve el PK'; return; }
        casa.fase = 'volver'; casa.t = ahora; casa.ultPos = null; casa.ultMovT = ahora;
      }
      if (casa.fase === 'volver') {
        if (ahora - casa.ultVisto < 3000) { casa.fase = 'huir'; casa.t = ahora; return; }
        if (casaIrA(L, pos, ahora)) {
          casa.fase = 'vigilar'; casaEstado = 'de vuelta en mi lugar de runeo';
          if (casa.motivo === 'dep') { registrar('depósito: de vuelta a runear'); } else { alertar('casa', '✅ Ya no veo PKs: regresé a mi lugar de runeo.'); }
          casa.motivo = ''; return;
        }
        if (ahora - casa.t > 60000) { casa.fase = 'vigilar'; casaEstado = 'no pude regresar a mi lugar'; return; }
        casaEstado = 'regresando a mi lugar de runeo';
      }
    } catch (e) { registrar('casa: ' + e.message); }
  }
  function casaMarcar(cual) {
    var pos = posJug();
    if (!pos) { toast('Entra con tu personaje primero'); return; }
    cfg[cual] = [pos.x, pos.y, pos.z]; guardarCfg(); casaPintar();
    toast((cual === 'casaLugar' ? 'Lugar de runeo' : 'Casilla de la casa') + ' marcado: ' + pos.x + ', ' + pos.y + ', ' + pos.z);
  }

  // ---------- Código de referido ----------
  // Cada personaje tiene un código de 6 letras. Si alguien nuevo compra con tu código, Osbeliaal te regala 3 días.
  var REF_ALFA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  var refCodigos = {};
  function codigoReferido(nombre) {
    var n = licCharNorm(nombre);
    if (refCodigos[n]) { return Promise.resolve(refCodigos[n]); }
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode('MBHR|' + n)).then(function (b) {
      var u = new Uint8Array(b), c = '';
      for (var i = 0; i < 6; i++) { c += REF_ALFA[u[i] % REF_ALFA.length]; }
      refCodigos[n] = c; return c;
    });
  }


  // ---------- Autohaste (Combate) ----------
  var hasteProx = 0, hasteFallos = 0, hasteEstado = 'apagado', hasteUsos = 0;
  var HASTE_COSTO = { 'utani hur': 60, 'utani gran hur': 100 };
  function tengoHaste() {
    try {
      var p = window.gameClient.player, CM = (typeof ConditionManager !== 'undefined') ? ConditionManager.prototype : {};
      if (typeof p.hasCondition !== 'function') { return null; }
      return p.hasCondition(CM.HASTE !== undefined ? CM.HASTE : 14) || p.hasCondition(CM.STRONG_HASTE !== undefined ? CM.STRONG_HASTE : 17);
    } catch (e) { return null; }
  }
  function autoHaste(ahora, mp, porCaza) {
    if (!cfg.autoHasteOn && !porCaza) { hasteEstado = 'apagado'; return; }
    var h = tengoHaste();
    if (h === null) { hasteEstado = 'no puedo leer el haste'; return; }
    if (h) { hasteEstado = 'con haste'; hasteFallos = 0; return; }
    if (ahora < hasteProx) { return; }
    try { if (estaEnPZ(ahora)) { hasteEstado = 'en protection zone'; return; } } catch (e) {}
    var hech = String(cfg.autoHasteHechizo || 'utani hur').trim().toLowerCase();
    var costo = Number(cfg.autoHasteMana) > 0 ? Number(cfg.autoHasteMana) : (HASTE_COSTO[hech] || 60);
    if (!mp || mp.actual < costo) { hasteEstado = 'sin maná para ' + hech + ' (' + (mp ? mp.actual : '?') + '/' + costo + ')'; hasteProx = ahora + 1500; return; }
    try { decir(hech, metodo); hasteUsos++; } catch (e) { registrar('autohaste: ' + e.message); }
    hasteFallos++;
    // si tras varios intentos no aparece el haste (hechizo no aprendido, exhausto...), espera más
    hasteProx = ahora + (hasteFallos >= 3 ? 15000 : 2200 + Math.random() * 800);
    hasteEstado = (porCaza && !cfg.autoHasteOn ? '[caza] ' : '') + 'lancé ' + hech + (hasteFallos >= 3 ? ' (no aparece el haste: reintento en 15 s)' : '');
  }

  // ---------- Colmena (Nest): defensa de la party con runas ----------
  var colAgresores = {};   // id -> { t, name, tipo, victima }
  var colObj = null;       // enfrentamiento: { id, cr, esJugador, origen, desde, ultVisto, ultPos }
  var colRunaProx = 0, colPendiente = null, colRunaT = 0, colEstado = 'apagada', colChasePrev = '', colLootPaso = null, colVolverA = null, colGancho = false, colAvisados = {};
  function colAliados() { return String(cfg.colMiembros || '').split(',').map(function (x) { return x.trim().toLowerCase(); }).filter(Boolean); }
  function esDeLaColmena(cr) {
    try {
      var p = window.gameClient.player;
      if (!cr) { return false; }
      if (cr === p) { return true; }
      if (cr.type === 0 && Number(cr.shield) > 0 && Number(p.shield) > 0) { return true; }   // escudo de party
      return colAliados().indexOf(String(cr.name || '').toLowerCase()) >= 0;
    } catch (e) { return false; }
  }
  // Ganchos en el manejador de paquetes. Se marcan en el propio objeto (no en una variable global),
  // así que si el juego se reconecta y crea un manejador nuevo, se vuelven a poner solos.
  var colGolpes = {};   // "x,y,z" -> { t, tipo }: sangre / golpe bloqueado en esa casilla
  var COL_EFECTOS_GOLPE = { 1: 1, 2: 1, 4: 1 };   // sangre, pérdida de energía, golpe bloqueado
  function colInstalarGancho() {
    var ph = null; try { ph = window.gameClient.networkManager.packetHandler; } catch (e) {}
    if (!ph || ph.__colmenaGancho) { return; }
    ph.__colmenaGancho = true;
    colGancho = true;
    if (typeof ph.handleDamageEvent === 'function') {
      var origD = ph.handleDamageEvent;
      ph.handleDamageEvent = function (packet) {
        try {
          if ((cfg.colOn || defActiva()) && packet && packet.source) {
            var w = window.gameClient.world, src = w.getCreature(packet.source), tgt = w.getCreature(packet.target);
            if (cfg.colOn && src && tgt && esDeLaColmena(tgt) && !esDeLaColmena(src)) { colAnotar(src, tgt.name, Date.now()); }
            if (defActiva() && src && tgt && tgt === window.gameClient.player) { defAnotar(src, Date.now(), 'me hizo daño'); }
          }
        } catch (e) {}
        return origD.apply(this, arguments);
      };
    }
    if (typeof ph.handleSendMagicEffect === 'function') {
      var origM = ph.handleSendMagicEffect;
      ph.handleSendMagicEffect = function (packet) {
        try {
          var q = packet && packet.position;
          if ((cfg.colOn || defActiva()) && q && COL_EFECTOS_GOLPE[packet.type]) { colGolpes[q.x + ',' + q.y + ',' + q.z] = { t: Date.now(), tipo: packet.type }; }
        } catch (e) {}
        return origM.apply(this, arguments);
      };
    }
  }
  // Runa de ataque en las mochilas abiertas: la elegida, o la mejor que haya
  var RUNAS_ATAQUE = ['sudden death', 'heavy magic missile', 'explosion', 'great fireball', 'fireball', 'icicle', 'stalagmite', 'stone shower', 'thunderstorm', 'avalanche', 'light magic missile'];
  function colBuscarRuna(pref) {
    var quiero = String(pref !== undefined ? pref : (cfg.colRuna || '')).trim().toLowerCase(), cs = contenedores(), mejor = null, mejorR = 99;
    for (var c = 0; c < cs.length; c++) {
      if (esCadaverCont(cs[c]) || !cs[c].slots) { continue; }
      for (var i = 0; i < cs[c].slots.length; i++) {
        var it = cs[c].slots[i] && cs[c].slots[i].item; if (!it) { continue; }
        var n = nombreItem(it.id).toLowerCase(); if (!/rune$/.test(n)) { continue; }
        if (quiero) { if (n.indexOf(quiero) >= 0) { return { which: cs[c], index: i, item: it, name: n }; } continue; }
        for (var r = 0; r < RUNAS_ATAQUE.length; r++) { if (n.indexOf(RUNAS_ATAQUE[r]) === 0 && r < mejorR) { mejorR = r; mejor = { which: cs[c], index: i, item: it, name: n }; } }
      }
    }
    return mejor;
  }
  // Detección (el juego no avisa de los golpes a otros, así que se combinan varias pistas):
  //  1) quien me ataca a mí (pista del servidor __attackingMeUntil) -> además se avisa a las otras pestañas
  //  2) avisos de otras pestañas de la colmena (mismo navegador, por localStorage)
  //  3) un compañero pierde vida: quien le disparó (__lastShotAt) o un jugador con calavera / monstruo pegado a él
  var KEY_COL_AVISO = 'minibiaHelperColmenaAviso';
  var colVidas = {};   // id de compañero -> { hp, bajoT }
  // Lo que está entrenando cada pestaña (para no confundir los golpes del Training con un ataque)
  var KEY_TRAIN_T = 'minibiaHelperTrainT';
  function colEntrenamiento(ahora) {
    var r = { objetivos: {}, nombres: {} };
    try {
      var mapa = JSON.parse(localStorage.getItem(KEY_TRAIN_T) || '{}') || {};
      Object.keys(mapa).forEach(function (k) {
        var e = mapa[k]; if (!e || ahora - e.t > 6000) { return; }
        (e.objetivos || []).forEach(function (n) { r.objetivos[String(n).toLowerCase()] = 1; });
        (e.nombres || []).forEach(function (n) { r.nombres[String(n).toLowerCase()] = 1; });
      });
    } catch (e) {}
    if (cfg.trainOn) {
      trainNombres().forEach(function (n) { r.nombres[n] = 1; r.objetivos[n] = 1; });
    }
    return r;
  }
  function colAnotar(cr, victima, ahora, deOtraPestana, motivo) {
    if (!cr || esDeLaColmena(cr) || cr.masterId) { return; }
    var nuevo = !colAgresores[cr.id], prev = colAgresores[cr.id];
    colAgresores[cr.id] = { t: ahora, name: cr.name, tipo: cr.type, victima: victima, motivo: (deOtraPestana && prev && prev.motivo) ? prev.motivo : (motivo || (deOtraPestana ? 'aviso de otra pestaña' : 'me atacó')) };
    if (nuevo) { registrar('colmena: ' + cr.name + ' ataca a ' + victima + ' (' + colAgresores[cr.id].motivo + ')'); }
    if (deOtraPestana) { return; }
    // avisar a las otras pestañas de la colmena (mismo navegador)
    try {
      var mapa = JSON.parse(localStorage.getItem(KEY_COL_AVISO) || '{}');
      if (!mapa || typeof mapa !== 'object' || Array.isArray(mapa) || mapa.id) { mapa = {}; }
      Object.keys(mapa).forEach(function (k) { if (!mapa[k] || ahora - mapa[k].t > 10000) { delete mapa[k]; } });
      mapa[cr.name] = { name: cr.name, victima: victima, t: ahora };
      localStorage.setItem(KEY_COL_AVISO, JSON.stringify(mapa));
    } catch (e) {}
  }
  var colSkulls = {};   // id de jugador ajeno -> calavera anterior
  function colDetectar(pos, ahora) {
    var gc = window.gameClient, yo = gc.player, act = criaturasActivas() || [], pn = performance.now();
    function dist(a, b) { return (a && b && a.z === b.z) ? Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) : 99; }
    var ajenos = act.filter(function (c) { return c && c !== yo && !esDeLaColmena(c) && !c.masterId && vidaDe(c) !== 0; });

    // 1) el servidor dice que alguien me pega (no siempre lo manda: con espada no llega)
    var ent0 = colEntrenamiento(ahora);
    ajenos.forEach(function (cr) {
      try {
        if (ent0.nombres[String(cr.name || '').toLowerCase()]) { return; }   // el monstruo de Training (p. ej. Monk) me pega: es normal
        if (cr.__attackingMeUntil && cr.__attackingMeUntil > pn) { colAnotar(cr, yo.name, ahora, false, 'el servidor confirma que me pegó'); }
      } catch (e) {}
    });

    // 2) avisos de las otras pestañas (por nombre, porque el id puede cambiar al reconectar)
    try {
      var mapa = JSON.parse(localStorage.getItem(KEY_COL_AVISO) || '{}');
      if (mapa && typeof mapa === 'object' && !mapa.id) {
        Object.keys(mapa).forEach(function (k) {
          var av = mapa[k]; if (!av || ahora - av.t > 8000) { return; }
          var cra = ajenos.filter(function (c) { return c.name === av.name; })[0];
          if (cra && !ent0.nombres[String(cra.name || '').toLowerCase()]) { colAnotar(cra, av.victima, ahora, true); }
        });
      }
    } catch (e) {}

    // 3) compañeros que reciben golpes. Reglas ESTRICTAS (nunca culpar a un inocente):
    //    - los golpes del Training (entre la party o a un monstruo de la lista) no cuentan;
    //    - un jugador solo es culpable si tiene calavera (atacar a alguien sin marca la da) y
    //      además le disparó desde su casilla exacta o está pegado a él cuando le sale sangre.
    var ent = colEntrenamiento(ahora), tiros = gc.__lastShotAt;
    act.forEach(function (m) {
      try {
        if (!m || !esDeLaColmena(m)) { return; }
        if (ent.objetivos[String(m.name || '').toLowerCase()]) { return; }   // lo están entrenando: su sangre es del Training
        var mq = posDe(m); if (!mq || mq.z !== pos.z) { return; }
        var g = colGolpes[mq.x + ',' + mq.y + ',' + mq.z];
        var golpeado = !!(g && ahora - g.t < 1500);
        var hp = vidaDe(m), v = colVidas[m.id];
        if (!v) { v = colVidas[m.id] = { hp: hp, bajoT: 0 }; }
        if (hp !== null && v.hp !== null && hp < v.hp) { v.bajoT = ahora; }
        v.hp = hp;
        function sospechoso(c) {
          if (ent.nombres[String(c.name || '').toLowerCase()]) { return false; }   // está en una lista de Training (p. ej. Monk)
          return c.type === 1 || (c.type === 0 && Number(c.skull) >= 3);
        }
        // a) le dispararon a distancia desde la casilla EXACTA de alguien
        if (tiros && typeof tiros.get === 'function') {
          var sh = tiros.get(mq.x + ',' + mq.y + ',' + mq.z);
          if (sh && pn - sh.t < 1500 && sh.from) {
            ajenos.forEach(function (c) { var cq = posDe(c); if (cq && cq.x === sh.from.x && cq.y === sh.from.y && cq.z === sh.from.z && sospechoso(c)) { colAnotar(c, m.name, ahora, false, 'le disparó'); } });
          }
        }
        // b) cuerpo a cuerpo: sale sangre (o baja su vida) y está pegado a él
        if (golpeado || (v.bajoT && ahora - v.bajoT < 1500)) {
          ajenos.forEach(function (c) { if (dist(posDe(c), mq) <= 1 && sospechoso(c)) { colAnotar(c, m.name, ahora, false, 'pegado y con sangre'); } });
        }
      } catch (e) {}
    });
    // recordar calaveras para el próximo ciclo
    ajenos.forEach(function (c) { if (c.type === 0) { colSkulls[c.id] = c.skull; } });
    Object.keys(colGolpes).forEach(function (k) { if (ahora - colGolpes[k].t > 5000) { delete colGolpes[k]; } });
  }
  function colElegir(pos) {
    var ahora = Date.now(), w = window.gameClient.world, mejor = null, mejorP = -1;
    Object.keys(colAgresores).forEach(function (id) {
      var a = colAgresores[id];
      if (ahora - a.t > 15000) { delete colAgresores[id]; return; }
      var cr = null; try { cr = w.getCreature(Number(id)); } catch (e) {}
      if (!cr || vidaDe(cr) === 0) { delete colAgresores[id]; return; }
      var esJ = cr.type === 0;
      if (esJ ? !cfg.colPKs : !cfg.colMonstruos) { return; }
      var q = posDe(cr); if (!q || q.z !== pos.z) { return; }
      var dx = Math.abs(q.x - pos.x), dy = Math.abs(q.y - pos.y);
      if (dx > 7 || dy > 5) { return; }
      var prio = (esJ ? 100 : 0) + (10 - Math.max(dx, dy)) + (ahora - a.t < 3000 ? 5 : 0);
      if (prio > mejorP) { mejorP = prio; mejor = cr; }
    });
    return mejor;
  }
  // Retrasos "humanos": cada personaje tiene su turno en la cadena (según su nombre) más un azar,
  // así no reaccionan todos en el mismo instante ni tiran runas al mismo ritmo exacto.
  function colAzar(a, b) { return a + Math.random() * (b - a); }
  function colTurno() {
    var n = String(charActual || ''), h = 0;
    for (var i = 0; i < n.length; i++) { h = (h * 31 + n.charCodeAt(i)) >>> 0; }
    return h % 4;   // 0..3
  }
  function colRango(a, b, defA, defB, piso) {
    a = Number(a); b = Number(b);
    if (!(a >= 0)) { a = defA; } if (!(b >= 0)) { b = defB; }
    a = Math.max(piso, a); b = Math.max(piso, b);
    return a <= b ? [a, b] : [b, a];
  }
  // Reacción: cada personaje tiene su turno en la cadena (60 % del rango según el turno + 40 % al azar)
  function colReaccion() {
    if (!cfg.colHumano) { return 0; }
    var r = colRango(cfg.colReacMin, cfg.colReacMax, 300, 2500, 0), ancho = r[1] - r[0];
    return Math.round(r[0] + (colTurno() / 3) * ancho * 0.6 + Math.random() * ancho * 0.4);
  }
  function colIntervaloRuna() {
    if (!cfg.colHumano) { return 2050; }
    var r = colRango(cfg.colRunaMin, cfg.colRunaMax, 2200, 3000, 2050);
    var t = colAzar(r[0], r[1]);
    if (Math.random() < 0.15) { t += colAzar(500, 1400); }   // de vez en cuando, una pausa más larga
    return Math.round(t);
  }
  // PVP Lock del juego: con el candado puesto el servidor no deja atacar jugadores
  // Se guarda en el navegador por si la página se recarga a mitad de la pelea: al volver se pone otra vez.
  var KEY_COL_LOCK = 'minibiaHelperColmenaLock';
  var colLockQuitado = false, colLockAviso = 0;
  function pvpLockBtn() { return document.getElementById('pk-lock-btn') || document.getElementById('mobile-pk-lock-btn'); }
  function pvpLockPuesto() { var b = pvpLockBtn(); return !!(b && b.classList.contains('active')); }
  function colRestaurarLock() {
    if (typeof comboActivo === 'function' && comboActivo()) { return; }
    var marcado = colLockQuitado;
    if (!marcado && charActual) { try { marcado = !!localStorage.getItem(KEY_COL_LOCK + '::' + charActual); } catch (e) {} }
    if (!marcado) { return; }
    var b0 = pvpLockBtn(); if (!b0) { colLockQuitado = true; return; }   // la interfaz aún no carga: se intenta en el siguiente ciclo
    colLockQuitado = false;
    try { localStorage.removeItem(KEY_COL_LOCK + '::' + (charActual || '')); } catch (e) {}
    try { if (!pvpLockPuesto()) { var b = pvpLockBtn(); if (b) { b.click(); registrar('colmena: PVP Lock puesto de nuevo'); } } } catch (e) {}
  }
  function colTerminar(motivo) {
    if (colObj && colObj.esJugador && colChasePrev && chaseActivo() !== colChasePrev) { aplicarModoCombate(null, colChasePrev); }
    var origen = colObj ? colObj.origen : null;
    colObj = null;
    colRestaurarLock();
    if (cfg.colVolver && origen) { colVolverA = { x: origen.x, y: origen.y, z: origen.z, t: Date.now() }; }
    colEstado = motivo;
    registrar('colmena: ' + motivo);
  }
  function colLoop() {
    try {
      if (!cfg.colOn || colmenaBloqueo()) { colEstado = cfg.colOn ? 'solo con licencia Founder' : 'apagada'; colObj = null; colRestaurarLock(); return; }
      var gc = window.gameClient; if (!gc || !gc.player) { return; }
      colInstalarGancho();
      if (pausaGM) { colEstado = 'en pausa (GM)'; return; }
      if (cazaCorriendo) { colEstado = 'en espera (Cave hunt activo)'; return; }
      var pos = posJug(); if (!pos) { return; }
      var ahora = Date.now();

      // 1) Loot del PK muerto
      if (colLootPaso) { colLoot(pos, ahora); return; }

      // 2) Enfrentamiento en curso
      if (colObj) {
        colDetectar(pos, ahora);
        var cr = colObj.cr, vida = vidaDe(cr), q = posDe(cr);
        if (vida === 0) {
          var nm = cr.name;
          if (colObj.esJugador && cfg.colLoot && q) { colLootPaso = { x: q.x, y: q.y, z: q.z, t0: ahora, paso: 'abrir', tx: 0, nombre: nm }; }
          alertar('colmena', '☠ Colmena: ' + nm + ' eliminado.');
          colTerminar((colObj.esJugador ? 'PK ' : '') + nm + ' eliminado');
          return;
        }
        var visible = q && q.z === pos.z && Math.abs(q.x - pos.x) <= 7 && Math.abs(q.y - pos.y) <= 5;
        if (visible) { colObj.ultVisto = ahora; }
        if (ahora - colObj.ultVisto > 8000 || ahora - colObj.desde > 180000) { try { soltarObjetivo(); } catch (e) {} colTerminar(cr.name + ' se fue'); return; }
        // PVP Lock: quitarlo (si está permitido) o avisar, porque así el servidor rechaza el ataque
        if (colObj.esJugador && pvpLockPuesto()) {
          if (cfg.colQuitarLock) {
            if (ahora - (colObj.lockT || 0) > 1500) { colObj.lockT = ahora; try { pvpLockBtn().click(); colLockQuitado = true; try { localStorage.setItem(KEY_COL_LOCK + '::' + (charActual || ''), '1'); } catch (e2) {} registrar('colmena: PVP Lock quitado para defender'); } catch (e) {} }
          } else {
            colEstado = 'PVP Lock puesto: no puedo atacar a ' + cr.name;
            if (ahora - colLockAviso > 30000) { colLockAviso = ahora; alertar('colmena', '🔒 Colmena: ' + cr.name + ' ataca a la party pero tienes el PVP Lock puesto.'); }
            return;
          }
          colEstado = 'quitando el PVP Lock para atacar a ' + cr.name;
          return;
        }
        // mantener el objetivo
        var tg = null; try { tg = gc.player.hasTarget() ? gc.player.getTarget() : null; } catch (e) {}
        if (tg !== cr && visible && ahora - (colObj.fijarT || 0) > 2500) { colObj.fijarT = ahora; fijarObjetivo(cr); }
        if (colObj.esJugador && chaseActivo() !== 'chase' && ahora - (colObj.chaseT || 0) > 3000) { colObj.chaseT = ahora; aplicarModoCombate(null, 'chase'); }
        // runa cada ~2 s (respetando el cooldown del juego)
        var hm = hotbarMgr();
        var listo = !hm || !((hm.__runeAttackUntil || 0) > performance.now() || (hm.__runeAttackGlobalUntil || 0) > performance.now());
        // si el juego no deja fijarlo como objetivo (p. ej. modo seguro), la runa va directo a su casilla
        var porCasilla = tg !== cr && ahora - colObj.desde > 2500;
        if ((tg === cr || porCasilla) && visible && listo && ahora >= colRunaProx && lineaVision(pos, q.x, q.y)) {
          var rn = colBuscarRuna();
          if (!rn) { colEstado = 'sin runas de ataque en la mochila abierta'; }
          else {
            try {
              if (!porCasilla && hm && typeof hm.__useItemOnTarget === 'function') { hm.__useItemOnTarget({ which: rn.which, index: rn.index }, rn.item); }
              else { gc.mouse.__handleItemUseWith({ which: rn.which, index: rn.index }, { which: gc.world.getTileFromWorldPosition(posObj(q.x, q.y, q.z)), index: 255 }); }
              colRunaT = ahora; colRunaProx = ahora + colIntervaloRuna();
            } catch (e) { registrar('colmena runa: ' + e.message); }
          }
        }
        colEstado = 'atacando a ' + cr.name + (colObj.esJugador ? ' (PK)' : '') + ' con ' + ((colBuscarRuna() || {}).name || 'runa');
        return;
      }

      // sin pelea: el PVP Lock tiene que estar puesto otra vez
      colRestaurarLock();
      // 3) ¿Alguien ataca a la colmena?
      colDetectar(pos, ahora);
      var nuevo = colElegir(pos);
      // tiempo de reacción antes de entrar a la pelea (distinto en cada personaje)
      if (nuevo && cfg.colHumano) {
        if (!colPendiente || colPendiente.id !== nuevo.id) { colPendiente = { id: nuevo.id, t: ahora + colReaccion() }; }
        if (ahora < colPendiente.t) { colEstado = 'reaccionando a ' + nuevo.name; return; }
      }
      colPendiente = null;
      if (nuevo) {
        colRunaProx = ahora + (cfg.colHumano ? Math.round(colAzar(150, 700)) : 0);
        colObj = { fijarT: ahora, id: nuevo.id, cr: nuevo, esJugador: nuevo.type === 0, origen: colVolverA ? { x: colVolverA.x, y: colVolverA.y, z: colVolverA.z } : pos, desde: ahora, ultVisto: ahora };
        colVolverA = null;
        if (colObj.esJugador) { colChasePrev = chaseActivo(); }
        pararCaminata(); fijarObjetivo(nuevo);
        var ag = colAgresores[nuevo.id];
        if (colObj.esJugador && (!colAvisados[nuevo.id] || ahora - colAvisados[nuevo.id] > 60000)) {
          colAvisados[nuevo.id] = ahora;
          alertar('colmena', '⚔ Colmena: ' + nuevo.name + ' atacó a ' + (ag ? ag.victima : 'la party') + (ag && ag.motivo ? ' (' + ag.motivo + ')' : '') + '. ¡Defendiendo!');
        }
        colEstado = 'defendiendo de ' + nuevo.name;
        return;
      }

      // 4) Volver a donde estaba
      if (colVolverA) {
        if (pos.x === colVolverA.x && pos.y === colVolverA.y && pos.z === colVolverA.z) { colVolverA = null; colEstado = 'de vuelta en mi sitio'; return; }
        if (pos.z !== colVolverA.z || ahora - colVolverA.t > 60000) { colVolverA = null; colEstado = 'no pude volver a mi sitio'; return; }
        if (!autoCaminando() && ahora - (colVolverA.ct || 0) > 2000) { colVolverA.ct = ahora; caminarA(colVolverA.x, colVolverA.y, colVolverA.z); }
        colEstado = 'volviendo a mi sitio';
        return;
      }
      colEstado = 'vigilando a la party';
    } catch (e) { registrar('colmena: ' + e.message); }
  }
  function colLoot(pos, ahora) {
    var L = colLootPaso, gc = window.gameClient;
    if (ahora - L.t0 > 20000) { cerrarCadaveres(); colLootPaso = null; colEstado = 'loot: tiempo agotado'; return; }
    if (ahora < L.tx) { return; }
    var cad = contenedores().filter(esCadaverCont)[0];
    if (L.paso === 'abrir') {
      if (cad) { L.paso = 'tomar'; L.cont = cad; return; }
      var t = tileEn(L.x, L.y, L.z), idx = -1;
      if (t && t.items) { for (var i = t.items.length - 1; i >= 0; i--) { var it = t.items[i]; if (it && RE_CADAVER.test(nombreItem(it.id)) && typeof it.isContainer === 'function' && it.isContainer()) { idx = i; break; } } }
      if (idx < 0) { colLootPaso = null; colEstado = 'no encuentro el cuerpo de ' + L.nombre; return; }
      try { gc.mouse.use({ which: t, index: idx }); } catch (e) { colLootPaso = null; return; }
      colEstado = 'abriendo el cuerpo de ' + L.nombre;
      L.tx = ahora + 1500;
      return;
    }
    // tomar: un objeto cada 0.7 s, del último al primero, si alcanza la cap
    var c = L.cont, bp = null;
    contenedores().forEach(function (k) { if (!bp && !esCadaverCont(k)) { bp = k; } });
    if (!c || !c.slots || !bp) { cerrarCadaveres(); colLootPaso = null; colEstado = 'loot terminado'; return; }
    var cap = leerCap(), defs = gc.itemDefinitionsByCid || {};
    for (var k = c.slots.length - 1; k >= 0; k--) {
      var itx = c.slots[k] && c.slots[k].item; if (!itx) { continue; }
      if (L.saltar && L.saltar[k]) { continue; }
      var d = defs[itx.id], peso = (d && d.properties && Number(d.properties.weight)) ? Number(d.properties.weight) * (itx.count || 1) / 100 : 0;
      if (cap !== null && peso > cap) { L.saltar = L.saltar || {}; L.saltar[k] = 1; continue; }
      var hueco = 0; for (var h = 0; h < bp.slots.length; h++) { if (!(bp.slots[h] && bp.slots[h].item)) { hueco = h; break; } }
      try { gc.mouse.sendItemMove({ which: c, index: k }, { which: bp, index: hueco }, itx.count || 1); } catch (e) { registrar('loot: ' + e.message); }
      L.saltar = L.saltar || {}; L.saltar[k] = 1;
      colEstado = 'tomando ' + nombreItem(itx.id) + ' de ' + L.nombre;
      L.tx = ahora + 700;
      return;
    }
    cerrarCadaveres(); colLootPaso = null; colEstado = 'loot de ' + L.nombre + ' tomado';
  }
  setInterval(function () { try { lblCol.textContent = 'Colmena: ' + colEstado; } catch (e) {} }, 1000);

  btnCazaIniciar.onclick = function () {
    if (cazaCorriendo) { cazaParar('detenido por ti'); return; }
    if (pausaGM) { pausaGM = false; estabaCorriendo = false; cazaEstabaCorriendo = false; pausaCausa = ''; gmInc = null; botcheck = null; cerrarAviso(); }
    cazaIniciar();
  };
  btnGrabar.onclick = function () {
    if (!grabando) {
      if (cazaCorriendo) { cazaParar('detenido para grabar'); }
      if (!posJug()) { ultimaAccion = 'no puedo leer la posición'; return; }
      instalarGanchosRuta();
      if (ruta.length && confirmTr('Ya hay una ruta de ' + ruta.length + ' puntos.\nAceptar = empezar nueva\nCancelar = añadir al final')) { ruta = []; rutaNombre = ''; }
      grabando = true;
      ultimaAccion = 'grabando ruta: camina con tu personaje';
    } else {
      grabando = false;
      guardarRuta();
      ultimaAccion = 'ruta guardada: ' + ruta.length + ' puntos';
    }
    btnGrabar.textContent = grabando ? '⏹ Detener grabación' : '⏺ Grabar ruta';
  };
  btnBorrarRuta.onclick = function () {
    if (!confirmTr('¿Borrar la ruta de ' + ruta.length + ' puntos?')) { return; }
    ruta = []; guardarRuta(); cazaIdx = 0; rutaNombre = '';
    ultimaAccion = 'ruta borrada';
  };
  btnCopiarRuta.onclick = function () {
    copiarTexto(JSON.stringify({ v: 2, ruta: ruta, objetivos: String(cfg.cazaObjetivos || '') }), function () { ultimaAccion = 'ruta copiada (' + ruta.length + ' puntos)'; }, function () { ultimaAccion = 'no pude copiar la ruta'; });
  };
  btnPegarRuta.onclick = function () {
    pegarTexto(function (tx0) {
      var tx = (tx0 && /"ruta"/.test(tx0)) ? tx0 : promptTr('Pega aquí la ruta copiada:');
      if (!tx) { return; }
      try {
        var o = JSON.parse(tx);
        var r = (Array.isArray(o) ? o : o.ruta).filter(rutaValida);
        if (r.length < 2) { throw new Error('ruta vacía'); }
        ruta = r; guardarRuta(); cazaIdx = 0;
        var objI = (o && !Array.isArray(o) && typeof o.objetivos === 'string') ? o.objetivos.trim() : '';
        if (objI) { ponerObjetivos(objI); }
        ultimaAccion = 'ruta importada: ' + ruta.length + ' puntos' + (objI ? ', monstruos: ' + objI : '');
      } catch (e) { ultimaAccion = 'ruta inválida: ' + e.message; }
    });
  };

  // ---------- Rutas con nombre ----------
  var KEY_RUTAS_NOM = 'minibiaHelperRutasNombradas';
  var rutaNombre = '';
  function rutasGuardadas() { var o = leerJSON(KEY_RUTAS_NOM, {}); return (o && typeof o === 'object') ? o : {}; }
  function pintarRutasNom() {
    var o = rutasGuardadas(), nombres = Object.keys(o).sort(function (a, b) { return a.localeCompare(b); });
    selRutas.innerHTML = '';
    if (!nombres.length) {
      var op = document.createElement('option'); op.value = ''; op.textContent = '(sin rutas guardadas)'; selRutas.appendChild(op);
    }
    nombres.forEach(function (n) {
      var op2 = document.createElement('option'); op2.value = n;
      var nObj = (o[n] && typeof o[n].objetivos === 'string') ? o[n].objetivos.split(',').filter(function (x) { return x.trim(); }).length : 0;
      op2.textContent = n + ' (' + ((o[n] && o[n].ruta) ? o[n].ruta.length : 0) + ' pts' + (nObj ? ', ' + nObj + ' monstruos' : '') + ')';
      selRutas.appendChild(op2);
    });
    if (rutaNombre && o[rutaNombre]) { selRutas.value = rutaNombre; }
    lblRutaActual.textContent = 'Ruta actual: ' + (rutaNombre || 'sin nombre') + ' · ' + ruta.length + ' puntos';
  }
  btnGuardarRutaNom.onclick = function () {
    var n = String(inpRutaNombre.value || '').trim() || rutaNombre;
    if (!n) { ultimaAccion = 'escribe un nombre para la ruta'; inpRutaNombre.focus(); return; }
    if (ruta.length < 2) { ultimaAccion = 'graba una ruta primero'; return; }
    var o = rutasGuardadas();
    o[n] = { ruta: ruta.slice(), t: Date.now(), objetivos: String(cfg.cazaObjetivos || '') };
    if (!escribirJSON(KEY_RUTAS_NOM, o)) { ultimaAccion = 'no pude guardar la ruta'; return; }
    rutaNombre = n; inpRutaNombre.value = '';
    pintarRutasNom();
    ultimaAccion = 'ruta "' + n + '" guardada (' + ruta.length + ' puntos)';
  };
  btnCargarRutaNom.onclick = function () {
    var n = selRutas.value, o = rutasGuardadas();
    if (!n || !o[n] || !Array.isArray(o[n].ruta)) { ultimaAccion = 'elige una ruta guardada'; return; }
    if (cazaCorriendo) { cazaParar('detenido para cambiar de ruta'); }
    if (grabando) { grabando = false; btnGrabar.textContent = '⏺ Grabar ruta'; }
    ruta = o[n].ruta.filter(rutaValida); guardarRuta(); cazaIdx = 0; rutaNombre = n;
    var conObj = typeof o[n].objetivos === 'string' && o[n].objetivos.trim();
    if (conObj) { ponerObjetivos(o[n].objetivos); }
    pintarRutasNom();
    ultimaAccion = 'ruta "' + n + '" cargada (' + ruta.length + ' puntos' + (conObj ? ', monstruos: ' + o[n].objetivos : '') + ')';
  };
  btnBorrarRutaNom.onclick = function () {
    var n = selRutas.value, o = rutasGuardadas();
    if (!n || !o[n]) { return; }
    if (!confirmTr('¿Borrar la ruta guardada "' + n + '"?')) { return; }
    delete o[n]; escribirJSON(KEY_RUTAS_NOM, o);
    if (rutaNombre === n) { rutaNombre = ''; }
    pintarRutasNom();
    ultimaAccion = 'ruta "' + n + '" borrada';
  };
  pintarRutasNom();
  setInterval(function () { try { lblRutaActual.textContent = 'Ruta actual: ' + (rutaNombre || 'sin nombre') + ' · ' + ruta.length + ' puntos' + (grabando ? ' (grabando)' : ''); } catch (e) {} }, 1500);

  btnAddObj.onclick = function () {
    var t = leerRuta(window.gameClient, 'player.__target'), n = '';
    try { n = t ? String(t.name) : ''; } catch (e) {}
    if (!n) { ultimaAccion = 'añadir objetivo: selecciona un monstruo en Battle'; return; }
    if (listaObjetivos().indexOf(n.toLowerCase()) < 0) {
      ponerObjetivos((cfg.cazaObjetivos ? cfg.cazaObjetivos + ', ' : '') + n);
    }
    ultimaAccion = 'objetivos: ' + cfg.cazaObjetivos;
  };
  // Monstruos que se ven en pantalla (sin jugadores, NPCs ni invocaciones)
  function monstruosEnPantalla() {
    var pos = posJug(), act = criaturasActivas(), res = {};
    if (act && pos) {
      act.forEach(function (c) {
        try {
          if (!c || c.type !== 1 || c.masterId || vidaDe(c) === 0) { return; }
          var q = posDe(c); if (!q || q.z !== pos.z || Math.abs(q.x - pos.x) > 8 || Math.abs(q.y - pos.y) > 6) { return; }
          var n = String(c.name || '').trim(); if (n) { res[n] = (res[n] || 0) + 1; }
        } catch (e) {}
      });
      return res;
    }
    return nombresCercanos();
  }
  btnScan.onclick = function () {
    var m = monstruosEnPantalla(), ya = listaObjetivos(), nuevos = [];
    Object.keys(m).forEach(function (n) { if (ya.indexOf(n.toLowerCase()) < 0 && nuevos.indexOf(n) < 0) { nuevos.push(n); } });
    if (!Object.keys(m).length) { ultimaAccion = 'no veo monstruos en pantalla'; toast('No veo monstruos en pantalla'); return; }
    if (!nuevos.length) { ultimaAccion = 'ya tienes todos: ' + cfg.cazaObjetivos; toast('Ya estaban todos en tu lista'); return; }
    ponerObjetivos((cfg.cazaObjetivos && cfg.cazaObjetivos.trim() ? cfg.cazaObjetivos.replace(/[\s,]+$/, '') + ', ' : '') + nuevos.join(', '));
    ultimaAccion = 'agregados: ' + nuevos.join(', ');
    toast('Agregados: ' + nuevos.join(', '));
  };
  // Pone la lista de monstruos y la guarda también en la ruta con nombre cargada
  function ponerObjetivos(txt) {
    cfg.cazaObjetivos = String(txt || ''); guardarCfg();
    try { fCazaObj.input.value = cfg.cazaObjetivos; } catch (e) {}
    objetivosARuta();
  }
  function objetivosARuta() {
    if (!rutaNombre) { return; }
    var o = rutasGuardadas();
    if (o[rutaNombre] && o[rutaNombre].objetivos !== cfg.cazaObjetivos) { o[rutaNombre].objetivos = String(cfg.cazaObjetivos || ''); escribirJSON(KEY_RUTAS_NOM, o); }
  }
  var objRutaT = null;
  fCazaObj.input.addEventListener('input', function () { clearTimeout(objRutaT); objRutaT = setTimeout(objetivosARuta, 600); });
  btnProbarMov.onclick = function () {
    if (!posJug()) { ultimaAccion = 'prueba de movimiento: no puedo leer la posición'; return; }
    var m = 0, d = 0;
    ultimaAccion = 'probando movimiento...';
    (function intento() {
      if (m > 2) { ultimaAccion = 'ningún método movió al personaje'; return; }
      var p0 = posJug();
      moverDir(DIRS4[d], m);
      setTimeout(function () {
        var p1 = posJug();
        if (p0 && p1 && !mismaPos(p0, p1)) {
          cfg.cazaMetodoMov = m; guardarCfg(); fCazaMetodo.input.value = m;
          ultimaAccion = 'método de movimiento ' + m + ' funciona';
          return;
        }
        d++;
        if (d > 3) { d = 0; m++; }
        intento();
      }, 900);
    })();
  };

  // ---------- Casillas resaltadas, timers de hechizos y cuenta atrás de magic wall ----------
  // Todo se dibuja en un canvas transparente que se pega justo encima del canvas del juego (dentro del
  // mismo contenedor, así hereda su escala), y no toca nada del juego.
  var casillas = [];                          // [x, y, z]
  function casillaValida(c) { return Array.isArray(c) && typeof c[0] === 'number' && typeof c[1] === 'number' && typeof c[2] === 'number'; }
  function guardarCasillas() { if (datosListos) { escribirJSON(kChar(KEY_TILES), casillas); } }
  function actualizarLblCas() { lblCas.textContent = 'Casillas resaltadas: ' + casillas.length; }
  function indiceCasilla(x, y, z) {
    for (var i = 0; i < casillas.length; i++) { if (casillas[i][0] === x && casillas[i][1] === y && casillas[i][2] === z) { return i; } }
    return -1;
  }
  function alternarCasilla(x, y, z) {
    var i = indiceCasilla(x, y, z);
    if (i >= 0) { casillas.splice(i, 1); }
    else { casillas.push([x, y, z]); if (casillas.length > 400) { casillas.shift(); } }
    guardarCasillas();
    actualizarLblCas();
  }

  var timers = [];                            // { clave, etq, fin, dur, tile: [x,y,z] | null }
  function iniciarTimer(clave, etq, seg, tile, auto) {
    var ahora = Date.now(), fin = ahora + seg * 1000;
    for (var i = 0; i < timers.length; i++) {
      if (timers[i].clave === clave) { timers[i].fin = fin; timers[i].dur = seg; timers[i].etq = etq; timers[i].ini = ahora; timers[i].auto = !!auto; return; }
    }
    timers.push({ clave: clave, etq: etq, fin: fin, dur: seg, tile: tile || null, ini: ahora, auto: !!auto });
    if (timers.length > 60) { timers.shift(); }
  }
  function quitarTimer(clave) { timers = timers.filter(function (t) { return t.clave !== clave; }); }

  // --- hechizos con duración ---
  var hechCache = { txt: null, lista: [] };
  function listaHechizos() {
    var txt = String(cfg.hechizosTimer || '');
    if (hechCache.txt !== txt) {
      hechCache.txt = txt;
      hechCache.lista = txt.split(';').map(function (p) {
        var m = p.split('=');
        var pal = (m[0] || '').trim().toLowerCase().replace(/\s+/g, ' '), seg = Number(m[1]);
        return (pal && seg > 0) ? { pal: pal, seg: seg, etq: (m[2] || pal).trim() } : null;
      }).filter(Boolean).sort(function (a, b) { return b.pal.length - a.pal.length; });
    }
    return hechCache.lista;
  }
  var ultHechT = {};
  // exacto = true: es lo que enviaste tú (solo las palabras). false: línea de chat que termina en las palabras
  function hechizoDicho(texto, exacto) {
    if (!cfg.tmOn) { return false; }
    var t = String(texto || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (!t || t.length > 200) { return false; }
    var l = listaHechizos();
    for (var i = 0; i < l.length; i++) {
      var h = l[i], ok;
      if (exacto) { ok = t === h.pal; }
      else {
        var fin = t.replace(/[\s.!"']+$/, '');
        ok = fin.slice(-h.pal.length) === h.pal && (fin.length === h.pal.length || /[\s:'"\]]/.test(fin.charAt(fin.length - h.pal.length - 1)));
      }
      if (ok) {
        var ahora = Date.now();
        if (ahora - (ultHechT[h.pal] || 0) < 1500) { return true; }
        ultHechT[h.pal] = ahora;
        iniciarTimer('sp:' + h.pal, h.etq, h.seg, null);
        ultimaAccion = 'timer: ' + h.etq + ' ' + h.seg + ' s';
        return true;
      }
    }
    return false;
  }

  // Lo que escribes o lanzas pasa por el chat del juego: se mira el texto sin cambiarlo
  function envolverChat() {
    var cm = chat();
    if (!cm || cm.__mbhEnvuelto) { return; }
    ['sendMessageText', 'handleMessageSend'].forEach(function (n) {
      var orig = cm[n];
      if (typeof orig !== 'function') { return; }
      cm[n] = function (t) {
        try { hechizoDicho(typeof t === 'string' ? t : '', true); } catch (e) {}
        return orig.apply(this, arguments);
      };
    });
    try { cm.__mbhEnvuelto = true; } catch (e) {}
  }

  // Y también las líneas del chat con tu nombre (por si el hechizo sale de una tecla del juego)
  var obsTm = new MutationObserver(function (muts) {
    if (!cfg.tmOn || !charActual || Date.now() - tInicio < 8000) { return; }
    var yo = charActual.toLowerCase(), lineas = [];
    for (var i = 0; i < muts.length; i++) {
      var m = muts[i];
      if (panel.contains(m.target) || avisoEl.contains(m.target)) { continue; }
      if (!(m.target && m.target.closest && m.target.closest('#chat-text-area'))) { continue; }
      for (var j = 0; j < m.addedNodes.length; j++) {
        var tx = textoDe(m.addedNodes[j]).trim().toLowerCase();
        if (tx && tx.length <= 300 && tx.indexOf(yo) >= 0) { lineas.push(tx); }
      }
    }
    if (lineas.length > 12) { return; }          // el juego está redibujando el historial
    lineas.forEach(function (tx) {
      var hm = tx.match(/^(\d{1,2}):(\d{2})\b/);
      if (hm) {
        var d = new Date(), atras = ((d.getHours() * 60 + d.getMinutes()) - (Number(hm[1]) * 60 + Number(hm[2])) + 1440) % 1440;
        if (atras >= 2 && atras <= 1380) { return; }
      }
      try { hechizoDicho(tx, false); } catch (e) { registrar('timer chat: ' + e.message); }
    });
  });
  obsTm.observe(document.body, { childList: true, subtree: true });

  // --- magic wall / wild growth: se busca el item en las casillas que rodean al personaje ---
  // No sé cómo guarda el cliente los items de cada casilla, así que se miran todas las propiedades de la casilla
  // y se toma como item cualquier objeto con un id numérico.
  var NO_ITEM = { __chunk: 1, chunk: 1, monsters: 1, players: 1, creatures: 1, npcs: 1, __deferredCreatures: 1, __position: 1, position: 1, parent: 1, tile: 1, __tile: 1, gameClient: 1 };
  function idDeItem(it) {
    var ks = ['id', '__id', 'itemId', '__itemId', 'sid', 'clientId', '__clientId'];
    for (var i = 0; i < ks.length; i++) { try { var v = it[ks[i]]; if (typeof v === 'number') { return v; } } catch (e) {} }
    try { if (typeof it.getId === 'function') { var g = it.getId(); if (typeof g === 'number') { return g; } } } catch (e) {}
    return null;
  }
  function itemsDeTile(t) {
    var res = [];
    function agregar(o) { if (o && typeof o === 'object' && res.indexOf(o) < 0 && idDeItem(o) !== null) { res.push(o); } }
    var conocidos = ['items', '__items', 'itemStack', '__itemStack', 'things', '__things'];
    for (var a = 0; a < conocidos.length; a++) {
      var col; try { col = t[conocidos[a]]; } catch (e) { continue; }
      valores(col).forEach(agregar);
    }
    var ks; try { ks = Object.keys(t); } catch (e) { return res; }
    for (var j = 0; j < ks.length && j < 60; j++) {
      if (NO_ITEM[ks[j]]) { continue; }
      var v; try { v = t[ks[j]]; } catch (e) { continue; }
      if (!v || typeof v !== 'object') { continue; }
      if (Array.isArray(v) || v instanceof Map || v instanceof Set) { valores(v).forEach(agregar); }
      else if (idDeItem(v) !== null) { agregar(v); }
      else { valores(v).slice(0, 30).forEach(agregar); }
    }
    return res;
  }
  function nombreDeItem(it) {
    try {
      if (typeof it.name === 'string') { return it.name; }
      if (typeof it.getName === 'function') { var n = it.getName(); if (typeof n === 'string') { return n; } }
      if (typeof it.__name === 'string') { return it.__name; }
      var pr = (typeof it.getPrototype === 'function') ? it.getPrototype() : (it.__prototype || it.proto);
      if (pr && pr.properties && typeof pr.properties.name === 'string') { return pr.properties.name; }
      if (pr && typeof pr.name === 'string') { return pr.name; }
    } catch (e) {}
    return '';
  }
  function listaIds(txt) {
    return String(txt || '').split(',').map(function (s) { return Number(s.trim()); }).filter(function (n) { return n > 0; });
  }
  // Runas que dejan un item temporal en la casilla
  function tiposCampo() {
    return [
      { k: 'mw', etq: 'MW', re: /magic\s*wall/i, ids: listaIds(cfg.mwIds), seg: Number(cfg.mwSeg) || 20 },
      { k: 'wg', etq: 'WG', re: /wild\s*growth/i, ids: listaIds(cfg.wgIds), seg: Number(cfg.wgSeg) || 45 }
    ];
  }
  function tipoDeItem(it, tipos) {
    var id = idDeItem(it), nm = null;
    for (var i = 0; i < tipos.length; i++) {
      if (id !== null && tipos[i].ids.indexOf(id) >= 0) { return tipos[i]; }
    }
    nm = nombreDeItem(it);
    if (nm) { for (var j = 0; j < tipos.length; j++) { if (tipos[j].re.test(nm)) { return tipos[j]; } } }
    return null;
  }
  var medidas = {};                            // k -> segundos que duró de verdad la última vez
  function textoMedidas() {
    var ks = Object.keys(medidas);
    return ks.length ? 'Duración medida: ' + ks.map(function (k) { return k.toUpperCase() + ' ' + medidas[k].toFixed(1) + ' s'; }).join(', ') : '';
  }

  var mwConocidos = {}, mwPrimero = true, mwZ = null;
  function mwReiniciar() { mwConocidos = {}; mwPrimero = true; mwZ = null; }
  function mwTick() {
    try {
      if (!cfg.mwOn || !charActual) { return; }
      var p = window.gameClient && window.gameClient.player;
      if (!p) { return; }
      var mio = posJug();
      if (!mio) { return; }
      if (mwZ !== mio.z) { mwReiniciar(); mwZ = mio.z; }
      var tiles = valores(p.__chunk && p.__chunk.tiles);
      if (!tiles.length) { return; }
      var ahora = Date.now(), tipos = tiposCampo(), presentes = {};
      for (var i = 0; i < tiles.length; i++) {
        var t = tiles[i];
        if (!t) { continue; }
        var q = posDe(t);
        if (!q || (typeof q.z === 'number' && q.z !== mio.z)) { continue; }
        var dx = q.x - mio.x, dy = q.y - mio.y;
        if (Math.abs(dx) > 9 || Math.abs(dy) > 7) { continue; }
        var its = itemsDeTile(t), tp = null;
        for (var j = 0; j < its.length && !tp; j++) { tp = tipoDeItem(its[j], tipos); }
        if (!tp) { continue; }
        var k = tp.k + ':' + q.x + ',' + q.y + ',' + mio.z;
        presentes[k] = true;
        if (!(k in mwConocidos)) {
          // una wall que aparece en el borde de la pantalla solo está entrando a la vista; las del primer escaneo ya existían
          var borde = Math.abs(dx) >= 7 || Math.abs(dy) >= 5;
          mwConocidos[k] = { t: ahora, tipo: tp.k, ini: 0 };
          if (!mwPrimero && !borde) { iniciarTimer(k, tp.etq, tp.seg, [q.x, q.y, mio.z], true); mwConocidos[k].ini = ahora; }
        }
        mwConocidos[k].vista = ahora;
      }
      mwPrimero = false;
      Object.keys(mwConocidos).forEach(function (k) {
        var c = mwConocidos[k];
        if (!presentes[k] && ahora - (c.vista || c.t) > 1500) {
          // si la vimos aparecer, sabemos cuánto duró: sirve para confirmar la duración real
          if (c.ini && c.vista && c.vista - c.ini > 3000) { medidas[c.tipo] = (c.vista - c.ini) / 1000; lblTm.textContent = textoMedidas(); }
          delete mwConocidos[k]; quitarTimer(k);
        }
      });
    } catch (e) { registrar('mw: ' + e.message); }
  }

  function timersTick() {
    try {
      envolverChat();
      var ahora = Date.now();
      timers = timers.filter(function (t) { return ahora < t.fin + 800; });
    } catch (e) { registrar('timers: ' + e.message); }
  }

  // --- capa de dibujo ---
  var ovCanvas = null, ovEstilo = '', modoMarcar = false, tipoMarca = 'casilla', barraMarca = null;
  function montarOverlay() {
    if (ovCanvas && ovCanvas.isConnected) { return true; }
    var sc = document.getElementById('screen');
    if (!sc || !sc.parentNode) { return false; }
    ovCanvas = document.createElement('canvas');
    ovCanvas.id = 'mbh-overlay';
    ovCanvas.style.cssText = 'position:absolute;pointer-events:none;z-index:101';
    ovCanvas.addEventListener('mousedown', alClickOverlay);
    ovCanvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    sc.parentNode.insertBefore(ovCanvas, sc.nextSibling);
    ovEstilo = '';
    aplicarModoMarcar();
    return true;
  }
  function aplicarModoMarcar() {
    btnMarcar.textContent = modoMarcar ? '■ Salir del modo marcar' : (ES_MOVIL ? 'Modo marcar' : 'Modo marcar (Ctrl+Shift+K)');
    if (ovCanvas) { ovCanvas.style.pointerEvents = modoMarcar ? 'auto' : 'none'; ovCanvas.style.cursor = modoMarcar ? 'crosshair' : ''; }
    pintarBarraMarca();
  }
  // Barra flotante del modo marcar (en el teléfono no hay Shift/Ctrl ni Esc): elige qué marca el toque y permite salir
  var TIPOS_MARCA = [['casilla', 'Casilla'], ['mw', 'Magic wall'], ['wg', 'Wild growth']];
  function pintarBarraMarca() {
    try {
      if (!modoMarcar || !ES_MOVIL) { if (barraMarca) { barraMarca.style.display = 'none'; } return; }
      if (!barraMarca) {
        barraMarca = document.createElement('div');
        barraMarca.id = 'mbh-marcbar';
        document.body.appendChild(trRaiz(barraMarca));
        ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'click', 'dblclick', 'contextmenu'].forEach(function (tipo) {
          barraMarca.addEventListener(tipo, function (e) { e.stopPropagation(); }, false);
        });
        TIPOS_MARCA.forEach(function (t) {
          var b = document.createElement('button');
          b.type = 'button'; b.className = 'mbh-mb'; b.setAttribute('data-t', t[0]); b.textContent = t[1];
          b.onclick = function () { tipoMarca = t[0]; pintarBarraMarca(); };
          barraMarca.appendChild(b);
        });
        var x = document.createElement('button');
        x.type = 'button'; x.className = 'mbh-mb salir'; x.textContent = '✕ Salir';
        x.onclick = function () { setModoMarcar(false); };
        barraMarca.appendChild(x);
      }
      barraMarca.style.display = 'flex';
      var bs = barraMarca.querySelectorAll('.mbh-mb');
      for (var i = 0; i < bs.length; i++) { bs[i].className = 'mbh-mb' + (bs[i].getAttribute('data-t') === tipoMarca ? ' on' : '') + (bs[i].className.indexOf('salir') >= 0 ? ' salir' : ''); }
    } catch (e) { registrar('barra marcar: ' + e.message); }
  }
  function setModoMarcar(v) {
    modoMarcar = !!v; aplicarModoMarcar();
    if (modoMarcar && ES_MOVIL) { oculto = true; aplicarOculto(); }   // en el teléfono se cierra el panel para poder tocar el mapa
  }

  function rgba(hex, a) {
    var m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
    var n = m ? parseInt(m[1], 16) : 0x00e5ff;
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function fmtSeg(s) {
    s = Math.max(0, Math.ceil(s));
    return s >= 60 ? Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60) : String(s);
  }

  // ---- Cámara: el juego mueve la vista suavemente entre casillas. La posición que da el cliente salta de una
  // casilla a la siguiente, así que se mide el desplazamiento real comparando los píxeles del canvas de un
  // fotograma al siguiente. Así las casillas resaltadas quedan pegadas al mapa durante todo el paso.
  var cam = { ax: null, ay: null, sx: 0, sy: 0, quieto: 0, quietoT: 0, ref: null, buf: null, bx: 0, by: 0, ux: 0, uy: 0, pw: 0, ph: 0, n: 0, estado: 'sin datos', falloT: 0, z: null, cx: null, cy: null };
  // CAM_ESC: la imagen se analiza a 1/4 de resolución (antes 1/2): 4 veces menos píxeles que copiar y comparar.
  var trkCv = null, trkCtx = null, CAM_R = 4, CAM_ESC = 4, CAM_MIN_MS = 45;
  function capturarCamara(sc) {
    var w = Math.round(sc.width / CAM_ESC), h = Math.round(sc.height / CAM_ESC);
    if (!trkCv) { trkCv = document.createElement('canvas'); }
    if (trkCv.width !== w || trkCv.height !== h || !trkCtx) {
      trkCv.width = w; trkCv.height = h;
      trkCtx = trkCv.getContext('2d', { willReadFrequently: true });
      cam.ref = null; cam.buf = null;
    }
    trkCtx.drawImage(sc, 0, 0, w, h);
    var d = trkCtx.getImageData(0, 0, w, h).data;
    var g = (cam.buf && cam.buf.length === w * h) ? cam.buf : new Uint8Array(w * h);
    var suma = 0;
    for (var i = 0, j = 0; i < g.length; i++, j += 4) { var v = (d[j] * 77 + d[j + 1] * 150 + d[j + 2] * 29) >> 8; g[i] = v; suma += v; }
    if (suma === 0) { throw new Error('imagen vacía'); }
    cam.pw = w; cam.ph = h;
    return g;
  }
  // Cuánto se movió el contenido entre dos fotogramas (en píxeles del canvas completo). Se ignora la zona del
  // personaje, que no se mueve en pantalla.
  function estimarShift(prev, cur, w, h) {
    var R = CAM_R, N = 2 * R + 1, m = R + 2;
    var cc = Number(cfg.hlCol) || 7, ff = Number(cfg.hlFila) || 5, tm = w / 15;
    var mx0 = Math.floor((cc - 1) * tm), mx1 = Math.ceil((cc + 2) * tm), my0 = Math.floor((ff - 1) * tm), my1 = Math.ceil((ff + 2) * tm);
    var sad = new Float64Array(N * N);
    for (var dy = -R; dy <= R; dy++) {
      for (var dx = -R; dx <= R; dx++) {
        var s = 0, n = 0;
        for (var y = m; y < h - m; y += 2) {
          var ro = y * w, rp = (y - dy) * w - dx, enY = y >= my0 && y < my1;
          for (var x = m; x < w - m; x += 2) {
            if (enY && x >= mx0 && x < mx1) { continue; }
            var df = cur[ro + x] - prev[rp + x];
            s += df < 0 ? -df : df; n++;
          }
        }
        sad[(dy + R) * N + dx + R] = n ? s / n : 0;
      }
    }
    var bi = R * N + R, bs = sad[bi], s0 = sad[bi];
    for (var i = 0; i < sad.length; i++) { if (sad[i] < bs) { bs = sad[i]; bi = i; } }
    var bx = bi % N - R, by = Math.floor(bi / N) - R, fx = 0, fy = 0;
    if (Math.abs(bx) < R) {
      var c = sad[bi], xm = sad[bi - 1], xp = sad[bi + 1], dX = xm - 2 * c + xp;
      if (dX > 1e-6) { fx = Math.max(-0.5, Math.min(0.5, 0.5 * (xm - xp) / dX)); }
    }
    if (Math.abs(by) < R) {
      var c2 = sad[bi], ym = sad[bi - N], yp = sad[bi + N], dY = ym - 2 * c2 + yp;
      if (dY > 1e-6) { fy = Math.max(-0.5, Math.min(0.5, 0.5 * (ym - yp) / dY)); }
    }
    return { dx: bx + fx, dy: by + fy, err: bs, err0: s0, borde: Math.abs(bx) >= R || Math.abs(by) >= R };
  }
  // ---- Cámara por interpolación (para cuando el canvas es WebGL y no se pueden leer sus píxeles) ----
  // El cliente cambia la posición del personaje al EMPEZAR cada paso y la imagen se desliza hacia ella en unos
  // 300 ms. Aquí se imita ese deslizamiento a velocidad constante: la cámara persigue a la posición sin saltar.
  var ip = { x: null, y: null, z: null, t: 0, hist: [], tPos: 0, D: 0 };
  function pasoMs() {
    var pref = Number(cfg.camPasoMs) > 0 ? Number(cfg.camPasoMs) : 330;
    if (ip.hist.length >= 3) {
      var mn = Math.min.apply(null, ip.hist);
      return Math.max(150, Math.min(mn * 0.97, pref * 1.6));
    }
    return pref;
  }
  function camInterp(pos, ahora, cambio) {
    if (ip.x === null || ip.z !== pos.z || (cambio && cambio.salto)) {
      ip.x = pos.x; ip.y = pos.y; ip.z = pos.z; ip.t = ahora; ip.hist = []; ip.tPos = ahora;
    } else {
      if (cambio) {
        var iv = ahora - ip.tPos; ip.tPos = ahora;
        if (iv > 120 && iv < 1200) { ip.hist.push(iv); if (ip.hist.length > 6) { ip.hist.shift(); } }
      }
      var dt = Math.min(100, ahora - ip.t), v = 1 / pasoMs();             // casillas por ms, por eje
      function acercar(c, obj) { var d = obj - c, m = v * dt; return Math.abs(d) <= m ? obj : c + (d > 0 ? m : -m); }
      ip.x = acercar(ip.x, pos.x); ip.y = acercar(ip.y, pos.y); ip.t = ahora;
    }
    return { x: ip.x, y: ip.y };
  }

  // Devuelve la posición de la cámara en casillas (con decimales mientras caminas)
  function posCamara(sc, pos, necesita) {
    var ahora = performance.now();
    var pk = pos.x + ',' + pos.y + ',' + pos.z, cambio = null;
    if (cam.pk !== pk) {
      var pp = cam.pp;
      if (pp && pp.z === pos.z) { cambio = { dx: pos.x - pp.x, dy: pos.y - pp.y, salto: Math.abs(pos.x - pp.x) > 2 || Math.abs(pos.y - pp.y) > 2 }; }
      cam.pk = pk; cam.pp = { x: pos.x, y: pos.y, z: pos.z }; cam.posT = ahora;
    }
    if (!cfg.camOn) { cam.estado = 'apagado'; cam.ax = null; cam.ref = null; cam.buf = null; ip.x = null; return { x: pos.x, y: pos.y }; }
    if (!necesita) { cam.estado = 'en espera'; cam.ax = null; cam.ref = null; cam.buf = null; ip.x = null; return { x: pos.x, y: pos.y }; }
    // Los fallos de lectura suelen ser pasajeros (el canvas aún está en blanco): se vuelve a probar a los 2 s.
    // Si la imagen no se movía con los pasos, se reintenta solo cada minuto.
    if (cam.sinPix && ahora - (cam.sinPixT || 0) > (cam.sinPixMot === 'vacio' ? 2000 : 60000)) { cam.sinPix = false; cam.fallos = 0; cam.malos = 0; cam.ax = null; cam.ref = null; cam.buf = null; }
    if (cfg.camPix === false || cam.sinPix) {
      cam.estado = cfg.camPix === false ? 'interpolando pasos (píxeles desactivado)' : 'interpolando pasos (el canvas no se puede leer)';
      cam.ax = null; cam.cx = null;
      var r0 = camInterp(pos, ahora, cambio); cam.cx = r0.x; cam.cy = r0.y; return r0;
    }
    cam.n++;
    var tam = sc.width / 15;
    // Solo se mide la cámara cuando de verdad se está moviendo (pasos recientes) y como mucho ~20 veces por segundo.
    // Parado, se revisa de vez en cuando para corregir deriva. Antes se medía en cada fotograma al arrancar (lag).
    var moviendo = ahora - (cam.posT || 0) < 1500;
    var activa = cam.ax !== null && cam.quieto < 30 && moviendo;
    var toca = cam.ax === null || (activa ? ahora - (cam.capT || 0) >= CAM_MIN_MS : ahora - (cam.capT || 0) >= 1000);
    if (toca) {
      cam.capT = ahora;
      try {
        var g = capturarCamara(sc);
        if (!cam.ref) { cam.ref = g; cam.buf = null; cam.bx = 0; cam.by = 0; cam.ux = 0; cam.uy = 0; }
        else {
          // Se compara siempre con un fotograma de referencia: así los pasos pequeños por fotograma no se pierden
          var r = estimarShift(cam.ref, g, cam.pw, cam.ph);
          if (r.err > 14 && r.err > r.err0 * 0.9) {                         // no se parece a la referencia: se empieza otra
            cam.bx += cam.ux; cam.by += cam.uy; cam.ux = 0; cam.uy = 0; cam.buf = cam.ref; cam.ref = g;
          } else {
            var nx = cam.bx + r.dx, ny = cam.by + r.dy;
            if (Math.abs(nx - (cam.bx + cam.ux)) > 0.12 || Math.abs(ny - (cam.by + cam.uy)) > 0.12) { cam.quieto = 0; cam.quietoT = ahora; } else { cam.quieto++; }
            cam.ux = r.dx; cam.uy = r.dy;
            if (r.borde || Math.abs(r.dx) > 3 || Math.abs(r.dy) > 3) {      // la referencia quedó lejos: se cambia por este fotograma
              cam.bx += r.dx; cam.by += r.dy; cam.ux = 0; cam.uy = 0; cam.buf = cam.ref; cam.ref = g;
            } else { cam.buf = g; }
          }
          cam.sx = (cam.bx + cam.ux) * CAM_ESC; cam.sy = (cam.by + cam.uy) * CAM_ESC;
        }
        cam.fallos = 0;
        (cam.sh = cam.sh || []).push([ahora, cam.sx, cam.sy]); if (cam.sh.length > 150) { cam.sh.shift(); }
        cam.estado = 'siguiendo la cámara (píxeles)';
      } catch (e) {
        cam.fallos = (cam.fallos || 0) + 1;
        if (cam.fallos >= 2) { cam.sinPix = true; cam.sinPixT = ahora; cam.sinPixMot = 'vacio'; }
        cam.estado = 'canvas no legible (' + e.message + '): paso a interpolar';
        cam.ax = null; cam.ref = null; cam.buf = null;
        return camInterp(pos, ahora, cambio);
      }
    }
    // Comprobación: si la posición avanzó una casilla y la imagen no se movió, los píxeles no sirven (p. ej. WebGL)
    if (cambio && !cambio.salto && (cambio.dx || cambio.dy) && cam.ax !== null) { cam.chk = { t: ahora, dx: cambio.dx, dy: cambio.dy }; }
    if (cam.chk && ahora - cam.chk.t > 400) {
      var ch = cam.chk; cam.chk = null;
      var h0 = cam.sx, h1 = cam.sy, sh = cam.sh || [];
      for (var q = 0; q < sh.length; q++) { if (sh[q][0] >= ch.t - 450) { h0 = sh[q][1]; h1 = sh[q][2]; break; } }   // el cliente puede mover la posición al empezar o al terminar el paso
      var mov = Math.abs(cam.sx - h0) + Math.abs(cam.sy - h1), esp = (Math.abs(ch.dx) + Math.abs(ch.dy)) * tam;
      if (mov < esp * 0.2) { cam.sinPix = true; cam.sinPixT = ahora; cam.sinPixMot = 'quieto'; }
      else if (mov < esp * 0.5) { cam.malos = (cam.malos || 0) + 1; if (cam.malos >= 2) { cam.sinPix = true; cam.sinPixT = ahora; cam.sinPixMot = 'quieto'; } }
      else { cam.malos = 0; }
    }
    if (cam.ax === null || cam.z !== pos.z) { cam.ax = pos.x; cam.ay = pos.y; cam.sx = 0; cam.sy = 0; cam.bx = 0; cam.by = 0; cam.ux = 0; cam.uy = 0; cam.z = pos.z; cam.quietoT = ahora; }
    var cx = cam.ax - cam.sx / tam, cy = cam.ay - cam.sy / tam;
    var ex = pos.x - cx, ey = pos.y - cy;
    if (Math.abs(ex) > 1.7 || Math.abs(ey) > 1.7) {                      // teletransporte o fallo: se vuelve a anclar
      cam.ax = pos.x + cam.sx / tam; cam.ay = pos.y + cam.sy / tam; cx = pos.x; cy = pos.y; cam.quietoT = ahora;
    } else if ((cam.quieto >= 8 || !moviendo) && ahora - cam.quietoT > 120) {   // parado: se corrige cualquier deriva
      if ((Math.abs(ex) < 0.15 && Math.abs(ey) < 0.15) || (ahora - cam.quietoT > 1200 && ahora - (cam.posT || 0) > 1200)) {
        cam.ax = pos.x + cam.sx / tam; cam.ay = pos.y + cam.sy / tam; cx = pos.x; cy = pos.y;
      }
    }
    cam.cx = cx; cam.cy = cy;
    return { x: cx, y: cy };
  }

  // ---- dibujo con estilo ----
  var FUENTE = '"Segoe UI", Tahoma, Verdana, sans-serif';
  var PALETA = ['#6ec1ff', '#ffd166', '#c9a0ff', '#7dffa0', '#ff9e7a'];
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  // Etiqueta redondeada con barra de progreso fina. align: 'c' centrada en (x, y), 'l' con la esquina en (x, y)
  function etiqueta(ctx, x, y, texto, color, frac, u, ancho, align) {
    ctx.font = '600 ' + (13 * u) + 'px ' + FUENTE;
    var tw = ctx.measureText(texto).width, pad = 9 * u, h = 21 * u;
    var w = ancho ? Math.max(ancho, tw + 2 * pad) : tw + 2 * pad;
    var x0 = align === 'c' ? x - w / 2 : x, y0 = align === 'c' ? y - h / 2 : y;
    x0 = Math.round(x0); y0 = Math.round(y0); w = Math.round(w); h = Math.round(h);
    ctx.save();
    rr(ctx, x0, y0, w, h, 6 * u);
    ctx.fillStyle = 'rgba(12,15,20,0.68)'; ctx.fill();
    ctx.lineWidth = u; ctx.strokeStyle = rgba(color, 0.75); ctx.stroke();
    ctx.clip();
    ctx.fillStyle = color;
    ctx.fillRect(x0, y0 + h - 4 * u, w * Math.max(0, Math.min(1, frac)), 4 * u);
    ctx.restore();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f3f6fb';
    ctx.fillText(texto, x0 + w / 2, y0 + h / 2 - 0.5 * u);
  }

  function alClickOverlay(e) {
    try {
      if (!modoMarcar) { return; }
      var pos = posJug(), sc = document.getElementById('screen');
      if (!pos || !ovCanvas || !sc) { return; }
      var r = ovCanvas.getBoundingClientRect();
      if (!r.width || !r.height) { return; }
      var tam = ovCanvas.width / (sc.width / 32);
      var col = (e.clientX - r.left) * ovCanvas.width / r.width / tam, fila = (e.clientY - r.top) * ovCanvas.height / r.height / tam;
      var cpx = cam.cx !== null ? cam.cx : pos.x, cpy = cam.cy !== null ? cam.cy : pos.y;
      var x = Math.floor(col - (Number(cfg.hlCol) || 0) + cpx + 1e-6);
      var y = Math.floor(fila - (Number(cfg.hlFila) || 0) + cpy + 1e-6);
      e.preventDefault(); e.stopPropagation();
      var tm = e.shiftKey ? 'mw' : (e.ctrlKey ? 'wg' : tipoMarca);
      if (tm === 'mw') { iniciarTimer('mw:' + x + ',' + y + ',' + pos.z, 'MW', cfg.mwSeg, [x, y, pos.z]); ultimaAccion = 'cronómetro MW en ' + x + ',' + y; }
      else if (tm === 'wg') { iniciarTimer('wg:' + x + ',' + y + ',' + pos.z, 'WG', cfg.wgSeg, [x, y, pos.z]); ultimaAccion = 'cronómetro WG en ' + x + ',' + y; }
      else { alternarCasilla(x, y, pos.z); }
    } catch (err) { registrar('click overlay: ' + err.message); }
  }

  var ESP_COLOR = { shovel: ['#ff9f1c', 'S'], rope: ['#ffd166', 'R'], escalera: ['#7dffa0', 'E'], pisar: ['#6ec1ff', '\u2195'] };
  var espCache = { t: 0, k: '', lista: [] };
  function especialesVisibles(pos) {
    var ahora = Date.now(), k = pos.x + ',' + pos.y + ',' + pos.z;
    if (ahora - espCache.t < 500 && espCache.k === k) { return espCache.lista; }
    var l = [];
    for (var dy = -6; dy <= 6; dy++) {
      for (var dx = -8; dx <= 8; dx++) {
        var tp = tipoEspecial(tileEn(pos.x + dx, pos.y + dy, pos.z));
        if (tp) { l.push({ x: pos.x + dx, y: pos.y + dy, tipo: tp }); }
      }
    }
    espCache = { t: ahora, k: k, lista: l };
    return l;
  }
  function dibujar() {
    try {
      if (!montarOverlay()) { return; }
      var sc = document.getElementById('screen');
      if (!sc || !sc.offsetWidth) { return; }
      // El juego escala #screen con un transform (o con su tamaño CSS): la capa copia posición, tamaño,
      // transform y origen del transform para quedar exactamente encima, a la misma escala.
      var cs = getComputedStyle(sc);
      var est = sc.offsetLeft + ',' + sc.offsetTop + ',' + sc.offsetWidth + ',' + sc.offsetHeight + ',' + cs.transform + ',' + cs.transformOrigin;
      if (est !== ovEstilo) {
        ovEstilo = est;
        ovCanvas.style.left = sc.offsetLeft + 'px'; ovCanvas.style.top = sc.offsetTop + 'px';
        ovCanvas.style.width = sc.offsetWidth + 'px'; ovCanvas.style.height = sc.offsetHeight + 'px';
        ovCanvas.style.transform = cs.transform === 'none' ? '' : cs.transform;
        ovCanvas.style.transformOrigin = cs.transformOrigin;
      }
      // El dibujo se hace a la resolución real de la pantalla (no a la de 480x352 del juego): así el texto sale
      // fino y nítido en vez de agrandado.
      var rect = sc.getBoundingClientRect();
      if (!rect.width) { return; }
      var bw = Math.max(16, Math.round(rect.width * (window.devicePixelRatio || 1)));
      var bh = Math.max(16, Math.round(rect.height * (window.devicePixelRatio || 1)));
      if (ovCanvas.width !== bw) { ovCanvas.width = bw; }
      if (ovCanvas.height !== bh) { ovCanvas.height = bh; }
      var ctx = ovCanvas.getContext('2d');
      if (!ctx) { return; }
      ctx.clearRect(0, 0, bw, bh);
      var pos = charActual ? posJug() : null;
      if (!pos) { return; }
      var u = bw / rect.width, tam = bw / (sc.width / 32);
      var cc = Number(cfg.hlCol) || 0, ff = Number(cfg.hlFila) || 0, ahora = Date.now();

      var atajoOn = !!cfg.cazaOcultarOn;
      var ocultas = casillasOcultas;
      // ¿hay algo que dibujar? (solo entonces se muestra el aviso del atajo)
      var hayContenido = (cfg.hlOn && casillas.some(function (c) { return c[2] === pos.z; })) || timers.some(function (t) { return t.tile && t.tile[2] === pos.z; }) || (!!cfg.hlEspeciales && (grabando || cazaCorriendo) && !betaBloqueo());
      var verEsp = !ocultas && !!cfg.hlEspeciales && (grabando || cazaCorriendo) && !betaBloqueo();
      var esp = verEsp ? especialesVisibles(pos) : [];
      var hayEspera = verEsp && ruta.some(function (rw) { return rw[2] === pos.z && accNombre(rw[4]) === 'esperar'; });
      var hayCasillas = !ocultas && cfg.hlOn && casillas.some(function (c) { return c[2] === pos.z && (!cfg.hlSoloAqui || (c[0] === pos.x && c[1] === pos.y)); });
      var hayTimersTile = !ocultas && timers.some(function (t) { return t.tile && t.tile[2] === pos.z; });
      var cp = posCamara(sc, pos, hayCasillas || hayTimersTile || modoMarcar || esp.length > 0 || hayEspera);
      function px(x) { return Math.round((cc + (x - cp.x)) * tam); }
      function py(y) { return Math.round((ff + (y - cp.y)) * tam); }
      var lado = Math.round(tam);

      if (hayCasillas) {
        var a = Math.max(5, Math.min(80, Number(cfg.hlAlpha) || 35)) / 100;
        for (var i = 0; i < casillas.length; i++) {
          var c = casillas[i];
          if (c[2] !== pos.z) { continue; }
          if (cfg.hlSoloAqui && (c[0] !== pos.x || c[1] !== pos.y)) { continue; }
          var x0 = px(c[0]), y0 = py(c[1]);
          if (x0 < -lado || y0 < -lado || x0 > bw || y0 > bh) { continue; }
          rr(ctx, x0 + 1.5 * u, y0 + 1.5 * u, lado - 3 * u, lado - 3 * u, 3 * u);
          ctx.fillStyle = rgba(cfg.hlColor, a); ctx.fill();
          ctx.lineWidth = 1.5 * u; ctx.strokeStyle = rgba(cfg.hlColor, 0.9); ctx.stroke();
        }
      }

      // Casillas especiales (al grabar y cazar): naranja = shovel, amarillo = rope, verde = escalera de clic derecho,
      // azul = se pisa (escaleras, rampas, hoyos abiertos)
      for (var q = 0; q < esp.length; q++) {
        var ec = ESP_COLOR[esp[q].tipo], ex = px(esp[q].x), ey = py(esp[q].y);
        if (!ec || ex < -lado || ey < -lado || ex > bw || ey > bh) { continue; }
        rr(ctx, ex + 2 * u, ey + 2 * u, lado - 4 * u, lado - 4 * u, 4 * u);
        ctx.fillStyle = rgba(ec[0], 0.22); ctx.fill();
        ctx.lineWidth = 2 * u; ctx.strokeStyle = rgba(ec[0], 0.95); ctx.stroke();
        ctx.font = '700 ' + Math.round(lado * 0.34) + 'px ' + FUENTE; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 3 * u; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.strokeText(ec[1], ex + lado / 2, ey + lado / 2);
        ctx.fillStyle = ec[0]; ctx.fillText(ec[1], ex + lado / 2, ey + lado / 2);
      }

      // Puntos de espera (spawns) de la ruta, en morado
      if (verEsp) {
        for (var w = 0; w < ruta.length; w++) {
          var rw = ruta[w];
          if (rw[2] !== pos.z || accNombre(rw[4]) !== 'esperar') { continue; }
          var wx = px(rw[0]), wy = py(rw[1]);
          if (wx < -lado || wy < -lado || wx > bw || wy > bh) { continue; }
          rr(ctx, wx + 2 * u, wy + 2 * u, lado - 4 * u, lado - 4 * u, 4 * u);
          ctx.fillStyle = rgba('#c77dff', 0.22); ctx.fill();
          ctx.lineWidth = 2 * u; ctx.strokeStyle = rgba('#c77dff', 0.95); ctx.stroke();
          ctx.font = '700 ' + Math.round(lado * 0.3) + 'px ' + FUENTE; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.lineWidth = 3 * u; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.strokeText((rw[4].s || '') + 's', wx + lado / 2, wy + lado / 2);
          ctx.fillStyle = '#c77dff'; ctx.fillText((rw[4].s || '') + 's', wx + lado / 2, wy + lado / 2);
        }
      }

      var hud = [];
      for (var k = 0; k < timers.length; k++) {
        var t = timers[k], resta = (t.fin - ahora) / 1000;
        if (t.tile) {
          if (ocultas || t.tile[2] !== pos.z) { continue; }
          var tx = px(t.tile[0]), ty = py(t.tile[1]);
          if (tx < -lado || ty < -lado || tx > bw || ty > bh) { continue; }
          var bajo = resta <= 5, base = t.clave.indexOf('wg:') === 0 ? '#7dffa0' : '#6ec1ff';
          var col = bajo ? '#ff6b6b' : base;
          var pulso = bajo ? 0.14 + 0.12 * (0.5 + 0.5 * Math.sin(ahora / 140)) : 0.10;
          rr(ctx, tx + 1.5 * u, ty + 1.5 * u, lado - 3 * u, lado - 3 * u, 3 * u);
          ctx.fillStyle = rgba(col, pulso); ctx.fill();
          ctx.lineWidth = 1.2 * u; ctx.strokeStyle = rgba(col, bajo ? 0.8 : 0.5); ctx.stroke();
          etiqueta(ctx, tx + lado / 2, ty + lado / 2, t.etq + ' ' + fmtSeg(resta), col, resta / (t.dur || 1), u, 0, 'c');
        } else { hud.push({ t: t, resta: resta }); }
      }

      // timers de hechizos: etiquetas en la esquina superior izquierda
      if (hud.length && cfg.tmOn) {
        for (var n = 0; n < hud.length; n++) {
          var it = hud[n], hc = it.resta <= 5 ? '#ff6b6b' : PALETA[(it.t.etq.charCodeAt(0) + it.t.etq.length) % PALETA.length];
          etiqueta(ctx, 10 * u, (10 + n * 27) * u, it.t.etq.slice(0, 14) + '  ' + fmtSeg(it.resta), hc, it.resta / (it.t.dur || 1), u, 124 * u, 'l');
        }
      }

      if (cfg.camInfo && (hayCasillas || hayTimersTile)) {
        ctx.font = '500 ' + (9 * u) + 'px ' + FUENTE; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillText('cámara: ' + (cam.sinPix || cfg.camPix === false ? 'interpolada' : (cam.estado.indexOf('píxeles') >= 0 ? 'píxeles' : cam.estado.slice(0, 22))), bw - 6 * u, bh - 5 * u);
      }
      // aviso permanente del atajo para ocultar/mostrar las casillas
      if (hayContenido && (atajoOn || ocultas) && !modoMarcar) {
        var comb = 'Ctrl+Shift+' + teclaOcultar();
        var txtAt = (ES_MOVIL || !atajoOn) ? (ocultas ? 'Casillas ocultas · botón «Mostrar / ocultar casillas»' : '') : (ocultas ? 'Casillas ocultas · ' + comb + ' para mostrarlas' : comb + ': ocultar casillas');
        if (txtAt) {
          ctx.font = '600 ' + (9 * u) + 'px ' + FUENTE; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
          var tw = ctx.measureText(txtAt).width;
          ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(4 * u, bh - 17 * u, tw + 10 * u, 13 * u);
          ctx.fillStyle = ocultas ? '#ffd166' : 'rgba(255,255,255,0.85)'; ctx.fillText(txtAt, 9 * u, bh - 7 * u);
        }
      }
      if (modoMarcar) {
        etiqueta(ctx, bw / 2, bh - 16 * u, ES_MOVIL ? ('Modo marcar · toca una casilla · ' + (tipoMarca === 'mw' ? 'Magic wall' : (tipoMarca === 'wg' ? 'Wild growth' : 'Resaltar'))) : 'Modo marcar · clic: casilla · Shift+clic: MW · Ctrl+clic: WG · Esc: salir', '#ffd166', 0, u, 0, 'c');
      }
    } catch (e) { registrar('overlay: ' + e.message); }
  }
  (function bucleDibujo() {
    dibujar();
    if (typeof requestAnimationFrame === 'function') { requestAnimationFrame(bucleDibujo); }
    else { setTimeout(bucleDibujo, 80); }
  })();

  // Ocultar / mostrar todas las casillas dibujadas (atajo del Cave hunt)
  var casillasOcultas = true;   // al iniciar, las casillas empiezan ocultas (carga más rápido); se muestran con el atajo o el botón
  function teclaOcultar() {
    var t = String(cfg.cazaOcultarTecla || 'X').trim().toUpperCase().slice(0, 1);
    return (!t || t === 'H' || t === 'K') ? 'X' : t;
  }
  function alternarOcultas() {
    casillasOcultas = !casillasOcultas;
    try { toast(casillasOcultas ? 'Casillas ocultas (Ctrl+Shift+' + teclaOcultar() + ' para mostrarlas)' : 'Casillas visibles'); } catch (e) {}
  }
  btnOcultarCas.onclick = function () { alternarOcultas(); };
  btnOcultarCas2.onclick = function () { alternarOcultas(); };
  document.addEventListener('keydown', function (e) {
    try {
      if (e.ctrlKey && e.shiftKey && cfg.cazaOcultarOn && String(e.key || '').toUpperCase() === teclaOcultar() && (e.code === 'Key' + teclaOcultar() || String(e.key).length === 1)) { e.preventDefault(); e.stopPropagation(); alternarOcultas(); return; }
      if (e.ctrlKey && e.shiftKey && (e.key === 'K' || e.key === 'k')) { e.preventDefault(); setModoMarcar(!modoMarcar); }
      else if (modoMarcar && e.key === 'Escape') { setModoMarcar(false); }
    } catch (err) {}
  }, true);

  btnMarcar.onclick = function () { setModoMarcar(!modoMarcar); };
  function elegirTipoMarca(t) { tipoMarca = t; btnTipoCas.className = 'mbh-btn' + (t === 'casilla' ? ' mbh-main' : ''); btnTipoMW.className = 'mbh-btn' + (t === 'mw' ? ' mbh-main' : ''); btnTipoWG.className = 'mbh-btn' + (t === 'wg' ? ' mbh-main' : ''); pintarBarraMarca(); }
  btnTipoCas.onclick = function () { elegirTipoMarca('casilla'); };
  btnTipoMW.onclick = function () { elegirTipoMarca('mw'); };
  btnTipoWG.onclick = function () { elegirTipoMarca('wg'); };
  elegirTipoMarca('casilla');
  btnMarcarYo.onclick = function () {
    var p = posJug();
    if (!p) { ultimaAccion = 'marcar: no puedo leer mi posición'; return; }
    alternarCasilla(p.x, p.y, p.z);
  };
  btnQuitarUlt.onclick = function () { casillas.pop(); guardarCasillas(); actualizarLblCas(); };
  btnBorrarCas.onclick = function () {
    if (!casillas.length || !confirmTr('¿Borrar las ' + casillas.length + ' casillas resaltadas?')) { return; }
    casillas = []; guardarCasillas(); actualizarLblCas();
  };
  btnTmProbar.onclick = function () {
    var l = listaHechizos();
    if (!l.length) { lblTm.textContent = 'No hay hechizos válidos en la lista.'; return; }
    iniciarTimer('sp:' + l[l.length - 1].pal, l[l.length - 1].etq, l[l.length - 1].seg, null);
    lblTm.textContent = 'Timer de prueba: ' + l[l.length - 1].etq + ' (' + l[l.length - 1].seg + ' s)';
  };
  btnMwProbar.onclick = function () {
    var p = posJug();
    if (!p) { lblTm.textContent = 'No puedo leer mi posición.'; return; }
    iniciarTimer('mw:' + p.x + ',' + p.y + ',' + p.z, 'MW', cfg.mwSeg, [p.x, p.y, p.z]);
    lblTm.textContent = 'Cronómetro de prueba en tu casilla (' + p.x + ',' + p.y + ',' + p.z + ').';
  };
  btnUsarMedidas.onclick = function () {
    var usadas = [];
    if (medidas.mw) { cfg.mwSeg = Math.round(medidas.mw); usadas.push('MW ' + cfg.mwSeg + ' s'); }
    if (medidas.wg) { cfg.wgSeg = Math.round(medidas.wg); usadas.push('WG ' + cfg.wgSeg + ' s'); }
    if (usadas.length) { guardarCfg(); sincronizarUI(); lblTm.textContent = 'Duraciones guardadas: ' + usadas.join(', '); }
    else { lblTm.textContent = 'Aún no hay medidas: lanza una wall y espera a que desaparezca (con la pantalla del juego a la vista).'; }
  };
  // Diagnóstico: busca en el cliente valores que parezcan el desplazamiento suave de la cámara al caminar
  btnCamara.onclick = function () {
    try {
      var gc = window.gameClient, hallados = [], vistos = new WeakSet(), re = /offset|scroll|camera|anim|walk|move|shift|delta|pixel/i;
      (function rec(o, ruta, prof) {
        if (!o || typeof o !== 'object' || prof > 3 || hallados.length >= 40 || vistos.has(o)) { return; }
        if (typeof Node !== 'undefined' && o instanceof Node) { return; }
        vistos.add(o);
        var ks; try { ks = Object.keys(o); } catch (e) { return; }
        for (var i = 0; i < ks.length && hallados.length < 40; i++) {
          var k = ks[i];
          if (k === '__chunk' || k === 'chunk' || k === 'tiles' || k === 'world' || k === 'networkManager') { continue; }
          var v; try { v = o[k]; } catch (e) { continue; }
          var r = ruta + '.' + k;
          if (typeof v === 'function') { continue; }
          if (v !== null && typeof v === 'object') { rec(v, r, prof + 1); }
          else if (re.test(k) && (typeof v === 'number' || typeof v === 'boolean')) { hallados.push(r + ' = ' + v); }
        }
      })(gc, 'gameClient', 0);
      lblTm.textContent = hallados.length ? 'Posibles valores de cámara (camina un paso y pulsa de nuevo; copia lo que cambie):\n' + hallados.join('\n') : 'No encontré nada con ese nombre.';
    } catch (e) { lblTm.textContent = 'Error: ' + e.message; }
  };
  // Items (solo ids) de las casillas cercanas, para comparar antes / después
  function fotoItems(mio) {
    var p = window.gameClient && window.gameClient.player, out = {};
    var tiles = valores(p && p.__chunk && p.__chunk.tiles);
    for (var i = 0; i < tiles.length; i++) {
      var t = tiles[i];
      if (!t) { continue; }
      var q = posDe(t);
      if (!q || (typeof q.z === 'number' && q.z !== mio.z)) { continue; }
      if (Math.abs(q.x - mio.x) > 9 || Math.abs(q.y - mio.y) > 7) { continue; }
      var ids = [];
      itemsDeTile(t).forEach(function (it) { var id = idDeItem(it); if (id !== null) { ids.push(id); } });
      out[q.x + ',' + q.y] = ids;
    }
    return out;
  }
  // Aprender qué item deja una runa: se lanza la runa y se mira qué item nuevo aparece en el suelo
  var aprender = null;
  function aprenderRuna(tipoK) {
    if (aprender) { return; }
    var mio = posJug();
    if (!mio) { lblTm.textContent = 'No puedo leer tu posición.'; return; }
    var etq = tipoK === 'wg' ? 'wild growth' : 'magic wall';
    aprender = { tipo: tipoK, etq: etq, mio: mio, base: fotoItems(mio), nuevos: {}, t0: Date.now(), ultNuevo: 0 };
    lblTm.textContent = 'Aprendiendo ' + etq + ': quédate quieto y lanza la runa en una casilla vacía (hasta 25 s)...';
    aprender.iv = setInterval(function () {
      try {
        var a = aprender, ahora = Date.now(), m2 = posJug();
        if (!a) { return; }
        if (!m2 || m2.x !== a.mio.x || m2.y !== a.mio.y || m2.z !== a.mio.z) { aprenderFin('te moviste: quédate quieto mientras aprende'); return; }
        var cur = fotoItems(a.mio);
        Object.keys(cur).forEach(function (k) {
          var antes = a.base[k] || [];
          cur[k].forEach(function (id) {
            if (antes.indexOf(id) >= 0) { return; }
            var e = a.nuevos[id] || (a.nuevos[id] = { tiles: {}, t: ahora });
            if (!e.tiles[k]) { e.tiles[k] = 1; a.ultNuevo = ahora; }
          });
        });
        if ((a.ultNuevo && ahora - a.ultNuevo > 2500) || ahora - a.t0 > 25000) { aprenderFin(''); }
      } catch (e) { registrar('aprender: ' + e.message); aprenderFin('error: ' + e.message); }
    }, 250);
  }
  function aprenderFin(aviso) {
    var a = aprender;
    if (!a) { return; }
    clearInterval(a.iv); aprender = null;
    var cand = Object.keys(a.nuevos).map(Number).filter(function (id) { return Object.keys(a.nuevos[id].tiles).length <= 3; });
    cand.sort(function (x, y) { return Object.keys(a.nuevos[x].tiles).length - Object.keys(a.nuevos[y].tiles).length || a.nuevos[x].t - a.nuevos[y].t; });
    if (!cand.length) { lblTm.textContent = (aviso ? aviso + '\n' : '') + 'No vi ningún item nuevo. Prueba otra vez en un lugar tranquilo, o usa "Inspeccionar alrededor" con la wall puesta.'; return; }
    cfg[a.tipo + 'Ids'] = String(cand[0]);
    guardarCfg(); sincronizarUI();
    lblTm.textContent = 'Aprendido: ' + a.etq + ' = item ' + cand[0] + (cand.length > 1 ? '  (otros items nuevos que vi: ' + cand.slice(1, 5).join(', ') + ')' : '') + '. Desde ahora su timer sale solo.';
  }
  btnAprenderMW.onclick = function () { aprenderRuna('mw'); };
  btnAprenderWG.onclick = function () { aprenderRuna('wg'); };

  // Diagnóstico: items de tu casilla y de las 8 de alrededor
  btnInspTile.onclick = function () {
    try {
      var p = window.gameClient && window.gameClient.player, mio = posJug();
      if (!p || !mio) { lblTm.textContent = 'No puedo leer tu posición.'; return; }
      var tiles = valores(p.__chunk && p.__chunk.tiles), txt = 'Items alrededor de ti (id "nombre"):', vistas = 0, tps = tiposCampo();
      for (var i = 0; i < tiles.length; i++) {
        var t = tiles[i], q = t && posDe(t);
        if (!q || (typeof q.z === 'number' && q.z !== mio.z) || Math.abs(q.x - mio.x) > 1 || Math.abs(q.y - mio.y) > 1) { continue; }
        vistas++;
        var its = itemsDeTile(t);
        txt += '\n(' + (q.x - mio.x) + ',' + (q.y - mio.y) + '): ' + (its.length ? its.slice(0, 6).map(function (it) {
          var tpi = tipoDeItem(it, tps);
          return idDeItem(it) + (nombreDeItem(it) ? ' "' + nombreDeItem(it) + '"' : '') + (tpi ? ' <- ' + tpi.etq : '');
        }).join(', ') : 'sin items reconocidos');
      }
      if (!vistas) { txt = 'No encuentro tu casilla en el mapa cargado.'; }
      lblTm.textContent = txt;
    } catch (e) { lblTm.textContent = 'Error: ' + e.message; }
  };

  // ---------- Reinicio automático tras una caída de conexión o un kick ----------
  // Solo cubre cortes normales. Si hubo GM, captcha o botcheck (ahora o en los últimos 10 min) no hace nada.
  var recSnap = null, recGMT = 0, recUltIntento = 0, recIntentos = 0, recVolvioT = 0;
  try {
    var rs0 = JSON.parse(sessionStorage.getItem(KEY_REC) || 'null');
    if (rs0 && rs0.char && Date.now() - rs0.t < 30 * 60000) { recSnap = rs0; }
  } catch (e) {}
  function recBorrar() { recSnap = null; try { sessionStorage.removeItem(KEY_REC); } catch (e) {} }
  function recHayGM() {
    return !!(pausaGM || capVisto || botcheck || gmInc || leerJSON(KEY_BOTCHECK, null));
  }
  // Se llama justo antes de detener todo cuando se cae el socket
  function recGuardarSnap() {
    if (!cfg.autoRecOn || liteBloqueo()) { recBorrar(); return; }
    if (!corriendo && !cazaCorriendo) { return; }          // si ya hay una reanudación pendiente, se conserva
    if (recHayGM() || Date.now() - recGMT < 600000 || muerteVista) {
      recBorrar();
      ultimaAccion = 'reinicio automático: no (hubo actividad de GM / anti-bot o el personaje murió)';
      return;
    }
    recSnap = { char: charActual, t: Date.now(), corriendo: !!corriendo, caza: !!cazaCorriendo };
    try { sessionStorage.setItem(KEY_REC, JSON.stringify(recSnap)); } catch (e) {}
    recIntentos = 0; recUltIntento = 0; recVolvioT = 0;
    ultimaAccion = 'conexión perdida: intentaré reanudar solo';
  }
  function socketVivo() {
    var gc = window.gameClient, s = gc && gc.networkManager && gc.networkManager.socket;
    return !!s && s.readyState === 1;
  }
  function recEntrar() {
    if (visibleId('character-select-modal')) {
      var lista = document.getElementById('character-select-list');
      var items = lista ? lista.querySelectorAll('*') : [];
      for (var i = 0; i < items.length; i++) {
        if (items[i].childElementCount === 0 && (items[i].textContent || '').indexOf(recSnap.char) >= 0) { items[i].click(); break; }
      }
      setTimeout(function () { var b = document.getElementById('char-select-enter'); if (b) { b.click(); } }, 700);
      return true;
    }
    if (visibleId('floater-enter')) {
      var u = document.getElementById('user-username'), pw = document.getElementById('user-password'), b2 = document.getElementById('enter-game');
      if (u && pw && b2 && u.value && pw.value && !b2.disabled) { b2.click(); return true; }
    }
    return false;
  }
  function recTick() {
    try {
      var ahora = Date.now();
      if (recHayGM()) { recGMT = ahora; }
      if (!recSnap) { return; }
      if (!cfg.autoRecOn || recHayGM() || ahora - recSnap.t > Math.max(1, Number(cfg.autoRecMin) || 10) * 60000) {
        if (cfg.autoRecOn && !recHayGM()) { alertar('desc', '🔌 No logré reconectar solo en ' + Math.max(1, Number(cfg.autoRecMin) || 10) + ' min. Entra tú a mano.'); }
        recBorrar();
        return;
      }
      var nom = nombrePersonaje();
      var listo = socketVivo() && nom === recSnap.char && !!leerBarra('health-bar') && !!posJug() &&
        !visibleId('death-modal') && !visibleId('character-select-modal') && !visibleId('floater-enter');
      if (listo) {
        if (!recVolvioT) { recVolvioT = ahora; ultimaAccion = 'reconectado, espero a que cargue...'; return; }
        if (ahora - recVolvioT < 5000) { return; }
        var s = recSnap;
        recBorrar();
        if (s.corriendo && !corriendo) { iniciar(); }
        if (s.caza && !cazaCorriendo) { cazaIniciar(); }
        ultimaAccion = 'reconectado: reanudé ' + (s.corriendo ? 'runas' : '') + (s.corriendo && s.caza ? ' y ' : '') + (s.caza ? 'cave hunt' : '');
        cerrarAviso();
        return;
      }
      recVolvioT = 0;
      if (ahora - recUltIntento < 15000) { return; }
      if (recIntentos >= 6) {
        alertar('desc', '🔌 No logré reconectar solo (6 intentos). Entra tú a mano.');
        recBorrar();
        return;
      }
      if (recEntrar()) { recUltIntento = ahora; recIntentos++; ultimaAccion = 'reconectando (intento ' + recIntentos + ')...'; }
    } catch (e) { registrar('reinicio auto: ' + e.message); }
  }

  window.addEventListener('beforeunload', function () { guardarCfg(); guardarRuta(); });

  // ---------- Cambio de personaje: espera el login, lee el nombre y carga lo suyo ----------
  function cambiarPersonaje(nombre) {
    var previo = charActual;
    if (previo) {
      try {
        detener('cambio de personaje'); cazaParar('cambio de personaje');
        if (grabando) { grabando = false; btnGrabar.textContent = '⏺ Grabar ruta'; }
      } catch (e) {}
      guardarCfg(); guardarRuta();
    }
    charActual = nombre;
    datosListos = false;

    // 1) Configuración: la guardada de este personaje; si no hay, la última copia con nombre; si no, valores por defecto
    var origen = '';
    var cfgGuardada = leerJSON(kChar(KEY_CFG), null);
    var copia = lastProfiles[nombre] && perfiles[lastProfiles[nombre]] ? perfiles[lastProfiles[nombre]] : null;
    if (cfgGuardada) { aplicarCfg(cfgGuardada); origen = 'guardada'; }
    else if (copia && copia.cfg) { aplicarCfg(copia.cfg); origen = 'de tu última copia "' + lastProfiles[nombre].replace(nombre + '::', '') + '"'; }
    else { aplicarCfg(CFG_DEFECTO); origen = 'nueva (valores por defecto)'; }

    // 2) Ruta
    var r = leerJSON(kChar(KEY_RUTA), null);
    if (!Array.isArray(r) && !cfgGuardada && copia && Array.isArray(copia.ruta)) { r = copia.ruta; }
    ruta = Array.isArray(r) ? r.filter(rutaValida) : [];
    cazaIdx = 0;

    // 3) Casillas resaltadas de este personaje
    var cs = leerJSON(kChar(KEY_TILES), null);
    casillas = Array.isArray(cs) ? cs.filter(casillaValida) : [];
    timers = []; mwReiniciar(); actualizarLblCas();
    if (recSnap && recSnap.char !== nombre) { recBorrar(); }

    datosListos = true;
    guardarCfg(); guardarRuta();
    actualizarListaPerfiles();
    aplicarTitulo();
    ultimaAccion = 'personaje ' + nombre + ': configuración ' + origen + ', ruta de ' + ruta.length + ' puntos';
    var pend = leerJSON(KEY_BOTCHECK, null);
    if (pend && pend.char === nombre && Date.now() - pend.t < 6 * 3600000) {
      try { localStorage.removeItem(KEY_BOTCHECK); } catch (e) {}
      alertar('botcheck', '⏱ ' + nombre + ' tiene un botcheck pendiente (cerré la sesión por inactividad). Te saldrá al entrar: resuélvelo.');
    }
  }
  function charTick() {
    try {
      var n = nombrePersonaje();
      if (n && n !== charActual) { cambiarPersonaje(n); }
    } catch (e) { registrar('personaje: ' + e.message); }
  }

  // ---------- Bucle principal ----------
  var corriendo = false, runas = 0, pendiente = null, proximoPermitido = 0, castAt = null;
  var fallosSeguidos = 0, manaPrev = null, ultimoCambio = 0, ultimoComer = 0;
  var jitterComer = Math.random() * 4000, ultimaAccion = 'ninguna';

  function actualizarBotones() {
    btnToggle.textContent = corriendo ? '■ Detener runeo' : '▶ Iniciar runeo'; btnToggle.className = 'mbh-btn mbh-main' + (corriendo ? ' on' : '');
    try {
      var cazaOk = !betaBloqueo();
      btnCazaMini.style.display = cazaOk ? '' : 'none';
      btnCazaMini.textContent = cazaCorriendo ? '■ Detener cavehunt' : '▶ Iniciar cavehunt'; btnCazaMini.className = 'mbh-btn mbh-main' + (cazaCorriendo ? ' on' : '');
      var hayTrain = !!String(cfg.trainNombre || '').trim();
      btnTrainMini.style.display = hayTrain ? '' : 'none';
      btnTrainMini.textContent = cfg.trainOn ? '■ Detener training' : '▶ Iniciar training'; btnTrainMini.className = 'mbh-btn mbh-main' + (cfg.trainOn ? ' on' : '');
    } catch (e) {}
  }
  setInterval(function () { try { actualizarBotones(); } catch (e) {} }, 700);
  btnCazaMini.onclick = function () { try { btnCazaIniciar.onclick(); } catch (e) {} actualizarBotones(); };
  btnTrainMini.onclick = function () {
    cfg.trainOn = !cfg.trainOn; guardarCfg();
    try { fTrainOn.input.checked = cfg.trainOn; } catch (e) {}
    actualizarBotones();
  };
  function detener(razon) {
    corriendo = false;
    pendiente = null;
    castAt = null;
    if (razon) { ultimaAccion = razon; }
    actualizarBotones();
  }
  function iniciar() {
    if (licExigir(iniciar)) { ultimaAccion = 'comprobando tu licencia…'; return; }
    if (!cfg.runasOn) { ultimaAccion = 'runas y comida desactivadas'; return; }
    if (!String(cfg.hechizo).trim()) { ultimaAccion = 'falta escribir el hechizo'; return; }
    if (!(cfg.mana > 0)) { ultimaAccion = 'falta la mana por hechizo'; return; }
    corriendo = true;
    pendiente = null;
    castAt = null;
    fallosSeguidos = 0;
    manaPrev = null;
    ultimoCambio = Date.now();
    proximoPermitido = Date.now() + 500;
    ultimaAccion = 'iniciado';
    actualizarBotones();
  }
  btnToggle.onclick = function () {
    if (corriendo) { detener('detenido por ti'); return; }
    if (pausaGM) { pausaGM = false; estabaCorriendo = false; cazaEstabaCorriendo = false; pausaCausa = ''; gmInc = null; botcheck = null; cerrarAviso(); }
    iniciar();
  };
  btnProbarH.onclick = function () {
    try {
      decir(String(cfg.hechizo).trim(), metodo);
      ultimaAccion = 'prueba enviada (' + NOMBRES_METODO[metodo] + ')';
    } catch (e) { ultimaAccion = 'error: ' + e.message; registrar(e.message); }
  };
  btnProbarC.onclick = function () {
    try {
      pulsarTecla(cfg.teclaComida);
      ultimaAccion = 'prueba comida: tecla ' + cfg.teclaComida;
    } catch (e) { ultimaAccion = 'error: ' + e.message; registrar(e.message); }
  };
  btnCopiar.onclick = function () {
    copiarTexto(estadoEl.textContent, function () { ultimaAccion = 'estado copiado'; }, function () { ultimaAccion = 'no pude copiar el estado'; });
  };

  function tick() {
    try {
      var gc = window.gameClient;
      if (!gc || !gc.player) { if (corriendo) { ultimaAccion = 'esperando personaje...'; } return; }
      if (!charActual) { return; }
      try {
        var nm = gc.networkManager;
        if (nm && nm.isConnected && !nm.isConnected()) { if (corriendo) { ultimaAccion = 'desconectado, en pausa'; } return; }
      } catch (e) {}

      var mp = leerBarra('mana-bar');
      var hp = leerBarra('health-bar');
      if (!mp || !hp) { if (corriendo) { ultimaAccion = 'no puedo leer vida/mana'; } return; }
      var ahora = Date.now();

      if (pzMsg && manaPrev !== null && mp.actual > manaPrev) { pzMsg = false; }
      if (manaPrev === null || mp.actual !== manaPrev || mp.actual >= mp.max) { ultimoCambio = ahora; }
      manaPrev = mp.actual;

      revisarVida(hp);
      if (pausaGM) { return; }

      entrenar(ahora, hp);
      antiIdle(ahora);

      // Durante el Cave hunt se cura y toma pociones aunque esas funciones estén apagadas
      var enCaza = cazaCorriendo && cfg.cazaCurar && !betaBloqueo();
      var conCombate = !liteBloqueo();
      if (conCombate && (cfg.healOn || enCaza) && autoheal(hp, mp, ahora)) { return; }
      if (conCombate && (cfg.hpPotOn || (enCaza && teclaEsPocion(cfg.hpPotTecla))) && autopocion(hp, ahora)) { return; }
      if (conCombate && (cfg.manaOn || (enCaza && teclaEsPocion(cfg.manaTecla))) && automana(mp, ahora)) { return; }
      if (conCombate) { autoHaste(ahora, mp, cazaCorriendo && cfg.cazaHaste && !betaBloqueo()); autoHechizos(ahora, mp, hp); }

      if (!cfg.runasOn) {
        if (corriendo) { detener('runas y comida desactivadas'); }
        return;
      }
      if (!corriendo) { return; }
      if (macroPausado('runeo')) { ultimaAccion = 'en pausa por un macro'; return; }

      if (cfg.mana > mp.max) {
        detener('el costo (' + cfg.mana + ') supera tu mana máxima (' + mp.max + ')');
        try { toast('Runeo detenido: "Mana por hechizo" (' + cfg.mana + ') es más que tu maná máxima (' + mp.max + '). Pon el costo real de tu hechizo en la pestaña Runas.'); } catch (e) {}
        return;
      }

      if (cfg.capOn) {
        var cap = leerCap();
        if (cap !== null && cap < cfg.capMin && depListo() && Date.now() > dep.enfriar) { ultimaAccion = 'cap baja: esperando a guardar en el depósito'; return; }
        if (cap !== null && cap < cfg.capMin) {
          detener('cap baja (' + cap + ' < ' + cfg.capMin + ')');
          alertar('cap', '📦 Cap baja: ' + cap + ' (mínimo ' + cfg.capMin + ').\nRunas detenidas.');
          return;
        }
      }

      if (pendiente) {
        if (mp.actual < pendiente.antes - 1) {
          runas++;
          fallosSeguidos = 0;
          if (cfg.metodo !== pendiente.metodo) { cfg.metodo = pendiente.metodo; guardarCfg(); }
          pendiente = null;
          proximoPermitido = ahora + 800;
          ultimaAccion = 'hechizo lanzado OK';
        } else if (ahora - pendiente.t > 3000) {
          fallosSeguidos++;
          ultimaAccion = 'no bajó mana, pruebo otro método';
          pendiente = null;
          metodo = (metodo + 1) % 3;
          proximoPermitido = ahora + 1000;
          if (fallosSeguidos >= 6) { detener('detenido: 6 intentos sin gastar mana'); }
        }
        return;
      }

      var enPZ = cfg.pzOn && estaEnPZ(ahora);
      if (enPZ) { ultimoCambio = ahora; }

      var espera = Math.max(5, cfg.segSinSubir) * 1000 + jitterComer;
      if (cfg.comer && !enPZ && mp.actual < mp.max && ahora - ultimoCambio > espera && ahora - ultimoComer > espera) {
        pulsarTecla(cfg.teclaComida);
        ultimoComer = ahora;
        ultimoCambio = ahora;
        jitterComer = Math.random() * 4000;
        ultimaAccion = 'comida: tecla ' + cfg.teclaComida;
        return;
      }

      if (mp.actual >= cfg.mana) {
        if (castAt === null) {
          var lo = Math.max(0, cfg.esperaMin), hi = Math.max(lo, cfg.esperaMax);
          var delay = (lo + Math.random() * (hi - lo)) * 1000;
          castAt = Math.max(ahora, proximoPermitido) + delay;
          ultimaAccion = 'mana lista, espero ' + (delay / 1000).toFixed(1) + ' s';
        }
        if (ahora >= castAt) {
          try {
            decir(String(cfg.hechizo).trim(), metodo);
            pendiente = { antes: mp.actual, t: ahora, metodo: metodo };
            castAt = null;
            ultimaAccion = 'lanzando "' + cfg.hechizo + '" (' + NOMBRES_METODO[metodo] + ')';
          } catch (e) {
            registrar('decir: ' + e.message);
            fallosSeguidos++;
            metodo = (metodo + 1) % 3;
            castAt = null;
            proximoPermitido = ahora + 1000;
            ultimaAccion = 'error al enviar: ' + e.message;
            if (fallosSeguidos >= 6) { detener('detenido: no se pudo enviar el hechizo'); }
          }
        }
      } else {
        castAt = null;
      }
    } catch (e) {
      registrar('tick: ' + e.message);
      if (corriendo) { ultimaAccion = 'error: ' + e.message; }
    }
  }

  // ---------- Refresco del panel ----------
  function refrescar() {
    try {
      if (!panel.isConnected) { (document.body || document.documentElement).appendChild(panel); }
      if (!avisoEl.isConnected) { (document.body || document.documentElement).appendChild(avisoEl); }
      aplicarTitulo();
      var hp = leerBarra('health-bar');
      var mp = leerBarra('mana-bar');
      var hpTxt = hp ? hp.actual + '/' + hp.max : '?';
      var mpTxt = mp ? mp.actual + '/' + mp.max : '?';
      resumen.className = 'mbh-resumen' + (pausaGM ? ' gm' : '');
      led.className = 'mbh-led' + (pausaGM ? ' gm' : ((corriendo || cazaCorriendo) ? ' on' : ''));
      resumen.textContent = (pausaGM ? 'PAUSA GM · ' : '') + (charActual || 'sin sesión') + (corriendo ? ' · runas' : '') + (cazaCorriendo ? ' · caza' : '');
      pintarBarra(barraHp, hp, 'HP'); pintarBarra(barraMp, mp, 'MP'); pintarFab();
      perfilInfo.textContent = charActual
        ? 'Personaje: ' + charActual + '  (config y ruta se guardan solos)'
        : 'Personaje: (esperando a que inicies sesión; mientras tanto se usan los valores por defecto y no se guarda nada)';

      if (!minimizado) {
        var capAct = leerCap();
        var t = 'Personaje: ' + (charActual || '(sin sesión)') + ' | reloj: ' + reloj.modo() + (chatDesbloqueado ? ' | CHAT DESBLOQUEADO' : '') + '\n';
        t += 'Runas: ' + (corriendo ? 'ACTIVO' : 'detenido') + ' (hechas ' + runas + ', cap ' + (capAct === null ? '?' : capAct) + ')\n';
        t += 'Training: ' + (cfg.trainOn ? 'ACTIVO' : 'apagado') + ' (' + trainEstado + (cfg.trainOn ? '; ' + cfg.trainPostura + ', ' + cfg.trainChase : '') + ')\n';
        t += 'Anti-idle: ' + (cfg.idleOn ? 'ACTIVO' : 'apagado') + ' (usos ' + idleUsos + ', último: ' + ultimoIdle + ')\n';
        t += 'Protection zone: ' + (estaEnPZ(Date.now()) ? 'SÍ (' + pzFuente + ')' : 'no') + (cfg.pzOn ? '' : ' [apagada]') + '\n';
        t += 'Autoheal: ' + (cfg.healOn ? 'ACTIVO' : 'apagado') + ' (curas ' + curas + ', última: ' + ultimaCura + ')\n';
        t += 'Autolife: ' + (cfg.hpPotOn ? 'ACTIVA' : 'apagada') + ' (usos ' + hpPotUsos + ', última: ' + ultimaHpPot + ')\n';
        t += 'Automana: ' + (cfg.manaOn ? 'ACTIVO' : 'apagado') + ' (usos ' + manaUsos + ', último: ' + ultimaMana + ')\n';
        t += 'Autohaste: ' + hasteEstado + ' (usos ' + hasteUsos + ')\n';
        if (!comboBloqueo()) {
        t += 'Combo runa: ' + (cfg.bombOn ? 'activo' : 'apagado') + ' (runas ' + bombCount + ', última: ' + ultimaBomb + ')' + (comboUltTiro ? ' | último tiro del líder: ' + comboUltTiro : '') + '\n';
        t += 'Macros: ' + (cfg.macroOn ? 'ACTIVOS · ' + macroEstado : 'apagados') + (macroPausas.caza > Date.now() || macroPausas.runeo > Date.now() || macroPausas.training > Date.now() || macroPausas.todo > Date.now() ? ' · pausando: ' + Object.keys(macroPausas).filter(function (k) { return macroPausas[k] > Date.now(); }).join(', ') : '') + '\n';
        t += '  Líder: ' + estadoLider + '\n';
        }
        if (!betaBloqueo()) {
        t += 'Cave hunt: ' + (cazaCorriendo ? 'ACTIVO' : 'detenido') + ' (' + cazaEstado + ')\n';
        t += '  Kiting: ' + (cfg.cazaKiting ? 'ACTIVO' : 'apagado') + '\n';
        t += '  Defensa PK: ' + (cfg.cazaDefOn ? defEstado : 'apagada') + '\n';
        if (!colmenaBloqueo()) { t += '  Colmena hunt: ' + (cfg.chOn ? chEstado : 'apagada') + '\n'; }

        var pj = posJug();
        t += '  Ruta: ' + ruta.length + ' pts' + (grabando ? ' [GRABANDO]' : '') + ' | punto ' + cazaIdx + ' | vueltas ' + cazaVueltas + ' | muertes ' + cazaMuertes + ' | comidas ' + cazaComidas + '\n';
        t += '  Posición: ' + (pj ? pj.x + ',' + pj.y + ',' + pj.z : '?') + (cazaRetirando ? ' | RETIRADA (' + cazaRetiroMotivo + ')' : '') + '\n';
        }
        t += 'Casillas: ' + casillas.length + ' | Timers activos: ' + timers.length + ' | Cámara: ' + cam.estado + ' | MW/WG: ' + (cfg.mwOn ? 'vigilando' : 'apagado') + (textoMedidas() ? ' | ' + textoMedidas() : '') + (modoMarcar ? ' | MODO MARCAR' : '') + '\n';
        t += 'Reinicio automático: ' + (cfg.autoRecOn ? (recSnap ? 'ESPERANDO RECONEXIÓN (intentos ' + recIntentos + ')' : 'armado') : 'apagado') + '\n';
        t += 'Alertas: GM ' + (pausaGM ? 'PAUSADO (' + pausaCausa + ')' : (cfg.gmOn ? 'vigilando' : 'apagado')) + ' | última: ' + ultimaAlerta + '\n';
        t += '  GM: ' + (gmInc ? 'incidente, contestadas ' + gmInc.resp : 'sin incidentes') + ' | botcheck: ' + (botcheck ? Math.max(0, Math.round((botcheck.finT - Date.now()) / 1000)) + ' s' + (botcheck.logout ? ' (cerrando sesión)' : '') : 'ninguno') + ' | inactivo hace ' + Math.round((Date.now() - ultimaActividad) / 1000) + ' s\n';
        t += 'Método de envío: ' + NOMBRES_METODO[metodo] + '\n';
        t += textoLicencia() + '\n';
        refrescarLicencia();
        if (nativo('activo')) {
          var nb = '?', nn = '?';
          try { nb = NATIVO.bateriaOk() ? 'sin límite' : 'limitada (toca "Sin límite de batería")'; } catch (e) {}
          try { nn = NATIVO.notifOk() ? 'permitidas' : 'BLOQUEADAS (toca "Permitir avisos")'; } catch (e) {}
          t += 'Segundo plano: ' + (fondoOn ? 'servicio activo' : 'inactivo') + ' · batería ' + nb + ' · avisos ' + nn + '\n';
        }
        t += 'Última acción: ' + ultimaAccion;
        if (errores.length) { t += '\n\nErrores:\n' + errores.join('\n'); }
        estadoEl.textContent = t;
      }
    } catch (e) { registrar('refrescar: ' + e.message); }
  }

  actualizarBotones();
  refrescar();
  reloj.cada(refrescar, 1000);
  reloj.cada(tick, 500);
  reloj.cada(vigilarLider, 150);
  reloj.cada(cazaLoop, 120);
  reloj.cada(colLoop, 200);
  reloj.cada(macroLoop, 250);
  reloj.cada(chLoop, 200);
  reloj.cada(recargaLoop, 400);
  reloj.cada(casaTick, 400);
  reloj.cada(descansoLoop, 5000);
  reloj.cada(timersTick, 1000);
  reloj.cada(mwTick, 400);
  reloj.cada(charTick, 500);
  reloj.cada(vigilarJuego, 1000);
  reloj.cada(reloginTick, 1500);
  reloj.cada(recTick, 1000);
  reloj.cada(fondoTick, 1000);
  if (!IDIOMA) { pedirIdioma(function () { pedirAvisoLegal(); }); }   // primera vez: elegir idioma antes que nada
  else if (!avisoLegalOk()) { pedirAvisoLegal(); }                    // y luego aceptar el aviso de responsabilidad
  // App de Android: avisar cuando hay un APK nuevo (en iPhone y PC el script se actualiza solo)
  var BASE_DESCARGAS = 'https://osbeliaal.github.io/ox-files/';
  function versionMayor(a, b) {
    var x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
    for (var i = 0; i < Math.max(x.length, y.length); i++) { var d = (x[i] || 0) - (y[i] || 0); if (d) { return d > 0; } }
    return false;
  }
  var updAvisada = '';
  function buscarActualizacion() {
    if (!nativo('abrir')) { return; }
    try {
      fetch(BASE_DESCARGAS + 'version.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (v) {
        if (!v || !v.version || !versionMayor(v.version, VERSION) || updAvisada === v.version) { return; }
        updAvisada = v.version;
        if (corriendo || cazaCorriendo || cfg.trainOn) { toast('Nueva versión ' + v.version + ' disponible: detén el helper para actualizar'); updAvisada = ''; return; }
        if (confirmTr('Nueva versión de Minibia Helper disponible (v' + v.version + '). ¿Descargarla ahora?')) {
          NATIVO.abrir(BASE_DESCARGAS + (v.apk || 'app.apk'));
          toast('Abre la descarga e instala encima: no pierdes tu configuración');
        }
      }).catch(function () {});
    } catch (e) {}
  }
  setTimeout(buscarActualizacion, 8000);
  reloj.cada(buscarActualizacion, 3 * 60 * 60 * 1000);
  var licAvisado = '';
  reloj.cada(function () {
    if (licenciaOk()) {
      licAvisado = '';
      // la licencia llegó (por ejemplo, la activaron en otra ventana): cierra el aviso y vuelve a mostrar el panel
      if (licModalAuto && licModal && licModal.style.display !== 'none') { licModal.style.display = 'none'; licTrasActivar = null; }
      licModalAuto = false;
      if (licOcultoAuto) { licOcultoAuto = false; if (oculto) { oculto = false; aplicarOculto(); } }
      return;
    }
    // aún se están comprobando las licencias guardadas (al abrir otra pestaña o ventana): no detener nada todavía
    licVerificarGuardadas();
    if (licComprobando()) { return; }
    var activo = corriendo || cazaCorriendo || cfg.trainOn;
    if (activo) {
      detener('falta licencia para ' + (charActual || 'este personaje'));
      try { cazaParar('falta licencia'); } catch (e) {}
      if (cfg.trainOn) { cfg.trainOn = false; guardarCfg(); sincronizarUI(); }
    }
    if (charActual && !oculto) { oculto = true; aplicarOculto(); licOcultoAuto = true; }
    if (charActual && licAvisado !== charActual && (activo || !oculto)) { licAvisado = charActual; pedirLicencia(); licModalAuto = true; }
  }, 1000);
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', mbhPrincipal); } else { mbhPrincipal(); }
})();
