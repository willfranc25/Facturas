import { describe, it, expect } from 'vitest';
import { validateRut, formatRut, cleanRut } from './rutValidator';

describe('cleanRut', () => {
  it('elimina puntos, guiones y espacios', () => {
    expect(cleanRut('12.345.678-5')).toBe('123456785');
    expect(cleanRut('12 345 678-5')).toBe('123456785');
    expect(cleanRut('5.126.663-3')).toBe('51266633');
  });
});

describe('validateRut', () => {
  it('valida RUTs chilenos conocidos como válidos', () => {
    // DV calculados con algoritmo módulo 11
    expect(validateRut('12.345.678-5')).toBe(true);  // DV=5
    expect(validateRut('11.111.111-1')).toBe(true);  // DV=1
    expect(validateRut('76.354.771-K')).toBe(true);  // DV=K (Jumbo)
    expect(validateRut('99.520.000-7')).toBe(true);  // DV=7 (Copec)
    expect(validateRut('5.126.663-3')).toBe(true);   // DV=3
  });

  it('valida RUTs con DV = K', () => {
    expect(validateRut('76.354.771-K')).toBe(true);
    expect(validateRut('76354771-K')).toBe(true);
    expect(validateRut('76354771-k')).toBe(true);  // minúscula también válida
  });

  it('valida RUTs sin puntos', () => {
    expect(validateRut('12345678-5')).toBe(true);
    expect(validateRut('11111111-1')).toBe(true);
  });

  it('valida RUTs sin guión ni puntos', () => {
    expect(validateRut('123456785')).toBe(true);
    expect(validateRut('111111111')).toBe(true);
    expect(validateRut('76354771K')).toBe(true);
  });

  it('rechaza RUTs con DV incorrecto', () => {
    expect(validateRut('12.345.678-9')).toBe(false);  // DV correcto es 5
    expect(validateRut('11.111.111-2')).toBe(false);  // DV correcto es 1
    expect(validateRut('76.354.771-9')).toBe(false);  // DV correcto es K
    expect(validateRut('5.126.663-K')).toBe(false);   // DV correcto es 0
  });

  it('retorna false para inputs vacíos o malformados', () => {
    expect(validateRut('')).toBe(false);
    expect(validateRut('abc')).toBe(false);
    expect(validateRut('123')).toBe(false);
    expect(validateRut('--')).toBe(false);
  });
});

describe('formatRut', () => {
  it('formatea RUT al formato XX.XXX.XXX-X', () => {
    expect(formatRut('123456785')).toBe('12.345.678-5');
    expect(formatRut('12345678-5')).toBe('12.345.678-5');
    expect(formatRut('12.345.678-5')).toBe('12.345.678-5');
  });

  it('formatea RUT con DV = K', () => {
    expect(formatRut('76354771K')).toBe('76.354.771-K');
    expect(formatRut('76.354.771-K')).toBe('76.354.771-K');
  });

  it('formatea RUT de 7 dígitos', () => {
    expect(formatRut('51266633')).toBe('5.126.663-3');
    expect(formatRut('5.126.663-3')).toBe('5.126.663-3');
  });

  it('retorna string vacío para inputs inválidos', () => {
    expect(formatRut('')).toBe('');
    expect(formatRut('abc')).toBe('');
    expect(formatRut('123')).toBe('');
  });
});
