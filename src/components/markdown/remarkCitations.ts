import { visit } from 'unist-util-visit';
import type { Root, Text } from 'mdast';

const citationRegex = /【([^】]+)】/g;

export function remarkCitations() {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || typeof index !== 'number') return;

      const parts = node.value.split(citationRegex);
      if (parts.length <= 1) return;

      const newNodes: any[] = [];
      for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 0) {
          if (parts[i]) {
            newNodes.push({ type: 'text', value: parts[i] });
          }
        } else {
          newNodes.push({
            type: 'citation',
            data: {
              hName: 'citation',
              hProperties: { citation: parts[i] },
            },
          });
        }
      }

      parent.children.splice(index, 1, ...newNodes);
      return index + newNodes.length - 1;
    });

    function groupCitationsInNode(node: any) {
      if (!node.children || !Array.isArray(node.children)) return;

      const newChildren: any[] = [];
      let pendingCitations: string[] = [];

      for (const child of node.children) {
        if (child.type === 'citation') {
          pendingCitations.push(child.data.hProperties.citation);
        } else {
          if (pendingCitations.length > 0) {
            newChildren.push({
              type: 'citation-group',
              data: {
                hName: 'citation-group',
                hProperties: { citations: [...new Set(pendingCitations)] },
              },
            });
            pendingCitations = [];
          }
          newChildren.push(child);
          groupCitationsInNode(child);
        }
      }

      if (pendingCitations.length > 0) {
        newChildren.push({
          type: 'citation-group',
          data: {
            hName: 'citation-group',
            hProperties: { citations: [...new Set(pendingCitations)] },
          },
        });
      }

      node.children = newChildren;
    }

    groupCitationsInNode(tree);
  };
}
