import { describe, expect, it } from 'vitest';
import { csvCell } from './export';

describe('export CSV', () => {
  it('échappe les guillemets, séparateurs et retours à la ligne', () => {
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell('dit "oui"')).toBe('"dit ""oui"""');
    expect(csvCell(null)).toBe('');
  });
  it('neutralise les formules à l’ouverture dans un tableur', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('+33')).toBe("'+33");
    expect(csvCell('-1')).toBe("'-1");
  });
});
