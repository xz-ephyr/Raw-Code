import { getRouteByModelId, allRoutes } from '@doktor/llm-providers/providers/model-routes';
const route = getRouteByModelId('llama-3.3-70b-versatile');
console.log('route id:', route?.id);
console.log('route provider:', route?.provider);
console.log('route protocol:', route?.protocol?.id);
console.log('total routes:', allRoutes.length);
allRoutes.slice(0,5).forEach(r => console.log(' -', r.id, 'provider:', r.provider, 'protocol:', r.protocol?.id));
