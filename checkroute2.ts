import { getRouteByModelId } from '@doktor/llm-providers/providers/model-routes';
const route = getRouteByModelId('llama-3.3-70b-versatile');
console.log('full route keys:', Object.keys(route));
console.log('transport:', route.transport?.id);
console.log('endpoint:', JSON.stringify(route.endpoint).slice(0,200));
console.log('auth:', route.auth?.id);
console.log('has stream fn:', typeof (route as any).stream);
