export interface ViewConfig {
  id?: string;
  viewId?: string;
  evsName?: string;
  content?: ViewConfig[];

  [key: string]: any;
}

export interface ViewConfigRoot extends ViewConfig {
  viewModelId?: string;
}
