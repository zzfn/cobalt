import { createBrowserRouter, Navigate } from 'react-router-dom';
import React from 'react';
import Layout from '@/components/layout/Layout';
import Dashboard from '@/pages/Dashboard';

// 懒加载非首屏页面
const GeneralSettings = React.lazy(() => import('@/pages/Settings/General'));
const InstructionsSettings = React.lazy(() => import('@/pages/Settings/Instructions'));
const ClaudeCodeSettings = React.lazy(() => import('@/pages/Settings/ClaudeCode'));
const SettingsJsonEditor = React.lazy(() => import('@/pages/Settings/SettingsJson'));
const CacheSettings = React.lazy(() => import('@/pages/Settings/Cache'));
const SkillsList = React.lazy(() => import('@/pages/Skills/List'));
const SkillDetail = React.lazy(() => import('@/pages/Skills/Detail'));
const MarketplaceList = React.lazy(() => import('@/pages/Skills/Marketplace/List'));
const MarketplaceDetail = React.lazy(() => import('@/pages/Skills/Marketplace/Detail'));
const TokenUsage = React.lazy(() => import('@/pages/TokenUsage'));

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
          {
            path: 'cache',
            element: <CacheSettings />,
          },
        ],
      },
      {
        path: 'token-usage',
        element: <TokenUsage />,
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
    ],
  },
]);
