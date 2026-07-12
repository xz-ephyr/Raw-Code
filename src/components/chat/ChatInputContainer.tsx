import { useState } from 'react';
import ChatInput from './ChatInput';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  File01Icon,
  MegaphoneIcon,
  ImageIcon,
  LinkIcon,
  SparklesIcon,
  LayoutIcon,
  BookOpenIcon,
  TargetIcon,
  BrainIcon,
  ListViewIcon,
} from '@hugeicons/core-free-icons';
import { Dropdown } from '../ui/Dropdown';
import { HugeiconRenderer } from '../ui/HugeiconRenderer';
import { cn } from '@/lib/utils';

interface ContentTemplate {
  id: string;
  label: string;
  description: string;
  icon: any;
  prompt: string;
}

const CONTENT_TEMPLATES: ContentTemplate[] = [
  {
    id: 'blog-post',
    label: 'Blog Post',
    description: 'SEO-optimized article with structure',
    icon: File01Icon,
    prompt: 'Write a comprehensive blog post about [topic]. Include: compelling headline, engaging intro, 5-7 H2 sections with detailed content, bullet points, examples, actionable takeaways, and SEO meta description. Target audience: [audience]. Tone: [professional/conversational/authoritative]. Length: ~1500-2000 words.',
  },
  {
    id: 'linkedin-post',
    label: 'LinkedIn Post',
    description: 'Professional thought leadership post',
    icon: MegaphoneIcon,
    prompt: 'Write a LinkedIn post about [topic]. Structure: Hook (1-2 lines), personal insight/story (3-4 lines), key takeaway (1-2 lines), call-to-action question. Include 3-5 relevant hashtags. Professional but conversational tone. ~150-300 words.',
  },
  {
    id: 'twitter-thread',
    label: 'Twitter/X Thread',
    description: 'Viral thread with hooks',
    icon: SparklesIcon,
    prompt: 'Create a Twitter/X thread about [topic]. 8-12 tweets. Tweet 1: Strong hook with curiosity gap. Tweets 2-7: Value-packed insights, one concept per tweet. Tweets 8-11: Actionable steps/framework. Final tweet: Summary + CTA to follow. Each tweet <280 chars. Include emojis and line breaks for readability.',
  },
  {
    id: 'newsletter',
    label: 'Newsletter Issue',
    description: 'Engaging email newsletter',
    icon: BookOpenIcon,
    prompt: 'Write a newsletter issue about [topic]. Structure: Catchy subject line (3 options), personal opening (2-3 sentences), main content (3 key sections with headers), curated links/resources (3-5), closing thought + CTA. Friendly, authoritative tone. ~800-1200 words. Include preview text.',
  },
  {
    id: 'seo-article',
    label: 'SEO Article',
    description: 'Keyword-optimized content',
    icon: TargetIcon,
    prompt: 'Write an SEO-optimized article for keyword: "[keyword]". Target: [primary keyword] + 3-5 secondary keywords. Structure: H1 with keyword, intro with keyword in first 100 words, 6-8 H2s covering search intent, FAQ section (5 Qs), conclusion with CTA. Include LSI keywords naturally. 2000+ words. Meta title (<60 chars) & description (<155 chars).',
  },
  {
    id: 'case-study',
    label: 'Case Study',
    description: 'Results-driven client story',
    icon: LayoutIcon,
    prompt: 'Write a case study for [client/project]. Structure: Challenge (problem + context), Solution (approach + methodology), Implementation (key steps, tools, timeline), Results (metrics, %, testimonials), Key Takeaways. Professional storytelling tone. Include specific numbers/outcomes. ~1500 words.',
  },
  {
    id: 'video-script',
    label: 'Video Script',
    description: 'YouTube/Reels/TikTok script',
    icon: ImageIcon,
    prompt: 'Write a [YouTube/Reels/TikTok] script about [topic]. Format: Hook (0-3s), Intro (3-10s), Main content (3-5 segments with B-roll cues), Recap, CTA. Include: visual cues [brackets], timestamps, spoken dialogue. Engaging, retention-focused. Length: [short-form 30-60s / long-form 8-15 min].',
  },
  {
    id: 'product-copy',
    label: 'Product Landing Page',
    description: 'High-converting sales copy',
    icon: BrainIcon,
    prompt: 'Write landing page copy for [product/service]. Sections: Hero (headline + subhead + CTA), Problem (pain points), Solution (features → benefits), Social Proof (testimonials/logos), Pricing/FAQ, Final CTA. Conversion-focused. Use PAS/ADA framework. Include meta title/description.',
  },
  {
    id: 'content-calendar',
    label: 'Content Calendar',
    description: 'Monthly content plan',
    icon: ListViewIcon,
    prompt: 'Create a 4-week content calendar for [niche/brand]. Include: Content pillars (3-4), posting frequency per platform, specific topics with angles, content formats (blog, video, carousel, etc.), keywords/hashtags, repurposing strategy. Table format with columns: Date, Platform, Format, Topic, Status.',
  },
  {
    id: 'email-sequence',
    label: 'Email Sequence',
    description: 'Nurture or sales funnel',
    icon: LinkIcon,
    prompt: 'Write a [5/7]-email [welcome/nurture/sales] sequence for [offer/audience]. Email 1: Welcome + value. Email 2: Story/authority. Email 3: Problem agitation. Email 4: Solution intro. Email 5: Social proof. Email 6: Objection handling. Email 7: Urgency + CTA. Subject lines + preview text for each. Conversational tone.',
  },
  {
    id: 'press-release',
    label: 'Press Release',
    description: 'Media-ready announcement',
    icon: MegaphoneIcon,
    prompt: 'Write a press release for [announcement]. Standard format: Headline (compelling, newsworthy), Dateline, Lead paragraph (who/what/when/where/why), Body (2-3 paragraphs with quotes), Boilerplate (company info), Contact info. AP style. ~400-600 words.',
  },
  {
    id: 'white-paper',
    label: 'White Paper',
    description: 'Authoritative B2B content',
    icon: File01Icon,
    prompt: 'Write a white paper on [topic] for [target audience]. Structure: Title page, Executive summary, Introduction (problem statement), Background/Context, Solution/Methodology, Case studies/evidence, Implementation guide, Conclusion + CTA. Professional, data-driven. 3000-5000 words. Include charts/data placeholders.',
  },
];

