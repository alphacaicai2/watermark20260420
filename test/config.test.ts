import { describe, expect, it } from 'vitest';
import { loadResolvedConfig, mergeConfig } from '../src/config/load-config.js';

describe('config', () => {
  it('returns the standard template by default', () => {
    const config = mergeConfig();

    expect(config.defaultTemplate).toBe('standard');
    expect(config.templates.standard?.fontSize).toBe(56);
  });

  it('merges inline templates over file templates', async () => {
    const config = await loadResolvedConfig({
      config: {
        defaultTemplate: 'compact',
        templates: {
          compact: {
            fontSize: 24,
            opacity: 0.2,
            rotation: 30,
            colorRgb: [0.1, 0.2, 0.3],
            position: 'center'
          }
        }
      }
    });

    expect(config.defaultTemplate).toBe('compact');
    expect(config.templates.compact?.opacity).toBe(0.2);
  });

  it('rejects invalid config shapes', async () => {
    await expect(
      loadResolvedConfig({ config: { templates: { broken: { fontSize: -1 } } } as never })
    ).rejects.toMatchObject({ code: 'CONFIG_INVALID' });
  });
});
