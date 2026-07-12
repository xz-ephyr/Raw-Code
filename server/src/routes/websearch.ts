import { Router } from 'express';

const router = Router();

router.post('/websearch', async (req, res) => {
  try {
    const { tool, params } = req.body;
    const { webSearch, fetchPage, imageSearch, newsSearch } = await import('../searchService.js');

    let result;
    switch (tool) {
      case 'webSearch':
        result = await webSearch(params);
        break;
      case 'fetchPage':
        result = await fetchPage(params);
        break;
      case 'imageSearch':
        result = await imageSearch(params);
        break;
      case 'newsSearch':
        result = await newsSearch(params);
        break;
      default:
        return res.status(400).json({ error: `Unknown tool: ${tool}` });
    }

    res.json(result);
  } catch (error: any) {
    console.error('Web search error:', error.message);
    res.status(502).json({ error: error.message || 'Search request failed.' });
  }
});

export default router;