export default function ChatInputContainer({
  onSend,
  onStop,
  isLoading,
  isThinkingEnabled,
  onToggleThinking,
  isWebSearchEnabled,
  onToggleWebSearch,
  currentModel,
  idle,
  currentMode,
  onModeChange,
  isProject,
}: ChatInputContainerProps) {
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);

  const handleTemplateSelect = (template: ContentTemplate) => {
    setSelectedTemplate(template);
    setShowTemplates(false);
    onSend(template.prompt);
  };

  return (
    <div className="relative w-full mx-auto" style={{ maxWidth: 'min(780px, 100%)' }}>
      <div className="relative">
        <ChatInput
          onSend={onSend}
          onStop={onStop}
          isLoading={isLoading}
          isIdle={idle}
          isThinkingEnabled={isThinkingEnabled}
          onToggleThinking={onToggleThinking}
          isWebSearchEnabled={isWebSearchEnabled}
          onToggleWebSearch={onToggleWebSearch}
          currentModel={currentModel}
          currentMode={currentMode}
          onModeChange={onModeChange}
          isProject={isProject}
        />

        <Dropdown
          isOpen={showTemplates}
          onClose={() => setShowTemplates(false)}
          width="360px"
          maxHeight="420px"
          className="absolute bottom-full left-0 mb-2 z-50"
        >
          <div className="p-3 space-y-1">
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Content Templates
            </div>
            {CONTENT_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                className={cn(
                  'w-full flex items-start gap-3 px-3 py-2.5 text-sm text-left rounded-[8px] hover:bg-muted transition-colors group',
                  selectedTemplate?.id === template.id && 'bg-accent/10 text-accent'
                )}
              >
                <div className="shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  <HugeiconsIcon icon={template.icon} size={16} className="text-muted-foreground group-hover:text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">{template.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{template.description}</div>
                </div>
              </button>
            ))}
            <div className="h-px bg-border my-2" />
            <button
              onClick={() => { setShowTemplates(false); onSend('Create a custom content template for me based on my needs.'); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-accent hover:bg-accent/10 rounded-[8px] transition-colors"
            >
              <HugeiconRenderer icon={SparklesIcon} size={16} />
              <span>Create Custom Template</span>
            </button>
          </div>
        </Dropdown>

        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className={cn(
            'absolute bottom-2 right-2 p-2 rounded-[8px] bg-muted/80 backdrop-blur-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all border border-border/50',
            showTemplates && 'bg-accent/20 text-accent border-accent/30'
          )}
          aria-label="Content templates"
          title="Content Templates (for creators)"
        >
          <HugeiconsIcon icon={LayoutIcon} size={18} />
        </button>
      </div>
    </div>
  );
}

interface ChatInputContainerProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isLoading?: boolean;
  isThinkingEnabled: boolean;
  onToggleThinking: () => void;
  isWebSearchEnabled: boolean;
  onToggleWebSearch: () => void;
  currentModel?: string;
  idle?: boolean;
  currentMode?: string;
  onModeChange?: (modeId: string | undefined) => void;
  isProject?: boolean;
}