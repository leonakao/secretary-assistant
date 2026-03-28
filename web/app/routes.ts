import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('login', 'routes/login.tsx'),
  route('app', 'routes/app.tsx', [
    index('routes/app._index.tsx'),
    route('company', 'routes/app.company.tsx'),
    route('contacts', 'routes/app.contacts.tsx'),
    route('settings', 'routes/app.settings.tsx'),
  ]),
  route('onboarding', 'routes/onboarding.tsx'),
] satisfies RouteConfig;
