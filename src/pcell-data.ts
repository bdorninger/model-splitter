import { select } from './merge-util';
import { ViewConfig, ViewConfigRoot } from './types';

export const pcellData: ViewConfigRoot = {
  viewModelId: 'home',
  id: 'home-screen',
  content: [
    {
      id: 'VIEW_GLOBAL',
      viewId: 'evs-section',
      content: [
        {
          id: 'TASK_AllProductionRelevant',
          viewId: 'evs-group',
          nameKey: 'General.production',
          imageKey: 'General/illu/production.svg',
          content: [],
        },
        {
          id: 'FUNCTION_General',
          viewId: 'evs-group',
          nameKey: 'General.general',
          imageKey: 'General/illu/document.svg',
          position: -20,
          content: [
            {
              viewId: 'evs-navigation-button',
              size: 'medium',
              evsRouterLink: 'sequence',
            },
          ],
        },
        {
          id: 'TASK_Favorite_1',
          viewId: 'evs-group',
          nameKey: 'Favorit 1',
          imageKey: 'General/illu/favorite-1.svg',
          content: [
            {
              viewId: 'evs-navigation-button',
              size: 'medium',
              evsRouterLink: 'home',
            },
          ],
        },
        {
          id: 'Task_System',
          viewId: 'evs-group',
          nameKey: 'General.system',
          imageKey: 'General/illu/settings.svg',
          position: -10,
          content: [
            {
              viewId: 'evs-navigation-button',
              size: 'medium',
              evsRouterLink: 'dataSetManagement',
            },
            {
              viewId: 'evs-navigation-button',
              size: 'medium',
              evsRouterLink: 'systemsettings',
            },
          ],
        },
      ],
    },
    {
      id: 'VIEW_EngelFunctions',
      viewId: 'evs-section',
      evsName: 'General.components',
      position: 20,
      content: [
        {
          id: 'FUNCTION_Office',
          viewId: 'evs-group',
          nameKey: 'General.office',
          imageKey: 'General/illu/document.svg',
          content: [
            {
              viewId: 'evs-navigation-button',
              size: 'medium',
              evsRouterLink: 'sequence',
            },
          ],
        },
      ],
    },
    {
      id: 'VIEW_EngelTasks',
      viewId: 'evs-section',
      evsName: 'General.tasks',
      position: 30,
      content: [
        {
          id: 'TASK_MoldChange',
          viewId: 'evs-group',
          nameKey: 'General.conversion',
          imageKey: 'General/illu/mold-change.svg',
          content: [
            {
              viewId: 'evs-navigation-button',
              size: 'medium',
              evsRouterLink: 'Parts',
            },
          ],
        },
      ],
    },
  ],
};

export function traversePath(model: ViewConfig, path: string): string {
  const elems = path.split(']').map((elem) => (elem !== '' ? `${elem}]` : ''));
  // console.log('PATH', path, elems);
  let p2 = '';
  let cp = '';
  for (let i = 0; i < elems.length; i++) {
    p2 = p2.concat(elems[i]);
    // console.log(`select via: ${p2}`);
    const sel = select(model, {
      jsonPathExpression: p2,
    });

    const ssel = sel[0];

    if (ssel?.id != null) {
      // console.log('' + ssel.id);
      cp = cp.concat(ssel.id);
    } else {
      cp = cp.concat(elems[i]);
    }
    cp = cp.concat('/');
  }
  return cp;
}
