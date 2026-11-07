import { describe, expect, it } from 'vitest';
import { generateEmployees } from '../../src/seed/generateEmployees';

describe('generateEmployees', () => {
  it('generates exactly the requested number of employees', () => {
    const employees = generateEmployees({ seed: 42, count: 25 });

    expect(employees).toHaveLength(25);
  });
});
