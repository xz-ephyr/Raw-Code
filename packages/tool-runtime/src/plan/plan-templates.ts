import { Effect, Schema } from 'effect';
import { make } from '../tool/make';
import { emit } from '../events';
import {
  competitorAnalysisTemplate,
  blogToVideoTemplate,
  seoAuditTemplate,
} from './templates';
import type { ToolExecuteContext } from '../types';

const TEMPLATES = {
  competitor_analysis: {
    name: 'competitor_analysis',
    description: 'Competitor analysis: search competitors → crawl their pages → write a comparison article. Great for market research.',
    parameters: {
      topic: { type: 'string', description: 'The market topic or product category' },
      competitors: { type: 'array', items: { type: 'string' }, description: 'Optional list of competitor domains (e.g. ["example.com"])' },
    },
  },
  blog_to_video: {
    name: 'blog_to_video',
    description: 'Convert a blog post into a video: scrape content → generate script → preview → export.',
    parameters: {
      url: { type: 'string', description: 'URL of the blog post (optional if topic provided)' },
      topic: { type: 'string', description: 'Topic for the video (optional if url provided)' },
    },
  },
  seo_audit: {
    name: 'seo_audit',
    description: 'SEO audit: map site → crawl pages → extract headings/meta → research best practices → write audit report.',
    parameters: {
      url: { type: 'string', description: 'The website URL to audit' },
      maxPages: { type: 'number', description: 'Maximum pages to crawl (default 30)' },
    },
  },
};

const listOutputSchema = Schema.Struct({
  templates: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      description: Schema.String,
      parameters: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
    }),
  ),
});

export const planTemplatesTool = make({
  description: 'List available plan templates that can be used to quickly create multi-step plans. Call this first, then use create_plan with the template structure. Each template generates a sequence of tool calls for a common workflow (competitor analysis, blog-to-video, SEO audit).',
  input: Schema.Struct({
    action: Schema.Literal('list', 'apply'),
    templateName: Schema.optional(Schema.String),
    parameters: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  }),
  output: Schema.Union(
    listOutputSchema,
    Schema.Struct({
      plan: Schema.Struct({
        title: Schema.String,
        steps: Schema.Array(
          Schema.Struct({
            description: Schema.String,
            toolName: Schema.optional(Schema.String),
            expectedInput: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
          }),
        ),
      }),
    }),
  ),
  inputJsonSchema: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['list', 'apply'], description: '"list" to see available templates, "apply" to generate a plan' },
      templateName: { type: 'string', description: 'Required if action="apply". Name of the template to apply.' },
      parameters: { type: 'object', description: 'Template parameters. See descriptions from the list action.' },
    },
    required: ['action'],
  },
  execute: (input, context: ToolExecuteContext) =>
    Effect.gen(function* () {
      if (input.action === 'list') {
        const templates = Object.values(TEMPLATES).map((t) => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        }));
        return { templates } as any;
      }

      if (input.action === 'apply') {
        const name = input.templateName;
        const params = (input.parameters || {}) as Record<string, any>;

        let plan: { title: string; steps: any[] };

        switch (name) {
          case 'competitor_analysis':
            plan = competitorAnalysisTemplate({ topic: params.topic, competitors: params.competitors });
            break;
          case 'blog_to_video':
            plan = blogToVideoTemplate({ url: params.url, topic: params.topic });
            break;
          case 'seo_audit':
            plan = seoAuditTemplate({ url: params.url, maxPages: params.maxPages });
            break;
          default:
            return yield* Effect.fail(new Error(`Unknown template "${name}". Use action="list" to see available templates.`));
        }

        emit({
          type: 'tool_call_end',
          sessionID: context.sessionID,
          agentID: context.agentID,
          timestamp: Date.now(),
          payload: { toolName: 'plan_templates', action: 'apply', template: name, stepCount: plan.steps.length },
        });

        return { plan } as any;
      }

      return yield* Effect.fail(new Error(`Unknown action "${input.action}". Use "list" or "apply".`));
    }),
});
