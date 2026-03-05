/**
 * @retroterm/web — TypeScript terminal emulator library
 *
 * Provides VT100, TDV2215, and TDV2200 terminal emulation in the browser.
 */

// Buffer
export { TerminalCell } from './buffer/TerminalCell';
export { TerminalColor, StandardColors } from './buffer/TerminalColor';
export { CharacterAttributes, hasAttribute, setAttribute, clearAttribute, toggleAttribute, isDoubleSize } from './buffer/CharacterAttributes';
export { TerminalBuffer } from './buffer/TerminalBuffer';

// Parser
export { EscapeSequenceParser } from './parser/EscapeSequenceParser';
export { ParserState } from './parser/ParserState';

// Emulators
export { TerminalEmulatorBase } from './emulators/TerminalEmulatorBase';
export { CursorState, CursorStyle } from './emulators/CursorState';

// TDV Emulators
export { TDVEmulatorBase } from './emulators/tdv/TDVEmulatorBase';
export { TDV2215Emulator } from './emulators/tdv/TDV2215Emulator';
export { TDV2200Emulator } from './emulators/tdv/TDV2200Emulator';
export { TDV2200ISO646Variant } from './emulators/tdv/TDV2200ISO646Variant';

// TDV Components
export { TDVProtectedAreas } from './emulators/tdv/components/TDVProtectedAreas';
export { TDVWorkAreas } from './emulators/tdv/components/TDVWorkAreas';
export { TDVMessageLEDs, TDVMessageLEDType } from './emulators/tdv/components/TDVMessageLEDs';
export { TDVRectangleOperations } from './emulators/tdv/components/TDVRectangleOperations';
export { TDVPushKeys } from './emulators/tdv/components/TDVPushKeys';
export { TDVCharacterSetType, CHARSET_TYPE_TO_FONTNUM, characterSetExists, getCharacterSetName } from './emulators/tdv/components/TDVCharacterSets';
export { TDVCharacterSetManager } from './emulators/tdv/components/TDVCharacterSetManager';
export { TDVISO646VariantHandler } from './emulators/tdv/components/TDVISO646VariantHandler';
export { TDV2115CompatibilityHandler } from './emulators/tdv/components/TDV2115CompatibilityHandler';
export { TDVDCSHandler } from './emulators/tdv/components/TDVDCSHandler';
export { TDVExtendedModeFeature } from './emulators/tdv/components/TDVExtendedModeFeature';
export { TDVTransparentModeFeature } from './emulators/tdv/components/TDVTransparentModeFeature';
export { TDVDCSHandlerFeature } from './emulators/tdv/components/TDVDCSHandlerFeature';
export { TDV2215Features } from './emulators/tdv/components/TDV2215Features';
export { TDVInputProcessor } from './emulators/tdv/components/TDVInputProcessor';

// Terminal
export { Terminal, FitAddon } from './terminal/Terminal';
export type { EmulatorType } from './terminal/Terminal';
export type { IDisposable } from './terminal/Disposable';
export { EventEmitter, toDisposable } from './terminal/Disposable';
export type { TerminalOptions, TerminalTheme } from './terminal/TerminalOptions';
export { Themes } from './terminal/TerminalOptions';

// Renderer
export { CanvasRenderer } from './renderer/CanvasRenderer';
export { SystemFontRenderer } from './renderer/SystemFontRenderer';
export { BitmapFontRenderer } from './renderer/BitmapFontRenderer';
export { RenderState } from './renderer/RenderState';

// Fonts
export { FontBase } from './fonts/FontBase';
export { FontTDV2200 } from './fonts/FontTDV2200';
export { FontTDV2215 } from './fonts/FontTDV2215';
export { FontVT100 } from './fonts/FontVT100';

// Keyboard
export { VT100KeyboardMapper, domKeyToVK, domModifiersToFlags, getXtermModifierParameter } from './keyboard/KeyboardMapper';
export { KeyModifiers, TerminalModes } from './keyboard/KeyboardMapper';
export type { IKeyboardMapper } from './keyboard/KeyboardMapper';
export { TDVKeyboardMapper } from './keyboard/TDVKeyboardMapper';
export { TDV2200KeyRegistry, LANGUAGE_CODES, TDVKeyColor, TDVKeyFlags } from './keyboard/TDV2200KeyRegistry';
export type { TDVKeyDefinition, TDVKeyLabel, LanguageCode } from './keyboard/TDV2200KeyRegistry';
export { ND246KeyboardMapper } from './keyboard/ND246KeyboardMapper';
export { mapAltKeyToGrid, mapAltKeyToSequence } from './keyboard/AltKeyMapper';
export { VirtualKeyboard } from './keyboard/VirtualKeyboard';
export type { VirtualKeyboardLayout } from './keyboard/VirtualKeyboard';

// Features
export { BellHandler } from './features/BellHandler';
export type { BellOptions } from './features/BellHandler';
export { SelectionManager } from './features/SelectionManager';
export type { SelectionRange, SelectionMode } from './features/SelectionManager';
export { ClipboardManager } from './features/ClipboardManager';
export { ScrollbackSearch } from './features/ScrollbackSearch';
export type { SearchMatch, SearchOptions } from './features/ScrollbackSearch';
