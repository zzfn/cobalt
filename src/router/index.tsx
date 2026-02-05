import { createBrowserRouter, Navigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import Dashboard from '@/pages/Dashboard';
import GeneralSettings from '@/pages/Settings/General';
import InstructionsSettings from '@/pages/Settings/Instructions';
import ClaudeCodeSettings from '@/pages/Settings/ClaudeCode';
import SettingsJsonEditor from '@/pages/Settings/SettingsJson';
import SkillsList from '@/pages/Skills/List';
import SkillDetail from '@/pages/Skills/Detail';
import MarketplaceList from '@/pages/Skills/Marketplace/List';
import MarketplaceDetail from '@/pages/Skills/Marketplace/Detail';
import { GlassCardExample } from '@/components/examples/GlassCardExample';
import GlassTest from '@/pages/GlassTest';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'settings',
        children: [
          {
            index: true,
            element: <Navigate to="/settings/general" replace />,
          },
          {
            path: 'general',
            element: <GeneralSettings />,
          },
          {
            path: 'instructions',
            element: <InstructionsSettings />,
          },
          {
            path: 'claude-code',
            element: <ClaudeCodeSettings />,
          },
          {
            path: 'settings-json',
            element: <SettingsJsonEditor />,
          },
        ],
      },
      {
        path: 'skills',
        children: [
          {
            index: true,
            element: <SkillsList />,
          },
          {
            path: 'marketplace',
            children: [
              {
                index: true,
                element: <MarketplaceList />,
              },
              {
                path: ':sourceId',
                element: <MarketplaceDetail />,
              },
            ],
          },
          {
            path: ':skillName',
            element: <SkillDetail />,
          },
        ],
      },
      {
        path: 'glass-test',
        element: <GlassTest />,
      },
    ],
  },
  {
    path: '/glass-demo',
    element: <GlassCardExample />,
  },
]);
