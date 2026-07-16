import type { EditManifestT, EditOperationT } from './manifest';

export interface FfmpegCommand {
  args: string[];
  inputFiles: string[];
  outputFile: string;
  description: string;
}

function buildFilterChain(ops: EditOperationT[]): string {
  const filters: string[] = [];

  for (const op of ops) {
    switch (op.type) {
      case 'scale': {
        const h = op.height ?? -2;
        filters.push(`scale=${op.width}:${h}`);
        break;
      }
      case 'crop':
        filters.push(`crop=${op.width}:${op.height}:${op.x}:${op.y}`);
        break;
      case 'speed':
        filters.push(`setpts=${1 / op.factor}*PTS`);
        break;
      case 'color': {
        const parts: string[] = [];
        if (op.brightness !== undefined) parts.push(`brightness=${op.brightness}`);
        if (op.contrast !== undefined) parts.push(`contrast=${op.contrast}`);
        if (op.saturation !== undefined) parts.push(`saturation=${op.saturation}`);
        if (op.gamma !== undefined) parts.push(`gamma=${op.gamma}`);
        if (parts.length) filters.push(`eq=${parts.join(':')}`);
        break;
      }
      case 'drawtext': {
        const escaped = op.text.replace(/'/g, "'\\''").replace(/:/g, '\\:');
        const parts: string[] = [`text='${escaped}'`];
        if (op.font) parts.push(`font=${op.font.replace(/:/g, '\\:')}`);
        if (op.fontSize) parts.push(`fontsize=${op.fontSize}`);
        if (op.color) parts.push(`fontcolor=${op.color}`);
        if (op.x) parts.push(`x=${op.x}`);
        if (op.y) parts.push(`y=${op.y}`);
        filters.push(`drawtext=${parts.join(':')}`);
        break;
      }
    }
  }

  return filters.length ? filters.join(',') : '';
}

function escapePath(p: string): string {
  return p.replace(/:/g, '\\:');
}

export function buildCommands(manifest: EditManifestT): FfmpegCommand[] {
  const commands: FfmpegCommand[] = [];
  const intermediateFiles: string[] = [];
  let segmentIndex = 0;

  const out = manifest.output;

  for (const op of manifest.operations) {
    switch (op.type) {
      case 'trim': {
        const input = escapePath(op.source);
        const args = ['-y'];
        args.push('-ss', op.start);
        if (op.end) args.push('-to', op.end);
        if (op.duration) args.push('-t', op.duration);
        args.push('-i', input);
        args.push('-c', 'copy');
        const outFile = `trimmed_${segmentIndex++}.mp4`;
        args.push(outFile);
        commands.push({ args, inputFiles: [op.source], outputFile: outFile, description: `Trim ${op.source}` });
        intermediateFiles.push(outFile);
        break;
      }

      case 'scale':
      case 'crop':
      case 'speed':
      case 'color':
      case 'drawtext': {
        const input = intermediateFiles.length > 0 ? intermediateFiles[intermediateFiles.length - 1] : escapePath('input.mp4');
        const args = ['-y', '-i', input];
        const filter = buildFilterChain([op]);
        if (filter) args.push('-vf', filter);
        let outFile = '';
        if (op.type === 'speed') {
          args.push('-af', `atempo=${(op as any).factor}`);
          outFile = `speed_${segmentIndex++}.mp4`;
        } else {
          outFile = `filtered_${segmentIndex++}.mp4`;
        }
        args.push(outFile);
        commands.push({ args, inputFiles: [input], outputFile: outFile, description: `Apply ${op.type}` });
        intermediateFiles.push(outFile);
        break;
      }

      case 'overlay': {
        const main = intermediateFiles.length > 0 ? intermediateFiles[intermediateFiles.length - 1] : escapePath('input.mp4');
        const overlay = escapePath(op.source);
        const args = ['-y', '-i', main, '-i', overlay];
        const overlayFilter = `[0:v][1:v]overlay=${op.x}:${op.y}`;
        if (op.scale) {
          args.push('-vf', `[1:v]scale=${op.scale}:-2[ovr];${overlayFilter}`);
        } else {
          args.push('-vf', overlayFilter);
        }
        const outFile = `overlay_${segmentIndex++}.mp4`;
        args.push(outFile);
        commands.push({ args, inputFiles: [main, op.source], outputFile: outFile, description: 'Overlay image' });
        intermediateFiles.push(outFile);
        break;
      }

      case 'subtitles': {
        const input = intermediateFiles.length > 0 ? intermediateFiles[intermediateFiles.length - 1] : escapePath(op.source);
        const subFile = escapePath(op.file);
        const args = ['-y', '-i', input, '-vf', `subtitles=${subFile}`];
        const outFile = `subs_${segmentIndex++}.mp4`;
        args.push(outFile);
        commands.push({ args, inputFiles: [input, op.file], outputFile: outFile, description: 'Burn subtitles' });
        intermediateFiles.push(outFile);
        break;
      }

      case 'concat': {
        const args = ['-y'];
        for (const src of op.sources) {
          args.push('-i', escapePath(src));
        }
        const inputs = op.sources.map((_, i) => `[${i}:v][${i}:a]`).join('');
        const filter = `${inputs}concat=n=${op.sources.length}:v=1:a=1[outv][outa]`;
        args.push('-filter_complex', filter);
        args.push('-map', '[outv]', '-map', '[outa]');
        if (!op.reencode) args.push('-c', 'copy');
        const outFile = `concat_${segmentIndex++}.mp4`;
        args.push(outFile);
        commands.push({ args, inputFiles: [...op.sources], outputFile: outFile, description: 'Concatenate clips' });
        intermediateFiles.push(outFile);
        break;
      }

      case 'audiomix': {
        const main = intermediateFiles.length > 0 ? intermediateFiles[intermediateFiles.length - 1] : escapePath('input.mp4');
        const audioSrc = escapePath(op.source);
        const args = ['-y', '-i', main, '-i', audioSrc];
        const vol = op.volume !== undefined ? op.volume : 1;
        const filter = `[1:a]volume=${vol}[a1];[0:a][a1]amix=inputs=2:duration=first[outa]`;
        args.push('-filter_complex', filter);
        args.push('-map', '0:v', '-map', '[outa]');
        const outFile = `mix_${segmentIndex++}.mp4`;
        args.push(outFile);
        commands.push({ args, inputFiles: [main, op.source], outputFile: outFile, description: 'Mix audio' });
        intermediateFiles.push(outFile);
        break;
      }

      case 'normalizeaudio': {
        const input = intermediateFiles.length > 0 ? intermediateFiles[intermediateFiles.length - 1] : escapePath('input.mp4');
        const lufs = op.targetLUFS ?? -14;
        const args = ['-y', '-i', input, '-af', `loudnorm=I=${lufs}:LRA=11:TP=-1.5`, '-c:v', 'copy'];
        const outFile = `normalized_${segmentIndex++}.mp4`;
        args.push(outFile);
        commands.push({ args, inputFiles: [input], outputFile: outFile, description: 'Normalize audio' });
        intermediateFiles.push(outFile);
        break;
      }

      case 'gif': {
        const input = escapePath(op.source);
        const palFile = `palette_${segmentIndex}.png`;
        const paletteArgs = ['-y', '-i', input];
        if (op.maxDuration) paletteArgs.push('-t', String(op.maxDuration));
        paletteArgs.push('-vf', `fps=${op.fps ?? 12},scale=${op.width ?? 640}:-1:flags=lanczos,palettegen=stats_mode=diff`);
        paletteArgs.push(palFile);
        commands.push({ args: paletteArgs, inputFiles: [op.source], outputFile: palFile, description: 'Generate GIF palette' });

        const gifArgs = ['-y', '-i', input, '-i', palFile];
        if (op.maxDuration) gifArgs.push('-t', String(op.maxDuration));
        gifArgs.push('-lavfi', `fps=${op.fps ?? 12},scale=${op.width ?? 640}:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer`);
        const outFile = `output_${segmentIndex++}.gif`;
        gifArgs.push(outFile);
        commands.push({ args: gifArgs, inputFiles: [op.source, palFile], outputFile: outFile, description: 'Render GIF' });
        intermediateFiles.push(outFile);
        break;
      }

      case 'thumbnail': {
        const input = escapePath(op.source);
        const w = op.width ?? 320;
        const outFile = op.outputName ?? `thumb_${segmentIndex++}.jpg`;
        const args = ['-y', '-ss', op.at, '-i', input, '-vframes', '1', '-vf', `scale=${w}:-2`];
        args.push(outFile);
        commands.push({ args, inputFiles: [op.source], outputFile: outFile, description: `Thumbnail at ${op.at}` });
        break;
      }

      case 'preview': {
        const input = escapePath(op.source);
        const duration = op.duration ?? 15;
        const w = op.width ?? 640;
        const start = op.start ?? '00:00:00';
        const crf = op.crf ?? 35;
        const args = ['-y', '-ss', start, '-i', input, '-t', String(duration), '-vf', `scale=${w}:-2`, '-c:v', 'libx264', '-crf', String(crf), '-preset', 'ultrafast', '-an'];
        const outFile = `preview_${segmentIndex++}.mp4`;
        args.push(outFile);
        commands.push({ args, inputFiles: [op.source], outputFile: outFile, description: `Preview ${duration}s at ${w}w` });
        break;
      }
    }
  }

  if (commands.length === 0) {
    // Passthrough if no operations
    const args = ['-y', '-i', escapePath('input.mp4'), '-c', 'copy', out.filename];
    commands.push({ args, inputFiles: ['input.mp4'], outputFile: out.filename, description: 'No-op passthrough' });
  } else {
    const last = commands[commands.length - 1];
    if (last.outputFile !== out.filename) {
      const args = ['-y', '-i', last.outputFile, '-c', 'copy', out.filename];
      commands.push({ args, inputFiles: [last.outputFile], outputFile: out.filename, description: 'Copy to final output' });
    }
  }

  return commands;
}

export function formatShellCommand(cmd: FfmpegCommand): string {
  const quoted = cmd.args.map((a) => (a.includes(' ') || a.includes("'") ? `'${a}'` : a));
  return `ffmpeg ${quoted.join(' ')}`;
}
