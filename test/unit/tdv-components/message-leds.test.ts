import { describe, it, expect } from 'vitest';
import { TDVMessageLEDs, TDVMessageLEDType } from '../../../src/emulators/tdv/components/TDVMessageLEDs';

describe('TDVMessageLEDs', () => {
  it('should initialize with all LEDs off', () => {
    const leds = new TDVMessageLEDs();
    const states = leds.getLEDStates();
    expect(states.clear).toBe(false);
    expect(states.set).toBe(false);
    expect(states.blink).toBe(false);
  });

  it('should set individual LEDs on', () => {
    const leds = new TDVMessageLEDs();
    leds.setLED(TDVMessageLEDType.Clear, true);
    expect(leds.getLEDStates().clear).toBe(true);
    expect(leds.getLEDStates().set).toBe(false);
    expect(leds.getLEDStates().blink).toBe(false);

    leds.setLED(TDVMessageLEDType.Set, true);
    expect(leds.getLEDStates().set).toBe(true);

    leds.setLED(TDVMessageLEDType.Blink, true);
    expect(leds.getLEDStates().blink).toBe(true);
  });

  it('should turn LEDs off', () => {
    const leds = new TDVMessageLEDs();
    leds.setLED(TDVMessageLEDType.Clear, true);
    leds.setLED(TDVMessageLEDType.Clear, false);
    expect(leds.getLEDStates().clear).toBe(false);
  });

  it('should reset all LEDs', () => {
    const leds = new TDVMessageLEDs();
    leds.setLED(TDVMessageLEDType.Clear, true);
    leds.setLED(TDVMessageLEDType.Set, true);
    leds.setLED(TDVMessageLEDType.Blink, true);
    leds.clear();
    const states = leds.getLEDStates();
    expect(states.clear).toBe(false);
    expect(states.set).toBe(false);
    expect(states.blink).toBe(false);
  });
});
