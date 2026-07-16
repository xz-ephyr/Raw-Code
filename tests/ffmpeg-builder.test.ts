import { describe, it, expect } from 'vitest';
import type { EditManifestT } from '../packages/tool-runtime/src/video/manifest';
import { buildCommands, formatShellCommand } from '../packages/tool-runtime/src/video/ffmpeg-builder';

describe('ffmpeg-builder', () => {
  it('builds a trim command', () => {
    const manifest: EditManifestT = {
      version: 1,
      output: { filename: 'out.mp4' },
      operations: [{ type: 'trim', source: 'clip.mp4', start: '10', end: '20' }],
    };
    const cmds = buildCommands(manifest);
    expect(cmds).toHaveLength(2); // trim + copy to final
    expect(cmds[0].args).toContain('-ss');
    expect(cmds[0].args).toContain('10');
    expect(cmds[0].args).toContain('-to');
    expect(cmds[0].args).toContain('20');
    expect(cmds[0].args).toContain('-c');
    expect(cmds[0].args).toContain('copy');
  });

  it('builds a scale command', () => {
    const manifest: EditManifestT = {
      version: 1,
      output: { filename: 'out.mp4' },
      operations: [{ type: 'trim', source: 'clip.mp4', start: '0', end: '10' }, { type: 'scale', width: 1280 }],
    };
    const cmds = buildCommands(manifest);
    const scaleCmd = cmds.find((c) => c.args.includes('-vf'));
    expect(scaleCmd).toBeDefined();
    expect(scaleCmd!.args.join(' ')).toContain('scale=1280');
  });

  it('builds an overlay command', () => {
    const manifest: EditManifestT = {
      version: 1,
      output: { filename: 'out.mp4' },
      operations: [
        { type: 'trim', source: 'bg.mp4', start: '0', duration: '5' },
        { type: 'overlay', source: 'logo.png', x: 10, y: 10 },
      ],
    };
    const cmds = buildCommands(manifest);
    const ovCmd = cmds.find((c) => c.args.includes('-i') && c.description === 'Overlay image');
    expect(ovCmd).toBeDefined();
    expect(ovCmd!.args.join(' ')).toContain('overlay=10:10');
  });

  it('builds a concat command', () => {
    const manifest: EditManifestT = {
      version: 1,
      output: { filename: 'out.mp4' },
      operations: [{ type: 'concat', sources: ['a.mp4', 'b.mp4', 'c.mp4'] }],
    };
    const cmds = buildCommands(manifest);
    expect(cmds[0].args).toContain('-filter_complex');
    expect(cmds[0].args.join(' ')).toContain('concat=n=3');
  });

  it('builds a speed command', () => {
    const manifest: EditManifestT = {
      version: 1,
      output: { filename: 'out.mp4' },
      operations: [{ type: 'trim', source: 'clip.mp4', start: '0', duration: '10' }, { type: 'speed', factor: 2 }],
    };
    const cmds = buildCommands(manifest);
    const speedCmd = cmds.find((c) => c.args.some((a) => a.includes('atempo')));
    expect(speedCmd).toBeDefined();
    expect(speedCmd!.args.join(' ')).toContain('atempo=2');
    expect(speedCmd!.args.join(' ')).toContain('setpts=0.5*PTS');
  });

  it('builds a drawtext command', () => {
    const manifest: EditManifestT = {
      version: 1,
      output: { filename: 'out.mp4' },
      operations: [
        { type: 'trim', source: 'clip.mp4', start: '0', duration: '10' },
        { type: 'drawtext', text: 'Hello World', fontSize: 24, color: 'white' },
      ],
    };
    const cmds = buildCommands(manifest);
    const dtCmd = cmds.find((c) => c.args.includes('-vf'));
    expect(dtCmd).toBeDefined();
    expect(dtCmd!.args.join(' ')).toContain("text='Hello World'");
    expect(dtCmd!.args.join(' ')).toContain('fontsize=24');
    expect(dtCmd!.args.join(' ')).toContain('fontcolor=white');
  });

  it('builds a GIF command (two-pass)', () => {
    const manifest: EditManifestT = {
      version: 1,
      output: { filename: 'out.gif' },
      operations: [{ type: 'gif', source: 'clip.mp4', width: 480, fps: 15 }],
    };
    const cmds = buildCommands(manifest);
    expect(cmds).toHaveLength(3); // palette, gif, copy-to-final
    expect(cmds[0].args.join(' ')).toContain('palettegen');
    expect(cmds[1].args.join(' ')).toContain('paletteuse');
    expect(cmds[2].args.join(' ')).toContain('out.gif');
  });

  it('builds an audio mix command', () => {
    const manifest: EditManifestT = {
      version: 1,
      output: { filename: 'out.mp4' },
      operations: [
        { type: 'trim', source: 'video.mp4', start: '0', duration: '30' },
        { type: 'audiomix', source: 'bgm.mp3', volume: 0.5 },
      ],
    };
    const cmds = buildCommands(manifest);
    const mixCmd = cmds.find((c) => c.description === 'Mix audio');
    expect(mixCmd).toBeDefined();
    expect(mixCmd!.args.join(' ')).toContain('volume=0.5');
    expect(mixCmd!.args.join(' ')).toContain('amix');
  });

  it('builds a normalize audio command', () => {
    const manifest: EditManifestT = {
      version: 1,
      output: { filename: 'out.mp4' },
      operations: [{ type: 'normalizeaudio' }],
    };
    const cmds = buildCommands(manifest);
    expect(cmds[0].args.join(' ')).toContain('loudnorm');
    expect(cmds[0].args.join(' ')).toContain('I=-14');
  });

  it('builds a subtitle burn command', () => {
    const manifest: EditManifestT = {
      version: 1,
      output: { filename: 'out.mp4' },
      operations: [{ type: 'subtitles', source: 'clip.mp4', file: 'subs.srt' }],
    };
    const cmds = buildCommands(manifest);
    expect(cmds[0].args).toContain('-vf');
    expect(cmds[0].args.join(' ')).toContain('subtitles');
  });

  it('formats a shell command', () => {
    const manifest: EditManifestT = {
      version: 1,
      output: { filename: 'out.mp4' },
      operations: [{ type: 'trim', source: 'clip.mp4', start: '0', end: '10' }],
    };
    const cmds = buildCommands(manifest);
    const shell = formatShellCommand(cmds[0]);
    expect(shell).toMatch(/^ffmpeg /);
    expect(shell).toContain('-ss 0');
  });

  it('handles empty operations with passthrough', () => {
    const manifest: EditManifestT = {
      version: 1,
      output: { filename: 'out.mp4' },
      operations: [],
    };
    const cmds = buildCommands(manifest);
    expect(cmds).toHaveLength(1);
    expect(cmds[0].args).toContain('-c');
    expect(cmds[0].args).toContain('copy');
  });

  it('escapes colons in file paths', () => {
    const manifest: EditManifestT = {
      version: 1,
      output: { filename: 'out.mp4' },
      operations: [{ type: 'trim', source: 'C:\\clips\\test.mp4', start: '0', end: '10' }],
    };
    const cmds = buildCommands(manifest);
    expect(cmds[0].args.join(' ')).toContain('clip');
  });
});
