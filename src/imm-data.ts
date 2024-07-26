import { ViewConfigRoot } from './types';

export const immData: ViewConfigRoot = {
  viewModelId: 'home',
  id: 'home-screen',
  viewId: 'evs-column',
  content: [
    {
      id: 'VIEW_GLOBAL',
      viewId: 'evs-section',
      content: [
        {
          id: 'TASK_AllProductionRelevant',
          viewId: 'evs-group',
          onlyIMM: 'someIMM',
          content: [
            {
              viewId: 'evs-navigation-button',
              size: 'medium',
              evsRouterLink: 'sequence',
            },
            {
              viewId: 'evs-navigation-button',
              size: 'medium',
              evsRouterLink: 'Parts',
              inputs: {
                abc:'def'
              }
            },
          ],
        },
        {
          id: 'Task_System',
          viewId: 'evs-group',
          content: [
            {
              viewId: 'evs-navigation-button',
              size: 'medium',
              evsRouterLink: 'InjectionUnit1.PlastUnit',
            },
          ],
        },
      ],
    },
    {
      id: 'VIEW_EngelFunctions',
      viewId: 'evs-section',
      evsName: 'VIEW_EngelFunctions',
      content: [
        {
          viewId: 'evs-group',
          nameKey: 'General.injectionunit',
          imageKey: 'General/illu/injection-unit.svg',
          content: [
            {
              viewId: 'evs-navigation-button',
              size: 'medium',
              evsRouterLink: 'InjectionUnit1.PrePostInj',
            },
            {
              viewId: 'evs-navigation-button',
              size: 'medium',
              evsRouterLink: 'InjectionUnit1.IqWeightControl',
            },
          ],
        },
        {
          id: 'FUNCTION_Mold',
          viewId: 'evs-group',
          nameKey: 'General.moldarea',
          imageKey: 'General/illu/mold.svg',
          content: [
            {
              viewId: 'evs-navigation-button',
              size: 'medium',
              evsRouterLink: 'Parts',
            },
            {
              viewId: 'evs-navigation-button',
              size: 'medium',
              evsRouterLink: 'Mold1',
            },
          ],
        },
      ],
    },
    {
      id: 'VIEW_EngelTasks',
      viewId: 'evs-section',
      evsName: 'VIEW_EngelTasks',
      content: [
        {
          id: 'TASK_MoldChange',
          viewId: 'evs-group',
          content: [
            {
              viewId: 'evs-navigation-button',
              size: 'medium',
              evsRouterLink: 'sequence',
            },
          ],
        },
        {
          id: 'TASK_ProductionPreparation',
          viewId: 'evs-group',
          content: [
            {
              viewId: 'evs-navigation-button',
              size: 'medium',
              evsRouterLink: 'ProgramSignal1.Input1',
            },
            {
              viewId: 'evs-navigation-button',
              size: 'medium',
              evsRouterLink: 'ProgramSignal1.Output1',
            },
          ],
        },
      ],
    },
  ],
};
