/**
 * RetroTerm Demo Application
 * Uses the IIFE bundle (global RetroTerm).
 */
(function () {
  'use strict';

  var Terminal = RetroTerm.Terminal;
  var FitAddon = RetroTerm.FitAddon;
  var Themes = RetroTerm.Themes;
  var VirtualKeyboard = RetroTerm.VirtualKeyboard;

  var container = document.getElementById('terminal-container');
  var statusEl = document.getElementById('status');
  var keyDisplayEl = document.getElementById('key-display');

  var term = new Terminal({
    rows: 24,
    cols: 80,
    theme: Themes.green,
    fontFamily: "'Fira Code', 'Cascadia Code', 'Courier New', monospace",
    fontSize: 16,
    scrollback: 10000,
  });

  var fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  term.open(container);
  fitAddon.fit();

  window.addEventListener('resize', function () { fitAddon.fit(); });

  term.onKey(function (ev) {
    var hex = [];
    for (var i = 0; i < ev.key.length; i++) {
      hex.push(ev.key.charCodeAt(i).toString(16).padStart(2, '0'));
    }
    keyDisplayEl.textContent = 'Key: ' + ev.domEvent.key + ' | Sent: ' + hex.join(' ');
  });

  window.demoTerminal = term;
  statusEl.textContent = 'Terminal: ' + term.cols + 'x' + term.rows + ' — VT100';

  term.write('RetroTerm Demo\r\n');
  term.write('Select a test from the dropdown and click Run.\r\n');
  term.write('Or select Echo Mode to type interactively.\r\n\r\n');

  // Controls
  var emulatorSelect = document.getElementById('emulator-type');
  var themeSelect = document.getElementById('theme-select');
  var testSelect = document.getElementById('test-select');
  var runBtn = document.getElementById('run-test');
  var clearBtn = document.getElementById('clear-btn');

  emulatorSelect.addEventListener('change', function () {
    var type = emulatorSelect.value;
    term.setEmulatorType(type);
    statusEl.textContent = 'Terminal: ' + term.cols + 'x' + term.rows + ' — ' + type.toUpperCase();
  });

  themeSelect.addEventListener('change', function () {
    var themeMap = {
      green: Themes.green,
      amber: Themes.amber,
      white: Themes.white,
      blue: Themes.blue,
      paperwhite: Themes.paperwhite,
    };
    var theme = themeMap[themeSelect.value];
    if (theme) {
      term.options = Object.assign({}, term.options, { theme: theme });
    }
  });

  clearBtn.addEventListener('click', function () {
    term.write('\x1b[2J\x1b[H');
  });

  // Virtual Keyboard
  var vkContainer = document.getElementById('vk-container');
  var vkToggleBtn = document.getElementById('vk-toggle');
  var vkLayoutSelect = document.getElementById('vk-layout');
  var vkLanguageSelect = document.getElementById('vk-language');
  var vk = new VirtualKeyboard(vkContainer);
  vk.attachTerminal(term, 'Terminal 1');

  vkToggleBtn.addEventListener('click', function () {
    vk.toggle();
    vkToggleBtn.textContent = vk.visible ? 'Hide Keyboard' : 'Virtual Keyboard';
  });

  vkLayoutSelect.addEventListener('change', function () {
    vk.setLayout(vkLayoutSelect.value);
  });

  vkLanguageSelect.addEventListener('change', function () {
    vk.setLanguage(vkLanguageSelect.value);
  });


  runBtn.addEventListener('click', function () {
    var testName = testSelect.value;
    if (!testName) return;
    runTest(testName);
  });

  // Echo mode state
  var echoMode = false;
  var echoDisposable = null;

  function runTest(name) {
    term.write('\x1b[2J\x1b[H');
    switch (name) {
      case 'echo': runEchoMode(); break;
      case 'colors': runBasicColors(); break;
      case '256colors': run256Colors(); break;
      case 'attributes': runAttributes(); break;
      case 'cursor': runCursorMovement(); break;
      case 'scroll': runScrolling(); break;
      case 'linedraw': runLineDrawing(); break;
      case 'scrollregion': runScrollRegion(); break;
      case 'saverestore': runSaveRestore(); break;
      case 'tabstops': runTabStops(); break;
      case 'charsets': runCharacterSets(); break;
      case 'charsetcycle': runCharsetCycle(); break;
      case 'protected': runProtectedAreas(); break;
      case 'leds': runLEDs(); break;
      case 'queryresponse': runQueryResponse(); break;
      case 'rapid': runRapidOutput(); break;
      case 'scrollback': runScrollback(); break;
      case 'vt100glyphs': runVT100Glyphs(); break;
      case 'vt100linedraw': runVT100LineDraw(); break;
      case 'tdv2200banks': runTDV2200Banks(); break;
      case 'tdv2215banks': runTDV2215Banks(); break;
      case 'fontcompare': runFontCompare(); break;
    }
  }

  function runEchoMode() {
    if (echoMode) {
      if (echoDisposable) echoDisposable.dispose();
      echoMode = false;
      statusEl.textContent += ' — Echo OFF';
      return;
    }
    echoMode = true;
    statusEl.textContent += ' — Echo ON';
    term.write('Echo mode active. Type to see characters echoed.\r\n');
    term.write('Run Echo Mode again to disable.\r\n\r\n');
    echoDisposable = term.onKey(function (ev) {
      term.write(ev.key);
    });
  }

  function runBasicColors() {
    term.write('=== Basic Colors ===\r\n\r\n');
    var names = ['Black', 'Red', 'Green', 'Yellow', 'Blue', 'Magenta', 'Cyan', 'White'];
    for (var i = 0; i < 8; i++) {
      term.write('\x1b[' + (30 + i) + 'm ' + names[i].padEnd(10) + ' \x1b[0m');
      term.write('\x1b[' + (30 + i) + ';1m Bold \x1b[0m');
      term.write('\x1b[' + (40 + i) + 'm  BG  \x1b[0m');
      term.write('\r\n');
    }
    term.write('\r\n=== Bright Colors ===\r\n\r\n');
    for (var i = 0; i < 8; i++) {
      term.write('\x1b[' + (90 + i) + 'm ' + names[i].padEnd(10) + ' \x1b[0m');
      term.write('\x1b[' + (100 + i) + 'm  BG  \x1b[0m');
      term.write('\r\n');
    }
  }

  function run256Colors() {
    term.write('=== 256 Color Palette ===\r\n\r\n');
    for (var i = 0; i < 16; i++) {
      term.write('\x1b[48;5;' + i + 'm  \x1b[0m');
      if (i === 7) term.write('\r\n');
    }
    term.write('\r\n\r\n');
    for (var r = 0; r < 6; r++) {
      for (var g = 0; g < 6; g++) {
        for (var b = 0; b < 6; b++) {
          var idx = 16 + r * 36 + g * 6 + b;
          term.write('\x1b[48;5;' + idx + 'm \x1b[0m');
        }
        term.write(' ');
      }
      term.write('\r\n');
    }
    term.write('\r\n');
    for (var i = 232; i <= 255; i++) {
      term.write('\x1b[48;5;' + i + 'm  \x1b[0m');
    }
    term.write('\r\n');
  }

  function runAttributes() {
    term.write('=== Character Attributes ===\r\n\r\n');
    term.write('\x1b[1mBold\x1b[0m\r\n');
    term.write('\x1b[2mDim\x1b[0m\r\n');
    term.write('\x1b[3mItalic\x1b[0m\r\n');
    term.write('\x1b[4mUnderline\x1b[0m\r\n');
    term.write('\x1b[5mBlink\x1b[0m\r\n');
    term.write('\x1b[7mReverse\x1b[0m\r\n');
    term.write('\x1b[9mStrikethrough\x1b[0m\r\n');
    term.write('\r\n=== Combined ===\r\n\r\n');
    term.write('\x1b[1;4;31mBold+Underline+Red\x1b[0m\r\n');
    term.write('\x1b[1;3;32mBold+Italic+Green\x1b[0m\r\n');
    term.write('\x1b[7;33mReverse+Yellow\x1b[0m\r\n');
  }

  function runCursorMovement() {
    term.write('=== Cursor Movement ===\r\n\r\n');
    term.write('\x1b[5;10H*\x1b[5;20H*\x1b[10;10H*\x1b[10;20H*');
    for (var i = 11; i < 20; i++) {
      term.write('\x1b[5;' + i + 'H-');
      term.write('\x1b[10;' + i + 'H-');
    }
    for (var i = 6; i < 10; i++) {
      term.write('\x1b[' + i + ';10H|');
      term.write('\x1b[' + i + ';20H|');
    }
    term.write('\x1b[7;13HBox!');
    term.write('\x1b[12;1HBox drawn with CUP sequences.\r\n');
  }

  function runScrolling() {
    term.write('=== Scrolling Test ===\r\n\r\n');
    for (var i = 1; i <= 40; i++) {
      term.write('Line ' + String(i).padStart(3, '0') + ': The quick brown fox jumps over the lazy dog.\r\n');
    }
  }

  function runLineDrawing() {
    if (emulatorSelect.value !== 'vt100') {
      emulatorSelect.value = 'vt100';
      term.setEmulatorType('vt100');
      statusEl.textContent = 'Terminal: ' + term.cols + 'x' + term.rows + ' — VT100';
    }
    term.write('=== Line Drawing Characters (bitmap font) ===\r\n\r\n');
    term.write('\x1b(0');
    term.write('lqqqqqqqqqqk\r\n');
    term.write('x          x\r\n');
    term.write('x  Box!    x\r\n');
    term.write('x          x\r\n');
    term.write('tqqqqqqqqqqu\r\n');
    term.write('x          x\r\n');
    term.write('mqqqqqqqqqqj\r\n');
    term.write('\x1b(B');
    term.write('\r\nl=top-left, k=top-right, m=bottom-left, j=bottom-right\r\n');
    term.write('q=horizontal, x=vertical, t=left-tee, u=right-tee\r\n');
  }

  function runScrollRegion() {
    term.write('=== Scroll Regions ===\r\n\r\n');
    term.write('Setting scroll region to rows 5-15...\r\n');
    term.write('\x1b[5;15r');
    term.write('\x1b[5;1H');
    for (var i = 1; i <= 20; i++) {
      term.write('Scrolling line ' + i + ' within region\r\n');
    }
    term.write('\x1b[r');
    term.write('\x1b[20;1HScroll region test complete.\r\n');
  }

  function runSaveRestore() {
    term.write('=== Cursor Save/Restore ===\r\n\r\n');
    term.write('Writing at position...');
    term.write('\x1b7');
    term.write('\x1b[10;20HInserted at (10,20)');
    term.write('\x1b8');
    term.write(' ...restored!\r\n\r\nDECSC/DECRC working.\r\n');
  }

  function runTabStops() {
    term.write('=== Tab Stops ===\r\n\r\n');
    term.write('Default tabs (every 8 columns):\r\n');
    term.write('1\t2\t3\t4\t5\t6\t7\t8\r\n');
    term.write('A\tBB\tCCC\tDDDD\tEEEEE\r\n');
  }

  var charsetNames = [
    'US ASCII', 'Graphics I', 'Graphics II', 'Math', 'Greek',
    'Diacritics', 'Box Drawing', 'NIX', 'Technical', 'ND Private'
  ];

  function runCharacterSets() {
    var emuType = emulatorSelect.value;
    if (emuType !== 'tdv2215' && emuType !== 'tdv2200') {
      emuType = 'tdv2200';
      emulatorSelect.value = emuType;
      term.setEmulatorType(emuType);
      statusEl.textContent = 'Terminal: ' + term.cols + 'x' + term.rows + ' — ' + emuType.toUpperCase();
    }
    var renderer = term.getRenderer();
    var cw = renderer ? renderer.charWidth : '?';
    var ch = renderer ? renderer.charHeight : '?';

    term.write('\x1b[1m=== TDV Character Sets (' + emuType.toUpperCase() + ') ===\x1b[0m\r\n');
    term.write('Bitmap font: ' + cw + 'x' + ch + ' px\r\n\r\n');

    if (emuType === 'tdv2200') {
      // TDV2200: all 10 charsets via G0 designation (ESC ( n)
      for (var s = 0; s <= 9; s++) {
        var label = s + ': ' + charsetNames[s];
        term.write(label.padEnd(22));
        term.write('\x1b(' + s);
        for (var c = 0x60; c <= 0x7E; c++) term.write(String.fromCharCode(c));
        term.write('\x1b(0');
        term.write('\r\n');
      }
    } else {
      // TDV2215: G2/G3 accessible via SS2/SS3 (per-char, no state issues)
      // G2 defaults to Graphics I (Line Drawing), G3 defaults to Graphics II (Subscript)
      term.write('SS2 (G2=Line Drawing, 0x20-0x7E):\r\n  ');
      for (var c = 0x20; c <= 0x4F; c++) term.write('\x1bN' + String.fromCharCode(c));
      term.write('\r\n  ');
      for (var c = 0x50; c <= 0x7E; c++) term.write('\x1bN' + String.fromCharCode(c));
      term.write('\r\n');
      // SS3 valid range: 0x20-0x4F (subscript font has data there)
      term.write('SS3 (G3=Subscript, 0x20-0x4F):\r\n  ');
      for (var c = 0x20; c <= 0x4F; c++) term.write('\x1bO' + String.fromCharCode(c));
      term.write('\r\n');
      // Explicit subscript/superscript digit test (0x00-0x09, 0x10-0x19)
      term.write('SS3 Subscript digits (0x00-0x09):  ');
      for (var c = 0x00; c <= 0x09; c++) term.write('\x1bO' + String.fromCharCode(c) + ' ');
      term.write('\r\n');
      term.write('SS3 Superscript digits (0x10-0x19): ');
      for (var c = 0x10; c <= 0x19; c++) term.write('\x1bO' + String.fromCharCode(c) + ' ');
      term.write('\r\n');
      term.write('\r\nNote: TDV2215 maps via G2/G3 only (SS2/SS3/LS2/LS3).\r\n');
      term.write('G2=Line Drawing, G3=Subscript/Superscript.\r\n');
      term.write('Use TDV2200 mode to test all 10 character sets.\r\n');
    }

    // ISO 646 Variants — per-cell variant via bitmap font
    term.write('\r\n\x1b[1m=== ISO 646 Variants ===\x1b[0m\r\n');
    term.write('Bitmap font rendering. Variant stored per-cell.\r\n');
    term.write('Affected positions: # @ [ \\ ] ^ ` { | } ~\r\n\r\n');
    var variants = [
      { name: 'International', code: 'I' },
      { name: 'Norwegian/Danish', code: 'N' },
      { name: 'Swedish/Finnish', code: 'S' },
      { name: 'German', code: 'G' },
    ];
    for (var v = 0; v < variants.length; v++) {
      term.write('\x1b%' + variants[v].code);
      term.write(variants[v].name.padEnd(22));
      term.write('#@[\\]^`{|}~');
      term.write('\r\n');
    }
    term.write('\x1b%I');
  }

  // Detailed per-charset cycling test (TDV2200 only)
  var charsetCycleTimer = null;
  function runCharsetCycle() {
    if (emulatorSelect.value !== 'tdv2200') {
      emulatorSelect.value = 'tdv2200';
      term.setEmulatorType('tdv2200');
      statusEl.textContent = 'Terminal: ' + term.cols + 'x' + term.rows + ' — TDV2200';
    }
    if (charsetCycleTimer) { clearTimeout(charsetCycleTimer); charsetCycleTimer = null; }

    var current = 0;
    function showNext() {
      term.write('\x1b[2J\x1b[H');
      term.write('\x1b[1mCharacter Set ' + current + ': ' + charsetNames[current] + '\x1b[0m\r\n\r\n');
      term.write('Hex   ASCII  Mapped\r\n');
      term.write('----  -----  ------\r\n');
      term.write('\x1b(' + current);
      for (var c = 0x60; c <= 0x7E; c++) {
        term.write('\x1b(0');
        term.write('0x' + c.toString(16) + '  ' + String.fromCharCode(c) + '      ');
        term.write('\x1b(' + current);
        term.write(String.fromCharCode(c));
        term.write('\r\n');
      }
      term.write('\x1b(0');
      term.write('\r\nFull row: ');
      term.write('\x1b(' + current);
      for (var c = 0x60; c <= 0x7E; c++) term.write(String.fromCharCode(c));
      term.write('\x1b(0');

      current++;
      if (current <= 9) {
        term.write('\r\n\r\nNext: ' + current + ': ' + charsetNames[current] + ' in 3s...');
        charsetCycleTimer = setTimeout(showNext, 3000);
      } else {
        term.write('\r\n\r\nDone! All 10 character sets displayed.');
        charsetCycleTimer = null;
      }
    }
    showNext();
  }

  function runProtectedAreas() {
    if (emulatorSelect.value !== 'tdv2215' && emulatorSelect.value !== 'tdv2200') {
      emulatorSelect.value = 'tdv2200';
      term.setEmulatorType('tdv2200');
      statusEl.textContent = 'Terminal: ' + term.cols + 'x' + term.rows + ' — TDV2200';
    }
    term.write('=== Protected Areas ===\r\n\r\n');
    term.write('SPA: \x1b[1"q');
    term.write('PROTECTED TEXT');
    term.write('\x1b[2"q');
    term.write(' <-- Protected\r\n\r\nUnprotected text.\r\n');
  }

  function runLEDs() {
    if (emulatorSelect.value !== 'tdv2215' && emulatorSelect.value !== 'tdv2200') {
      emulatorSelect.value = 'tdv2200';
      term.setEmulatorType('tdv2200');
      statusEl.textContent = 'Terminal: ' + term.cols + 'x' + term.rows + ' — TDV2200';
    }
    term.write('=== Message LEDs ===\r\n\r\n');
    term.write('Setting LEDs...\r\n');
    term.write('\x1b[0q\x1b[1q\x1b[2q');
    term.write('LED commands sent.\r\n');
  }

  function runQueryResponse() {
    term.write('=== Query/Response ===\r\n\r\n');

    var emuType = emulatorSelect.value;

    // Collect all responses, then display
    var responses = [];
    var disposable = term.onData(function (data) {
      responses.push(new Uint8Array(data));
    });

    // Send queries
    var queries = [
      { name: 'Primary DA',   seq: '\x1b[c',  desc: 'Device Attributes' },
      { name: 'Secondary DA', seq: '\x1b[>c', desc: 'Firmware/Model ID' },
      { name: 'DSR',          seq: '\x1b[5n', desc: 'Device Status Report' },
      { name: 'CPR',          seq: '\x1b[6n', desc: 'Cursor Position Report' },
    ];

    for (var q = 0; q < queries.length; q++) {
      term.write(queries[q].seq);
    }

    // Display results after all responses collected (next frame)
    setTimeout(function () {
      disposable.dispose();

      for (var r = 0; r < responses.length; r++) {
        var data = responses[r];
        var queryInfo = r < queries.length ? queries[r] : { name: '?', desc: '?' };

        // Hex dump
        var hex = [];
        for (var i = 0; i < data.length; i++) hex.push(data[i].toString(16).padStart(2, '0'));

        // Readable escape sequence
        var readable = '';
        for (var i = 0; i < data.length; i++) {
          var b = data[i];
          if (b === 0x1b) readable += 'ESC ';
          else if (b < 0x20) readable += '<' + b.toString(16).padStart(2, '0') + '>';
          else readable += String.fromCharCode(b);
        }

        // Parse and explain
        var explanation = parseDAResponse(data, queryInfo.name, emuType);

        term.write('\x1b[1;33m' + queryInfo.name + '\x1b[0m (' + queryInfo.desc + ')\r\n');
        term.write('  Sent:     ' + queryInfo.seq.replace('\x1b', 'ESC ') + '\r\n');
        term.write('  Hex:      ' + hex.join(' ') + '\r\n');
        term.write('  Response: ' + readable + '\r\n');
        term.write('  Meaning:  \x1b[1;32m' + explanation + '\x1b[0m\r\n\r\n');
      }

      if (responses.length === 0) {
        term.write('\x1b[1;31mNo responses received.\x1b[0m\r\n');
        term.write('VT100 base emulator may not respond to all queries.\r\n');
      }
    }, 50);
  }

  function parseDAResponse(data, queryName, emuType) {
    var str = '';
    for (var i = 0; i < data.length; i++) str += String.fromCharCode(data[i]);

    // DSR: ESC [ 0 n = OK
    if (str === '\x1b[0n') return 'Device status: OK (no malfunctions)';

    // CPR: ESC [ row ; col R
    var cprMatch = str.match(/^\x1b\[(\d+);(\d+)R$/);
    if (cprMatch) return 'Cursor at row ' + cprMatch[1] + ', column ' + cprMatch[2];

    // Primary DA: ESC [ ? params c
    var daMatch = str.match(/^\x1b\[\?(.+)c$/);
    if (daMatch) {
      var params = daMatch[1].split(';').map(Number);
      var level = params[0];
      var levelName = {
        1: 'VT100', 6: 'VT102', 62: 'VT200-series', 63: 'VT300-series', 64: 'VT400-series'
      }[level] || ('Level ' + level);

      var features = [];
      var featureMap = {
        1: 'Columns (132)', 2: 'Printer', 4: 'Sixel Graphics',
        6: 'Selective Erase', 7: 'Soft Character Set (DRCS)',
        8: 'User-Defined Keys (UDK)', 9: 'National Replacement Character Sets',
        15: 'Technical Characters', 18: 'Windowing', 21: 'Horizontal Scroll',
        22: 'Color', 29: 'ANSI Text Locator',
      };
      for (var i = 1; i < params.length; i++) {
        var feat = featureMap[params[i]];
        features.push(feat ? feat : 'Feature ' + params[i]);
      }

      var termName = emuType === 'tdv2200' ? 'TDV2200' : emuType === 'tdv2215' ? 'TDV2215' : levelName;
      return termName + ' (' + levelName + ') — ' + (features.length > 0 ? features.join(', ') : 'No optional features');
    }

    // Secondary DA: ESC [ > Pp ; Pv ; Pc c
    var da2Match = str.match(/^\x1b\[>(\d+);(\d+);(\d+)c$/);
    if (da2Match) {
      var type = parseInt(da2Match[1], 10);
      var version = parseInt(da2Match[2], 10);
      var romVer = parseInt(da2Match[3], 10);
      var typeName = { 0: 'VT100', 1: 'VT220', 2: 'VT240', 18: 'VT330', 19: 'VT340', 24: 'VT320' }[type] || ('Type ' + type);
      var termName2 = emuType === 'tdv2200' ? 'TDV2200' : emuType === 'tdv2215' ? 'TDV2215' : typeName;
      return termName2 + ' (base type: ' + typeName + '), firmware version ' + version + ', ROM version ' + romVer;
    }

    return 'Unknown response format';
  }

  function runRapidOutput() {
    term.write('=== Rapid Output ===\r\n\r\n');
    var count = 0;
    var interval = setInterval(function () {
      for (var i = 0; i < 10; i++) {
        term.write('Rapid line ' + (++count) + ': abcdefghijklmnopqrstuvwxyz0123456789\r\n');
      }
      if (count >= 500) {
        clearInterval(interval);
        term.write('\r\nDone. 500 lines.\r\n');
      }
    }, 16);
  }

  function runScrollback() {
    term.write('=== Large Scrollback ===\r\n\r\n');
    for (var i = 1; i <= 1000; i++) {
      term.write('Line ' + String(i).padStart(5, '0') + ': Lorem ipsum dolor sit amet.\r\n');
    }
    term.write('\r\nDone. 1000 lines. Scroll up to verify.\r\n');
  }

  // === Font Tests ===

  function runVT100Glyphs() {
    if (emulatorSelect.value !== 'vt100') {
      emulatorSelect.value = 'vt100';
      term.setEmulatorType('vt100');
      statusEl.textContent = 'Terminal: ' + term.cols + 'x' + term.rows + ' — VT100';
    }
    var renderer = term.getRenderer();
    var cw = renderer ? renderer.charWidth : '?';
    var ch = renderer ? renderer.charHeight : '?';
    var active = renderer ? renderer.isBitmapFontActive : false;
    term.write('\x1b[1m=== VT100 Bitmap Font Glyph Grid ===\x1b[0m\r\n');
    term.write('Font: ' + cw + 'x' + ch + ' px, bitmap=' + active + '\r\n\r\n');

    // ASCII printable range 0x20-0x7E
    term.write('\x1b[1mASCII (0x20-0x7E):\x1b[0m\r\n');
    term.write('     0  1  2  3  4  5  6  7  8  9  A  B  C  D  E  F\r\n');
    for (var row = 2; row <= 7; row++) {
      term.write(row.toString(16) + '_:  ');
      for (var col = 0; col <= 15; col++) {
        var code = row * 16 + col;
        if (code >= 0x20 && code <= 0x7E) {
          term.write(String.fromCharCode(code) + '  ');
        } else {
          term.write('.  ');
        }
      }
      term.write('\r\n');
    }

    // DEC Special Graphics (ESC(0)
    term.write('\r\n\x1b[1mDEC Special Graphics (ESC(0), 0x60-0x7E:\x1b[0m\r\n');
    term.write('\x1b(0');
    for (var c = 0x60; c <= 0x7E; c++) {
      term.write(String.fromCharCode(c) + ' ');
    }
    term.write('\x1b(B');
    term.write('\r\n');

    // Special chars 0x00-0x1F in DEC mode
    term.write('\r\n\x1b[1mSpecial chars (0x01-0x1F via DEC SG):\x1b[0m\r\n');
    term.write('These map to special symbols in DEC terminals.\r\n');
    var decNames = [
      '', 'diamond', 'checker', 'HT', 'FF', 'CR', 'LF', 'degree',
      'plusminus', 'NL', 'VT', 'lower-R', 'upper-R', 'upper-L', 'lower-L', 'cross',
      'scan1', 'scan3', 'scan5', 'scan7', 'scan9', 'right-T', 'left-T', 'bot-T',
      'top-T', 'vline', 'lte', 'gte', 'pi', 'neq', 'pound', 'bullet'
    ];
    term.write('\x1b(0');
    for (var c = 0x60; c <= 0x7E; c++) {
      var idx = c - 0x60 + 0x01;
      var name = (idx < decNames.length && decNames[idx]) ? decNames[idx] : '?';
      term.write('\x1b(B');
      term.write('0x' + c.toString(16) + '=');
      term.write('\x1b(0');
      term.write(String.fromCharCode(c));
      term.write('\x1b(B');
      term.write('(' + name + ') ');
      if ((c - 0x60) % 5 === 4) term.write('\r\n');
    }
    term.write('\x1b(B\r\n');

    // Box drawing demo
    term.write('\r\n\x1b[1mBox drawing test:\x1b[0m\r\n');
    term.write('\x1b(0');
    term.write('lqqqqqqqqqqqqqqqqqqqk\r\n');
    term.write('x                   x\r\n');
    term.write('x   VT100 Bitmap    x\r\n');
    term.write('x   Font Working    x\r\n');
    term.write('x                   x\r\n');
    term.write('tqqqqqqqqqqqqqqqqqqqqu\r\n');
    term.write('x                   x\r\n');
    term.write('mqqqqqqqqqqqqqqqqqqqj\r\n');
    term.write('\x1b(B');
  }

  function runVT100LineDraw() {
    if (emulatorSelect.value !== 'vt100') {
      emulatorSelect.value = 'vt100';
      term.setEmulatorType('vt100');
      statusEl.textContent = 'Terminal: ' + term.cols + 'x' + term.rows + ' — VT100';
    }
    term.write('\x1b[1m=== VT100 Line Drawing — Bitmap Font ===\x1b[0m\r\n\r\n');

    // Complex box structure
    term.write('\x1b(0');
    term.write('lqqqqqqqqqqqwqqqqqqqqqqqk\r\n');
    term.write('x   Cell 1  x   Cell 2  x\r\n');
    term.write('tqqqqqqqqqqqnqqqqqqqqqqqu\r\n');
    term.write('x   Cell 3  x   Cell 4  x\r\n');
    term.write('mqqqqqqqqqqqvqqqqqqqqqqqj\r\n');
    term.write('\x1b(B');

    // Horizontal scan lines
    term.write('\r\n\x1b[1mScan lines (bitmap font):\x1b[0m\r\n');
    term.write('\x1b(0');
    term.write('ooooooooooooooooooooo  scan 1 (top)\r\n');
    term.write('ppppppppppppppppppppp  scan 3\r\n');
    term.write('qqqqqqqqqqqqqqqqqqqqq  scan 5 (middle)\r\n');
    term.write('rrrrrrrrrrrrrrrrrrrrr  scan 7\r\n');
    term.write('sssssssssssssssssssss  scan 9 (bottom)\r\n');
    term.write('\x1b(B');

    // Mixed text and graphics
    term.write('\r\n\x1b[1mMixed text and graphics:\x1b[0m\r\n');
    term.write('Normal text \x1b(0lqqk\x1b(B BOX \x1b(0lqqk\x1b(B more text\r\n');
    term.write('            \x1b(0x  x\x1b(B     \x1b(0x  x\x1b(B\r\n');
    term.write('            \x1b(0mqqj\x1b(B     \x1b(0mqqj\x1b(B\r\n');

    // Symbols
    term.write('\r\n\x1b[1mSpecial symbols:\x1b[0m\r\n');
    term.write('\x1b(0');
    term.write('` = diamond   ');
    term.write('a = checker   ');
    term.write('f = degree    ');
    term.write('g = plusminus\r\n');
    term.write('y = lte       ');
    term.write('z = gte       ');
    term.write('{ = pi        ');
    term.write('| = neq\r\n');
    term.write('} = pound     ');
    term.write('~ = bullet\r\n');
    term.write('\x1b(B');
  }

  function runTDV2200Banks() {
    if (emulatorSelect.value !== 'tdv2200') {
      emulatorSelect.value = 'tdv2200';
      term.setEmulatorType('tdv2200');
      statusEl.textContent = 'Terminal: ' + term.cols + 'x' + term.rows + ' — TDV2200';
    }
    var renderer = term.getRenderer();
    var cw = renderer ? renderer.charWidth : '?';
    var ch = renderer ? renderer.charHeight : '?';
    term.write('\x1b[1m=== TDV2200 Font Banks — Bitmap ===\x1b[0m\r\n');
    term.write('Font: ' + cw + 'x' + ch + ' px\r\n\r\n');

    for (var s = 0; s <= 9; s++) {
      var label = 'Set ' + s + ': ' + charsetNames[s];
      term.write('\x1b[1m' + label + '\x1b[0m\r\n');

      // Show 0x20-0x7E in this charset
      term.write('\x1b(' + s);
      term.write('  ');
      for (var c = 0x20; c <= 0x4F; c++) term.write(String.fromCharCode(c));
      term.write('\r\n  ');
      for (var c = 0x50; c <= 0x7E; c++) term.write(String.fromCharCode(c));
      term.write('\x1b(0');
      term.write('\r\n');
    }

    // ISO 646 variants
    term.write('\r\n\x1b[1m=== ISO 646 Variants ===\x1b[0m\r\n');
    term.write('Affected: # @ [ \\ ] ^ ` { | } ~\r\n\r\n');
    var variants = [
      { name: 'International', code: 'I' },
      { name: 'Norwegian',     code: 'N' },
      { name: 'Swedish',       code: 'S' },
      { name: 'German',        code: 'G' },
    ];
    for (var v = 0; v < variants.length; v++) {
      term.write('\x1b%' + variants[v].code);
      term.write(variants[v].name.padEnd(16));
      term.write('#@[\\]^`{|}~');
      term.write('\r\n');
    }
    term.write('\x1b%I');
  }

  function runTDV2215Banks() {
    if (emulatorSelect.value !== 'tdv2215') {
      emulatorSelect.value = 'tdv2215';
      term.setEmulatorType('tdv2215');
      statusEl.textContent = 'Terminal: ' + term.cols + 'x' + term.rows + ' — TDV2215';
    }
    var renderer = term.getRenderer();
    var cw = renderer ? renderer.charWidth : '?';
    var ch = renderer ? renderer.charHeight : '?';
    term.write('\x1b[1m=== TDV2215 Font Banks — Bitmap ===\x1b[0m\r\n');
    term.write('Font: ' + cw + 'x' + ch + ' px\r\n\r\n');

    // G0 = International ASCII
    term.write('\x1b[1mG0 — International ASCII:\x1b[0m\r\n  ');
    for (var c = 0x20; c <= 0x4F; c++) term.write(String.fromCharCode(c));
    term.write('\r\n  ');
    for (var c = 0x50; c <= 0x7E; c++) term.write(String.fromCharCode(c));
    term.write('\r\n');

    // G2 = Line Drawing (SS2)
    term.write('\r\n\x1b[1mG2 — Line Drawing (via SS2):\x1b[0m\r\n  ');
    for (var c = 0x20; c <= 0x4F; c++) term.write('\x1bN' + String.fromCharCode(c));
    term.write('\r\n  ');
    for (var c = 0x50; c <= 0x7E; c++) term.write('\x1bN' + String.fromCharCode(c));
    term.write('\r\n');

    // G3 = Subscript (SS3)
    term.write('\r\n\x1b[1mG3 — Subscript (via SS3, 0x00-0x1F):\x1b[0m\r\n  ');
    for (var c = 0x00; c <= 0x09; c++) term.write('\x1bO' + String.fromCharCode(c) + ' ');
    term.write(' (sub 0-9)\r\n  ');
    for (var c = 0x10; c <= 0x19; c++) term.write('\x1bO' + String.fromCharCode(c) + ' ');
    term.write(' (super 0-9)\r\n');

    // ISO 646 variants
    term.write('\r\n\x1b[1m=== ISO 646 Variants ===\x1b[0m\r\n');
    term.write('Affected: # @ [ \\ ] ^ ` { | } ~\r\n\r\n');
    var variants = [
      { name: 'International', code: 'I' },
      { name: 'Norwegian',     code: 'N' },
      { name: 'Swedish',       code: 'S' },
      { name: 'German',        code: 'G' },
    ];
    for (var v = 0; v < variants.length; v++) {
      term.write('\x1b%' + variants[v].code);
      term.write(variants[v].name.padEnd(16));
      term.write('#@[\\]^`{|}~');
      term.write('\r\n');
    }
    term.write('\x1b%I');
  }

  function runFontCompare() {
    var renderer = term.getRenderer();
    var cw = renderer ? renderer.charWidth : '?';
    var ch = renderer ? renderer.charHeight : '?';
    var active = renderer ? renderer.isBitmapFontActive : false;
    var fontName = renderer && renderer.bitmapFontRenderer
      ? renderer.bitmapFontRenderer.font.constructor.name
      : 'none';

    term.write('\x1b[1m=== Font Information ===\x1b[0m\r\n\r\n');
    term.write('Emulator:     ' + emulatorSelect.value.toUpperCase() + '\r\n');
    term.write('Bitmap font:  ' + (active ? 'ACTIVE' : 'inactive') + '\r\n');
    term.write('Font class:   ' + fontName + '\r\n');
    term.write('Cell size:    ' + cw + ' x ' + ch + ' px\r\n');
    term.write('Canvas:       ' + (renderer ? renderer.canvas.width + ' x ' + renderer.canvas.height + ' px' : 'n/a') + '\r\n');
    term.write('Grid:         ' + term.cols + ' x ' + term.rows + '\r\n');

    // Show sample text
    term.write('\r\n\x1b[1mSample text:\x1b[0m\r\n');
    term.write('ABCDEFGHIJKLMNOPQRSTUVWXYZ\r\n');
    term.write('abcdefghijklmnopqrstuvwxyz\r\n');
    term.write('0123456789 !@#$%^&*()_+-=\r\n');
    term.write('[]{}\\|;:\'",.<>?/`~\r\n');

    // Compare all emulators
    term.write('\r\n\x1b[1mFont sizes per emulator:\x1b[0m\r\n');
    var types = ['vt100', 'tdv2200', 'tdv2215'];
    var origType = emulatorSelect.value;
    for (var i = 0; i < types.length; i++) {
      term.setEmulatorType(types[i]);
      var r = term.getRenderer();
      var w = r ? r.charWidth : '?';
      var h = r ? r.charHeight : '?';
      var fn = r && r.bitmapFontRenderer ? r.bitmapFontRenderer.font.constructor.name : '?';
      term.write('  ' + types[i].toUpperCase().padEnd(10) + w + 'x' + h + ' px  (' + fn + ')\r\n');
    }
    // Restore original
    term.setEmulatorType(origType);
    emulatorSelect.value = origType;
    statusEl.textContent = 'Terminal: ' + term.cols + 'x' + term.rows + ' — ' + origType.toUpperCase();
  }
})();
